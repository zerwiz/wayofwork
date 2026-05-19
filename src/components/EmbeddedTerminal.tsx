import { useEffect, useRef } from "react";
import { useServerConfig } from "../hooks/useServerConfig";
import { useTerminalUiPreferences } from "../hooks/useTerminalUiPreferences";
import { TERMINAL_UI_DEFAULT_FONT } from "../utils/terminalUiPreferences";
import { attachTerminal, detachTerminal, ensureConnection } from "../utils/terminalConnectionManager";
import "@xterm/xterm/css/xterm.css";

export function EmbeddedTerminal() {
	const containerRef = useRef<HTMLDivElement>(null);
	const { config } = useServerConfig();
	const enabled = config?.terminalEnabled === true;
	const { prefs } = useTerminalUiPreferences();
	const fontFamily = prefs.fontFamily.trim() || TERMINAL_UI_DEFAULT_FONT;

	useEffect(() => {
		if (!enabled) return;
		const el = containerRef.current;
		if (!el) return;

		ensureConnection(prefs.fontSize, fontFamily);
		attachTerminal(el);

		return () => {
			detachTerminal();
		};
	}, [enabled, prefs.fontSize, fontFamily]);

	if (config === null) {
		return <div className="p-4 font-mono text-[12px] text-[#858585]">Loading server config…</div>;
	}

	if (!enabled) {
		return (
			<div className="space-y-2 p-4 font-mono text-[12px] leading-relaxed">
				<p className="text-[#ce9178]">Interactive terminal is off on the server.</p>
				<p className="text-[#858585]">
					For a real shell (cwd = workspace), set{" "}
					<code className="rounded bg-[#2d2d2d] px-1.5 py-0.5 text-[#dcdcaa]">WOP_ALLOW_TERMINAL=1</code> on
					the Way of Pi UI server, restart it, then reload. Development normally enables this by default when
					unset; if you disabled it with{" "}
					<code className="rounded bg-[#2d2d2d] px-1.5 py-0.5 text-[#dcdcaa]">WOP_ALLOW_TERMINAL=0</code>,
					remove that or set to{" "}
					<code className="rounded bg-[#2d2d2d] px-1.5 py-0.5 text-[#dcdcaa]">1</code>. Trusted machines only.
				</p>
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className="h-full min-h-[160px] w-full flex-1 overflow-hidden p-1"
		/>
	);
}
