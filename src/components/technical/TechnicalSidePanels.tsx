import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import type { PiModelConfigPath } from "../../constants/piModelConfigPaths";
import { PI_MODEL_CONFIG_ENTRIES } from "../../constants/piModelConfigPaths";
import { apiGet, apiPostJson, apiPutJson } from "../../api/client";
import { GithubManageSettingsCard } from "../GithubManageSettingsCard";
import type { ServerConfig } from "../../hooks/useServerConfig";
import { useWebManifest } from "../../hooks/useWebManifest";
import { TerminalSettingsSection } from "./TerminalSettingsSection";
import type { ChatSessionMode } from "../../hooks/useWayOfPiSession";
import type { FileGetResponse } from "../../types/workspaceFile";
import type { TreeNode, WorkspaceFolderInfo, WorkspaceGitState } from "../../types/tree";
import { flattenDirectGitStatusPaths, flattenTreeFiles } from "../../utils/flattenTree";
import { mergePiSettingsExtensionsArray, normExtEntry, piExtensionShimRef } from "../../utils/piSettingsJson";

export function SearchSidePanel({
	nodes,
	selectedPath,
	onSelectFile,
}: {
	nodes: TreeNode[];
	selectedPath: string | null;
	onSelectFile: (path: string, ev?: MouseEvent) => void;
}) {
	const [q, setQ] = useState("");
	const files = useMemo(() => flattenTreeFiles(nodes), [nodes]);
	const filtered = useMemo(() => {
		const t = q.trim().toLowerCase();
		const list = !t ? files : files.filter((f) => f.path.toLowerCase().includes(t));
		return list.slice(0, 300);
	}, [files, q]);

	return (
		<div className="flex min-h-0 min-w-0 w-full flex-1 flex-col border-r border-[#3c3c3c] bg-[#252526]">
			<div className="shrink-0 border-b border-[#3c3c3c] p-2">
				<input
					type="search"
					value={q}
					onChange={(e) => setQ(e.target.value)}
					placeholder="Filter by path…"
					className="w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] px-2 py-1.5 font-mono text-[12px] text-[#cccccc] outline-none focus:border-[#007acc]"
				/>
			</div>
			<ul className="min-h-0 flex-1 overflow-y-auto py-1 font-mono text-[12px]">
				{filtered.map((f) => (
					<li key={f.path}>
						<button
							type="button"
							onClick={(e) => onSelectFile(f.path, e)}
							className={`w-full truncate px-3 py-1.5 text-left hover:bg-[#2d2d2d] ${
								selectedPath === f.path ? "bg-[#007acc]/20 text-white" : "text-[#cccccc]"
							}`}
							title={f.path}
						>
							{f.path}
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}

export function ScmSidePanel({
	root,
	git,
	nodes,
	treeLoading,
	treeError,
	onRefresh,
	onOpenFile,
}: {
	root: string;
	git: WorkspaceGitState;
	nodes: TreeNode[];
	treeLoading: boolean;
	treeError: string | null;
	onRefresh: () => void | Promise<void>;
	onOpenFile: (path: string) => void;
}) {
	const changed = useMemo(() => flattenDirectGitStatusPaths(nodes), [nodes]);
	const anyRepo = git.roots.some((r) => r.isRepo);
	const anyGitError = git.roots.some((r) => r.error);

	return (
		<div className="flex min-h-0 min-w-0 w-full flex-1 flex-col border-r border-[#3c3c3c] bg-[#252526]">
			<div className="flex shrink-0 flex-col gap-2 border-b border-[#3c3c3c] p-3">
				<div className="text-[11px] font-bold uppercase tracking-wide text-[#858585]">Workspace</div>
				<p className="break-all font-mono text-[11px] leading-snug text-[#9cdcfe]">{root || "—"}</p>
				<button
					type="button"
					disabled={treeLoading}
					onClick={() => void onRefresh()}
					className="rounded border border-[#007acc]/50 bg-[#007acc]/15 px-3 py-2 text-left font-mono text-[12px] text-[#9cdcfe] hover:bg-[#007acc]/25 disabled:cursor-wait disabled:opacity-50"
				>
					{treeLoading ? "Refreshing tree…" : "Refresh workspace tree"}
				</button>
				{treeError ? <p className="font-mono text-[11px] text-[#f48771]">{treeError}</p> : null}
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto p-3 text-[13px] leading-relaxed text-[#cccccc]">
				<div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#858585]">Git</div>
				{!anyRepo && !anyGitError ? (
					<p className="text-[12px] text-[#858585]">
						No Git repository detected for the opened folder(s). Explorer decorations stay off until you open a
						worktree.
					</p>
				) : null}
				{git.roots.map((r) => (
					<div key={r.path} className="mb-4 rounded border border-[#3c3c3c] bg-[#1e1e1e] p-2.5">
						<div className="font-mono text-[11px] text-[#858585]">{r.label}</div>
						{r.error ? (
							<p className="mt-1 font-mono text-[11px] text-[#f48771]">{r.error}</p>
						) : r.isRepo ? (
							<>
								<div className="mt-1 font-mono text-[12px] text-[#c586c0]">{r.branch ?? "—"}</div>
								{r.topLevel ? (
									<div className="mt-1 break-all font-mono text-[10px] text-[#858585]" title="Repository root">
										{r.topLevel}
									</div>
								) : null}
							</>
						) : (
							<p className="mt-1 text-[12px] text-[#858585]">Not a Git repository</p>
						)}
					</div>
				))}

				<div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#858585]">Changed paths</div>
				<p className="mb-2 text-[11px] leading-snug text-[#858585]">
					Same data as the explorer: server runs <span className="font-mono text-[#9cdcfe]">git status --porcelain</span>{" "}
					when building <span className="font-mono text-[#9cdcfe]">/api/tree</span>. Stage/commit UI is not wired yet.
				</p>
				{changed.length === 0 ? (
					<p className="text-[12px] text-[#858585]">{anyRepo ? "Working tree clean." : "—"}</p>
				) : (
					<ul className="list-none space-y-0.5 p-0 font-mono text-[11px]">
						{changed.map((e) => (
							<li key={e.path}>
								<button
									type="button"
									onClick={() => onOpenFile(e.path)}
									className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left hover:bg-[#2d2d2d]"
									title={e.path}
								>
									<span className="shrink-0 font-bold text-[#e2c08d]">{e.status}</span>
									<span className="min-w-0 flex-1 truncate text-[#cccccc]">{e.path}</span>
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}

function normWorkspaceRoot(p: string): string {
	return p.replace(/\\/g, "/").replace(/\/+$/, "");
}

function OrchestratorOnOffButtons({
	active,
	disabled,
	busy,
	onSelect,
}: {
	active: boolean;
	disabled?: boolean;
	busy?: boolean;
	onSelect: (next: boolean) => void | Promise<void>;
}) {
	const base =
		"min-w-[2.25rem] rounded px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40";
	return (
		<div className="flex shrink-0 gap-0.5 rounded border border-[#3c3c3c] bg-[#1e1e1e] p-0.5">
			<button
				type="button"
				disabled={disabled || busy}
				title="Turn on for this server process (until restart)"
				aria-pressed={active}
				className={`${base} ${
					active ? "bg-[#264026] text-[#89d185]" : "text-[#858585] hover:bg-[#2d2d2d] hover:text-[#cccccc]"
				}`}
				onClick={() => void onSelect(true)}
			>
				on
			</button>
			<button
				type="button"
				disabled={disabled || busy}
				title="Turn off for this server process (until restart)"
				aria-pressed={!active}
				className={`${base} ${
					!active ? "bg-[#3a3a3a] text-[#ce9178]" : "text-[#858585] hover:bg-[#2d2d2d] hover:text-[#cccccc]"
				}`}
				onClick={() => void onSelect(false)}
			>
				off
			</button>
		</div>
	);
}

function piSettingsRelativePath(folders: WorkspaceFolderInfo[], folder: WorkspaceFolderInfo): string {
	if (folders.length <= 1) return ".pi/settings.json";
	return `${folder.label}/.pi/settings.json`;
}

function parseExtensionsFromRaw(raw: string): string[] {
	if (!raw.trim()) return [];
	try {
		const j = JSON.parse(raw) as { extensions?: unknown };
		const ext = j.extensions;
		return Array.isArray(ext) ? ext.map((x) => String(x ?? "").trim()).filter(Boolean) : [];
	} catch {
		return [];
	}
}

/**
 * Shims that are **on by default** when `extensions` is still empty (orchestration / session stack from product screenshots).
 * Other `.pi/extensions/*.ts` files stay off until explicitly toggled.
 */
const DEFAULT_ON_SHIM_BASENAMES = [
	"web-tools.ts",
	"session-memory.ts",
	"github-management.ts",
	"session-saver.ts",
	"context-local-hints.ts",
] as const;

function defaultOnShimRefsPresentOnDisk(shimBasenames: string[]): string[] {
	const set = new Set(shimBasenames);
	return DEFAULT_ON_SHIM_BASENAMES.filter((b) => set.has(b)).map((b) => piExtensionShimRef(b));
}

/** Merged list for checkboxes and toggles: saved `extensions[]`, or default-on subset when the array is empty. */
function effectiveExtensionEntriesForToggles(entries: string[], shimBasenames: string[]): string[] {
	if (entries.length > 0) return entries;
	return defaultOnShimRefsPresentOnDisk(shimBasenames);
}

function extensionListFingerprint(xs: string[]): string {
	return [...xs].map(normExtEntry).filter(Boolean).sort().join("\0");
}

async function fetchSettingsUtf8(rel: string): Promise<string> {
	try {
		const r = await apiGet<FileGetResponse>(`/api/file?path=${encodeURIComponent(rel)}`);
		if (r.encoding === "base64") {
			throw new Error(".pi/settings.json is binary; open it in the editor to fix encoding.");
		}
		return r.content;
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		if (msg.startsWith("404:")) return "";
		throw e;
	}
}

export function ExtensionsSidePanel({
	folders,
	config,
	refreshServerConfig,
	chatMode,
	onChatModeChange,
	streaming,
	hasWorkspace,
	focusWorkspaceFile,
	onOpenTeamsYaml,
	onFocusToolLog,
	onTreeRefresh,
}: {
	folders: WorkspaceFolderInfo[];
	config: ServerConfig | null;
	refreshServerConfig: () => Promise<void>;
	chatMode: ChatSessionMode;
	onChatModeChange: (m: ChatSessionMode) => void;
	streaming: boolean;
	hasWorkspace: boolean;
	focusWorkspaceFile: (relPath: string) => void;
	onOpenTeamsYaml: () => void;
	onFocusToolLog: () => void;
	onTreeRefresh: () => void | Promise<void>;
}) {
	const { manifest, loading: manifestLoading, error: manifestError, reload: reloadManifest } = useWebManifest();
	const [saveError, setSaveError] = useState<string | null>(null);
	const [savingRel, setSavingRel] = useState<string | null>(null);
	const [orchestratorGateError, setOrchestratorGateError] = useState<string | null>(null);
	const [orchestratorGateBusy, setOrchestratorGateBusy] = useState<"tools" | "bash" | "pi" | null>(null);

	const patchSessionRuntimeGate = useCallback(
		async (
			patch: { orchestratorTools: boolean } | { orchestratorBash: boolean } | { piDrivesChat: boolean },
		) => {
			setOrchestratorGateError(null);
			const busyKey =
				"orchestratorTools" in patch ? "tools" : "orchestratorBash" in patch ? "bash" : "pi";
			setOrchestratorGateBusy(busyKey);
			try {
				await apiPostJson<{ ok: boolean }>("/api/config", patch);
				await refreshServerConfig();
			} catch (e) {
				setOrchestratorGateError(e instanceof Error ? e.message : String(e));
			} finally {
				setOrchestratorGateBusy(null);
			}
		},
		[refreshServerConfig],
	);

	const manifestSlicesByRoot = useMemo(() => {
		const m = new Map<string, { entries: string[]; settingsPath: string }>();
		for (const s of manifest?.settingsExtensions ?? []) {
			m.set(normWorkspaceRoot(s.root), { entries: s.entries, settingsPath: s.settingsPath });
		}
		return m;
	}, [manifest?.settingsExtensions]);

	const shimSlicesByRoot = useMemo(() => {
		const m = new Map<string, string[]>();
		for (const sh of manifest?.shimFiles ?? []) {
			m.set(normWorkspaceRoot(sh.root), sh.files);
		}
		return m;
	}, [manifest?.shimFiles]);

	const applyExtensionList = useCallback(
		async (settingsRel: string, nextEntries: string[]) => {
			setSaveError(null);
			setSavingRel(settingsRel);
			try {
				const raw = await fetchSettingsUtf8(settingsRel);
				const merged = mergePiSettingsExtensionsArray(raw, nextEntries);
				await apiPutJson<{ ok: boolean }>("/api/file", { path: settingsRel, content: merged });
				await reloadManifest();
				await onTreeRefresh();
			} catch (e) {
				setSaveError(e instanceof Error ? e.message : String(e));
			} finally {
				setSavingRel(null);
			}
		},
		[onTreeRefresh, reloadManifest],
	);

	const autoFilledDefaultShimsRootsRef = useRef<Set<string>>(new Set());

	const toggleShim = useCallback(
		async (folder: WorkspaceFolderInfo, shimBasename: string, enabled: boolean) => {
			const settingsRel = piSettingsRelativePath(folders, folder);
			const rootKey = normWorkspaceRoot(folder.path);
			const shims = shimSlicesByRoot.get(rootKey) ?? [];
			const ref = piExtensionShimRef(shimBasename);
			const raw = await fetchSettingsUtf8(settingsRel).catch(() => "");
			const cur = parseExtensionsFromRaw(raw);
			const eff = effectiveExtensionEntriesForToggles(cur, shims);
			const n = normExtEntry(ref);
			const next = enabled
				? eff.some((e) => normExtEntry(e) === n)
					? eff
					: [...eff, ref]
				: eff.filter((e) => normExtEntry(e) !== n);
			await applyExtensionList(settingsRel, next);
		},
		[applyExtensionList, folders, shimSlicesByRoot],
	);

	const removeCustomEntry = useCallback(
		async (folder: WorkspaceFolderInfo, entry: string) => {
			const settingsRel = piSettingsRelativePath(folders, folder);
			const rootKey = normWorkspaceRoot(folder.path);
			const shims = shimSlicesByRoot.get(rootKey) ?? [];
			const raw = await fetchSettingsUtf8(settingsRel).catch(() => "");
			const cur = parseExtensionsFromRaw(raw);
			const eff = effectiveExtensionEntriesForToggles(cur, shims);
			const n = normExtEntry(entry);
			const next = eff.filter((e) => normExtEntry(e) !== n);
			await applyExtensionList(settingsRel, next);
		},
		[applyExtensionList, folders, shimSlicesByRoot],
	);

	/** Drop extra `.pi/extensions` entries from `extensions[]`, keeping the five recommended shims + any non-shim paths. */
	const trimToRecommendedShims = useCallback(
		async (folder: WorkspaceFolderInfo) => {
			const settingsRel = piSettingsRelativePath(folders, folder);
			const rootKey = normWorkspaceRoot(folder.path);
			const shims = shimSlicesByRoot.get(rootKey) ?? [];
			const raw = await fetchSettingsUtf8(settingsRel).catch(() => "");
			const cur = parseExtensionsFromRaw(raw);
			const shimRefs = new Set(shims.map((b) => normExtEntry(piExtensionShimRef(b))));
			const custom = cur.filter((e) => !shimRefs.has(normExtEntry(e)));
			const recommended = defaultOnShimRefsPresentOnDisk(shims);
			const next = [...recommended, ...custom];
			if (extensionListFingerprint(next) === extensionListFingerprint(cur)) {
				window.alert(
					"extensions[] already matches “recommended only” for this folder (five default shims plus any paths that are not .pi/extensions shims).",
				);
				return;
			}
			if (
				!window.confirm(
					"Rewrite extensions[] to the five recommended .pi/extensions shims (those present on disk), and keep any listed paths that are not shims? All other shim entries will be removed.",
				)
			)
				return;
			await applyExtensionList(settingsRel, next);
		},
		[applyExtensionList, folders, shimSlicesByRoot],
	);

	/** When `extensions` is empty, persist the default-on shim set once so Pi matches the panel. */
	useEffect(() => {
		if (manifestLoading || !manifest) return;
		const rootsDone = autoFilledDefaultShimsRootsRef.current;
		void (async () => {
			for (const folder of folders.length > 0 ? folders : []) {
				const key = normWorkspaceRoot(folder.path);
				if (rootsDone.has(key)) continue;
				const entries = manifestSlicesByRoot.get(key)?.entries ?? [];
				const shims = shimSlicesByRoot.get(key) ?? [];
				if (entries.length > 0 || shims.length === 0) continue;
				const next = defaultOnShimRefsPresentOnDisk(shims);
				if (next.length === 0) {
					rootsDone.add(key);
					continue;
				}
				const settingsRel = piSettingsRelativePath(folders, folder);
				try {
					await applyExtensionList(settingsRel, next);
					rootsDone.add(key);
				} catch {
					/* applyExtensionList already sets saveError */
				}
			}
		})();
	}, [applyExtensionList, folders, manifest, manifestLoading, manifestSlicesByRoot, shimSlicesByRoot]);

	const workspaceFolders = folders.length > 0 ? folders : [];

	const runtimePostSupported = config?.capabilities?.configRuntimePost === true;
	const showStaleRuntimeApiDock = Boolean(config && !runtimePostSupported);
	const show404RuntimeDock = Boolean(orchestratorGateError?.includes("404"));
	const showOrchestrationHelpDock = showStaleRuntimeApiDock || show404RuntimeDock;
	const showPiCliHelpInDock = Boolean(config && !config.piBinaryResolved);
	const showExtensionsTopHelpDock = showOrchestrationHelpDock || showPiCliHelpInDock;

	const postConfigSmokeCurl = [
		'curl -sS -X POST "http://127.0.0.1:3333/api/config" \\',
		'  -H "Content-Type: application/json" \\',
		'  -d "{\"orchestratorTools\":true}"',
	].join("\n");

	return (
		<div className="flex min-h-0 min-w-0 w-full flex-1 flex-col border-r border-[#3c3c3c] bg-[#252526]">
			<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3 text-[13px] leading-relaxed text-[#cccccc]">
				{showExtensionsTopHelpDock ? (
					<div
						className={`rounded border p-3 text-[12px] leading-relaxed ${
							showOrchestrationHelpDock
								? "border-[#c586c0]/60 bg-[#2d2424] text-[#e8d4c4]"
								: "border-[#007acc]/45 bg-[#1e2a33] text-[#cccccc]"
						}`}
					>
						<div
							className={`mb-1.5 text-[11px] font-bold uppercase tracking-wide ${
								showOrchestrationHelpDock ? "text-[#f48771]" : "text-[#9cdcfe]"
							}`}
						>
							{showOrchestrationHelpDock ? "Fix: runtime toggles (404)" : "Headless Pi CLI"}
						</div>
						{showOrchestrationHelpDock ? (
							<>
								<p className="mb-2 text-[11px] text-[#d4a574]">
									The Bun API on this port is <strong className="text-[#f0e6dc]">older than this UI</strong>, or
									another process is answering without <span className="font-mono text-[10px] text-[#9cdcfe]">POST /api/config</span>.{" "}
									<strong className="text-[#f0e6dc]">Pi drives chat</strong>, <strong className="text-[#f0e6dc]">orchestrator tools</strong>, and{" "}
									<strong className="text-[#f0e6dc]">bash</strong> all use that route — fix the server first.
								</p>
								<ol className="mb-2 list-decimal space-y-1 pl-4 text-[11px] text-[#e0d8d0]">
									<li>
										Stop old processes on the API port (default <span className="font-mono text-[#9cdcfe]">3333</span> or{" "}
										<span className="font-mono text-[#9cdcfe]">WOP_SERVER_PORT</span>):{" "}
										<span className="font-mono text-[10px] text-[#ce9178]">
											macOS: lsof -nP -iTCP:3333 | grep LISTEN
										</span>{" "}
										or{" "}
										<span className="font-mono text-[10px] text-[#ce9178]">Linux: ss -tlnp | grep 3333</span>, then kill the stray
										PID.
									</li>
									<li>
										From this repo:{" "}
										<span className="font-mono text-[10px] text-[#ce9178]">
											{"cd apps/wayofwork-ui && bun run server/index.ts"}
										</span>{" "}
										(or your full dev script, e.g. <span className="font-mono text-[10px] text-[#ce9178]">npm run dev</span>).
									</li>
									<li>
										<span className="font-mono text-[10px] text-[#9cdcfe]">GET /api/health</span> must report{" "}
										<span className="font-mono text-[10px] text-[#9cdcfe]">configRuntimePost: true</span> (this build) — Vite/Electron
										“Start service” uses that to reject stale Bun.
									</li>
								</ol>
								<p className="mb-1 font-mono text-[10px] text-[#858585]">Smoke test (expect &quot;ok&quot;: true):</p>
								<pre className="mb-2 max-h-28 overflow-auto whitespace-pre-wrap break-all rounded border border-[#3c3c3c] bg-[#1e1e1e] p-2 font-mono text-[10px] text-[#9cdcfe]">
									{postConfigSmokeCurl}
								</pre>
								<p className="mt-2 text-[10px] leading-snug text-[#b0a090]">
									Doc: <span className="font-mono text-[#9cdcfe]">docs/WOP_ORCHESTRATION_EXTENSIONS_PANEL.md</span>. Bottom dock:{" "}
									<button
										type="button"
										onClick={onFocusToolLog}
										className="text-[#4fc1ff] underline decoration-[#4fc1ff]/40 hover:decoration-[#4fc1ff]"
									>
										Open chat tool log
									</button>{" "}
									for connection errors.
								</p>
							</>
						) : null}
						{showPiCliHelpInDock ? (
							<>
								{showOrchestrationHelpDock ? (
									<hr className="my-3 border-[#5c4030]/80" />
								) : null}
								<p className="text-[11px] leading-snug text-[#b8c8d4]">
									<strong className="text-[#dce9f2]">Pi drives chat</strong> stays off until the server resolves a{" "}
									<span className="font-mono text-[10px] text-[#9cdcfe]">pi</span> executable: install Pi on{" "}
									<span className="font-mono text-[10px] text-[#9cdcfe]">PATH</span> or set{" "}
									<span className="font-mono text-[10px] text-[#9cdcfe]">WOP_PI_BINARY</span> to the absolute path, then{" "}
									<strong className="text-[#dce9f2]">restart Bun</strong> and tap <strong className="text-[#dce9f2]">Re-check server</strong>.
								</p>
							</>
						) : null}
						<div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#000]/20 pt-3">
							<button
								type="button"
								onClick={() => void refreshServerConfig()}
								className="rounded border border-[#007acc]/60 bg-[#007acc]/25 px-3 py-1.5 font-mono text-[11px] text-[#9cdcfe] hover:bg-[#007acc]/35"
							>
								Re-check server
							</button>
							<span className="text-[10px] text-[#858585]">Reloads GET /api/config after you restart Bun.</span>
						</div>
					</div>
				) : null}
				<div className="rounded border border-[#3c3c3c] bg-[#1e1e1e] p-3">
					<div className="mb-2 flex flex-wrap items-center justify-between gap-2">
						<div className="text-[11px] font-bold uppercase tracking-wide text-[#858585]">Orchestration</div>
						<a
							href="https://github.com/zerwiz/wayofpi/blob/main/docs/WOP_ORCHESTRATION_EXTENSIONS_PANEL.md#plan-toward-100-reliable-orchestration"
							target="_blank"
							rel="noreferrer"
							className="shrink-0 rounded border border-[#3c3c3c] bg-[#252526] px-2 py-0.5 font-mono text-[10px] text-[#9cdcfe] no-underline hover:border-[#007acc]/50 hover:bg-[#2d2d2d]"
							title="Open full guide (GitHub)"
						>
							Docs
						</a>
					</div>
					<p className="mb-2 text-[11px] leading-snug text-[#858585]">
						Repo file:{" "}
						<span className="font-mono text-[10px] text-[#9cdcfe]">docs/WOP_ORCHESTRATION_EXTENSIONS_PANEL.md</span>
					</p>
					<p className="mb-3 text-[12px] leading-relaxed text-[#858585]">
						<strong className="text-[#cccccc]">Plan</strong> / <strong className="text-[#cccccc]">Build</strong> switches
						the session system prompt (same as Plan / Build elsewhere). <strong className="text-[#cccccc]">Chat engine</strong>{" "}
						is read-only from <span className="font-mono text-[10px] text-[#9cdcfe]">WOP_*</span> (
						<span className="font-mono text-[10px] text-[#9cdcfe]">GET /api/config</span>); restart the Bun server after env
						changes. <strong className="text-[#cccccc]">On/off</strong> rows send{" "}
						<span className="font-mono text-[10px] text-[#9cdcfe]">POST /api/config</span> for{" "}
						<strong className="text-[#cccccc]">Pi drives chat</strong>, orchestrator tools, and bash — in-memory until this
						process exits (session overrides; see doc for 404).
					</p>
					<div className="flex rounded border border-[#3c3c3c] bg-[#252526] p-0.5">
						<button
							type="button"
							disabled={streaming}
							onClick={() => onChatModeChange("build")}
							className={`flex-1 rounded px-2 py-2 font-mono text-[11px] font-bold uppercase tracking-wide ${
								chatMode === "build" ? "bg-[#007acc] text-white" : "text-[#858585] hover:text-[#cccccc]"
							} disabled:opacity-40`}
						>
							Build
						</button>
						<button
							type="button"
							disabled={streaming}
							onClick={() => onChatModeChange("plan")}
							className={`flex-1 rounded px-2 py-2 font-mono text-[11px] font-bold uppercase tracking-wide ${
								chatMode === "plan" ? "bg-[#c586c0]/90 text-white" : "text-[#858585] hover:text-[#cccccc]"
							} disabled:opacity-40`}
						>
							Plan
						</button>
					</div>
					{streaming ? (
						<p className="mt-2 font-mono text-[10px] text-[#ce9178]">Finish the current reply before switching mode.</p>
					) : null}
					<div className="mt-3 space-y-1.5 border-t border-[#3c3c3c] pt-3 font-mono text-[11px] text-[#cccccc]">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<span className="text-[#858585]">Chat engine</span>
							<span className="text-[#9cdcfe]">{config?.chatEngine ?? "…"}</span>
						</div>
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div className="min-w-0 flex-1">
								<div className="text-[#858585]">Pi drives chat</div>
							</div>
							{config ? (
								<OrchestratorOnOffButtons
									active={config.piDrivesChat ?? false}
									disabled={streaming}
									busy={orchestratorGateBusy === "pi"}
									onSelect={(next) => patchSessionRuntimeGate({ piDrivesChat: next })}
								/>
							) : (
								<span className="font-mono text-[11px] text-[#858585]">…</span>
							)}
						</div>
						<div className="flex flex-wrap items-center justify-between gap-2">
							<span className="text-[#858585]">Orchestrator tools (Bun)</span>
							{config ? (
								<OrchestratorOnOffButtons
									active={config.orchestratorTools ?? false}
									disabled={streaming}
									busy={orchestratorGateBusy === "tools"}
									onSelect={(next) => patchSessionRuntimeGate({ orchestratorTools: next })}
								/>
							) : (
								<span className="font-mono text-[11px] text-[#858585]">…</span>
							)}
						</div>
						<div className="flex flex-wrap items-center justify-between gap-2">
							<span className="text-[#858585]">Orchestrator bash</span>
							{config ? (
								<OrchestratorOnOffButtons
									active={config.orchestratorBash ?? false}
									disabled={streaming}
									busy={orchestratorGateBusy === "bash"}
									onSelect={(next) => patchSessionRuntimeGate({ orchestratorBash: next })}
								/>
							) : (
								<span className="font-mono text-[11px] text-[#858585]">…</span>
							)}
						</div>
					</div>
					{orchestratorGateError ? (
						<p className="mt-2 font-mono text-[10px] text-[#f48771]">{orchestratorGateError}</p>
					) : null}
					<div className="mt-3 flex flex-col gap-2 border-t border-[#3c3c3c] pt-3">
						<button
							type="button"
							onClick={onOpenTeamsYaml}
							disabled={!hasWorkspace}
							className="rounded border border-[#3c3c3c] bg-[#252526] px-2 py-2 text-left font-mono text-[11px] text-[#9cdcfe] hover:border-[#007acc]/50 hover:bg-[#2d2d2d] disabled:cursor-not-allowed disabled:opacity-40"
						>
							Open teams.yaml
						</button>
						<button
							type="button"
							onClick={onFocusToolLog}
							className="rounded border border-[#3c3c3c] bg-[#252526] px-2 py-2 text-left font-mono text-[11px] text-[#9cdcfe] hover:border-[#007acc]/50 hover:bg-[#2d2d2d]"
						>
							Open chat tool log (bottom panel)
						</button>
					</div>
				</div>

				<div className="rounded border border-[#3c3c3c] bg-[#1e1e1e] p-3">
					<div className="mb-2 flex flex-wrap items-center justify-between gap-2">
						<div className="text-[11px] font-bold uppercase tracking-wide text-[#858585]">Pi extensions</div>
						<button
							type="button"
							disabled={manifestLoading}
							onClick={() => void reloadManifest()}
							className="rounded border border-[#3c3c3c] px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-[#cccccc] hover:bg-[#2d2d2d] disabled:opacity-40"
						>
							{manifestLoading ? "Loading…" : "Refresh manifest"}
						</button>
					</div>
					<p className="mb-3 text-[12px] text-[#858585]">
						Checkboxes mirror <span className="font-mono text-[#9cdcfe]">extensions[]</span> in{" "}
						<span className="font-mono text-[#9cdcfe]">.pi/settings.json</span> (same list Pi loads). If every shim looks on,
						your JSON already lists all of them — use <strong className="text-[#cccccc]">Recommended only</strong> per
						workspace to trim to the five defaults (and keep any paths that are not{" "}
						<span className="font-mono text-[10px] text-[#9cdcfe]">.pi/extensions</span> shims). If the array is empty, those
						five are filled in once automatically; other shims stay off until you enable them. After edits, restart the Bun
						server or Pi <span className="font-mono text-[11px]">/reload</span> before the next headless turn.
					</p>
					{manifestError ? <p className="mb-2 font-mono text-[11px] text-[#f48771]">{manifestError}</p> : null}
					{saveError ? <p className="mb-2 font-mono text-[11px] text-[#f48771]">{saveError}</p> : null}
					{!hasWorkspace ? (
						<p className="text-[12px] text-[#858585]">Open a workspace folder to edit Pi settings.</p>
					) : workspaceFolders.length === 0 ? (
						<p className="text-[12px] text-[#858585]">No workspace folders loaded yet.</p>
					) : (
						<ul className="list-none space-y-4 p-0">
							{workspaceFolders.map((folder) => {
								const key = normWorkspaceRoot(folder.path);
								const snap = manifestSlicesByRoot.get(key);
								const shims = shimSlicesByRoot.get(key) ?? [];
								const settingsRel = piSettingsRelativePath(folders, folder);
								const entries = snap?.entries ?? [];
								const effEntries = effectiveExtensionEntriesForToggles(entries, shims);
								const shimRefs = new Set(shims.map((b) => normExtEntry(piExtensionShimRef(b))));
								const customEntries = entries.filter((e) => !shimRefs.has(normExtEntry(e)));

								return (
									<li key={key} className="min-w-0 overflow-hidden rounded border border-[#3c3c3c] bg-[#252526] p-2.5">
										<div className="mb-2 min-w-0">
											<div className="mb-1.5 truncate font-mono text-[11px] text-[#858585]">
												{folders.length > 1 ? folder.label : "Workspace"}
											</div>
											<div className="flex min-w-0 w-full flex-col gap-1">
												<button
													type="button"
													title=".pi/settings.json"
													onClick={() => focusWorkspaceFile(settingsRel)}
													className="w-full min-w-0 truncate rounded border border-[#3c3c3c] px-1.5 py-0.5 text-center font-mono text-[10px] text-[#9cdcfe] hover:bg-[#2d2d2d]"
												>
													Edit JSON
												</button>
												<button
													type="button"
													disabled={!!savingRel || streaming || shims.length === 0}
													title="Rewrite extensions[] to the five recommended shims (on disk) plus any non-shim paths"
													onClick={() => void trimToRecommendedShims(folder)}
													className="w-full min-w-0 truncate rounded border border-[#3c3c3c] px-1.5 py-0.5 text-center font-mono text-[10px] text-[#cccccc] hover:bg-[#2d2d2d] disabled:cursor-not-allowed disabled:opacity-40"
												>
													Recommended only
												</button>
											</div>
										</div>
										{shims.length === 0 ? (
											<p className="mb-2 font-mono text-[10px] text-[#858585]">
												No <span className="text-[#9cdcfe]">.pi/extensions/*.ts</span> shims found under this folder.
											</p>
										) : (
											<ul className="mb-2 list-none space-y-1 p-0">
												{shims.map((base) => {
													const ref = piExtensionShimRef(base);
													const on = effEntries.some((e) => normExtEntry(e) === normExtEntry(ref));
													return (
														<li
															key={base}
															className="flex flex-wrap items-center justify-between gap-2 rounded px-1 py-1 hover:bg-[#2a2d2e]"
														>
															<label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 font-mono text-[11px]">
																<input
																	type="checkbox"
																	className="shrink-0"
																	checked={on}
																	disabled={!!savingRel}
																	onChange={(ev) => void toggleShim(folder, base, ev.target.checked)}
																/>
																<span className="min-w-0 truncate text-[#cccccc]" title={ref}>
																	{base}
																</span>
															</label>
															<button
																type="button"
																onClick={() => focusWorkspaceFile(ref)}
																className="shrink-0 font-mono text-[10px] text-[#3794ff] underline"
															>
																open
															</button>
														</li>
													);
												})}
											</ul>
										)}
										{customEntries.length > 0 ? (
											<div className="border-t border-[#3c3c3c] pt-2">
												<div className="mb-1 font-mono text-[10px] uppercase tracking-wide text-[#858585]">
													Other extension paths
												</div>
												<ul className="list-none space-y-1 p-0">
													{customEntries.map((e) => (
														<li
															key={e}
															className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]"
														>
															<button
																type="button"
																onClick={() => focusWorkspaceFile(e)}
																className="min-w-0 flex-1 truncate text-left text-[#9cdcfe] underline"
																title={e}
															>
																{e}
															</button>
															<button
																type="button"
																disabled={!!savingRel}
																onClick={() => void removeCustomEntry(folder, e)}
																className="shrink-0 text-[#f48771] hover:underline disabled:opacity-40"
															>
																remove
															</button>
														</li>
													))}
												</ul>
											</div>
										) : null}
									</li>
								);
							})}
						</ul>
					)}
				</div>
			</div>
		</div>
	);
}

export function PlanningSidePanel({
	chatMode,
	onChatModeChange,
	streaming,
	hasWorkspace,
	onNewPlanFile,
}: {
	chatMode: ChatSessionMode;
	onChatModeChange: (m: ChatSessionMode) => void;
	streaming: boolean;
	hasWorkspace: boolean;
	onNewPlanFile: () => void;
}) {
	const newPlanDisabled = !hasWorkspace || streaming;
	return (
		<div className="flex min-h-0 min-w-0 w-full flex-1 flex-col border-r border-[#3c3c3c] bg-[#252526]">
			<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3 text-[13px] leading-relaxed text-[#cccccc]">
				<p className="text-[#858585]">
					<strong className="font-medium text-[#cccccc]">Plan</strong> /{" "}
					<strong className="font-medium text-[#cccccc]">Build</strong> switch the session system prompt before you
					chat. <strong className="text-[#cccccc]">Plan</strong> uses the Pi{" "}
					<span className="font-mono text-[12px] text-[#9cdcfe]">planner</span> role (structured goals, steps,{" "}
					<span className="font-mono text-[11px]">plans/PLAN-*.md</span>).{" "}
					<strong className="font-medium text-[#cccccc]">Build</strong> uses the <strong className="text-[#cccccc]">Orchestrator</strong> posture when no agent is selected (plus{" "}
					<span className="font-mono text-[11px]">WOP_SYSTEM_PROMPT</span> on the server if set).
				</p>
				<p className="text-[12px] text-[#858585]">
					In full Pi TUI, the same role lives in{" "}
					<span className="font-mono text-[#9cdcfe]">.pi/agents/planner.md</span> and agent-team dispatch; here it is
					session-only (no <span className="font-mono text-[11px]">dispatch_agent</span>). Pick any workspace agent from
					the <strong className="text-[#cccccc]">Workspace agent</strong> menu in the session chat header (body text
					from <span className="font-mono text-[11px]">.pi/agents/*.md</span>).
				</p>
				<p className="text-[12px] text-[#858585]">
					<strong className="text-[#cccccc]">Shortcuts:</strong>{" "}
					<span className="font-mono text-[11px]">Shift+Tab</span> in the chat input toggles Plan/Build (when slash
					completion is closed). <span className="font-mono text-[11px]">/plan-interview</span> posts a fill-in
					questionnaire. In <strong className="text-[#cccccc]">Plan</strong> mode,{" "}
					<strong className="text-[#cccccc]">From plan</strong> / <strong className="text-[#cccccc]">Review plan</strong>{" "}
					in the chat chrome insert handoff text for the latest <span className="font-mono text-[11px]">plans/PLAN-*.md</span>{" "}
					(<span className="font-mono text-[11px]">GET /api/plans</span>).
				</p>
				<div className="rounded border border-[#3c3c3c] bg-[#1e1e1e] p-3">
					<div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#858585]">
						Menu bar &amp; shell backlog
					</div>
					<p className="text-[12px] leading-relaxed text-[#858585]">
						Full parity matrix (File → Help, palette, panels, Pi-backed tools):{" "}
						<a
							href="https://github.com/zerwiz/wayofpi/blob/main/docs/WOP_MENU_BAR_BACKLOG.md"
							target="_blank"
							rel="noreferrer"
							className="text-[#3794ff] underline"
						>
							docs/WOP_MENU_BAR_BACKLOG.md
						</a>
						. Everything there is scoped to <span className="font-mono text-[11px] text-[#9cdcfe]">Way of Pi</span>{" "}
						(web UI, Bun server, headless Pi, <span className="font-mono text-[11px]">WOP_*</span>).
					</p>
					<ul className="mt-2 list-disc space-y-1 pl-4 text-[12px] text-[#cccccc]">
						<li>Next spine: headless Pi chat/tools + manifest endpoint (see open TODOs doc).</li>
						<li>Editor depth: outline, problems from diagnostics, symbol/LSP or Pi resolve.</li>
						<li>Run/debug: task runner registry, debug session state, breakpoint persistence.</li>
					</ul>
				</div>
				<div className="flex rounded border border-[#3c3c3c] bg-[#1e1e1e] p-0.5">
					<button
						type="button"
						disabled={streaming}
						onClick={() => onChatModeChange("build")}
						className={`flex-1 rounded px-2 py-2 font-mono text-[11px] font-bold uppercase tracking-wide ${
							chatMode === "build" ? "bg-[#007acc] text-white" : "text-[#858585] hover:text-[#cccccc]"
						} disabled:opacity-40`}
					>
						Build
					</button>
					<button
						type="button"
						disabled={streaming}
						onClick={() => onChatModeChange("plan")}
						className={`flex-1 rounded px-2 py-2 font-mono text-[11px] font-bold uppercase tracking-wide ${
							chatMode === "plan" ? "bg-[#c586c0]/90 text-white" : "text-[#858585] hover:text-[#cccccc]"
						} disabled:opacity-40`}
					>
						Plan
					</button>
				</div>
				<button
					type="button"
					disabled={newPlanDisabled}
					title="Creates plans/PLAN-YYYYMMDD-slug.md with a template (overwrites if that path already exists)"
					onClick={onNewPlanFile}
					className="w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] px-2 py-2 text-left font-mono text-[11px] text-[#cccccc] hover:bg-[#2d2d2d] disabled:cursor-not-allowed disabled:opacity-40"
				>
					New plan file…
				</button>
				{streaming ? (
					<p className="font-mono text-[11px] text-[#ce9178]">Finish the current reply before switching mode.</p>
				) : null}
				{!hasWorkspace ? (
					<p className="font-mono text-[11px] text-[#858585]">Open a workspace folder to create plan files.</p>
				) : null}
			</div>
		</div>
	);
}

export function SettingsSidePanel({
	config,
	workspaceRoot,
	onOpenPiModelConfig,
}: {
	config: ServerConfig | null;
	workspaceRoot: string;
	onOpenPiModelConfig?: (path: PiModelConfigPath) => void;
}) {
	return (
		<div className="flex min-h-0 min-w-0 w-full flex-1 flex-col border-r border-[#3c3c3c] bg-[#252526]">
			<div className="min-h-0 flex-1 overflow-y-auto p-3 font-mono text-[11px] text-[#cccccc]">
				<div className="mb-2 text-[10px] font-bold uppercase text-[#858585]">Workspace</div>
				<div className="mb-4 break-all text-[#9cdcfe]">{workspaceRoot || "—"}</div>
				<div className="mb-4">
					<GithubManageSettingsCard appearanceDark compact />
				</div>
				<TerminalSettingsSection config={config} compact />
				<div className="mb-2 mt-4 text-[10px] font-bold uppercase text-[#858585]">LLM (server)</div>
				{config ? (
					<pre className="whitespace-pre-wrap rounded border border-[#3c3c3c] bg-[#1e1e1e] p-2 text-[10px] leading-relaxed">
						{JSON.stringify(config, null, 2)}
					</pre>
				) : (
					<span className="text-[#858585]">Loading…</span>
				)}
				<p className="mt-3 text-[11px] leading-snug text-[#858585]">
					Host env (<span className="font-mono text-[#9cdcfe]">WOP_LLM_PROVIDER</span>,{" "}
					<span className="font-mono text-[#9cdcfe]">WOP_CHAT_ENGINE</span>, …) drives the server; Pi TUI{" "}
					<span className="font-mono text-[#9cdcfe]">/models</span> reads the same workspace JSON — open a file below in
					the editor.
				</p>
				{onOpenPiModelConfig ? (
					<div className="mt-4 border-t border-[#3c3c3c] pt-3">
						<div className="mb-2 text-[10px] font-bold uppercase text-[#858585]">Provider files</div>
						<ul className="list-none space-y-1 p-0">
							{PI_MODEL_CONFIG_ENTRIES.map((e) => (
								<li key={e.id}>
									<button
										type="button"
										onClick={() => onOpenPiModelConfig(e.path)}
										className="w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] px-2 py-2 text-left hover:border-[#007acc]/50 hover:bg-[#2d2d2d]"
										title={e.hint}
									>
										<span className="block text-[12px] text-[#cccccc]">{e.label}</span>
										<span className="mt-0.5 block font-mono text-[10px] text-[#858585]">{e.path}</span>
									</button>
								</li>
							))}
						</ul>
					</div>
				) : null}
			</div>
		</div>
	);
}
