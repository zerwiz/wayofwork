/**
 * **`GET /api/manifest`** — Phase 1 **static** snapshot (filesystem only).
 * Does **not** spawn Pi; see **[docs/WOP_UI_MANIFEST.md](../../../docs/WOP_UI_MANIFEST.md)** for runtime introspection target.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { listWorkspaceFolders } from "./workspace-state";

const MAX_SHIMS_PER_ROOT = 120;

type SettingsExtensionsSlice = {
	root: string;
	settingsPath: string;
	/** Raw `extensions[]` strings from `.pi/settings.json` (paths or ids as stored). */
	entries: string[];
};

type ShimSlice = {
	root: string;
	dir: string;
	/** Basenames under `.pi/extensions/*.ts` (Pi loads these as extension entrypoints). */
	files: string[];
};

export type WebManifestV1 = {
	version: 1;
	source: "filesystem_static";
	/** True only when headless Pi owns tools/commands (not implemented yet). */
	piDrivesRuntime: false;
	settingsExtensions: SettingsExtensionsSlice[];
	shimFiles: ShimSlice[];
	tools: unknown[];
	slashCommands: unknown[];
	note: string;
};

function tryReadSettingsExtensions(root: string): SettingsExtensionsSlice | null {
	const settingsPath = join(root, ".pi", "settings.json");
	if (!existsSync(settingsPath)) return null;
	try {
		const raw = readFileSync(settingsPath, "utf8");
		const j = JSON.parse(raw) as { extensions?: unknown };
		const ext = j.extensions;
		const entries = Array.isArray(ext) ? ext.map((x) => String(x ?? "").trim()).filter(Boolean) : [];
		return { root, settingsPath, entries };
	} catch {
		return { root, settingsPath, entries: [] };
	}
}

function tryListPiExtensionShims(root: string): ShimSlice | null {
	const dir = join(root, ".pi", "extensions");
	if (!existsSync(dir)) return null;
	try {
		const names = readdirSync(dir).filter((n) => n.endsWith(".ts") && !n.startsWith("."));
		return { root, dir, files: names.slice(0, MAX_SHIMS_PER_ROOT) };
	} catch {
		return null;
	}
}

/** Collect manifest from all workspace roots (multi-root). */
export function collectStaticWebManifest(): WebManifestV1 {
	const roots = listWorkspaceFolders().map((f) => f.path);
	const uniq = [...new Set(roots)];

	const settingsExtensions: SettingsExtensionsSlice[] = [];
	const shimFiles: ShimSlice[] = [];

	for (const root of uniq) {
		const s = tryReadSettingsExtensions(root);
		if (s && (s.entries.length > 0 || existsSync(s.settingsPath))) {
			settingsExtensions.push(s);
		}
		const sh = tryListPiExtensionShims(root);
		if (sh && sh.files.length > 0) {
			shimFiles.push(sh);
		}
	}

	return {
		version: 1,
		source: "filesystem_static",
		piDrivesRuntime: false,
		settingsExtensions,
		shimFiles,
		tools: [],
		slashCommands: [],
		note:
			"Static scan only — no Pi subprocess. Tools/slashCommands empty until headless Pi introspection ships (docs/WOP_UI_MANIFEST.md).",
	};
}
