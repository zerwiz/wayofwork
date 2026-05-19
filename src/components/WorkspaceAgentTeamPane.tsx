import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { AgentMeta } from "../hooks/useAgents";
import type { ChatPulseMeters, ChatRow } from "../hooks/useWayOfPiSession";
import { workspaceAgentDisplayName } from "../utils/workspaceAgentDisplay";
import {
	AgentTeamPulseGrid,
	buildPulseMembersFromRoster,
	overlayPulseMembersWithActiveChat,
	useAgentPulseDoneFlash,
} from "./AgentTeamPulseGrid";

/** Agent roster in a **workspace** column tab — Pi-style: full session transcript above, roster grid at the bottom. */
export function WorkspaceAgentTeamPane({
	agentTeams,
	agents,
	agentsLoading,
	teamSessionTranscript = [],
	streaming = false,
	chatAgentName = null,
	dispatchTurnAgent: _dispatchTurnAgent = null,
	chatPulseMeters = null,
	sessionTokenSummary = null,
	onEditTeam,
}: {
	agentTeams: Record<string, string[]>;
	agents: AgentMeta[];
	agentsLoading?: boolean;
	/** Active Session Chat tab — same rows as the docked / embedded chat (user + assistant). */
	teamSessionTranscript?: ChatRow[];
	streaming?: boolean;
	chatAgentName?: string | null;
	/** Reserved; phrase-dispatch does not drive Team pulse (orchestrator vs roster naming). */
	dispatchTurnAgent?: string | null;
	chatPulseMeters?: ChatPulseMeters | null;
	/** Status bar parity — session cumulative ↓/↑ in Team pulse chrome. */
	sessionTokenSummary?: { tokensDown: string; tokensUp: string; tokensTitle?: string } | null;
	/** Simple **My Team** — same as Session Chat **Edit team**. */
	onEditTeam?: () => void;
}) {
	const teamNames = useMemo(() => Object.keys(agentTeams ?? {}), [agentTeams]);
	const [pulseTeam, setPulseTeam] = useState<string | null>(null);
	const [pulseStreamDetail, setPulseStreamDetail] = useState(true);
	const endRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!agentTeams || teamNames.length === 0) {
			setPulseTeam(null);
			return;
		}
		setPulseTeam((prev) => (prev && agentTeams[prev] ? prev : (teamNames[0] ?? null)));
	}, [agentTeams, teamNames]);

	const pulseRoster = pulseTeam ? (agentTeams[pulseTeam] ?? []) : [];
	const pulseRosterLower = useMemo(
		() => new Set(pulseRoster.map((n) => n.trim().toLowerCase()).filter(Boolean)),
		[pulseRoster],
	);
	const pulseAgentName = chatAgentName?.trim() || null;
	const pulseDoneFlashLower = useAgentPulseDoneFlash(streaming, pulseAgentName);
	const userRows = useMemo(
		() => teamSessionTranscript.filter((r) => r.role === "user"),
		[teamSessionTranscript],
	);
	const lastUserTask = useMemo(() => {
		for (let i = userRows.length - 1; i >= 0; i--) {
			const t = String(userRows[i]?.content ?? "").trim();
			if (t) return t;
		}
		return null;
	}, [userRows]);
	const pulseMembers = useMemo(() => {
		const base = buildPulseMembersFromRoster(pulseRoster, agents ?? []);
		return overlayPulseMembersWithActiveChat(base, {
			activeAgentName: pulseAgentName,
			streaming,
			doneFlashAgentLower: pulseDoneFlashLower,
			lastUserTask,
			meters: chatPulseMeters ?? null,
		});
	}, [
		pulseRoster,
		agents,
		pulseAgentName,
		streaming,
		pulseDoneFlashLower,
		lastUserTask,
		chatPulseMeters,
	]);

	const teamAgentTranscript = useMemo(
		() =>
			teamSessionTranscript.filter((r) => {
				if (r.role !== "assistant") return false;
				const p = r.assistantPersona?.trim().toLowerCase();
				return Boolean(p && pulseRosterLower.has(p));
			}),
		[teamSessionTranscript, pulseRosterLower],
	);

	const lastRowSig = teamAgentTranscript.at(-1)?.id ?? "";
	/** New row only — avoids snapping scroll on every streaming token when the user has scrolled up. */
	useLayoutEffect(() => {
		endRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
	}, [teamAgentTranscript.length, lastRowSig]);

	if (agentsLoading) {
		return (
			<div className="p-3 font-mono text-[12px] text-[#a3a3a3]">
				Loading workspace agents…
			</div>
		);
	}
	if (teamNames.length === 0) {
		return (
			<div className="p-3">
				<div className="rounded border border-[#3c3c3c] bg-[#252526] p-4 font-mono text-[12px] leading-relaxed text-[#858585]">
					<p className="mb-2 text-[#cccccc]">No teams in workspace</p>
					<p>
						Pi <strong className="text-[#d4d4d4]">agent-team</strong> reads{" "}
						<code className="text-[#fb923c]">.pi/agents/teams.yaml</code>. Add rosters there, refresh the tree or
						reload the app.
					</p>
				</div>
			</div>
		);
	}

	const hasRoster = Boolean(pulseTeam && pulseMembers.length > 0);
	const hasTranscript = teamAgentTranscript.length > 0;

	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#1e1e1e] font-mono text-[12px] text-[#858585]">
			<div className="shrink-0 border-b border-[#3c3c3c] px-3 pb-2 pt-3">
				{pulseTeam ? (
					<div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-[#cccccc]">
						<span className="text-[#858585]">Team</span>
						{teamNames.length > 1 ? (
							<select
								value={pulseTeam}
								onChange={(e) => setPulseTeam(e.target.value || null)}
								className="max-w-full rounded border border-[#fb923c]/45 bg-[#252526] px-2 py-1 font-mono text-[11px] text-[#d4d4d4]"
								aria-label="Workspace team roster"
							>
								{teamNames.map((n) => (
									<option key={n} value={n}>
										{n}
									</option>
								))}
							</select>
						) : (
							<span className="rounded border border-[#fb923c]/45 bg-[#252526] px-2 py-1 font-mono text-[11px] text-[#d4d4d4]">
								{pulseTeam}
							</span>
						)}
						{onEditTeam ? (
							<button
								type="button"
								onClick={onEditTeam}
								title="Edit team members and create teams (My Team — writes teams.yaml)"
								className="shrink-0 rounded border border-[#fb923c]/45 bg-[#252526] px-2 py-1 font-mono text-[11px] uppercase tracking-wide text-[#fdba74] hover:bg-[#ea580c]/15"
							>
								Edit team
							</button>
						) : null}
					</div>
				) : null}
				{hasRoster ? (
					<AgentTeamPulseGrid
						activeTeamName={pulseTeam!}
						members={pulseMembers}
						streamDetail={pulseStreamDetail}
						onStreamDetailChange={setPulseStreamDetail}
						showSessionHint={false}
						section="toolbar"
						sessionTokenSummary={sessionTokenSummary}
					/>
				) : (
					<p className="text-[#a3a3a3]">Selected team has no members in YAML.</p>
				)}
			</div>

			<div
				className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden px-3 py-3"
				role="log"
				aria-label="Team agent transcript"
			>
				<p className="max-w-prose shrink-0 text-[11px] leading-relaxed text-[#6b6b6b]">
					<strong className="text-[#858585]">Team agents</strong> — replies only when the Session Chat header names that
					workspace agent (picker). Phrase-dispatch and orchestrator turns stay in Session Chat so names are not doubled.
					Restored sessions without tags may be empty until new turns run.
				</p>
				{hasTranscript ? (
					<div className="flex min-w-0 flex-col gap-3 border-t border-[#3c3c3c] pt-3">
						<p className="text-[10px] font-semibold uppercase tracking-wide text-[#858585]">
							Roster agent output
						</p>
						{teamAgentTranscript.map((msg) => {
							const who = msg.assistantPersona?.trim() ?? "agent";
							return (
								<div key={msg.id} className="flex min-w-0 flex-col gap-1">
									<div className="flex items-center justify-between gap-2">
										<span className="text-[11px] font-semibold uppercase text-[#858585]">
											{workspaceAgentDisplayName(who)}
										</span>
										<span className="shrink-0 font-mono text-[10px] text-[#555555]">{msg.timestamp}</span>
									</div>
									<div className="rounded border border-[#3c3c3c] bg-[#252526] px-2 py-2 text-[11px] leading-relaxed text-[#cccccc]">
										{msg.reasoning?.trim() ? (
											<div className="mb-2 border border-[#6366f1]/25 bg-[#1e1b4b]/30 px-2 py-1.5 font-mono text-[10px] text-[#c7d2fe]">
												<div className="mb-0.5 text-[9px] uppercase tracking-wide text-[#a5b4fc]">Thinking</div>
												<pre className="w-full min-w-0 whitespace-pre-wrap break-words">{msg.reasoning}</pre>
											</div>
										) : null}
										<pre className="w-full min-w-0 whitespace-pre-wrap break-words font-mono">{msg.content}</pre>
									</div>
								</div>
							);
						})}
						<div ref={endRef} className="h-px shrink-0" aria-hidden />
					</div>
				) : (
					<p className="shrink-0 border-t border-[#3c3c3c] pt-3 text-[11px] italic text-[#6b6b6b]">
						No roster-tagged replies yet — pick a team member in Session Chat (workspace agent) to stream under their
						name; leave Orchestrator for dispatcher-only turns.
					</p>
				)}
			</div>

			{hasRoster ? (
				<div className="max-h-[min(50vh,480px)] shrink-0 overflow-y-auto border-t border-[#3c3c3c] px-3 pb-3 pt-2">
					<AgentTeamPulseGrid
						activeTeamName={pulseTeam!}
						members={pulseMembers}
						streamDetail={pulseStreamDetail}
						showSessionHint={false}
						section="roster"
						sessionTokenSummary={sessionTokenSummary}
					/>
				</div>
			) : null}
		</div>
	);
}
