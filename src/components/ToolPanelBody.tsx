import { useLayoutEffect, useMemo, useRef } from "react";
import type { LogRow } from "../hooks/useWayOfPiSession";
import type { BottomPanelTab } from "../types/technicalShell";
import {
	isOutputPanelLog,
	isToolLogPanelLog,
	KNOWN_STATIC_TOOL_TRACE_SOURCES,
} from "../../shared/session-log-metadata";
import { EmbeddedTerminal } from "./EmbeddedTerminal";
import { ProblemsPanelBody } from "./ProblemsPanelBody";

const STICK_BOTTOM_PX = 56;

const TOOL_LOG_STATIC_SOURCES_DISPLAY = (
	<span className="text-[#c586c0]">{KNOWN_STATIC_TOOL_TRACE_SOURCES.join(" · ")}</span>
);

type ToolLogScrollVariant = "tool_log" | "output" | "agent_log";

function ToolLogScrollBody({ logs, variant = "tool_log" }: { logs: LogRow[]; variant?: ToolLogScrollVariant }) {
	const scrollerRef = useRef<HTMLDivElement>(null);
	const stickBottomRef = useRef(true);

	useLayoutEffect(() => {
		const el = scrollerRef.current;
		if (!el || !stickBottomRef.current) return;
		el.scrollTop = el.scrollHeight;
	}, [logs]);

	const onScroll = () => {
		const el = scrollerRef.current;
		if (!el) return;
		const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
		stickBottomRef.current = dist < STICK_BOTTOM_PX;
	};

	const empty =
		variant === "output" ? (
			<span className="block min-w-0 max-w-full break-words text-[#858585]">
				No output lines yet. This tab shows connection, session, workspace navigation, indexing, diagnostics, and chat
				errors — not per-tool traces (see <span className="text-[#c586c0]">Tool log</span>).
			</span>
		) : variant === "agent_log" ? (
			<span className="block min-w-0 max-w-full break-words text-[#858585]">
				No log lines yet. <span className="text-[#cccccc]">Agent log</span> merges everything the server streams for this
				connection — same rows as <span className="text-[#c586c0]">Output</span> plus <span className="text-[#c586c0]">Tool log</span>{" "}
				— in one timeline (chat / orchestrator steps next to <span className="text-[#c586c0]">git_push</span>, reads, …).
			</span>
		) : (
			<span className="block min-w-0 max-w-full break-words text-[#858585]">
				No tool traces yet. Tracked static <span className="text-[#cccccc]">source</span> ids: {TOOL_LOG_STATIC_SOURCES_DISPLAY}. Pi-style listing is{" "}
				<span className="text-[#c586c0]">list_dir</span>. Headless Pi JSON-mode logs each extension tool by name. Session and workspace status live under{" "}
				<span className="text-[#c586c0]">Output</span>.
			</span>
		);

	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden font-mono text-[12px] leading-snug">
			<div
				ref={scrollerRef}
				onScroll={onScroll}
				className={`min-h-0 min-w-0 flex-1 overflow-y-auto px-3 py-2 ${logs.length === 0 ? "overflow-x-hidden" : "overflow-x-auto"}`}
			>
				<div
					className={
						logs.length === 0
							? "flex w-full min-w-0 max-w-full flex-col gap-1.5"
							: "flex min-w-max flex-col gap-1.5"
					}
				>
					{logs.length === 0 ? (
						empty
					) : (
						logs.map((log, idx) => (
							<div key={`${log.time}-${idx}`} className="flex gap-4">
								<span className="w-24 shrink-0 text-[#858585]">[{log.time}]</span>
								<span
									className={`w-16 shrink-0 font-bold ${
									log.level?.toUpperCase() === "INFO"
										? "text-[#ea580c]"
										: log.level?.toUpperCase() === "WARN"
											? "text-[#ce9178]"
											: log.level?.toUpperCase() === "SUCCESS"
												? "text-[#89d185]"
												: "text-[#f14c4c]"
									}`}
								>
									{log.level}
								</span>
								<span className="w-28 shrink-0 text-[#c586c0]">{log.source}</span>
								<span className="text-[#cccccc]">{log.msg}</span>
							</div>
						))
					)}
				</div>
			</div>
		</div>
	);
}

/** Body for tool tabs inside `PanelDockBand` — Problems / Output / Tool log / Terminal. */
export function ToolPanelBody({ tab, logs }: { tab: BottomPanelTab; logs: LogRow[] }) {
	const outputLogs = useMemo(() => logs.filter(isOutputPanelLog), [logs]);
	const toolLogs = useMemo(() => logs.filter(isToolLogPanelLog), [logs]);

	if (tab === "tool_log") {
		return <ToolLogScrollBody logs={toolLogs} />;
	}
	if (tab === "agent_log") {
		return <ToolLogScrollBody logs={logs} variant="agent_log" />;
	}
	if (tab === "output") {
		return <ToolLogScrollBody logs={outputLogs} variant="output" />;
	}
	if (tab === "problems") {
		return <ProblemsPanelBody />;
	}
	if (tab === "terminal") {
		return <EmbeddedTerminal />;
	}
	if (tab === "agent_team") {
		return (
			<div className="p-3 font-mono text-[12px] text-[#858585]">
				<strong className="text-[#cccccc]">Team pulse</strong> — full roster + session mirror as a workspace tab: editor{" "}
				<strong className="text-[#cccccc]">+</strong> → Team pulse. For a Cursor-style strip next to chat, use Session
				Chat <strong className="text-[#cccccc]">Pane team</strong> (agent dock).
			</div>
		);
	}
	if (tab === "agent_chat") {
		return (
			<div className="p-3 font-mono text-[12px] text-[#858585]">
				<strong className="text-[#cccccc]">Agent chat</strong> is available in the main workspace pane (toolbar message
				icon or **+** → Agent chat).
			</div>
		);
	}
	return (
		<div className="text-[#858585]">
			Host shell is not exposed here by design. Use approvals + Run (planned) for commands.
		</div>
	);
}
