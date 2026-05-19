import { WOP_UNIFIED_DOCK_BAND_LABEL } from "./dockChrome";
import { dataTransferHasType } from "./dataTransferTypes";

/** Legacy: two horizontal strips (migrated to a single {@link PanelDockLayout}). */
export type PanelBand = "top" | "bottom";

export const PANEL_BANDS: readonly PanelBand[] = ["top", "bottom"];

export type ToolTabId =
	| "problems"
	| "output"
	| "tool_log"
	| "agent_log"
	| "terminal"
	| "agent_team"
	| "agent_chat";

export const TOOL_TAB_IDS: ToolTabId[] = [
	"problems",
	"output",
	"tool_log",
	"agent_log",
	"terminal",
	"agent_team",
	"agent_chat",
];

/** One tab: built-in tool surface or workspace file. */
export type PanelTab = { type: "tool"; id: ToolTabId } | { type: "file"; path: string };

/**
 * **One** workspace tab stack (Zed-style): files, terminal, problems, etc. in a single list.
 * Older persisted shapes (`strips` top/bottom) migrate here on read.
 */
export interface PanelDockLayout {
	tabs: PanelTab[];
	activeIndex: number;
}

export const PANEL_BAND_CHROME: Record<
	PanelBand,
	{ bandLabel: string; bandTitle: string; dropLabel: string; splitResizeAria: string }
> = {
	top: {
		bandLabel: WOP_UNIFIED_DOCK_BAND_LABEL,
		bandTitle: "Legacy band label (unused in single-stack UI)",
		dropLabel: "Drop to reorder tabs",
		splitResizeAria: "Resize upper dock band height",
	},
	bottom: {
		bandLabel: WOP_UNIFIED_DOCK_BAND_LABEL,
		bandTitle: "Legacy band label (unused in single-stack UI)",
		dropLabel: "Drop to reorder tabs",
		splitResizeAria: "Resize lower dock band height",
	},
};

/** Menu heading for the + menu in the main workspace pane (no separate top/bottom docks). */
export const WORKSPACE_PANE_MENU_HEADING = "Workspace";

const PANEL_DOCK_KEY = "wayofpi.panelDock";
const LEGACY_TOOL_DOCK_KEY = "wayofpi.technical.toolDock";

export const PANEL_DOCK_DEFAULTS: PanelDockLayout = {
	tabs: [
		{ type: "tool", id: "terminal" },
		{ type: "tool", id: "output" },
		{ type: "tool", id: "problems" },
		{ type: "tool", id: "tool_log" },
	],
	activeIndex: 0,
};

/** New workspace grid cells start with no tabs (user adds via **+**). */
export const PANEL_DOCK_EMPTY: PanelDockLayout = {
	tabs: [],
	activeIndex: 0,
};

export function tabsEqual(a: PanelTab, b: PanelTab): boolean {
	if (a.type !== b.type) return false;
	if (a.type === "tool") return b.type === "tool" && a.id === b.id;
	return b.type === "file" && a.path === b.path;
}

export function panelTabKey(e: PanelTab): string {
	return e.type === "tool" ? `tool:${e.id}` : `file:${e.path}`;
}

export function toolTabVisible(layout: PanelDockLayout, id: ToolTabId): boolean {
	return layout.tabs.some((e) => e.type === "tool" && e.id === id);
}

/** @deprecated Single-stack layout has no bands; kept for callers that only need a dummy value. */
export function toolTabBand(_layout: PanelDockLayout, _id: ToolTabId): PanelBand {
	return "bottom";
}

export function cloneLayout(layout: PanelDockLayout): PanelDockLayout {
	return { tabs: [...layout.tabs], activeIndex: layout.activeIndex };
}

function clampActive(layout: PanelDockLayout): void {
	const n = layout.tabs.length;
	if (n === 0) layout.activeIndex = 0;
	else layout.activeIndex = Math.min(Math.max(0, layout.activeIndex), n - 1);
}

function findTabIndex(layout: PanelDockLayout, tab: PanelTab): number {
	return layout.tabs.findIndex((e) => tabsEqual(e, tab));
}

/** Reorder within the single workspace stack (DnD). */
export function applyPanelTabMove(
	layout: PanelDockLayout,
	moving: PanelTab,
	before: PanelTab | null,
): PanelDockLayout {
	const next = cloneLayout(layout);
	const from = findTabIndex(next, moving);
	if (from < 0) return next;
	next.tabs.splice(from, 1);
	let insertAt = next.tabs.length;
	if (before) {
		const bi = next.tabs.findIndex((e) => tabsEqual(e, before));
		if (bi >= 0) insertAt = bi;
	}
	next.tabs.splice(insertAt, 0, moving);
	const ni = findTabIndex(next, moving);
	next.activeIndex = ni >= 0 ? ni : 0;
	clampActive(next);
	return next;
}

export function applyAddFileTab(layout: PanelDockLayout, path: string): PanelDockLayout {
	const next = cloneLayout(layout);
	const entry: PanelTab = { type: "file", path };
	const existing = findTabIndex(next, entry);
	if (existing >= 0) {
		next.activeIndex = existing;
		return next;
	}
	next.tabs.push(entry);
	next.activeIndex = next.tabs.length - 1;
	return next;
}

/** Append a file tab if missing; do **not** change `activeIndex` (keeps focus on a tool tab). */
export function applyEnsureFileTab(layout: PanelDockLayout, path: string): PanelDockLayout {
	const entry: PanelTab = { type: "file", path };
	if (findTabIndex(layout, entry) >= 0) return layout;
	const next = cloneLayout(layout);
	next.tabs.push(entry);
	clampActive(next);
	return next;
}

export function applyRemoveFileTab(layout: PanelDockLayout, path: string): PanelDockLayout {
	const next = cloneLayout(layout);
	const i = next.tabs.findIndex((e) => e.type === "file" && e.path === path);
	if (i < 0) return next;
	const wasActive = next.activeIndex === i;
	next.tabs.splice(i, 1);
	if (wasActive) next.activeIndex = Math.min(i, Math.max(0, next.tabs.length - 1));
	else if (next.activeIndex > i) next.activeIndex -= 1;
	clampActive(next);
	return next;
}

/** After a workspace file move on disk, keep file tabs pointing at the new path. */
export function remapFileTabPath(layout: PanelDockLayout, fromPath: string, toPath: string): PanelDockLayout {
	if (fromPath === toPath) return layout;
	const next = cloneLayout(layout);
	let changed = false;
	for (let i = 0; i < next.tabs.length; i++) {
		const t = next.tabs[i]!;
		if (t.type === "file" && t.path === fromPath) {
			next.tabs[i] = { type: "file", path: toPath };
			changed = true;
		}
	}
	if (!changed) return layout;
	clampActive(next);
	return next;
}

/** Close file tabs for a deleted path (exact file or any file under a deleted directory). */
export function removeExplorerPathsFromDock(layout: PanelDockLayout, path: string, kind: "file" | "dir"): PanelDockLayout {
	const drop = (p: string) =>
		kind === "file" ? p === path : p === path || p.startsWith(`${path}/`);
	const next = cloneLayout(layout);
	const prevLen = next.tabs.length;
	next.tabs = next.tabs.filter((t) => t.type !== "file" || !drop(t.path));
	if (next.tabs.length === prevLen) return layout;
	clampActive(next);
	return next;
}

/** After renaming a directory on disk, update open file tab paths under that prefix. */
export function remapPathPrefixInDock(layout: PanelDockLayout, oldPrefix: string, newPrefix: string): PanelDockLayout {
	if (oldPrefix === newPrefix) return layout;
	const next = cloneLayout(layout);
	let changed = false;
	for (let i = 0; i < next.tabs.length; i++) {
		const t = next.tabs[i]!;
		if (t.type !== "file") continue;
		const p = t.path;
		if (p === oldPrefix || p.startsWith(`${oldPrefix}/`)) {
			const suffix = p === oldPrefix ? "" : p.slice(oldPrefix.length + 1);
			const np = suffix ? `${newPrefix}/${suffix}` : newPrefix;
			next.tabs[i] = { type: "file", path: np };
			changed = true;
		}
	}
	if (!changed) return layout;
	clampActive(next);
	return next;
}

export function applyCloseToolTab(layout: PanelDockLayout, id: ToolTabId): PanelDockLayout {
	const next = cloneLayout(layout);
	const i = next.tabs.findIndex((e) => e.type === "tool" && e.id === id);
	if (i < 0) return next;
	const wasActive = next.activeIndex === i;
	next.tabs.splice(i, 1);
	if (wasActive) next.activeIndex = Math.min(i, Math.max(0, next.tabs.length - 1));
	else if (next.activeIndex > i) next.activeIndex -= 1;
	clampActive(next);
	return next;
}

/** Remove a tab by identity (file path or tool id). */
export function applyRemoveTab(layout: PanelDockLayout, tab: PanelTab): PanelDockLayout {
	if (tab.type === "file") return applyRemoveFileTab(layout, tab.path);
	return applyCloseToolTab(layout, tab.id);
}

/** Add a tab (file or tool) and focus it. */
export function applyAddPanelTab(layout: PanelDockLayout, tab: PanelTab): PanelDockLayout {
	if (tab.type === "file") return applyAddFileTab(layout, tab.path);
	return applyShowToolTab(layout, tab.id);
}

export function applyShowToolTab(layout: PanelDockLayout, id: ToolTabId, _band?: PanelBand): PanelDockLayout {
	void _band;
	const entry: PanelTab = { type: "tool", id };
	const next = cloneLayout(layout);
	const idx = findTabIndex(next, entry);
	if (idx >= 0) {
		next.activeIndex = idx;
		return next;
	}
	next.tabs.push(entry);
	next.activeIndex = next.tabs.length - 1;
	return next;
}

export function applyFocusToolTab(layout: PanelDockLayout, id: ToolTabId): PanelDockLayout {
	return applyShowToolTab(layout, id);
}

export function parsePanelTab(raw: unknown): PanelTab | null {
	if (!raw || typeof raw !== "object") return null;
	const o = raw as Record<string, unknown>;
	if (o.type === "tool" && typeof o.id === "string" && TOOL_TAB_IDS.includes(o.id as ToolTabId)) {
		return { type: "tool", id: o.id as ToolTabId };
	}
	if (o.type === "file" && typeof o.path === "string" && o.path.length > 0) {
		return { type: "file", path: o.path };
	}
	return null;
}

export function serializePanelTab(e: PanelTab): string {
	return JSON.stringify(e);
}

export function parsePanelTabJson(raw: string): PanelTab | null {
	try {
		return parsePanelTab(JSON.parse(raw) as unknown);
	} catch {
		return null;
	}
}

export const PANEL_TAB_DND_TYPE = "application/x-wop-panel-tab";

/** Drag from explorer (and similar): workspace-relative file path. */
export const WOP_FILE_PATH_DND_TYPE = "application/x-wop-file-path";

/** Optional: source grid cell index when dragging a panel tab (cross-cell moves). */
export const WOP_DND_SOURCE_CELL_TYPE = "application/x-wop-dnd-source-cell";

/** Drag entire workspace grid cell (swap pane layouts with another cell). */
export const WOP_WORKSPACE_PANE_DND_TYPE = "application/x-wop-workspace-pane";

export function serializeWorkspacePaneCellIndex(cellIndex: number): string {
	return String(cellIndex);
}

export function parseWorkspacePaneCellIndex(raw: string): number | null {
	const n = parseInt(raw, 10);
	return Number.isFinite(n) && n >= 0 ? n : null;
}

export function serializeFilePathForDrag(path: string): string {
	return JSON.stringify({ path });
}

export function parseFilePathDragJson(raw: string): string | null {
	try {
		const o = JSON.parse(raw) as unknown;
		if (!o || typeof o !== "object") return null;
		const p = (o as Record<string, unknown>).path;
		return typeof p === "string" && p.length > 0 ? p : null;
	} catch {
		return null;
	}
}

export function isExplorerFilePathDrag(dt: DataTransfer): boolean {
	return dataTransferHasType(dt, WOP_FILE_PATH_DND_TYPE) || dt.types?.includes("text/plain") === true;
}

/** Path from an explorer/file-row drag (`application/x-wop-file-path` or `text/plain`). */
export function readDraggedExplorerFilePath(dt: DataTransfer): string | null {
	const j = parseFilePathDragJson(dt.getData(WOP_FILE_PATH_DND_TYPE));
	if (j) return j;
	const plain = dt.getData("text/plain").trim();
	if (plain && !plain.includes("\n") && !plain.includes("\r")) return plain;
	return null;
}

type StripsV2 = Record<PanelBand, PanelTab[]>;

function parseStrips(raw: unknown): StripsV2 | null {
	if (!raw || typeof raw !== "object") return null;
	const o = raw as Record<string, unknown>;
	const top = o.top;
	const bottom = o.bottom;
	if (!Array.isArray(top) || !Array.isArray(bottom)) return null;
	const parseArr = (a: unknown[]): PanelTab[] => {
		const out: PanelTab[] = [];
		for (const x of a) {
			const e = parsePanelTab(x);
			if (e) out.push(e);
		}
		return out;
	};
	return { top: parseArr(top), bottom: parseArr(bottom) };
}

function mergeStripsToTabs(
	strips: StripsV2,
	activeIndexByBand: Record<PanelBand, number>,
): PanelDockLayout {
	const seen = new Set<string>();
	const tabs: PanelTab[] = [];
	for (const e of strips.top) {
		const k = panelTabKey(e);
		if (!seen.has(k)) {
			seen.add(k);
			tabs.push(e);
		}
	}
	for (const e of strips.bottom) {
		const k = panelTabKey(e);
		if (!seen.has(k)) {
			seen.add(k);
			tabs.push(e);
		}
	}
	if (tabs.length === 0) return cloneLayout(PANEL_DOCK_DEFAULTS);

	let activeIndex = 0;
	const bottomEntry = strips.bottom[activeIndexByBand.bottom];
	const topEntry = strips.top[activeIndexByBand.top];
	if (bottomEntry) {
		const idx = tabs.findIndex((t) => tabsEqual(t, bottomEntry));
		if (idx >= 0) activeIndex = idx;
	} else if (topEntry) {
		const idx = tabs.findIndex((t) => tabsEqual(t, topEntry));
		if (idx >= 0) activeIndex = idx;
	}
	activeIndex = Math.min(Math.max(0, activeIndex), tabs.length - 1);
	return { tabs, activeIndex };
}

function parseBand(raw: unknown): PanelBand | null {
	if (raw === "top" || raw === "bottom") return raw;
	if (raw === "middle") return "top";
	if (raw === "right") return "bottom";
	return null;
}

type LegacyPlacement = { zone: string; visible: boolean; order: number };

function migrateLegacyToolDockObject(o: Record<string, unknown>): PanelDockLayout {
	const strips: StripsV2 = {
		top: [
			{ type: "tool", id: "terminal" },
			{ type: "tool", id: "output" },
		],
		bottom: [
			{ type: "tool", id: "problems" },
			{ type: "tool", id: "tool_log" },
		],
	};

	const parsedStrips = parseStrips(o.strips);
	if (parsedStrips) {
		strips.top = parsedStrips.top;
		strips.bottom = parsedStrips.bottom;
	} else if (o.panels && typeof o.panels === "object") {
		const byZone: Record<PanelBand, { id: ToolTabId; order: number }[]> = { top: [], bottom: [] };
		for (const id of TOOL_TAB_IDS) {
			const p = (o.panels as Record<string, LegacyPlacement>)[id];
			if (!p || !p.visible) continue;
			const z = parseBand(p.zone) ?? "bottom";
			byZone[z].push({ id, order: typeof p.order === "number" && Number.isFinite(p.order) ? p.order : 0 });
		}
		for (const band of PANEL_BANDS) {
			byZone[band].sort((a, b) => a.order - b.order);
			strips[band] = byZone[band].map((x) => ({ type: "tool" as const, id: x.id }));
		}
	}

	const activeIndexByBand: Record<PanelBand, number> = { top: 0, bottom: 0 };
	const bySlot = o.activeTabBySlot as Record<string, unknown> | undefined;
	let legacyTop: ToolTabId = "terminal";
	let legacyBottom: ToolTabId = "problems";
	if (bySlot && typeof bySlot === "object") {
		if (bySlot.top && TOOL_TAB_IDS.includes(bySlot.top as ToolTabId)) legacyTop = bySlot.top as ToolTabId;
		if (bySlot.bottom && TOOL_TAB_IDS.includes(bySlot.bottom as ToolTabId)) {
			legacyBottom = bySlot.bottom as ToolTabId;
		}
	} else {
		if (o.topActiveTab && TOOL_TAB_IDS.includes(o.topActiveTab as ToolTabId)) legacyTop = o.topActiveTab as ToolTabId;
		if (o.bottomActiveTab && TOOL_TAB_IDS.includes(o.bottomActiveTab as ToolTabId)) {
			legacyBottom = o.bottomActiveTab as ToolTabId;
		}
	}

	const ai = o.activeIndexBySlot ?? o.activeIndexByBand;
	if (ai && typeof ai === "object") {
		const r = ai as Record<string, unknown>;
		if (typeof r.top === "number" && Number.isFinite(r.top)) activeIndexByBand.top = Math.floor(r.top);
		if (typeof r.bottom === "number" && Number.isFinite(r.bottom)) {
			activeIndexByBand.bottom = Math.floor(r.bottom);
		}
	} else {
		const it = strips.top.findIndex((e) => e.type === "tool" && e.id === legacyTop);
		const ib = strips.bottom.findIndex((e) => e.type === "tool" && e.id === legacyBottom);
		if (it >= 0) activeIndexByBand.top = it;
		if (ib >= 0) activeIndexByBand.bottom = ib;
	}

	for (const b of PANEL_BANDS) {
		const n = strips[b].length;
		activeIndexByBand[b] = n === 0 ? 0 : Math.min(Math.max(0, activeIndexByBand[b]), n - 1);
	}

	return mergeStripsToTabs(strips, activeIndexByBand);
}

function parseV2(raw: unknown): PanelDockLayout | null {
	if (!raw || typeof raw !== "object") return null;
	const o = raw as Record<string, unknown>;
	const strips = parseStrips(o.strips);
	if (!strips) return null;
	const activeIndexByBand: Record<PanelBand, number> = { top: 0, bottom: 0 };
	const ai = o.activeIndexByBand ?? o.activeIndexBySlot;
	if (ai && typeof ai === "object") {
		const r = ai as Record<string, unknown>;
		if (typeof r.top === "number" && Number.isFinite(r.top)) activeIndexByBand.top = Math.floor(r.top);
		if (typeof r.bottom === "number" && Number.isFinite(r.bottom)) {
			activeIndexByBand.bottom = Math.floor(r.bottom);
		}
	}
	for (const b of PANEL_BANDS) {
		const n = strips[b].length;
		activeIndexByBand[b] = n === 0 ? 0 : Math.min(Math.max(0, activeIndexByBand[b]), n - 1);
	}
	return mergeStripsToTabs(strips, activeIndexByBand);
}

/** Parse a single stored layout object (`{ tabs, activeIndex }` / v3). */
export function parsePanelDockLayoutPayload(raw: unknown): PanelDockLayout | null {
	return parseV3(raw);
}

function parseV3(raw: unknown): PanelDockLayout | null {
	if (!raw || typeof raw !== "object") return null;
	const o = raw as Record<string, unknown>;
	if (!Array.isArray(o.tabs)) return null;
	const tabs: PanelTab[] = [];
	for (const x of o.tabs) {
		const e = parsePanelTab(x);
		if (e) tabs.push(e);
	}
	let activeIndex = typeof o.activeIndex === "number" && Number.isFinite(o.activeIndex) ? Math.floor(o.activeIndex) : 0;
	if (tabs.length === 0) {
		return { tabs: [], activeIndex: 0 };
	}
	activeIndex = Math.min(Math.max(0, activeIndex), tabs.length - 1);
	return { tabs, activeIndex };
}

export function readPanelDockLayout(): PanelDockLayout {
	if (typeof window === "undefined") return cloneLayout(PANEL_DOCK_DEFAULTS);
	try {
		const raw = localStorage.getItem(PANEL_DOCK_KEY);
		if (raw) {
			const parsedUnknown = JSON.parse(raw) as unknown;
			const v3 = parseV3(parsedUnknown);
			if (v3) return v3;
			const v2 = parseV2(parsedUnknown);
			if (v2) {
				writePanelDockLayout(v2);
				return v2;
			}
		}
	} catch {
		/* fall through */
	}
	try {
		const leg = localStorage.getItem(LEGACY_TOOL_DOCK_KEY);
		if (leg) {
			const migrated = migrateLegacyToolDockObject(JSON.parse(leg) as Record<string, unknown>);
			writePanelDockLayout(migrated);
			localStorage.removeItem(LEGACY_TOOL_DOCK_KEY);
			return migrated;
		}
	} catch {
		/* ignore */
	}
	return cloneLayout(PANEL_DOCK_DEFAULTS);
}

export function writePanelDockLayout(layout: PanelDockLayout): void {
	const copy = cloneLayout(layout);
	clampActive(copy);
	try {
		localStorage.setItem(
			PANEL_DOCK_KEY,
			JSON.stringify({
				v: 3,
				tabs: copy.tabs,
				activeIndex: copy.activeIndex,
			}),
		);
	} catch {
		/* ignore */
	}
}
