import { useCallback, useEffect, useState } from "react";
import {
	clampTerminalFontSize,
	readTerminalUiPreferences,
	resetTerminalUiPreferences,
	TERMINAL_UI_DEFAULTS,
	writeTerminalUiPreferences,
	type TerminalUiPreferences,
} from "../utils/terminalUiPreferences";

export function useTerminalUiPreferences() {
	const [prefs, setPrefsState] = useState<TerminalUiPreferences>(() =>
		typeof window !== "undefined" ? readTerminalUiPreferences() : { ...TERMINAL_UI_DEFAULTS },
	);

	useEffect(() => {
		const sync = () => setPrefsState(readTerminalUiPreferences());
		window.addEventListener("wop-terminal-ui-prefs", sync);
		window.addEventListener("storage", sync);
		return () => {
			window.removeEventListener("wop-terminal-ui-prefs", sync);
			window.removeEventListener("storage", sync);
		};
	}, []);

	const setPrefs = useCallback((patch: Partial<TerminalUiPreferences>) => {
		const cur = readTerminalUiPreferences();
		const next: TerminalUiPreferences = {
			...cur,
			...patch,
			fontSize:
				patch.fontSize !== undefined ? clampTerminalFontSize(patch.fontSize) : cur.fontSize,
			fontFamily: patch.fontFamily !== undefined ? patch.fontFamily : cur.fontFamily,
		};
		writeTerminalUiPreferences(next);
		setPrefsState(next);
	}, []);

	const reset = useCallback(() => {
		resetTerminalUiPreferences();
		setPrefsState({ ...TERMINAL_UI_DEFAULTS });
	}, []);

	return { prefs, setPrefs, reset };
}
