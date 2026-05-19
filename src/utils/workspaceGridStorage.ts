import type { PanelDockLayout } from "./panelDockLayout";
import {
	PANEL_DOCK_DEFAULTS,
	PANEL_DOCK_EMPTY,
	cloneLayout,
	parsePanelDockLayoutPayload,
	readPanelDockLayout,
} from "./panelDockLayout";
import type { WopDropZone } from "./workspaceDropZones";
import { resolveDropTargetCell } from "./workspaceDropZones";

const KEY = "wayofpi.technical.workspaceGrid.v1";

/** User-facing cap: **3 columns × 4 rows** (12 panes max). */
export const WORKSPACE_GRID_MAX_COLS = 3;
export const WORKSPACE_GRID_MAX_ROWS = 4;

export interface WorkspaceGridState {
	cols: number;
	rows: number;
	/** Row-major: index = row * cols + col */
	cells: PanelDockLayout[];
	/** Flex-style weights for row heights (`rows > 1`). Omitted = equal rows. */
	rowWeights?: number[];
	/** Flex-style weights for column widths (`cols > 1`). Omitted = equal columns. */
	colWeights?: number[];
}

const WORKSPACE_GRID_WEIGHT_MIN = 8;
const WORKSPACE_GRID_RESIZE_PIXEL_SCALE = 0.38;

function parseWeightArray(raw: unknown, len: number): number[] | undefined {
	if (!Array.isArray(raw) || raw.length !== len) return undefined;
	const out: number[] = [];
	for (const x of raw) {
		if (typeof x !== "number" || !Number.isFinite(x) || x < WORKSPACE_GRID_WEIGHT_MIN) return undefined;
		out.push(x);
	}
	return out;
}

/** Adjust vertical split between `rowEdge` and `rowEdge + 1` (positive `dy` = pointer down → more space below). */
export function applyWorkspaceGridRowResizeDelta(
	prev: WorkspaceGridState,
	rowEdge: number,
	dy: number,
): WorkspaceGridState {
	if (prev.rows < 2 || rowEdge < 0 || rowEdge >= prev.rows - 1 || dy === 0) return prev;
	const w =
		prev.rowWeights?.length === prev.rows
			? [...prev.rowWeights]
			: Array.from({ length: prev.rows }, () => 100);
	let a = w[rowEdge]!;
	let b = w[rowEdge + 1]!;
	const d = dy * WORKSPACE_GRID_RESIZE_PIXEL_SCALE;
	a -= d;
	b += d;
	w[rowEdge] = Math.max(WORKSPACE_GRID_WEIGHT_MIN, a);
	w[rowEdge + 1] = Math.max(WORKSPACE_GRID_WEIGHT_MIN, b);
	return { ...prev, rowWeights: w };
}

/**
 * Adjust horizontal split between `colEdge` and `colEdge + 1`.
 * **Pointer right (+dx)** → sash follows the cursor → **left** column (`colEdge`) **gains** flex share, **right** loses
 * (same feel as **Simple UI** `chatColumnWidthPx + dx` with chat left of the handle — see `DockSplitHandle` contract).
 */
export function applyWorkspaceGridColResizeDelta(
	prev: WorkspaceGridState,
	colEdge: number,
	dx: number,
): WorkspaceGridState {
	if (prev.cols < 2 || colEdge < 0 || colEdge >= prev.cols - 1 || dx === 0) return prev;
	const w =
		prev.colWeights?.length === prev.cols
			? [...prev.colWeights]
			: Array.from({ length: prev.cols }, () => 100);
	let a = w[colEdge]!;
	let b = w[colEdge + 1]!;
	const d = dx * WORKSPACE_GRID_RESIZE_PIXEL_SCALE;
	a += d;
	b -= d;
	w[colEdge] = Math.max(WORKSPACE_GRID_WEIGHT_MIN, a);
	w[colEdge + 1] = Math.max(WORKSPACE_GRID_WEIGHT_MIN, b);
	return { ...prev, colWeights: w };
}

export function clampWorkspaceCols(c: number): number {
	return Math.min(WORKSPACE_GRID_MAX_COLS, Math.max(1, Math.round(c)));
}

export function clampWorkspaceRows(r: number): number {
	return Math.min(WORKSPACE_GRID_MAX_ROWS, Math.max(1, Math.round(r)));
}

function parseCell(raw: unknown): PanelDockLayout {
	const p = parsePanelDockLayoutPayload(raw);
	return p ? cloneLayout(p) : cloneLayout(PANEL_DOCK_EMPTY);
}

export function resizeWorkspaceGrid(prev: WorkspaceGridState, cols: number, rows: number): WorkspaceGridState {
	const c = clampWorkspaceCols(cols);
	const r = clampWorkspaceRows(rows);
	const n = c * r;
	const cells: PanelDockLayout[] = [];
	for (let i = 0; i < n; i++) {
		cells.push(prev.cells[i] ? cloneLayout(prev.cells[i]!) : cloneLayout(PANEL_DOCK_EMPTY));
	}
	const sameShape = prev.cols === c && prev.rows === r;
	const out: WorkspaceGridState = { cols: c, rows: r, cells };
	if (sameShape) {
		if (prev.rowWeights?.length === r) out.rowWeights = [...prev.rowWeights];
		if (prev.colWeights?.length === c) out.colWeights = [...prev.colWeights];
	}
	return out;
}

/**
 * If the pointer hit an edge snap zone but there is no neighbor cell, grow the grid so the
 * implied cell exists (e.g. 1×1 + right edge → 2×1 with drop target index 1). Also handles
 * **N×1** / **1×N** outer-edge growth where `resizeWorkspaceGrid` preserves row-major layout.
 */
export function growWorkspaceGridForEdgeDrop(
	prev: WorkspaceGridState,
	surfaceCellIndex: number,
	zone: WopDropZone,
): { grid: WorkspaceGridState; targetCell: number } {
	const { cols, rows, cells } = prev;
	const n = cols * rows;
	if (surfaceCellIndex < 0 || surfaceCellIndex >= n) {
		return { grid: prev, targetCell: Math.max(0, Math.min(surfaceCellIndex, Math.max(0, n - 1))) };
	}

	const naive = resolveDropTargetCell(surfaceCellIndex, cols, rows, zone);
	if (zone === "center" || naive !== surfaceCellIndex) {
		return { grid: prev, targetCell: naive };
	}

	const row = Math.floor(surfaceCellIndex / cols);
	const col = surfaceCellIndex % cols;

	if (n === 1) {
		switch (zone) {
			case "right":
				return { grid: resizeWorkspaceGrid(prev, 2, 1), targetCell: 1 };
			case "left": {
				const g = resizeWorkspaceGrid(prev, 2, 1);
				const oldDock = cloneLayout(g.cells[0]!);
				return {
					grid: { ...g, cells: [cloneLayout(PANEL_DOCK_EMPTY), oldDock] },
					targetCell: 0,
				};
			}
			case "bottom":
				return { grid: resizeWorkspaceGrid(prev, 1, 2), targetCell: 1 };
			case "top": {
				const g = resizeWorkspaceGrid(prev, 1, 2);
				const oldDock = cloneLayout(g.cells[0]!);
				return {
					grid: { ...g, cells: [cloneLayout(PANEL_DOCK_EMPTY), oldDock] },
					targetCell: 0,
				};
			}
			default:
				return { grid: prev, targetCell: surfaceCellIndex };
		}
	}

	if (rows === 1 && cols < WORKSPACE_GRID_MAX_COLS) {
		if (zone === "right" && col === cols - 1) {
			const next = resizeWorkspaceGrid(prev, cols + 1, 1);
			return { grid: next, targetCell: surfaceCellIndex + 1 };
		}
		if (zone === "left" && col === 0) {
			const newCells: PanelDockLayout[] = [
				cloneLayout(PANEL_DOCK_EMPTY),
				...cells.map((d) => cloneLayout(d)),
			];
			return {
				grid: {
					...prev,
					cols: cols + 1,
					rows,
					cells: newCells,
					rowWeights: undefined,
					colWeights: undefined,
				},
				targetCell: 0,
			};
		}
	}

	if (cols === 1 && rows < WORKSPACE_GRID_MAX_ROWS) {
		if (zone === "bottom" && row === rows - 1) {
			const next = resizeWorkspaceGrid(prev, 1, rows + 1);
			return { grid: next, targetCell: surfaceCellIndex + 1 };
		}
		if (zone === "top" && row === 0) {
			const newCells: PanelDockLayout[] = [
				cloneLayout(PANEL_DOCK_EMPTY),
				...cells.map((d) => cloneLayout(d)),
			];
			return {
				grid: {
					...prev,
					cols,
					rows: rows + 1,
					cells: newCells,
					rowWeights: undefined,
					colWeights: undefined,
				},
				targetCell: 0,
			};
		}
	}

	return { grid: prev, targetCell: surfaceCellIndex };
}

/**
 * Map a linear cell index from before {@link growWorkspaceGridForEdgeDrop} to after a prepend
 * insert (left column on N×1, top row on 1×N).
 */
export function remapWorkspaceCellIndexAfterEdgeGrow(
	prev: WorkspaceGridState,
	next: WorkspaceGridState,
	zone: WopDropZone,
	surfaceCellIndex: number,
	idx: number,
): number {
	if (idx < 0) return idx;
	if (prev.cols === next.cols && prev.rows === next.rows) return idx;
	const nextN = next.cols * next.rows;
	const prevN = prev.cols * prev.rows;
	if (nextN <= prevN) return idx;

	if (prev.rows === 1 && next.rows === 1 && next.cols === prev.cols + 1 && zone === "left") {
		const surfCol = surfaceCellIndex % prev.cols;
		if (surfCol === 0) return idx + 1;
	}
	if (prev.cols === 1 && next.cols === 1 && next.rows === prev.rows + 1 && zone === "top") {
		const surfRow = Math.floor(surfaceCellIndex / prev.cols);
		if (surfRow === 0) return idx + 1;
	}
	return idx;
}

/**
 * After `removeWorkspaceCellAt(prev, removeIndex)`, maps an old linear cell index to the new grid, or `null` if that cell was removed.
 */
export function mapCellIndexAfterRemoval(
	prev: WorkspaceGridState,
	removeIndex: number,
	oldIdx: number,
): number | null {
	const { cols, rows } = prev;
	const n = cols * rows;
	if (n <= 1 || removeIndex < 0 || removeIndex >= n || oldIdx < 0 || oldIdx >= n) return oldIdx;
	if (oldIdx === removeIndex) return null;

	if (cols > 1) {
		const rcol = removeIndex % cols;
		const newCols = cols - 1;
		const r = Math.floor(oldIdx / cols);
		const c = oldIdx % cols;
		if (c === rcol) return null;
		return r * newCols + (c < rcol ? c : c - 1);
	}
	if (rows > 1) {
		const rrow = Math.floor(removeIndex / cols);
		const r = Math.floor(oldIdx / cols);
		const c = oldIdx % cols;
		if (r === rrow) return null;
		return (r < rrow ? r : r - 1) * cols + c;
	}
	return oldIdx;
}

/** Pick a valid focus index after shrinking the grid. */
export function nextFocusAfterRemove(
	prev: WorkspaceGridState,
	next: WorkspaceGridState,
	removeIndex: number,
	focusedCell: number,
): number {
	const mapped = mapCellIndexAfterRemoval(prev, removeIndex, focusedCell);
	if (mapped != null) return mapped;
	const prevN = prev.cols * prev.rows;
	const newN = next.cols * next.rows;
	if (newN <= 0) return 0;
	for (let k = 1; k <= prevN; k++) {
		for (const sign of [1, -1] as const) {
			const o = focusedCell + sign * k;
			if (o < 0 || o >= prevN) continue;
			const m = mapCellIndexAfterRemoval(prev, removeIndex, o);
			if (m != null) return m;
		}
	}
	return Math.max(0, newN - 1);
}

/**
 * Removes the column (if `cols > 1`) or row (else) that contains `removeIndex`, shrinking the grid.
 * Returns `prev` unchanged when there is only one cell.
 */
export function removeWorkspaceCellAt(prev: WorkspaceGridState, removeIndex: number): WorkspaceGridState {
	const { cols, rows, cells } = prev;
	const n = cols * rows;
	if (n <= 1 || removeIndex < 0 || removeIndex >= n) return prev;

	if (cols > 1) {
		const col = removeIndex % cols;
		const out: PanelDockLayout[] = [];
		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				if (c === col) continue;
				const idx = r * cols + c;
				out.push(cloneLayout(cells[idx]!));
			}
		}
		const newCols = cols - 1;
		return resizeWorkspaceGrid({ ...prev, cols: newCols, rows, cells: out }, newCols, rows);
	}
	if (rows > 1) {
		const row = Math.floor(removeIndex / cols);
		const out: PanelDockLayout[] = [];
		for (let r = 0; r < rows; r++) {
			if (r === row) continue;
			for (let c = 0; c < cols; c++) {
				const idx = r * cols + c;
				out.push(cloneLayout(cells[idx]!));
			}
		}
		const newRows = rows - 1;
		return resizeWorkspaceGrid({ ...prev, cols, rows: newRows, cells: out }, cols, newRows);
	}
	return prev;
}

export function readWorkspaceGridState(): WorkspaceGridState {
	if (typeof window === "undefined") {
		return { cols: 1, rows: 1, cells: [cloneLayout(PANEL_DOCK_DEFAULTS)] };
	}
	try {
		const raw = localStorage.getItem(KEY);
		if (raw) {
			const o = JSON.parse(raw) as Record<string, unknown>;
			const cols = clampWorkspaceCols(typeof o.cols === "number" ? o.cols : 1);
			const rows = clampWorkspaceRows(typeof o.rows === "number" ? o.rows : 1);
			const n = cols * rows;
			const cells: PanelDockLayout[] = [];
			if (Array.isArray(o.cells)) {
				for (let i = 0; i < n; i++) {
					cells.push(parseCell(o.cells[i]));
				}
			} else {
				for (let i = 0; i < n; i++) cells.push(cloneLayout(PANEL_DOCK_DEFAULTS));
			}
			const rowWeights = parseWeightArray(o.rowWeights, rows);
			const colWeights = parseWeightArray(o.colWeights, cols);
			return {
				cols,
				rows,
				cells,
				...(rowWeights ? { rowWeights } : {}),
				...(colWeights ? { colWeights } : {}),
			};
		}
	} catch {
		/* fall through */
	}
	const legacy = readPanelDockLayout();
	return { cols: 1, rows: 1, cells: [cloneLayout(legacy)] };
}

export function writeWorkspaceGridState(s: WorkspaceGridState): void {
	const g = resizeWorkspaceGrid(s, s.cols, s.rows);
	try {
		localStorage.setItem(
			KEY,
			JSON.stringify({
				v: 1,
				cols: g.cols,
				rows: g.rows,
				cells: g.cells.map((c) => ({ v: 3, tabs: c.tabs, activeIndex: c.activeIndex })),
				...(g.rowWeights && g.rowWeights.length === g.rows ? { rowWeights: g.rowWeights } : {}),
				...(g.colWeights && g.colWeights.length === g.cols ? { colWeights: g.colWeights } : {}),
			}),
		);
	} catch {
		/* ignore */
	}
}
