import { ExternalLink, History, Save, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useGithubConnection } from "../hooks/useGithubConnection";

const GITHUB_ACCOUNT_SETTINGS = "https://github.com/settings/profile";
const GITHUB_NEW_FINE_GRAINED_PAT = "https://github.com/settings/personal-access-tokens/new";
const GITHUB_NEW_CLASSIC_PAT = "https://github.com/settings/tokens/new";

/** Prefer `error` from JSON bodies returned on failed `fetch` (e.g. `400: {"ok":false,"error":"…"}`). */
function errorMessageFromUnknown(e: unknown): string {
	const m = e instanceof Error ? e.message : String(e);
	const i = m.indexOf("{");
	if (i === -1) return m;
	try {
		const j = JSON.parse(m.slice(i)) as { error?: string; ok?: boolean };
		if (typeof j.error === "string" && j.error) return j.error;
	} catch {
		/* ignore */
	}
	return m;
}

function VersionStorageConnectModal({
	open,
	onDismiss,
	onConnect,
}: {
	open: boolean;
	onDismiss: () => void;
	onConnect: (token: string) => Promise<void>;
}) {
	const [token, setToken] = useState("");
	const [busy, setBusy] = useState(false);
	const [localError, setLocalError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setLocalError(null);
		setBusy(false);
	}, [open]);

	const submit = useCallback(async () => {
		setLocalError(null);
		setBusy(true);
		try {
			await onConnect(token);
			setToken("");
			onDismiss();
		} catch (e) {
			setLocalError(errorMessageFromUnknown(e));
		} finally {
			setBusy(false);
		}
	}, [onConnect, onDismiss, token]);

	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/60 p-4"
			role="presentation"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onDismiss();
			}}
		>
			<div
				className="flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-[#454545] bg-[#252526] text-[#cccccc] shadow-2xl"
				role="dialog"
				aria-labelledby="github-connect-title"
				aria-modal="true"
				onMouseDown={(e) => e.stopPropagation()}
			>
			<div className="border-b border-[#3c3c3c] px-4 py-4">
				<h2 id="github-connect-title" className="text-[15px] font-semibold text-white">
					Connect Version Storage
				</h2>
				<p className="mt-1 text-[12px] leading-relaxed text-[#858585]">
					A <strong className="text-[#cccccc]">personal access token</strong> is like a special password that lets Way of Work talk to GitHub on your behalf — without ever seeing your real password.
				</p>

				{/* Step-by-step guide */}
				<div className="mt-3 space-y-2">
					{[
						{
							n: "1",
							title: "Go to GitHub token settings",
							body: (
								<span>
									Click one of these links to open the GitHub token page:{" "}
									<a
										href={GITHUB_NEW_FINE_GRAINED_PAT}
										target="_blank"
										rel="noopener noreferrer"
										className="text-[#3794ff] underline"
										onClick={(e) => {
											if (typeof window !== "undefined" && window.wopShell?.openExternalUrl) {
												e.preventDefault();
												void window.wopShell.openExternalUrl(GITHUB_NEW_FINE_GRAINED_PAT);
											}
										}}
									>
										Fine-grained token
									</a>{" "}
									(recommended — more secure, limited scope){" "}
									or{" "}
									<a
										href={GITHUB_NEW_CLASSIC_PAT}
										target="_blank"
										rel="noopener noreferrer"
										className="text-[#3794ff] underline"
										onClick={(e) => {
											if (typeof window !== "undefined" && window.wopShell?.openExternalUrl) {
												e.preventDefault();
												void window.wopShell.openExternalUrl(GITHUB_NEW_CLASSIC_PAT);
											}
										}}
									>
										Classic token
									</a>.
								</span>
							),
						},
						{
							n: "2",
							title: "Name it and set expiry",
							body: "Give it any name (e.g. \u201cway-of-work\u201d). Pick an expiry date \u2014 90 days is a safe choice. For fine-grained tokens, set the resource owner to your account.",
						},
						{
							n: "3",
							title: "Choose permissions",
							body: (
								<span>
									For <strong className="text-[#cccccc]">fine-grained</strong>: under <em>Repository permissions</em> pick <strong className="text-[#cccccc]">Contents → Read</strong> (and optionally Pull requests, Issues). For <strong className="text-[#cccccc]">classic</strong>: tick the <strong className="text-[#cccccc]">repo</strong> scope.
								</span>
							),
						},
						{
							n: "4",
							title: "Click \u201cGenerate token\u201d and copy it",
							body: "The service shows the token once — copy it immediately. It starts with ghp_ (classic) or github_pat_ (fine-grained).",
						},
						{
							n: "5",
							title: "Paste it below and click Save",
							body: "Paste the token in the box below. Way of Work verifies it, then saves it only on your machine under .version-storage-credentials.json. Nothing is sent anywhere else.",
						},
					].map((s) => (
						<div key={s.n} className="flex gap-2.5">
							<div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ea580c]/80 text-[10px] font-extrabold text-white">
								{s.n}
							</div>
							<div className="pt-0.5">
								<p className="text-[12px] font-semibold text-[#d4d4d4]">{s.title}</p>
								<p className="mt-0.5 text-[11px] leading-relaxed text-[#858585]">{s.body}</p>
							</div>
						</div>
					))}
				</div>
			</div>
				<div className="px-4 py-3">
					<label htmlFor="github-pat" className="mb-1 block text-[11px] font-bold uppercase text-[#858585]">
						Version Storage Token
					</label>
					<input
						id="github-pat"
						type="password"
						autoComplete="off"
						spellCheck={false}
						value={token}
						onChange={(e) => setToken(e.target.value)}
						placeholder="ghp_… or github_pat_…"
						className="w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 font-mono text-[12px] text-[#cccccc] placeholder:text-[#6f6f6f]"
					/>
					{localError ? (
						<p className="mt-2 text-[12px] text-[#f48771]" role="alert">
							{localError}
						</p>
					) : null}
				</div>
				<div className="flex justify-end gap-2 border-t border-[#3c3c3c] px-4 py-3">
					<button
						type="button"
						onClick={onDismiss}
						disabled={busy}
						className="rounded border border-[#3c3c3c] px-3 py-1.5 text-[12px] hover:bg-[#3c3c3c] disabled:opacity-40"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={() => void submit()}
						disabled={busy || !token.trim()}
						className="rounded bg-[#238636] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#2ea043] disabled:opacity-40"
					>
						{busy ? "Verifying…" : "Save & connect"}
					</button>
				</div>
			</div>
		</div>
	);
}

export function VersionHistoryModal({
	open,
	onDismiss,
	history,
}: {
	open: boolean;
	onDismiss: () => void;
	history: any[];
}) {
	const [restoreBusy, setRestoreBusy] = useState<string | null>(null); // Stores hash being restored

	const onRestoreVersion = async (commitHash: string) => {
		if (!confirm(`Are you sure you want to restore to version ${commitHash.slice(0, 7)}? This will overwrite current changes.`)) {
			return;
		}
		setRestoreBusy(commitHash);
		try {
			const res = await fetch("/api/github/restore-version", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ commitHash }),
			});
			if (!res.ok) {
				const text = await res.text();
				throw new Error(text || "Failed to restore version");
			}
			alert(`Successfully restored to version ${commitHash.slice(0, 7)}.`);
			onDismiss(); // Close modal on success
			// Potentially trigger a workspace refresh here if needed
		} catch (e) {
			alert(errorMessageFromUnknown(e));
		} finally {
			setRestoreBusy(null);
		}
	};

	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/60 p-4"
			role="presentation"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onDismiss();
			}}
		>
			<div
				className="flex h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[#454545] bg-[#252526] text-[#cccccc] shadow-2xl"
				role="dialog"
				aria-labelledby="version-history-title"
				aria-modal="true"
				onMouseDown={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between border-b border-[#3c3c3c] px-4 py-3">
					<h2 id="version-history-title" className="text-[15px] font-semibold text-white">
						Version History
					</h2>
					<button
						type="button"
						onClick={onDismiss}
						className="rounded-md p-1 hover:bg-[#3c3c3c] text-[#858585] hover:text-white"
					>
						<X size={18} />
					</button>
				</div>
				<div className="flex-1 overflow-y-auto p-4 text-left">
					{history.length === 0 ? (
						<p className="text-center py-8 text-[#858585]">No saved versions found.</p>
					) : (
						<div className="space-y-4">
							{history.map((h) => (
								<div key={h.hash} className="relative pl-6 border-l border-[#3c3c3c] pb-2 last:pb-0">
									<div className="absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#ea580c]" />
									<div className="flex items-center gap-2 text-[11px] text-[#858585]">
										<span className="font-mono">{h.date}</span>
										<span>•</span>
										<span>{h.author}</span>
									</div>
									<p className="mt-1 text-[13px] text-[#d4d4d4] font-medium">{h.message}</p>
									<span className="text-[10px] font-mono text-[#555555]">{h.hash.slice(0, 7)}</span>
									<button
										type="button"
										onClick={() => onRestoreVersion(h.hash)}
										disabled={restoreBusy === h.hash}
										className="ml-2 rounded bg-[#ea580c] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#d94e06] disabled:opacity-50"
									>
										{restoreBusy === h.hash ? "Restoring..." : "Restore"}
									</button>
								</div>
							))}
						</div>
					)}
				</div>
				<div className="border-t border-[#3c3c3c] px-4 py-3 flex justify-end">
					<button
						type="button"
						onClick={onDismiss}
						className="rounded bg-[#ea580c] px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-[#d94e06]"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	);
}

export function ConstructionVersionStorageCard({
	appearanceDark,
}: {
	appearanceDark: boolean;
}) {
	const { status } = useGithubConnection();
	const [saveBusy, setSaveBusy] = useState(false);
	const [historyOpen, setHistoryOpen] = useState(false);
	const [history, setHistory] = useState<any[]>([]);
	const [message, setMessage] = useState("");
	const [showPrompt, setShowPrompt] = useState(false);

	const onSaveVersion = async () => {
		if (!message.trim()) {
			setShowPrompt(true);
			return;
		}
		setSaveBusy(true);
		try {
			const res = await fetch("/api/github/save-version", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ message }),
			});
			if (!res.ok) {
				const text = await res.text();
				throw new Error(text || "Failed to save version");
			}
			setMessage("");
			setShowPrompt(false);
			alert("Version saved successfully!");
		} catch (e) {
			alert(errorMessageFromUnknown(e));
		} finally {
			setSaveBusy(false);
		}
	};

	const onViewHistory = async () => {
		try {
			const res = await fetch("/api/github/version-history");
			if (!res.ok) throw new Error("Failed to fetch history");
			const data = await res.json();
			setHistory(data);
			setHistoryOpen(true);
		} catch (e) {
			alert(errorMessageFromUnknown(e));
		}
	};

	if (!status?.connected) return null;

	return (
		<div className="rounded-2xl border border-[#3c3c3c] bg-[#252526] p-6 shadow-sm mb-4">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-left">
				<div className="min-w-0 flex-1">
					<h3 className="text-lg font-bold text-white flex items-center gap-2">
						<Save className="text-[#ea580c]" size={20} />
						Save Project Version
					</h3>
					<p className="mt-1 text-sm text-[#858585]">
						Securely save all current plans, documents, and data to Version Storage as a permanent version.
					</p>
				</div>
				<div className="flex shrink-0 gap-2">
					<button
						type="button"
						onClick={onViewHistory}
						className="inline-flex items-center gap-1.5 rounded-lg border border-[#3c3c3c] bg-[#1e1e1e] px-4 py-2 text-[13px] font-semibold text-[#cccccc] hover:bg-[#2d2d2d]"
					>
						<History size={16} />
						History
					</button>
					<button
						type="button"
						disabled={saveBusy}
						onClick={() => setShowPrompt(true)}
						className="inline-flex items-center gap-1.5 rounded-lg bg-[#ea580c] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#d94e06] disabled:opacity-50"
					>
						<Save size={16} />
						{saveBusy ? "Saving..." : "Save Version"}
					</button>
				</div>
			</div>

			{showPrompt && (
				<div className="mt-4 border-t border-[#3c3c3c] pt-4 text-left">
					<label className="block text-[11px] font-bold uppercase text-[#858585] mb-2">
						What changed in this version?
					</label>
					<div className="flex gap-2">
						<input
							type="text"
							autoFocus
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && message.trim()) onSaveVersion();
								if (e.key === "Escape") setShowPrompt(false);
							}}
							placeholder="e.g. Added new floor plans for block B"
							className="flex-1 rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-sm text-[#cccccc] focus:border-[#ea580c] outline-none"
						/>
						<button
							onClick={onSaveVersion}
							disabled={saveBusy || !message.trim()}
							className="rounded bg-[#238636] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2ea043] disabled:opacity-50"
						>
							Confirm Save
						</button>
						<button
							onClick={() => setShowPrompt(false)}
							className="rounded border border-[#3c3c3c] px-3 py-2 text-sm text-[#858585] hover:text-white"
						>
							Cancel
						</button>
					</div>
				</div>
			)}

			<VersionHistoryModal 
				open={historyOpen} 
				onDismiss={() => setHistoryOpen(false)} 
				history={history} 
			/>
		</div>
	);
}

/**
 * “Manage settings” row: open GitHub in the browser + PAT-based connect (server verifies and stores under `.github-credentials.json`).
 */
export function VersionStorageManageSettingsCard({
	appearanceDark,
	compact,
}: {
	appearanceDark: boolean;
	/** Technical sidebar: monospace + tight spacing. */
	compact?: boolean;
}) {
	const { status, loading, refresh, connect, disconnect } = useGithubConnection();
	const [modalOpen, setModalOpen] = useState(false);
	const [disconnectBusy, setDisconnectBusy] = useState(false);
	const [disconnectError, setDisconnectError] = useState<string | null>(null);

	const isDark = compact || appearanceDark;
	const card = isDark
		? "border-[#3c3c3c] bg-[#252526]"
		: "border-[#e5e5e5] bg-white shadow-sm";
	const titleC = isDark ? "text-[#cccccc]" : "text-[#333333]";
	const desc = isDark ? "text-[#858585]" : "text-[#616161]";
	const ok = isDark ? "text-[#89d185]" : "text-emerald-700";
	const btnOutline = isDark
		? "inline-flex items-center gap-1.5 rounded-lg border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-[12px] font-semibold text-[#cccccc] hover:border-[#007acc]/50 hover:bg-[#2d2d2d]"
		: "inline-flex items-center gap-1.5 rounded-lg border border-[#d4d4d4] bg-white px-3 py-2 text-[12px] font-semibold text-[#333333] hover:bg-[#f3f3f3]";
	const ghBtn = isDark
		? "inline-flex items-center gap-1.5 rounded-lg border border-[#30363d] bg-[#21262d] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#30363d]"
		: "inline-flex items-center gap-1.5 rounded-lg border border-[#21262d] bg-[#24292f] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#1b1f23]";

	const onDisconnect = useCallback(async () => {
		setDisconnectError(null);
		setDisconnectBusy(true);
		try {
			await disconnect();
		} catch (e) {
			setDisconnectError(errorMessageFromUnknown(e));
			await refresh();
		} finally {
			setDisconnectBusy(false);
		}
	}, [disconnect, refresh]);

	const [gitUserName, setGitUserName] = useState("");
	const [gitUserEmail, setGitUserEmail] = useState("");
	const [gitConfigBusy, setGitConfigBusy] = useState(false);

	const onSaveGitConfig = async () => {
		setGitConfigBusy(true);
		try {
			const res = await fetch("/api/github/git-config", { // New API endpoint needed
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: gitUserName, email: gitUserEmail }),
			});
			if (!res.ok) {
				const text = await res.text();
				throw new Error(text || "Failed to save Git config");
			}
			alert("Git user config saved successfully!");
		} catch (e) {
			alert(errorMessageFromUnknown(e));
		} finally {
			setGitConfigBusy(false);
		}
	};

	useEffect(() => {
		const fetchGitConfig = async () => {
			try {
				const res = await fetch("/api/github/git-config");
				if (res.ok) {
					const config = await res.json();
					setGitUserName(config.name || "");
					setGitUserEmail(config.email || "");
				} else {
					// Handle error, maybe display a message
					console.error("Failed to fetch Git config:", await res.text());
				}
			} catch (e) {
				console.error("Error fetching Git config:", e);
			}
		};
		void fetchGitConfig();
	}, []); // Empty dependency array means this runs once on mount

	const titleClass = compact ? `font-bold ${titleC} text-[12px]` : `font-bold ${titleC}`;
	const descClass = compact ? `mt-1 text-[11px] leading-snug ${desc}` : `mt-1 text-sm ${desc}`;

	return (
		<>
			<div
				className={
					compact
						? `rounded-lg border p-3 ${card}`
						: `flex flex-col gap-4 rounded-2xl border p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between ${card}`
				}
			>
				<div className="min-w-0 flex-1">
					<h3 className={titleClass}>Manage settings</h3>
					<p className={descClass}>
						Connect Version Storage (personal access token), open your Version Storage account settings, and keep team or org workflows
						ready for upcoming integrations.
					</p>
					{status?.error ? (
						<p className={`mt-2 ${compact ? "text-[10px]" : "text-xs"} text-amber-500`}>{status.error}</p>
					) : null}
					{disconnectError ? (
						<p className={`mt-2 ${compact ? "text-[10px]" : "text-xs"} text-[#f48771]`} role="alert">
							{disconnectError}
						</p>
					) : null}
					{status?.connected && status.login ? (
						<p className={`mt-2 ${compact ? "text-[11px]" : "text-sm"} ${ok}`}>
							Version Storage connected as <span className="font-mono">@{status.login}</span>
						</p>
					) : loading ? (
						<p className={`mt-2 ${compact ? "text-[10px]" : "text-xs"} ${desc}`}>Checking connection…</p>
					) : null}
				</div>
				<div className={compact ? "mt-3 flex flex-wrap gap-2" : "flex shrink-0 flex-wrap gap-2 sm:justify-end"}>
					{status?.connected ? (
						<button
							type="button"
							disabled={disconnectBusy}
							onClick={() => void onDisconnect()}
							className={
								isDark
									? "rounded-lg border border-[#6f42c1]/40 px-3 py-2 text-[12px] font-semibold text-[#d2a8ff] hover:bg-[#2d2d2d] disabled:opacity-40"
									: "rounded-lg border border-violet-300 px-3 py-2 text-[12px] font-semibold text-violet-800 hover:bg-violet-50 disabled:opacity-40"
							}
						>
							{disconnectBusy ? "…" : "Disconnect"}
						</button>
					) : null}
				<a
					href={GITHUB_ACCOUNT_SETTINGS}
					target="_blank"
					rel="noopener noreferrer"
					className={btnOutline}
					title="Open Version Storage account settings in your browser"
					onClick={(e) => {
						// In Electron use the shell API so it opens in the system browser
						if (typeof window !== "undefined" && window.wopShell?.openExternalUrl) {
							e.preventDefault();
							void window.wopShell.openExternalUrl(GITHUB_ACCOUNT_SETTINGS);
						}
					}}
				>
					Open
					<ExternalLink className="h-3.5 w-3.5 opacity-80" aria-hidden />
				</a>
					<button
						type="button"
						className={ghBtn}
						title="Verify a PAT with Version Storage and save it under .version-storage-credentials.json in this workspace"
						onClick={() => setModalOpen(true)}
					>
						Connect
					</button>
				</div>
			</div>
			<div
				className={
					compact
						? `rounded-lg border p-3 ${card}`
						: `flex flex-col gap-4 rounded-2xl border p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between ${card}`
				}
			>
				<div className="min-w-0 flex-1">
					<h3 className={titleClass}>Manage settings</h3>
					<p className={descClass}>
						Connect Version Storage (personal access token), open your Version Storage account settings, and keep team or org workflows
						ready for upcoming integrations.
					</p>
					{status?.error ? (
						<p className={`mt-2 ${compact ? "text-[10px]" : "text-xs"} text-amber-500`}>{status.error}</p>
					) : null}
					{disconnectError ? (
						<p className={`mt-2 ${compact ? "text-[10px]" : "text-xs"} text-[#f48771]`} role="alert">
							{disconnectError}
						</p>
					) : null}
					{status?.connected && status.login ? (
						<p className={`mt-2 ${compact ? "text-[11px]" : "text-sm"} ${ok}`}>
							Version Storage connected as <span className="font-mono">@{status.login}</span>
						</p>
					) : loading ? (
						<p className={`mt-2 ${compact ? "text-[10px]" : "text-xs"} ${desc}`}>Checking connection…</p>
					) : null}
				</div>
				<div className={compact ? "mt-3 flex flex-wrap gap-2" : "flex shrink-0 flex-wrap gap-2 sm:justify-end"}>
					{status?.connected ? (
						<button
							type="button"
							disabled={disconnectBusy}
							onClick={() => void onDisconnect()}
							className={
								isDark
									? "rounded-lg border border-[#6f42c1]/40 px-3 py-2 text-[12px] font-semibold text-[#d2a8ff] hover:bg-[#2d2d2d] disabled:opacity-40"
									: "rounded-lg border border-violet-300 px-3 py-2 text-[12px] font-semibold text-violet-800 hover:bg-violet-50 disabled:opacity-40"
							}
						>
							{disconnectBusy ? "…" : "Disconnect"}
						</button>
					) : null}
				<a
					href={GITHUB_ACCOUNT_SETTINGS}
					target="_blank"
					rel="noopener noreferrer"
					className={btnOutline}
					title="Open Version Storage account settings in your browser"
					onClick={(e) => {
						// In Electron use the shell API so it opens in the system browser
						if (typeof window !== "undefined" && window.wopShell?.openExternalUrl) {
							e.preventDefault();
							void window.wopShell.openExternalUrl(GITHUB_ACCOUNT_SETTINGS);
						}
					}}
				>
					Open
					<ExternalLink className="h-3.5 w-3.5 opacity-80" aria-hidden />
				</a>
					<button
						type="button"
						className={ghBtn}
						title="Verify a PAT with Version Storage and save it under .version-storage-credentials.json in this workspace"
						onClick={() => setModalOpen(true)}
					>
						Connect
					</button>
				</div>
			</div>
			<div
				className={
					compact
						? `rounded-lg border p-3 mt-4 ${card}`
						: `flex flex-col gap-4 rounded-2xl border p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between mt-4 ${card}`
				}
			>
				<div className="min-w-0 flex-1">
					<h3 className={titleClass}>Git User Config</h3>
					<p className={descClass}>
						Configure the default user name and email for Git commits made by the system.
					</p>
					<div className="mt-3 space-y-2">
						<div>
							<label htmlFor="git-user-name" className="mb-1 block text-[11px] font-bold uppercase text-[#858585]">
								User Name
							</label>
							<input
								id="git-user-name"
								type="text"
								value={gitUserName}
								onChange={(e) => setGitUserName(e.target.value)}
								placeholder="Your Name"
								className="w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-sm text-[#cccccc] placeholder:text-[#6f6f6f] outline-none focus:border-[#ea580c]"
							/>
						</div>
						<div>
							<label htmlFor="git-user-email" className="mb-1 block text-[11px] font-bold uppercase text-[#858585]">
								User Email
							</label>
							<input
								id="git-user-email"
								type="email"
								value={gitUserEmail}
								onChange={(e) => setGitUserEmail(e.target.value)}
								placeholder="your.email@example.com"
								className="w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-sm text-[#cccccc] placeholder:text-[#6f6f6f] outline-none focus:border-[#ea580c]"
							/>
						</div>
					</div>
				</div>
				<div className="flex shrink-0 gap-2 sm:justify-end">
					<button
						type="button"
						onClick={onSaveGitConfig}
						disabled={gitConfigBusy || !gitUserName.trim() || !gitUserEmail.trim()}
						className="rounded bg-[#ea580c] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#d94e06] disabled:opacity-50"
					>
						{gitConfigBusy ? "Saving..." : "Save Config"}
					</button>
				</div>
			</div>
			<VersionStorageConnectModal open={modalOpen} onDismiss={() => setModalOpen(false)} onConnect={connect} />
		</>
	);
}
