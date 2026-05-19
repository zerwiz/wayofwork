/** Hit regions for Zed-style “snap” feedback when dropping files/tabs onto the workspace grid. */

export type WopDropZone = "center" | "left" | "right" | "top" | "bottom";

const DEFAULT_EDGE = 0.22;

export function hitTestWorkspaceDropZone(
	clientX: number,
	clientY: number,
	rect: DOMRect,
	edgeRatio = DEFAULT_EDGE,
): WopDropZone {
	const x = clientX - rect.left;
	const y = clientY - rect.top;
	const w = rect.width;
	const h = rect.height;
	const ew = w * edgeRatio;
	const eh = h * edgeRatio;
	if (x < ew) return "left";
	if (x > w - ew) return "right";
	if (y < eh) return "top";
	if (y > h - eh) return "bottom";
	return "center";
}

/** Map a zone on `cellIndex` to the grid cell that should receive the drop (edges prefer neighbors). */
export function resolveDropTargetCell(
	cellIndex: number,
	cols: number,
	rows: number,
	zone: WopDropZone,
): number {
	const col = cellIndex % cols;
	const row = Math.floor(cellIndex / cols);
	switch (zone) {
		case "left":
			return col > 0 ? cellIndex - 1 : cellIndex;
		case "right":
			return col < cols - 1 ? cellIndex + 1 : cellIndex;
		case "top":
			return row > 0 ? cellIndex - cols : cellIndex;
		case "bottom":
			return row < rows - 1 ? cellIndex + cols : cellIndex;
		default:
			return cellIndex;
	}
}
