import { useRef, useState, type ReactNode } from "react";
import {
	PANEL_TAB_DND_TYPE,
	WOP_FILE_PATH_DND_TYPE,
	WOP_WORKSPACE_PANE_DND_TYPE,
} from "../utils/panelDockLayout";
import { dataTransferHasType } from "../utils/dataTransferTypes";
import { hitTestWorkspaceDropZone, type WopDropZone } from "../utils/workspaceDropZones";
import { WorkspaceDropOverlay } from "./WorkspaceDropOverlay";

function isWorkspaceDragPayload(dt: DataTransfer): boolean {
	return (
		dataTransferHasType(dt, PANEL_TAB_DND_TYPE) ||
		dataTransferHasType(dt, WOP_FILE_PATH_DND_TYPE) ||
		dataTransferHasType(dt, WOP_WORKSPACE_PANE_DND_TYPE)
	);
}

/**
 * Zed-style snap overlay + drop routing for a grid cell (or 1×1 workspace).
 * Uses capture so children (editor, tabs) do not have to opt in.
 */
export function WorkspaceCellDropSurface({
	cellIndex,
	cols: _cols,
	rows: _rows,
	children,
	onDropPayload,
	className,
}: {
	cellIndex: number;
	/** Kept for API parity with grid hit-testing (drop routing uses `surfaceCellIndex` + zone). */
	cols: number;
	rows: number;
	children: ReactNode;
	/** `surfaceCellIndex` is this surface’s grid cell; `zone` is the snap region (used to grow 1×1 → split). */
	onDropPayload: (e: React.DragEvent, surfaceCellIndex: number, zone: WopDropZone) => void;
	className?: string;
}) {
	const [zone, setZone] = useState<WopDropZone | null>(null);
	const zoneRef = useRef<WopDropZone | null>(null);

	const syncZone = (z: WopDropZone | null) => {
		zoneRef.current = z;
		setZone(z);
	};

	const onDragOverCapture = (e: React.DragEvent) => {
		if (!isWorkspaceDragPayload(e.dataTransfer)) return;
		e.preventDefault();
		const el = e.currentTarget as HTMLElement;
		const top =
			typeof document !== "undefined" ? (document.elementFromPoint(e.clientX, e.clientY) as Element | null) : null;
		const overTabBar =
			!!top &&
			el.contains(top) &&
			(top as HTMLElement).closest?.("[data-wop-workspace-tab-bar]") != null;
		if (overTabBar) {
			syncZone(null);
		} else {
			const r = el.getBoundingClientRect();
			const z = hitTestWorkspaceDropZone(e.clientX, e.clientY, r);
			syncZone(z);
		}
		e.dataTransfer.dropEffect = "move";
	};

	const onDragLeave = (e: React.DragEvent) => {
		const el = e.currentTarget as HTMLElement;
		const rel = e.relatedTarget as Node | null;
		if (rel && el.contains(rel)) return;
		syncZone(null);
	};

	/** Bubble phase: tab row calls `stopPropagation` so bar drops stay in `WorkspacePane`. */
	const onDropBubble = (e: React.DragEvent) => {
		if (!isWorkspaceDragPayload(e.dataTransfer)) return;
		e.preventDefault();
		const z = zoneRef.current ?? "center";
		onDropPayload(e, cellIndex, z);
		syncZone(null);
	};

	const mergedClass = ["relative", className ?? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"]
		.join(" ")
		.replace(/\s+/g, " ")
		.trim();

	return (
		<div
			className={mergedClass}
			onDragOverCapture={onDragOverCapture}
			onDragLeave={onDragLeave}
			onDrop={onDropBubble}
		>
			{children}
			{zone ? <WorkspaceDropOverlay zone={zone} /> : null}
		</div>
	);
}
