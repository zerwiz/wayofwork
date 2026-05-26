import {
	Brain,
	MessageSquarePlus,
	PanelBottom,
	PanelRight,
	Paperclip,
	Send,
	SidebarClose,
	Square,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { useTranslation } from "../contexts/LanguageContext";
import {
	buildChatMessageWithAttachment,
	MAX_CHAT_ATTACHMENT_CHARS,
} from "../lib/chatAttachment";
import type { AgentMeta } from "../hooks/useAgents";
import {
	AgentTeamPulseGrid,
	buildPulseMembersFromRoster,
	overlayPulseMembersWithActiveChat,
	useAgentPulseDoneFlash,
} from "./AgentTeamPulseGrid";
import type { ChatPulseMeters } from "../hooks/useWayOfWorkSession";
import type { ChatQueueItem } from "../utils/chatQueueTranscript";
import { ChatQueueModal } from "./ChatQueueModal";
import type { ChatRow, ChatSessionMode, ChatSessionTab } from "../hooks/useWayOfWorkSession";
// UiMode typed as string
import { chatErrorSuggestsModelFix } from "../utils/chatErrorModelHint";
import {
	applySlashCompletion,
	slashMenuAtCursor,
	type SlashMenuState,
} from "../utils/chatSlashAutocomplete";
import { usePlanHandoffSelection } from "../hooks/usePlanHandoffSelection";
import { registerChatComposerInject } from "../utils/chatComposerInjectBus";
import { examplePlanPathForToday } from "../utils/planModeArtifacts";
import { buildImplementPlanPrompt, buildReviewPlanPrompt } from "../utils/planModeComposerTemplates";
import { shouldSuggestPlanModeForMessage } from "../utils/planModeHeuristics";
import { workspaceAgentDisplayName } from "../utils/workspaceAgentDisplay";
import type { ChatDockRegion } from "../utils/technicalLayoutStorage";
import { ContextUsageRing } from "./ContextUsageRing";
import { agentsForSessionPicker, rosterNamesMissingFromAgents } from "../utils/workspaceChatAgentPicker";
import { readShowModelThinking, writeShowModelThinking } from "../utils/showModelThinkingPreference";

/** Technical UI: user-adjustable dock for the agent / session panel (Zed / Cursor–style). */
export type TechnicalAgentDock = {
	region: ChatDockRegion;
	sizePx: number;
	onSetRegion: (r: ChatDockRegion) => void;
	onHidePanel: () => void;
};

export function ChatPanel({
	uiMode,
	rows,
	chatTabs,
	activeChatTabId,
	onSelectChatTab,
	onCloseChatTab,
	streaming,
	connected,
	error,
	onSend,
	onStop,
	onClearError,
	onReopenLlmFixModal,
	onNewSession,
	technicalDock,
	chatMode,
	onChatModeChange,
	agents,
	agentsLoading,
	agentTeams,
	onOpenAgentTeamInPane,
	/** Bumped from App when user chooses “Pane team” — opens inline roster without a center workspace tab. */
	openTeamPulseSignal,
	/** Opens Simple **My Team** (teams.yaml + new teams) — same path as Settings → My Team. */
	onEditTeam,
	chatAgentName,
	/** Phrase-dispatch specialist for this turn (picker unchanged). */
	dispatchTurnAgent: _dispatchTurnAgent,
	onChatAgentChange,
	/** Server-side messages waiting after the current assistant turn. */
	chatQueuePending,
	chatQueueItems,
	editChatQueueItem,
	deleteChatQueueItem,
	forceChatQueueItem,
	chatPulseMeters,
	/** Tooltip for the context ring (same as status bar / `tokenMeter.contextTitle`). */
	contextTitle,
	/** Session cumulative tokens for Team pulse toolbar (status bar parity). */
	sessionTokenSummary,
	/** When wrapped in TechnicalDockPanelFrame — omit outer border; frame provides the edge. */
	dockPanelFrame,
	/** Technical: chat fills a workspace editor pane tab (no fixed sidebar width). */
	embeddedInWorkspace,
	/** After resolving latest `plans/PLAN-*.md`, open it in the workspace editor (Plan → Review plan). */
	onOpenPlanFileForReview,
	/** Primary workspace folder path (or `""`) — scopes saved **Plan document** choice in localStorage. */
	planHandoffWorkspaceKey = "",
}: {
	uiMode: string;
	rows: ChatRow[];
	chatTabs: ChatSessionTab[];
	activeChatTabId: string;
	onSelectChatTab: (id: string) => void;
	/** Remove a session tab, or clear the last tab (fresh session; tab row stays). */
	onCloseChatTab?: (id: string) => void;
	streaming: boolean;
	connected: boolean;
	error: string | null;
	onSend: (text: string) => void;
	onStop: () => void;
	onClearError: () => void;
	onReopenLlmFixModal?: () => void;
	onNewSession?: () => void;
	/** When set (technical shell), panel size/region are user-controlled. */
	technicalDock?: TechnicalAgentDock;
	/** Cursor-style Plan vs Build; technical shell only UI (server injects planner system prompt in Plan). */
	chatMode?: ChatSessionMode;
	onChatModeChange?: (m: ChatSessionMode) => void;
	/** Workspace Pi agents from `/api/agents` (`.pi/agents/*.md`). */
	agents?: AgentMeta[];
	agentsLoading?: boolean;
	/** `teams.yaml` rosters — same source Pi **agent-team** uses; drives the **Team** roster pane. */
	agentTeams?: Record<string, string[]>;
	/** Technical: focus team roster in the agent dock (side/bottom), same panel as Session Chat. */
	onOpenAgentTeamInPane?: () => void;
	/** Incremented by App when `onOpenAgentTeamInPane` runs — expands the Team strip in this ChatPanel. */
	openTeamPulseSignal?: number;
	/** Simple UI: **My Team** tab to edit `teams.yaml` rosters and create teams. */
	onEditTeam?: () => void;
	chatAgentName?: string | null;
	dispatchTurnAgent?: string | null;
	onChatAgentChange?: (name: string | null) => void;
	chatQueuePending?: number;
	chatQueueItems?: ChatQueueItem[];
	editChatQueueItem?: (id: string, text: string) => void;
	deleteChatQueueItem?: (id: string) => void;
	forceChatQueueItem?: (id: string) => void;
	chatPulseMeters?: ChatPulseMeters | null;
	contextTitle?: string;
	sessionTokenSummary?: { tokensDown: string; tokensUp: string; tokensTitle?: string } | null;
	dockPanelFrame?: boolean;
	embeddedInWorkspace?: boolean;
	onOpenPlanFileForReview?: (workspaceRelativePath: string) => void;
	planHandoffWorkspaceKey?: string;
}) {
	const { t } = useTranslation();
	const [queueModalOpen, setQueueModalOpen] = useState(false);
	const technical = uiMode !== "simple";
	const activeChatTabLabel =
		chatTabs.find((t) => t.id === activeChatTabId)?.label ?? (technical ? t("chat.newChatTitle") : t("chat.chat"));
	const docked = technical && technicalDock != null;
	const embedPane = Boolean(embeddedInWorkspace);
	const widthClass = embedPane
		? ""
		: technical && !docked
			? "w-[min(440px,40vw)]"
			: !technical
				? "w-[min(560px,48vw)]"
				: "";
	const [input, setInput] = useState("");
	const [teamPaneOpen, setTeamPaneOpen] = useState(false);
	const lastTeamPulseSignalRef = useRef(0);
	const [pulseTeam, setPulseTeam] = useState<string | null>(null);
	const [pulseStreamDetail, setPulseStreamDetail] = useState(true);
	const [attachment, setAttachment] = useState<{ name: string; text: string } | null>(null);
	const [attachErr, setAttachErr] = useState<string | null>(null);
	const [caretPos, setCaretPos] = useState(0);
	const [slashHighlight, setSlashHighlight] = useState(0);
	const [planNudgeOpen, setPlanNudgeOpen] = useState(false);
	const [showModelThinking, setShowModelThinking] = useState(() =>
		typeof window !== "undefined" ? readShowModelThinking() : true,
	);
	const endRef = useRef<HTMLDivElement>(null);
	const assistantColEndRef = useRef<HTMLDivElement>(null);
	const fileRef = useRef<HTMLInputElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const pending = chatQueuePending ?? 0;
	const queueItems = chatQueueItems ?? [];
	/** Session picker + chat headers — phrase-dispatch does not replace “Orchestrator” here. */
	const sessionPick = chatAgentName?.trim() || null;
	const assistantShort = sessionPick ? workspaceAgentDisplayName(sessionPick) : t("chat.orchestrator");
	/** Pulse grid / team highlight — session picker only (matches who “speaks” in Team pulse transcript). */
	const pulseAgentName = sessionPick;
	const embedSplit = embedPane && technical;
	const userRows = useMemo(() => rows.filter((r) => r.role === "user"), [rows]);
	const transcriptRows = useMemo(() => {
		if (!teamPaneOpen || !pulseTeam || !agentTeams?.[pulseTeam]?.length) return rows;
		const roster = new Set(agentTeams[pulseTeam]!.map((n) => n.trim().toLowerCase()).filter(Boolean));
		return rows.filter((r) => {
			if (r.role === "user") return false;
			const p = r.assistantPersona?.trim().toLowerCase();
			return Boolean(p && roster.has(p));
		});
	}, [teamPaneOpen, pulseTeam, agentTeams, rows]);
	const assistantRowsForView = useMemo(
		() => transcriptRows.filter((r) => r.role === "assistant"),
		[transcriptRows],
	);
	const teamPulseHidesUserColumn = Boolean(
		teamPaneOpen && pulseTeam && agentTeams?.[pulseTeam] && agentTeams[pulseTeam]!.length > 0,
	);
	const userRowsForTeamPulse = useMemo(
		() => (teamPulseHidesUserColumn ? [] : userRows),
		[teamPulseHidesUserColumn, userRows],
	);
	const lastRow = rows.length ? rows[rows.length - 1]! : undefined;
	const streamingNeedsPlaceholder = useMemo(() => {
		if (!streaming) return false;
		if (teamPulseHidesUserColumn) {
			const lead = (chatAgentName?.trim() || "").toLowerCase();
			const roster = new Set(
				(agentTeams?.[pulseTeam!] ?? []).map((n) => n.trim().toLowerCase()).filter(Boolean),
			);
			if (!lead || !roster.has(lead)) return false;
		}
		return !lastRow || lastRow.role !== "assistant" || !String(lastRow.content ?? "").trim();
	}, [
		streaming,
		teamPulseHidesUserColumn,
		chatAgentName,
		agentTeams,
		pulseTeam,
		lastRow,
	]);

	const toggleShowModelThinking = useCallback(() => {
		setShowModelThinking((prev) => {
			const next = !prev;
			writeShowModelThinking(next);
			return next;
		});
	}, []);

	const teamNames = useMemo(() => Object.keys(agentTeams ?? {}), [agentTeams]);
	useEffect(() => {
		if (!agentTeams || teamNames.length === 0) {
			setPulseTeam(null);
			return;
		}
		setPulseTeam((prev: string | null) =>
			prev && agentTeams[prev] ? prev : (teamNames[0] ?? null),
		);
	}, [agentTeams, teamNames]);

	useEffect(() => {
		const s = openTeamPulseSignal ?? 0;
		if (s <= 0 || s === lastTeamPulseSignalRef.current) return;
		lastTeamPulseSignalRef.current = s;
		setTeamPaneOpen(true);
	}, [openTeamPulseSignal]);

	const pulseRoster = pulseTeam && agentTeams?.[pulseTeam] ? agentTeams[pulseTeam] : [];
	const pulseDoneFlashLower = useAgentPulseDoneFlash(streaming, pulseAgentName);
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

	const pickerAgents = useMemo(() => agentsForSessionPicker(agents ?? []), [agents]);
	const rosterOnlyNames = useMemo(
		() => rosterNamesMissingFromAgents(agentTeams, agents ?? []),
		[agentTeams, agents],
	);

	const slashMenu = useMemo(() => slashMenuAtCursor(input, caretPos), [input, caretPos]);
	const slashMenuKey = slashMenu ? slashMenu.filtered.map((c) => c.id).join("|") : "";
	const {
		planCatalogReady,
		planFiles,
		handoffPath,
		handoffSummary,
		setHandoffPath,
	} = usePlanHandoffSelection(planHandoffWorkspaceKey, Boolean(technical && connected));
	useEffect(() => {
		setSlashHighlight(0);
	}, [slashMenuKey]);

	const injectComposer = useCallback((t: string) => {
		setInput((prev) => (prev.trim() ? `${prev.trim()}

${t}` : t));
		queueMicrotask(() => {
			const el = textareaRef.current;
			if (!el) return;
			el.focus();
			const len = el.value.length;
			el.setSelectionRange(len, len);
		});
	}, []);

	useEffect(() => {
		registerChatComposerInject(injectComposer);
		return () => registerChatComposerInject(null);
	}, [injectComposer]);

	useEffect(() => {
		if (!embedSplit) return;
		queueMicrotask(() => assistantColEndRef.current?.scrollIntoView({ behavior: "smooth" }));
	}, [embedSplit, assistantRowsForView, streaming]);

	const applySlashPick = (commandId: string, menuState: SlashMenuState | null = slashMenu) => {
		if (!menuState) return;
		const { value: next, caret } = applySlashCompletion(
			input,
			menuState.lineStart,
			menuState.replaceTo,
			commandId,
		);
		setInput(next);
		setCaretPos(caret);
		queueMicrotask(() => {
			const el = textareaRef.current;
			if (!el) return;
			el.focus();
			el.setSelectionRange(caret, caret);
		});
	};

	const submit = (e: FormEvent) => {
		e.preventDefault();
		if (!connected) return;
		const msg = buildChatMessageWithAttachment(input, attachment).trim();
		if (!msg) return;
		const wasBuild = chatMode === "build";
		onSend(msg);
		setInput("");
		setAttachment(null);
		setAttachErr(null);
		if (technical && wasBuild && shouldSuggestPlanModeForMessage(msg)) {
			setPlanNudgeOpen(true);
		}
		setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
	};

	const applyPlanHandoff = (kind: "implement" | "review") => {
		const path = handoffPath;
		if (!path) {
			injectComposer(
				kind === "implement"
					? t("chat.noPlanFileFound")
					: t("chat.noPlanFileFoundReview"),
			);
			return;
		}
		if (kind === "review") {
			onOpenPlanFileForReview?.(path);
		}
		injectComposer(kind === "implement" ? buildImplementPlanPrompt(path) : buildReviewPlanPrompt(path));
	};

	const onPickFile = async (list: FileList | null) => {
		setAttachErr(null);
		const f = list?.[0];
		if (!f) return;
		if (f.size > 512 * 1024) {
			setAttachErr(t("chat.fileTooLarge"));
			return;
		}
		const text = await f.text();
		if (text.length > MAX_CHAT_ATTACHMENT_CHARS) {
			setAttachErr(t("chat.attachmentTextTooLong", { maxChars: MAX_CHAT_ATTACHMENT_CHARS }));
			return;
		}
		setAttachment({ name: f.name, text });
		if (fileRef.current) fileRef.current.value = "";
	};

	const outerStyle: CSSProperties | undefined = docked
		? technicalDock.region === "right"
			? { width: "100%", minHeight: 0, flex: "1 1 0%" }
			: dockPanelFrame
				? { minHeight: 0, flex: "1 1 0%", height: "100%" }
				: {
						height: technicalDock.sizePx,
						minHeight: 120,
						maxHeight: 720,
					}
		: embedPane
			? { minHeight: 0, minWidth: 0, flex: "1 1 0%" }
			: undefined;

	const framed = Boolean(dockPanelFrame && docked);
	const outerClass = docked
		? technicalDock.region === "right"
			? `flex min-h-0 min-w-0 flex-1 flex-col bg-[#1e1e1e]${framed ? "" : " border-l border-[#3c3c3c]"}`
			: `flex w-full min-h-0 shrink-0 flex-col bg-[#1e1e1e]${framed ? "" : " border-t border-[#3c3c3c]"}`
		: embedPane
			? "flex min-h-0 min-w-0 flex-1 flex-col bg-[#1e1e1e]"
			: `flex min-h-0 ${widthClass} shrink-0 flex-col border-l border-[#3c3c3c] bg-[#1e1e1e]`;

	return (
		<div className={outerClass} style={outerStyle} data-wop-chat-root>
			<div className="flex h-9 min-w-0 shrink-0 items-stretch overflow-hidden bg-[#252526]">
				{/* Tabs use full header width; dock + New sit on top so extra tabs scroll sideways underneath the fixed chrome. */}
				<div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
					<div
						className="scrollbar-hide absolute inset-0 overflow-x-auto overflow-y-hidden"
						role="tablist"
						aria-label={t("chat.chatSessions")}
					>
						<div
							className={`flex h-full items-stretch ${
								docked
									? "pr-[11.75rem]"
									: technical
										? onNewSession && !teamPaneOpen
											? "pr-[7.5rem]"
											: "pr-12"
										: onNewSession && !teamPaneOpen
											? "pr-24"
											: "pr-1"
							}`}
						>
							{chatTabs.map((tab) => {
								const active = activeChatTabId === tab.id && !teamPaneOpen;
								const canClose = Boolean(onCloseChatTab);
								const closeDisabled = streaming && activeChatTabId === tab.id;
								const soleTab = chatTabs.length <= 1;
								const label = technical
									? tab.label
									: tab.label.replace(new RegExp(`^(${t("chat.sessionChat")}|${t("chat.newChatTitle")}|${t("chat.newChatSmall")})$`), t("chat.chat"));
								return (
									<div
										key={tab.id}
										role="presentation"
										className={`flex max-w-[min(240px,42vw)] shrink-0 items-stretch border-r border-t border-[#3c3c3c] text-[13px] ${
											active
												? "border-t-[#ea580c] border-r-[#2d2d2d] bg-[#1e1e1e] text-white"
												: "border-t-transparent border-b border-b-[#252526] text-[#858585]"
										}`}
									>
										<button
											type="button"
											role="tab"
											aria-selected={active}
											onClick={() => {
												setTeamPaneOpen(false);
												onSelectChatTab(tab.id);
											}}
											className={`flex min-w-0 flex-1 items-center px-2.5 text-left ${
												active ? "" : "hover:text-[#cccccc]"
											}`}
											title={tab.label}
										>
											<span className="truncate">{label}</span>
										</button>
										{canClose ? (
											<button
												type="button"
												aria-label={
													soleTab
														? t("chat.clearChatAndStartFresh", { label: tab.label })
														: t("chat.closeChat", { label: tab.label })
												}
												title={
													closeDisabled
														? t("chat.waitToFinishBeforeClosing")
														: soleTab
															? t("chat.clearChatAndStartFresh", { label: tab.label })
															: t("chat.closeChat", { label: tab.label })
												}
												disabled={closeDisabled}
												onClick={(e) => {
													e.stopPropagation();
													onCloseChatTab?.(tab.id);
												}}
												className={`flex w-7 shrink-0 items-center justify-center border-l border-transparent hover:border-[#3c3c3c] hover:bg-[#2a2d2e] disabled:cursor-not-allowed disabled:opacity-40 ${
													active ? "text-[#cccccc]" : "text-[#858585] hover:text-[#cccccc]"
												}`}
											>
												<X size={13} strokeWidth={2} />
											</button>
										) : null}
									</div>
								);
							})}
						</div>
					</div>
					<div
						className="pointer-events-none absolute inset-y-0 right-0 z-10 flex items-stretch"
						data-wop-chat-session-actions
					>
						<div className="pointer-events-auto flex h-full flex-nowrap items-center gap-0.5 border-l border-[#3c3c3c] bg-[#252526] pl-1 pr-1 shadow-[-12px_0_18px_6px_#252526]">
							{docked ? (
								<>
									<button
										type="button"
										title={t("chat.dockAgentsRight")}
										onClick={() => technicalDock.onSetRegion("right")}
										className={`rounded p-1.5 ${technicalDock.region === "right" ? "bg-[#37373d] text-white" : "text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]"}`}
									>
										<PanelRight size={15} strokeWidth={1.75} />
									</button>
									<button
										type="button"
										title={t("chat.dockAgentsBottom")}
										onClick={() => technicalDock.onSetRegion("bottom")}
										className={`rounded p-1.5 ${technicalDock.region === "bottom" ? "bg-[#37373d] text-white" : "text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]"}`}
									>
										<PanelBottom size={15} strokeWidth={1.75} />
									</button>
									<button
										type="button"
										title={t("chat.hideAgentPanel")}
										onClick={() => technicalDock.onHidePanel()}
										className="rounded p-1.5 text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]"
									>
										<SidebarClose size={15} strokeWidth={1.75} />
									</button>
								</>
							) : null}
							{technical ? (
								<button
									type="button"
									title={
										showModelThinking
											? t("chat.hideModelThinking")
											: t("chat.showModelThinking")
									}
									aria-label={showModelThinking ? t("chat.hideModelThinking") : t("chat.showModelThinking")}
									aria-pressed={showModelThinking}
									onClick={toggleShowModelThinking}
									className={`rounded p-1 ${
										showModelThinking
											? "bg-[#312e81]/60 text-[#c7d2fe]"
											: "text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]"
									}`}
								>
									<Brain size={13} strokeWidth={1.75} />
								</button>
							) : null}
							{onNewSession && !teamPaneOpen ? (
								<button
									type="button"
									title={
										streaming
											? t("chat.waitToFinishBeforeNewSession")
											: t("chat.newChatSession")
									}
									disabled={!connected || streaming}
									onClick={() => onNewSession()}
									className="flex shrink-0 items-center gap-1 rounded px-2 py-1 font-mono text-[11px] uppercase tracking-wide text-[#cccccc] hover:bg-[#3c3c3c] disabled:cursor-not-allowed disabled:opacity-40"
								>
									<MessageSquarePlus size={14} className="shrink-0" />
									<span className="hidden sm:inline">{t("chat.newChatSmall")}</span>
								</button>
							) : null}
						</div>
					</div>
				</div>
			</div>

			<div className="flex min-h-0 min-w-0 flex-1 flex-col text-[13px]">
				{teamPaneOpen ? (
					<div
						className={`shrink-0 border-b border-[#3c3c3c] bg-[#1e1e1e] font-mono text-[12px] leading-relaxed text-[#858585] ${technical ? "px-4 pb-2 pt-3" : "px-5 pb-2 pt-4"}`}
					>
						{agentsLoading ? (
							<p className="text-[#a3a3a3]">{t("chat.loadingWorkspaceAgents")}</p>
						) : teamNames.length === 0 ? (
							<div className="rounded border border-[#3c3c3c] bg-[#252526] p-4">
								<p className="mb-2 text-[#cccccc]">{t("chat.noTeamsInWorkspace")}</p>
								<p>
									Pi <strong className="text-[#d4d4d4]">{t("chat.agentTeam")}</strong> {t("chat.readsTeamsYaml")}
									<code className="text-[#fb923c]">.pi/agents/teams.yaml</code>. {t("chat.addRosters")}
									<button
										type="button"
										className="text-[#fb923c] underline"
										onClick={() => setTeamPaneOpen(false)}
									>
										{activeChatTabLabel}
									</button>{" "}
									{t("chat.messageMainSession")}
								</p>
							</div>
						) : (
							<>
								{pulseTeam ? (
									<div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-[#cccccc]">
										<span className="text-[#858585]">{t("chat.team")}</span>
										{teamNames.length > 1 ? (
											<select
												value={pulseTeam}
												onChange={(e) => setPulseTeam(e.target.value || null)}
												className="max-w-full rounded border border-[#fb923c]/45 bg-[#252526] px-2 py-1 font-mono text-[11px] text-[#d4d4d4]"
												aria-label={t("chat.workspaceTeamRoster")}
											>
												{teamNames.map((n: string) => (
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
												title={t("chat.editTeamMembersAndCreateTeams")}
												className="shrink-0 rounded border border-[#fb923c]/45 bg-[#252526] px-2 py-1 font-mono text-[11px] uppercase tracking-wide text-[#fdba74] hover:bg-[#ea580c]/15"
											>
												{t("chat.editTeam")}
											</button>
										) : null}
									</div>
								) : null}
								{pulseTeam && pulseMembers.length > 0 ? (
									<AgentTeamPulseGrid
										activeTeamName={pulseTeam}
										members={pulseMembers}
										streamDetail={pulseStreamDetail}
										onStreamDetailChange={setPulseStreamDetail}
										showSessionHint={false}
										section="toolbar"
										sessionTokenSummary={sessionTokenSummary ?? null}
									/>
								) : (
									<p className="text-[#a3a3a3]">{t("chat.selectedTeamHasNoMembers")}</p>
								)}
							</>
						)}
					</div>
				) : null}
				{embedSplit ? (
					<div className="flex min-h-0 min-w-0 flex-1 flex-col">
						<div
							className={`shrink-0 space-y-2 border-b border-[#3c3c3c] bg-[#1e1e1e] ${technical ? "px-4 py-2" : "px-5 py-2"}`}
						>
							{!connected ? (
								<div className={`text-[#ce9178] ${technical ? "font-mono text-[12px]" : "text-[13px]"}`}>
									{t("chat.connectingToServer")}
								</div>
							) : null}
							{error ? (
								<div className="w-full rounded border border-[#f14c4c]/40 bg-[#f14c4c]/10 p-2 text-left font-mono text-[12px] text-[#f14c4c]">
									<p className="whitespace-pre-wrap">{error}</p>
									<div className="mt-2 flex flex-wrap gap-2">
										{onReopenLlmFixModal && chatErrorSuggestsModelFix(error) ? (
											<button
												type="button"
												onClick={onReopenLlmFixModal}
												className="rounded border border-[#fb923c]/40 bg-[#ea580c]/15 px-2 py-1 text-[11px] font-semibold text-[#fdba74] hover:bg-[#ea580c]/25"
											>
												{t("chat.fixModelProvider")}
											</button>
										) : null}
										<button
											type="button"
											onClick={onClearError}
											className="rounded border border-[#f14c4c]/30 px-2 py-1 text-[11px] text-[#f14c4c] hover:bg-[#f14c4c]/10"
										>
											{t("chat.dismiss")}
										</button>
									</div>
								</div>
							) : null}
						</div>
						<div className="flex min-h-0 min-w-0 flex-1 flex-row">
							<div
								className={`flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto ${technical ? "p-4" : "p-4"}`}
								aria-label={t("chat.assistantMessages")}
							>
								<p className="font-mono text-[10px] uppercase tracking-wide text-[#858585]">
									{assistantShort} ({t("chat.assistantSession")})
								</p>
								{assistantRowsForView.length === 0 && !streamingNeedsPlaceholder ? (
									<p className="font-mono text-[11px] leading-relaxed text-[#6b6b6b]">
										{teamPulseHidesUserColumn
											? t("chat.rosterAgentRepliesStream")
											: t("chat.assistantRepliesStream")}
									</p>
								) : null}
								{assistantRowsForView.map((msg) => (
									<div key={msg.id} className="flex w-full flex-col gap-1">
										<div className="flex items-center justify-between">
											<span className="font-mono text-[11px] uppercase text-[#858585]">
												{teamPulseHidesUserColumn && msg.assistantPersona?.trim()
													? workspaceAgentDisplayName(msg.assistantPersona.trim()).toUpperCase()
													: assistantShort.toUpperCase()}
											</span>
											<span className="font-mono text-[10px] text-[#555555]">{msg.timestamp}</span>
										</div>
										<div className="w-full border border-[#3c3c3c] bg-[#252526] p-3 font-mono leading-relaxed text-[#cccccc]">
											{showModelThinking && msg.reasoning?.trim() ? (
												<div className="mb-3 border border-[#6366f1]/30 bg-[#1e1b4b]/35 p-2">
													<div className="mb-1 font-mono text-[9px] uppercase tracking-wide text-[#a5b4fc]">
														{t("chat.thinkingBlock")}
													</div>
													<div className="whitespace-pre-wrap text-[11px] leading-relaxed text-[#c7d2fe]">
														{msg.reasoning}
													</div>
												</div>
											) : null}
											<div className="whitespace-pre-wrap">{msg.content}</div>
										</div>
									</div>
								))}
								{streamingNeedsPlaceholder ? (
									<div className="flex flex-col gap-1">
										<span className="font-mono text-[11px] uppercase text-[#858585]">
											{teamPulseHidesUserColumn && chatAgentName?.trim()
												? `${workspaceAgentDisplayName(chatAgentName.trim()).toUpperCase()} (${t("chat.streaming")})`
												: `${assistantShort.toUpperCase()} (${t("chat.streaming")})`}
										</span>
										<div className="flex items-center gap-2 border border-[#3c3c3c] bg-[#252526] p-3">
											<div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#858585]" />
											<div
												className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#858585]"
												style={{ animationDelay: "150ms" }}
											/>
											<div
												className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#858585]"
												style={{ animationDelay: "300ms" }}
											/>
										</div>
									</div>
								) : null}
								<div ref={assistantColEndRef} />
							</div>
							<aside
								className={`flex min-h-0 w-[min(300px,44%)] max-w-[400px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-[#3c3c3c] bg-[#252526]/40 ${technical ? "p-4" : "p-4"}`}
								aria-label={t("chat.yourMessages")}
							>
								<p className="font-mono text-[10px] uppercase tracking-wide text-[#858585]">
									{teamPulseHidesUserColumn ? t("chat.sessionChat") : t("chat.userMessages")}
								</p>
								{userRowsForTeamPulse.length === 0 ? (
									<p className="font-mono text-[11px] leading-relaxed text-[#6b6b6b]">
										{teamPulseHidesUserColumn
											? t("chat.sessionChatPlaceholder")
											: t("chat.userMessagesPlaceholder")}
									</p>
								) : null}
								{userRowsForTeamPulse.map((msg) => (
									<div key={msg.id} className="flex w-full flex-col gap-1">
										<div className="flex items-center justify-between">
											<span className="font-mono text-[11px] uppercase text-[#858585]">{t("chat.user")}</span>
											<span className="font-mono text-[10px] text-[#555555]">{msg.timestamp}</span>
										</div>
										<div className="w-full border border-[#ea580c]/30 bg-[#ea580c]/10 p-3 font-mono leading-relaxed text-[#d4d4d4]">
											<div className="whitespace-pre-wrap">{msg.content}</div>
										</div>
									</div>
								))}
								<div ref={endRef} />
							</aside>
						</div>
					</div>
				) : (
					<div
						className={`flex min-h-0 flex-1 flex-col overflow-y-auto ${technical ? "gap-4 p-4" : "gap-5 p-5"}`}
					>
						{!connected ? (
							<div
								className={`text-[#ce9178] ${technical ? "font-mono text-[12px]" : "text-[13px]"}`}
							>
								{t("chat.connectingToServer")}
							</div>
						) : null}
						{error ? (
							<div className="w-full rounded border border-[#f14c4c]/40 bg-[#f14c4c]/10 p-2 text-left font-mono text-[12px] text-[#f14c4c]">
								<p className="whitespace-pre-wrap">{error}</p>
								<div className="mt-2 flex flex-wrap gap-2">
									{onReopenLlmFixModal && chatErrorSuggestsModelFix(error) ? (
										<button
											type="button"
											onClick={onReopenLlmFixModal}
											className="rounded border border-[#fb923c]/40 bg-[#ea580c]/15 px-2 py-1 text-[11px] font-semibold text-[#fdba74] hover:bg-[#ea580c]/25"
										>
											{t("chat.fixModelProvider")}
										</button>
									) : null}
									<button
										type="button"
										onClick={onClearError}
										className="rounded border border-[#f14c4c]/30 px-2 py-1 text-[11px] text-[#f14c4c] hover:bg-[#f14c4c]/10"
										>
											{t("chat.dismiss")}
										</button>
									</div>
								</div>
							) : null}
							{transcriptRows.map((msg, idx) => {
								// Skip the last assistant row if it's empty while streaming (avoid double-bubble with placeholder)
								if (
									streaming &&
									idx === transcriptRows.length - 1 &&
									msg.role === "assistant" &&
									!msg.content?.trim() &&
									!msg.reasoning?.trim()
								) {
									return null;
								}
								return (
									<div key={msg.id} className="flex w-full flex-col gap-1">
									<div className="flex items-center justify-between">
										<span
											className={
												technical
													? "font-mono text-[11px] uppercase text-[#858585]"
													: "text-[12px] font-medium text-[#858585]"
											}
										>
											{technical
												? msg.role === "user"
													? t("chat.user").toUpperCase()
													: teamPulseHidesUserColumn && msg.assistantPersona?.trim()
														? workspaceAgentDisplayName(msg.assistantPersona.trim()).toUpperCase()
														: assistantShort.toUpperCase()
												: msg.role === "user"
													? t("chat.user")
													: teamPulseHidesUserColumn && msg.assistantPersona?.trim()
														? workspaceAgentDisplayName(msg.assistantPersona.trim())
														: assistantShort}
										</span>
										<span className={`text-[#555555] ${technical ? "font-mono text-[10px]" : "text-[11px]"}`}>
											{msg.timestamp}
										</span>
									</div>
									<div
										className={`w-full leading-relaxed ${
											technical ? "p-3 font-mono" : "rounded-md p-4 font-sans text-[14px]"
										} ${
											msg.role === "user"
												? "border border-[#ea580c]/30 bg-[#ea580c]/10 text-[#d4d4d4]"
												: "border border-[#3c3c3c] bg-[#252526] text-[#cccccc]"
										}`}
									>
										{technical && showModelThinking && msg.role === "assistant" && msg.reasoning?.trim() ? (
											<div className="mb-3 border border-[#6366f1]/30 bg-[#1e1b4b]/35 p-2">
												<div className="mb-1 font-mono text-[9px] uppercase tracking-wide text-[#a5b4fc]">
													{t("chat.thinkingBlock")}
												</div>
												<div className="whitespace-pre-wrap text-[11px] leading-relaxed text-[#c7d2fe]">
													{msg.reasoning}
												</div>
											</div>
										) : null}
										<div className="whitespace-pre-wrap">{msg.content}</div>
									</div>
								</div>
								);
							})}
							{streamingNeedsPlaceholder ? (
								<div className="flex flex-col gap-1">
									<span
										className={
											technical
												? "font-mono text-[11px] uppercase text-[#858585]"
												: "text-[12px] text-[#858585]"
										}
									>
										{technical ? `${assistantShort.toUpperCase()} (${t("chat.streaming")})` : `${assistantShort} ${t("chat.isReplying")}`}
									</span>
									<div className="flex items-center gap-2 border border-[#3c3c3c] bg-[#252526] p-3">
										<div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#858585]" />
										<div
											className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#858585]"
											style={{ animationDelay: "150ms" }}
										/>
										<div
											className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#858585]"
											style={{ animationDelay: "300ms" }}
										/>
									</div>
								</div>
							) : null}
							<div ref={endRef} />
						</div>
					</div>
				)}
				{teamPaneOpen && !agentsLoading && teamNames.length > 0 && pulseTeam && pulseMembers.length > 0 ? (
					<div
						className={`max-h-[min(45vh,440px)] shrink-0 overflow-y-auto border-t border-[#3c3c3c] bg-[#1e1e1e] font-mono text-[12px] leading-relaxed text-[#858585] ${technical ? "p-4 pt-3" : "p-5 pt-4"}`}
					>
						<AgentTeamPulseGrid
							activeTeamName={pulseTeam}
							members={pulseMembers}
							streamDetail={pulseStreamDetail}
							showSessionHint={false}
							section="roster"
							sessionTokenSummary={sessionTokenSummary ?? null}
						/>
					</div>
				) : null}
			</div>

			<div className="shrink-0 border-t border-[#3c3c3c] bg-[#252526] p-3">
				{pending > 0 && !teamPaneOpen ? (
					<button
						type="button"
						onClick={() => setQueueModalOpen(true)}
						disabled={!connected}
						className="mb-2 w-full rounded border border-[#ea580c]/35 bg-[#ea580c]/10 px-2 py-1.5 text-left font-mono text-[10px] text-[#fdba74] transition-colors hover:bg-[#ea580c]/20 disabled:cursor-not-allowed disabled:opacity-50"
						title={t("chat.viewEditRemovePrioritizeQueuedMessages")}
					>
						{pending} {t("chat.messageQueued", { count: pending })}
						<span className="mt-0.5 block text-[9px] font-normal text-[#fdba74]/80">{t("chat.manageQueue")}</span>
					</button>
				) : null}
				{queueModalOpen ? (
					<ChatQueueModal
						open={queueModalOpen}
						onClose={() => setQueueModalOpen(false)}
						items={queueItems}
						connected={connected}
						streaming={streaming}
						onEdit={(id, text) => editChatQueueItem?.(id, text)}
						onDelete={(id) => deleteChatQueueItem?.(id)}
						onForce={(id) => forceChatQueueItem?.(id)}
						appearanceDark
					/>
				) : null}
				{attachErr ? (
					<p className="mb-2 font-mono text-[11px] text-[#ce9178]">
						{attachErr}{" "}
						<button type="button" className="underline" onClick={() => setAttachErr(null)}>
							{t("chat.dismiss")}
						</button>
					</p>
				) : null}
				{attachment ? (
					<div className="mb-2 flex items-center justify-between rounded border border-[#ea580c]/40 bg-[#ea580c]/10 px-2 py-1.5 font-mono text-[11px] text-[#fed7aa]">
						<span className="truncate">{t("chat.attached")}: {attachment.name}</span>
						<button
							type="button"
							onClick={() => setAttachment(null)}
							className="shrink-0 rounded p-1 hover:bg-[#ea580c]/20"
							aria-label={t("chat.removeAttachment")}
						>
							<X size={14} />
						</button>
					</div>
				) : null}
				{planNudgeOpen && technical ? (
					<div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded border border-[#c586c0]/40 bg-[#c586c0]/10 px-2 py-1.5 font-mono text-[10px] text-[#e9d5ff]">
						<span className="min-w-0 flex-1">
							{t("chat.planModeMultiStep")}
						</span>
						<div className="flex shrink-0 gap-1">
							<button
								type="button"
								disabled={streaming || !onChatModeChange}
								className="rounded border border-[#c586c0]/50 bg-[#c586c0]/25 px-2 py-0.5 font-bold text-white hover:bg-[#c586c0]/40 disabled:opacity-40"
								onClick={() => {
									onChatModeChange?.("plan");
									setPlanNudgeOpen(false);
								}}
							>
								{t("chat.switchToPlan")}
							</button>
							<button
								type="button"
								className="rounded border border-[#555] px-2 py-0.5 text-[#cccccc] hover:bg-[#3c3c3c]"
								onClick={() => setPlanNudgeOpen(false)}
							>
								{t("chat.dismiss")}
							</button>
						</div>
					</div>
				) : null}
				<form
					onSubmit={submit}
					className="flex flex-col border border-[#3c3c3c] bg-[#3c3c3c] transition-colors focus-within:border-[#ea580c]"
				>
					<input
						ref={fileRef}
						type="file"
						className="hidden"
						accept=".txt,.md,.ts,.tsx,.js,.jsx,.json,.yaml,.yml,.py,.rs,.go,.css,.html,.sh,.env.sample"
						onChange={(e) => void onPickFile(e.target.files)}
					/>
					<div className="relative w-full">
						{slashMenu && slashMenu.filtered.length > 0 ? (
							<ul
								className="absolute bottom-full left-0 right-0 z-20 mb-1 max-h-52 overflow-auto rounded border border-[#ea580c]/35 bg-[#1e1e1e] py-1 shadow-lg"
								role="listbox"
								aria-label={t("chat.slashCommands")}
							>
								{slashMenu.filtered.map((c, i) => (
									<li key={c.id}>
										<button
											type="button"
											role="option"
											aria-selected={i === slashHighlight}
											className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left font-mono text-[11px] leading-snug ${
												i === slashHighlight
													? "bg-[#ea580c]/20 text-[#fed7aa]"
													: "text-[#cccccc] hover:bg-[#2d2d2d]"
											}`}
											onMouseEnter={() => setSlashHighlight(i)}
											onMouseDown={(ev) => {
												ev.preventDefault();
												applySlashPick(c.id, slashMenu);
											}}
										>
											<span className="font-bold text-[#ea580c]">/{c.id}</span>
											<span className="text-[10px] font-normal text-[#858585]">{c.detail}</span>
										</button>
									</li>
								))}
							</ul>
						) : null}
						<textarea
							ref={textareaRef}
							value={input}
							onChange={(e) => {
								setInput(e.target.value);
								setCaretPos(e.target.selectionStart);
							}}
							onSelect={(e) => setCaretPos(e.currentTarget.selectionStart)}
							onClick={(e) => setCaretPos(e.currentTarget.selectionStart)}
							onKeyUp={(e) => setCaretPos(e.currentTarget.selectionStart)}
							onKeyDown={(e) => {
								const menu = slashMenuAtCursor(input, e.currentTarget.selectionStart);
								if (menu && menu.filtered.length > 0) {
									if (e.key === "ArrowDown") {
										e.preventDefault();
										setSlashHighlight((h) => Math.min(h + 1, menu.filtered.length - 1));
										return;
									}
									if (e.key === "ArrowUp") {
										e.preventDefault();
										setSlashHighlight((h) => Math.max(h - 1, 0));
										return;
									}
									if (e.key === "Tab") {
										e.preventDefault();
										const pick = menu.filtered[slashHighlight];
										if (pick) applySlashPick(pick.id, menu);
										return;
									}
									if (e.key === "Enter" && !e.shiftKey) {
										e.preventDefault();
										const pick = menu.filtered[slashHighlight];
										if (pick) applySlashPick(pick.id, menu);
										return;
									}
								}
								if (
									e.key === "Tab" &&
									e.shiftKey &&
									technical &&
									chatMode &&
									onChatModeChange &&
									!streaming
								) {
									e.preventDefault();
									onChatModeChange(chatMode === "build" ? "plan" : "build");
									return;
								}
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									submit(e);
								}
							}}
							placeholder={
							!connected
								? technical
									? `> ${t("chat.notConnectedTypeHereWebsocket")}`
									: `${t("chat.notConnectedTypeHere")}`
								: technical && chatMode === "plan"
									? `> ${t("chat.planMode", { examplePlanPath: examplePlanPathForToday() })}`
										: technical
										? streaming
											? `> ${t("chat.queueNextMessage")}`
											: `> ${t("chat.typeMessageTechnical")}`
										: streaming
											? `${t("chat.queueNextMessage")}`
											: `${t("chat.typeMessage")}`
						}
							className="max-h-48 min-h-[60px] w-full resize-none bg-transparent p-3 pr-10 pb-9 font-mono text-[13px] text-[#cccccc] outline-none placeholder:text-[#858585]"
						/>
						<div className="pointer-events-none absolute bottom-2 right-2 z-30 flex items-center justify-center rounded-full bg-[#1e1e1e]/85 p-0.5 shadow-sm ring-1 ring-[#555]/60">
							<ContextUsageRing
								contextFillPct={chatPulseMeters?.contextFillPct ?? null}
								title={contextTitle}
								appearanceDark
								sizePx={18}
								className="pointer-events-auto opacity-95"
							/>
						</div>
					</div>
					{technical && chatMode === "plan" ? (
						<div className="flex items-center gap-2 border-t border-[#3c3c3c] bg-[#252526] px-2 py-1">
							<div className="flex min-w-0 flex-1 items-center gap-2">
								{planCatalogReady && planFiles.length > 0 ? (
									<select
										disabled={streaming}
										value={handoffPath ?? planFiles[0]!.path}
										onChange={(e) => setHandoffPath(e.target.value)}
										className="min-w-0 max-w-[220px] shrink cursor-pointer truncate rounded border border-[#3c3c3c] bg-[#1e1e1e] px-1.5 py-0.5 font-mono text-[9px] text-[#c586c0] outline-none focus:border-[#c586c0]/60 disabled:opacity-40"
										title={t("chat.planFileForHandoff")}
										aria-label={t("chat.planFile")}
									>
										{planFiles.map((f) => (
											<option key={f.path} value={f.path} title={f.path}>
												{f.path.replace(/^plans\//, "")}
											</option>
										))}
									</select>
								) : null}
								{handoffSummary ? (
									<span className="shrink-0 font-mono text-[9px] text-[#858585]" title={handoffSummary.path}>
										{handoffSummary.doneTodos} {t("common.done")} · {handoffSummary.openTodos} {t("common.open")}
									</span>
								) : null}
							</div>
							<div className="flex shrink-0 items-center gap-1">
								<button
									type="button"
									disabled={streaming || !connected || !planCatalogReady || !handoffPath}
									onClick={() => applyPlanHandoff("implement")}
									className="rounded border border-[#3c3c3c] bg-[#1e1e1e] px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-[#cccccc] hover:border-[#ea580c]/50 disabled:opacity-40"
									title={t("chat.insertBuildHandoff")}
								>
									{t("chat.fromPlan")}
								</button>
								<button
									type="button"
									disabled={streaming || !connected || !planCatalogReady || !handoffPath}
									onClick={() => applyPlanHandoff("review")}
									className="rounded border border-[#3c3c3c] bg-[#1e1e1e] px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-[#cccccc] hover:border-[#c586c0]/50 disabled:opacity-40"
									title={t("chat.openPlanForReview")}
								>
									{t("chat.reviewPlan")}
								</button>
							</div>
						</div>
					) : null}
					<div className="flex items-center gap-2 border-t border-[#3c3c3c] bg-[#2d2d2d] p-1.5">
						<div className="flex min-w-0 flex-1 items-center gap-2">
							<button
								type="button"
								onClick={() => fileRef.current?.click()}
								disabled={!connected}
								className="shrink-0 p-1.5 text-[#858585] hover:text-[#cccccc] disabled:opacity-40"
								aria-label={t("chat.attachFile")}
								title={t("chat.attachFileDescription")}
							>
								<Paperclip size={14} />
							</button>
							{technical && onChatAgentChange ? (
								<select
									value={chatAgentName ?? ""}
									disabled={!connected || streaming || agentsLoading}
									title={t("chat.orchestratorSessionLead")}
									onChange={(e) => {
										const v = e.target.value;
										onChatAgentChange(v === "" ? null : v);
									}}
									className="min-w-0 max-w-[min(180px,45%)] shrink rounded border border-[#3c3c3c] bg-[#1e1e1e] px-1 py-0.5 text-[9px] text-[#cccccc] outline-none focus:border-[#ea580c] disabled:opacity-40"
								>
								<option value="">{t("chat.orchestratorSessionLead")}</option>
								{pickerAgents.map((a) => (
									<option key={a.name} value={a.name} title={a.description || a.relativePath}>
										{workspaceAgentDisplayName(a.name)}
									</option>
								))}
								{rosterOnlyNames.map((name) => (
									<option
										key={`roster-${name}`}
										value={name}
										disabled
										title={t("chat.noMd")}
									>
										{workspaceAgentDisplayName(name)} ({t("chat.noMd")})
									</option>
								))}
								</select>
							) : null}
							<button
								type="button"
								onClick={() => setTeamPaneOpen((o) => !o)}
								title={t("chat.workspaceTeamRoster")}
								className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide transition-colors ${
									teamPaneOpen
										? "border-[#ea580c] bg-[#ea580c]/15 text-[#fed7aa]"
										: "border-[#3c3c3c] bg-[#1e1e1e] text-[#858585] hover:border-[#555555] hover:text-[#cccccc]"
								}`}
							>
								{t("chat.team")}
							</button>
							{technical && onOpenAgentTeamInPane ? (
								<button
									type="button"
									onClick={() => onOpenAgentTeamInPane()}
									title={t("chat.showAgentPanelExpandTeam")}
									className="shrink-0 rounded border border-[#3c3c3c] bg-[#1e1e1e] px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-[#858585] hover:border-[#555555] hover:text-[#cccccc]"
								>
									{t("chat.paneTeam")}
								</button>
							) : null}
						</div>
						<div className="flex shrink-0 items-center gap-2">
							{technical && chatMode && onChatModeChange && !teamPaneOpen ? (
								<div
									className="flex shrink-0 rounded border border-[#3c3c3c] bg-[#1e1e1e] p-0.5"
									title={t("chat.buildVsPlanTooltip")}
								>
									<button
										type="button"
										disabled={streaming}
										onClick={() => onChatModeChange("build")}
										className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
											chatMode === "build" ? "bg-[#ea580c] text-white" : "text-[#858585] hover:text-[#cccccc]"
										} disabled:opacity-40`}
									>
										{t("chat.build")}
									</button>
									<button
										type="button"
										disabled={streaming}
										onClick={() => onChatModeChange("plan")}
										className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
											chatMode === "plan" ? "bg-[#c586c0]/90 text-white" : "text-[#858585] hover:text-[#cccccc]"
										} disabled:opacity-40`}
									>
										{t("chat.plan")}
									</button>
								</div>
							) : null}
							{streaming ? (
								<button
									type="button"
									onClick={onStop}
									aria-label={t("chat.stopGeneration")}
									className={`flex items-center gap-1 border border-[#ef4444] bg-[#450a0a] px-2 py-0.5 font-bold uppercase tracking-wide text-[#fecaca] hover:bg-[#7f1d1d] font-mono text-[10px]`}
								>
									<Square size={10} className="shrink-0" fill="currentColor" /> {t("common.stop")}
								</button>
							) : (
								<button
									type="submit"
									disabled={(!input.trim() && !attachment) || !connected}
									aria-label={t("chat.sendMessage")}
									className={`flex items-center gap-1 bg-[#c2410c] px-2 py-0.5 font-bold uppercase tracking-wide text-[#d4d4d4] hover:bg-[#9a3412] disabled:opacity-50 font-mono text-[10px]`}
								>
									<Send size={10} className="shrink-0 text-[#d4d4d4]" /> {t("chat.send")}
								</button>
							)}
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}
