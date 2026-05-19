import type { PanelBand } from "./panelDockLayout";

export type { PanelBand as HorizontalToolDockSlot, PanelBand as ToolPanelZone, ToolTabId as ToolPanelId } from "./panelDockLayout";
export { PANEL_BANDS as HORIZONTAL_TOOL_DOCK_SLOTS, PANEL_BAND_CHROME as HORIZONTAL_TOOL_DOCK_UI } from "./panelDockLayout";

/** Persisted technical-shell UI (primary left sidebar visibility). */
const LEFT_SIDEBAR_KEY = "wayofpi.technical.leftSidebarVisible";

export function readLeftSidebarVisibleInitial(): boolean {
	if (typeof window === "undefined") return true;
	try {
		if (localStorage.getItem(LEFT_SIDEBAR_KEY) === "0") return false;
	} catch {
		/* ignore */
	}
	return true;
}

export function writeLeftSidebarVisible(visible: boolean): void {
	try {
		localStorage.setItem(LEFT_SIDEBAR_KEY, visible ? "1" : "0");
	} catch {
		/* ignore */
	}
}

import type { ChatDockRegion } from "../types/technicalShell";
export type { ChatDockRegion };

export interface TechnicalDockLayout {
	chatDock: ChatDockRegion;
	/** When false, only a slim restore control is shown (more editor / terminal space). */
	agentPanelVisible: boolean;
	/** Primary sidebar (Explorer / Search / …) width beside the activity bar. */
	leftSidebarWidthPx: number;
	/** Width (px) when `chatDock === "right"`; height (px) when `chatDock === "bottom"`. */
	chatSizePx: number;
	/** Row height (px) for each horizontal panel-dock band. */
	horizontalToolDockHeightsPx: Record<PanelBand, number>;
}

export const DOCK_DEFAULTS: TechnicalDockLayout = {
	chatDock: "right",
	agentPanelVisible: true,
	leftSidebarWidthPx: 256,
	chatSizePx: 400,
	horizontalToolDockHeightsPx: { top: 280, bottom: 140 },
};

const DOCK_KEY = "wayofpi.technical.dockLayout";

function clamp(n: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, Math.round(n)));
}

export function clampLeftSidebarWidth(px: number): number {
	return clamp(px, 200, 640);
}

export function clampChatWidth(px: number): number {
	return clamp(px, 220, 1280);
}

export function clampChatHeight(px: number): number {
	return clamp(px, 120, 720);
}

/**
 * Default height when the session chat docks to the bottom — a compact strip, not a full editor split.
 * (Right-dock `chatSizePx` is a *width*; reusing it 1:1 as height produced a huge empty bottom panel.)
 */
export const DEFAULT_COMPACT_BOTTOM_CHAT_HEIGHT_PX = 236;

/** Recompute `chatSizePx` when moving the agent panel between right (width) and bottom (height). */
export function chatSizePxWhenSwitchingDock(
	prevDock: ChatDockRegion,
	nextDock: ChatDockRegion,
	sizePx: number,
): number {
	if (prevDock === nextDock) {
		return nextDock === "right" ? clampChatWidth(sizePx) : clampChatHeight(sizePx);
	}
	if (nextDock === "bottom") {
		if (prevDock === "right") {
			return clampChatHeight(Math.min(sizePx, DEFAULT_COMPACT_BOTTOM_CHAT_HEIGHT_PX));
		}
		return clampChatHeight(sizePx);
	}
	return clampChatWidth(sizePx);
}

export function clampBottomPanelHeight(px: number): number {
	return clamp(px, 100, 560);
}

export function clampTopPanelHeight(px: number): number {
	return clamp(px, 120, 640);
}

export function readDockLayout(): TechnicalDockLayout {
	const base = { ...DOCK_DEFAULTS };
	if (typeof window === "undefined") return base;
	try {
		const raw = localStorage.getItem(DOCK_KEY);
		if (!raw) return base;
		const o = JSON.parse(raw) as Record<string, unknown>;
		if (o.chatDock === "right" || o.chatDock === "bottom") base.chatDock = o.chatDock;
		if (typeof o.agentPanelVisible === "boolean") base.agentPanelVisible = o.agentPanelVisible;
		if (typeof o.leftSidebarWidthPx === "number" && Number.isFinite(o.leftSidebarWidthPx)) {
			base.leftSidebarWidthPx = clampLeftSidebarWidth(o.leftSidebarWidthPx);
		}
		if (typeof o.chatSizePx === "number" && Number.isFinite(o.chatSizePx)) {
			let px =
				base.chatDock === "right"
					? clampChatWidth(o.chatSizePx as number)
					: clampChatHeight(o.chatSizePx as number);
			/* One-time repair: bottom height was often the right-column width (~400px) from older builds. */
			if (base.chatDock === "bottom" && px > 360) {
				px = clampChatHeight(DEFAULT_COMPACT_BOTTOM_CHAT_HEIGHT_PX);
			}
			base.chatSizePx = px;
		}
		let topH = DOCK_DEFAULTS.horizontalToolDockHeightsPx.top;
		let botH = DOCK_DEFAULTS.horizontalToolDockHeightsPx.bottom;
		const hObj = o.horizontalToolDockHeightsPx;
		if (hObj && typeof hObj === "object") {
			const rec = hObj as Record<string, unknown>;
			if (typeof rec.top === "number" && Number.isFinite(rec.top)) topH = clampTopPanelHeight(rec.top);
			if (typeof rec.bottom === "number" && Number.isFinite(rec.bottom)) botH = clampBottomPanelHeight(rec.bottom);
		} else {
			if (typeof o.topPanelHeightPx === "number" && Number.isFinite(o.topPanelHeightPx)) {
				topH = clampTopPanelHeight(o.topPanelHeightPx as number);
			}
			if (typeof o.bottomPanelHeightPx === "number" && Number.isFinite(o.bottomPanelHeightPx)) {
				botH = clampBottomPanelHeight(o.bottomPanelHeightPx as number);
			}
		}
		base.horizontalToolDockHeightsPx = { top: topH, bottom: botH };
	} catch {
		/* ignore */
	}
	return base;
}

export function writeDockLayout(layout: TechnicalDockLayout): void {
	try {
		localStorage.setItem(
			DOCK_KEY,
			JSON.stringify({
				chatDock: layout.chatDock,
				agentPanelVisible: layout.agentPanelVisible,
				leftSidebarWidthPx: layout.leftSidebarWidthPx,
				chatSizePx: layout.chatSizePx,
				horizontalToolDockHeightsPx: layout.horizontalToolDockHeightsPx,
			}),
		);
	} catch {
		/* ignore */
	}
}
