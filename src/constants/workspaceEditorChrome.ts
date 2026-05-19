/**
 * Shared classes for {@link ../components/WorkspaceTextBuffer.tsx} — line gutter + textarea must use the
 * same font size and line height so logical rows stay aligned (soft-wrap measurement uses textarea metrics).
 *
 * Product doc: **`docs/WOP_CODE_EDITOR_LINE_NUMBERS.md`** (repo root).
 */
export const WOP_WORKSPACE_EDITOR_SCROLL_DARK = "min-h-0 flex-1 overflow-auto font-mono";
export const WOP_WORKSPACE_EDITOR_SCROLL_LIGHT = "min-h-0 flex-1 overflow-auto font-mono";

export const WOP_WORKSPACE_EDITOR_GUTTER_DARK =
	"w-9 py-1 pr-2 font-mono text-[13px] leading-relaxed tabular-nums text-[#858585]";
export const WOP_WORKSPACE_EDITOR_GUTTER_LIGHT =
	"w-9 py-1 pr-2 font-mono text-[13px] leading-relaxed tabular-nums text-[#858585]";

export const WOP_WORKSPACE_EDITOR_TEXTAREA_DARK =
	"py-1 pr-2 text-[13px] leading-relaxed text-[#cccccc] selection:bg-[#9a3412]";
export const WOP_WORKSPACE_EDITOR_TEXTAREA_LIGHT =
	"py-1 pr-2 text-[13px] leading-relaxed text-[#333333] selection:bg-[#fed7aa]/40";

/** Hide find bar chrome while keeping layout slot stable */
export const WOP_WORKSPACE_EDITOR_FIND_BAR_INACTIVE = "shrink-0 border-t border-transparent";
