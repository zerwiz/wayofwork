/**
 * **One** visible band label where legacy “Dock” chips remain (`PanelDockBand`); the main area uses `WorkspacePane` (Zed-style tab row).
 * Matches the product goal: same chrome as Zed-class shells where the **center is also a tab stack**, not a different “kind” of region in the UI. (Zed internals still distinguish pane vs dock; we do not show two words.)
 */
export const WOP_UNIFIED_DOCK_BAND_LABEL = "Dock" as const;

/** Outer wrapper for the left band chip in a `h-9` tab row. */
export function wopUnifiedDockRegionChipWrapperClass(): string {
	return "flex h-9 shrink-0 items-center gap-2 border-r border-[#2d2d2d] px-3";
}

/** Typography for the band chip. */
export function wopUnifiedDockRegionChipTextClass(): string {
	return "max-w-[6.5rem] min-w-0 select-none truncate font-mono text-[10px] font-bold uppercase tracking-wider text-[#858585]";
}
