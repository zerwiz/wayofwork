import { useState } from "react";
import { apiPostJson } from "../../api/client";
import type { ServerConfig } from "../../hooks/useServerConfig";
import { useTerminalUiPreferences } from "../../hooks/useTerminalUiPreferences";
import { TERMINAL_UI_DEFAULT_FONT } from "../../utils/terminalUiPreferences";

/** Shared terminal setup: server status (from `/api/config`) + client xterm prefs (localStorage). */
export function TerminalSettingsSection({
	config,
	appearanceDark,
	compact,
	onConfigRefresh,
}: {
	config: ServerConfig | null;
	/** Simple UI light vs dark chrome. */
	appearanceDark?: boolean;
	/** Technical settings sidebar: tighter typography. */
	compact?: boolean;
	/** Called after toggling terminal so the parent can refresh /api/config. */
	onConfigRefresh?: () => void | Promise<void>;
}) {
	const { prefs, setPrefs, reset } = useTerminalUiPreferences();
	const [toggling, setToggling] = useState(false);
	const [toggleMsg, setToggleMsg] = useState<{ text: string; ok: boolean } | null>(null);
	const dark = appearanceDark !== false;
	const label = compact
		? "mb-1.5 text-[10px] font-bold uppercase text-[#858585]"
		: "mb-2 text-[11px] font-bold uppercase text-[#858585]";
	const box = compact
		? "mb-3 rounded border border-[#3c3c3c] bg-[#1e1e1e] p-2.5 text-[11px] leading-snug text-[#cccccc]"
		: dark
			? "mb-4 rounded-xl border border-[#3c3c3c] bg-[#1e1e1e] p-4 text-[13px] leading-relaxed text-[#cccccc]"
			: "mb-4 rounded-xl border border-[#e5e5e5] bg-white p-4 text-[13px] leading-relaxed text-[#333333]";
	const muted = dark ? "text-[#858585]" : "text-[#616161]";
	const code = dark
		? "rounded bg-[#2d2d2d] px-1 py-0.5 font-mono text-[11px] text-[#dcdcaa]"
		: "rounded bg-[#f3f3f3] px-1 py-0.5 font-mono text-[11px] text-[#7c3aed]";
	const input = dark
		? "w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] px-2 py-1.5 font-mono text-[12px] text-[#cccccc] outline-none focus:border-[#0e639c]"
		: "w-full rounded border border-[#d4d4d4] bg-white px-2 py-1.5 font-mono text-[12px] text-[#333333] outline-none focus:border-[#007acc]";
	const btn =
		dark && !compact
			? "rounded border border-[#3c3c3c] bg-[#3c3c3c] px-3 py-1.5 text-[12px] text-[#cccccc] hover:bg-[#4a4a4a]"
			: !dark && !compact
				? "rounded border border-[#d4d4d4] bg-[#f3f3f3] px-3 py-1.5 text-[12px] text-[#333333] hover:bg-[#e5e5e5]"
				: "rounded border border-[#3c3c3c] px-2 py-1 text-[10px] text-[#cccccc] hover:bg-[#3c3c3c]";

	const shellExe = config?.shellExecutable ?? "—";
	const shellArgs = config?.shellArgs?.length ? config.shellArgs.join(" ") : "";
	const enabled = config?.terminalEnabled === true;
	const custom = Boolean(config?.customShell);

	return (
		<>
			<div className={label}>Integrated terminal</div>
			<div className={box}>
				<p className={compact ? `mb-2 ${muted}` : `mb-3 ${muted}`}>
					The panel uses WebSocket <code className={code}>/ws/terminal</code>. The shell runs on the{" "}
					<strong className={dark ? "text-[#d4d4d4]" : "text-[#111]"}>Bun server host</strong>, cwd = workspace
					root. Enable or change the shell with environment variables on that process, then restart the server.
				</p>
				{config ? (
					<ul className={`list-none space-y-1.5 p-0 font-mono ${compact ? "text-[10px]" : "text-[11px]"}`}>
						<li>
							<span className={muted}>Status: </span>
							<span className={enabled ? "text-[#89d185]" : "text-[#ce9178]"}>
								{enabled ? "Enabled" : "Disabled"}
							</span>
						</li>
						<li className="break-all">
							<span className={muted}>Shell: </span>
							<span className="text-[#9cdcfe]">{shellExe}</span>
							{shellArgs ? <span className="text-[#858585]"> {shellArgs}</span> : null}
							{custom ? (
								<span className={`ml-1 ${muted}`}>(<code className={code}>WOP_SHELL</code>)</span>
							) : (
								<span className={`ml-1 ${muted}`}>(default)</span>
							)}
						</li>
						{config.platform || config.arch ? (
							<li>
								<span className={muted}>Server host: </span>
								<span className="text-[#cccccc]">
									{config.platform ?? "—"}
									{config.arch ? (
										<span className="text-[#858585]">{` · ${config.arch}`}</span>
									) : null}
								</span>
							</li>
						) : null}
					</ul>
				) : (
					<p className={muted}>Loading server config…</p>
				)}
			{/* Toggle button — works for everyone, no file editing needed */}
			<div className={`mt-3 rounded-lg border p-3 ${dark ? "border-[#3c3c3c] bg-[#252526]" : "border-[#e5e5e5] bg-[#f8f8f8]"}`}>
				<p className={`mb-2 text-[12px] font-semibold ${dark ? "text-[#d4d4d4]" : "text-[#333]"}`}>
					{enabled ? "Terminal is ON" : "Terminal is OFF"}
				</p>
				<p className={`mb-3 ${compact ? "text-[10px]" : "text-[12px]"} leading-snug ${muted}`}>
					{enabled
						? "The integrated terminal is active. Anyone who can reach this server can run shell commands in your workspace — only use on trusted networks."
						: "Enable the integrated terminal to get a real shell inside your workspace. Only enable this if you trust the network you're on."}
				</p>
				<button
					type="button"
					disabled={toggling || !config}
					onClick={() => {
						setToggling(true);
						setToggleMsg(null);
						void (async () => {
							try {
								const r = await apiPostJson<{ ok: boolean; enabled: boolean; persisted: boolean }>(
									"/api/terminal/set-enabled",
									{ enabled: !enabled },
								);
								if (r.ok) {
									setToggleMsg({
										text: r.enabled
											? `Terminal enabled${r.persisted ? " and saved to .env" : " (this session only — .env write failed)"}.`
											: `Terminal disabled${r.persisted ? " and saved to .env" : " (this session only — .env write failed)"}.`,
										ok: true,
									});
									await onConfigRefresh?.();
								} else {
									setToggleMsg({ text: "Toggle failed — see server logs.", ok: false });
								}
							} catch (e) {
								setToggleMsg({ text: e instanceof Error ? e.message : String(e), ok: false });
							} finally {
								setToggling(false);
							}
						})();
					}}
					className={`rounded-lg px-4 py-2 text-sm font-bold text-white transition-colors disabled:opacity-50 ${
						enabled
							? "bg-red-600 hover:bg-red-700"
							: "bg-emerald-600 hover:bg-emerald-700"
					}`}
				>
					{toggling ? "Applying…" : enabled ? "Disable terminal" : "Enable terminal"}
				</button>
				{toggleMsg ? (
					<p className={`mt-2 text-[12px] ${toggleMsg.ok ? "text-emerald-400" : "text-red-400"}`}>
						{toggleMsg.text}
					</p>
				) : null}
			</div>
		</div>

			<div className={label}>Terminal appearance (this browser)</div>
			<div className={box}>
				<div className={compact ? "space-y-2" : "space-y-3"}>
					<div>
						<label className={`mb-1 block ${muted} ${compact ? "text-[10px]" : "text-[12px]"}`}>Font size (px)</label>
						<input
							type="number"
							min={8}
							max={36}
							value={prefs.fontSize}
							onChange={(e) => {
								const n = Number(e.target.value);
								setPrefs({ fontSize: Number.isFinite(n) ? n : prefs.fontSize });
							}}
							className={input}
						/>
					</div>
					<div>
						<label className={`mb-1 block ${muted} ${compact ? "text-[10px]" : "text-[12px]"}`}>
							Font family (CSS)
						</label>
						<input
							type="text"
							value={prefs.fontFamily}
							onChange={(e) => setPrefs({ fontFamily: e.target.value })}
							placeholder={TERMINAL_UI_DEFAULT_FONT}
							className={input}
							spellCheck={false}
						/>
						<p className={`mt-1 ${compact ? "text-[9px]" : "text-[11px]"} ${muted}`}>
							Leave empty for the default stack ({TERMINAL_UI_DEFAULT_FONT}).
						</p>
					</div>
					<button type="button" onClick={reset} className={btn}>
						Reset appearance to defaults
					</button>
				</div>
			</div>
		</>
	);
}
