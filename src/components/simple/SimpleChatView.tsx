import { Brain, Cpu, FileCode2, Paperclip, Send, Square, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { readShowModelThinking, writeShowModelThinking } from "../../utils/showModelThinkingPreference";
import type { ChatQueueItem } from "../../utils/chatQueueTranscript";
import { ChatQueueModal } from "../ChatQueueModal";
import type { AgentMeta } from "../../hooks/useAgents";
import { workspaceAgentDisplayName } from "../../utils/workspaceAgentDisplay";
import type { ChatRow, ChatSessionMode } from "../../hooks/useWayOfPiSession";
import {
	buildChatMessageWithAttachment,
	MAX_CHAT_ATTACHMENT_CHARS,
} from "../../lib/chatAttachment";
import { languageLabel, parseMessageSegments } from "../../lib/parseMessageSegments";
import { chatErrorSuggestsModelFix } from "../../utils/chatErrorModelHint";
import {
	applySlashCompletion,
	slashMenuAtCursor,
	type SlashMenuState,
} from "../../utils/chatSlashAutocomplete";
import { ContextUsageRing } from "../ContextUsageRing";
import { usePlanHandoffSelection } from "../../hooks/usePlanHandoffSelection";
import { registerChatComposerInject } from "../../utils/chatComposerInjectBus";
import { agentsForSessionPicker, rosterNamesMissingFromAgents } from "../../utils/workspaceChatAgentPicker";
import { buildImplementPlanPrompt, buildReviewPlanPrompt } from "../../utils/planModeComposerTemplates";
import { shouldSuggestPlanModeForMessage } from "../../utils/planModeHeuristics";
/** Simple shell — **wired**: chat rows, agent picker, WebSocket send/stop (Pi tools in browser per server notes). */
export function SimpleChatView({
	rows,
	streaming,
	connected,
	error,
	modelLabel,
	onSend,
	onStop,
	onClearError,
	onReopenLlmFixModal,
	appearanceDark,
	agents,
	agentTeams = {},
	agentsLoading,
	chatAgentName,
	dispatchTurnAgent,
	onChatAgentChange,
	chatMode,
	onChatModeChange,
	chatStreamUiEnabled,
	onChatStreamUiEnabledChange,
	chatQueuePending = 0,
	contextFillPct = null,
	contextTitle = "",
	chatQueueItems = [],
	onChatQueueEdit,
	onChatQueueDelete,
	onChatQueueForce,
	/** After resolving latest `plans/PLAN-*.md`, open it beside chat (Plan → Review plan). */
	onOpenPlanFileForReview,
	/** Workspace root path (or `""`) — scopes the saved **Plan file** picker in localStorage. */
	planHandoffWorkspaceKey = "",
	sessionLeadFallbackLabel,
	clawAgentAvailable = false,
	/** Small screens (`?shell=mobile`, narrow Simple): tighter transcript + composer chrome. */
	compactChrome = false,
}: {
	rows: ChatRow[];
	streaming: boolean;
	chatStreamUiEnabled: boolean;
	onChatStreamUiEnabledChange: (on: boolean) => void;
	connected: boolean;
	error: string | null;
	modelLabel: string;
	onSend: (text: string) => void;
	onStop: () => void;
	onClearError: () => void;
	/** Re-show the model/provider fix dialog (App-level). */
	onReopenLlmFixModal?: () => void;
	appearanceDark: boolean;
	agents: AgentMeta[];
	/** Same source as ChatPanel — used to list team roster ids that do not yet have a `.md` agent file. */
	agentTeams?: Record<string, string[]>;
	agentsLoading: boolean;
	chatAgentName: string | null;
	dispatchTurnAgent?: string | null;
	onChatAgentChange: (name: string | null) => void;
	chatMode: ChatSessionMode;
	onChatModeChange: (m: ChatSessionMode) => void;
	/** Server-side messages waiting after the current assistant turn. */
	chatQueuePending?: number;
	/** From `chat_usage` — context window fill 0–100; null until a turn reports usage */
	contextFillPct?: number | null;
	contextTitle?: string;
	chatQueueItems?: ChatQueueItem[];
	onChatQueueEdit?: (id: string, text: string) => void;
	onChatQueueDelete?: (id: string) => void;
	onChatQueueForce?: (id: string) => void;
	onOpenPlanFileForReview?: (workspaceRelativePath: string) => void;
	planHandoffWorkspaceKey?: string;
	/** Session-lead label when the workspace agent picker is empty (default **Orchestrator**; Claw passes **Claw**). */
	sessionLeadFallbackLabel?: string;
	/** When true with Claw chrome, the picker prefers the **claw** workspace agent (see `.pi/agents/claw.md`). */
	clawAgentAvailable?: boolean;
	compactChrome?: boolean;
}) {
	const [queueModalOpen, setQueueModalOpen] = useState(false);
	const [input, setInput] = useState("");
	const [attachment, setAttachment] = useState<{ name: string; text: string } | null>(null);
	const [attachErr, setAttachErr] = useState<string | null>(null);
	const [caretPos, setCaretPos] = useState(0);
	const [slashHighlight, setSlashHighlight] = useState(0);
	const [planNudgeOpen, setPlanNudgeOpen] = useState(false);
	const [showModelThinking, setShowModelThinking] = useState(() =>
		typeof window !== "undefined" ? readShowModelThinking() : true,
	);
	const endRef = useRef<HTMLDivElement>(null);
	const fileRef = useRef<HTMLInputElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		if (rows.length > 0 || streaming) {
			endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
		}
	}, [rows.length, streaming]);

	const buildMessage = (body: string) => buildChatMessageWithAttachment(body, attachment);

	const submit = (e: FormEvent) => {
		e.preventDefault();
		const msg = buildMessage(input);
		if (!msg || !connected) return;
		const wasBuild = chatMode === "build";
		onSend(msg);
		setInput("");
		setAttachment(null);
		setAttachErr(null);
		if (wasBuild && shouldSuggestPlanModeForMessage(msg)) {
			setPlanNudgeOpen(true);
		}
	};

	const onPickFile = async (list: FileList | null) => {
		setAttachErr(null);
		const f = list?.[0];
		if (!f) return;
		if (f.size > 512 * 1024) {
			setAttachErr("File too large (max 512 KiB for chat attachment).");
			return;
		}
		const text = await f.text();
		if (text.length > MAX_CHAT_ATTACHMENT_CHARS) {
			setAttachErr(`Attachment text too long (max ${MAX_CHAT_ATTACHMENT_CHARS} characters).`);
			return;
		}
		setAttachment({ name: f.name, text });
		if (fileRef.current) fileRef.current.value = "";
	};

	const sessionLeadFallback = sessionLeadFallbackLabel?.trim() || "Orchestrator";
	const clawChrome = sessionLeadFallback === "Claw";
	const useClawAgentLead = clawChrome && clawAgentAvailable;
	const sessionPickRaw = chatAgentName?.trim() || null;
	const sessionPick =
		useClawAgentLead && !sessionPickRaw ? "claw" : sessionPickRaw;
	const assistantTitle = sessionPick ? workspaceAgentDisplayName(sessionPick) : sessionLeadFallback;
	const assistantSubtitle =
		connected && modelLabel && modelLabel !== "…"
			? `Powered by ${modelLabel}`
			: connected
				? "Loading model info…"
				: "Ready when the server connects.";
	const phraseDispatchNote =
		!sessionPickRaw && typeof dispatchTurnAgent === "string" && dispatchTurnAgent.trim()
			? `This reply uses phrase-dispatch (${workspaceAgentDisplayName(dispatchTurnAgent)}); the picker stays on ${sessionLeadFallback} unless you choose a workspace agent.`
			: null;

	const pickerAgents = useMemo(() => agentsForSessionPicker(agents), [agents]);
	const rosterOnlyNames = useMemo(
		() => rosterNamesMissingFromAgents(agentTeams, agents),
		[agentTeams, agents],
	);

	const borderHero = appearanceDark ? "border-[#3c3c3c]" : "border-[#e5e5e5]";
	const titleC = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";
	const subC = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const composerBg = appearanceDark ? "border-[#3c3c3c] bg-[#252526]" : "border-[#e5e5e5] bg-white";
	const composerOuter = appearanceDark ? "bg-[#1e1e1e]" : "bg-[#f3f3f3]";
	const canSend = !!(input.trim() || attachment) && connected;
	const cx = compactChrome;
	const transcriptPad = cx ? "p-2" : "p-4 md:p-8";
	const transcriptGap = cx ? "gap-3 pb-2" : "gap-6 pb-4";
	const transcriptMax = cx ? "max-w-full" : "max-w-3xl";
	const composerPad = cx ? "p-2 pt-1.5" : "p-4 md:p-6";
	const toolBarPt = cx ? "pt-2" : "pt-4 md:pt-5";
	const toolLbl = cx
		? `text-[10px] font-semibold uppercase tracking-wide ${subC}`
		: `text-xs font-semibold uppercase tracking-wide ${subC}`;
	const segShell = cx
		? `inline-flex rounded border p-0.5 ${appearanceDark ? "border-[#3c3c3c] bg-[#252526]" : "border-[#d4d4d4] bg-[#ececec]"}`
		: `flex rounded-lg border p-0.5 ${appearanceDark ? "border-[#3c3c3c] bg-[#252526]" : "border-[#d4d4d4] bg-[#ececec]"}`;
	const segBtn = cx
		? `rounded px-1.5 py-0.5 text-[10px] font-bold uppercase disabled:opacity-40`
		: `rounded-md px-3 py-1.5 text-xs font-bold uppercase disabled:opacity-40`;
	const agentSelectCls = cx
		? `w-full rounded border px-2 py-1 text-xs font-normal normal-case ${appearanceDark ? "border-[#3c3c3c] bg-[#252526] text-[#cccccc]" : "border-[#d4d4d4] bg-white text-[#333333]"}`
		: `rounded-lg border px-3 py-2 text-sm font-normal normal-case ${appearanceDark ? "border-[#3c3c3c] bg-[#252526] text-[#cccccc]" : "border-[#d4d4d4] bg-white text-[#333333]"}`;

	const slashMenu = useMemo(() => slashMenuAtCursor(input, caretPos), [input, caretPos]);
	const slashMenuKey = slashMenu ? slashMenu.filtered.map((c) => c.id).join("|") : "";
	const {
		planCatalogReady,
		planFiles,
		handoffPath,
		handoffSummary,
		setHandoffPath,
	} = usePlanHandoffSelection(planHandoffWorkspaceKey, connected);
	useEffect(() => {
		setSlashHighlight(0);
	}, [slashMenuKey]);

	const injectComposer = useCallback((t: string) => {
		setInput((prev) => (prev.trim() ? `${prev.trim()}\n\n${t}` : t));
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

	const applyPlanHandoff = (kind: "implement" | "review") => {
		const path = handoffPath;
		if (!path) {
			injectComposer(
				kind === "implement"
					? "No `plans/PLAN-*.md` file found yet — create one under `plans/` first."
					: "No `plans/PLAN-*.md` file found yet — create a plan file first, then run this again.",
			);
			return;
		}
		if (kind === "review") {
			onOpenPlanFileForReview?.(path);
		}
		injectComposer(kind === "implement" ? buildImplementPlanPrompt(path) : buildReviewPlanPrompt(path));
	};

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

	const slashListBorder = appearanceDark ? "border-[#ea580c]/35 bg-[#1e1e1e]" : "border-[#ea580c]/40 bg-white";
	const slashItemHi = appearanceDark
		? "bg-[#ea580c]/20 text-[#fed7aa]"
		: "bg-[#ea580c]/15 text-[#9a3412]";
	const slashItem = appearanceDark
		? "text-[#cccccc] hover:bg-[#2d2d2d]"
		: "text-[#333333] hover:bg-[#f5f5f5]";
	const slashMuted = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const slashAccent = appearanceDark ? "text-[#ea580c]" : "text-[#c2410c]";

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden" data-wop-chat-root>
			{cx ? (
				<div
					className={`flex shrink-0 items-center gap-2 border-b px-2 py-1.5 ${borderHero} ${appearanceDark ? "bg-[#1e1e1e]" : "bg-[#f3f3f3]"}`}
				>
					<Brain className="shrink-0 text-[#fb923c]" size={18} aria-hidden />
					<div className="min-w-0 flex-1">
						<div className={`truncate text-sm font-bold ${titleC}`}>{assistantTitle}</div>
						<div className={`truncate text-[10px] ${subC}`}>{assistantSubtitle}</div>
					</div>
				</div>
			) : (
				<div
					className={`shrink-0 border-b px-4 py-3 md:px-8 md:py-4 ${borderHero} ${appearanceDark ? "bg-[#1e1e1e]" : "bg-[#f3f3f3]"}`}
				>
					<div className="mx-auto flex w-full max-w-3xl items-center gap-4">
						<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#ea580c]/30 bg-[#ea580c]/20 shadow-sm">
							<Brain className="text-[#fb923c]" size={28} />
						</div>
						<div className="min-w-0 flex-1">
							<h1 className={`text-2xl font-extrabold tracking-tight ${titleC}`}>
								Chat with {assistantTitle}
							</h1>
							<p className={`text-sm font-medium ${subC}`}>{assistantSubtitle}</p>
							{phraseDispatchNote ? (
								<p className={`mt-1 max-w-xl text-xs leading-snug ${subC}`}>{phraseDispatchNote}</p>
							) : null}
						</div>
					</div>
				</div>
			)}
			<div
				className={`flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden ${appearanceDark ? "" : "bg-[#f3f3f3]"}`}
			>
				<div className={`mx-auto flex w-full flex-col ${transcriptMax} ${transcriptPad} ${transcriptGap}`}>
					{!connected ? (
						<div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
							Connecting to server…
						</div>
					) : null}
					{error ? (
						<div className="w-full rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-left text-sm text-red-300">
							<p className="whitespace-pre-wrap">{error}</p>
							<div className={`mt-3 flex flex-wrap items-center gap-2 ${subC}`}>
								{onReopenLlmFixModal && chatErrorSuggestsModelFix(error) ? (
									<button
										type="button"
										onClick={onReopenLlmFixModal}
										className="rounded-lg border border-[#ea580c]/50 bg-[#ea580c]/20 px-3 py-1.5 text-xs font-semibold text-[#fdba74] hover:bg-[#ea580c]/30"
									>
										Fix model / provider…
									</button>
								) : null}
								<button
									type="button"
									onClick={onClearError}
									className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs hover:bg-red-500/15"
								>
									Dismiss
								</button>
							</div>
						</div>
					) : null}
					{attachErr ? (
						<div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
							{attachErr}
							<button type="button" className="ml-2 underline" onClick={() => setAttachErr(null)}>
								Dismiss
							</button>
						</div>
					) : null}

					{rows.map((msg) => (
						<div
							key={msg.id}
							className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
						>
							<div
								className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm ${
									msg.role === "user"
										? "border-[#ea580c]/30 bg-[#ea580c]/20 text-[#fb923c]"
										: appearanceDark
											? "border-[#3c3c3c] bg-[#3c3c3c] text-[#cccccc]"
											: "border-[#e5e5e5] bg-[#e8e8e8] text-[#616161]"
								}`}
							>
								{msg.role === "user" ? <Users size={18} /> : <Cpu size={18} />}
							</div>
							<div
								className={`flex max-w-[85%] flex-col gap-1.5 md:max-w-[80%] ${
									msg.role === "user" ? "items-end" : "items-start"
								}`}
							>
								<span className={`px-1 text-[13px] font-bold ${subC}`}>
									{msg.role === "user" ? "You" : assistantTitle}
								</span>
								<div
									className={`rounded-2xl p-5 shadow-sm ${
										msg.role === "user"
											? appearanceDark
												? "rounded-tr-sm border border-[#ea580c]/30 bg-[#ea580c]/10 text-[#d4d4d4]"
												: "rounded-tr-sm border border-[#ea580c]/40 bg-[#ea580c]/12 text-[#333333]"
											: appearanceDark
												? "rounded-tl-sm border border-[#3c3c3c] bg-[#252526] text-[#cccccc]"
												: "rounded-tl-sm border border-[#e5e5e5] bg-white text-[#333333]"
									}`}
								>
									{msg.role === "assistant" ? (
										<div className="flex flex-col gap-2">
											{showModelThinking && msg.reasoning?.trim() ? (
												<div
													className={`mb-1 rounded-xl border p-3 ${
														appearanceDark
															? "border-[#6366f1]/30 bg-[#1e1b4b]/35"
															: "border-indigo-200 bg-indigo-50/90"
													}`}
												>
													<div
														className={`mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide ${
															appearanceDark ? "text-[#a5b4fc]" : "text-indigo-800"
														}`}
													>
														<Brain size={14} className="shrink-0 opacity-90" />
														Thinking
													</div>
													<div
														className={`whitespace-pre-wrap text-[13px] leading-relaxed ${
															appearanceDark ? "text-[#c7d2fe]" : "text-indigo-950"
														}`}
													>
														{msg.reasoning}
													</div>
												</div>
											) : null}
											{parseMessageSegments(msg.content).map((seg, i) =>
												seg.type === "text" ? (
													<p key={i} className="whitespace-pre-wrap text-[15px] leading-relaxed">
														{seg.text}
													</p>
												) : (
													<div
														key={i}
														className={`mt-2 overflow-hidden rounded-xl border shadow-inner first:mt-0 ${
															appearanceDark
																? "border-[#3c3c3c] bg-[#1e1e1e]"
																: "border-[#e5e5e5] bg-[#f3f3f3]"
														}`}
													>
														<div
															className={`flex items-center justify-between border-b px-4 py-3 ${
																appearanceDark
																	? "border-[#3c3c3c] bg-[#252526]"
																	: "border-[#e5e5e5] bg-[#ececec]"
															}`}
														>
															<span
																className={`flex items-center gap-2 font-mono text-sm ${appearanceDark ? "text-[#cccccc]" : "text-[#333333]"}`}
															>
																<FileCode2 size={16} className="text-[#fb923c]" />
																{seg.filename}
															</span>
															<span
																className={`rounded-md px-2 py-1 text-xs font-bold uppercase tracking-wider ${appearanceDark ? "bg-[#3c3c3c] text-[#858585]" : "bg-[#e8e8e8] text-[#616161]"}`}
															>
																{languageLabel(seg.language)} code
															</span>
														</div>
														<pre
															className={`overflow-x-auto whitespace-pre p-4 font-mono text-[14px] leading-relaxed ${appearanceDark ? "text-[#cccccc]" : "text-[#333333]"}`}
														>
															{seg.body}
														</pre>
													</div>
												),
											)}
										</div>
									) : (
										<p className="whitespace-pre-wrap text-[15px] leading-relaxed">{msg.content}</p>
									)}
								</div>
								<span className={`px-1 text-[11px] ${appearanceDark ? "text-[#858585]" : "text-[#616161]"}`}>
									{new Date(msg.timestamp || Date.now()).toLocaleTimeString()}
								</span>
							</div>
						</div>
					))}

					{streaming ? (
						chatStreamUiEnabled ? (
							<div className="flex gap-4">
								<div
									className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm ${appearanceDark ? "border-[#3c3c3c] bg-[#3c3c3c] text-[#cccccc]" : "border-[#e5e5e5] bg-[#e8e8e8] text-[#616161]"}`}
								>
									<Cpu size={18} />
								</div>
								<div className="flex max-w-[80%] flex-col items-start gap-1.5">
									<span className={`px-1 text-[13px] font-bold ${subC}`}>{assistantTitle}</span>
									<div
										className={`flex h-14 items-center gap-1.5 rounded-2xl rounded-tl-sm border px-5 shadow-sm ${appearanceDark ? "border-[#3c3c3c] bg-[#252526]" : "border-[#e5e5e5] bg-white"}`}
									>
										<div className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#858585]" />
										<div
											className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#858585]"
											style={{ animationDelay: "150ms" }}
										/>
										<div
											className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#858585]"
											style={{ animationDelay: "300ms" }}
										/>
									</div>
								</div>
							</div>
						) : (
							<div className="flex gap-4">
								<div
									className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm ${appearanceDark ? "border-[#3c3c3c] bg-[#3c3c3c] text-[#cccccc]" : "border-[#e5e5e5] bg-[#e8e8e8] text-[#616161]"}`}
								>
									<Cpu size={18} />
								</div>
								<div className="flex max-w-[80%] flex-col items-start gap-1.5">
									<span className={`px-1 text-[13px] font-bold ${subC}`}>{assistantTitle}</span>
									<p
										className={`rounded-2xl rounded-tl-sm border px-4 py-3 text-sm leading-relaxed shadow-sm ${appearanceDark ? "border-[#3c3c3c] bg-[#252526] text-[#858585]" : "border-[#e5e5e5] bg-white text-[#616161]"}`}
									>
										Generating reply…
									</p>
								</div>
							</div>
						)
					) : null}
					<div ref={endRef} />
				</div>
			</div>

			<div className={`z-20 shrink-0 ${composerPad} ${composerOuter}`}>
				<div
					className={`mx-auto flex w-full ${transcriptMax} border-t ${toolBarPt} ${appearanceDark ? "border-[#3c3c3c]" : "border-[#e5e5e5]"} ${cx ? "mb-2 flex-col gap-2" : "mb-3 flex-wrap items-end gap-3"}`}
				>
					<label className={`flex ${cx ? "w-full min-w-0" : "min-w-[200px] flex-1"} flex-col gap-0.5 ${toolLbl}`}>
						Workspace agent
						<select
							value={chatAgentName ?? ""}
							disabled={!connected || streaming || agentsLoading}
							title={`${sessionLeadFallback} = session lead (phrase-dispatch can still merge a specialist for one reply). Pick a row to load that agent's .md into every turn until you switch back.`}
							onChange={(e) => {
								const v = e.target.value;
								onChatAgentChange(v === "" ? null : v);
							}}
							className={agentSelectCls}
						>
							<option value="">{sessionLeadFallback} (session lead)</option>
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
									title="Listed in teams.yaml but no matching agent `.md` under agents/, .pi/agents/, .claude/agents/, or .cursor/agents/ yet."
								>
									{workspaceAgentDisplayName(name)} (no .md yet)
								</option>
							))}
						</select>
					</label>
					<div className={cx ? "flex min-w-0 flex-wrap items-end gap-x-2 gap-y-1" : "contents"}>
					<div className={`flex min-w-0 flex-col ${cx ? "gap-0" : "gap-1"}`}>
						<span className={toolLbl}>Mode</span>
						<div
							className={segShell}
							title="Shift+Tab in the message box toggles Plan/Build when slash completion is closed"
						>
							<button
								type="button"
								disabled={streaming}
								onClick={() => onChatModeChange("build")}
								className={`${segBtn} ${
									chatMode === "build"
										? "bg-[#ea580c] text-white"
										: appearanceDark
											? "text-[#858585]"
											: "text-[#616161]"
								}`}
							>
								Build
							</button>
							<button
								type="button"
								disabled={streaming}
								onClick={() => onChatModeChange("plan")}
								className={`${segBtn} ${
									chatMode === "plan"
										? "bg-[#c586c0]/90 text-white"
										: appearanceDark
											? "text-[#858585]"
											: "text-[#616161]"
								}`}
							>
								Plan
							</button>
						</div>
					</div>
					<div className={`flex flex-col ${cx ? "gap-0" : "gap-1"}`}>
						<span className={toolLbl} title="Live stream shows tokens as they arrive; off waits for the full reply">
							Stream
						</span>
						<div className={segShell}>
							<button
								type="button"
								disabled={streaming}
								aria-pressed={chatStreamUiEnabled}
								onClick={() => onChatStreamUiEnabledChange(true)}
								className={`${segBtn} ${
									chatStreamUiEnabled
										? "bg-[#ea580c] text-white"
										: appearanceDark
											? "text-[#858585]"
											: "text-[#616161]"
								}`}
								title="Show the reply as it streams (token by token)"
							>
								On
							</button>
							<button
								type="button"
								disabled={streaming}
								aria-pressed={!chatStreamUiEnabled}
								onClick={() => onChatStreamUiEnabledChange(false)}
								className={`${segBtn} ${
									!chatStreamUiEnabled
										? "bg-[#ea580c] text-white"
										: appearanceDark
											? "text-[#858585]"
											: "text-[#616161]"
								}`}
								title="Hide streaming; show the full message when the model finishes"
							>
								Off
							</button>
						</div>
					</div>
					<div className={`flex flex-col ${cx ? "gap-0" : "gap-1"}`}>
						<span
							className={toolLbl}
							title="When the model streams separate reasoning (Pi JSON, OpenRouter, etc.), show it above each reply"
						>
							Thinking
						</span>
						<div className={segShell}>
							<button
								type="button"
								aria-pressed={showModelThinking}
								onClick={() => {
									setShowModelThinking(true);
									writeShowModelThinking(true);
								}}
								className={`${segBtn} ${
									showModelThinking
										? appearanceDark
											? "bg-[#312e81]/80 text-[#c7d2fe]"
											: "bg-indigo-600 text-white"
										: appearanceDark
											? "text-[#858585]"
											: "text-[#616161]"
								}`}
								title="Show model reasoning / thinking above assistant messages when the provider sends it"
							>
								On
							</button>
							<button
								type="button"
								aria-pressed={!showModelThinking}
								onClick={() => {
									setShowModelThinking(false);
									writeShowModelThinking(false);
								}}
								className={`${segBtn} ${
									!showModelThinking
										? appearanceDark
											? "bg-[#3c3c3c] text-[#cccccc]"
											: "bg-[#d4d4d4] text-[#333333]"
										: appearanceDark
											? "text-[#858585]"
											: "text-[#616161]"
								}`}
								title="Hide reasoning blocks in the transcript (saved text is unchanged)"
							>
								Off
							</button>
						</div>
					</div>
					</div>
					{chatMode === "plan" ? (
						<div
							className={`flex w-full basis-full flex-wrap items-center border-t ${cx ? "gap-1.5 pt-2" : "gap-3 pt-3"} ${appearanceDark ? "border-[#3c3c3c]" : "border-[#e5e5e5]"}`}
						>
							{planCatalogReady && planFiles.length > 0 ? (
								<select
									disabled={streaming}
									value={handoffPath ?? planFiles[0]!.path}
									onChange={(e) => setHandoffPath(e.target.value)}
									className={`min-w-[160px] flex-1 cursor-pointer rounded-lg border px-3 py-2 text-sm disabled:opacity-40 ${appearanceDark ? "border-[#3c3c3c] bg-[#252526] text-[#c586c0]" : "border-[#d4d4d4] bg-white text-[#7c3aed]"}`}
									title="Plan file for From plan / Review plan (saved per workspace)"
									aria-label="Plan markdown file"
								>
									{planFiles.map((f) => (
										<option key={f.path} value={f.path} title={f.path}>
											{f.path.replace(/^plans\//, "")}
										</option>
									))}
								</select>
							) : null}
							{handoffSummary ? (
								<span className={`font-mono text-[10px] ${subC}`} title={handoffSummary.path}>
									{handoffSummary.doneTodos} done · {handoffSummary.openTodos} open
								</span>
							) : null}
							<div className="flex-1" />
							<button
								type="button"
								disabled={streaming || !connected || !planCatalogReady || !handoffPath}
								onClick={() => applyPlanHandoff("implement")}
								className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${
									appearanceDark
										? "border-[#3c3c3c] bg-[#1e1e1e] text-[#cccccc] hover:border-[#ea580c]/50"
										: "border-[#d4d4d4] bg-white text-[#333333] hover:border-[#ea580c]/50"
								} disabled:opacity-40`}
								title="Insert a Build handoff for the selected plan file"
							>
								From plan
							</button>
							<button
								type="button"
								disabled={streaming || !connected || !planCatalogReady || !handoffPath}
								onClick={() => applyPlanHandoff("review")}
								className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${
									appearanceDark
										? "border-[#3c3c3c] bg-[#1e1e1e] text-[#cccccc] hover:border-[#c586c0]/50"
										: "border-[#d4d4d4] bg-white text-[#333333] hover:border-[#c586c0]/50"
								} disabled:opacity-40`}
								title="Open the selected plan in the document pane and insert a short review prompt"
							>
								Review plan
							</button>
						</div>
					) : null}
				</div>
				{attachment ? (
					<div className="mx-auto mb-2 flex max-w-3xl items-center justify-between rounded-xl border border-[#ea580c]/40 bg-[#ea580c]/10 px-3 py-2 text-sm text-[#fed7aa]">
						<span className="truncate font-mono text-xs">Attached: {attachment.name}</span>
						<button
							type="button"
							onClick={() => setAttachment(null)}
							className="shrink-0 rounded p-1 hover:bg-[#ea580c]/20"
							aria-label="Remove attachment"
						>
							<X size={16} />
						</button>
					</div>
				) : null}
				{chatQueuePending > 0 ? (
					<button
						type="button"
						onClick={() => setQueueModalOpen(true)}
						disabled={!connected}
						className={`mx-auto mb-2 block max-w-3xl rounded-lg border border-[#ea580c]/35 bg-[#ea580c]/10 px-3 py-2 text-center text-xs font-medium transition-colors hover:bg-[#ea580c]/20 disabled:cursor-not-allowed disabled:opacity-50 ${appearanceDark ? "text-[#fdba74]" : "text-[#9a3412]"}`}
						title="View, edit, remove, or prioritize queued messages"
					>
						{chatQueuePending} message{chatQueuePending === 1 ? "" : "s"} queued — will run after the current reply.
						<span className={`mt-0.5 block text-[10px] font-normal ${appearanceDark ? "text-[#fdba74]/80" : "text-[#c2410c]/90"}`}>
							Click to manage queue
						</span>
					</button>
				) : null}
				{queueModalOpen ? (
					<ChatQueueModal
						open={queueModalOpen}
						onClose={() => setQueueModalOpen(false)}
						items={chatQueueItems}
						connected={connected}
						streaming={streaming}
						onEdit={(id, text) => onChatQueueEdit?.(id, text)}
						onDelete={(id) => onChatQueueDelete?.(id)}
						onForce={(id) => onChatQueueForce?.(id)}
						appearanceDark={appearanceDark}
					/>
				) : null}
				{planNudgeOpen ? (
					<div
						className={`mx-auto mb-2 flex max-w-3xl flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
							appearanceDark
								? "border-[#c586c0]/40 bg-[#c586c0]/10 text-[#e9d5ff]"
								: "border-[#c586c0]/35 bg-[#faf5ff] text-[#6b21a8]"
						}`}
					>
						<span className="min-w-0 flex-1 font-medium">
							That message looked multi-step. Try <strong>Plan</strong> for planner-style instructions on the next
							reply.
						</span>
						<div className="flex shrink-0 gap-2">
							<button
								type="button"
								disabled={streaming}
								className={`rounded-lg px-2 py-1 text-[11px] font-bold text-white disabled:opacity-40 ${
									appearanceDark ? "bg-[#c586c0]" : "bg-[#9333ea]"
								}`}
								onClick={() => {
									onChatModeChange("plan");
									setPlanNudgeOpen(false);
								}}
							>
								Switch to Plan
							</button>
							<button
								type="button"
								className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${
									appearanceDark ? "border-[#555] text-[#cccccc]" : "border-[#d4d4d4] text-[#333333]"
								}`}
								onClick={() => setPlanNudgeOpen(false)}
							>
								Dismiss
							</button>
						</div>
					</div>
				) : null}
				<form
					onSubmit={submit}
					className={`relative mx-auto flex ${transcriptMax} flex-col gap-0 rounded-2xl border shadow-md transition-all focus-within:border-[#ea580c] focus-within:ring-1 focus-within:ring-[#ea580c]/40 ${composerBg} ${cx ? "p-1.5" : "p-2.5"}`}
				>
					<input
						ref={fileRef}
						type="file"
						className="hidden"
						accept=".txt,.md,.ts,.tsx,.js,.jsx,.json,.yaml,.yml,.py,.rs,.go,.css,.html,.sh,.env.sample"
						onChange={(e) => void onPickFile(e.target.files)}
					/>
					<div className="flex w-full items-end gap-2">
					<button
						type="button"
						onClick={() => fileRef.current?.click()}
						disabled={!connected}
						className={`rounded-xl transition-colors disabled:opacity-40 ${cx ? "p-2" : "p-3"} ${appearanceDark ? "text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]" : "text-[#616161] hover:bg-[#e5e5e5] hover:text-[#333333]"}`}
						title="Attach a text file (appended to your message)"
					>
						<Paperclip size={cx ? 18 : 22} />
					</button>
					<div className="relative min-w-0 flex-1">
						{slashMenu && slashMenu.filtered.length > 0 ? (
							<ul
								className={`absolute bottom-full left-0 right-0 z-20 mb-1 max-h-52 overflow-auto rounded-lg border py-1 shadow-lg ${slashListBorder}`}
								role="listbox"
								aria-label="Slash commands"
							>
								{slashMenu.filtered.map((c, i) => (
									<li key={c.id}>
										<button
											type="button"
											role="option"
											aria-selected={i === slashHighlight}
											className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left font-mono text-[11px] leading-snug ${
												i === slashHighlight ? slashItemHi : slashItem
											}`}
											onMouseEnter={() => setSlashHighlight(i)}
											onMouseDown={(ev) => {
												ev.preventDefault();
												applySlashPick(c.id, slashMenu);
											}}
										>
											<span className={`font-bold ${slashAccent}`}>/{c.id}</span>
											<span className={`text-[10px] font-normal ${slashMuted}`}>{c.detail}</span>
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
								if (e.key === "Tab" && e.shiftKey && !streaming) {
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
									? `Tell ${assistantTitle} what to do next… (Send when connected)`
									: `Tell ${assistantTitle} what to do next…`
							}
							rows={2}
							className={`max-h-60 w-full resize-none border-none bg-transparent pl-2 pr-10 font-medium outline-none ring-0 placeholder:text-[#858585] ${cx ? "min-h-[50px] py-2.5 pb-9 text-[14px]" : "min-h-[64px] py-3.5 pb-11 text-[15px]"} ${appearanceDark ? "text-[#cccccc]" : "text-[#333333]"}`}
						/>
						<div
							className={`pointer-events-none absolute bottom-1.5 right-1.5 z-30 flex items-center justify-center rounded-full p-0.5 shadow-sm ring-1 ring-[#555]/50 ${
								appearanceDark ? "bg-[#1e1e1e]/85" : "bg-white/90"
							}`}
						>
							<ContextUsageRing
								contextFillPct={contextFillPct}
								title={contextTitle}
								appearanceDark={appearanceDark}
								sizePx={cx ? 18 : 22}
								className="pointer-events-auto opacity-95"
							/>
						</div>
					</div>
					<div className="flex gap-2 p-1">
						{streaming ? (
							<button
								type="button"
								onClick={onStop}
								aria-label="Stop generation"
								className={`flex items-center gap-1.5 rounded-sm border border-[#ef4444] bg-[#450a0a] font-bold uppercase tracking-wide text-[#fecaca] shadow-sm transition-colors hover:bg-[#7f1d1d] active:scale-95 ${cx ? "px-3 py-2 text-[11px]" : "gap-2 px-6 py-3 text-sm"}`}
							>
								<Square size={cx ? 12 : 14} className="shrink-0" fill="currentColor" />
								<span className={cx ? "inline" : "hidden sm:inline"}>Stop</span>
							</button>
						) : (
							<button
								type="submit"
								disabled={!canSend}
								aria-label="Send message"
								className={`flex items-center gap-1.5 rounded-sm bg-[#c2410c] font-bold uppercase tracking-wide text-[#d4d4d4] shadow-sm transition-colors hover:bg-[#9a3412] disabled:bg-[#3c3c3c] disabled:text-[#858585] active:scale-95 ${cx ? "px-3 py-2 text-[11px]" : "gap-2 px-6 py-3 text-sm"}`}
							>
								<Send size={cx ? 16 : 18} className="shrink-0 text-[#d4d4d4]" />
								<span className={cx ? "inline" : "hidden sm:inline"}>Send</span>
							</button>
						)}
					</div>
					</div>
				</form>
			</div>
		</div>
	);
}
