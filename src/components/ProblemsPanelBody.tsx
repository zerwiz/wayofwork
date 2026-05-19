import { Loader2, Power, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useWorkspaceStaticAnalysisContextOptional } from "../context/WorkspaceStaticAnalysisContext";

const BROWSER_START_CMD =
	"cd apps/wayofwork-ui && bun run server/index.ts\n# Default API: http://127.0.0.1:3333 — Vite dev proxies /api to this port.";

async function copyTextToClipboard(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		try {
			const ta = document.createElement("textarea");
			ta.value = text;
			ta.setAttribute("readonly", "");
			ta.style.position = "fixed";
			ta.style.left = "-9999px";
			document.body.appendChild(ta);
			ta.select();
			const ok = document.execCommand("copy");
			document.body.removeChild(ta);
			return ok;
		} catch {
			return false;
		}
	}
}

export function ProblemsPanelBody() {
	const ctx = useWorkspaceStaticAnalysisContextOptional();
	const [startBusy, setStartBusy] = useState(false);
	const [startHint, setStartHint] = useState<string | null>(null);

	useEffect(() => {
		if (ctx?.ok && !ctx.error) setStartHint(null);
	}, [ctx?.ok, ctx?.error]);

	if (!ctx) {
		return (
			<div className="p-3 font-mono text-[12px] text-[#858585]">
				Static analysis runs in Technical UI with a workspace folder open.
			</div>
		);
	}

	const { problems, loading, runAnalysis, engine, log, ranAt, ok, error, openProblem, refreshProblemsCache } = ctx;
	const ranLabel =
		ranAt && ranAt !== new Date(0).toISOString()
			? new Date(ranAt).toLocaleString(undefined, { hour12: false })
			: "never";

	/** Bun API missing: initial GET failed, or POST /run failed with 404 through Vite proxy. */
	const serverUnreachable =
		!ok &&
		Boolean(
			error?.includes("Could not reach") ||
				error?.includes("workspace/problems") ||
				(/404/i.test(error ?? "") && /not\s*found/i.test(error ?? "")),
		);

	const handleStartService = async () => {
		setStartBusy(true);
		setStartHint(null);
		try {
			const shell = typeof window !== "undefined" ? window.wopShell : undefined;
			if (shell?.startWayOfPiBunServer) {
				const r = await shell.startWayOfPiBunServer();
				if (r.staleServer) {
					setStartHint(
						r.message ??
							"An older Bun server is still on port 3333. Stop that process, then start again from apps/wayofwork-ui.",
					);
					return;
				}
				setStartHint(r.message ?? (r.ok ? "OK." : "Could not start the Bun server."));
				if (r.ok || r.alreadyRunning) await refreshProblemsCache();
				return;
			}
			/** Vite dev: same spawn as Electron, via dev-only middleware (not proxied to Bun). */
			if (import.meta.env.DEV) {
				try {
					const resp = await fetch("/__wop_dev/start-wayofpi-api", { method: "POST" });
					if (resp.status !== 404) {
						const data = (await resp.json().catch(() => ({}))) as {
							ok?: boolean;
							alreadyRunning?: boolean;
							staleServer?: boolean;
							message?: string;
						};
						if (data.staleServer) {
							setStartHint(
								data.message ??
									"An older Bun server is still on port 3333. Stop that process, then click Start service again.",
							);
							return;
						}
						setStartHint(
							data.message ??
								(data.ok ? "Bun API is up." : "Could not start the Bun server from the Vite dev server."),
						);
						if (data.ok || data.alreadyRunning) await refreshProblemsCache();
						return;
					}
				} catch {
					/* fall through to clipboard */
				}
			}
			const copied = await copyTextToClipboard(BROWSER_START_CMD);
			setStartHint(
				copied
					? "Copied a terminal command to your clipboard. Run it from the repo root, wait until Bun listens on port 3333, then click Run analysis (GET/POST will use the API once it is up)."
					: "Could not copy to clipboard. Run from repo root: cd apps/wayofwork-ui && bun run server/index.ts",
			);
			void refreshProblemsCache();
		} catch (e) {
			setStartHint(e instanceof Error ? e.message : String(e));
		} finally {
			setStartBusy(false);
		}
	};

	const handleRetryConnection = async () => {
		setStartBusy(true);
		setStartHint(null);
		try {
			await refreshProblemsCache();
			setStartHint("Retried GET /api/workspace/problems. If Bun is listening on port 3333, the red banner should clear.");
		} finally {
			setStartBusy(false);
		}
	};

	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
			<div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#2d2d2d] bg-[#252526] px-2 py-1.5">
				<div className="min-w-0 font-mono text-[10px] text-[#858585]">
					<span className="text-[#cccccc]">Engine:</span>{" "}
					<span className="text-[#9cdcfe]">{engine}</span>
					<span className="mx-1.5 text-[#555]">·</span>
					<span className="text-[#cccccc]">Last run:</span> {ranLabel}
				</div>
				<div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
					{serverUnreachable ? (
						<>
							<button
								type="button"
								disabled={loading || startBusy}
								onClick={() => void handleStartService()}
								className="flex shrink-0 items-center gap-1 rounded border border-[#2ea043]/50 bg-[#1e3a24] px-2 py-1 font-mono text-[11px] text-[#7ee787] hover:bg-[#264d32] disabled:opacity-50"
								title={
									typeof window !== "undefined" && window.wopShell?.startWayOfPiBunServer
										? "Spawn Bun API (apps/wayofwork-ui) for Vite to proxy /api — Electron dev."
										: import.meta.env.DEV
											? "Spawn Bun API via the Vite dev server (same as Electron). Preview / static hosts: command is copied instead."
											: "Copy a terminal command to start the Bun API (this build is not Vite dev and has no desktop shell)."
								}
							>
								{startBusy ? <Loader2 size={12} className="animate-spin" /> : <Power size={12} />}
								Start service
							</button>
							<button
								type="button"
								disabled={loading || startBusy}
								onClick={() => void handleRetryConnection()}
								className="flex shrink-0 items-center gap-1 rounded border border-[#3c3c3c] bg-[#1e1e1e] px-2 py-1 font-mono text-[11px] text-[#cccccc] hover:bg-[#3c3c3c] disabled:opacity-50"
								title="Re-fetch GET /api/workspace/problems (after you start Bun in a terminal)"
							>
								<RefreshCw size={12} />
								Retry connection
							</button>
						</>
					) : null}
					<button
						type="button"
						disabled={loading}
						onClick={() => void runAnalysis()}
						className="flex shrink-0 items-center gap-1 rounded border border-[#3c3c3c] bg-[#1e1e1e] px-2 py-1 font-mono text-[11px] text-[#cccccc] hover:bg-[#3c3c3c] disabled:opacity-50"
						title="Run ESLint (unix) or tsc --noEmit on the primary workspace root"
					>
						{loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
						Run analysis
					</button>
				</div>
			</div>
			{error || !ok ? (
				<div className="shrink-0 border-b border-[#f14c4c]/30 bg-[#3c1f1f] px-2 py-1.5 font-mono text-[11px] text-[#f48771]">
					{error ?? "Analysis failed"}
				</div>
			) : null}
			{startHint ? (
				<div className="shrink-0 border-b border-[#3c3c3c] bg-[#252526] px-2 py-1.5 font-mono text-[10px] leading-snug text-[#9cdcfe]">
					{startHint}
				</div>
			) : null}
			<div className="min-h-0 flex-1 overflow-y-auto">
				{problems.length === 0 ? (
					<div className="space-y-2 p-3 font-mono text-[12px] leading-relaxed text-[#858585]">
						{!ok ? (
							<>
								<p className="text-[#cccccc]">
									{serverUnreachable ? (
										<>
											Problems could not be loaded. This is usually a <strong className="text-[#f48771]">404</strong> or
											network error because the <strong className="text-[#cccccc]">Bun API</strong> is not running — it is
											not the same as “no ESLint in the repo”. Use{" "}
											<strong className="text-[#7ee787]">Start service</strong> (Vite or Electron dev spawns Bun; static
											preview copies a command) or start Bun manually, then{" "}
											<strong className="text-[#cccccc]">Retry connection</strong>.
										</>
									) : (
										<>
											The last <strong className="text-[#cccccc]">Run analysis</strong> or refresh failed. Use the red
											banner and log below; fix config or tool errors, then try again.
										</>
									)}
								</p>
								{serverUnreachable ? (
									<div className="flex flex-wrap gap-2">
										<button
											type="button"
											disabled={loading || startBusy}
											onClick={() => void handleStartService()}
											className="flex items-center gap-1 rounded border border-[#2ea043]/50 bg-[#1e3a24] px-3 py-2 font-mono text-[11px] font-semibold text-[#7ee787] hover:bg-[#264d32] disabled:opacity-50"
										>
											{startBusy ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
											Start service
										</button>
										<button
											type="button"
											disabled={loading || startBusy}
											onClick={() => void handleRetryConnection()}
											className="flex items-center gap-1 rounded border border-[#3c3c3c] bg-[#2d2d2d] px-3 py-2 font-mono text-[11px] text-[#cccccc] hover:bg-[#3c3c3c] disabled:opacity-50"
										>
											<RefreshCw size={14} />
											Retry connection
										</button>
									</div>
								) : null}
							</>
						) : ok && engine === "none" ? (
							<p>
								No issues in the last run, or analysis did not run. If you have not run analysis yet, click{" "}
								<strong className="text-[#cccccc]">Run analysis</strong>. Otherwise the workspace root (or{" "}
								<strong className="text-[#cccccc]">apps/wayofwork-ui</strong> in this monorepo) needs an ESLint config or{" "}
								<strong className="text-[#cccccc]">tsconfig.json</strong>.
							</p>
						) : (
							<p>No issues in the last run.</p>
						)}
						{log ? (
							<pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded border border-[#3c3c3c] bg-[#1e1e1e] p-2 text-[10px] text-[#cccccc]">
								{log}
							</pre>
						) : null}
					</div>
				) : (
					<ul className="list-none divide-y divide-[#2d2d2d] p-0">
						{problems.map((p, i) => (
							<li key={`${p.path}-${p.line}-${p.column}-${i}`}>
								<button
									type="button"
									onClick={() => openProblem(p.path, p.line, p.column)}
									className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-[#2a2d2e]"
								>
									<div className="flex w-full min-w-0 items-center gap-2">
										<span
											className={`shrink-0 font-mono text-[10px] font-bold uppercase ${
												p.severity === "error"
													? "text-[#f14c4c]"
													: p.severity === "warning"
														? "text-[#cca700]"
														: "text-[#858585]"
											}`}
										>
											{p.severity}
										</span>
										<span className="min-w-0 truncate font-mono text-[11px] text-[#9cdcfe]">
											{p.path}:{p.line}:{p.column}
										</span>
										<span className="shrink-0 font-mono text-[10px] text-[#858585]">[{p.source}]</span>
									</div>
									<span className="pl-0 text-[12px] text-[#cccccc]">{p.message}</span>
									{p.rule ? (
										<span className="font-mono text-[10px] text-[#858585]">{p.rule}</span>
									) : null}
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
