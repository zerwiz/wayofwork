import {
	Activity,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	CircleDot,
	ExternalLink,
	Info,
	Search,
	TerminalSquare,
	Zap,
	Monitor,
	Box,
} from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import type { PiModelConfigPath } from "../constants/piModelConfigPaths";
import { PI_MODEL_CONFIG_ENTRIES } from "../constants/piModelConfigPaths";
import type { ServerConfig } from "../hooks/useServerConfig";
import type { ChatSessionMode } from "../hooks/useWayOfPiSession";
import type { useLlmModels } from "../hooks/useLlmModels";
// UiMode typed as string
import type {
	BottomPanelTab,
	TechnicalActivity,
	ViewMenuSimpleOptions,
	ViewMenuTechnicalOptions,
} from "../types/technicalShell";
import type { FileMenuProps } from "../types/fileMenu";
import type {
	EditMenuHandlers,
	GoMenuHandlers,
	HelpMenuHandlers,
	RunMenuHandlers,
	SelectionMenuHandlers,
	SettingsMenuHandlers,
	TerminalMenuHandlers,
} from "../types/workspaceEditor";
import {
	HORIZONTAL_TOOL_DOCK_SLOTS,
	type ChatDockRegion,
	type HorizontalToolDockSlot,
} from "../utils/technicalLayoutStorage";
import { FileMenuContent } from "./FileMenuContent";
import { UiModeToggle } from "./UiModeToggle";

function menuBtnClass(disabled?: boolean) {
	return `block w-full px-3 py-1.5 text-left text-[13px] ${
		disabled
			? "cursor-not-allowed text-[#555]"
			: "cursor-pointer text-[#cccccc] hover:bg-[#007acc]/30 hover:text-white"
	}`;
}

function menuKbd(keys: string) {
	return <span className="float-right ml-4 font-mono text-[10px] text-[#858585]">{keys}</span>;
}

function viewFlyoutClass() {
	return "absolute left-full top-0 z-[70] ml-0.5 min-w-[272px] list-none border border-[#454545] bg-[#252526] py-1 shadow-xl";
}

export function MenuBar({
	modelLabel,
	uiMode,
	onUiModeChange,
	config,
	onOpenCommandPalette,
	onSave,
	canSave,
	onRevertFile,
	canRevert,
	onRefreshWorkspace,
	onCopyWorkspacePath,
	onSelectActivity,
	/** Unified horizontal tool docks (upper + lower bands); omit in Simple mode. */
	horizontalToolDockToggles,
	onFocusBottomTab,
	leftSidebarVisible,
	onToggleLeftSidebar,
	agentPanelVisible,
	agentChatDock,
	onSetAgentChatDock,
	onToggleAgentPanel,
	fileMenu,
	editMenu,
	selectionMenu,
	goMenu,
	runMenu,
	terminalMenu,
	helpMenu,
	/** Settings → workspace agents (Pi `.pi/agents`, `teams.yaml`) via My Team view. */
	onOpenAgentSetup,
	/** Settings → agent capability / approval preferences (browser-local). */
	onOpenAgentPermissions,
	settingsMenu,
	/** Agents → teams.yaml, new agent files, reload catalog. */
	onOpenTeamsYaml,
	onCreateAgentMarkdown,
	onReloadAgents,
	onOpenPiModelConfig,
	chatSessionControls,
	onNewPlanFile,
	newPlanFileDisabled,
	viewTechnical,
	viewSimple,
	onSelectLlmModel,
	llmModels,
}: {
	modelLabel: string;
	uiMode: string;
	onUiModeChange: (mode: string) => void;
	config: ServerConfig | null;
	onSelectLlmModel?: (modelId: string) => void;
	llmModels?: ReturnType<typeof useLlmModels>;
	onOpenCommandPalette: () => void;
	onSave: () => void | Promise<void>;
	canSave: boolean;
	onRevertFile: () => void | Promise<void>;
	canRevert: boolean;
	onRefreshWorkspace: () => void | Promise<void>;
	onCopyWorkspacePath: () => void;
	onSelectActivity: (a: TechnicalActivity) => void;
	horizontalToolDockToggles?: Partial<
		Record<
			HorizontalToolDockSlot,
			{
				hasTabs: boolean;
				visible: boolean;
				onToggle: () => void;
				/** Terminal → … submenu row label */
				terminalSubmenuLabel: string;
			}
		>
	>;
	onFocusBottomTab: (t: BottomPanelTab) => void;
	/** Technical UI: primary sidebar (activity bar + Explorer / Search / …). Omit in Simple mode. */
	leftSidebarVisible?: boolean;
	onToggleLeftSidebar?: () => void;
	/** Technical: session / agent panel (ChatPanel) dock — Zed / Cursor–style regions. */
	agentPanelVisible?: boolean;
	agentChatDock?: ChatDockRegion;
	onSetAgentChatDock?: (r: ChatDockRegion) => void;
	onToggleAgentPanel?: () => void;
	/** Full Cursor-style File menu; when set, replaces the minimal File menu. */
	fileMenu?: FileMenuProps;
	/** Edit → undo, find, comments, … (workspace editor). */
	editMenu?: EditMenuHandlers;
	/** Selection → expand, lines, occurrences, … */
	selectionMenu?: SelectionMenuHandlers;
	/** Go → back/forward, go to file, line, … */
	goMenu?: GoMenuHandlers;
	/** Run → debug, breakpoints, … */
	runMenu?: RunMenuHandlers;
	/** Terminal → new, split, tasks, … */
	terminalMenu?: TerminalMenuHandlers;
	/** Help → commands, docs, about-adjacent links. */
	helpMenu?: HelpMenuHandlers;
	/** Settings → open agent/team setup (Simple **My Team**; switches from Technical when needed). */
	onOpenAgentSetup: () => void;
	/** Settings → operator allowlist for agent tools (stored in this browser). */
	onOpenAgentPermissions: () => void;
	/** Settings → Simple pages, sidebars, layout, chrome toggles. */
	settingsMenu?: SettingsMenuHandlers;
	/** Optional: chat Build/Plan mode (View menu). */
	chatSessionControls?: {
		mode: ChatSessionMode;
		/** When true, mode switches are disabled (assistant reply streaming). */
		switchDisabled: boolean;
		onSetMode: (m: ChatSessionMode) => void;
	};
	onNewPlanFile?: () => void;
	newPlanFileDisabled?: boolean;
	/** Agents → open Pi **teams.yaml** in the workspace editor. */
	onOpenTeamsYaml: () => void;
	/** Agents → create a new `.md` agent stub under `.pi/agents` (or primary root). */
	onCreateAgentMarkdown: () => void;
	/** Agents → re-fetch **GET /api/agents**. */
	onReloadAgents: () => void;
	/** Open Pi workspace JSON (simple: AI Brains → Provider files; technical: main editor). */
	onOpenPiModelConfig?: (path: PiModelConfigPath) => void;
	/** Technical UI: View → Appearance / Editor Layout + chrome toggles. */
	viewTechnical?: ViewMenuTechnicalOptions | null;
	/** Simple UI: View → Appearance + workspace views catalog (`.wayofpi/ui-views.json`). */
	viewSimple?: ViewMenuSimpleOptions | null;
}) {
	/** Shared chrome for Technical and Simple layouts (WAY OF PI, mode toggle, menus, search, model). */
	const menuLabels = [
		"File",
		"Edit",
		"Selection",
		"View",
		"Go",
		"Run",
		"Terminal",
		"Help",
		"Agents",
		"Settings",
	] as const;

	const [openMenu, setOpenMenu] = useState<string | null>(null);
	const [viewFlyout, setViewFlyout] = useState<null | "appearance" | "layout">(null);
	const [viewSimpleFlyout, setViewSimpleFlyout] = useState<null | "appearance" | "views">(null);
	const [runNewBreakpointFlyout, setRunNewBreakpointFlyout] = useState(false);
	const [goSwitchEditorFlyout, setGoSwitchEditorFlyout] = useState(false);
	const [goSwitchGroupFlyout, setGoSwitchGroupFlyout] = useState(false);
	const [modelOpen, setModelOpen] = useState(false);
	const [aboutOpen, setAboutOpen] = useState(false);
	const [debugHelpOpen, setDebugHelpOpen] = useState(false);
	/** Settings → View: hover flyout (chrome / layout toggles). */
	const [settingsViewFlyout, setSettingsViewFlyout] = useState(false);
	const navRef = useRef<HTMLDivElement>(null);
	const modelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (openMenu !== "View") {
			setViewFlyout(null);
			setViewSimpleFlyout(null);
		}
		if (openMenu !== "Settings") setSettingsViewFlyout(false);
		if (openMenu !== "Run") setRunNewBreakpointFlyout(false);
		if (openMenu !== "Go") {
			setGoSwitchEditorFlyout(false);
			setGoSwitchGroupFlyout(false);
		}
	}, [openMenu]);

	useEffect(() => {
		if (!openMenu && !modelOpen) return;
		const onDown = (e: MouseEvent) => {
			const t = e.target;
			if (!(t instanceof Node)) return;
			if (navRef.current?.contains(t)) return;
			if (modelRef.current?.contains(t)) return;
			setOpenMenu(null);
			setModelOpen(false);
		};
		document.addEventListener("mousedown", onDown);
		return () => document.removeEventListener("mousedown", onDown);
	}, [openMenu, modelOpen]);

	const closeMenus = () => setOpenMenu(null);

	return (
		<header className="relative z-[60] shrink-0 select-none border-b border-[#252526] bg-[#323233]">
			{/* Top row: logo + menus */}
			<div className="flex h-8 items-center justify-between px-3">
				<div className="flex min-w-0 items-center gap-4">
					<div className="flex shrink-0 items-center gap-2 text-[13px] font-bold tracking-wide text-white">
						<TerminalSquare size={14} className="text-[#007acc]" />
WAY OF WORK
						{uiMode !== "simple" && onToggleLeftSidebar != null && leftSidebarVisible != null ? (
							<button
								type="button"
								title={
									leftSidebarVisible
										? "Hide primary sidebar (Ctrl+B)"
										: "Show primary sidebar (Ctrl+B)"
								}
								aria-label={
									leftSidebarVisible ? "Hide primary sidebar" : "Show primary sidebar"
								}
								aria-pressed={leftSidebarVisible}
								onClick={() => onToggleLeftSidebar()}
								className="-ml-0.5 flex shrink-0 items-center rounded p-0.5 text-[#c0c0c0] hover:bg-[#474747] hover:text-white"
							>
								{leftSidebarVisible ? (
									<ChevronLeft size={14} strokeWidth={2} aria-hidden />
								) : (
									<ChevronRight size={14} strokeWidth={2} aria-hidden />
								)}
							</button>
						) : null}
					</div>
					<nav ref={navRef} className="relative flex min-w-0 gap-1 text-[13px] text-[#cccccc]">
					{menuLabels.map((label) => (
						<div key={label} className="relative shrink-0">
							<button
								type="button"
								className={`rounded px-2 py-0.5 hover:bg-[#474747] hover:text-white ${
									openMenu === label ? "bg-[#474747] text-white" : ""
								}`}
								onClick={() => setOpenMenu(openMenu === label ? null : label)}
							>
								{label}
							</button>
							{openMenu === "File" && label === "File" ? (
								fileMenu ? (
									<FileMenuContent fm={fileMenu} closeMenus={closeMenus} />
								) : (
									<ul className="absolute left-0 top-full z-50 mt-0.5 min-w-[240px] list-none border border-[#454545] bg-[#252526] py-1 shadow-xl">
										<li>
											<button
												type="button"
												disabled={!canSave}
												className={menuBtnClass(!canSave)}
												onClick={() => {
													void onSave();
													closeMenus();
												}}
											>
												Save <span className="float-right font-mono text-[10px] text-[#858585]">Ctrl+S</span>
											</button>
										</li>
										<li>
											<button
												type="button"
												disabled={!canRevert}
												className={menuBtnClass(!canRevert)}
												onClick={() => {
													void onRevertFile();
													closeMenus();
												}}
											>
												Revert file from disk
											</button>
										</li>
										<li>
											<button
												type="button"
												className={menuBtnClass()}
												onClick={() => {
													void onRefreshWorkspace();
													closeMenus();
												}}
											>
												Refresh workspace tree
											</button>
										</li>
										<li>
											<button
												type="button"
												className={menuBtnClass()}
												onClick={() => {
													onCopyWorkspacePath();
													closeMenus();
												}}
											>
												Copy workspace path
											</button>
										</li>
									</ul>
								)
							) : null}
							{openMenu === "Edit" && label === "Edit" ? (
								<ul className="absolute left-0 top-full z-50 mt-0.5 min-w-[280px] list-none border border-[#454545] bg-[#252526] py-1 shadow-xl">
									{editMenu ? (
										<>
											<li>
												<button
													type="button"
													disabled={!editMenu.canEdit || !editMenu.canUndo}
													className={menuBtnClass(!editMenu.canEdit || !editMenu.canUndo)}
													onClick={() => {
														editMenu.onUndo();
														closeMenus();
													}}
												>
													Undo{menuKbd("Ctrl+Z")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!editMenu.canEdit || !editMenu.canRedo}
													className={menuBtnClass(!editMenu.canEdit || !editMenu.canRedo)}
													onClick={() => {
														editMenu.onRedo();
														closeMenus();
													}}
												>
													Redo{menuKbd("Ctrl+Shift+Z")}
												</button>
											</li>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
											<li>
												<button
													type="button"
													disabled={!editMenu.canEdit}
													className={menuBtnClass(!editMenu.canEdit)}
													onClick={() => {
														editMenu.onCut();
														closeMenus();
													}}
												>
													Cut{menuKbd("Ctrl+X")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!editMenu.canEdit}
													className={menuBtnClass(!editMenu.canEdit)}
													onClick={() => {
														editMenu.onCopy();
														closeMenus();
													}}
												>
													Copy{menuKbd("Ctrl+C")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!editMenu.canEdit}
													className={menuBtnClass(!editMenu.canEdit)}
													onClick={() => {
														void editMenu.onPaste();
														closeMenus();
													}}
												>
													Paste{menuKbd("Ctrl+V")}
												</button>
											</li>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
											<li>
												<button
													type="button"
													disabled={!editMenu.canEdit}
													className={menuBtnClass(!editMenu.canEdit)}
													onClick={() => {
														editMenu.onFind();
														closeMenus();
													}}
												>
													Find{menuKbd("Ctrl+F")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!editMenu.canEdit}
													className={menuBtnClass(!editMenu.canEdit)}
													onClick={() => {
														editMenu.onReplace();
														closeMenus();
													}}
												>
													Replace{menuKbd("Ctrl+H")}
												</button>
											</li>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													onClick={() => {
														editMenu.onFindInFiles();
														closeMenus();
													}}
												>
													Find in Files{menuKbd("Ctrl+Shift+F")}
												</button>
											</li>
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													onClick={() => {
														editMenu.onReplaceInFiles();
														closeMenus();
													}}
												>
													Replace in Files{menuKbd("Ctrl+Shift+H")}
												</button>
											</li>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
											<li>
												<button
													type="button"
													disabled={!editMenu.canEdit}
													className={menuBtnClass(!editMenu.canEdit)}
													onClick={() => {
														editMenu.onToggleLineComment();
														closeMenus();
													}}
												>
													Toggle Line Comment{menuKbd("Ctrl+Shift+7")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!editMenu.canEdit}
													className={menuBtnClass(!editMenu.canEdit)}
													onClick={() => {
														editMenu.onToggleBlockComment();
														closeMenus();
													}}
												>
													Toggle Block Comment{menuKbd("Ctrl+Shift+A")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!editMenu.canEdit}
													className={menuBtnClass(!editMenu.canEdit)}
													onClick={() => {
														editMenu.onEmmetExpand();
														closeMenus();
													}}
												>
													Emmet: Expand Abbreviation{menuKbd("Tab")}
												</button>
											</li>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
										</>
									) : null}
									<li>
										<button
											type="button"
											className={menuBtnClass()}
											onClick={() => {
												onCopyWorkspacePath();
												closeMenus();
											}}
										>
											Copy workspace path
										</button>
									</li>
								</ul>
							) : null}
							{openMenu === "Selection" && label === "Selection" ? (
								<ul className="absolute left-0 top-full z-50 mt-0.5 min-w-[320px] list-none border border-[#454545] bg-[#252526] py-1 shadow-xl">
									{selectionMenu ? (
										<>
											<li>
												<button
													type="button"
													disabled={!selectionMenu.canEdit}
													className={menuBtnClass(!selectionMenu.canEdit)}
													onClick={() => {
														selectionMenu.onSelectAll();
														closeMenus();
													}}
												>
													Select All{menuKbd("Ctrl+A")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!selectionMenu.canEdit}
													className={menuBtnClass(!selectionMenu.canEdit)}
													onClick={() => {
														selectionMenu.onExpandSelection();
														closeMenus();
													}}
												>
													Expand Selection{menuKbd("Shift+Alt+Right")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!selectionMenu.canEdit}
													className={menuBtnClass(!selectionMenu.canEdit)}
													onClick={() => {
														selectionMenu.onShrinkSelection();
														closeMenus();
													}}
												>
													Shrink Selection{menuKbd("Shift+Alt+Left")}
												</button>
											</li>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
											<li>
												<button
													type="button"
													disabled={!selectionMenu.canEdit}
													className={menuBtnClass(!selectionMenu.canEdit)}
													onClick={() => {
														selectionMenu.onCopyLineUp();
														closeMenus();
													}}
												>
													Copy Line Up{menuKbd("Ctrl+Shift+Alt+Up")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!selectionMenu.canEdit}
													className={menuBtnClass(!selectionMenu.canEdit)}
													onClick={() => {
														selectionMenu.onCopyLineDown();
														closeMenus();
													}}
												>
													Copy Line Down{menuKbd("Ctrl+Shift+Alt+Down")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!selectionMenu.canEdit}
													className={menuBtnClass(!selectionMenu.canEdit)}
													onClick={() => {
														selectionMenu.onMoveLineUp();
														closeMenus();
													}}
												>
													Move Line Up{menuKbd("Alt+Up")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!selectionMenu.canEdit}
													className={menuBtnClass(!selectionMenu.canEdit)}
													onClick={() => {
														selectionMenu.onMoveLineDown();
														closeMenus();
													}}
												>
													Move Line Down{menuKbd("Alt+Down")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!selectionMenu.canEdit}
													className={menuBtnClass(!selectionMenu.canEdit)}
													onClick={() => {
														selectionMenu.onDuplicateSelection();
														closeMenus();
													}}
												>
													Duplicate Selection
												</button>
											</li>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
											<li>
												<button
													type="button"
													disabled
													title="Multi-cursor is not available in the plain text editor."
													className={menuBtnClass(true)}
												>
													Add Cursor Above{menuKbd("Shift+Alt+Up")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled
													title="Multi-cursor is not available in the plain text editor."
													className={menuBtnClass(true)}
												>
													Add Cursor Below{menuKbd("Shift+Alt+Down")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled
													title="Multi-cursor is not available in the plain text editor."
													className={menuBtnClass(true)}
												>
													Add Cursors to Line Ends{menuKbd("Shift+Alt+I")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!selectionMenu.canEdit}
													className={menuBtnClass(!selectionMenu.canEdit)}
													onClick={() => {
														selectionMenu.onAddNextOccurrence();
														closeMenus();
													}}
												>
													Add Next Occurrence{menuKbd("Ctrl+D")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!selectionMenu.canEdit}
													className={menuBtnClass(!selectionMenu.canEdit)}
													onClick={() => {
														selectionMenu.onAddPreviousOccurrence();
														closeMenus();
													}}
												>
													Add Previous Occurrence{menuKbd("Ctrl+Shift+D")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!selectionMenu.canEdit}
													className={menuBtnClass(!selectionMenu.canEdit)}
													onClick={() => {
														selectionMenu.onSelectAllOccurrences();
														closeMenus();
													}}
												>
													Select All Occurrences
												</button>
											</li>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
											<li>
												<button
													type="button"
													disabled={!selectionMenu.canEdit}
													className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] ${
														selectionMenu.canEdit
															? "cursor-pointer text-[#cccccc] hover:bg-[#007acc]/30 hover:text-white"
															: "cursor-not-allowed text-[#555]"
													}`}
													onClick={() => {
														selectionMenu.onToggleCtrlClickMultiCursor();
														closeMenus();
													}}
												>
													<span className="w-4 shrink-0 text-center font-mono text-[11px] text-[#007acc]">
														{selectionMenu.ctrlClickMultiCursor ? "✓" : ""}
													</span>
													<span className="min-w-0 flex-1">Switch to Ctrl+Click for Multi-Cursor</span>
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!selectionMenu.canEdit}
													className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] ${
														selectionMenu.canEdit
															? "cursor-pointer text-[#cccccc] hover:bg-[#007acc]/30 hover:text-white"
															: "cursor-not-allowed text-[#555]"
													}`}
													onClick={() => {
														selectionMenu.onToggleColumnSelectionMode();
														closeMenus();
													}}
												>
													<span className="w-4 shrink-0 text-center font-mono text-[11px] text-[#007acc]">
														{selectionMenu.columnSelectionMode ? "✓" : ""}
													</span>
													<span className="min-w-0 flex-1">Column Selection Mode</span>
												</button>
											</li>
										</>
									) : (
										<li>
											<button type="button" disabled className={menuBtnClass(true)}>
												Select all <span className="text-[#555]">(editor)</span>
											</button>
										</li>
									)}
								</ul>
							) : null}
							{openMenu === "View" && label === "View" ? (
								<ul className="absolute left-0 top-full z-50 mt-0.5 min-w-[280px] list-none border border-[#454545] bg-[#252526] py-1 shadow-xl">
									<li>
										<button
											type="button"
											className={menuBtnClass()}
											onClick={() => {
												onOpenCommandPalette();
												closeMenus();
											}}
										>
											Command palette…{menuKbd("Ctrl+Shift+P")}
										</button>
									</li>
									<li>
										<button
											type="button"
											className={menuBtnClass()}
											onClick={() => {
												onOpenCommandPalette();
												closeMenus();
											}}
										>
											Open view…{menuKbd("Ctrl+Shift+P")}
										</button>
									</li>
									{import.meta.env.DEV || (typeof window !== "undefined" && window.wopShell) ? (
										<>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													onClick={() => {
														if (window.wopShell?.reload) void window.wopShell.reload();
														else window.location.reload();
														closeMenus();
													}}
												>
													Reload window
													{menuKbd("Ctrl+R")}
												</button>
											</li>
											{window.wopShell?.reloadHard ? (
												<li>
													<button
														type="button"
														className={menuBtnClass()}
														onClick={() => {
															void window.wopShell?.reloadHard();
															closeMenus();
														}}
													>
														Reload window (ignore cache)
														{menuKbd("Ctrl+Shift+R")}
													</button>
												</li>
											) : null}
										</>
									) : null}
									<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
									<li>
										<button
											type="button"
											disabled={uiMode === "simple"}
											className={menuBtnClass(uiMode === "simple")}
											title={uiMode === "simple" ? "Already using Simple layout." : "Switch to Simple layout."}
											onClick={() => {
												onUiModeChange("simple");
												closeMenus();
											}}
										>
											Use Simple layout
											{uiMode === "simple" ? (
												<span className="float-right text-[#89d185]">✓</span>
											) : null}
										</button>
									</li>
									<li>
										<button
											type="button"
											className={menuBtnClass(false)}
											title="Open Way of Pi (Standalone Technical IDE)"
											onClick={() => {
												window.open("http://localhost:5174", "_blank");
												closeMenus();
											}}
										>
											Open Way of Pi (IDE)
											<span className="float-right text-[#858585]">↗</span>
										</button>
									</li>
									<li>
										<button
											type="button"
											disabled={uiMode === "claw"}
											className={menuBtnClass(uiMode === "claw")}
											title={
												uiMode === "claw"
													? "Already using Claw layout."
													: "Claw mode: same IDE chrome with Claw roadmap banner — docs/WOP_CLAW_MODE_PLAN.md, docs/WOP_CLAW_UI_PLAN.md"
											}
											onClick={() => {
												onUiModeChange("claw");
												closeMenus();
											}}
										>
											Use Claw layout
											{uiMode === "claw" ? (
												<span className="float-right text-[#89d185]">✓</span>
											) : null}
										</button>
									</li>
									{chatSessionControls ? (
										<>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
											<li>
												<button
													type="button"
													disabled={chatSessionControls.switchDisabled}
													className={menuBtnClass(chatSessionControls.switchDisabled)}
													title="Build mode — Orchestrator posture for implementation (no .md agent unless selected)"
													onClick={() => {
														chatSessionControls.onSetMode("build");
														closeMenus();
													}}
												>
													Chat mode: Build
													{chatSessionControls.mode === "build" ? (
														<span className="float-right text-[#89d185]">✓</span>
													) : null}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={chatSessionControls.switchDisabled}
													className={menuBtnClass(chatSessionControls.switchDisabled)}
													title="Plan mode — injects planner.md (or fallback) for structured plans"
													onClick={() => {
														chatSessionControls.onSetMode("plan");
														closeMenus();
													}}
												>
													Chat mode: Plan
													{chatSessionControls.mode === "plan" ? (
														<span className="float-right text-[#89d185]">✓</span>
													) : null}
												</button>
											</li>
										</>
									) : null}
									{viewSimple ? (
										<>
											<li className="relative">
												<button
													type="button"
													className={menuBtnClass()}
													onClick={() =>
														setViewSimpleFlyout((v) => (v === "appearance" ? null : "appearance"))
													}
												>
													Appearance
													<span className="float-right text-[#858585]">
														{viewSimpleFlyout === "appearance" ? "◂" : "▸"}
													</span>
												</button>
												{viewSimpleFlyout === "appearance" ? (
													<ul className={viewFlyoutClass()}>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																onClick={() => {
																	viewSimple.onOpenAppearanceSettings();
																	closeMenus();
																}}
															>
																Settings — dark / light…
															</button>
														</li>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																onClick={() => {
																	void viewSimple.onToggleFullScreen();
																	closeMenus();
																}}
															>
																Full screen
																{menuKbd("F11")}
															</button>
														</li>
														<li className="my-1 border-t border-[#3c3c3c]" />
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																onClick={() => {
																	void viewSimple.onSeedViewsCatalog();
																	closeMenus();
																}}
															>
																Create views catalog file…
															</button>
														</li>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																onClick={() => {
																	viewSimple.onEditCatalog();
																	closeMenus();
																}}
															>
																Edit views catalog
																<span className="float-right max-w-[140px] truncate font-mono text-[10px] text-[#858585]">
																	{viewSimple.catalogRelPath}
																</span>
															</button>
														</li>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																onClick={() => {
																	viewSimple.onOpenSchemaDoc();
																	closeMenus();
																}}
															>
																Open catalog schema (docs)…
															</button>
														</li>
													</ul>
												) : null}
											</li>
											<li className="relative">
												<button
													type="button"
													className={menuBtnClass()}
													onClick={() => setViewSimpleFlyout((v) => (v === "views" ? null : "views"))}
												>
													Workspace views
													<span className="float-right text-[#858585]">
														{viewSimpleFlyout === "views" ? "◂" : "▸"}
													</span>
												</button>
												{viewSimpleFlyout === "views" ? (
													<ul
														className={`${viewFlyoutClass()} max-h-[min(70vh,520px)] overflow-y-auto`}
													>
														{viewSimple.catalogParseWarning ? (
															<li className="px-3 py-2 text-[11px] leading-snug text-[#ce9178]">
																{viewSimple.catalogParseWarning}
															</li>
														) : null}
														{viewSimple.catalogError ? (
															<li className="px-3 py-2 text-[11px] text-[#f14c4c]">
																{viewSimple.catalogError}
															</li>
														) : null}
														{viewSimple.catalogSource === "default" ? (
															<li className="px-3 py-2 text-[11px] text-[#858585]">
																Using built-in list. Create{" "}
																<span className="font-mono text-[#9cdcfe]">
																	{viewSimple.catalogRelPath}
																</span>{" "}
																to customize (Appearance → Create…).
															</li>
														) : null}
														{viewSimple.catalogLoading ? (
															<li className="px-3 py-2 text-[#858585]">Loading catalog…</li>
														) : (
															viewSimple.catalog.map((e) => (
																<li key={e.id}>
																	<button
																		type="button"
																		className={`${menuBtnClass()} !items-start !py-2`}
																		onClick={() => {
																			viewSimple.onActivateEntry(e);
																			closeMenus();
																		}}
																	>
																		<span className="flex min-w-0 flex-col gap-0.5 text-left">
																			<span className="truncate">{e.label}</span>
																			{e.hint ? (
																				<span className="truncate text-[11px] font-normal text-[#858585]">
																					{e.hint}
																				</span>
																			) : null}
																			<span className="truncate font-mono text-[10px] text-[#6a9955]">
																				{e.kind} → {e.target}
																			</span>
																		</span>
																	</button>
																</li>
															))
														)}
													</ul>
												) : null}
											</li>
											<li className="my-1 border-t border-[#3c3c3c]" />
										</>
									) : null}
									{viewTechnical ? (
										<>
											<li className="relative">
												<button
													type="button"
													className={menuBtnClass()}
													onClick={() => setViewFlyout((v) => (v === "appearance" ? null : "appearance"))}
												>
													Appearance
													<span className="float-right text-[#858585]">{viewFlyout === "appearance" ? "◂" : "▸"}</span>
												</button>
												{viewFlyout === "appearance" ? (
													<ul className={viewFlyoutClass()}>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																onClick={() => {
																	viewTechnical.onToggleFullScreen();
																	closeMenus();
																}}
															>
																Full screen
																{menuKbd("F11")}
															</button>
														</li>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																onClick={() => {
																	if (viewTechnical.zenMode) viewTechnical.onExitZen();
																	else viewTechnical.onEnterZen();
																	closeMenus();
																}}
															>
																{viewTechnical.zenMode ? "Exit Zen mode" : "Zen mode"}
																{menuKbd("Ctrl+Alt+Z")}
															</button>
														</li>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																onClick={() => {
																	viewTechnical.onToggleCenteredLayout?.();
																	closeMenus();
																}}
															>
																Centered layout
																<span className="float-right font-mono text-[10px] text-[#858585]">
																	{viewTechnical.centeredLayout ? (
																		<span className="mr-2 text-[#89d185]">✓</span>
																	) : null}
																	Ctrl+Alt+C
																</span>
															</button>
														</li>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																title="Exit browser full screen (if any), leave Zen mode, and turn off centered layout."
																onClick={() => {
																	viewTechnical.onNormalView();
																	closeMenus();
																}}
															>
																Normal view
																{menuKbd("Ctrl+Alt+N")}
															</button>
														</li>
														<li>
															<button type="button" disabled className={menuBtnClass(true)}>
																Open browser preview <span className="text-[#555]">(n/a)</span>
															</button>
														</li>
														<li className="my-1 border-t border-[#3c3c3c]" />
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																onClick={() => {
																	viewTechnical.onToggleMenuBar();
																	closeMenus();
																}}
															>
																Menu bar
																{viewTechnical.menuBarVisible ? (
																	<span className="float-right text-[#89d185]">✓</span>
																) : null}
															</button>
														</li>
														{onToggleLeftSidebar != null && leftSidebarVisible != null ? (
															<li>
																<button
																	type="button"
																	className={menuBtnClass()}
																	onClick={() => {
																		onToggleLeftSidebar();
																		closeMenus();
																	}}
																>
																	Primary side bar
																	<span className="float-right font-mono text-[10px] text-[#858585]">
																		{leftSidebarVisible ? <span className="mr-2 text-[#89d185]">✓</span> : null}
																		Ctrl+B
																	</span>
																</button>
															</li>
														) : null}
														{onToggleAgentPanel != null && agentPanelVisible != null ? (
															<li>
																<button
																	type="button"
																	className={menuBtnClass()}
																	onClick={() => {
																		onToggleAgentPanel();
																		closeMenus();
																	}}
																>
																	Secondary side bar
																	<span className="float-right font-mono text-[10px] text-[#858585]">
																		{agentPanelVisible ? <span className="mr-2 text-[#89d185]">✓</span> : null}
																		Ctrl+Alt+B
																	</span>
																</button>
															</li>
														) : null}
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																onClick={() => {
																	viewTechnical.onToggleStatusBar();
																	closeMenus();
																}}
															>
																Status bar
																{viewTechnical.statusBarVisible ? (
																	<span className="float-right text-[#89d185]">✓</span>
																) : null}
															</button>
														</li>
														{HORIZONTAL_TOOL_DOCK_SLOTS.map((slot) => {
															const row = horizontalToolDockToggles?.[slot];
															if (!row?.hasTabs) return null;
															return (
																<li key={slot}>
																	<button
																		type="button"
																		className={menuBtnClass()}
																		onClick={() => {
																			row.onToggle();
																			closeMenus();
																		}}
																	>
																		{row.terminalSubmenuLabel}
																		<span className="float-right font-mono text-[10px] text-[#858585]">
																			{row.visible ? (
																				<span className="mr-2 text-[#89d185]">✓</span>
																			) : null}
																			{slot === "bottom" ? "Ctrl+J" : ""}
																		</span>
																	</button>
																</li>
															);
														})}
														<li>
															<button type="button" disabled className={menuBtnClass(true)}>
																Move primary side bar right <span className="text-[#555]">(n/a)</span>
															</button>
														</li>
														<li>
															<button type="button" disabled className={menuBtnClass(true)}>
																Activity bar position <span className="text-[#555]">(left only)</span>
															</button>
														</li>
														<li>
															<button type="button" disabled className={menuBtnClass(true)}>
																Panel position <span className="text-[#555]">(bottom / right via drag)</span>
															</button>
														</li>
														<li className="my-1 border-t border-[#3c3c3c]" />
														<li>
															<button type="button" disabled className={menuBtnClass(true)}>
																Minimap <span className="text-[#555]">(planned)</span>
															</button>
														</li>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																onClick={() => {
																	viewTechnical.onToggleBreadcrumbs();
																	closeMenus();
																}}
															>
																Toggle breadcrumbs
																{viewTechnical.breadcrumbsVisible ? (
																	<span className="float-right text-[#89d185]">✓</span>
																) : null}
															</button>
														</li>
														<li>
															<button type="button" disabled className={menuBtnClass(true)}>
																Sticky scroll <span className="text-[#555]">(planned)</span>
															</button>
														</li>
														<li>
															<button type="button" disabled className={menuBtnClass(true)}>
																Render whitespace <span className="text-[#555]">(planned)</span>
															</button>
														</li>
														<li className="my-1 border-t border-[#3c3c3c]" />
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																onClick={() => {
																	viewTechnical.onZoomIn();
																	closeMenus();
																}}
															>
																Zoom in
															</button>
														</li>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																onClick={() => {
																	viewTechnical.onZoomOut();
																	closeMenus();
																}}
															>
																Zoom out
															</button>
														</li>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																onClick={() => {
																	viewTechnical.onZoomReset();
																	closeMenus();
																}}
															>
																Reset zoom
																<span className="float-right font-mono text-[10px] text-[#858585]">
																	{viewTechnical.uiZoomPercent}%
																</span>
															</button>
														</li>
													</ul>
												) : null}
											</li>
											<li className="relative">
												<button
													type="button"
													className={menuBtnClass()}
													onClick={() => setViewFlyout((v) => (v === "layout" ? null : "layout"))}
												>
													Editor layout
													<span className="float-right text-[#858585]">{viewFlyout === "layout" ? "◂" : "▸"}</span>
												</button>
												{viewFlyout === "layout" ? (
													<ul className={viewFlyoutClass()}>
														<li>
															<button type="button" disabled className={menuBtnClass(true)}>
																Split up <span className="text-[#555]">(editor splits n/a)</span>
															</button>
														</li>
														<li>
															<button type="button" disabled className={menuBtnClass(true)}>
																Split down
															</button>
														</li>
														<li>
															<button type="button" disabled className={menuBtnClass(true)}>
																Split left
															</button>
														</li>
														<li>
															<button type="button" disabled className={menuBtnClass(true)}>
																Split right
															</button>
														</li>
														<li>
															<button type="button" disabled className={menuBtnClass(true)}>
																Move editor into new window
															</button>
														</li>
														<li className="my-1 border-t border-[#3c3c3c]" />
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																onClick={() => {
																	viewTechnical.onApplyLayoutPreset("single");
																	closeMenus();
																}}
															>
																Single
															</button>
														</li>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																onClick={() => {
																	viewTechnical.onApplyLayoutPreset("two_columns");
																	closeMenus();
																}}
															>
																Two columns
															</button>
														</li>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																onClick={() => {
																	viewTechnical.onApplyLayoutPreset("workspace_grid_3x1");
																	closeMenus();
																}}
															>
																Three columns (workspace)
															</button>
														</li>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																onClick={() => {
																	viewTechnical.onApplyLayoutPreset("two_rows");
																	closeMenus();
																}}
															>
																Two rows
															</button>
														</li>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																onClick={() => {
																	viewTechnical.onApplyLayoutPreset("workspace_grid_1x3");
																	closeMenus();
																}}
															>
																Three rows (workspace)
															</button>
														</li>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																onClick={() => {
																	viewTechnical.onApplyLayoutPreset("grid_2x2");
																	closeMenus();
																}}
															>
																Grid (2×2) <span className="text-[#555]">(agent + panel)</span>
															</button>
														</li>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																onClick={() => {
																	viewTechnical.onApplyLayoutPreset("workspace_grid_2x2");
																	closeMenus();
																}}
															>
																Workspace grid (2×2)
															</button>
														</li>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																onClick={() => {
																	viewTechnical.onApplyLayoutPreset("workspace_grid_3x4");
																	closeMenus();
																}}
															>
																Workspace grid (3×4)
															</button>
														</li>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																onClick={() => {
																	viewTechnical.onApplyLayoutPreset("two_rows_right");
																	closeMenus();
																}}
															>
																Two rows right
															</button>
														</li>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																onClick={() => {
																	viewTechnical.onApplyLayoutPreset("two_columns_bottom");
																	closeMenus();
																}}
															>
																Two columns bottom
															</button>
														</li>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																onClick={() => {
																	viewTechnical.onFlipLayout();
																	closeMenus();
																}}
															>
																Flip layout{menuKbd("Shift+Alt+0")}
															</button>
														</li>
													</ul>
												) : null}
											</li>
										</>
									) : null}
									<li className="my-1 border-t border-[#3c3c3c]" />
									<li>
										<button
											type="button"
											className={menuBtnClass()}
											onClick={() => {
												onSelectActivity("explorer");
												closeMenus();
											}}
										>
											Explorer{menuKbd("Ctrl+Shift+E")}
										</button>
									</li>
									<li>
										<button
											type="button"
											className={menuBtnClass()}
											onClick={() => {
												onSelectActivity("search");
												closeMenus();
											}}
										>
											Search{menuKbd("Ctrl+Shift+F")}
										</button>
									</li>
									<li>
										<button
											type="button"
											className={menuBtnClass()}
											onClick={() => {
												onSelectActivity("scm");
												closeMenus();
											}}
										>
											Source control{menuKbd("Ctrl+Shift+G")}
										</button>
									</li>
									<li>
										<button
											type="button"
											className={menuBtnClass()}
											onClick={() => {
												onSelectActivity("extensions");
												closeMenus();
											}}
										>
											Run / Extensions{menuKbd("Ctrl+Shift+D")}
										</button>
									</li>
									<li>
										<button
											type="button"
											className={menuBtnClass()}
											onClick={() => {
												onSelectActivity("planning");
												closeMenus();
											}}
										>
											Plan / Build
										</button>
									</li>
									<li>
										<button
											type="button"
											className={menuBtnClass()}
											onClick={() => {
												onSelectActivity("settings");
												closeMenus();
											}}
										>
											Settings
										</button>
									</li>
									<li className="my-1 border-t border-[#3c3c3c]" />
									<li>
										<button
											type="button"
											className={menuBtnClass()}
											onClick={() => {
												onFocusBottomTab("problems");
												closeMenus();
											}}
										>
											Problems{menuKbd("Ctrl+Shift+M")}
										</button>
									</li>
									<li>
										<button
											type="button"
											className={menuBtnClass()}
											onClick={() => {
												onFocusBottomTab("output");
												closeMenus();
											}}
										>
											Output
										</button>
									</li>
									<li>
										<button
											type="button"
											className={menuBtnClass()}
											onClick={() => {
												onFocusBottomTab("tool_log");
												closeMenus();
											}}
										>
											Debug console (tool log)
										</button>
									</li>
									<li>
										<button
											type="button"
											className={menuBtnClass()}
											onClick={() => {
												onFocusBottomTab("terminal");
												closeMenus();
											}}
										>
											Terminal{menuKbd("Ctrl+Shift+`")}
										</button>
									</li>
									{HORIZONTAL_TOOL_DOCK_SLOTS.map((slot) => {
										const row = horizontalToolDockToggles?.[slot];
										if (!row?.hasTabs) return null;
										return (
											<li key={slot}>
												<button
													type="button"
													className={menuBtnClass()}
													onClick={() => {
														row.onToggle();
														closeMenus();
													}}
												>
													{row.terminalSubmenuLabel}
													{row.visible ? <span className="float-right text-[#89d185]">✓</span> : null}
												</button>
											</li>
										);
									})}
									<li className="my-1 border-t border-[#3c3c3c]" />
									<li>
										<button
											type="button"
											className={menuBtnClass(!viewTechnical)}
											disabled={!viewTechnical}
											onClick={() => {
												viewTechnical?.onToggleWordWrap();
												closeMenus();
											}}
										>
											Word wrap
											{viewTechnical?.wordWrap ? <span className="float-right text-[#89d185]">✓</span> : null}
											{menuKbd("Alt+Z")}
										</button>
									</li>
									{onSetAgentChatDock != null && onToggleAgentPanel != null && agentChatDock != null && agentPanelVisible != null ? (
										<>
											<li className="my-1 border-t border-[#3c3c3c]" />
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													onClick={() => {
														onSetAgentChatDock("right");
														closeMenus();
													}}
												>
													Agent panel: dock right
													{agentPanelVisible && agentChatDock === "right" ? (
														<span className="float-right font-mono text-[10px] text-[#858585]">●</span>
													) : null}
												</button>
											</li>
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													onClick={() => {
														onSetAgentChatDock("bottom");
														closeMenus();
													}}
												>
													Agent panel: dock bottom
													{agentPanelVisible && agentChatDock === "bottom" ? (
														<span className="float-right font-mono text-[10px] text-[#858585]">●</span>
													) : null}
												</button>
											</li>
										</>
									) : null}
								</ul>
							) : null}
							{openMenu === "Go" && label === "Go" ? (
								<ul className="absolute left-0 top-full z-50 mt-0.5 min-w-[340px] list-none border border-[#454545] bg-[#252526] py-1 shadow-xl">
									{goMenu ? (
										<>
											<li>
												<button
													type="button"
													disabled={!goMenu.canGoBack}
													className={menuBtnClass(!goMenu.canGoBack)}
													title={!goMenu.canGoBack ? "No navigation history yet." : undefined}
													onClick={() => {
														goMenu.onBack();
														closeMenus();
													}}
												>
													Back{menuKbd("Ctrl+Alt+-")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!goMenu.canGoForward}
													className={menuBtnClass(!goMenu.canGoForward)}
													title={!goMenu.canGoForward ? "No forward history." : undefined}
													onClick={() => {
														goMenu.onForward();
														closeMenus();
													}}
												>
													Forward{menuKbd("Ctrl+Shift+-")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!goMenu.canLastEditLocation}
													className={menuBtnClass(!goMenu.canLastEditLocation)}
													title={
														!goMenu.canLastEditLocation
															? "Last edit location stack is not wired yet."
															: undefined
													}
													onClick={() => {
														goMenu.onLastEditLocation();
														closeMenus();
													}}
												>
													Last Edit Location{menuKbd("Ctrl+M Ctrl+Q")}
												</button>
											</li>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
											<li
												className="relative"
												onMouseEnter={() => setGoSwitchEditorFlyout(true)}
												onMouseLeave={() => setGoSwitchEditorFlyout(false)}
											>
												<button type="button" className={menuBtnClass()} onClick={() => {}}>
													<span className="pr-6">Switch Editor</span>
													<ChevronRight
														className="float-right mt-0.5 text-[#858585]"
														size={14}
														aria-hidden
													/>
												</button>
												{goSwitchEditorFlyout ? (
													<ul className={viewFlyoutClass()}>
														<li>
															<button
																type="button"
																disabled={!goMenu.canSwitchEditorPrevious}
																className={menuBtnClass(!goMenu.canSwitchEditorPrevious)}
																title={
																	!goMenu.canSwitchEditorPrevious
																		? "Open a second editor (aux split) to switch."
																		: undefined
																}
																onClick={() => {
																	goMenu.onSwitchEditorPrevious();
																	closeMenus();
																}}
															>
																Previous Editor
															</button>
														</li>
														<li>
															<button
																type="button"
																disabled={!goMenu.canSwitchEditorNext}
																className={menuBtnClass(!goMenu.canSwitchEditorNext)}
																title={
																	!goMenu.canSwitchEditorNext
																		? "Open a second editor (aux split) to switch."
																		: undefined
																}
																onClick={() => {
																	goMenu.onSwitchEditorNext();
																	closeMenus();
																}}
															>
																Next Editor
															</button>
														</li>
														<li>
															<button type="button" disabled className={menuBtnClass(true)}>
																Previous Used Editor
															</button>
														</li>
														<li>
															<button type="button" disabled className={menuBtnClass(true)}>
																Next Used Editor
															</button>
														</li>
														<li>
															<button type="button" disabled className={menuBtnClass(true)}>
																Switch Editor…
															</button>
														</li>
													</ul>
												) : null}
											</li>
											<li
												className="relative"
												onMouseEnter={() => setGoSwitchGroupFlyout(true)}
												onMouseLeave={() => setGoSwitchGroupFlyout(false)}
											>
												<button type="button" className={menuBtnClass()} onClick={() => {}}>
													<span className="pr-6">Switch Group</span>
													<ChevronRight
														className="float-right mt-0.5 text-[#858585]"
														size={14}
														aria-hidden
													/>
												</button>
												{goSwitchGroupFlyout ? (
													<ul className={viewFlyoutClass()}>
														<li>
															<button type="button" disabled className={menuBtnClass(true)}>
																Editor Group 1
															</button>
														</li>
														<li>
															<button type="button" disabled className={menuBtnClass(true)}>
																Editor Group 2
															</button>
														</li>
														<li>
															<button type="button" disabled className={menuBtnClass(true)}>
																Switch Group…
															</button>
														</li>
													</ul>
												) : null}
											</li>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													onClick={() => {
														goMenu.onGoToFile();
														closeMenus();
													}}
												>
													Go to File…{menuKbd("Ctrl+P")}
												</button>
											</li>
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													onClick={() => {
														goMenu.onGoToSymbolInWorkspace();
														closeMenus();
													}}
												>
													Go to Symbol in Workspace…{menuKbd("Ctrl+T")}
												</button>
											</li>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
											<li>
												<button
													type="button"
													disabled={!goMenu.canLanguageFeatures}
													className={menuBtnClass(!goMenu.canLanguageFeatures)}
													title={
														!goMenu.canLanguageFeatures
															? "Requires a language service (not connected)."
															: undefined
													}
													onClick={() => {
														goMenu.onGoToSymbolInEditor();
														closeMenus();
													}}
												>
													Go to Symbol in Editor…{menuKbd("Ctrl+Shift+O")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!goMenu.canLanguageFeatures}
													className={menuBtnClass(!goMenu.canLanguageFeatures)}
													title={
														!goMenu.canLanguageFeatures
															? "Requires a language service (not connected)."
															: undefined
													}
													onClick={() => {
														goMenu.onGoToDefinition();
														closeMenus();
													}}
												>
													Go to Definition{menuKbd("F12")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!goMenu.canLanguageFeatures}
													className={menuBtnClass(!goMenu.canLanguageFeatures)}
													title={
														!goMenu.canLanguageFeatures
															? "Requires a language service (not connected)."
															: undefined
													}
													onClick={() => {
														goMenu.onGoToDeclaration();
														closeMenus();
													}}
												>
													Go to Declaration
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!goMenu.canLanguageFeatures}
													className={menuBtnClass(!goMenu.canLanguageFeatures)}
													title={
														!goMenu.canLanguageFeatures
															? "Requires a language service (not connected)."
															: undefined
													}
													onClick={() => {
														goMenu.onGoToTypeDefinition();
														closeMenus();
													}}
												>
													Go to Type Definition
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!goMenu.canLanguageFeatures}
													className={menuBtnClass(!goMenu.canLanguageFeatures)}
													title={
														!goMenu.canLanguageFeatures
															? "Requires a language service (not connected)."
															: undefined
													}
													onClick={() => {
														goMenu.onGoToImplementations();
														closeMenus();
													}}
												>
													Go to Implementations{menuKbd("Ctrl+F12")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!goMenu.canAddSymbolToChat}
													className={menuBtnClass(!goMenu.canAddSymbolToChat)}
													title={
														!goMenu.canAddSymbolToChat
															? "Chat symbol injection is not wired yet."
															: undefined
													}
													onClick={() => {
														goMenu.onAddSymbolToCurrentChat();
														closeMenus();
													}}
												>
													Add Symbol to Current Chat
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!goMenu.canLanguageFeatures}
													className={menuBtnClass(!goMenu.canLanguageFeatures)}
													title={
														!goMenu.canLanguageFeatures
															? "Requires a language service (not connected)."
															: undefined
													}
													onClick={() => {
														goMenu.onGoToReferences();
														closeMenus();
													}}
												>
													Go to References{menuKbd("Shift+F12")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!goMenu.canAddSymbolToChat}
													className={menuBtnClass(!goMenu.canAddSymbolToChat)}
													title={
														!goMenu.canAddSymbolToChat
															? "Chat symbol injection is not wired yet."
															: undefined
													}
													onClick={() => {
														goMenu.onAddSymbolToNewChat();
														closeMenus();
													}}
												>
													Add Symbol to New Chat
												</button>
											</li>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
											<li>
												<button
													type="button"
													disabled={!goMenu.canGoToLine}
													className={menuBtnClass(!goMenu.canGoToLine)}
													title={!goMenu.canGoToLine ? "Open a file in the editor." : undefined}
													onClick={() => {
														goMenu.onGoToLineColumn();
														closeMenus();
													}}
												>
													Go to Line/Column…{menuKbd("Ctrl+G")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!goMenu.canGoToBracket}
													className={menuBtnClass(!goMenu.canGoToBracket)}
													title={!goMenu.canGoToBracket ? "Open a file in the editor." : undefined}
													onClick={() => {
														goMenu.onGoToBracket();
														closeMenus();
													}}
												>
													Go to Bracket
												</button>
											</li>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
											<li>
												<button
													type="button"
													disabled={!goMenu.canNavigateProblems}
													className={menuBtnClass(!goMenu.canNavigateProblems)}
													title={
														!goMenu.canNavigateProblems
															? "Problems panel is only available in Technical layout."
															: undefined
													}
													onClick={() => {
														goMenu.onNextProblem();
														closeMenus();
													}}
												>
													Next Problem{menuKbd("F8")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!goMenu.canNavigateProblems}
													className={menuBtnClass(!goMenu.canNavigateProblems)}
													title={
														!goMenu.canNavigateProblems
															? "Problems panel is only available in Technical layout."
															: undefined
													}
													onClick={() => {
														goMenu.onPreviousProblem();
														closeMenus();
													}}
												>
													Previous Problem{menuKbd("Shift+F8")}
												</button>
											</li>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
											<li>
												<button
													type="button"
													disabled={!goMenu.canNavigateChanges}
													className={menuBtnClass(!goMenu.canNavigateChanges)}
													title={
														!goMenu.canNavigateChanges
															? "SCM / diff hunk stepping in the bottom panel is not wired yet."
															: undefined
													}
													onClick={() => {
														goMenu.onNextChange();
														closeMenus();
													}}
												>
													Next Change{menuKbd("Alt+F3")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!goMenu.canNavigateChanges}
													className={menuBtnClass(!goMenu.canNavigateChanges)}
													title={
														!goMenu.canNavigateChanges
															? "SCM / diff hunk stepping in the bottom panel is not wired yet."
															: undefined
													}
													onClick={() => {
														goMenu.onPreviousChange();
														closeMenus();
													}}
												>
													Previous Change{menuKbd("Shift+Alt+F3")}
												</button>
											</li>
										</>
									) : (
										<>
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													onClick={() => {
														onOpenCommandPalette();
														closeMenus();
													}}
												>
													Command palette…
												</button>
											</li>
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													onClick={() => {
														onSelectActivity("search");
														closeMenus();
													}}
												>
													Go to file…
												</button>
											</li>
										</>
									)}
								</ul>
							) : null}
							{openMenu === "Run" && label === "Run" ? (
								<ul className="absolute left-0 top-full z-50 mt-0.5 min-w-[320px] list-none border border-[#454545] bg-[#252526] py-1 shadow-xl">
									{runMenu ? (
										<>
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													onClick={() => {
														closeMenus();
														setDebugHelpOpen(true);
													}}
												>
													<span className="inline-flex items-center gap-2">
														<Info className="h-3.5 w-3.5 shrink-0 text-[#3794ff]" aria-hidden />
														How debugging works
													</span>
												</button>
											</li>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
											<li>
												<button
													type="button"
													disabled={!runMenu.terminalServerEnabled || !runMenu.canStartDebugging}
													className={menuBtnClass(!runMenu.terminalServerEnabled || !runMenu.canStartDebugging)}
													title={
														!runMenu.terminalServerEnabled
															? "Enable WOP_ALLOW_TERMINAL=1 on the server to run the active file in the integrated terminal."
															: !runMenu.canStartDebugging
																? "Start Debugging needs a supported file (.js, .mjs, .cjs, .ts, .tsx, .py) in the editor."
																: undefined
													}
													onClick={() => {
														runMenu.onStartDebugging();
														closeMenus();
													}}
												>
													Start Debugging{menuKbd("F5")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!runMenu.terminalServerEnabled}
													className={menuBtnClass(!runMenu.terminalServerEnabled)}
													title={
														!runMenu.terminalServerEnabled
															? "Enable WOP_ALLOW_TERMINAL=1 on the server to run the active file in the integrated terminal."
															: undefined
													}
													onClick={() => {
														runMenu.onRunWithoutDebugging();
														closeMenus();
													}}
												>
													Run Without Debugging{menuKbd("Ctrl+F5")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!runMenu.debugSessionActive}
													className={menuBtnClass(!runMenu.debugSessionActive)}
													title={
														!runMenu.debugSessionActive
															? "No debug session is active yet."
															: undefined
													}
													onClick={() => {
														runMenu.onStopDebugging();
														closeMenus();
													}}
												>
													Stop Debugging{menuKbd("Shift+F5")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!runMenu.debugSessionActive}
													className={menuBtnClass(!runMenu.debugSessionActive)}
													title={
														!runMenu.debugSessionActive
															? "No debug session is active yet."
															: undefined
													}
													onClick={() => {
														runMenu.onRestartDebugging();
														closeMenus();
													}}
												>
													Restart Debugging{menuKbd("Ctrl+Shift+F5")}
												</button>
											</li>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													title="Open .vscode/launch.json in the editor (same as Cursor / VS Code)."
													onClick={() => {
														runMenu.onOpenConfigurations();
														closeMenus();
													}}
												>
													Open Configurations
												</button>
											</li>
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													title="Append a debug configuration template, then open launch.json."
													onClick={() => {
														runMenu.onAddConfiguration();
														closeMenus();
													}}
												>
													Add Configuration…
												</button>
											</li>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
											<li>
												<button
													type="button"
													disabled={!runMenu.debugSessionActive || !runMenu.debugReplSession}
													className={menuBtnClass(!runMenu.debugSessionActive || !runMenu.debugReplSession)}
													title={
														!runMenu.debugSessionActive
															? "Available when a debug session is active."
															: !runMenu.debugReplSession
																? "For Node/Bun, attach the inspector (e.g. chrome://inspect). Step keys apply to Python pdb in the terminal."
																: undefined
													}
													onClick={() => {
														runMenu.onStepOver();
														closeMenus();
													}}
												>
													Step Over{menuKbd("F10")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!runMenu.debugSessionActive || !runMenu.debugReplSession}
													className={menuBtnClass(!runMenu.debugSessionActive || !runMenu.debugReplSession)}
													title={
														!runMenu.debugSessionActive
															? "Available when a debug session is active."
															: !runMenu.debugReplSession
																? "For Node/Bun, attach the inspector (e.g. chrome://inspect). Step keys apply to Python pdb in the terminal."
																: undefined
													}
													onClick={() => {
														runMenu.onStepInto();
														closeMenus();
													}}
												>
													Step Into{menuKbd("F11")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!runMenu.debugSessionActive || !runMenu.debugReplSession}
													className={menuBtnClass(!runMenu.debugSessionActive || !runMenu.debugReplSession)}
													title={
														!runMenu.debugSessionActive
															? "Available when a debug session is active."
															: !runMenu.debugReplSession
																? "For Node/Bun, attach the inspector (e.g. chrome://inspect). Step keys apply to Python pdb in the terminal."
																: undefined
													}
													onClick={() => {
														runMenu.onStepOut();
														closeMenus();
													}}
												>
													Step Out{menuKbd("Shift+F11")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!runMenu.debugSessionActive || !runMenu.debugReplSession}
													className={menuBtnClass(!runMenu.debugSessionActive || !runMenu.debugReplSession)}
													title={
														!runMenu.debugSessionActive
															? "Available when a debug session is active."
															: !runMenu.debugReplSession
																? "For Node/Bun, attach the inspector (e.g. chrome://inspect). Continue uses pdb when debugging Python in the terminal."
																: undefined
													}
													onClick={() => {
														runMenu.onContinue();
														closeMenus();
													}}
												>
													Continue{menuKbd("F5")}
												</button>
											</li>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
											<li>
												<button
													type="button"
													disabled={!runMenu.canToggleBreakpoint}
													className={menuBtnClass(!runMenu.canToggleBreakpoint)}
													title={
														!runMenu.canToggleBreakpoint
															? "Open a file in the editor to set breakpoints."
															: undefined
													}
													onClick={() => {
														runMenu.onToggleBreakpoint();
														closeMenus();
													}}
												>
													Toggle Breakpoint{menuKbd("F9")}
												</button>
											</li>
											<li
												className="relative"
												onMouseEnter={() => setRunNewBreakpointFlyout(true)}
												onMouseLeave={() => setRunNewBreakpointFlyout(false)}
											>
												<button type="button" className={menuBtnClass()} onClick={() => {}}>
													<span className="pr-6">New Breakpoint</span>
													<ChevronRight
														className="float-right mt-0.5 text-[#858585]"
														size={14}
														aria-hidden
													/>
												</button>
												{runNewBreakpointFlyout ? (
													<ul className={viewFlyoutClass()}>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																onClick={() => {
																	runMenu.onNewBreakpointInline();
																	closeMenus();
																}}
															>
																Inline Breakpoint
															</button>
														</li>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																onClick={() => {
																	runMenu.onNewBreakpointConditional();
																	closeMenus();
																}}
															>
																Conditional Breakpoint…
															</button>
														</li>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																onClick={() => {
																	runMenu.onNewBreakpointLogpoint();
																	closeMenus();
																}}
															>
																Logpoint…
															</button>
														</li>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																onClick={() => {
																	runMenu.onNewBreakpointTriggered();
																	closeMenus();
																}}
															>
																Triggered Breakpoint…
															</button>
														</li>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																onClick={() => {
																	runMenu.onNewBreakpointFunction();
																	closeMenus();
																}}
															>
																Function Breakpoint…
															</button>
														</li>
													</ul>
												) : null}
											</li>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
											<li>
												<button
													type="button"
													disabled={!runMenu.hasBreakpoints || !runMenu.allBreakpointsDisabled}
													className={menuBtnClass(!runMenu.hasBreakpoints || !runMenu.allBreakpointsDisabled)}
													title={
														!runMenu.hasBreakpoints
															? "No breakpoints in the workspace."
															: !runMenu.allBreakpointsDisabled
																? "Breakpoints are already enabled."
																: undefined
													}
													onClick={() => {
														runMenu.onEnableAllBreakpoints();
														closeMenus();
													}}
												>
													Enable All Breakpoints
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!runMenu.hasBreakpoints || runMenu.allBreakpointsDisabled}
													className={menuBtnClass(!runMenu.hasBreakpoints || runMenu.allBreakpointsDisabled)}
													title={
														!runMenu.hasBreakpoints
															? "No breakpoints in the workspace."
															: runMenu.allBreakpointsDisabled
																? "Breakpoints are already disabled."
																: undefined
													}
													onClick={() => {
														runMenu.onDisableAllBreakpoints();
														closeMenus();
													}}
												>
													Disable All Breakpoints
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!runMenu.hasBreakpoints}
													className={menuBtnClass(!runMenu.hasBreakpoints)}
													title={!runMenu.hasBreakpoints ? "No breakpoints in the workspace." : undefined}
													onClick={() => {
														runMenu.onRemoveAllBreakpoints();
														closeMenus();
													}}
												>
													Remove All Breakpoints
												</button>
											</li>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													title="Open links to the VS Code Marketplace debugger category and popular DAP extensions (install in Cursor / VS Code)."
													onClick={() => {
														runMenu.onInstallAdditionalDebuggers();
														closeMenus();
													}}
												>
													Install Additional Debuggers…
												</button>
											</li>
										</>
									) : (
										<>
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													onClick={() => {
														onFocusBottomTab("tool_log");
														closeMenus();
													}}
												>
													Show tool log
												</button>
											</li>
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													onClick={() => {
														onFocusBottomTab("output");
														closeMenus();
													}}
												>
													Show output
												</button>
											</li>
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													onClick={() => {
														onFocusBottomTab("terminal");
														closeMenus();
													}}
												>
													Show terminal panel
												</button>
											</li>
										</>
									)}
								</ul>
							) : null}
							{openMenu === "Terminal" && label === "Terminal" ? (
								<ul className="absolute left-0 top-full z-50 mt-0.5 min-w-[300px] list-none border border-[#454545] bg-[#252526] py-1 shadow-xl">
									{terminalMenu ? (
										<>
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													onClick={() => {
														terminalMenu.onNewTerminal();
														closeMenus();
													}}
												>
													New Terminal
												</button>
											</li>
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													onClick={() => {
														terminalMenu.onSplitTerminal();
														closeMenus();
													}}
												>
													Split Terminal{menuKbd("Ctrl+Shift+5")}
												</button>
											</li>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													onClick={() => {
														terminalMenu.onRunTask();
														closeMenus();
													}}
												>
													Run Task…
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!terminalMenu.terminalServerEnabled}
													className={menuBtnClass(!terminalMenu.terminalServerEnabled)}
													title={
														!terminalMenu.terminalServerEnabled
															? "Enable WOP_ALLOW_TERMINAL=1 on the server to inject shell commands."
															: undefined
													}
													onClick={() => {
														terminalMenu.onRunBuildTask();
														closeMenus();
													}}
												>
													Run Build Task…{menuKbd("Ctrl+Shift+B")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!terminalMenu.terminalServerEnabled}
													className={menuBtnClass(!terminalMenu.terminalServerEnabled)}
													title={
														!terminalMenu.terminalServerEnabled
															? "Enable WOP_ALLOW_TERMINAL=1 on the server to inject shell commands."
															: undefined
													}
													onClick={() => {
														terminalMenu.onRunActiveFile();
														closeMenus();
													}}
												>
													Run Active File
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!terminalMenu.terminalServerEnabled}
													className={menuBtnClass(!terminalMenu.terminalServerEnabled)}
													title={
														!terminalMenu.terminalServerEnabled
															? "Enable WOP_ALLOW_TERMINAL=1 on the server to inject shell commands."
															: undefined
													}
													onClick={() => {
														terminalMenu.onRunSelectedText();
														closeMenus();
													}}
												>
													Run Selected Text
												</button>
											</li>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
											<li>
												<button
													type="button"
													disabled
													title="No background task runner is wired yet."
													className={menuBtnClass(true)}
												>
													Show Running Tasks…
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled
													title="No background task runner is wired yet."
													className={menuBtnClass(true)}
												>
													Restart Running Task…
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled
													title="No background task runner is wired yet."
													className={menuBtnClass(true)}
												>
													Terminate Task…
												</button>
											</li>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													onClick={() => {
														terminalMenu.onConfigureTasks();
														closeMenus();
													}}
												>
													Configure Tasks…
												</button>
											</li>
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													onClick={() => {
														terminalMenu.onConfigureDefaultBuildTask();
														closeMenus();
													}}
												>
													Configure Default Build Task…
												</button>
											</li>
										</>
									) : (
										<>
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													onClick={() => {
														onFocusBottomTab("terminal");
														closeMenus();
													}}
												>
													Focus terminal panel
												</button>
											</li>
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													onClick={() => {
														onFocusBottomTab("tool_log");
														closeMenus();
													}}
												>
													Focus tool log
												</button>
											</li>
										</>
									)}
								</ul>
							) : null}
							{openMenu === "Help" && label === "Help" ? (
								<ul className="absolute left-0 top-full z-50 mt-0.5 min-w-[300px] list-none border border-[#454545] bg-[#252526] py-1 shadow-xl">
									{helpMenu ? (
										<>
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													onClick={() => {
														helpMenu.onShowAllCommands();
														closeMenus();
													}}
												>
													Show All Commands{menuKbd("Ctrl+Shift+P")}
												</button>
											</li>
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													title="Short guide: workspace, layouts, chat, command palette — plus links to docs on GitHub."
													onClick={() => {
														helpMenu.onHowToUse();
														closeMenus();
													}}
												>
													How to use Way of Pi…
												</button>
											</li>
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													title="Opens GET /api/diagnostics in a new tab — workspace roots, WOP_* env, Ollama reachability, Pi binary probe."
													onClick={() => {
														helpMenu.onOpenHostDoctor();
														closeMenus();
													}}
												>
													Host doctor…
												</button>
											</li>
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													onClick={() => {
														helpMenu.onEditorPlayground();
														closeMenus();
													}}
												>
													Editor Playground
												</button>
											</li>
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													onClick={() => {
														helpMenu.onAccessibilityFeatures();
														closeMenus();
													}}
												>
													Get Started with Accessibility Features
												</button>
											</li>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													title="Open WhyNot Productions contact (feedback and inquiries)."
													onClick={() => {
														helpMenu.onGiveFeedback();
														closeMenus();
													}}
												>
													Give Feedback…
												</button>
											</li>
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													title="Open WhyNot Productions — home and projects."
													onClick={() => {
														helpMenu.onSupportUs();
														closeMenus();
													}}
												>
													Support us
												</button>
											</li>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													title="Show the MIT license for this project."
													onClick={() => {
														helpMenu.onViewLicense();
														closeMenus();
													}}
												>
													View License
												</button>
											</li>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
											<li>
												<button
													type="button"
													disabled={!helpMenu.canToggleDeveloperTools}
													className={menuBtnClass(!helpMenu.canToggleDeveloperTools)}
													title={
														!helpMenu.canToggleDeveloperTools
															? "In a normal browser, use F12 or the browser menu. In the Way of Pi Electron window, this row is enabled."
															: undefined
													}
													onClick={() => {
														helpMenu.onToggleDeveloperTools();
														closeMenus();
													}}
												>
													Toggle Developer Tools{menuKbd("Ctrl+Shift+I")}
												</button>
											</li>
											<li>
												<button
													type="button"
													disabled={!helpMenu.canOpenProcessExplorer}
													className={menuBtnClass(!helpMenu.canOpenProcessExplorer)}
													title={
														!helpMenu.canOpenProcessExplorer
															? "Process explorer is not available in the web shell."
															: undefined
													}
													onClick={() => {
														helpMenu.onOpenProcessExplorer();
														closeMenus();
													}}
												>
													Open Process Explorer
												</button>
											</li>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
											<li>
												<button
													type="button"
													disabled={!helpMenu.canDownloadUpdate}
													className={menuBtnClass(!helpMenu.canDownloadUpdate)}
													title={
														helpMenu.canDownloadUpdate
															? "Open GitHub releases for this project."
															: "No update channel is configured for this build."
													}
													onClick={() => {
														helpMenu.onDownloadUpdate();
														closeMenus();
													}}
												>
													Download Update
												</button>
											</li>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													onClick={() => {
														setAboutOpen(true);
														closeMenus();
													}}
												>
													About
												</button>
											</li>
										</>
									) : (
										<>
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													onClick={() => {
														onOpenCommandPalette();
														closeMenus();
													}}
												>
													Command palette…
												</button>
											</li>
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													onClick={() => {
														setAboutOpen(true);
														closeMenus();
													}}
												>
													About Way of Pi
												</button>
											</li>
										</>
									)}
								</ul>
							) : null}
							{openMenu === "Agents" && label === "Agents" ? (
								<ul className="absolute left-0 top-full z-50 mt-0.5 min-w-[320px] list-none border border-[#454545] bg-[#252526] py-1 shadow-xl">
									<li>
										<button
											type="button"
											className={menuBtnClass()}
											title={
												"Pi-style workspace agents: markdown under .pi/agents (and scan roots), plus .pi/agents/teams.yaml for agent-team rosters."
											}
											onClick={() => {
												onOpenAgentSetup();
												closeMenus();
											}}
										>
											Workspace agents & teams…
										</button>
									</li>
									<li>
										<button
											type="button"
											className={menuBtnClass()}
											title="Choose what agents may attempt (read, write, commands, team edits). Stored in this browser; Pi and the server still enforce their own limits."
											onClick={() => {
												onOpenAgentPermissions();
												closeMenus();
											}}
										>
											Agent permissions…
										</button>
									</li>
									<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
									<li>
										<button
											type="button"
											className={menuBtnClass()}
											title="Create or edit team names and member agent ids (Pi agent-team / dispatch_agent)."
											onClick={() => {
												onOpenTeamsYaml();
												closeMenus();
											}}
										>
											Edit team rosters (teams.yaml)…
										</button>
									</li>
									<li>
										<button
											type="button"
											className={menuBtnClass()}
											title="Adds a Markdown file with YAML frontmatter under .pi/agents (same folder as teams.yaml when present)."
											onClick={() => {
												onCreateAgentMarkdown();
												closeMenus();
											}}
										>
											New agent definition…
										</button>
									</li>
									<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
									<li>
										<button
											type="button"
											className={menuBtnClass()}
											title="Re-scan workspace agent files and teams.yaml (GET /api/agents)."
											onClick={() => {
												onReloadAgents();
												closeMenus();
											}}
										>
											Reload agent catalog
										</button>
									</li>
								</ul>
							) : null}
							{openMenu === "Settings" && label === "Settings" ? (
								<ul className="absolute left-0 top-full z-50 mt-0.5 min-w-[min(340px,92vw)] list-none border border-[#454545] bg-[#252526] py-1 shadow-xl">
									{settingsMenu ? (
										<>
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													title="Simple UI: appearance, approval queue preview, switch to Technical layout."
													onClick={() => {
														settingsMenu.onOpenSimpleAppSettings();
														closeMenus();
													}}
												>
													Appearance & app preferences…
												</button>
											</li>
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													title="Models, provider, and workspace Pi JSON paths."
													onClick={() => {
														settingsMenu.onOpenAiBrains();
														closeMenus();
													}}
												>
													AI Brains & models…
												</button>
											</li>
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													title="Workspace root summary and refresh."
													onClick={() => {
														settingsMenu.onOpenProjects();
														closeMenus();
													}}
												>
													Projects workspace…
												</button>
											</li>
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													title="Local codebase manifest, optional chat summary, and doc URLs (Cursor-style Indexing & Docs)."
													onClick={() => {
														settingsMenu.onOpenIndexingDocs();
														closeMenus();
													}}
												>
													Indexing & Docs…
												</button>
											</li>
											<li>
												<button
													type="button"
													className={menuBtnClass()}
													title="Honcho memory API: env vars, honcho-mirror extension, links to docs/HONCHO_INTEGRATION.md."
													onClick={() => {
														settingsMenu.onOpenHonchoSettings();
														closeMenus();
													}}
												>
													Honcho (memory API)…
												</button>
											</li>
											{settingsMenu.onEditWorkspaceViewsCatalog ? (
												<li>
													<button
														type="button"
														className={menuBtnClass()}
														title="Edit `.wayofpi/ui-views.json` (Simple workspace views catalog)."
														onClick={() => {
															settingsMenu.onEditWorkspaceViewsCatalog?.();
															closeMenus();
														}}
													>
														Workspace views catalog…
													</button>
												</li>
											) : null}
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
										</>
									) : null}
									<li>
										<button
											type="button"
											className={menuBtnClass()}
											title="Technical sidebar: server config, Pi provider files, workspace path."
											onClick={() => {
												onSelectActivity("settings");
												closeMenus();
											}}
										>
											Workspace & server (sidebar)…
										</button>
									</li>
									{settingsMenu ? (
										<li>
											<button
												type="button"
												className={menuBtnClass()}
												title="Opens a short dialog: you can turn Way of Pi off so it can start fresh, then open it again the way you usually do."
												onClick={() => {
													void settingsMenu.onRestartServer();
													closeMenus();
												}}
											>
												Restart Way of Pi…
											</button>
										</li>
									) : null}
									<li>
										<button
											type="button"
											className={menuBtnClass()}
											title="Open Planning side panel (chat mode, build/plan context)."
											onClick={() => {
												onSelectActivity("planning");
												closeMenus();
											}}
										>
											Planning tools (sidebar)…
										</button>
									</li>
									<li>
										<button
											type="button"
											className={menuBtnClass()}
											title="Extensions side panel."
											onClick={() => {
												onSelectActivity("extensions");
												closeMenus();
											}}
										>
											Extensions (sidebar)…
										</button>
									</li>
									<li>
										<button
											type="button"
											disabled
											className={menuBtnClass(true)}
											title="MCP server configuration in the shell is not wired yet; track docs/WOP_OPEN_TODOS.md and Pi MCP parity."
										>
											MCP server <span className="text-[#555]">(planned)</span>
										</button>
									</li>
									{viewTechnical ? (
										<>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
											<li
												className="relative"
												onMouseEnter={() => setSettingsViewFlyout(true)}
												onMouseLeave={() => setSettingsViewFlyout(false)}
											>
												<button
													type="button"
													className={menuBtnClass()}
													aria-expanded={settingsViewFlyout}
													aria-haspopup="menu"
													title="Editor chrome and layout. Hover to open the list to the side."
													onFocus={() => setSettingsViewFlyout(true)}
													onBlur={(e) => {
														if (!e.currentTarget.contains(e.relatedTarget)) setSettingsViewFlyout(false);
													}}
												>
													View
													<span className="float-right text-[#858585]">▸</span>
												</button>
												{settingsViewFlyout ? (
													<ul
														className={`${viewFlyoutClass()} min-w-[280px]`}
														role="menu"
														onMouseDown={(e) => e.stopPropagation()}
													>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																role="menuitem"
																onClick={() => {
																	viewTechnical.onToggleStatusBar();
																	closeMenus();
																}}
															>
																Status bar
																{viewTechnical.statusBarVisible ? (
																	<span className="float-right text-[#89d185]">✓</span>
																) : null}
															</button>
														</li>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																role="menuitem"
																onClick={() => {
																	viewTechnical.onToggleMenuBar();
																	closeMenus();
																}}
															>
																Menu bar
																{viewTechnical.menuBarVisible ? (
																	<span className="float-right text-[#89d185]">✓</span>
																) : null}
															</button>
														</li>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																role="menuitem"
																onClick={() => {
																	viewTechnical.onToggleWordWrap();
																	closeMenus();
																}}
															>
																Editor word wrap
																{viewTechnical.wordWrap ? (
																	<span className="float-right text-[#89d185]">✓</span>
																) : null}
															</button>
														</li>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																role="menuitem"
																onClick={() => {
																	viewTechnical.onToggleBreadcrumbs();
																	closeMenus();
																}}
															>
																Breadcrumbs
																{viewTechnical.breadcrumbsVisible ? (
																	<span className="float-right text-[#89d185]">✓</span>
																) : null}
															</button>
														</li>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																role="menuitem"
																onClick={() => {
																	viewTechnical.onToggleCenteredLayout?.();
																	closeMenus();
																}}
															>
																Centered editor layout
																<span className="float-right font-mono text-[10px] text-[#858585]">
																	{viewTechnical.centeredLayout ? (
																		<span className="mr-2 text-[#89d185]">✓</span>
																	) : null}
																	Ctrl+Alt+C
																</span>
															</button>
														</li>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																role="menuitem"
																title="Exit browser full screen (if any), leave Zen mode, and turn off centered layout."
																onClick={() => {
																	viewTechnical.onNormalView();
																	closeMenus();
																}}
															>
																Normal view
																{menuKbd("Ctrl+Alt+N")}
															</button>
														</li>
														{onToggleAgentPanel != null && agentPanelVisible != null ? (
															<li>
																<button
																	type="button"
																	className={menuBtnClass()}
																	role="menuitem"
																	title="Show or hide the agent / chat dock region. Shortcut: Ctrl+Alt+B (macOS: Cmd+Alt+B)."
																	onClick={() => {
																		onToggleAgentPanel();
																		closeMenus();
																	}}
																>
																	Agent / chat panel
																	<span className="float-right font-mono text-[10px] text-[#858585]">
																		{agentPanelVisible ? (
																			<span className="mr-2 text-[#89d185]">✓</span>
																		) : null}
																		Ctrl+Alt+B
																	</span>
																</button>
															</li>
														) : null}
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																role="menuitem"
																title={
																	viewTechnical.zenMode
																		? "Leave Zen (full editor)."
																		: "Zen mode — hide side activity and panels."
																}
																onClick={() => {
																	if (viewTechnical.zenMode) viewTechnical.onExitZen();
																	else viewTechnical.onEnterZen();
																	closeMenus();
																}}
															>
																{viewTechnical.zenMode ? "Exit Zen mode" : "Enter Zen mode"}
																{menuKbd("Ctrl+Alt+Z")}
															</button>
														</li>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																role="menuitem"
																title="Reset chrome zoom to 100% (Technical layout)."
																onClick={() => {
																	viewTechnical.onZoomReset();
																	closeMenus();
																}}
															>
																Reset UI zoom (100%)
																<span className="float-right font-mono text-[10px] text-[#858585]">
																	{viewTechnical.uiZoomPercent}%
																</span>
															</button>
														</li>
														<li>
															<button
																type="button"
																className={menuBtnClass()}
																role="menuitem"
																title="Browser full-screen API when available."
																onClick={() => {
																	viewTechnical.onToggleFullScreen();
																	closeMenus();
																}}
															>
																Full screen
																{menuKbd("F11")}
															</button>
														</li>
													</ul>
												) : null}
											</li>
										</>
									) : null}
									{onNewPlanFile ? (
										<>
											<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
											<li>
												<button
													type="button"
													disabled={newPlanFileDisabled}
													className={menuBtnClass(!!newPlanFileDisabled)}
													title="Creates plans/PLAN-YYYYMMDD-slug.md with a template (overwrites if path exists)"
													onClick={() => {
														onNewPlanFile();
														closeMenus();
													}}
												>
													New plan file (plans/PLAN-…)…
												</button>
											</li>
										</>
									) : null}
								</ul>
							) : null}
						</div>
					))}
				</nav>
				</div>
			<div className="flex shrink-0 items-center gap-2 sm:gap-4">
				<button
					type="button"
					onClick={onOpenCommandPalette}
					className="hidden cursor-pointer items-center gap-2 rounded border border-[#454545] bg-[#3c3c3c] px-2 py-1 transition-colors hover:bg-[#4d4d4d] sm:flex"
					title="Command palette (Ctrl+K)"
				>
					<Search size={12} className="text-[#cccccc]" />
					<span className="hidden text-[12px] text-[#cccccc] lg:inline">Search or command…</span>
					<span className="ml-1 hidden font-mono text-[#858585] lg:inline">⌘K</span>
				</button>

				<div className="relative" ref={modelRef}>
					<button
						type="button"
						onClick={() => setModelOpen(!modelOpen)}
						className="flex max-w-[min(200px,28vw)] cursor-pointer items-center gap-2 rounded border border-[#3c3c3c] bg-[#2d2d2d] px-2 py-1 text-[12px] hover:bg-[#3a3a3a]"
						title="Server LLM config"
					>
						<CircleDot size={10} className="shrink-0 text-[#89d185]" />
						<span className="truncate font-mono" title={modelLabel}>
							{modelLabel}
						</span>
						<ChevronDown size={12} className="shrink-0 text-[#858585]" />
					</button>
					{modelOpen ? (
						<div className="absolute right-0 top-full z-50 mt-1 w-[min(320px,85vw)] flex flex-col max-h-[80vh] border border-[#454545] bg-[#252526] p-3 shadow-xl">
							<div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase text-[#858585]">
								<span>Available Models</span>
								{llmModels?.loading ? (
									<span className="text-[10px] animate-pulse">Scanning…</span>
								) : (
									<button 
										type="button" 
										className="hover:text-white transition-colors" 
										onClick={() => llmModels?.reload()}
										title="Refresh models"
									>
										<Activity size={12} />
									</button>
								)}
							</div>
							
							<div className="flex-1 overflow-y-auto min-h-0 -mx-1 px-1">
								{llmModels?.data?.models && llmModels.data.models.length > 0 ? (
									<ul className="list-none space-y-0.5 p-0">
										{llmModels.data.models.map((m) => (
											<li key={m.name}>
												<button
													type="button"
													className={`group flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[12px] transition-colors ${
														modelLabel === m.name
															? "bg-[#007acc]/40 text-white"
															: "text-[#cccccc] hover:bg-[#3c3c3c]"
													}`}
													onClick={() => {
														onSelectLlmModel?.(m.name);
														setModelOpen(false);
													}}
												>
													<div className="flex items-center gap-2 min-w-0">
														{m.name.includes("llama") ? <Box size={12} className="shrink-0 text-orange-400" /> : <Monitor size={12} className="shrink-0 text-blue-400" />}
														<span className="truncate font-mono">{m.name}</span>
													</div>
													{modelLabel === m.name && <CircleDot size={10} className="shrink-0 text-[#89d185]" />}
												</button>
											</li>
										))}
									</ul>
								) : (
									<div className="py-4 text-center">
										<p className="text-[12px] text-[#858585]">
											{llmModels?.loading ? "Checking Ollama models…" : "No models found."}
										</p>
										{!llmModels?.loading && llmModels?.data?.provider === 'ollama' && (
											<p className="mt-1 text-[10px] text-[#858585]">
												Ensure Ollama is running on {llmModels.data.ollamaHost}
											</p>
										)}
									</div>
								)}
							</div>

							<div className="mt-3 border-t border-[#3c3c3c] pt-2">
								<div className="flex items-center justify-between text-[10px] text-[#858585]">
									<span>Provider: <span className="text-[#9cdcfe] uppercase">{llmModels?.data?.provider || config?.provider || "Unknown"}</span></span>
									{llmModels?.data?.models && (
										<span>{llmModels.data.models.length} models</span>
									)}
								</div>
								
								{onOpenPiModelConfig && (
									<div className="mt-2 space-y-0.5">
										<div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-[#555]">Workspace providers</div>
										{PI_MODEL_CONFIG_ENTRIES.map((e) => (
											<button
												key={e.id}
												type="button"
												className="flex w-full items-center justify-between rounded px-1.5 py-0.5 text-left text-[10px] text-[#858585] hover:bg-[#333] hover:text-[#cccccc] transition-colors"
												onClick={() => {
													onOpenPiModelConfig(e.path);
													setModelOpen(false);
												}}
												title={e.hint}
											>
												<span className="truncate">{e.label}</span>
												<ExternalLink size={8} />
											</button>
										))}
									</div>
								)}
							</div>
						</div>
					) : null}
				</div>
			</div>
			</div>

			{/* Bottom row: mode toggles */}
			<div className="flex items-center border-t border-[#252526] px-3 py-1">
				<UiModeToggle uiMode={uiMode} onUiModeChange={onUiModeChange} />
			</div>

			{debugHelpOpen ? (
				<div
					className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4"
					role="presentation"
					onMouseDown={(e) => {
						if (e.target === e.currentTarget) setDebugHelpOpen(false);
					}}
				>
					<div
						className="max-w-lg rounded border border-[#454545] bg-[#252526] p-6 shadow-2xl"
						role="dialog"
						aria-labelledby="debug-help-title"
						aria-describedby="debug-help-desc"
					>
						<h2 id="debug-help-title" className="flex items-center gap-2 text-lg font-bold text-white">
							<Info className="h-5 w-5 text-[#3794ff]" aria-hidden />
							Run and debug
						</h2>
						<div id="debug-help-desc" className="mt-3 space-y-3 text-[13px] leading-relaxed text-[#cccccc]">
							<p>
								Way of Pi does not embed the full VS Code debugger. Commands in <strong className="text-[#e0e0e0]">Run</strong>{" "}
								send lines to the <strong className="text-[#e0e0e0]">integrated terminal</strong>, so the server must allow
								PTYs (<span className="font-mono text-[#9cdcfe]">WOP_ALLOW_TERMINAL=1</span>).
							</p>
							<p>
								<strong className="text-[#e0e0e0]">Open Configurations</strong> opens{" "}
								<code className="text-[#9cdcfe]">.vscode/launch.json</code>. <strong className="text-[#e0e0e0]">Add Configuration…</strong>{" "}
								appends a Cursor/VS Code-style template (Node, Bun, Python debugpy, or attach) then opens the file — use
								those entries in Cursor when you work in the same workspace.
							</p>
							<p>
								<strong className="text-[#e0e0e0]">Install Additional Debuggers…</strong> opens Marketplace and doc links so
								you can install <strong className="text-[#e0e0e0]">DAP</strong> extensions in Cursor / VS Code (Python debugpy,
								CodeLLDB, Go, Bun, Java, PHP, .NET, Ruby, and more).
							</p>
							<p>
								<strong className="text-[#e0e0e0]">Start Debugging</strong> (<kbd className="rounded bg-[#3c3c3c] px-1 font-mono text-[11px]">F5</kbd>
								): runs the active file with a debugger-friendly launcher —{" "}
								<span className="font-mono text-[#9cdcfe]">node --inspect-brk</span> for JavaScript,{" "}
								<span className="font-mono text-[#9cdcfe]">bun --inspect-wait</span> for TypeScript,{" "}
								<span className="font-mono text-[#9cdcfe]">python3 -m pdb</span> for Python. Attach Node/Bun with your
								browser or IDE inspector (e.g. open <span className="font-mono text-[#9cdcfe]">chrome://inspect</span>).
							</p>
							<p>
								<strong className="text-[#e0e0e0]">Run Without Debugging</strong> (
								<kbd className="rounded bg-[#3c3c3c] px-1 font-mono text-[11px]">Ctrl+F5</kbd>) runs the file normally.{" "}
								<strong className="text-[#e0e0e0]">Stop</strong> (
								<kbd className="rounded bg-[#3c3c3c] px-1 font-mono text-[11px]">Shift+F5</kbd>) sends Ctrl+C to the terminal
								and clears the in-app debug session.
							</p>
							<p>
								For <strong className="text-[#e0e0e0]">Python pdb</strong>, Continue / Step in the menu (and{" "}
								<kbd className="rounded bg-[#3c3c3c] px-1 font-mono text-[11px]">F5</kbd> /{" "}
								<kbd className="rounded bg-[#3c3c3c] px-1 font-mono text-[11px]">F10</kbd> /{" "}
								<kbd className="rounded bg-[#3c3c3c] px-1 font-mono text-[11px]">F11</kbd>) send pdb commands when those
								items are enabled. Editor gutter breakpoints are not yet wired to the runtime.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setDebugHelpOpen(false)}
							className="mt-5 rounded bg-[#007acc] px-4 py-2 text-[13px] text-white hover:bg-[#006bb3]"
						>
							Close
						</button>
					</div>
				</div>
			) : null}

			{aboutOpen ? (
				<div
					className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4"
					role="presentation"
					onMouseDown={(e) => {
						if (e.target === e.currentTarget) setAboutOpen(false);
					}}
				>
					<div
						className="max-w-md rounded border border-[#454545] bg-[#252526] p-6 shadow-2xl"
						role="dialog"
						aria-labelledby="about-title"
					>
						<h2 id="about-title" className="text-lg font-bold text-white">
							Way of Pi
						</h2>
						<p className="mt-2 text-[13px] leading-relaxed text-[#cccccc]">
							Technical web shell for the Pi extension playground. Chat and workspace tools use the{" "}
							<strong className="font-semibold text-[#e0e0e0]">folder you open</strong> as the workspace. Upstream Pi
							is{" "}
							<a
								href="https://github.com/earendil-works/pi-mono"

								className="text-[#3794ff] underline"
								target="_blank"
								rel="noreferrer"
							>
								Pi Coding Agent
							</a>
							.
						</p>
						<p className="mt-3 text-[13px] leading-relaxed text-[#cccccc]">
							<strong className="font-semibold text-[#e0e0e0]">In simple terms, you can:</strong>
						</p>
						<ul className="mt-1.5 list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-[#cccccc]">
							<li>
								<strong className="font-semibold text-[#e0e0e0]">Code and systems</strong> — get step-by-step help
								building apps, scripts, homework projects, or fixing bugs while the AI can read the same files you see
								in the tree (when tools or Pi-backed chat are enabled).
							</li>
							<li>
								<strong className="font-semibold text-[#e0e0e0]">Documents and plans</strong> — keep READMEs, plans
								(like <span className="font-mono text-[12px] text-[#9cdcfe]">plans/</span>), and internal write-ups
								next to the code so your team&apos;s story stays in one place.
							</li>
							<li>
								<strong className="font-semibold text-[#e0e0e0]">Learn and explore</strong> — ask how things work,
								trace errors, or sketch a design; optional terminal and Git helpers when your operator turns them on.
							</li>
							<li>
								<strong className="font-semibold text-[#e0e0e0]">Company or club playbooks</strong> — check this repo
								into git and share the same extensions, agents, and docs so everyone follows the same playbook (still
								your own API keys and machines).
							</li>
						</ul>
						<p className="mt-3 text-[12px] leading-relaxed text-[#9d9d9d]">
							Heavy automation (editing files, running commands) depends on your Settings, orchestrator toggles, and
							whether chat runs through the Pi CLI — see <strong className="font-semibold text-[#b0b0b0]">Help → Host doctor</strong>{" "}
							and the <span className="font-mono text-[11px]">docs/</span> folder in the Way of Pi checkout (for example{" "}
							<span className="font-mono text-[11px]">WOP_PRODUCT_CAPABILITIES.md</span>).
						</p>
						<p className="mt-3 text-[13px] leading-relaxed text-[#cccccc]">
							Made by zerwiz.{" "}
							<a
								href="https://whynotproductions.netlify.app/"
								className="text-[#3794ff] underline"
								target="_blank"
								rel="noreferrer"
							>
								Home
							</a>
							{" · "}
							<a
								href="https://github.com/zerwiz"
								className="text-[#3794ff] underline"
								target="_blank"
								rel="noreferrer"
							>
								GitHub
							</a>
						</p>
						<button
							type="button"
							onClick={() => setAboutOpen(false)}
							className="mt-4 rounded bg-[#007acc] px-4 py-2 text-[13px] text-white hover:bg-[#006bb3]"
						>
							Close
						</button>
					</div>
				</div>
			) : null}
		</header>
	);
}
