/**
 * **Workspace roots** (what `/api/tree`, `/api/file`, plans, agents, and Pi `cwd` use) live in
 * **`folders`** — set at boot from **`WOP_WORKSPACE`** or **`process.cwd()`**, then updated only via
 * **Open Folder** / workspace-file APIs. They are **not** the Way of Pi app install path unless the
 * user opened that directory, and they are **not** driven by the editor’s active tab path.
 */
import { existsSync, realpathSync } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, normalize, relative, resolve, sep } from "node:path";

import { buildCodeWorkspacePayload } from "../shared/code-workspace-file.ts";

export interface WorkspaceFolderEntry {
	label: string;
	path: string;
}

/** Captured at process start (before any UI switch). */
let frozenInitialPath = "";

const tenantFolders = new Map<string, WorkspaceFolderEntry[]>();

function syncRealpath(abs: string): string {
	try {
		return normalize(realpathSync(abs));
	} catch {
		return normalize(abs);
	}
}

function uniqueLabelsFor(absPaths: string[]): WorkspaceFolderEntry[] {
	const nameCount = new Map<string, number>();
	return absPaths.map((absPath) => {
		const norm = syncRealpath(absPath);
		const base = basename(norm);
		const n = (nameCount.get(base) ?? 0) + 1;
		nameCount.set(base, n);
		const label = n === 1 ? base : `${base} (${n})`;
		return { label, path: norm };
	});
}

/**
 * Boot-time workspace roots for the Bun server — **only** `WOP_WORKSPACE` (if set) or **process.cwd()**
 * when the server process starts. Client **editor selection** (`selectedPath`) does not change this;
 * use **Open Folder** / workspace file APIs to retarget roots. Any directory may be opened; features
 * that need files (agents, plans) degrade gracefully when those paths are absent.
 */
export function initWorkspaceFoldersFromEnv(): void {
	const raw = process.env.WOP_WORKSPACE?.trim();
	const start = normalize(resolve(raw || process.cwd()));
	const real = syncRealpath(start);
	frozenInitialPath = real;
	tenantFolders.set("default", uniqueLabelsFor([real]));
}

initWorkspaceFoldersFromEnv();

export function getFrozenInitialWorkspacePath(): string {
	return frozenInitialPath;
}

export function listWorkspaceFolders(tenantId: string = "default"): WorkspaceFolderEntry[] {
	const folders = tenantFolders.get(tenantId) || uniqueLabelsFor([frozenInitialPath]);
	return folders.map((f) => ({ ...f }));
}

export function getPrimaryWorkspacePath(tenantId: string = "default"): string {
	// Validate tenantId (prevent path traversal)
	if (!tenantId || tenantId.includes("..") || tenantId.includes(sep)) {
		throw new Error("Invalid tenant ID");
	}
	
	// Get base workspace from env or default
	const baseWorkspace = process.env.WOP_WORKSPACE_ROOT 
		|| frozenInitialPath 
		|| "/home/zerwiz/CodeP/Way of pi/workspace";
	
	// Default tenant IS the base workspace — no subdirectory appended
	if (tenantId === "default") {
		return baseWorkspace;
	}
	
	// Tenant isolation: each non-default tenant gets a subdirectory
	const tenantWorkspace = resolve(baseWorkspace, tenantId);
	
	// Ensure path stays within base (trailing sep is critical!)
	const baseNorm = resolve(baseWorkspace) + sep;
	if (!tenantWorkspace.startsWith(baseNorm) && tenantWorkspace !== baseNorm.slice(0, -1)) {
		throw new Error("Path traversal detected");
	}
	
	return tenantWorkspace;
}

function isSwitchAllowed(): boolean {
	const v = process.env.WOP_ALLOW_WORKSPACE_SWITCH?.trim().toLowerCase();
	return v !== "0" && v !== "false" && v !== "no";
}

export function workspaceSwitchAllowed(): boolean {
	return isSwitchAllowed();
}

/** Path must be inside `root` (no `..` escape). */
function isInsideRoot(root: string, target: string): boolean {
	const rel = relative(root, target);
	if (rel === "") return true;
	if (rel.startsWith("..") || rel.split(sep).includes("..")) return false;
	return true;
}

/**
 * Resolve editor/tree-relative path to absolute file path.
 * Single-folder: `rel` is relative to that folder.
 * Multi-root: `rel` is `label/rest`.
 */
export function resolveUnderWorkspace(relRaw: string, tenantId: string = "default"): string | null {
	const folders = tenantFolders.get(tenantId) || uniqueLabelsFor([frozenInitialPath]);
	const trimmed = relRaw.replace(/^[/\\]+/, "");
	if (!trimmed || trimmed === "." || trimmed.includes("..")) return null;

	if (folders.length === 1) {
		const root = folders[0].path;
		const joined = normalize(join(root, trimmed));
		if (!isInsideRoot(root, joined)) return null;
		return joined;
	}

	/** Multi-root: `label/rest` when first segment matches a workspace folder label. */
	const slash = trimmed.indexOf("/");
	const firstSeg = slash === -1 ? trimmed : trimmed.slice(0, slash);
	const folderByLabel = folders.find((f) => f.label === firstSeg);
	const hasLabelPrefix = slash !== -1 && folderByLabel != null;

	if (hasLabelPrefix) {
		const rest = trimmed.slice(slash + 1);
		if (!rest) return null;
		const joined = normalize(join(folderByLabel.path, rest));
		if (!isInsideRoot(folderByLabel.path, joined)) return null;
		return joined;
	}

	/* Paths like `agent/models.json` (no folder label) resolve on the primary root — same as single-root UX. */
	const primary = folders[0]?.path;
	if (!primary) return null;
	const joined = normalize(join(primary, trimmed));
	if (!isInsideRoot(primary, joined)) return null;
	return joined;
}

export async function assertDirectory(absInput: string): Promise<string> {
	if (!isSwitchAllowed()) {
		throw new Error("Workspace switching is disabled (set WOP_ALLOW_WORKSPACE_SWITCH unset or 1).");
	}
	const abs = normalize(resolve(absInput.trim()));
	if (!existsSync(abs)) throw new Error("Path does not exist");
	const st = await stat(abs);
	if (!st.isDirectory()) throw new Error("Not a directory");
	return syncRealpath(abs);
}

export async function assertFile(absInput: string): Promise<string> {
	if (!isSwitchAllowed()) {
		throw new Error("Workspace switching is disabled (set WOP_ALLOW_WORKSPACE_SWITCH unset or 1).");
	}
	const abs = normalize(resolve(absInput.trim()));
	if (!existsSync(abs)) throw new Error("Path does not exist");
	const st = await stat(abs);
	if (!st.isFile()) throw new Error("Not a file");
	return syncRealpath(abs);
}

export async function setWorkspaceFoldersAbs(absPaths: string[], tenantId: string = "default"): Promise<void> {
	if (absPaths.length === 0) throw new Error("At least one folder path is required");
	const resolved: string[] = [];
	for (const p of absPaths) {
		resolved.push(await assertDirectory(p));
	}
	tenantFolders.set(tenantId, uniqueLabelsFor(resolved));
}

export async function openFolder(absDir: string, tenantId: string = "default"): Promise<void> {
	const dir = await assertDirectory(absDir);
	tenantFolders.set(tenantId, uniqueLabelsFor([dir]));
}

export async function addFolder(absDir: string, tenantId: string = "default"): Promise<void> {
	const dir = await assertDirectory(absDir);
	const folders = tenantFolders.get(tenantId) || uniqueLabelsFor([frozenInitialPath]);
	const paths = [...folders.map((f) => f.path)];
	if (paths.some((p) => p === dir)) throw new Error("Folder is already in the workspace");
	paths.push(dir);
	tenantFolders.set(tenantId, uniqueLabelsFor(paths));
}

export function removeFolderByLabel(label: string, tenantId: string = "default"): void {
	if (!isSwitchAllowed()) {
		throw new Error("Workspace switching is disabled.");
	}
	const folders = tenantFolders.get(tenantId) || [];
	const next = folders.filter((f) => f.label !== label);
	if (next.length === folders.length) throw new Error("Unknown folder label");
	if (next.length === 0) {
		tenantFolders.set(tenantId, uniqueLabelsFor([frozenInitialPath]));
		return;
	}
	tenantFolders.set(tenantId, uniqueLabelsFor(next.map((f) => f.path)));
}

export function resetWorkspaceToInitial(tenantId: string = "default"): void {
	if (!isSwitchAllowed()) {
		throw new Error("Workspace switching is disabled.");
	}
	tenantFolders.set(tenantId, uniqueLabelsFor([frozenInitialPath]));
}

/**
 * Open a file's containing folder as the only root; returns path relative to new root for editor selection.
 */
export async function openFileInWorkspace(absFile: string, tenantId: string = "default"): Promise<string> {
	const file = await assertFile(absFile);
	const dir = syncRealpath(dirname(file));
	tenantFolders.set(tenantId, uniqueLabelsFor([dir]));
	const rel = relative(dir, file).replace(/\\/g, "/");
	if (!rel || rel.startsWith("..")) throw new Error("Could not resolve file under workspace");
	return rel;
}

export async function loadFoldersFromWorkspaceJson(
	raw: unknown,
	workspaceFileAbsPath: string,
	tenantId: string = "default",
): Promise<void> {
	if (!isSwitchAllowed()) {
		throw new Error("Workspace switching is disabled.");
	}
	const baseDir = dirname(workspaceFileAbsPath);
	const o = raw as { folders?: unknown };
	if (!o || !Array.isArray(o.folders)) throw new Error('Invalid workspace file: expected { "folders": [...] }');
	const paths: string[] = [];
	for (const item of o.folders) {
		const p =
			item && typeof item === "object" && item !== null && "path" in item
				? String((item as { path?: string }).path ?? "").trim()
				: "";
		if (!p) continue;
		const abs = isAbsolute(p) ? resolve(p) : resolve(baseDir, p);
		paths.push(abs);
	}
	if (paths.length === 0) throw new Error("Workspace file has no folders");
	const resolved: string[] = [];
	for (const p of paths) {
		resolved.push(await assertDirectory(p));
	}
	tenantFolders.set(tenantId, uniqueLabelsFor(resolved));
}

/**
 * Writes a `.code-workspace` JSON file (VS Code / Cursor layout) for the **current** in-memory folder list.
 * Folder paths in the file are relative to the directory containing the workspace file when possible.
 */
export async function saveCodeWorkspaceFileToPath(absInput: string, tenantId: string = "default"): Promise<void> {
	if (!isSwitchAllowed()) {
		throw new Error("Workspace switching is disabled (set WOP_ALLOW_WORKSPACE_SWITCH unset or 1).");
	}
	const abs = normalize(resolve(absInput.trim()));
	if (!abs) throw new Error("Invalid path");
	const parent = dirname(abs);
	await mkdir(parent, { recursive: true });
	const payload = buildCodeWorkspacePayload(listWorkspaceFolders(tenantId), parent);
	await writeFile(abs, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}
