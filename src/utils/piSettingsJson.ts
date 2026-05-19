/** Normalize Pi `extensions[]` entry for comparisons (trim only). */
export function normExtEntry(s: string): string {
	return String(s ?? "").trim();
}

/** Stable path for a shim under `.pi/extensions`. */
export function piExtensionShimRef(basename: string): string {
	const b = basename.replace(/^[/\\]+/, "").trim();
	return `.pi/extensions/${b}`;
}

/**
 * Merge `extensions` into existing `.pi/settings.json` text, preserving other keys.
 * @param raw — full file contents; empty string if file is missing
 */
export function mergePiSettingsExtensionsArray(raw: string, nextExtensions: string[]): string {
	let obj: Record<string, unknown> = {};
	if (raw.trim()) {
		try {
			const parsed = JSON.parse(raw) as unknown;
			if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
				obj = { ...(parsed as Record<string, unknown>) };
			}
		} catch {
			throw new Error("Existing .pi/settings.json is not valid JSON.");
		}
	}
	obj.extensions = nextExtensions;
	return `${JSON.stringify(obj, null, 2)}\n`;
}
