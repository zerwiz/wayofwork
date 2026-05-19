import { normalize, relative, sep } from "node:path";
import { getPrimaryWorkspacePath, resolveUnderWorkspace } from "./workspace-state";

const FORBIDDEN_SEGMENTS = new Set([
	"..",
	".git",
	"node_modules",
	".venv",
	"__pycache__",
	"dist",
	".next",
	".turbo",
]);

/** Primary (first) workspace folder — backward compatible with single-root servers. */
export function getWorkspaceRoot(tenantId: string = "default"): string {
	return getPrimaryWorkspacePath(tenantId);
}

/** True if `target` is inside `root` (after resolve). */
export function isInsideRoot(root: string, target: string): boolean {
	const rel = relative(root, target);
	if (rel === "") return true;
	if (rel.startsWith("..") || rel.split(sep).includes("..")) return false;
	return true;
}

/** Resolve user-supplied relative path under workspace folder(s); returns null if unsafe. */
export function safeResolveUnderWorkspace(rel: string, tenantId: string = "default"): string | null {
	return resolveUnderWorkspace(rel, tenantId);
}

export function shouldSkipDir(name: string): boolean {
	return FORBIDDEN_SEGMENTS.has(name);
}

export const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MiB read cap for editor

export const EDITABLE_EXTENSIONS = new Set([
	"md",
	"txt",
	"doc",
	"docx",
	"pdf",
	"js",
	"ts",
	"tsx",
	"jsx",
	"py",
	"json",
	"yaml",
	"yml",
	"html",
	"css",
	"scss",
	"less",
	"xml",
	"svg",
	"sh",
	"bash",
	"zsh",
	"fish",
	"c",
	"cpp",
	"h",
	"hpp",
	"java",
	"rb",
	"go",
	"rs",
	"swift",
	"kt",
	"php",
	"sql",
	"r",
	"matlab",
	"m",
	"pl",
	"pm",
	"ps1",
	"psm1",
	"psd1",
]);

export function isFileEditable(path: string): boolean {
	const ext = path.split(".").pop()?.toLowerCase() ?? "";
	return EDITABLE_EXTENSIONS.has(ext);
}
