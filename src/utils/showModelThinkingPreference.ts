/** Shared chat preference (technical, simple, and Claw use the same storage). */
export const SHOW_MODEL_THINKING_STORAGE_KEY = "wayofpi.chat.showModelThinking";

const LEGACY_TECHNICAL_KEY = "wayofpi.technical.showModelThinking";

/** Default on; explicit `"0"` turns off. Reads legacy technical key until user saves once. */
export function readShowModelThinking(): boolean {
	try {
		const v = localStorage.getItem(SHOW_MODEL_THINKING_STORAGE_KEY);
		if (v === "0") return false;
		if (v === "1") return true;
		const legacy = localStorage.getItem(LEGACY_TECHNICAL_KEY);
		if (legacy === "0") return false;
		if (legacy === "1") return true;
		return true;
	} catch {
		return true;
	}
}

export function writeShowModelThinking(on: boolean): void {
	try {
		localStorage.setItem(SHOW_MODEL_THINKING_STORAGE_KEY, on ? "1" : "0");
	} catch {
		/* ignore */
	}
}
