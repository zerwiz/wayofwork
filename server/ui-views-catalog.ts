import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export const UI_VIEWS_CATALOG_REL = ".wayofpi/ui-views.json";
export const UI_VIEWS_SCHEMA_DOC_REL = "docs/WOP_SIMPLE_UI_VIEWS.md";

export type UiViewCatalogKind = "simpleTab" | "openFile" | "technicalActivity";

export interface UiViewCatalogEntry {
	id: string;
	label: string;
	kind: UiViewCatalogKind;
	target: string;
	hint?: string;
}

export interface UiViewsCatalogResponse {
	version: number;
	entries: UiViewCatalogEntry[];
	source: "workspace" | "default";
	catalogRelPath: string;
	schemaDocRelPath: string;
	parseError?: string;
}

const DEFAULT_ENTRIES: UiViewCatalogEntry[] = [
	{ id: "tab-chat", label: "Chat", kind: "simpleTab", target: "chat", hint: "Assistant" },
	{ id: "tab-team", label: "My team", kind: "simpleTab", target: "team", hint: "Agents" },
	{ id: "tab-models", label: "AI Brains", kind: "simpleTab", target: "models", hint: "Models" },
	{ id: "tab-projects", label: "Projects", kind: "simpleTab", target: "projects" },
	{ id: "tab-settings", label: "Settings", kind: "simpleTab", target: "settings", hint: "Appearance" },
	{ id: "doc-ui-manifest", label: "Docs: UI manifest strategy", kind: "openFile", target: "docs/WOP_UI_MANIFEST.md" },
	{
		id: "doc-simple-views",
		label: "Docs: edit this views catalog",
		kind: "openFile",
		target: UI_VIEWS_SCHEMA_DOC_REL,
	},
	{ id: "ext-agent-team", label: "Extension: agent-team", kind: "openFile", target: "extensions/agent-team.ts" },
	{ id: "ext-agent-chain", label: "Extension: agent-chain", kind: "openFile", target: "extensions/agent-chain.ts" },
	{ id: "ext-pi-pi", label: "Extension: pi-pi", kind: "openFile", target: "extensions/pi-pi.ts" },
	{ id: "ext-extension-picker", label: "Extension: extension-picker", kind: "openFile", target: "extensions/extension-picker.ts" },
	{ id: "ext-system-select", label: "Extension: system-select", kind: "openFile", target: "extensions/system-select.ts" },
	{ id: "ext-session-memory", label: "Extension: session-memory", kind: "openFile", target: "extensions/session-memory.ts" },
	{ id: "tech-explorer", label: "Technical: Explorer", kind: "technicalActivity", target: "explorer" },
	{ id: "tech-extensions", label: "Technical: Run / Extensions", kind: "technicalActivity", target: "extensions" },
	{ id: "tech-planning", label: "Technical: Plan / Build", kind: "technicalActivity", target: "planning" },
];

const SIMPLE_TABS = new Set(["chat", "team", "models", "projects", "settings"]);
const ACTIVITIES = new Set(["explorer", "search", "scm", "extensions", "planning", "settings"]);

function isPlainObject(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseEntries(raw: unknown): { entries: UiViewCatalogEntry[]; error?: string } {
	if (!isPlainObject(raw)) return { entries: [], error: "Root must be an object" };
	const entriesIn = raw.entries;
	if (!Array.isArray(entriesIn)) return { entries: [], error: "Missing entries array" };
	const out: UiViewCatalogEntry[] = [];
	for (let i = 0; i < entriesIn.length; i++) {
		const row = entriesIn[i];
		if (!isPlainObject(row)) continue;
		const id = String(row.id ?? "").trim();
		const label = String(row.label ?? "").trim();
		const kind = String(row.kind ?? "").trim() as UiViewCatalogEntry["kind"];
		const target = String(row.target ?? "").trim();
		const hint = row.hint != null ? String(row.hint).trim() : undefined;
		if (!id || !label || !target) continue;
		if (kind !== "simpleTab" && kind !== "openFile" && kind !== "technicalActivity") {
			return { entries: [], error: `Entry ${i + 1}: invalid kind` };
		}
		if (kind === "simpleTab" && !SIMPLE_TABS.has(target)) {
			return { entries: [], error: `Entry ${i + 1}: unknown simpleTab "${target}"` };
		}
		if (kind === "technicalActivity" && !ACTIVITIES.has(target)) {
			return { entries: [], error: `Entry ${i + 1}: unknown technicalActivity "${target}"` };
		}
		if (kind === "openFile" && (target.includes("..") || target.startsWith("/"))) {
			return { entries: [], error: `Entry ${i + 1}: openFile path must be relative` };
		}
		out.push({ id, label, kind, target, hint: hint || undefined });
	}
	return { entries: out };
}

export function defaultUiViewsCatalogResponse(): UiViewsCatalogResponse {
	return {
		version: 1,
		entries: DEFAULT_ENTRIES,
		source: "default",
		catalogRelPath: UI_VIEWS_CATALOG_REL,
		schemaDocRelPath: UI_VIEWS_SCHEMA_DOC_REL,
	};
}

export async function readUiViewsCatalog(workspaceRoot: string): Promise<UiViewsCatalogResponse> {
	const abs = join(workspaceRoot, UI_VIEWS_CATALOG_REL);
	const base = defaultUiViewsCatalogResponse();
	if (!existsSync(abs)) {
		return base;
	}
	try {
		const text = await readFile(abs, "utf8");
		const json = JSON.parse(text) as unknown;
		const { entries, error } = parseEntries(json);
		if (error || entries.length === 0) {
			return {
				...base,
				parseError: error || "No valid entries in workspace file; showing defaults.",
			};
		}
		return {
			version: 1,
			entries,
			source: "workspace",
			catalogRelPath: UI_VIEWS_CATALOG_REL,
			schemaDocRelPath: UI_VIEWS_SCHEMA_DOC_REL,
		};
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return { ...base, parseError: message };
	}
}

export async function seedUiViewsCatalogIfMissing(workspaceRoot: string): Promise<{ created: boolean; path: string }> {
	const abs = join(workspaceRoot, UI_VIEWS_CATALOG_REL);
	if (existsSync(abs)) {
		return { created: false, path: UI_VIEWS_CATALOG_REL };
	}
	const payload = {
		version: 1,
		comment:
			"Edit this file to change View → Workspace views in Simple UI. See docs/WOP_SIMPLE_UI_VIEWS.md",
		entries: DEFAULT_ENTRIES,
	};
	await mkdir(dirname(abs), { recursive: true });
	await writeFile(abs, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
	return { created: true, path: UI_VIEWS_CATALOG_REL };
}
