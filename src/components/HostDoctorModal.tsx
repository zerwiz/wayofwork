import { useCallback, useEffect, useRef, useState } from "react";
import {
	WOP_WORKSPACE_EDITOR_FIND_BAR_INACTIVE,
	WOP_WORKSPACE_EDITOR_GUTTER_DARK,
	WOP_WORKSPACE_EDITOR_GUTTER_LIGHT,
	WOP_WORKSPACE_EDITOR_SCROLL_DARK,
	WOP_WORKSPACE_EDITOR_SCROLL_LIGHT,
	WOP_WORKSPACE_EDITOR_TEXTAREA_DARK,
	WOP_WORKSPACE_EDITOR_TEXTAREA_LIGHT,
} from "../constants/workspaceEditorChrome";
import { HostDoctorWorkspaceFileEditor } from "./HostDoctorWorkspaceFileEditor";
import { WorkspaceTextBuffer } from "./WorkspaceTextBuffer";
import {
	Activity,
	ChevronDown,
	ChevronRight,
	Copy,
	ExternalLink,
	RefreshCw,
	X,
} from "lucide-react";
import { apiGet } from "../api/client";
import type { DoctorCheck, HostDoctorDiagnostics } from "../types/hostDoctor";

function hostDoctorReadonlySnapshotNoop(): void {}

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

function statusChip(
	appearanceDark: boolean,
	status: DoctorCheck["status"],
): { label: string; className: string } {
	const base = "rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide";
	switch (status) {
		case "ok":
			return {
				label: "OK",
				className: appearanceDark
					? `${base} bg-emerald-900/50 text-emerald-300`
					: `${base} bg-emerald-100 text-emerald-900`,
			};
		case "warn":
			return {
				label: "Warn",
				className: appearanceDark
					? `${base} bg-amber-900/40 text-amber-200`
					: `${base} bg-amber-100 text-amber-950`,
			};
		case "error":
			return {
				label: "Fail",
				className: appearanceDark
					? `${base} bg-red-900/45 text-red-200`
					: `${base} bg-red-100 text-red-900`,
			};
		case "skip":
			return {
				label: "Skip",
				className: appearanceDark
					? `${base} bg-[#3c3c3c] text-[#858585]`
					: `${base} bg-[#f0f0f0] text-[#616161]`,
			};
		default:
			return {
				label: "Info",
				className: appearanceDark
					? `${base} bg-sky-900/40 text-sky-200`
					: `${base} bg-sky-100 text-sky-950`,
			};
	}
}

function normalizeChecks(d: HostDoctorDiagnostics | null): DoctorCheck[] {
	if (!d || !Array.isArray(d.checks)) return [];
	return d.checks.filter((c) => c && typeof c.id === "string" && typeof c.title === "string");
}

/** When the server omits **`checks[]`** (older builds), derive a short list from the JSON blob. */
function inferFallbackChecks(d: HostDoctorDiagnostics): DoctorCheck[] {
	const out: DoctorCheck[] = [];
	const prov = String(d.llm?.provider ?? d.env?.WOP_LLM_PROVIDER ?? "ollama").toLowerCase();
	const ollama = d.llm?.ollama;
	if (prov === "ollama" && ollama && typeof ollama === "object") {
		if (ollama.skipped === true) {
			out.push({
				id: "ollama",
				title: "Ollama API",
				status: "skip",
				summary: String(ollama.reason ?? "skipped"),
			});
		} else if (ollama.ok === false) {
			out.push({
				id: "ollama",
				title: "Ollama API",
				status: "error",
				summary: String(ollama.error ?? "unreachable"),
				hint: "Start Ollama or fix OLLAMA_BASE_URL / host resolution.",
			});
		} else if (ollama.ok === true) {
			const om = ollama as Record<string, unknown>;
			const n = typeof om.modelCount === "number" ? om.modelCount : 0;
			out.push({
				id: "ollama",
				title: "Ollama API",
				status: "ok",
				summary: `${n} model tag(s) listed`,
				hint: "Tags endpoint only — see default model row when present.",
			});
			const configured = typeof om.configuredModel === "string" ? om.configuredModel.trim() : "";
			const present = om.configuredModelPresent === true;
			if (configured) {
				out.push({
					id: "ollama_default_model",
					title: "Default Ollama model (server)",
					status: present ? "ok" : "error",
					summary: present
						? `Resolved id “${configured}” matches a local pull.`
						: `Resolved id “${configured}” is not in the local ollama list.`,
					hint: present
						? undefined
						: "Set OLLAMA_MODEL or `agent/settings.json` defaultModel to an id from `ollama list`, or `ollama pull …`.",
				});
			}
		}
	}
	if (prov === "openrouter") {
		const set = d.env?.openRouterApiKeySet;
		if (set === false) {
			out.push({
				id: "openrouter",
				title: "OpenRouter API key",
				status: "error",
				summary: "OPENROUTER_API_KEY is not set",
				hint: "Set the key for the Way of Pi server process and restart.",
			});
		}
	}
	if (prov !== "ollama" && prov !== "openrouter") {
		out.push({
			id: "llm_provider",
			title: "LLM provider",
			status: "warn",
			summary: `WOP_LLM_PROVIDER=${prov}`,
			hint: "Web chat expects ollama or openrouter.",
		});
	}
	const pi = d.piBinary as
		| { exists?: boolean; resolvedPath?: string | null; versionError?: string | null }
		| undefined;
	if (pi && pi.exists === false && pi.resolvedPath) {
		out.push({
			id: "pi_binary",
			title: "Pi CLI",
			status: "error",
			summary: `Binary missing: ${pi.resolvedPath}`,
		});
	} else if (pi && pi.exists === true && pi.versionError) {
		out.push({
			id: "pi_version",
			title: "Pi CLI",
			status: "warn",
			summary: `pi --version: ${pi.versionError}`,
		});
	}
	const blocked = d.chatRuntime?.blockedReason;
	if (typeof blocked === "string" && blocked.trim()) {
		out.push({
			id: "pi_engine_block",
			title: "Pi chat engine",
			status: "error",
			summary: blocked.trim(),
		});
	}
	return out;
}

function summarizeChecksLocal(checks: DoctorCheck[]): NonNullable<HostDoctorDiagnostics["doctorSummary"]> {
	let worst: "ok" | "warn" | "error" = "ok";
	let errors = 0;
	let warnings = 0;
	for (const c of checks) {
		if (c.status === "error") {
			errors += 1;
			worst = "error";
		} else if (c.status === "warn") {
			warnings += 1;
			if (worst === "ok") worst = "warn";
		}
	}
	return { worst, errors, warnings, total: checks.length };
}

function effectiveChecks(d: HostDoctorDiagnostics | null): DoctorCheck[] {
	if (!d) return [];
	const raw = normalizeChecks(d);
	if (raw.length > 0) return raw;
	return inferFallbackChecks(d);
}

function effectiveSummary(
	d: HostDoctorDiagnostics | null,
	checks: DoctorCheck[],
): NonNullable<HostDoctorDiagnostics["doctorSummary"]> | null {
	if (!d) return null;
	const s = d.doctorSummary;
	if (s && typeof s.worst === "string" && typeof s.total === "number") return s;
	if (checks.length > 0) return summarizeChecksLocal(checks);
	return null;
}

/** Advanced panel: read-only **Live snapshot** plus workspace files (same **`PUT /api/file`** as the editor). */
const HOST_DOCTOR_ADVANCED_TABS: { key: string; label: string; path: string | null }[] = [
	{ key: "snapshot", label: "Live snapshot", path: null },
	{ key: "agent/models.json", label: "agent/models.json", path: "agent/models.json" },
	{ key: "pi.config.json", label: "pi.config.json", path: "pi.config.json" },
	{ key: "agent/settings.json", label: "agent/settings.json", path: "agent/settings.json" },
	{ key: ".pi/settings.json", label: ".pi/settings.json", path: ".pi/settings.json" },
	{ key: ".pi/agents/teams.yaml", label: ".pi/agents/teams.yaml", path: ".pi/agents/teams.yaml" },
];

/** Fetches **GET `/api/diagnostics`**, shows checks, problems, env, and raw JSON. */
export function HostDoctorModal({
	open,
	onClose,
	appearanceDark,
	onWorkspaceFileSaved,
}: {
	open: boolean;
	onClose: () => void;
	appearanceDark: boolean;
	/** After a workspace file save from this modal (e.g. refresh tree / pick up new file). */
	onWorkspaceFileSaved?: () => void | Promise<void>;
}) {
	const [loading, setLoading] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [data, setData] = useState<HostDoctorDiagnostics | null>(null);
	const [advancedOpen, setAdvancedOpen] = useState(false);
	const [advancedTabKey, setAdvancedTabKey] = useState<string>("snapshot");
	const [copyFlash, setCopyFlash] = useState(false);
	const [copyFail, setCopyFail] = useState(false);
	const [lastRunAt, setLastRunAt] = useState<Date | null>(null);
	const problemsRef = useRef<HTMLDivElement | null>(null);

	const panel = appearanceDark
		? "border-[#3c3c3c] bg-[#252526] text-[#cccccc]"
		: "border-[#e5e5e5] bg-white text-[#333333]";
	const muted = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const borderB = appearanceDark ? "border-[#3c3c3c]" : "border-[#e5e5e5]";
	const primaryBtn = appearanceDark
		? "bg-[#0e639c] text-white hover:bg-[#1177bb] disabled:opacity-50"
		: "bg-[#007acc] text-white hover:bg-[#0062a3] disabled:opacity-50";
	const ghostBtn = appearanceDark
		? "border border-[#3c3c3c] bg-[#3c3c3c] text-[#cccccc] hover:bg-[#4a4a4a] disabled:opacity-50"
		: "border border-[#e5e5e5] bg-[#f3f3f3] text-[#333333] hover:bg-[#e5e5e5] disabled:opacity-50";

	const loadInternal = useCallback(async (): Promise<HostDoctorDiagnostics | null> => {
		setLoading(true);
		setLoadError(null);
		try {
			const d = await apiGet<HostDoctorDiagnostics>("/api/diagnostics");
			setData(d);
			return d;
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			setLoadError(msg);
			setData(null);
			return null;
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (open) void loadInternal();
	}, [open, loadInternal]);

	useEffect(() => {
		if (!advancedOpen) setAdvancedTabKey("snapshot");
	}, [advancedOpen]);

	const onWorkspaceSaved = useCallback(async () => {
		await loadInternal();
		await onWorkspaceFileSaved?.();
	}, [loadInternal, onWorkspaceFileSaved]);

	const scrollToProblemsIfNeeded = useCallback((d: HostDoctorDiagnostics | null) => {
		const checks = effectiveChecks(d);
		const bad = checks.filter((c) => c.status === "error" || c.status === "warn");
		if (bad.length === 0) return;
		queueMicrotask(() => {
			problemsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
		});
	}, []);

	const runDiagnostic = useCallback(() => {
		void (async () => {
			const d = await loadInternal();
			setLastRunAt(new Date());
			scrollToProblemsIfNeeded(d);
		})();
	}, [loadInternal, scrollToProblemsIfNeeded]);

	const getJsonTextForCopy = useCallback((): string | null => {
		if (data) return JSON.stringify(data, null, 2);
		if (loadError) {
			return JSON.stringify(
				{ ok: false, error: loadError, time: new Date().toISOString() },
				null,
				2,
			);
		}
		return null;
	}, [data, loadError]);

	const copyJson = useCallback(async () => {
		const text = getJsonTextForCopy();
		if (!text) return;
		setCopyFail(false);
		const ok = await copyTextToClipboard(text);
		if (ok) {
			setCopyFlash(true);
			setTimeout(() => setCopyFlash(false), 1600);
		} else {
			setCopyFail(true);
			setTimeout(() => setCopyFail(false), 4000);
		}
	}, [getJsonTextForCopy]);

	const openRawTab = useCallback(async () => {
		const openBlobInNewTab = (text: string): boolean => {
			const blob = new Blob([text], { type: "application/json;charset=utf-8" });
			const blobUrl = URL.createObjectURL(blob);
			const w = window.open(blobUrl, "_blank", "noopener,noreferrer");
			if (w) {
				window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
				return true;
			}
			URL.revokeObjectURL(blobUrl);
			return false;
		};

		let href: string;
		try {
			href = new URL("/api/diagnostics", window.location.href).href;
		} catch {
			href = `${window.location.origin}/api/diagnostics`;
		}

		// Prefer blob from the snapshot we already have (reliable in Electron; avoids system browser on localhost).
		const cached = getJsonTextForCopy();
		if (cached && openBlobInNewTab(cached)) return;

		// Same user gesture: fetch raw JSON if we have nothing cached yet (e.g. clicked before load finished).
		try {
			const res = await fetch(href, { credentials: "same-origin" });
			const body = await res.text();
			if (body && openBlobInNewTab(body)) return;
		} catch {
			/* fall through */
		}

		const w = window.open(href, "_blank", "noopener,noreferrer");
		if (w != null) return;

		const payload = data ?? (loadError ? { ok: false, error: loadError } : null);
		if (payload) {
			const text = JSON.stringify(payload, null, 2);
			if (openBlobInNewTab(text)) return;
		}

		try {
			if (typeof window !== "undefined" && window.wopShell?.openExternalUrl) {
				await window.wopShell.openExternalUrl(href);
			}
		} catch {
			/* no-op */
		}
	}, [data, loadError, getJsonTextForCopy]);

	if (!open) return null;

	const checks = effectiveChecks(data);
	const summary = effectiveSummary(data, checks);
	const problemChecks = checks.filter((c) => c.status === "error" || c.status === "warn");
	const headline =
		loadError && !data
			? "Could not load diagnostics"
			: summary?.worst === "error"
				? "Some checks failed"
				: summary?.worst === "warn"
					? "Healthy with warnings"
					: checks.length > 0
						? "All blocking checks passed"
						: loadError
							? "Request failed"
							: "Snapshot loaded";
	const canCopy = Boolean(getJsonTextForCopy());

	return (
		<div
			className="fixed inset-0 z-[126] flex items-center justify-center bg-black/60 p-4"
			role="presentation"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
		<div
			className={`flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border shadow-2xl ${panel}`}
			role="dialog"
			aria-labelledby="host-doctor-title"
			aria-modal="true"
			onMouseDown={(e) => e.stopPropagation()}
		>
				<div className={`flex items-center justify-between border-b px-4 py-3 ${borderB}`}>
					<div>
						<h2 id="host-doctor-title" className="text-lg font-bold">
							Host doctor
						</h2>
						<p className={`mt-0.5 text-xs ${muted}`}>Live snapshot from this Way of Pi server</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className={`rounded p-1 ${appearanceDark ? "text-[#858585] hover:bg-[#3c3c3c]" : "text-[#616161] hover:bg-[#e5e5e5]"}`}
						aria-label="Close"
					>
						<X size={20} />
					</button>
				</div>

				<div className={`flex flex-wrap items-center gap-2 border-b px-4 py-2.5 ${borderB}`}>
					<button
						type="button"
						className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${primaryBtn}`}
						onClick={() => runDiagnostic()}
						disabled={loading}
					>
						<Activity size={16} className={loading ? "animate-pulse" : ""} />
						Run diagnostic
					</button>
					<button
						type="button"
						className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${ghostBtn}`}
						onClick={() => void loadInternal()}
						disabled={loading}
					>
						<RefreshCw size={16} className={loading ? "animate-spin" : ""} />
						Refresh
					</button>
					<button
						type="button"
						className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${ghostBtn}`}
						onClick={() => void copyJson()}
						disabled={!canCopy}
					>
						<Copy size={16} />
						{copyFlash ? "Copied" : "Copy JSON"}
					</button>
					<button type="button" className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${ghostBtn}`} onClick={openRawTab}>
						<ExternalLink size={16} />
						Open raw
					</button>
				</div>

				{copyFail ? (
					<p className={`border-b px-4 py-2 text-xs ${appearanceDark ? "border-amber-500/30 text-amber-200" : "border-amber-200 text-amber-900"}`}>
						Copy failed (browser blocked clipboard). Use Open raw, then save from the browser.
					</p>
				) : null}

				<div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
					{loading && !data && !loadError ? (
						<p className={`mb-3 text-sm ${muted}`}>Loading diagnostics…</p>
					) : null}

					{loadError && !data && (
						<pre
							className={`mb-4 whitespace-pre-wrap rounded-lg border p-3 font-mono text-[12px] ${
								appearanceDark ? "border-red-500/30 bg-[#1e1e1e] text-red-300" : "border-red-200 bg-red-50 text-red-900"
							}`}
						>
							{loadError}
						</pre>
					)}

					{data && (
						<>
							{lastRunAt ? (
								<p className={`mb-2 text-[11px] ${muted}`}>
									Last diagnostic: {lastRunAt.toLocaleString()}
								</p>
							) : null}

							<div
								className={`mb-4 rounded-lg border px-3 py-2.5 text-sm ${
									summary?.worst === "error" || (loadError && !data)
										? appearanceDark
											? "border-red-500/35 bg-red-950/30"
											: "border-red-200 bg-red-50"
										: summary?.worst === "warn"
											? appearanceDark
												? "border-amber-500/30 bg-amber-950/25"
												: "border-amber-200 bg-amber-50"
											: appearanceDark
												? "border-emerald-500/25 bg-emerald-950/20"
												: "border-emerald-200 bg-emerald-50"
								}`}
							>
								<p className="font-semibold">{headline}</p>
								{summary ? (
									<p className={`mt-1 text-xs ${muted}`}>
										{summary.errors ? `${summary.errors} error(s)` : "0 errors"}
										{" · "}
										{summary.warnings ? `${summary.warnings} warning(s)` : "0 warnings"}
										{typeof summary.total === "number" ? ` · ${summary.total} checks` : ""}
									</p>
								) : null}
							</div>

							<div ref={problemsRef} className="mb-4">
								<h3 className={`mb-2 text-sm font-semibold ${appearanceDark ? "text-[#d4d4d4]" : "text-[#111]"}`}>
									Problems
								</h3>
								{problemChecks.length > 0 ? (
									<ul
										className={`space-y-2 rounded-lg border p-3 text-sm ${
											appearanceDark ? "border-red-500/25 bg-[#1e1e1e]/90" : "border-red-200 bg-red-50/80"
										}`}
									>
										{problemChecks.map((c) => (
											<li key={`p-${c.id}`}>
												<span className="font-medium">{c.title}</span>
												<span className={muted}> — </span>
												<span className="break-all font-mono text-[12px]">{c.summary}</span>
												{c.hint ? (
													<p className={`mt-1 text-xs leading-relaxed ${appearanceDark ? "text-[#9d9d9d]" : "text-[#555]"}`}>
														{c.hint}
													</p>
												) : null}
											</li>
										))}
									</ul>
								) : (
									<p
										className={`rounded-lg border px-3 py-2 text-sm ${
											appearanceDark ? "border-emerald-500/25 text-emerald-200/90" : "border-emerald-200 text-emerald-900"
										}`}
									>
										{lastRunAt
											? "No errors or warnings in this run. Info and skipped rows still appear in the full checklist below."
											: "No errors or warnings in the current snapshot. Use Run diagnostic to re-check after changing env or services."}
									</p>
								)}
							</div>

							{checks.length > 0 && (
								<>
									<h3 className={`mb-2 text-sm font-semibold ${appearanceDark ? "text-[#d4d4d4]" : "text-[#111]"}`}>
										All checks
									</h3>
									<ul className="mb-4 space-y-2">
										{checks.map((c) => {
											const chip = statusChip(appearanceDark, c.status);
											return (
												<li
													key={c.id}
													className={`rounded-lg border px-3 py-2.5 text-sm ${appearanceDark ? "border-[#3c3c3c] bg-[#1e1e1e]/80" : "border-[#e5e5e5] bg-[#fafafa]"}`}
												>
													<div className="flex flex-wrap items-start justify-between gap-2">
														<div className="min-w-0 flex-1">
															<div className="flex flex-wrap items-center gap-2">
																<span className={chip.className}>{chip.label}</span>
																<span className="font-medium">{c.title}</span>
															</div>
															<p className={`mt-1 break-all font-mono text-[12px] ${muted}`}>{c.summary}</p>
															{c.hint ? (
																<p className={`mt-1 text-xs leading-relaxed ${appearanceDark ? "text-[#9d9d9d]" : "text-[#555]"}`}>
																	{c.hint}
																</p>
															) : null}
														</div>
													</div>
												</li>
											);
										})}
									</ul>
								</>
							)}

							{data?.workspace?.primary && (
								<div className={`mb-3 space-y-2 text-xs ${muted}`}>
									<div>
										<span className="font-semibold text-inherit">Project workspace (tree / API / chat cwd)</span>
										<div className="mt-1 font-mono break-all">{data.workspace.primary}</div>
										{Array.isArray(data.workspace.folders) && data.workspace.folders.length > 1 && (
											<div className="mt-1">{data.workspace.folders.length} roots (multi-folder)</div>
										)}
									</div>
									{(() => {
										const bundle = data.wayOfPiBundleRoot ?? data.playgroundRoot;
										if (!bundle) return null;
										return (
											<div>
												<span className="font-semibold text-inherit">Way of Pi install / bundle (not your project by default)</span>
												<div className="mt-1 font-mono break-all">{bundle}</div>
												<p className={`mt-1 leading-relaxed ${appearanceDark ? "text-[#9d9d9d]" : "text-[#555]"}`}>
													Unless these paths are identical, file tools and agent scans use the workspace line above — not the app checkout. Opening a file tab does not change the server workspace.
												</p>
											</div>
										);
									})()}
								</div>
							)}

							<button
								type="button"
								className={`mb-2 flex w-full items-center gap-1 text-left text-sm font-medium ${muted} hover:underline`}
								onClick={() => setAdvancedOpen((v) => !v)}
							>
								{advancedOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
								Advanced (live snapshot &amp; workspace files)
							</button>

							{advancedOpen && data && (
								<div className="space-y-3 pb-2">
									<p className={`text-[11px] leading-relaxed ${muted}`}>
										<strong className={appearanceDark ? "text-[#cccccc]" : "text-[#222]"}>Live snapshot</strong> is
										read-only (merged server state). Use the tabs to edit real workspace files with{" "}
										<strong className={appearanceDark ? "text-[#cccccc]" : "text-[#222]"}>Save</strong> /{" "}
										<strong className={appearanceDark ? "text-[#cccccc]" : "text-[#222]"}>Revert</strong> like the main
										editor.
									</p>
									<div className={`flex flex-wrap gap-1.5 border-b pb-2 ${borderB}`}>
										{HOST_DOCTOR_ADVANCED_TABS.map((tab) => {
											const active = advancedTabKey === tab.key;
											return (
												<button
													key={tab.key}
													type="button"
													onClick={() => setAdvancedTabKey(tab.key)}
													className={`rounded px-2.5 py-1 text-left font-mono text-[10px] ${
														active
															? appearanceDark
																? "bg-[#0e639c] text-white"
																: "bg-[#007acc] text-white"
															: appearanceDark
																? "bg-[#3c3c3c] text-[#cccccc] hover:bg-[#4a4a4a]"
																: "bg-[#f0f0f0] text-[#333] hover:bg-[#e5e5e5]"
													}`}
												>
													{tab.label}
												</button>
											);
										})}
									</div>
									{advancedTabKey === "snapshot" ? (
										<div
											className={`flex min-h-0 max-h-[min(480px,55vh)] flex-col overflow-hidden rounded-lg border p-2 ${
												appearanceDark ? "border-[#3c3c3c] bg-[#252526]" : "border-[#e5e5e5] bg-[#fafafa]"
											}`}
										>
											<WorkspaceTextBuffer
												path="host-doctor-live-snapshot.json"
												content={JSON.stringify(data, null, 2)}
												onChange={hostDoctorReadonlySnapshotNoop}
												loading={false}
												error={null}
												readOnly
												wordWrap
												scrollClassName={
													appearanceDark
														? `${WOP_WORKSPACE_EDITOR_SCROLL_DARK} px-2 py-2`
														: `${WOP_WORKSPACE_EDITOR_SCROLL_LIGHT} px-2 py-2`
												}
												lineGutterClassName={
													appearanceDark
														? WOP_WORKSPACE_EDITOR_GUTTER_DARK
														: WOP_WORKSPACE_EDITOR_GUTTER_LIGHT
												}
												textareaClassName={
													appearanceDark
														? WOP_WORKSPACE_EDITOR_TEXTAREA_DARK
														: WOP_WORKSPACE_EDITOR_TEXTAREA_LIGHT
												}
												findBarClassName={WOP_WORKSPACE_EDITOR_FIND_BAR_INACTIVE}
												statusLoadingClassName="p-4 text-sm text-[#858585]"
												statusErrorClassName="p-4 text-sm text-red-500"
											/>
										</div>
									) : (
										(() => {
											const p = HOST_DOCTOR_ADVANCED_TABS.find((t) => t.key === advancedTabKey)?.path;
											if (!p) return null;
											return (
												<HostDoctorWorkspaceFileEditor
													key={p}
													path={p}
													appearanceDark={appearanceDark}
													onSaveSuccess={() => void onWorkspaceSaved()}
												/>
											);
										})()
									)}
								</div>
							)}

							{data?.note && !advancedOpen ? <p className={`text-xs leading-relaxed ${muted}`}>{data.note}</p> : null}
						</>
					)}
				</div>
			</div>
		</div>
	);
}
