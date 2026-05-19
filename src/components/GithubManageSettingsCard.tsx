import { ExternalLink } from "lucide-react";
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

function GithubConnectModal({
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
					Connect GitHub
				</h2>
				<p className="mt-1 text-[12px] leading-relaxed text-[#858585]">
					A <strong className="text-[#cccccc]">personal access token</strong> is like a special password that lets Way of Pi talk to GitHub on your behalf — without ever seeing your real password.
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
							body: "Give it any name (e.g. \u201cway-of-pi\u201d). Pick an expiry date \u2014 90 days is a safe choice. For fine-grained tokens, set the resource owner to your account.",
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
							body: "GitHub shows the token once — copy it immediately. It starts with ghp_ (classic) or github_pat_ (fine-grained).",
						},
						{
							n: "5",
							title: "Paste it below and click Save",
							body: "Paste the token in the box below. Way of Pi verifies it with GitHub, then saves it only on your machine under .wayofpi/github-credentials.json. Nothing is sent anywhere else.",
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
						Token
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

/**
 * “Manage settings” row: open GitHub in the browser + PAT-based connect (server verifies and stores under `.wayofpi/`).
 */
export function GithubManageSettingsCard({
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
						Connect GitHub (personal access token), open your GitHub account settings, and keep team or org workflows
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
							GitHub connected as <span className="font-mono">@{status.login}</span>
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
					title="Open GitHub account settings in your browser"
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
						title="Verify a PAT with GitHub and save it under .wayofpi/ in this workspace"
						onClick={() => setModalOpen(true)}
					>
						GitHub
					</button>
				</div>
			</div>
			<GithubConnectModal open={modalOpen} onDismiss={() => setModalOpen(false)} onConnect={connect} />
		</>
	);
}
