import { useEffect, useRef, useState } from "react";
import type { AgentMeta } from "../hooks/useAgents";
import type { ChatPulseMeters } from "../hooks/useWayOfPiSession";
import { workspaceAgentDisplayName } from "../utils/workspaceAgentDisplay";

function fmtTok(n: number): string {
	if (n < 1000) return `${n}`;
	return `${(n / 1000).toFixed(1)}k`;
}

export type PulseMemberStatus = "idle" | "running" | "done" | "error";

export type AgentTeamPulseMember = {
	/** Agent `name` from frontmatter (roster key). */
	name: string;
	status: PulseMemberStatus;
	elapsedMs?: number;
	contextPct: number;
	tokensIn: number;
	tokensOut: number;
	/** Shown as `⎆ …` when set. */
	resolvedModel?: string;
	lastTool?: string;
	lastThinking?: string;
	task?: string;
	lastWork?: string;
	description: string;
};

function contextBarBlocks(pct: number): string {
	const filled = Math.ceil(Math.max(0, Math.min(100, pct)) / 20);
	return `${"#".repeat(filled)}${"-".repeat(5 - filled)}`;
}

function wrapWords(s: string, lineWidth: number, maxLines: number): string[] {
	const words = s.replace(/\s+/g, " ").trim().split(" ");
	const lines: string[] = [];
	let cur = "";
	for (const word of words) {
		if (!word) continue;
		if (lines.length >= maxLines) break;
		const next = cur ? `${cur} ${word}` : word;
		if (next.length <= lineWidth) {
			cur = next;
			continue;
		}
		if (cur) {
			lines.push(cur);
			cur = "";
			if (lines.length >= maxLines) break;
		}
		if (word.length <= lineWidth) cur = word;
		else lines.push(word.slice(0, lineWidth));
	}
	if (cur && lines.length < maxLines) lines.push(cur);
	return lines.length ? lines.slice(0, maxLines) : [""];
}

function rosterGridCols(memberCount: number): number {
	if (memberCount <= 0) return 1;
	if (memberCount <= 3) return memberCount;
	if (memberCount === 4) return 2;
	return 3;
}

function PulseCard({
	member,
	streamDetail,
}: {
	member: AgentTeamPulseMember;
	streamDetail: boolean;
}) {
	const w = member;
	const statusColor =
		w.status === "idle"
			? "text-[#858585]"
			: w.status === "running"
				? "text-[#fb923c]"
				: w.status === "done"
					? "text-[#4ade80]"
					: "text-[#f87171]";
	const statusIcon =
		w.status === "idle" ? "○" : w.status === "running" ? "●" : w.status === "done" ? "✓" : "✗";
	const timeStr =
		w.status !== "idle" && w.elapsedMs != null ? ` ${Math.round(w.elapsedMs / 1000)}s` : "";
	const tokStr =
		w.status === "running"
			? w.tokensIn + w.tokensOut > 0
				? `↓${fmtTok(w.tokensIn)} ↑${fmtTok(w.tokensOut)} …`
				: "tok …"
			: w.tokensIn + w.tokensOut > 0
				? `↓${fmtTok(w.tokensIn)} ↑${fmtTok(w.tokensOut)}`
				: "tok —";
	const workRaw = w.task ? (w.lastWork || w.task) : w.description;
	const maxWorkLines = streamDetail ? 3 : 2;
	const workDisplay = wrapWords(workRaw || "", 42, maxWorkLines);

	return (
		<div className="flex h-full min-h-0 min-w-0 flex-col rounded-none border border-[#555555] bg-[#1e1e1e] font-mono text-[11px] leading-snug">
			<div className="shrink-0 space-y-0 border-b border-[#3c3c3c] px-2 py-1.5">
				<div className="truncate font-bold text-[#fb923c]">{workspaceAgentDisplayName(w.name)}</div>
				<div className="truncate text-[#858585]">⎆ {w.resolvedModel?.trim() || "—"}</div>
				<div className={`truncate ${statusColor}`}>
					{statusIcon} {w.status}
					{timeStr}
				</div>
				<div className="truncate text-[#858585]">
					[{contextBarBlocks(w.contextPct)}] {Math.ceil(w.contextPct)}%
				</div>
				<div className="truncate text-[#858585]">{tokStr}</div>
				{streamDetail ? (
					<>
						<div className={w.lastTool ? "truncate text-[#fb923c]" : "truncate text-[#858585]"}>
							{w.lastTool ? `⚙ ${w.lastTool}` : "—"}
						</div>
						<div className={w.lastThinking ? "truncate text-[#a3a3a3]" : "truncate text-[#858585]"}>
							{w.lastThinking ? `τ ${w.lastThinking}` : "—"}
						</div>
					</>
				) : null}
			</div>
			<div className="flex min-h-[2.75rem] flex-1 flex-col justify-start px-2 py-1.5 text-[#a3a3a3]">
				{workDisplay.map((line, i) => (
					<div key={i} className="break-words">
						{line || "\u00a0"}
					</div>
				))}
			</div>
		</div>
	);
}

/** `toolbar` / `roster` let **ChatPanel** pin controls under the tab bar and cards above the composer. */
export function AgentTeamPulseGrid({
	activeTeamName,
	members,
	streamDetail,
	onStreamDetailChange,
	showSessionHint = true,
	section = "full",
	sessionTokenSummary,
}: {
	activeTeamName: string;
	members: AgentTeamPulseMember[];
	streamDetail: boolean;
	onStreamDetailChange?: (next: boolean) => void;
	/** When false (workspace pane), omit the note about session chat / WebSocket plan. */
	showSessionHint?: boolean;
	section?: "full" | "toolbar" | "roster";
	/** Pi-style session cumulative (status bar parity) — shown in the team toolbar. */
	sessionTokenSummary?: { tokensDown: string; tokensUp: string; tokensTitle?: string } | null;
}) {
	const cols = Math.min(rosterGridCols(members.length), Math.max(1, members.length));

	const toolbar = (
		<div className={`flex min-h-0 flex-col gap-1 font-mono text-[11px] ${section === "toolbar" ? "pb-0" : "pb-2"}`}>
			<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
				<span className="pl-0.5 font-bold text-[#fb923c]">◆ {activeTeamName}</span>
				{onStreamDetailChange ? (
					<button
						type="button"
						onClick={() => onStreamDetailChange(!streamDetail)}
						className="ml-auto shrink-0 rounded-none border border-[#3c3c3c] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[#cccccc] hover:bg-[#3c3c3c]"
						title="Pi: /agents-stream [on|off|toggle] — extra card lines (⚙ tool, τ thinking); Ctrl+Shift+V"
					>
						stream {streamDetail ? "on" : "off"}
					</button>
				) : null}
			</div>
			{sessionTokenSummary &&
			(sessionTokenSummary.tokensDown !== "—" || sessionTokenSummary.tokensUp !== "—") ? (
				<div
					className="pl-0.5 text-[10px] leading-tight text-[#6b6b6b]"
					title={sessionTokenSummary.tokensTitle ?? "Session cumulative tokens (prompt ↓ / completion ↑)"}
				>
					Session{" "}
					<span className="text-[#a3a3a3]">
						{sessionTokenSummary.tokensDown} ↓ / {sessionTokenSummary.tokensUp} ↑
					</span>
				</div>
			) : null}
			{section !== "toolbar" ? (
				<div className="h-px w-full shrink-0 bg-[#505050]" aria-hidden />
			) : null}
		</div>
	);

	const rosterGrid = (
		<div
			className="grid items-stretch gap-1"
			style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
		>
			{members.map((m) => (
				<PulseCard key={m.name} member={m} streamDetail={streamDetail} />
			))}
		</div>
	);

	const hint = showSessionHint ? (
		<p className="font-mono text-[10px] leading-relaxed text-[#6b6b6b]">
			Session persona shows <strong className="text-[#858585]">running</strong> / <strong className="text-[#858585]">done</strong>{" "}
			from chat streaming, <code className="text-[#858585]">chat_usage</code> (including live SSE <code className="text-[#858585]">streamPeek</code>
			). Per-subagent tools, thinking lines, and
			separate Pi subprocess pulses remain on the multi-agent WebSocket plan (
			<code className="text-[#858585]">docs/WOP_MULTI_AGENT_WEBSOCKET.md</code>).
		</p>
	) : (
		<p className="font-mono text-[10px] leading-relaxed text-[#6b6b6b]">
			Mirrors the Pi <code className="text-[#858585]">agent-team</code> footer widget layout ({" "}
			<code className="text-[#858585]">/agents-team</code>, <code className="text-[#858585]">/agents-grid N</code>
			). <strong className="text-[#858585]">Pane team</strong> opens the roster in the agent panel beside the editor. Use
			workspace <strong className="text-[#858585]">+ → Team pulse</strong> for the full tab with roster agent transcript.
		</p>
	);

	if (section === "toolbar") {
		return <div className="flex min-h-0 flex-col gap-2">{toolbar}</div>;
	}
	if (section === "roster") {
		return (
			<div className="flex min-h-0 flex-col gap-3">
				{sessionTokenSummary &&
				(sessionTokenSummary.tokensDown !== "—" || sessionTokenSummary.tokensUp !== "—") ? (
					<div
						className="font-mono text-[10px] leading-tight text-[#6b6b6b]"
						title={sessionTokenSummary.tokensTitle ?? "Session cumulative tokens"}
					>
						Session{" "}
						<span className="text-[#a3a3a3]">
							{sessionTokenSummary.tokensDown} ↓ / {sessionTokenSummary.tokensUp} ↑
						</span>
					</div>
				) : null}
				{rosterGrid}
				{hint}
			</div>
		);
	}

	return (
		<div className="flex min-h-0 flex-col gap-3">
			{toolbar}
			{rosterGrid}
			{hint}
		</div>
	);
}

export function buildPulseMembersFromRoster(
	roster: string[],
	agentList: AgentMeta[],
): AgentTeamPulseMember[] {
	const byLower = new Map(agentList.map((a) => [a.name.toLowerCase(), a]));
	return roster.map((name) => {
		const def = byLower.get(name.trim().toLowerCase());
		return {
			name: def?.name ?? name,
			status: "idle",
			contextPct: 0,
			tokensIn: 0,
			tokensOut: 0,
			description: def?.description?.trim() || "(no matching agent .md in workspace scan)",
		};
	});
}

/** After a turn finishes, briefly flash **done** on the roster card for `chatAgentName` (Pi-style feedback). */
export function useAgentPulseDoneFlash(
	streaming: boolean,
	chatAgentName: string | null | undefined,
): string | null {
	const [flashAgentLower, setFlashAgentLower] = useState<string | null>(null);
	const prevStreaming = useRef(streaming);
	useEffect(() => {
		const wasStreaming = prevStreaming.current;
		prevStreaming.current = streaming;
		if (wasStreaming && !streaming) {
			const k = chatAgentName?.trim().toLowerCase() ?? "";
			if (!k) return;
			setFlashAgentLower(k);
			const t = window.setTimeout(() => setFlashAgentLower(null), 4200);
			return () => window.clearTimeout(t);
		}
	}, [streaming, chatAgentName]);
	return flashAgentLower;
}

/** Drive the roster card for the active session persona from WebSocket streaming + usage (until real multi-agent events exist). */
export function overlayPulseMembersWithActiveChat(
	members: AgentTeamPulseMember[],
	opts: {
		activeAgentName: string | null | undefined;
		streaming: boolean;
		doneFlashAgentLower: string | null;
		lastUserTask?: string | null;
		meters: ChatPulseMeters | null;
	},
): AgentTeamPulseMember[] {
	const active = opts.activeAgentName?.trim().toLowerCase() || "";
	const doneK = opts.doneFlashAgentLower;
	const task = (opts.lastUserTask ?? "").replace(/\s+/g, " ").trim().slice(0, 140) || undefined;
	const m = opts.meters;

	return members.map((mem) => {
		const key = mem.name.trim().toLowerCase();
		if (active && key === active && opts.streaming) {
			const ctx = m?.contextFillPct != null ? Math.round(m.contextFillPct) : mem.contextPct;
			const hasPeek =
				m != null &&
				((m.peekPrompt != null && m.peekPrompt > 0) || (m.peekCompletion != null && m.peekCompletion > 0));
			const tin = hasPeek ? (m!.peekPrompt ?? 0) : (m?.cumPrompt ?? 0);
			const tout = hasPeek ? (m!.peekCompletion ?? 0) : (m?.cumCompletion ?? 0);
			return {
				...mem,
				status: "running",
				contextPct: ctx,
				tokensIn: tin,
				tokensOut: tout,
				task: task ?? mem.task,
			};
		}
		if (doneK && key === doneK && !opts.streaming) {
			const ctx = m?.contextFillPct != null ? Math.round(m.contextFillPct) : mem.contextPct;
			return {
				...mem,
				status: "done",
				contextPct: ctx,
				tokensIn: m?.cumPrompt ?? mem.tokensIn,
				tokensOut: m?.cumCompletion ?? mem.tokensOut,
			};
		}
		return mem;
	});
}
