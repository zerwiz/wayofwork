/**
 * Local workspace index (Cursor-style **shape**, not parity): walk the primary workspace,
 * respect `.gitignore` / `.cursorignore`-style rules in a small way, persist manifests under
 * `.wayofpi/index/`, optional chat boost. No cloud embeddings (see Cursor blog on Merkle + embeddings).
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { shouldSkipDir } from "./paths";
import { getPrimaryWorkspacePath } from "./workspace-state";

const MAX_INDEX_FILES = 50_000;
const MAX_INDEX_FILE_BYTES = 512 * 1024; // skip huge single files for manifest size
const SAMPLE_PATHS = 200;
const INDEX_VERSION = 1;

const BINARY_EXT = new Set([
	"png",
	"jpg",
	"jpeg",
	"gif",
	"webp",
	"ico",
	"pdf",
	"zip",
	"gz",
	"tgz",
	"7z",
	"rar",
	"wasm",
	"so",
	"dll",
	"dylib",
	"exe",
	"class",
	"pyc",
	"o",
	"a",
]);

export type WorkspaceIndexOptions = {
	/** When true, full sync includes new folders under the usual caps (Cursor: auto-index new folders). */
	indexNewFolders: boolean;
	/** When true, write `grep-paths.txt` — local path list for fast text search workflows. */
	instantGrepIndex: boolean;
	/** When true, prepend a short index summary to the chat system lead (bounded tokens). */
	attachSummaryToChat: boolean;
	/** 0 = disabled. Positive integer = auto-sync every N minutes in the background. */
	autoSyncIntervalMinutes: number;
};

export const DEFAULT_WORKSPACE_INDEX_OPTIONS: WorkspaceIndexOptions = {
        indexNewFolders: true,
        instantGrepIndex: true,
        attachSummaryToChat: true,
        autoSyncIntervalMinutes: 0,
};
export type WorkspaceIndexFileEntry = {
	path: string;
	size: number;
	mtimeMs: number;
};

export type WorkspaceIndexStateFile = {
	version: number;
	syncedAt: string;
	fileCount: number;
	truncated: boolean;
	merkleRoot: string;
	samplePaths: string[];
};

export type WorkspaceIndexDocEntry = {
	id: string;
	url: string;
	title?: string;
	fetchedAt?: string;
	status: "pending" | "ok" | "error";
	error?: string;
	excerptChars?: number;
};

export type WorkspaceIndexDocsFile = {
	version: number;
	entries: WorkspaceIndexDocEntry[];
};

function workspaceRoot(): string {
	return getPrimaryWorkspacePath();
}

function indexDirAbs(): string {
	return join(workspaceRoot(), ".wayofpi", "index");
}

function stateJsonPath(): string {
	return join(indexDirAbs(), "state.json");
}

function optionsJsonPath(): string {
	return join(indexDirAbs(), "options.json");
}

function manifestJsonPath(): string {
	return join(indexDirAbs(), "manifest.json");
}

function grepPathsPath(): string {
	return join(indexDirAbs(), "grep-paths.txt");
}

function docsJsonPath(): string {
	return join(indexDirAbs(), "docs.json");
}

function readIgnorePatterns(raw: string): string[] {
	return raw
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter((l) => l && !l.startsWith("#") && !l.startsWith("!"));
}

async function loadIgnoreFile(relName: string): Promise<string[]> {
	try {
		const p = join(workspaceRoot(), relName);
		const s = await readFile(p, "utf8");
		return readIgnorePatterns(s);
	} catch {
		return [];
	}
}

/** Minimal rules: prefix `foo/`, suffix `*.log`, or exact `name`. */
function matchesIgnorePattern(rel: string, pattern: string): boolean {
	const p = pattern.replace(/\\/g, "/").replace(/^\//, "");
	if (!p) return false;
	if (p.includes("/")) {
		if (p.endsWith("/")) {
			const pre = p.slice(0, -1);
			return rel === pre || rel.startsWith(`${pre}/`);
		}
		if (p.includes("*")) {
			const re = globStarToRegExp(p);
			return re.test(rel);
		}
		return rel === p || rel.startsWith(`${p}/`);
	}
	if (p.includes("*")) {
		const re = globStarToRegExp(p);
		return re.test(rel.split("/").pop() ?? rel);
	}
	return rel === p || rel.split("/").includes(p);
}

function globStarToRegExp(glob: string): RegExp {
	const normalized = glob.replace(/\\/g, "/").replace(/^\//, "");
	let re = "";
	for (let i = 0; i < normalized.length; i++) {
		if (normalized.slice(i, i + 2) === "**") {
			re += ".*";
			i++;
			continue;
		}
		const c = normalized[i]!;
		if (c === "*") {
			re += "[^/]*";
			continue;
		}
		if ("+.^${}()|[]\\".includes(c)) re += `\\${c}`;
		else re += c;
	}
	return new RegExp(`^${re}$`);
}

function pathIgnored(rel: string, git: string[], cursor: string[]): boolean {
	if (rel === ".wayofpi/index" || rel.startsWith(".wayofpi/index/")) return true;
	for (const pat of cursor) {
		if (matchesIgnorePattern(rel, pat)) return true;
	}
	for (const pat of git) {
		if (matchesIgnorePattern(rel, pat)) return true;
	}
	return false;
}

function isProbablyBinary(rel: string): boolean {
	const i = rel.lastIndexOf(".");
	if (i < 0) return false;
	return BINARY_EXT.has(rel.slice(i + 1).toLowerCase());
}

async function walkIndexedFiles(
	root: string,
	git: string[],
	cursor: string[],
	counter: { n: number; truncated: boolean },
): Promise<WorkspaceIndexFileEntry[]> {
	const out: WorkspaceIndexFileEntry[] = [];

	async function visit(absDir: string): Promise<void> {
		if (counter.n >= MAX_INDEX_FILES) {
			counter.truncated = true;
			return;
		}
		const relDir = relative(root, absDir).replace(/\\/g, "/");
		if (relDir && pathIgnored(relDir, git, cursor)) return;

		let entries;
		try {
			entries = await readdir(absDir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const ent of entries) {
			if (counter.n >= MAX_INDEX_FILES) {
				counter.truncated = true;
				return;
			}
			if (ent.isDirectory()) {
				if (shouldSkipDir(ent.name)) continue;
				const abs = join(absDir, ent.name);
				const rel = relative(root, abs).replace(/\\/g, "/");
				if (pathIgnored(rel, git, cursor)) continue;
				await visit(abs);
			} else if (ent.isFile()) {
				const abs = join(absDir, ent.name);
				const rel = relative(root, abs).replace(/\\/g, "/");
				if (pathIgnored(rel, git, cursor)) continue;
				if (isProbablyBinary(rel)) continue;
				let st;
				try {
					st = await stat(abs);
				} catch {
					continue;
				}
				if (st.size > MAX_INDEX_FILE_BYTES) continue;
				counter.n += 1;
				out.push({ path: rel, size: st.size, mtimeMs: Math.floor(st.mtimeMs) });
			}
		}
	}

	await visit(root);
	return out;
}

function merkleRootFromEntries(entries: WorkspaceIndexFileEntry[]): string {
	const lines = entries.map((e) => `${e.path}\0${e.size}\0${e.mtimeMs}`).sort();
	const h = createHash("sha256");
	for (const l of lines) h.update(l);
	return h.digest("hex").slice(0, 16);
}

export async function readWorkspaceIndexOptions(): Promise<WorkspaceIndexOptions> {
	try {
		const raw = await readFile(optionsJsonPath(), "utf8");
		const j = JSON.parse(raw) as Partial<WorkspaceIndexOptions>;
		return {
			...DEFAULT_WORKSPACE_INDEX_OPTIONS,
			...j,
		};
	} catch {
		return { ...DEFAULT_WORKSPACE_INDEX_OPTIONS };
	}
}

export async function patchWorkspaceIndexOptions(
	partial: Partial<WorkspaceIndexOptions>,
): Promise<WorkspaceIndexOptions> {
	const cur = await readWorkspaceIndexOptions();
	const next: WorkspaceIndexOptions = {
		indexNewFolders: partial.indexNewFolders ?? cur.indexNewFolders,
		instantGrepIndex: partial.instantGrepIndex ?? cur.instantGrepIndex,
		attachSummaryToChat: partial.attachSummaryToChat ?? cur.attachSummaryToChat,
		autoSyncIntervalMinutes:
			typeof partial.autoSyncIntervalMinutes === "number"
				? Math.max(0, Math.floor(partial.autoSyncIntervalMinutes))
				: cur.autoSyncIntervalMinutes,
	};
	await mkdir(indexDirAbs(), { recursive: true });
	await writeFile(optionsJsonPath(), JSON.stringify(next, null, 2), "utf8");
	return next;
}

export async function readWorkspaceIndexDocs(): Promise<WorkspaceIndexDocsFile> {
	try {
		const raw = await readFile(docsJsonPath(), "utf8");
		const j = JSON.parse(raw) as WorkspaceIndexDocsFile;
		if (!Array.isArray(j.entries)) return { version: 1, entries: [] };
		return j;
	} catch {
		return { version: 1, entries: [] };
	}
}

async function writeDocs(data: WorkspaceIndexDocsFile): Promise<void> {
	await mkdir(indexDirAbs(), { recursive: true });
	await writeFile(docsJsonPath(), JSON.stringify(data, null, 2), "utf8");
}

export async function addWorkspaceIndexDoc(url: string): Promise<WorkspaceIndexDocEntry> {
	const u = url.trim();
	let parsed: URL;
	try {
		parsed = new URL(u);
	} catch {
		throw new Error("Invalid URL");
	}
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		throw new Error("Only http(s) URLs are supported");
	}
	const docs = await readWorkspaceIndexDocs();
	const id = createHash("sha256").update(u).digest("hex").slice(0, 12);
	if (docs.entries.some((e) => e.id === id || e.url === u)) {
		const existing = docs.entries.find((e) => e.id === id || e.url === u)!;
		return existing;
	}
	const entry: WorkspaceIndexDocEntry = {
		id,
		url: u,
		status: "pending",
	};
	docs.entries.push(entry);
	await writeDocs(docs);
	return entry;
}

function stripHtmlToText(html: string, max: number): string {
	const noTags = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
	const text = noTags.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
	return text.length > max ? `${text.slice(0, max)}…` : text;
}

export async function syncWorkspaceIndexDoc(id: string): Promise<WorkspaceIndexDocEntry | null> {
	const docs = await readWorkspaceIndexDocs();
	const i = docs.entries.findIndex((e) => e.id === id);
	if (i < 0) return null;
	const e = docs.entries[i]!;
	try {
		const ac = new AbortController();
		const t = setTimeout(() => ac.abort(), 20_000);
		const res = await fetch(e.url, {
			signal: ac.signal,
			headers: {
				"User-Agent": "WayOfPi-Indexing/1.0 (+local docs crawl)",
				Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
			},
		});
		clearTimeout(t);
		if (!res.ok) {
			e.status = "error";
			e.error = `HTTP ${res.status}`;
			docs.entries[i] = e;
			await writeDocs(docs);
			return e;
		}
		const ct = res.headers.get("content-type") ?? "";
		const buf = await res.arrayBuffer();
		const slice = buf.byteLength > 400_000 ? buf.slice(0, 400_000) : buf;
		let body: string;
		try {
			body = new TextDecoder("utf-8", { fatal: false }).decode(slice);
		} catch {
			body = "";
		}
		const text =
			ct.includes("html") || body.trimStart().startsWith("<")
				? stripHtmlToText(body, 24_000)
				: body.replace(/\s+/g, " ").trim().slice(0, 24_000);
		const docDir = join(indexDirAbs(), "docs");
		await mkdir(docDir, { recursive: true });
		const textPath = join(docDir, `${id}.txt`);
		await writeFile(textPath, text, "utf8");
		e.status = "ok";
		e.fetchedAt = new Date().toISOString();
		e.excerptChars = text.length;
		e.title = parsed.hostname + parsed.pathname;
		e.error = undefined;
		docs.entries[i] = e;
		await writeDocs(docs);
		return e;
	} catch (err) {
		e.status = "error";
		e.error = err instanceof Error ? err.message : String(err);
		docs.entries[i] = e;
		await writeDocs(docs);
		return e;
	}
}

export async function removeWorkspaceIndexDoc(id: string): Promise<boolean> {
	const docs = await readWorkspaceIndexDocs();
	const before = docs.entries.length;
	docs.entries = docs.entries.filter((e) => e.id !== id);
	if (docs.entries.length === before) return false;
	await writeDocs(docs);
	try {
		await rm(join(indexDirAbs(), "docs", `${id}.txt`), { force: true });
	} catch {
		/* ok */
	}
	return true;
}

export type WorkspaceIndexSyncResult = {
	ok: boolean;
	state: WorkspaceIndexStateFile;
	options: WorkspaceIndexOptions;
};

let _isSyncing = false;

export async function syncWorkspaceIndex(): Promise<WorkspaceIndexSyncResult> {
        if (_isSyncing) {
                // If already syncing, we return the current options but this call is a no-op for actual syncing.
                // In a more robust system, we might queue the next sync.
                return { ok: false, state: (await getWorkspaceIndexStatus()).state!, options: await readWorkspaceIndexOptions() };
        }
        _isSyncing = true;
        try {
                const root = workspaceRoot();
                const options = await readWorkspaceIndexOptions();
                const git = await loadIgnoreFile(".gitignore");
                const cursor = await loadIgnoreFile(".cursorignore");
                const counter = { n: 0, truncated: false };
                const entries = await walkIndexedFiles(root, git, cursor, counter);
                entries.sort((a, b) => a.path.localeCompare(b.path));
                const samplePaths = entries.slice(0, SAMPLE_PATHS).map((e) => e.path);
                const merkleRoot = merkleRootFromEntries(entries);
                const state: WorkspaceIndexStateFile = {
                        version: INDEX_VERSION,
                        syncedAt: new Date().toISOString(),
                        fileCount: entries.length,
                        truncated: counter.truncated,
                        merkleRoot,
                        samplePaths,
                };
                await mkdir(indexDirAbs(), { recursive: true });
                await writeFile(stateJsonPath(), JSON.stringify(state, null, 2), "utf8");
                await writeFile(manifestJsonPath(), JSON.stringify({ version: INDEX_VERSION, files: entries }, null, 2), "utf8");
                if (options.instantGrepIndex) {
                        const lines = entries.map((e) => e.path).join("\n");
                        await writeFile(grepPathsPath(), `${lines}\n`, "utf8");
                } else {
                        try {
                                await rm(grepPathsPath(), { force: true });
                        } catch {
                                /* ok */
                        }
                }
                return { ok: true, state, options };
        } finally {
                _isSyncing = false;
        }
}
export async function clearWorkspaceIndex(): Promise<void> {
	try {
		await rm(indexDirAbs(), { recursive: true, force: true });
	} catch {
		/* ok */
	}
}

export type WorkspaceIndexStatusPayload = {
	rootLabel: string;
	hasIndex: boolean;
	state: WorkspaceIndexStateFile | null;
	options: WorkspaceIndexOptions;
	docs: WorkspaceIndexDocEntry[];
	about: string;
};

export async function getWorkspaceIndexStatus(): Promise<WorkspaceIndexStatusPayload> {
	const root = workspaceRoot();
	const parts = root.split(/[/\\]/);
	const rootLabel = parts[parts.length - 1] || root;
	let state: WorkspaceIndexStateFile | null = null;
	try {
		const raw = await readFile(stateJsonPath(), "utf8");
		state = JSON.parse(raw) as WorkspaceIndexStateFile;
	} catch {
		state = null;
	}
	const options = await readWorkspaceIndexOptions();
	const docs = (await readWorkspaceIndexDocs()).entries;
	const about =
		"Way of Pi keeps this index on disk under .wayofpi/index (manifest + optional grep path list). " +
		"Cursor additionally uses Merkle trees, AST chunking, embeddings, and cloud vector search — see cursor.com/blog and docs.cursor.com for their pipeline.";
	return {
		rootLabel,
		hasIndex: state != null,
		state,
		options,
		docs,
		about,
	};
}

// ---------------------------------------------------------------------------
// Auto-sync scheduler
// ---------------------------------------------------------------------------

type OnAutoSyncCallback = (result: WorkspaceIndexSyncResult) => void;

let _autoSyncTimer: ReturnType<typeof setInterval> | null = null;

function stopAutoSync(): void {
	if (_autoSyncTimer !== null) {
		clearInterval(_autoSyncTimer);
		_autoSyncTimer = null;
	}
}

function startAutoSync(intervalMinutes: number, onSync?: OnAutoSyncCallback): void {
	stopAutoSync();
	if (intervalMinutes <= 0) return;
	const ms = intervalMinutes * 60 * 1000;
	_autoSyncTimer = setInterval(() => {
		syncWorkspaceIndex()
			.then((result) => {
				onSync?.(result);
			})
			.catch((err: unknown) => {
				console.error("[workspace-index] auto-sync failed:", err instanceof Error ? err.message : String(err));
			});
	}, ms);
}

/** Read saved options and (re)start or stop the auto-sync timer accordingly.
 *  Call this once at server startup, and again after each options patch. */
export async function applyAutoSync(onSync?: OnAutoSyncCallback): Promise<void> {
        const opts = await readWorkspaceIndexOptions();
        // Trigger an initial sync if requested (usually at startup)
        void syncWorkspaceIndex()
                .then((result) => {
                        if (result.ok) onSync?.(result);
                })
                .catch(() => {});
        startAutoSync(opts.autoSyncIntervalMinutes, onSync);
}
// ---------------------------------------------------------------------------

/** Sync read for chat lead assembly (must stay small). */
export function getWorkspaceIndexChatBoostSync(): string | null {
	try {
		if (!existsSync(optionsJsonPath())) return null;
		const opts = JSON.parse(readFileSync(optionsJsonPath(), "utf8")) as Partial<WorkspaceIndexOptions>;
		if (!opts.attachSummaryToChat) return null;
		if (!existsSync(stateJsonPath())) return null;
		const state = JSON.parse(readFileSync(stateJsonPath(), "utf8")) as WorkspaceIndexStateFile;
		const sample = (state.samplePaths ?? []).slice(0, 60);
		const lines = [
			"**Workspace index (local):** Way of Pi manifest — not Cursor cloud embeddings.",
			`- **Files:** ${state.fileCount}; **last sync:** ${state.syncedAt ?? "unknown"}; **fingerprint:** ${state.merkleRoot}`,
			`- **Sample paths:**`,
			...sample.map((p) => `  - \`${p}\``),
		];
		let s = lines.join("\n");
		if (s.length > 10_000) s = `${s.slice(0, 10_000)}\n…(truncated)`;
		return s;
	} catch {
		return null;
	}
}
