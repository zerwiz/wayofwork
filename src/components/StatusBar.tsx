import {
	Activity,
	AlertCircle,
	Bot,
	Braces,
	CheckCircle2,
	FileText,
	GitBranch,
	MessageSquare,
	PanelBottom,
	PanelLeft,
	PanelTop,
	ScrollText,
	Search,
	Settings,
	Sparkles,
	TerminalSquare,
	Users,
	Zap,
} from "lucide-react";
import type { ChatSessionMode } from "../hooks/useWayOfPiSession";
import type { UiMode } from "../hooks/useUiMode";
import type { BottomPanelTab } from "../types/technicalShell";
import { HORIZONTAL_TOOL_DOCK_SLOTS, type HorizontalToolDockSlot } from "../utils/technicalLayoutStorage";
import { workspaceAgentDisplayName } from "../utils/workspaceAgentDisplay";

const TOOL_TAB_ORDER: BottomPanelTab[] = [
	"problems",
	"output",
	"tool_log",
	"agent_log",
	"terminal",
	"agent_team",
	"agent_chat",
];

/**
 * Zed-style status bar icons (see Zed docs: project_panel, terminal, collaboration_panel,
 * agent, search, git_panel, diagnostics buttons — each toggles or focuses a dock/panel).
 */
export type TechnicalZedStatusStrip = {
	onToggleLeftSidebar: () => void;
	leftSidebarVisible: boolean;
	/** Focus / reveal the terminal tool tab (Zed `terminal.button`). */
	onFocusTerminal: () => void;
	terminalDockedVisible: boolean;
	/** Open Plan / Build activity (closest local analogue to Zed collaboration strip). */
	onFocusPlanning: () => void;
	planningActive: boolean;
	/** Toggle agent / session chat column (Zed `agent.button`). */
	onToggleAgent: () => void;
	agentVisible: boolean;
	/** Focus workspace search in the primary sidebar (Zed `search.button`). */
	onFocusSearch: () => void;
	searchActive: boolean;
	/** Focus source control in the primary sidebar (Zed `git_panel.button`). */
	onFocusScm: () => void;
	scmActive: boolean;
	/** Focus Problems / diagnostics (Zed `diagnostics`). */
	onFocusDiagnostics: () => void;
	problemsVisible: boolean;
	/** Open settings / preferences (Zed settings entrypoints). */
	onOpenSettings: () => void;
	/** Count from workspace static analysis (ESLint / tsc) for the diagnostics glyph. */
	diagnosticsCount?: number;
};

const zedBtn = (active: boolean, technical: boolean) =>
	`flex h-full max-h-[22px] items-center justify-center rounded px-1.5 transition-colors ${
		technical
			? active
				? "bg-white/20 text-white"
				: "text-white/80 hover:bg-white/15 hover:text-white"
			: active
				? "bg-zinc-300 text-zinc-900"
				: "text-zinc-600 hover:bg-zinc-200/90 hover:text-zinc-900"
	}`;

export function StatusBar({
	uiMode,
	workspaceRoot,
	connected,
	line,
	col,
	language,
	contextPct,
	tokensDown,
	tokensUp,
	contextTitle,
	tokensTitle,
	onCopyWorkspacePath,
	simpleAppearanceDark,
	technicalToolDock,
	technicalZedStrip,
	diagnosticsSummary,
	chatMode,
	chatAgentName,
}: {
	uiMode: string;
	workspaceRoot: string;
	connected: boolean;
	line: number;
	col: number;
	language: string;
	contextPct: string;
	tokensDown: string;
	tokensUp: string;
	/** Tooltip for context meter (Pi-style used / window). */
	contextTitle?: string;
	/** Tooltip for cumulative ↓/↑ tokens. */
	tokensTitle?: string;
	onCopyWorkspacePath?: () => void;
	simpleAppearanceDark?: boolean;
	technicalToolDock?: {
		onReveal: (id: BottomPanelTab) => void;
		isVisible: (id: BottomPanelTab) => boolean;
		/** Same dock system for each slot; status bar shows one toggle icon per slot that has tabs. */
		horizontalDockStrip?: Partial<
			Record<
				HorizontalToolDockSlot,
				{ hasStrip: boolean; onToggle: () => void; stripHidden: boolean }
			>
		>;
	};
	technicalZedStrip?: TechnicalZedStatusStrip | null;
	/** Footer + Zed strip: ESLint/tsc totals; click footer to open Problems. */
	diagnosticsSummary?: {
		total: number;
		errors: number;
		warnings: number;
		onOpenProblems: () => void;
	} | null;
	chatMode?: ChatSessionMode;
	chatAgentName?: string | null;
}) {
	const technical = uiMode !== "simple";
	const simpleLight = !technical && simpleAppearanceDark === false;
	const isDocs = uiMode === "docs";

	const barClass = isDocs
		? "bg-[#0f172a] text-white h-[26px] font-sans text-[12px]"
		: simpleLight
			? "border-t border-[#e5e5e5] bg-[#ececec] text-[#333333] h-[26px] font-sans text-[12px]"
			: `bg-[#ea580c] text-white ${technical ? "h-[24px] font-mono text-[11px]" : "h-[26px] font-sans text-[12px]"}`;

	const toolIcon = (id: BottomPanelTab) => {
		switch (id) {
			case "problems":
				return <AlertCircle size={12} />;
			case "output":
				return <Braces size={12} />;
			case "tool_log":
				return <ScrollText size={12} />;
			case "agent_log":
				return <Bot size={12} />;
			case "terminal":
				return <TerminalSquare size={12} />;
			case "agent_team":
				return <Users size={12} />;
			case "agent_chat":
				return <MessageSquare size={12} />;
			default:
				return null;
		}
	};

	const toolLabel = (id: BottomPanelTab) => {
		switch (id) {
			case "problems":
				return "Problems";
			case "output":
				return "Output";
			case "tool_log":
				return "Tool log";
			case "agent_log":
				return "Agent log";
			case "terminal":
				return "Terminal";
			case "agent_team":
				return "Team pulse";
			case "agent_chat":
				return "Agent chat";
			default:
				return id;
		}
	};

	const zed = technicalZedStrip;
	const diagCount = diagnosticsSummary?.total ?? zed?.diagnosticsCount ?? 0;
	const diagClean = zed != null && diagCount === 0;

	return (
		<footer className={`z-20 flex shrink-0 select-none items-center justify-between px-2 ${barClass}`}>
			<div className="flex h-full min-w-0 items-center gap-1 sm:gap-2">
				{isDocs && (
					<div className="flex items-center gap-1.5 border-r border-white/20 pr-3 mr-1">
						<div className="flex h-5 w-5 items-center justify-center rounded-sm bg-blue-500/20 text-blue-400">
							<FileText size={12} strokeWidth={3} />
						</div>
						<span className="text-[10px] font-black uppercase tracking-[0.2em]">Docs</span>
					</div>
				)}
				{technical && zed ? (
					<div
						className={`flex h-full items-center gap-0.5 ${technical ? "border-r border-white/25 pr-2" : "border-r border-zinc-300 pr-2"}`}
					>
						<button
							type="button"
							title="Project panel — toggle Explorer / primary sidebar (Zed: project panel)"
							onClick={() => zed.onToggleLeftSidebar()}
							className={zedBtn(zed.leftSidebarVisible, technical)}
						>
							<PanelLeft size={13} strokeWidth={2} />
						</button>
						<button
							type="button"
							title="Terminal — show integrated terminal tab (Zed: terminal)"
							onClick={() => zed.onFocusTerminal()}
							className={zedBtn(zed.terminalDockedVisible, technical)}
						>
							<TerminalSquare size={13} strokeWidth={2} />
						</button>
						<button
							type="button"
							title="Plan / Build — workspace planning activity (Zed: collaboration panel analogue)"
							onClick={() => zed.onFocusPlanning()}
							className={zedBtn(zed.planningActive, technical)}
						>
							<Users size={13} strokeWidth={2} />
						</button>
						<button
							type="button"
							title="Session chat — toggle agent / chat panel (Ctrl+Alt+B, macOS: Cmd+Alt+B)"
							onClick={() => zed.onToggleAgent()}
							className={zedBtn(zed.agentVisible, technical)}
						>
							<MessageSquare size={13} strokeWidth={2} />
						</button>
						<div
							className={`mx-0.5 h-4 w-px shrink-0 ${technical ? "bg-white/30" : "bg-zinc-400/60"}`}
							aria-hidden
						/>
						<button
							type="button"
							title="Search — find in workspace (Zed: search)"
							onClick={() => zed.onFocusSearch()}
							className={zedBtn(zed.searchActive, technical)}
						>
							<Search size={13} strokeWidth={2} />
						</button>
						<button
							type="button"
							title="Source control — Git / SCM sidebar (Zed: git panel)"
							onClick={() => zed.onFocusScm()}
							className={zedBtn(zed.scmActive, technical)}
						>
							<GitBranch size={13} strokeWidth={2} />
						</button>
						<button
							type="button"
							title="Diagnostics — Problems panel (Zed: diagnostics)"
							onClick={() => zed.onFocusDiagnostics()}
							className={zedBtn(zed.problemsVisible, technical)}
						>
							<Zap size={13} strokeWidth={2} />
						</button>
						<span
							className="pointer-events-none flex h-full max-h-[22px] items-center px-1.5 opacity-90"
							title={
								diagClean
									? "No problems in the last ESLint / TypeScript run (Problems panel)"
									: `${diagCount} issue(s) — open Problems for details`
							}
						>
							<CheckCircle2 size={13} strokeWidth={2} className={diagClean ? "text-[#89d185]" : "text-white/50"} />
						</span>
					</div>
				) : null}
				{technical && technicalToolDock ? (
					<div className="flex h-full items-center gap-0.5 border-r border-white/25 pr-2">
						{HORIZONTAL_TOOL_DOCK_SLOTS.map((slot) => {
							const row = technicalToolDock.horizontalDockStrip?.[slot];
							if (!row?.hasStrip) return null;
							const Icon = slot === "top" ? PanelTop : PanelBottom;
							const title =
								slot === "top" ? "Toggle upper dock strip (legacy)" : "Toggle horizontal dock under editor";
							return (
								<button
									key={slot}
									type="button"
									title={title}
									onClick={() => row.onToggle()}
									className={`flex h-full max-h-[22px] items-center rounded px-1.5 transition-colors hover:bg-white/20 ${
										row.stripHidden ? "opacity-60" : "opacity-100"
									}`}
								>
									<Icon size={13} />
								</button>
							);
						})}
						{TOOL_TAB_ORDER.map((id) => {
							const vis = technicalToolDock.isVisible(id);
							return (
								<button
									key={id}
									type="button"
									title={`${toolLabel(id)}${vis ? "" : " (hidden)"} — show or focus`}
									onClick={() => technicalToolDock.onReveal(id)}
									className={`flex h-full max-h-[22px] items-center gap-1 rounded px-1.5 transition-colors hover:bg-white/20 ${
										vis ? "text-white" : "text-white/45"
									}`}
								>
									{toolIcon(id)}
									<span className="hidden xl:inline">{toolLabel(id)}</span>
								</button>
							);
						})}
					</div>
				) : null}
				<button
					type="button"
					title={connected ? "WebSocket connected" : "Disconnected"}
					className={`flex h-full cursor-default items-center gap-1.5 px-1 transition-colors ${simpleLight ? "hover:bg-zinc-200/80" : "hover:bg-white/20"}`}
				>
					<Activity size={12} className={connected && technical ? "text-[#89d185]" : undefined} />
					{connected ? (technical ? "live" : "Connected") : technical ? "offline" : "Offline"}
				</button>
				<button
					type="button"
					title={
						technical && diagnosticsSummary
							? diagCount > 0
								? `${diagnosticsSummary.errors} errors, ${diagnosticsSummary.warnings} warnings — open Problems`
								: "No errors or warnings — open Problems to run or refresh ESLint / TypeScript"
							: "Problems from workspace static analysis"
					}
					onClick={() => {
						if (technical && diagnosticsSummary) diagnosticsSummary.onOpenProblems();
					}}
					disabled={!technical || !diagnosticsSummary}
					className={`flex h-full max-w-[40vw] items-center gap-1.5 truncate px-1 transition-colors ${
						technical && diagnosticsSummary
							? simpleLight
								? "cursor-pointer hover:bg-zinc-200/80"
								: "cursor-pointer hover:bg-white/20"
							: simpleLight
								? "cursor-default hover:bg-zinc-200/80"
								: "cursor-default hover:bg-white/20"
					}`}
				>
					<AlertCircle size={12} className={diagCount > 0 ? "text-[#fbbf24]" : undefined} />
					{technical && diagnosticsSummary ? (
						<span className="font-mono tabular-nums">
							{diagnosticsSummary.errors > 0 ? (
								<span className="text-[#fecaca]">{diagnosticsSummary.errors}</span>
							) : null}
							{diagnosticsSummary.errors > 0 && diagnosticsSummary.warnings > 0 ? (
								<span className="text-white/50"> · </span>
							) : null}
							{diagnosticsSummary.warnings > 0 ? (
								<span className="text-[#fef08a]">{diagnosticsSummary.warnings}</span>
							) : null}
							{diagnosticsSummary.errors === 0 && diagnosticsSummary.warnings === 0 ? (
								<span className="text-white/90">0</span>
							) : null}
						</span>
					) : technical ? (
						String(diagCount)
					) : (
						"No issues"
					)}
				</button>
				{technical && chatMode ? (
					<span
						className="hidden h-full cursor-default items-center px-1 font-mono text-[10px] font-bold uppercase tracking-wide text-white/95 hover:bg-white/20 sm:flex"
						title={chatMode === "plan" ? "Plan mode (structured planning)" : "Build mode"}
					>
						{chatMode}
					</span>
				) : null}
				{technical ? (
					<span
						className="hidden max-w-[28vw] cursor-default truncate px-1 font-mono text-[10px] text-white/90 hover:bg-white/20 lg:inline"
						title="Agent persona from workspace .md (see chat panel)"
					>
						{chatAgentName ? workspaceAgentDisplayName(chatAgentName) : "agent: orchestrator"}
					</span>
				) : null}
				<button
					type="button"
					title={onCopyWorkspacePath ? "Click to copy workspace path" : undefined}
					onClick={() => onCopyWorkspacePath?.()}
					disabled={!onCopyWorkspacePath}
					className={`flex h-full max-w-[28vw] items-center truncate px-1 transition-colors sm:max-w-[30vw] ${
						simpleLight ? "hover:bg-zinc-200/80" : "hover:bg-white/20"
					} ${onCopyWorkspacePath ? "cursor-pointer" : "cursor-default"}`}
				>
					{workspaceRoot}
				</button>
			</div>
			{technical ? (
				<div className="flex h-full shrink-0 items-center gap-1 sm:gap-2">
					{zed ? (
						<>
							<span
								className="hidden cursor-default items-center gap-1 px-1 font-mono text-[10px] tabular-nums text-white/90 sm:flex"
								title={
									diagCount > 0
										? `${diagCount} problem(s) from last ESLint / TypeScript run`
										: "No problems in last run (◇ = Zed-style diagnostics strip)"
								}
							>
								{diagCount > 0 ? <span className="text-[#cca700]">{diagCount}</span> : null}
								<span className="text-white/50">◇</span>
							</span>
							<div className="hidden h-4 w-px bg-white/30 sm:block" aria-hidden />
							<button
								type="button"
								title="Settings — preferences (Zed: settings)"
								onClick={() => zed.onOpenSettings()}
								className="flex h-full max-h-[22px] items-center rounded px-1.5 text-white/90 transition-colors hover:bg-white/20"
							>
								<Settings size={14} strokeWidth={2} />
							</button>
							<button
								type="button"
								title="Agent — show session chat (Zed: agent / AI sparkle)"
								onClick={() => zed.onToggleAgent()}
								className={`flex h-full max-h-[22px] items-center rounded px-1.5 transition-colors hover:bg-white/20 ${
									zed.agentVisible ? "bg-white/20 text-white" : "text-sky-200"
								}`}
							>
								<Sparkles size={14} strokeWidth={2} />
							</button>
							<div className="hidden h-4 w-px bg-white/30 md:block" aria-hidden />
						</>
					) : null}
					<button
						type="button"
						title="Cursor position in editor"
						className="hidden h-full cursor-default items-center px-1 hover:bg-white/20 sm:inline-flex"
					>
						Ln {line}, Col {col}
					</button>
					<button
						type="button"
						title="Encoding (display only)"
						className="hidden h-full cursor-default items-center px-1 hover:bg-white/20 md:flex"
					>
						UTF-8
					</button>
					<button
						type="button"
						title="Language / grammar for open file (Zed: active language)"
						className="flex h-full cursor-default items-center px-1 hover:bg-white/20"
					>
						{language}
					</button>
					<button
						type="button"
						title={contextTitle ?? "Context window fill (Pi-style meter)"}
						className="hidden h-full cursor-default items-center gap-1.5 px-1 hover:bg-white/20 lg:flex"
					>
						ctx: {contextPct}
					</button>
					<button
						type="button"
						title={tokensTitle ?? "Session token totals (prompt-side ↓ / completion ↑)"}
						className="hidden h-full cursor-default items-center gap-1.5 px-1 hover:bg-white/20 xl:flex"
					>
						tokens: {tokensDown} ↓ / {tokensUp} ↑
					</button>
				</div>
			) : (
				<div className={`flex h-full items-center gap-3 ${simpleLight ? "text-zinc-700" : "text-white/90"}`}>
					<span className="hidden sm:inline" title="Editor language when a file is open">
						{language}
					</span>
				</div>
			)}
		</footer>
	);
}
