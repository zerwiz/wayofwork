import { useCallback, useEffect, useState } from "react";
import { BookOpen, RefreshCw, Trash2, X } from "lucide-react";
import { apiGet, apiPostJson } from "../api/client";
import type {
	WorkspaceIndexDocEntry,
	WorkspaceIndexOptions,
	WorkspaceIndexStatusPayload,
} from "../types/workspaceIndex";

const INDEX_CAP_FILES = 50_000;

async function postOptions(partial: Partial<WorkspaceIndexOptions>): Promise<WorkspaceIndexOptions> {
	const r = await apiPostJson<{ ok?: boolean; options?: WorkspaceIndexOptions; error?: string }>(
		"/api/workspace-index/options",
		partial,
	);
	if (!r.ok || !r.options) throw new Error(r.error ?? "Failed to save options");
	return r.options;
}

function Toggle({
	on,
	onToggle,
	disabled,
	appearanceDark,
}: {
	on: boolean;
	onToggle: () => void;
	disabled?: boolean;
	appearanceDark: boolean;
}) {
	const trackOff = appearanceDark ? "bg-[#6f6f6f]" : "bg-[#c8c8c8]";
	return (
		<button
			type="button"
			role="switch"
			aria-checked={on}
			disabled={disabled}
			onClick={onToggle}
			className={`relative h-6 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
				on ? "bg-[#ea580c]" : trackOff
			}`}
		>
			<span
				className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${on ? "right-1" : "left-1"}`}
			/>
		</button>
	);
}

export function IndexingDocsModal({
	open,
	onClose,
	appearanceDark,
}: {
	open: boolean;
	onClose: () => void;
	appearanceDark: boolean;
}) {
	const [status, setStatus] = useState<WorkspaceIndexStatusPayload | null>(null);
	const [loadErr, setLoadErr] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [docUrl, setDocUrl] = useState("");

	const load = useCallback(async () => {
		setLoadErr(null);
		try {
			const s = await apiGet<WorkspaceIndexStatusPayload>("/api/workspace-index");
			setStatus(s);
		} catch (e) {
			setLoadErr(e instanceof Error ? e.message : String(e));
		}
	}, []);

	useEffect(() => {
		if (!open) return;
		void load();
	}, [open, load]);

	const overlay = appearanceDark ? "bg-black/55" : "bg-black/35";
	const panel = appearanceDark ? "border-[#454545] bg-[#252526] text-[#cccccc]" : "border-[#e5e5e5] bg-white text-[#333]";
	const sub = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const card = appearanceDark ? "border-[#3c3c3c] bg-[#1e1e1e]" : "border-[#e5e5e5] bg-[#fafafa]";

	const pct = status?.hasIndex ? (status.state?.truncated ? 95 : 100) : 0;

	const onSync = async () => {
		setBusy(true);
		try {
			await apiPostJson("/api/workspace-index/sync", {});
			await load();
		} catch (e) {
			window.alert(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	};

	const onClear = async () => {
		if (!window.confirm("Delete the local index under .wayofpi/index?")) return;
		setBusy(true);
		try {
			await apiPostJson("/api/workspace-index/clear", {});
			await load();
		} catch (e) {
			window.alert(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	};

	const patchOpts = async (partial: Partial<WorkspaceIndexOptions>) => {
		if (!status) return;
		setBusy(true);
		try {
			const options = await postOptions(partial);
			setStatus((prev) => (prev ? { ...prev, options } : prev));
		} catch (e) {
			window.alert(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	};

	const addDoc = async () => {
		const u = docUrl.trim();
		if (!u) return;
		setBusy(true);
		try {
			await apiPostJson("/api/workspace-index/docs", { url: u });
			setDocUrl("");
			await load();
		} catch (e) {
			window.alert(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	};

	const syncDoc = async (id: string) => {
		setBusy(true);
		try {
			await apiPostJson("/api/workspace-index/docs/sync", { id });
			await load();
		} catch (e) {
			window.alert(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	};

	const removeDoc = async (id: string) => {
		setBusy(true);
		try {
			await apiPostJson("/api/workspace-index/docs/remove", { id });
			await load();
		} catch (e) {
			window.alert(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	};

	if (!open) return null;

	return (
		<div
			className={`fixed inset-0 z-[200] flex items-center justify-center p-4 ${overlay}`}
			role="presentation"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				className={`max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl border shadow-2xl ${panel}`}
				role="dialog"
				aria-modal
				aria-labelledby="wop-indexing-title"
				onMouseDown={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between border-b border-[#3c3c3c] px-5 py-3">
					<div className="flex items-center gap-2">
						<BookOpen className="text-[#fb923c]" size={22} />
						<h2 id="wop-indexing-title" className="text-lg font-bold">
							Indexing & Docs
						</h2>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="rounded p-1 hover:bg-[#3c3c3c]"
						aria-label="Close"
					>
						<X size={20} />
					</button>
				</div>

				<div className="max-h-[calc(90vh-52px)] overflow-y-auto px-5 py-4">
					{loadErr ? (
						<p className="mb-4 text-sm text-red-400">{loadErr}</p>
					) : null}

					<p className={`mb-6 text-sm ${sub}`}>
						Embed a <strong className={appearanceDark ? "text-[#cccccc]" : "text-[#111]"}>local manifest</strong>{" "}
						of workspace files (respecting <code className="text-[11px]">.gitignore</code> and{" "}
						<code className="text-[11px]">.cursorignore</code> where listed). Cursor also uses Merkle sync, AST
						chunking, and cloud embeddings — this build stores metadata under{" "}
						<code className="text-[11px]">.wayofpi/index/</code> only.
					</p>

					<div className={`mb-6 rounded-lg border p-4 ${card}`}>
						<div className="mb-2 flex items-center justify-between gap-2">
							<h3 className="font-semibold">Codebase</h3>
							<button
								type="button"
								disabled={busy}
								onClick={() => void load()}
								className="inline-flex items-center gap-1 rounded border border-[#454545] px-2 py-1 text-xs hover:bg-[#3c3c3c] disabled:opacity-40"
							>
								<RefreshCw size={14} /> Refresh status
							</button>
						</div>
						<p className={`mb-3 text-xs ${sub}`}>
							Workspace: <span className="font-mono">{status?.rootLabel ?? "…"}</span>
						</p>
						<div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-[#3c3c3c]">
							<div
								className="h-full bg-emerald-600 transition-all"
								style={{ width: `${status?.hasIndex ? pct : 0}%` }}
							/>
						</div>
						<p className={`mb-4 text-xs ${sub}`}>
							{status?.state
								? `${status.state.fileCount} files${status.state.truncated ? " (cap reached)" : ""} · fingerprint ${status.state.merkleRoot} · synced ${status.state.syncedAt}`
								: "No index yet — Sync builds manifest.json and optional grep-paths.txt."}
						</p>
						<div className="flex flex-wrap gap-2">
							<button
								type="button"
								disabled={busy}
								onClick={() => void onSync()}
								className="inline-flex items-center gap-1 rounded-lg bg-[#ea580c] px-3 py-2 text-sm font-bold text-white hover:bg-[#c2410c] disabled:opacity-40"
							>
								<RefreshCw size={16} /> Sync index
							</button>
							<button
								type="button"
								disabled={busy || !status?.hasIndex}
								onClick={() => void onClear()}
								className="inline-flex items-center gap-1 rounded-lg border border-[#854d0e] px-3 py-2 text-sm text-[#fed7aa] hover:bg-[#422006] disabled:opacity-40"
							>
								<Trash2 size={16} /> Delete index
							</button>
						</div>
					</div>

					<div className="mb-4 space-y-3">
						<div className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 ${card}`}>
							<div>
								<div className="font-medium">Index new folders</div>
								<p className={`text-xs ${sub}`}>
									Full sync walks the tree (cap {INDEX_CAP_FILES.toLocaleString()} files). Same idea as Cursor’s
									auto-index for new folders — toggled preference is stored for future watchers.
								</p>
							</div>
							<Toggle
								on={status?.options.indexNewFolders ?? true}
								disabled={busy || !status}
								onToggle={() => void patchOpts({ indexNewFolders: !status?.options.indexNewFolders })}
								appearanceDark={appearanceDark}
							/>
						</div>
						<div className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 ${card}`}>
							<div>
								<div className="font-medium">Instant grep path list (local)</div>
								<p className={`text-xs ${sub}`}>
									Writes <code className="text-[11px]">grep-paths.txt</code> — one path per line for ripgrep-style
									workflows (data stays on disk).
								</p>
							</div>
							<Toggle
								on={status?.options.instantGrepIndex ?? true}
								disabled={busy || !status}
								onToggle={() => void patchOpts({ instantGrepIndex: !status?.options.instantGrepIndex })}
								appearanceDark={appearanceDark}
							/>
						</div>
					<div className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 ${card}`}>
						<div>
							<div className="font-medium">Include index summary in chat</div>
							<p className={`text-xs ${sub}`}>
								After Sync, prepends a short file list to the session system prompt (bounded). Turn off to
								save context tokens.
							</p>
						</div>
						<Toggle
							on={status?.options.attachSummaryToChat ?? false}
							disabled={busy || !status}
							onToggle={() =>
								void patchOpts({ attachSummaryToChat: !status?.options.attachSummaryToChat })
							}
							appearanceDark={appearanceDark}
						/>
					</div>
					<div className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 ${card}`}>
						<div className="flex-1 min-w-0">
							<div className="font-medium">Auto-sync index</div>
							<p className={`text-xs ${sub}`}>
								Automatically re-syncs the index in the background on a schedule — no manual button needed.
								The server timer restarts whenever you change this setting.
							</p>
						</div>
						<div className="flex items-center gap-3 shrink-0">
							{(status?.options.autoSyncIntervalMinutes ?? 0) > 0 && (
								<select
									disabled={busy || !status}
									value={status?.options.autoSyncIntervalMinutes ?? 15}
									onChange={(e) =>
										void patchOpts({ autoSyncIntervalMinutes: Number(e.target.value) })
									}
									className={`rounded border px-2 py-1 text-xs disabled:opacity-40 ${
										appearanceDark
											? "border-[#454545] bg-[#1e1e1e] text-[#cccccc]"
											: "border-[#d4d4d4] bg-white text-[#111]"
									}`}
								>
									<option value={5}>Every 5 min</option>
									<option value={15}>Every 15 min</option>
									<option value={30}>Every 30 min</option>
									<option value={60}>Every 60 min</option>
								</select>
							)}
							<Toggle
								on={(status?.options.autoSyncIntervalMinutes ?? 0) > 0}
								disabled={busy || !status}
								onToggle={() => {
									const cur = status?.options.autoSyncIntervalMinutes ?? 0;
									void patchOpts({ autoSyncIntervalMinutes: cur > 0 ? 0 : 15 });
								}}
								appearanceDark={appearanceDark}
							/>
						</div>
					</div>
				</div>

					<p className={`mb-4 text-xs ${sub}`}>
						Ignore files: add <code className="text-[11px]">.cursorignore</code> at the workspace root (same line
						shape as <code className="text-[11px]">.gitignore</code>). Open{" "}
						<code className="text-[11px]">.wayofpi/index/manifest.json</code> to inspect the manifest.
					</p>

					<div className={`rounded-lg border p-4 ${card}`}>
						<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
							<h3 className="font-semibold">Docs</h3>
						</div>
						<p className={`mb-3 text-xs ${sub}`}>
							Crawl HTTP(S) pages into <code className="text-[11px]">.wayofpi/index/docs/</code> (plain text
							strips). For large sites, prefer a sitemap or single doc URL.
						</p>
						<div className="mb-4 flex gap-2">
							<input
								type="url"
								value={docUrl}
								onChange={(e) => setDocUrl(e.target.value)}
								placeholder="https://example.com/docs"
								className={`min-w-0 flex-1 rounded border px-3 py-2 text-sm ${
									appearanceDark
										? "border-[#454545] bg-[#1e1e1e] text-[#cccccc]"
										: "border-[#d4d4d4] bg-white text-[#111]"
								}`}
							/>
							<button
								type="button"
								disabled={busy}
								onClick={() => void addDoc()}
								className="shrink-0 rounded-lg bg-[#ea580c] px-3 py-2 text-sm font-bold text-white hover:bg-[#c2410c] disabled:opacity-40"
							>
								Add doc
							</button>
						</div>
						{status?.docs.length ? (
							<ul className="space-y-2 text-sm">
								{status.docs.map((d: WorkspaceIndexDocEntry) => (
									<li
										key={d.id}
										className="flex flex-wrap items-center justify-between gap-2 rounded border border-[#454545] px-3 py-2"
									>
										<div className="min-w-0 flex-1">
											<div className="truncate font-mono text-xs">{d.url}</div>
											<div className={`text-xs ${sub}`}>
												{d.status}
												{d.fetchedAt ? ` · ${d.fetchedAt}` : ""}
												{d.error ? ` · ${d.error}` : ""}
											</div>
										</div>
										<div className="flex gap-1">
											<button
												type="button"
												disabled={busy}
												onClick={() => void syncDoc(d.id)}
												className="rounded px-2 py-1 text-xs hover:bg-[#3c3c3c]"
											>
												Crawl
											</button>
											<button
												type="button"
												disabled={busy}
												onClick={() => void removeDoc(d.id)}
												className="rounded px-2 py-1 text-xs text-red-300 hover:bg-[#3c3c3c]"
											>
												Remove
											</button>
										</div>
									</li>
								))}
							</ul>
						) : (
							<p className={`text-sm ${sub}`}>No docs yet.</p>
						)}
					</div>

					{status?.about ? (
						<p className={`mt-4 text-[11px] leading-relaxed ${sub}`}>{status.about}</p>
					) : null}
				</div>
			</div>
		</div>
	);
}
