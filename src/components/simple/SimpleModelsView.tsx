import { Activity, Brain, CheckCircle2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { ProviderConfigEditor } from "../ProviderConfigEditor";
import type { PiModelConfigPath } from "../../constants/piModelConfigPaths";
import type { ServerConfig } from "../../hooks/useServerConfig";
import { useLlmModels } from "../../hooks/useLlmModels";

function formatBytes(n: number | undefined): string {
	if (n == null || !Number.isFinite(n)) return "—";
	const u = ["B", "KB", "MB", "GB", "TB"];
	let v = n;
	let i = 0;
	while (v >= 1024 && i < u.length - 1) {
		v /= 1024;
		i++;
	}
	return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${u[i]}`;
}

/** Simple shell — **mostly wired**: LLM catalog + provider editor + session model; gaps tracked in `docs/WOP_*.md` if any. */
export function SimpleModelsView({
	config,
	workspaceRoot,
	appearanceDark,
	effectiveModel,
	onSelectModel,
	providerConfigInitialPath,
	providerConfigInitialNonce,
	onConsumeProviderConfigFocus,
}: {
	config: ServerConfig | null;
	/** Primary workspace absolute path (`WOP_WORKSPACE` / server jail); Pi JSON paths are under here. */
	workspaceRoot: string | null;
	appearanceDark: boolean;
	effectiveModel: string | null;
	onSelectModel: (modelId: string) => void;
	providerConfigInitialPath?: PiModelConfigPath | null;
	providerConfigInitialNonce?: number;
	onConsumeProviderConfigFocus?: () => void;
}) {
	const { data, loading, error, reload } = useLlmModels();
	const [openRouterDraft, setOpenRouterDraft] = useState("");
	const [section, setSection] = useState<"session" | "providers">("session");

	useEffect(() => {
		if (providerConfigInitialPath) setSection("providers");
	}, [providerConfigInitialPath, providerConfigInitialNonce]);

	const providerKey = (config?.provider || data?.provider || "ollama").toLowerCase();
	const unsupported = data?.unsupportedProvider === true;
	const ollamaHost = config?.ollamaHost ?? data?.ollamaHost ?? "—";
	const envDefault =
		providerKey === "openrouter"
			? (config?.openrouterModel ?? data?.envDefaultOpenrouter)
			: (config?.ollamaModel ?? data?.envDefaultOllama);

	useEffect(() => {
		if (providerKey !== "openrouter" || unsupported) return;
		setOpenRouterDraft((prev) => {
			const seed = (effectiveModel ?? envDefault ?? "").trim();
			if (prev.trim() !== "" || !seed) return prev;
			return seed;
		});
	}, [providerKey, unsupported, effectiveModel, envDefault]);

	const pageBg = appearanceDark ? "" : "bg-[#f3f3f3]";
	const heading = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";
	const sub = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const table = appearanceDark
		? "border-[#3c3c3c] bg-[#252526]"
		: "border-[#e5e5e5] bg-white shadow-sm";
	const thead = appearanceDark
		? "border-[#3c3c3c] bg-[#1e1e1e]/80 text-[#858585]"
		: "border-[#e5e5e5] bg-[#ececec] text-[#616161]";
	const rowBorder = appearanceDark
		? "border-[#3c3c3c]/50 hover:bg-[#3c3c3c]/50"
		: "border-[#e5e5e5] hover:bg-[#f3f3f3]";
	const nameC = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";
	const mono = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const prov = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const brain = appearanceDark ? "text-[#858585]" : "text-[#858585]";
	const btnBase =
		appearanceDark
			? "rounded border border-[#3c3c3c] bg-[#3c3c3c] px-2 py-1 text-xs font-semibold text-[#cccccc] hover:bg-[#4a4a4a]"
			: "rounded border border-[#d4d4d4] bg-white px-2 py-1 text-xs font-semibold text-[#333333] hover:bg-[#e5e5e5]";
	const btnActive =
		appearanceDark
			? "rounded border border-green-700/60 bg-green-950/40 px-2 py-1 text-xs font-semibold text-green-400"
			: "rounded border border-green-300 bg-green-50 px-2 py-1 text-xs font-semibold text-green-900";
	const tabBase =
		appearanceDark
			? "rounded-t-lg border border-b-0 border-[#3c3c3c] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#858585]"
			: "rounded-t-lg border border-b-0 border-[#e5e5e5] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#616161]";
	const tabOn =
		appearanceDark
			? "border-[#3c3c3c] bg-[#252526] text-[#cccccc]"
			: "border-[#d4d4d4] bg-white text-[#333333]";

	const rows: Array<{
		key: string;
		displayName: string;
		fullId: string;
		providerLabel: string;
		type: "local" | "cloud";
		sizeLabel?: string;
	}> = [];

	if (!unsupported && providerKey === "openrouter") {
		const cur = effectiveModel ?? envDefault ?? "—";
		rows.push({
			key: `or-${cur}`,
			displayName: cur,
			fullId: `openrouter/${cur}`,
			providerLabel: "OpenRouter (api.openrouter.ai)",
			type: "cloud",
		});
	} else if (!unsupported) {
		const seen = new Set<string>();
		for (const m of data?.models ?? []) {
			if (!m.name || seen.has(m.name)) continue;
			seen.add(m.name);
			rows.push({
				key: m.name,
				displayName: m.name,
				fullId: `ollama/${m.name}`,
				providerLabel: `Ollama (${ollamaHost})`,
				type: "local",
				sizeLabel: formatBytes(m.size),
			});
		}
		const def = envDefault;
		if (def && !seen.has(def)) {
			rows.unshift({
				key: `env-${def}`,
				displayName: def,
				fullId: `ollama/${def}`,
				providerLabel: `Ollama (${ollamaHost})`,
				type: "local",
				sizeLabel: "env default",
			});
		}
	}

	const activeId = effectiveModel ?? envDefault ?? null;

	return (
		<div className={`flex-1 overflow-y-auto p-8 ${pageBg}`}>
			<div className="mx-auto max-w-5xl">
			<div className="mb-2 flex flex-wrap items-center justify-between gap-3">
				<h1 className={`text-2xl font-extrabold ${heading}`}>AI Brains</h1>
				<button
					type="button"
					onClick={() => void reload()}
					disabled={loading}
					className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${
						appearanceDark
							? "border-[#3c3c3c] text-[#cccccc] hover:bg-[#3c3c3c] disabled:opacity-50"
							: "border-[#d4d4d4] text-[#616161] hover:bg-[#e5e5e5] disabled:opacity-50"
					}`}
				>
					<RefreshCw size={14} className={loading ? "animate-spin" : ""} />
					Refresh list
				</button>
			</div>

			{/* Plain-English explainer */}
			<p className={`mb-5 max-w-3xl text-sm leading-relaxed ${sub}`}>
				<strong className={heading}>AI Brains</strong> is where you choose <em>which AI model</em> powers your chat and agents.
				Think of it like picking an engine for a car — a bigger, smarter model gives better answers but may be slower,
				while a smaller model replies faster. The <strong className={heading}>Session model</strong> tab lets you pick the
				model for your current chat. The <strong className={heading}>Provider files</strong> tab is for advanced setup
				(connecting to Ollama on your computer, or OpenRouter in the cloud) — you can ignore that tab until you need it.
			</p>

			<div className="mb-4 flex flex-wrap gap-1">
					<button
						type="button"
						onClick={() => setSection("session")}
						className={`${tabBase} ${section === "session" ? tabOn : "border-transparent bg-transparent opacity-80 hover:opacity-100"}`}
					>
						Session model
					</button>
					<button
						type="button"
						onClick={() => setSection("providers")}
						className={`${tabBase} ${section === "providers" ? tabOn : "border-transparent bg-transparent opacity-80 hover:opacity-100"}`}
					>
						Provider files
					</button>
				</div>

				<div
					className={`mb-6 rounded-2xl border p-4 text-sm leading-relaxed shadow-sm ${appearanceDark ? "border-[#3c3c3c] bg-[#1e1e1e]" : "border-[#e5e5e5] bg-white"}`}
				>
					<p className={`mb-2 font-bold uppercase tracking-wide ${heading}`}>Where to edit what</p>
					<ul className={`list-none space-y-2.5 p-0 ${sub}`}>
						<li>
							<span className={`font-semibold ${heading}`}>1. Server env</span> (not in the file tree) —{" "}
							<span className="font-mono text-[11px]">WOP_LLM_PROVIDER</span>,{" "}
							<span className="font-mono text-[11px]">WOP_CHAT_ENGINE</span>,{" "}
							<span className="font-mono text-[11px]">OLLAMA_HOST</span> / <span className="font-mono text-[11px]">OLLAMA_MODEL</span>,{" "}
							<span className="font-mono text-[11px]">OPENROUTER_*</span>, … Full list:{" "}
							<span className="font-mono text-[11px]">apps/wayofwork-ui/.env.sample</span> in the Way of Pi repo. When you
							start from <span className="font-mono text-[11px]">./start-wayofwork-ui.sh</span> or{" "}
							<span className="font-mono text-[11px]">./start-wayofpi-electron.sh</span>, a <span className="font-mono text-[11px]">.env</span>{" "}
							at the <strong className={heading}>repository root</strong> (next to <span className="font-mono text-[11px]">apps/</span>) is
							sourced before Bun. Change env → restart the dev server.
						</li>
						<li>
							<span className={`font-semibold ${heading}`}>2. Pi workspace JSON</span> (this shell reads/writes via API) — paths are{" "}
							<strong className={heading}>relative to the workspace root</strong> shown in the title bar / explorer. On disk
							they are:
							<ul className={`mt-1.5 list-inside list-disc space-y-1 pl-0.5 font-mono text-[11px] ${mono}`}>
								<li>
									{workspaceRoot ? (
										<span className="break-all">{`${workspaceRoot.replace(/\/$/, "")}/agent/models.json`}</span>
									) : (
										<span>{`<workspace>/agent/models.json`}</span>
									)}{" "}
									<span className="font-sans text-[11px] font-normal">— provider catalog (Pi </span>
									<span className="font-mono text-[11px]">/models</span>
									<span className="font-sans text-[11px] font-normal">)</span>
								</li>
								<li>
									{workspaceRoot ? (
										<span className="break-all">{`${workspaceRoot.replace(/\/$/, "")}/pi.config.json`}</span>
									) : (
										<span>{`<workspace>/pi.config.json`}</span>
									)}{" "}
									<span className="font-sans text-[11px] font-normal">— flat model list</span>
								</li>
								<li>
									{workspaceRoot ? (
										<span className="break-all">{`${workspaceRoot.replace(/\/$/, "")}/agent/settings.json`}</span>
									) : (
										<span>{`<workspace>/agent/settings.json`}</span>
									)}{" "}
									<span className="font-sans text-[11px] font-normal">— defaults (incl. </span>
									<span className="font-mono text-[11px]">defaultModel</span>
									<span className="font-sans text-[11px] font-normal">)</span>
								</li>
							</ul>
							Edit them on the <strong className={heading}>Provider files</strong> tab here, or in Technical mode: menu model
							popover → workspace provider files, or Settings sidebar → workspace.
						</li>
						<li>
							<span className={`font-semibold ${heading}`}>3. This browser session model</span> — WebSocket{" "}
							<span className="font-mono text-[11px]">set_model</span>; persisted as{" "}
							<span className="font-mono text-[11px]">wayofpi.activeLlmModel</span> in{" "}
							<span className="font-mono text-[11px]">localStorage</span> for this origin (Session model tab / chat fix
							flow).
						</li>
					</ul>
					{workspaceRoot ? (
						<p className={`mt-2 border-t pt-2 text-xs ${mono}`}>
							Current <span className="font-mono">WOP_WORKSPACE</span> root:{" "}
							<span
								className={`break-all font-mono text-[11px] ${appearanceDark ? "text-[#9cdcfe]" : "text-[#007acc]"}`}
							>
								{workspaceRoot}
							</span>
						</p>
					) : (
						<p
							className={`mt-2 border-t pt-2 text-xs ${appearanceDark ? "text-amber-200/90" : "text-amber-800"}`}
						>
							No workspace folder open yet — open one from the menu so absolute paths resolve here.
						</p>
					)}
				</div>

				{section === "providers" ? (
					<div className="mb-6">
						<p className={`mb-2 text-xs font-medium leading-relaxed ${mono}`}>
							Disk locations for the three files are listed under <strong className={heading}>Where to edit what</strong>{" "}
							above (absolute paths when a workspace is open).
						</p>
						<p className={`mb-2 text-sm font-medium leading-relaxed ${sub}`}>
							Edit the same workspace JSON the Pi TUI uses for <span className="font-mono">/models</span> (provider
							blocks, routing, and flat entries in <span className="font-mono">pi.config.json</span>). Keep these files
							aligned with Pi whenever you use the TUI on this workspace.
						</p>
						<p className={`mb-2 text-sm font-medium leading-relaxed ${sub}`}>
							The Way of Pi server reads <strong className={heading}>host env</strong> —{" "}
							<span className="font-mono">WOP_LLM_PROVIDER</span>, <span className="font-mono">WOP_CHAT_ENGINE</span> (
							<span className="font-mono">auto</span> / <span className="font-mono">pi</span> for headless Pi, else Bun),{" "}
							<span className="font-mono">OLLAMA_*</span>, <span className="font-mono">OPENROUTER_*</span> — not values
							inside this JSON. Restart the Way of Pi process after changing env. Invalid JSON cannot be saved.
						</p>
						<p className={`mb-3 text-xs font-medium leading-relaxed ${mono}`}>
							<strong className={heading}>Session model</strong> (other tab) lists live Ollama tags from the daemon (or
							OpenRouter ids you type); it does <em>not</em> build rows from <span className="font-mono">agent/models.json</span>
							. <span className="font-mono">agent/settings.json</span> <span className="font-mono">defaultModel</span> /{" "}
							<span className="font-mono">defaultProvider</span> feed Pi and, for Bun, the default Ollama tag when{" "}
							<span className="font-mono">OLLAMA_MODEL</span> is unset.
						</p>
						<ProviderConfigEditor
							appearanceDark={appearanceDark}
							initialPath={providerConfigInitialPath ?? undefined}
							initialPathNonce={providerConfigInitialNonce ?? 0}
							onInitialPathConsumed={onConsumeProviderConfigFocus}
							onAfterSave={() => void reload()}
						/>
					</div>
				) : null}

				{section === "session" ? (
					<>
				<div
					className={`mb-6 space-y-3 rounded-2xl border p-4 text-sm leading-relaxed shadow-sm ${appearanceDark ? "border-[#3c3c3c] bg-[#252526]" : "border-[#e5e5e5] bg-white"}`}
				>
					<p className={`font-semibold ${heading}`}>
						Providers (Pi-style) —{" "}
						<span className="font-mono text-[13px] font-normal text-[#9cdcfe]">WOP_LLM_PROVIDER</span> on the
						server
					</p>
					<p className={sub}>
						Pi&apos;s TUI reads workspace JSON (models / routing) via{" "}
						<span className="font-mono text-xs">/models</span>. <strong className={heading}>Provider files</strong> edits
						the same files. The <strong className={heading}>running Way of Pi server</strong> still needs the right host
						env for how turns run (Bun vs headless Pi — see <span className="font-mono text-xs">WOP_CHAT_ENGINE</span> in{" "}
						<span className="font-mono text-xs">.env.sample</span>):
					</p>
					<ul className={`list-inside list-disc space-y-1.5 pl-0.5 ${sub}`}>
						<li>
							<span className="font-mono text-xs">ollama</span> — Local OpenAI-compatible API at{" "}
							<span className="font-mono text-xs">OLLAMA_HOST</span> (shown below); catalog from Ollama tags; session
							pick = model tag (e.g. <span className="font-mono text-xs">llama3</span>). Matches Pi using Ollama.
						</li>
						<li>
							<span className="font-mono text-xs">openrouter</span> — Cloud models at OpenRouter; host must set{" "}
							<span className="font-mono text-xs">OPENROUTER_API_KEY</span>; optional default{" "}
							<span className="font-mono text-xs">OPENROUTER_MODEL</span>. Session pick = OpenRouter model id (e.g.{" "}
							<span className="font-mono text-xs">anthropic/claude-3.5-sonnet</span>).
						</li>
					</ul>
					<p className={sub}>
						<strong className={heading}>This tab:</strong> choose the model id for <em>this browser session</em> — sent
						over the WebSocket (<span className="font-mono text-xs">set_model</span>) and remembered in{" "}
						<span className="font-mono text-xs">localStorage</span>. It does not switch{" "}
						<span className="font-mono text-xs">WOP_LLM_PROVIDER</span>; restart the server with different env to change
						Ollama vs OpenRouter.
					</p>
					<p className={sub}>
						If a chat turn fails, use <strong className={heading}>Fix model / provider</strong> in the chat panel (or the
						dialog that opens) for the same hints and quick links back here.
					</p>
					{config?.piDrivesChat ? (
						<p className={sub}>
							<strong className={heading}>Headless Pi is driving chat</strong> (<span className="font-mono text-xs">
								WOP_CHAT_ENGINE
							</span>{" "}
							<span className="font-mono text-xs">{config.chatEngine}</span>): inference and{" "}
							<span className="font-mono text-xs">/model</span> behavior follow Pi and workspace JSON like the TUI. Keep{" "}
							<span className="font-mono text-xs">agent/settings.json</span> in sync; the table below is still the
							convenient tag list for this machine.
						</p>
					) : (
						<p className={sub}>
							<strong className={heading}>Bun-backed chat</strong> (no live Pi JSON turn): the session model here and{" "}
							<span className="font-mono text-xs">WOP_LLM_PROVIDER</span> control the interim completion path (plus
							orchestrator tools when enabled on the server).
						</p>
					)}
					<p className={`border-t pt-3 text-xs ${mono}`}>
						<span className="mr-2 inline-block">
							<span className={`font-semibold ${heading}`}>Provider</span>{" "}
							<span className={`font-mono ${appearanceDark ? "text-[#9cdcfe]" : "text-[#007acc]"}`}>{providerKey}</span>
						</span>
						{config ? (
							<span className="mr-2 inline-block">
								<span className={`font-semibold ${heading}`}>· Chat engine</span>{" "}
								<span className={`font-mono ${appearanceDark ? "text-[#9cdcfe]" : "text-[#007acc]"}`}>
									{config.chatEngine}
								</span>
							</span>
						) : null}
						{unsupported ? (
							<span className="ml-2 text-red-400">— web chat supports only ollama or openrouter</span>
						) : providerKey === "openrouter" ? (
							<span className="ml-2">— use custom id field + table below</span>
						) : (
							<span className="ml-2">
								— <span className="font-mono">OLLAMA_HOST</span>={ollamaHost}
							</span>
						)}
					</p>
				</div>

				{unsupported ? (
					<div
						className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
							appearanceDark ? "border-red-900/60 bg-red-950/40 text-red-200" : "border-red-200 bg-red-50 text-red-900"
						}`}
					>
						<p className="font-bold">Unsupported provider for web chat</p>
						<p className={`mt-1 ${appearanceDark ? "text-red-100/90" : "text-red-900/90"}`}>
							Set <span className="font-mono">WOP_LLM_PROVIDER</span> to <span className="font-mono">ollama</span> or{" "}
							<span className="font-mono">openrouter</span> on the Way of Pi server host, then restart. You can still
							edit Pi provider JSON under <strong>Provider files</strong> for TUI / future wiring.
						</p>
						{data?.catalogNote ? (
							<p className={`mt-2 border-t border-red-500/20 pt-2 text-xs ${appearanceDark ? "text-red-200/80" : "text-red-900/80"}`}>
								{data.catalogNote}
							</p>
						) : null}
					</div>
				) : null}

				{providerKey === "openrouter" && !unsupported ? (
					<div
						className={`mb-6 rounded-2xl border p-4 ${appearanceDark ? "border-[#3c3c3c] bg-[#252526]" : "border-[#e5e5e5] bg-white shadow-sm"}`}
					>
						<div className={`mb-2 text-xs font-bold uppercase tracking-wider ${mono}`}>Custom model id</div>
						<div className="flex flex-wrap gap-2">
							<input
								type="text"
								value={openRouterDraft}
								onChange={(e) => setOpenRouterDraft(e.target.value)}
								placeholder={envDefault || "e.g. anthropic/claude-3.5-sonnet"}
								className={`min-w-[240px] flex-1 rounded border px-3 py-2 font-mono text-sm outline-none ${
									appearanceDark
										? "border-[#3c3c3c] bg-[#1e1e1e] text-[#cccccc] placeholder:text-[#858585] focus:border-[#ea580c]"
										: "border-[#d4d4d4] bg-white text-[#333333] placeholder:text-[#858585] focus:border-[#ea580c]"
								}`}
							/>
							<button
								type="button"
								className={btnBase}
								onClick={() => onSelectModel(openRouterDraft.trim() || (envDefault ?? ""))}
							>
								Use model
							</button>
						</div>
						{data?.catalogNote ? <p className={`mt-2 text-xs ${sub}`}>{data.catalogNote}</p> : null}
					</div>
				) : null}

				{error ? (
					<div
						className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
							appearanceDark ? "border-red-900/60 bg-red-950/40 text-red-200" : "border-red-200 bg-red-50 text-red-900"
						}`}
					>
						{error}
					</div>
				) : null}
				{data?.error && providerKey !== "openrouter" && !unsupported ? (
					<div
						className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
							appearanceDark ? "border-amber-900/50 bg-amber-950/30 text-amber-100" : "border-amber-200 bg-amber-50 text-amber-950"
						}`}
					>
						Could not reach Ollama tags API: {data.error}
					</div>
				) : null}

				<div className={`overflow-hidden rounded-2xl border shadow-sm ${table}`}>
					<div className={`grid grid-cols-12 gap-4 border-b p-4 text-xs font-bold uppercase tracking-wider ${thead}`}>
						<div className="col-span-4 sm:col-span-5">Model Name / ID</div>
						<div className="col-span-3">Provider</div>
						<div className="col-span-2">Type</div>
						<div className="col-span-3 text-right sm:col-span-2">Status</div>
					</div>
					<div className="flex flex-col">
						{loading && !rows.length ? (
							<div className={`p-6 text-sm ${sub}`}>Loading models…</div>
						) : null}
						{!loading && !rows.length && unsupported ? (
							<div className={`p-6 text-sm ${sub}`}>
								{data?.catalogNote ?? "Change WOP_LLM_PROVIDER on the server to ollama or openrouter to pick a session model here."}
							</div>
						) : null}
						{!loading && !rows.length && providerKey !== "openrouter" && !unsupported ? (
							<div className={`p-6 text-sm ${sub}`}>
								No models returned from Ollama. Pull a model on the host (e.g.{" "}
								<span className="font-mono">ollama pull llama3</span>) and refresh.
							</div>
						) : null}
						{rows.map((model) => {
							const isActive = activeId != null && model.displayName === activeId;
							return (
								<div
									key={model.key}
									className={`grid grid-cols-12 items-center gap-4 border-b p-4 transition-colors last:border-0 ${rowBorder}`}
								>
									<div className="col-span-4 flex flex-col sm:col-span-5">
										<span className={`font-bold ${nameC}`}>{model.displayName}</span>
										<span className={`mt-0.5 font-mono text-xs ${mono}`}>{model.fullId}</span>
										{model.sizeLabel && model.sizeLabel !== "env default" ? (
											<span className={`mt-0.5 font-mono text-[10px] ${mono}`}>{model.sizeLabel}</span>
										) : null}
									</div>
									<div className={`col-span-3 flex items-center gap-2 text-sm ${prov}`}>
										<Brain size={14} className={brain} /> {model.providerLabel}
									</div>
									<div className="col-span-2">
										<span
											className={`rounded px-2 py-1 text-xs font-medium ${
												model.type === "local"
													? appearanceDark
														? "bg-orange-500/10 text-orange-400"
														: "bg-orange-100 text-orange-800"
													: appearanceDark
														? "bg-[#ea580c]/10 text-[#fb923c]"
														: "bg-[#ea580c]/12 text-[#c2410c]"
											}`}
										>
											{model.type}
										</span>
									</div>
									<div className="col-span-3 flex flex-wrap items-center justify-end gap-2 text-right sm:col-span-2">
										{isActive ? (
											<span className={`inline-flex items-center gap-1 ${btnActive}`}>
												<CheckCircle2 size={14} /> Active
											</span>
										) : (
											<>
												<button type="button" className={btnBase} onClick={() => onSelectModel(model.displayName)}>
													Select
												</button>
												<span
													className={`inline-flex items-center gap-1 text-xs font-bold ${appearanceDark ? "text-[#858585]" : "text-[#616161]"}`}
												>
													<Activity size={12} /> {model.type === "cloud" ? "Connected" : "Ready"}
												</span>
											</>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</div>
					</>
				) : null}
			</div>
		</div>
	);
}
