const STORAGE_KEY = "wayofpi.terminal.ui.v1";

export const TERMINAL_UI_DEFAULT_FONT =
	"Consolas, 'Liberation Mono', 'Courier New', monospace";

export type TerminalUiPreferences = {
	/** xterm font size (px). */
	fontSize: number;
	/** Empty = use {@link TERMINAL_UI_DEFAULT_FONT}. */
	fontFamily: string;
};

export const TERMINAL_UI_DEFAULTS: TerminalUiPreferences = {
	fontSize: 13,
	fontFamily: "",
};

export function clampTerminalFontSize(n: number): number {
	if (!Number.isFinite(n)) return TERMINAL_UI_DEFAULTS.fontSize;
	return Math.min(36, Math.max(8, Math.round(n)));
}

export function readTerminalUiPreferences(): TerminalUiPreferences {
	if (typeof window === "undefined") return { ...TERMINAL_UI_DEFAULTS };
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { ...TERMINAL_UI_DEFAULTS };
		const o = JSON.parse(raw) as Partial<TerminalUiPreferences>;
		const fontSize = clampTerminalFontSize(
			typeof o.fontSize === "number" ? o.fontSize : TERMINAL_UI_DEFAULTS.fontSize,
		);
		const fontFamily =
			typeof o.fontFamily === "string" ? o.fontFamily.trim().slice(0, 240) : TERMINAL_UI_DEFAULTS.fontFamily;
		return { fontSize, fontFamily };
	} catch {
		return { ...TERMINAL_UI_DEFAULTS };
	}
}

export function writeTerminalUiPreferences(next: TerminalUiPreferences): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
	} catch {
		/* ignore */
	}
	window.dispatchEvent(new CustomEvent("wop-terminal-ui-prefs"));
}

export function resetTerminalUiPreferences(): void {
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch {
		/* ignore */
	}
	window.dispatchEvent(new CustomEvent("wop-terminal-ui-prefs"));
}
