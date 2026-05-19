import type { WopDropZone } from "../utils/workspaceDropZones";

/** Zed-like highlight: center = full inner slot; edges = strips toward neighbors. */
export function WorkspaceDropOverlay({ zone }: { zone: WopDropZone }) {
	const base =
		"pointer-events-none absolute z-[100] border-2 border-[#ea580c] bg-[#ea580c]/20 shadow-[inset_0_0_0_1px_rgba(234,88,12,0.35)]";
	switch (zone) {
		case "center":
			return <div className={`${base} inset-[10%] rounded-md`} aria-hidden />;
		case "left":
			return <div className={`${base} inset-y-0 left-0 w-[24%] rounded-l-md border-r-0`} aria-hidden />;
		case "right":
			return <div className={`${base} inset-y-0 right-0 w-[24%] rounded-r-md border-l-0`} aria-hidden />;
		case "top":
			return <div className={`${base} inset-x-0 top-0 h-[24%] rounded-t-md border-b-0`} aria-hidden />;
		case "bottom":
			return <div className={`${base} inset-x-0 bottom-0 h-[24%] rounded-b-md border-t-0`} aria-hidden />;
	}
}
