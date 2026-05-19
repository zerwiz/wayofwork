/** Simple UI Chat tab: editor vs chat arrangement (persisted). */
export type SimpleChatWorkspaceLayout = "stacked" | "side_by_side";

const STORAGE_KEY = "wayofpi.simple.chatWorkspaceLayout.v1";

/** Persisted JSON may include `v` for one-time layout migrations (not part of React state). */
const STORAGE_FORMAT_VERSION = 2;

/** Previous factory default — widen once for older saves that never customized the splitter. */
const LEGACY_DEFAULT_CHAT_WIDTH_PX = 420;

export interface SimpleChatWorkspaceState {
	layout: SimpleChatWorkspaceLayout;
	/** Width of the chat column when `layout === "side_by_side"` (md+). */
	chatColumnWidthPx: number;
}

export const SIMPLE_CHAT_WORKSPACE_DEFAULTS: SimpleChatWorkspaceState = {
	/** Chat left, editor right (with project panel) — avoids cramped editor-above-chat when editing. */
	layout: "side_by_side",
	/** Fallback when `window` is unavailable; hydrated reads use `defaultChatColumnWidthForViewport()`. */
	chatColumnWidthPx: 560,
};

/** Initial chat column width (~40% of the main band after nav + right strip) for md+ side-by-side. */
export function defaultChatColumnWidthForViewport(): number {
	if (typeof window === "undefined") return SIMPLE_CHAT_WORKSPACE_DEFAULTS.chatColumnWidthPx;
	/* Reserve space for left rail + right “Project files” column (approx.; toggles vary). */
	const reservedApprox = 300;
	const usable = Math.max(520, window.innerWidth - reservedApprox);
	return clampSimpleChatColumnWidth(Math.round(usable * 0.42));
}

export function clampSimpleChatColumnWidth(px: number): number {
	return Math.min(1280, Math.max(260, Math.round(px)));
}

export function readSimpleChatWorkspaceState(): SimpleChatWorkspaceState {
	const base: SimpleChatWorkspaceState = {
		...SIMPLE_CHAT_WORKSPACE_DEFAULTS,
		chatColumnWidthPx: defaultChatColumnWidthForViewport(),
	};
	if (typeof window === "undefined") return base;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return base;
		const o = JSON.parse(raw) as Partial<SimpleChatWorkspaceState> & { v?: number };
		const diskFormat = typeof o.v === "number" && Number.isFinite(o.v) ? o.v : 0;
		if (o.layout === "stacked" || o.layout === "side_by_side") base.layout = o.layout;
		if (typeof o.chatColumnWidthPx === "number" && Number.isFinite(o.chatColumnWidthPx)) {
			base.chatColumnWidthPx = clampSimpleChatColumnWidth(o.chatColumnWidthPx);
		}
		if (
			diskFormat < STORAGE_FORMAT_VERSION &&
			typeof o.chatColumnWidthPx === "number" &&
			o.chatColumnWidthPx === LEGACY_DEFAULT_CHAT_WIDTH_PX
		) {
			base.chatColumnWidthPx = defaultChatColumnWidthForViewport();
			writeSimpleChatWorkspaceState(base);
		}
	} catch {
		/* ignore */
	}
	return base;
}

export function writeSimpleChatWorkspaceState(state: SimpleChatWorkspaceState): void {
	try {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				v: STORAGE_FORMAT_VERSION,
				layout: state.layout,
				chatColumnWidthPx: clampSimpleChatColumnWidth(state.chatColumnWidthPx),
			}),
		);
	} catch {
		/* ignore */
	}
}
