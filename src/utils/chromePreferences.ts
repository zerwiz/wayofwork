/** Technical shell chrome + editor presentation (View → Appearance). */
const KEY = "wayofpi.technical.chromePreferences";

export interface ChromePreferences {
	statusBarVisible: boolean;
	menuBarVisible: boolean;
	editorWordWrap: boolean;
	breadcrumbsVisible: boolean;
	/** 75–150; applied to main technical work area (Chromium `zoom`). */
	uiZoomPercent: number;
	centeredEditorLayout: boolean;
}

export const CHROME_DEFAULTS: ChromePreferences = {
	statusBarVisible: true,
	menuBarVisible: true,
	editorWordWrap: true,
	breadcrumbsVisible: true,
	uiZoomPercent: 100,
	centeredEditorLayout: false,
};

export function readChromePreferences(): ChromePreferences {
	const base: ChromePreferences = { ...CHROME_DEFAULTS };
	if (typeof window === "undefined") return base;
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return base;
		const o = JSON.parse(raw) as Partial<ChromePreferences>;
		if (typeof o.statusBarVisible === "boolean") base.statusBarVisible = o.statusBarVisible;
		if (typeof o.menuBarVisible === "boolean") base.menuBarVisible = o.menuBarVisible;
		if (typeof o.editorWordWrap === "boolean") base.editorWordWrap = o.editorWordWrap;
		if (typeof o.breadcrumbsVisible === "boolean") base.breadcrumbsVisible = o.breadcrumbsVisible;
		if (typeof o.uiZoomPercent === "number" && Number.isFinite(o.uiZoomPercent)) {
			base.uiZoomPercent = Math.min(150, Math.max(75, Math.round(o.uiZoomPercent)));
		}
		if (typeof o.centeredEditorLayout === "boolean") base.centeredEditorLayout = o.centeredEditorLayout;
	} catch {
		/* ignore */
	}
	return base;
}

export function writeChromePreferences(p: ChromePreferences): void {
	try {
		localStorage.setItem(KEY, JSON.stringify(p));
	} catch {
		/* ignore */
	}
}
