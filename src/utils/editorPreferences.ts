const AUTO_SAVE_KEY = "wayofpi.editor.autoSave";

export function readAutoSaveInitial(): boolean {
	if (typeof window === "undefined") return false;
	try {
		return localStorage.getItem(AUTO_SAVE_KEY) === "1";
	} catch {
		return false;
	}
}

export function writeAutoSave(enabled: boolean): void {
	try {
		localStorage.setItem(AUTO_SAVE_KEY, enabled ? "1" : "0");
	} catch {
		/* ignore */
	}
}
