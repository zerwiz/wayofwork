import { useCallback, useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { X } from "lucide-react";
import { useMaxWidthMediaQuery } from "../../hooks/useMaxWidthMediaQuery";
import { StatusBar } from "../StatusBar";
import { DockSplitHandle } from "../DockSplitHandle";
import type { ServerConfig } from "../../hooks/useServerConfig";
import { useAgents } from "../../hooks/useAgents";
import { useSimpleChatWorkspaceLayout } from "../../hooks/useSimpleChatWorkspaceLayout";
import { useSimplePreferences } from "../../hooks/useSimplePreferences";
import type { PiModelConfigPath } from "../../constants/piModelConfigPaths";
import type { ChatRow, ChatSessionMode, LogRow } from "../../hooks/useWayOfPiSession";
import type { ChatQueueItem } from "../../utils/chatQueueTranscript";
import type { TreeNode } from "../../types/tree";
import type { FilePersistEncoding } from "../../hooks/useFileEditor";
import { SimpleChatView } from "./SimpleChatView";
import { SimpleFilePanel } from "./SimpleFilePanel";
import { SimplePlanWorkspacePane } from "./SimplePlanWorkspacePane";
import { SimpleModelsView } from "./SimpleModelsView";
import type { WorkspaceEditorRef } from "../../types/workspaceEditor";
import type { SimpleTabId } from "./SimpleNavRail";
import { SimpleNavRail } from "./SimpleNavRail";
import { SimpleProjectsView } from "./SimpleProjectsView";
import { SimpleRightPanel } from "./SimpleRightPanel";
import { SimpleSecondaryToolbar } from "./SimpleSecondaryToolbar";
import { SimpleSettingsView } from "./SimpleSettingsView";
import { SimpleTeamView } from "./SimpleTeamView";
import { SimpleMobileTabBar } from "../mobile/simple/SimpleMobileTabBar";
import ChatExplorer from "../documenthandler/ChatExplorer";

function languageFromPath(path: string | null): string {
	if (!path) return "Plain Text";
	const ext = path.split(".").pop()?.toLowerCase() ?? "";
	const map: Record<string, string> = {
		py: "Python",
		ts: "TypeScript",
		tsx: "TypeScript",
		js: "JavaScript",
		jsx: "JavaScript",
		json: "JSON",
		md: "Markdown",
		mmd: "Mermaid",
		mermaid: "Mermaid",
		yml: "YAML",
		yaml: "YAML",
	};
	return map[ext] ?? "Plain Text";
}

export function SimpleApp({
	uiMode,
	setUiMode,
	root,
	rootLabel,
	nodes,
	treeLoading,
	treeError,
	refreshTree,
	refreshTreeQuiet,
	modelLabel,
	config,
	effectiveModel,
	onSelectLlmModel,
	selectedPath,
	setSelectedPath,
	content,
	setContent,
	persistEncoding,
	fileMimeType,
	fileLoading,
	fileError,
	dirty,
	save,
	discardUnsavedChanges,
	line,
	col,
	onCursor,
	rows,
	logs,
	streaming,
	chatStreamUiEnabled,
	onChatStreamUiEnabledChange,
	chatQueuePending,
	chatQueueItems,
	editChatQueueItem,
	deleteChatQueueItem,
	forceChatQueueItem,
	connected,
	error,
	sendChat,
	stop,
	clearError,
	onReopenLlmFixModal,
	chatAgentName,
	dispatchTurnAgent,
	onChatAgentChange,
	chatMode,
	onChatModeChange,
	activeTab,
	onTabChange,
	providerConfigInitialPath,
	providerConfigInitialNonce,
	onConsumeProviderConfigFocus,
	workspaceEditorRef,
	onUndoRedoStackChange,
	onSelectionPrefsChange,
	onFindInFiles,
	onReplaceInFiles,
	teamsYamlWritePath,
	workspaceReady,
	onOpenTeamsYaml,
	onCreateAgentDefinition,
	onOpenFolder,
	onOpenRecentFolder,
	recentFolders,
	onHelp,
	onConfigRefresh,
	onNewPlanFile,
	newPlanFileDisabled,
	onOpenIndexingDocs,
	contextPct,
	contextFillPct,
	tokensDown,
	tokensUp,
	contextTitle,
	tokensTitle,
	planHandoffWorkspaceKey = "",
	onMoveFileToDirectory,
	allowWorkspaceRootDrop = false,
	layoutVariant = "desktop",
	simpleMobileMenuFileFocusRev,
}: {
	uiMode: string;
	setUiMode: (m: string) => void;
	root: string | null;
	rootLabel: string;
	nodes: TreeNode[];
	treeLoading: boolean;
	treeError: string | null;
	refreshTree: () => void;
	/** Reload tree data without `treeLoading` — explorer Git stage uses this so badges update in place. */
	refreshTreeQuiet: () => void | Promise<void>;
	modelLabel: string;
	config: ServerConfig | null;
	effectiveModel: string | null;
	onSelectLlmModel: (modelId: string) => void;
	selectedPath: string | null;
	setSelectedPath: (p: string | null) => void;
	content: string;
	setContent: (s: string) => void;
	persistEncoding: FilePersistEncoding;
	/** From `GET /api/file` when the payload is base64 (images, binary). */
	fileMimeType: string | null;
	fileLoading: boolean;
	fileError: string | null;
	dirty: boolean;
	save: () => Promise<boolean>;
	discardUnsavedChanges: () => void;
	line: number;
	col: number;
	onCursor: (l: number, c: number) => void;
	rows: ChatRow[];
	logs: LogRow[];
	streaming: boolean;
	chatStreamUiEnabled: boolean;
	onChatStreamUiEnabledChange: (on: boolean) => void;
	chatQueuePending: number;
	chatQueueItems: ChatQueueItem[];
	editChatQueueItem: (id: string, text: string) => void;
	deleteChatQueueItem: (id: string) => void;
	forceChatQueueItem: (id: string) => void;
	connected: boolean;
	error: string | null;
	sendChat: (t: string) => void;
	stop: () => void;
	clearError: () => void;
	onReopenLlmFixModal?: () => void;
	chatAgentName: string | null;
	dispatchTurnAgent?: string | null;
	onChatAgentChange: (name: string | null) => void;
	chatMode: ChatSessionMode;
	onChatModeChange: (m: ChatSessionMode) => void;
	activeTab: SimpleTabId;
	onTabChange: (t: SimpleTabId) => void;
	providerConfigInitialPath?: PiModelConfigPath | null;
	providerConfigInitialNonce?: number;
	onConsumeProviderConfigFocus?: () => void;
	workspaceEditorRef?: RefObject<WorkspaceEditorRef | null>;
	onUndoRedoStackChange?: () => void;
	onSelectionPrefsChange?: () => void;
	onFindInFiles?: () => void;
	onReplaceInFiles?: () => void;
	/** Primary `teams.yaml` path for GET/PUT (matches `/api/agents` + multi-root). */
	teamsYamlWritePath: string;
	workspaceReady: boolean;
	onOpenTeamsYaml?: () => void;
	onCreateAgentDefinition?: () => void;
	onOpenFolder?: () => void;
	onOpenRecentFolder?: (path: string) => void;
	recentFolders?: string[];
	onHelp?: () => void;
	onConfigRefresh?: () => void | Promise<void>;
	onNewPlanFile: () => void;
	newPlanFileDisabled: boolean;
	onOpenIndexingDocs?: () => void;
	contextPct: string;
	/** 0–100 from `chat_usage`; null until a completed assistant turn */
	contextFillPct: number | null;
	tokensDown: string;
	tokensUp: string;
	contextTitle: string;
	tokensTitle: string;
	planHandoffWorkspaceKey?: string;
	onMoveFileToDirectory?: (fromPath: string, toDirPath: string) => Promise<void>;
	allowWorkspaceRootDrop?: boolean;
	/** `mobile` = bottom tab bar, no nav rail / status bar; chat uses file sheet + editor overlay. */
	layoutVariant?: "desktop" | "mobile";
	/** When present and increments, open the file editor overlay (mobile shell or narrow ≤767px Simple); path set from App menu / palette. */
	simpleMobileMenuFileFocusRev?: number;
}) {
	const isMobile = layoutVariant === "mobile";
	/** Desktop Simple on viewports ≤767px: nav rail is a drawer, not a permanent column (matches Tailwind `md`). */
	const narrowDesktop = useMaxWidthMediaQuery(767).isAtMaxWidth && !isMobile;
	const [mobileFilesOpen, setMobileFilesOpen] = useState(false);
	const [mobileEditorOpen, setMobileEditorOpen] = useState(false);
	const [leftOpen, setLeftOpen] = useState(() => {
		try {
			const stored = localStorage.getItem("wayofpi.simple.leftOpen");
			if (stored !== null) return JSON.parse(stored) as boolean;
		} catch { /* ignore */ }
		return true;
	});
	const [rightOpen, setRightOpen] = useState(() => {
		try {
			const stored = localStorage.getItem("wayofpi.simple.rightOpen");
			if (stored !== null) return JSON.parse(stored) as boolean;
		} catch { /* ignore */ }
		return true;
	});
	/** Narrow desktop (≤767px): file editor as left slide-over over chat (same idea as mobile shell). */
	const [narrowEditorOpen, setNarrowEditorOpen] = useState(false);
	const {
		approvalQueue,
		setApprovalQueue,
		isDark,
		colorMode,
		setColorMode,
		markdownPaneMode,
		setMarkdownPaneMode,
	} = useSimplePreferences();
	const {
		chatWorkspaceLayout,
		setChatWorkspaceLayout,
		toggleChatWorkspaceLayout,
		chatColumnWidthPx,
		applyChatSplitDelta,
	} = useSimpleChatWorkspaceLayout();
	const agentsApi = useAgents();

	/* Persist sidebar open/closed state */
	useEffect(() => {
		try { localStorage.setItem("wayofpi.simple.leftOpen", JSON.stringify(leftOpen)); } catch {}
	}, [leftOpen]);
	useEffect(() => {
		try { localStorage.setItem("wayofpi.simple.rightOpen", JSON.stringify(rightOpen)); } catch {}
	}, [rightOpen]);

	useEffect(() => {
		if (!narrowDesktop || !leftOpen || isMobile) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setLeftOpen(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [narrowDesktop, leftOpen, isMobile]);

	useEffect(() => {
		if (!isMobile) return;
		if (activeTab !== "chat") {
			setMobileFilesOpen(false);
			setMobileEditorOpen(false);
		}
	}, [isMobile, activeTab]);

	useEffect(() => {
		if (!isMobile) return;
		if (selectedPath == null) setMobileEditorOpen(false);
	}, [isMobile, selectedPath]);

	const prevSimpleMobileMenuFocusRev = useRef<number | null>(null);
	useEffect(() => {
		if (simpleMobileMenuFileFocusRev === undefined) {
			prevSimpleMobileMenuFocusRev.current = null;
			return;
		}
		if (!isMobile && !narrowDesktop) {
			prevSimpleMobileMenuFocusRev.current = null;
			return;
		}
		const rev = simpleMobileMenuFileFocusRev;
		if (prevSimpleMobileMenuFocusRev.current === null) {
			prevSimpleMobileMenuFocusRev.current = rev;
			return;
		}
		if (rev !== prevSimpleMobileMenuFocusRev.current) {
			prevSimpleMobileMenuFocusRev.current = rev;
			if (isMobile) {
				setMobileEditorOpen(true);
				setMobileFilesOpen(false);
			} else {
				setNarrowEditorOpen(true);
				setRightOpen(false);
			}
		}
	}, [isMobile, narrowDesktop, simpleMobileMenuFileFocusRev]);

	const prevChatPathRef = useRef<string | null>(selectedPath);
	const prevSimpleTabRef = useRef<SimpleTabId>(activeTab);
	useEffect(() => {
		const pathJustOpened = prevChatPathRef.current == null && selectedPath != null;
		const switchedToChatWithFile =
			prevSimpleTabRef.current !== "chat" && activeTab === "chat" && selectedPath != null;
		prevChatPathRef.current = selectedPath;
		prevSimpleTabRef.current = activeTab;
		if (activeTab !== "chat" || !selectedPath) return;
		if (pathJustOpened || switchedToChatWithFile) {
			// Below `md`, two-column side-by-side stacks vertically and leaves a huge empty editor slot.
			if (!narrowDesktop) setChatWorkspaceLayout("side_by_side");
		}
	}, [selectedPath, activeTab, setChatWorkspaceLayout, narrowDesktop]);

	useEffect(() => {
		if (!narrowDesktop || isMobile) return;
		if (activeTab !== "chat") setRightOpen(false);
	}, [narrowDesktop, isMobile, activeTab]);

	useEffect(() => {
		if (!narrowDesktop || isMobile || !rightOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setRightOpen(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [narrowDesktop, isMobile, rightOpen]);

	useEffect(() => {
		if (!narrowDesktop || isMobile) return;
		if (selectedPath == null) setNarrowEditorOpen(false);
	}, [narrowDesktop, isMobile, selectedPath]);

	useEffect(() => {
		if (!narrowDesktop || isMobile) return;
		if (activeTab !== "chat") setNarrowEditorOpen(false);
	}, [narrowDesktop, isMobile, activeTab]);

	useEffect(() => {
		if (!narrowDesktop || isMobile || !narrowEditorOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setNarrowEditorOpen(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [narrowDesktop, isMobile, narrowEditorOpen]);

	const workspacePath = root ?? "—";
	const appearanceDark = isDark;

	const copyWorkspacePath = useCallback(() => {
		if (!root) return;
		void navigator.clipboard.writeText(root);
	}, [root]);

	const openAgentFile = useCallback(
		(relativePath: string) => {
			setSelectedPath(relativePath);
			onTabChange("chat");
			if (layoutVariant === "mobile") {
				setMobileEditorOpen(true);
				setMobileFilesOpen(false);
			} else if (narrowDesktop) {
				setNarrowEditorOpen(true);
				setRightOpen(false);
			}
		},
		[setSelectedPath, onTabChange, layoutVariant, narrowDesktop],
	);

	const rootShell = appearanceDark
		? "bg-[#1e1e1e] text-[#cccccc] selection:bg-[#264f78]"
		: "bg-[#f3f3f3] text-[#333333] selection:bg-[#add6ff]/60";
	const mainCol = appearanceDark ? "bg-[#1e1e1e]" : "bg-[#f3f3f3]";
	const splitHandleTone = appearanceDark
		? "hidden md:block"
		: "hidden md:block !bg-[#ececec] hover:!bg-[#007acc]/35 active:!bg-[#007acc]/55";

	const openPlanFileForReview = useCallback(
		(rel: string) => {
			setSelectedPath(rel);
			onTabChange("chat");
			if (layoutVariant === "mobile") {
				setMobileEditorOpen(true);
				setMobileFilesOpen(false);
			} else if (narrowDesktop) {
				setNarrowEditorOpen(true);
				setRightOpen(false);
			}
		},
		[setSelectedPath, onTabChange, layoutVariant, narrowDesktop],
	);

	const chatViewEl = (
		<SimpleChatView
			compactChrome={isMobile || narrowDesktop}
			rows={rows}
			streaming={streaming}
			chatStreamUiEnabled={chatStreamUiEnabled}
			onChatStreamUiEnabledChange={onChatStreamUiEnabledChange}
			chatQueuePending={chatQueuePending}
			chatQueueItems={chatQueueItems}
			onChatQueueEdit={editChatQueueItem}
			onChatQueueDelete={deleteChatQueueItem}
			onChatQueueForce={forceChatQueueItem}
			connected={connected}
			error={error}
			modelLabel={modelLabel}
			onSend={sendChat}
			onStop={stop}
			onClearError={clearError}
			onReopenLlmFixModal={onReopenLlmFixModal}
			appearanceDark={appearanceDark}
			agents={agentsApi.data?.agents ?? []}
			agentTeams={agentsApi.data?.teams ?? {}}
			agentsLoading={agentsApi.loading}
			chatAgentName={chatAgentName}
			dispatchTurnAgent={dispatchTurnAgent}
			onChatAgentChange={onChatAgentChange}
			chatMode={chatMode}
			onChatModeChange={onChatModeChange}
			contextFillPct={contextFillPct}
			contextTitle={contextTitle}
			onOpenPlanFileForReview={openPlanFileForReview}
			planHandoffWorkspaceKey={planHandoffWorkspaceKey}
		/>
	);

	const handleMobileTreeSelect = useCallback(
		(path: string) => {
			setSelectedPath(path);
			setMobileFilesOpen(false);
			setMobileEditorOpen(true);
		},
		[setSelectedPath],
	);

	const handleNarrowTreeSelect = useCallback(
		(path: string) => {
			setSelectedPath(path);
			setRightOpen(false);
			setNarrowEditorOpen(true);
		},
		[setSelectedPath],
	);

	const handleNavTab = useCallback(
		(id: SimpleTabId) => {
			onTabChange(id);
			if (narrowDesktop) setLeftOpen(false);
		},
		[onTabChange, narrowDesktop],
	);

	const handleNavHelp = useCallback(() => {
		onHelp?.();
		if (narrowDesktop) setLeftOpen(false);
	}, [onHelp, narrowDesktop]);

	const navRailEl = (
		<SimpleNavRail
			activeTab={activeTab}
			onTab={handleNavTab}
			onHelp={onHelp ? handleNavHelp : undefined}
			appearanceDark={appearanceDark}
		/>
	);

	const emptyEditorHint = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const showPlanWorkspace = chatMode === "plan" && !selectedPath;

	const mobileStripBg = appearanceDark ? "border-[#252526] bg-[#252526]" : "border-[#e5e5e5] bg-[#f0f0f0]";
	const mobileSheetShell = appearanceDark
		? "border-[#3c3c3c] bg-[#252526] text-[#cccccc]"
		: "border-[#e5e5e5] bg-white text-[#333333]";
	const mobileBtn = appearanceDark
		? "min-h-9 rounded-md border border-[#3c3c3c] bg-[#1e1e1e] px-2.5 py-1.5 text-[11px] font-semibold text-[#cccccc] hover:bg-[#2a2a2a]"
		: "min-h-9 rounded-md border border-[#d4d4d4] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#333333] hover:bg-[#f5f5f5]";

	return (
		<div
			data-simple-theme={appearanceDark ? "dark" : "light"}
			className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden font-sans ${rootShell}`}
		>
			{isMobile ? (
				<>
					<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
						<div className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${mainCol}`}>
							{activeTab === "chat" ? (
								<>
									<div className={`flex shrink-0 flex-wrap items-center gap-2 border-b px-2 py-1.5 ${mobileStripBg}`}>
										<button type="button" className={mobileBtn} onClick={() => setMobileFilesOpen(true)}>
											Project files
										</button>
										{selectedPath ? (
											<button type="button" className={mobileBtn} onClick={() => setMobileEditorOpen(true)}>
												Open file
											</button>
										) : null}
									</div>
									<div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
										{chatViewEl}
										{mobileFilesOpen ? (
										<div
											className="absolute inset-0 z-[70] flex flex-row"
											role="dialog"
											aria-modal="true"
											aria-label="Project files"
										>
											<button
												type="button"
												className="min-h-0 min-w-0 flex-1 bg-black/45"
												aria-label="Dismiss file list"
												onClick={() => setMobileFilesOpen(false)}
											/>
											<div
												className={`flex h-full max-h-full w-[min(100%,400px)] max-w-[94vw] shrink-0 flex-col overflow-hidden border-l shadow-2xl ${mobileSheetShell}`}
												style={{
													paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
												}}
											>
												<div
													className={`flex min-h-10 shrink-0 items-center justify-between border-b px-2 py-1.5 ${appearanceDark ? "border-[#3c3c3c]" : "border-[#e5e5e5]"}`}
												>
													<span className="text-[12px] font-semibold">Project files</span>
													<button
														type="button"
														onClick={() => setMobileFilesOpen(false)}
														className={`min-h-9 min-w-9 rounded-lg text-[11px] font-semibold ${appearanceDark ? "text-[#858585] hover:bg-[#1e1e1e]" : "text-[#666666] hover:bg-[#eeeeee]"}`}
													>
														Done
													</button>
												</div>
												<div className="min-h-0 flex-1 overflow-hidden">
													<SimpleRightPanel
														presentation="sheet"
														nodes={nodes}
														selectedPath={selectedPath}
														onSelectFile={handleMobileTreeSelect}
														loading={treeLoading}
														error={treeError}
														logs={logs}
														streaming={streaming}
														appearanceDark={appearanceDark}
														onExplorerGitMutated={() => void refreshTreeQuiet()}
														onMoveFileToDirectory={onMoveFileToDirectory}
														allowWorkspaceRootDrop={allowWorkspaceRootDrop}
													/>
												</div>
											</div>
										</div>
									) : null}
										{selectedPath && mobileEditorOpen ? (
										<div className="absolute inset-0 z-[80] flex flex-row" role="dialog" aria-modal="true" aria-label="File editor">
											<div
												className={`flex h-full max-h-full w-[min(100%,480px)] max-w-[96vw] shrink-0 flex-col overflow-hidden border-r shadow-2xl ${appearanceDark ? "border-[#3c3c3c] bg-[#1e1e1e]" : "border-[#e5e5e5] bg-[#f3f3f3]"}`}
												style={{
													paddingBottom: "max(0px, env(safe-area-inset-bottom))",
												}}
											>
												<div
													className={`flex min-h-10 shrink-0 items-center justify-between border-b px-2 py-1.5 ${appearanceDark ? "border-[#3c3c3c] bg-[#252526]" : "border-[#e5e5e5] bg-[#f5f5f5]"}`}
												>
													<span
														className={`min-w-0 truncate font-mono text-[11px] font-semibold ${appearanceDark ? "text-[#e5e5e5]" : "text-[#222222]"}`}
														title={selectedPath ?? undefined}
													>
														{selectedPath}
													</span>
													<button
														type="button"
														onClick={() => setMobileEditorOpen(false)}
														className={`inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg ${appearanceDark ? "text-[#cccccc] hover:bg-[#1e1e1e]" : "text-[#333333] hover:bg-[#eeeeee]"}`}
														aria-label="Close editor"
													>
														<X size={18} aria-hidden />
													</button>
												</div>
												<div className={`min-h-0 flex-1 overflow-hidden ${appearanceDark ? "bg-[#1e1e1e]" : "bg-white"}`}>
													<SimpleFilePanel
													ref={workspaceEditorRef}
													path={selectedPath}
													content={content}
													onChange={setContent}
													persistEncoding={persistEncoding}
													fileMimeType={fileMimeType}
													loading={fileLoading}
													error={fileError}
													dirty={dirty}
													onDiscardUnsaved={discardUnsavedChanges}
													onSave={async () => {
														await save();
														await refreshTree();
													}}
													onClose={() => {
														setSelectedPath(null);
														setMobileEditorOpen(false);
													}}
													onCursor={onCursor}
													appearanceDark={appearanceDark}
													onUndoRedoStackChange={onUndoRedoStackChange}
													onSelectionPrefsChange={onSelectionPrefsChange}
													onFindInFiles={onFindInFiles}
													onReplaceInFiles={onReplaceInFiles}
													columnLayout="besideChat"
													markdownPaneMode={markdownPaneMode}
													onMarkdownPaneModeChange={setMarkdownPaneMode}
													/>
												</div>
											</div>
											<button
												type="button"
												className="min-h-0 min-w-0 flex-1 bg-black/45"
												aria-label="Close editor"
												onClick={() => setMobileEditorOpen(false)}
											/>
										</div>
									) : null}
									</div>
								</>
							) : activeTab === "team" ? (
								<div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
									<SimpleTeamView
										modelLabel={modelLabel}
										agents={agentsApi.data?.agents ?? []}
										teams={agentsApi.data?.teams ?? {}}
										teamsPath={agentsApi.data?.teamsPath ?? null}
										teamsYamlWritePath={teamsYamlWritePath}
										workspaceReady={workspaceReady}
										loading={agentsApi.loading}
										error={agentsApi.error}
										onReload={agentsApi.reload}
										onOpenAgentFile={openAgentFile}
										onOpenTeamsYaml={onOpenTeamsYaml}
										onCreateAgentDefinition={onCreateAgentDefinition}
										appearanceDark={appearanceDark}
									/>
								</div>
							) : activeTab === "models" ? (
								<div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
									<SimpleModelsView
										config={config}
										workspaceRoot={root}
										appearanceDark={appearanceDark}
										effectiveModel={effectiveModel}
										onSelectModel={onSelectLlmModel}
										providerConfigInitialPath={providerConfigInitialPath}
										providerConfigInitialNonce={providerConfigInitialNonce}
										onConsumeProviderConfigFocus={onConsumeProviderConfigFocus}
									/>
								</div>
							) : activeTab === "projects" ? (
								<div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
									<SimpleProjectsView
										rootLabel={rootLabel}
										rootPath={workspacePath}
										onRefresh={() => void refreshTree()}
										onOpenFolder={onOpenFolder}
										onOpenRecentFolder={onOpenRecentFolder}
										recentFolders={recentFolders}
										appearanceDark={appearanceDark}
									/>
								</div>
							) : activeTab === "documenthandler" ? (
								<div className="min-h-0 flex-1 overflow-hidden">
									<ChatExplorer
									appearanceDark={appearanceDark}
									nodes={nodes}
									selectedPath={selectedPath}
									onSelectFile={(p) => setSelectedPath(p)}
									loading={treeLoading}
									error={treeError}
									logs={logs}
									streaming={streaming}
									connected={connected}
									rows={rows}
									onSend={sendChat}
									onStop={stop}
								/>
								</div>
							) : activeTab === "settings" ? (
								<div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
									<SimpleSettingsView
										colorMode={colorMode}
										onColorMode={setColorMode}
										approvalQueue={approvalQueue}
										onApprovalQueue={setApprovalQueue}
										onSwitchToTechnical={() => setUiMode("technical")}
										onOpenIndexingDocs={onOpenIndexingDocs}
										serverConfig={config}
										onConfigRefresh={onConfigRefresh}
									/>
								</div>
							) : null}
						</div>
						<SimpleMobileTabBar
							activeTab={activeTab}
							onTab={onTabChange}
							onHelp={onHelp}
							appearanceDark={appearanceDark}
						/>
					</div>
				</>
			) : (
				<>
			<div className="flex min-h-0 flex-1 overflow-hidden">
				{leftOpen ? navRailEl : null}

				<div className={`flex min-w-0 flex-1 flex-col ${mainCol}`}>
					<SimpleSecondaryToolbar
						leftOpen={leftOpen}
						rightOpen={rightOpen}
						onToggleLeft={() => setLeftOpen((v) => !v)}
						onToggleRight={() => setRightOpen((v) => !v)}
						connected={connected}
						appearanceDark={appearanceDark}
						onSwitchToDocs={() => setUiMode("docs")}
						indexingStatus={treeLoading ? "indexing" : treeError ? "idle" : "ready"}
					/>

					<div className="flex min-h-0 flex-1 overflow-hidden">
						<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
							{narrowDesktop && activeTab === "chat" && (selectedPath || narrowEditorOpen) ? (
								<div className={`flex shrink-0 flex-wrap items-center gap-2 border-b px-2 py-1.5 ${mobileStripBg}`}>
									{selectedPath ? (
										<button type="button" className={mobileBtn} onClick={() => setNarrowEditorOpen(true)}>
											Open file
										</button>
									) : null}
									{selectedPath ? (
										<span
											className={`min-w-0 flex-1 basis-full truncate text-left font-mono text-[11px] font-medium sm:basis-auto ${emptyEditorHint}`}
											title={selectedPath}
										>
											{selectedPath}
										</span>
									) : null}
								</div>
							) : null}
							{activeTab === "chat" ? (
								!narrowDesktop && chatWorkspaceLayout === "side_by_side" ? (
									<div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
										<div
											className="flex min-h-0 min-w-0 w-full flex-1 flex-col md:min-w-[260px] md:max-w-[min(94vw,1600px)] md:flex-none md:[width:var(--wop-simple-chat-col)]"
											style={
												{ ["--wop-simple-chat-col" as string]: `${chatColumnWidthPx}px` } as CSSProperties
											}
										>
											{chatViewEl}
										</div>
										<DockSplitHandle
											orientation="vertical"
											className={splitHandleTone}
											onDelta={(dx) => applyChatSplitDelta(dx)}
											ariaLabel="Resize chat and editor"
										/>
										<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
											{selectedPath ? (
												<SimpleFilePanel
													ref={workspaceEditorRef}
													path={selectedPath}
													content={content}
													onChange={setContent}
													persistEncoding={persistEncoding}
													fileMimeType={fileMimeType}
													loading={fileLoading}
													error={fileError}
													dirty={dirty}
													onDiscardUnsaved={discardUnsavedChanges}
													onSave={async () => {
														await save();
														await refreshTree();
													}}
													onClose={() => setSelectedPath(null)}
													onCursor={onCursor}
													appearanceDark={appearanceDark}
													onUndoRedoStackChange={onUndoRedoStackChange}
													onSelectionPrefsChange={onSelectionPrefsChange}
													onFindInFiles={onFindInFiles}
													onReplaceInFiles={onReplaceInFiles}
													columnLayout="besideChat"
													markdownPaneMode={markdownPaneMode}
													onMarkdownPaneModeChange={setMarkdownPaneMode}
												/>
											) : showPlanWorkspace ? (
												<SimplePlanWorkspacePane
													appearanceDark={appearanceDark}
													columnLayout="besideChat"
													canCreatePlan={!newPlanFileDisabled}
													onNewPlanFile={onNewPlanFile}
												/>
											) : (
												<div
													className={`flex flex-1 items-center justify-center px-6 text-center text-sm leading-relaxed ${emptyEditorHint}`}
												>
													Open a file from Project Files to edit it here. Use the layout control next to
													&quot;Project Files&quot; if you prefer editor above chat.
												</div>
											)}
										</div>
									</div>
								) : (
									<>
										{selectedPath && !narrowDesktop ? (
											<SimpleFilePanel
												ref={workspaceEditorRef}
												path={selectedPath}
												content={content}
												onChange={setContent}
												persistEncoding={persistEncoding}
												fileMimeType={fileMimeType}
												loading={fileLoading}
												error={fileError}
												dirty={dirty}
												onDiscardUnsaved={discardUnsavedChanges}
												onSave={async () => {
													await save();
													await refreshTree();
												}}
												onClose={() => setSelectedPath(null)}
												onCursor={onCursor}
												appearanceDark={appearanceDark}
												onUndoRedoStackChange={onUndoRedoStackChange}
												onSelectionPrefsChange={onSelectionPrefsChange}
												onFindInFiles={onFindInFiles}
												onReplaceInFiles={onReplaceInFiles}
												columnLayout="stacked"
												markdownPaneMode={markdownPaneMode}
												onMarkdownPaneModeChange={setMarkdownPaneMode}
											/>
										) : showPlanWorkspace ? (
											<SimplePlanWorkspacePane
												appearanceDark={appearanceDark}
												columnLayout="stacked"
												canCreatePlan={!newPlanFileDisabled}
												onNewPlanFile={onNewPlanFile}
											/>
										) : null}
										<div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
											{chatViewEl}
											{narrowDesktop && selectedPath && narrowEditorOpen ? (
												<div
													className="absolute inset-0 z-[62] flex flex-row"
													role="dialog"
													aria-modal="true"
													aria-label="File editor"
												>
													<div
														className={`flex h-full max-h-full w-[min(100%,480px)] max-w-[96vw] shrink-0 flex-col overflow-hidden border-r shadow-2xl ${appearanceDark ? "border-[#3c3c3c] bg-[#1e1e1e]" : "border-[#e5e5e5] bg-[#f3f3f3]"}`}
														style={{
															paddingBottom: "max(0px, env(safe-area-inset-bottom))",
														}}
													>
														<div
															className={`flex min-h-10 shrink-0 items-center justify-between border-b px-2 py-1.5 ${appearanceDark ? "border-[#3c3c3c] bg-[#252526]" : "border-[#e5e5e5] bg-[#f5f5f5]"}`}
														>
															<span
																className={`min-w-0 truncate font-mono text-[11px] font-semibold ${appearanceDark ? "text-[#e5e5e5]" : "text-[#222222]"}`}
																title={selectedPath ?? undefined}
															>
																{selectedPath}
															</span>
															<button
																type="button"
																onClick={() => setNarrowEditorOpen(false)}
																className={`inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg ${appearanceDark ? "text-[#cccccc] hover:bg-[#1e1e1e]" : "text-[#333333] hover:bg-[#eeeeee]"}`}
																aria-label="Close editor"
															>
																<X size={18} aria-hidden />
															</button>
														</div>
														<div className={`min-h-0 flex-1 overflow-hidden ${appearanceDark ? "bg-[#1e1e1e]" : "bg-white"}`}>
															<SimpleFilePanel
																ref={workspaceEditorRef}
																path={selectedPath}
																content={content}
																onChange={setContent}
																persistEncoding={persistEncoding}
																fileMimeType={fileMimeType}
																loading={fileLoading}
																error={fileError}
																dirty={dirty}
																onDiscardUnsaved={discardUnsavedChanges}
																onSave={async () => {
																	await save();
																	await refreshTree();
																}}
																onClose={() => {
																	setSelectedPath(null);
																	setNarrowEditorOpen(false);
																}}
																onCursor={onCursor}
																appearanceDark={appearanceDark}
																onUndoRedoStackChange={onUndoRedoStackChange}
																onSelectionPrefsChange={onSelectionPrefsChange}
																onFindInFiles={onFindInFiles}
																onReplaceInFiles={onReplaceInFiles}
																columnLayout="besideChat"
																markdownPaneMode={markdownPaneMode}
																onMarkdownPaneModeChange={setMarkdownPaneMode}
															/>
														</div>
													</div>
													<button
														type="button"
														className="min-h-0 min-w-0 flex-1 bg-black/45"
														aria-label="Close editor"
														onClick={() => setNarrowEditorOpen(false)}
													/>
												</div>
											) : null}
										</div>
									</>
								)
							) : null}
							{activeTab === "team" ? (
								<SimpleTeamView
									modelLabel={modelLabel}
									agents={agentsApi.data?.agents ?? []}
									teams={agentsApi.data?.teams ?? {}}
									teamsPath={agentsApi.data?.teamsPath ?? null}
									teamsYamlWritePath={teamsYamlWritePath}
									workspaceReady={workspaceReady}
									loading={agentsApi.loading}
									error={agentsApi.error}
									onReload={agentsApi.reload}
									onOpenAgentFile={openAgentFile}
									onOpenTeamsYaml={onOpenTeamsYaml}
									onCreateAgentDefinition={onCreateAgentDefinition}
									appearanceDark={appearanceDark}
								/>
							) : null}
							{activeTab === "models" ? (
								<SimpleModelsView
									config={config}
									workspaceRoot={root}
									appearanceDark={appearanceDark}
									effectiveModel={effectiveModel}
									onSelectModel={onSelectLlmModel}
									providerConfigInitialPath={providerConfigInitialPath}
									providerConfigInitialNonce={providerConfigInitialNonce}
									onConsumeProviderConfigFocus={onConsumeProviderConfigFocus}
								/>
							) : null}
							{activeTab === "projects" ? (
						<SimpleProjectsView
								rootLabel={rootLabel}
								rootPath={workspacePath}
								onRefresh={() => void refreshTree()}
								onOpenFolder={onOpenFolder}
								onOpenRecentFolder={onOpenRecentFolder}
								recentFolders={recentFolders}
								appearanceDark={appearanceDark}
							/>
							) : null}
							{activeTab === "documenthandler" ? (
								<div className="min-h-0 flex-1 overflow-hidden">
									<ChatExplorer
										appearanceDark={appearanceDark}
										nodes={nodes}
										selectedPath={selectedPath}
										onSelectFile={(p) => setSelectedPath(p)}
										loading={treeLoading}
										error={treeError}
										logs={logs}
										streaming={streaming}
										connected={connected}
										rows={rows}
										onSend={sendChat}
										onStop={stop}
									/>
								</div>
							) : null}
							{activeTab === "settings" ? (
								<SimpleSettingsView
									colorMode={colorMode}
									onColorMode={setColorMode}
									approvalQueue={approvalQueue}
									onApprovalQueue={setApprovalQueue}
									onSwitchToTechnical={() => setUiMode("technical")}
									onOpenIndexingDocs={onOpenIndexingDocs}
									serverConfig={config}
									onConfigRefresh={onConfigRefresh}
								/>
							) : null}
						</div>

						{rightOpen ? (
							<div className="h-full shrink-0">
								<SimpleRightPanel
									nodes={nodes}
									selectedPath={selectedPath}
									onSelectFile={narrowDesktop ? handleNarrowTreeSelect : setSelectedPath}
									loading={treeLoading}
									error={treeError}
									logs={logs}
									streaming={streaming}
									appearanceDark={appearanceDark}
									chatWorkspaceLayout={activeTab === "chat" ? chatWorkspaceLayout : undefined}
									onToggleChatWorkspaceLayout={
										activeTab === "chat" ? toggleChatWorkspaceLayout : undefined
									}
									onExplorerGitMutated={() => void refreshTreeQuiet()}
									onMoveFileToDirectory={onMoveFileToDirectory}
									allowWorkspaceRootDrop={allowWorkspaceRootDrop}
								/>
							</div>
						) : null}
					</div>
				</div>
			</div>


				</>
			)}

			{!isMobile ? (
				<div>
					<StatusBar
						uiMode={uiMode}
						workspaceRoot={workspacePath}
						connected={connected}
						line={line}
						col={col}
						language={languageFromPath(selectedPath)}
						contextPct={contextPct}
						tokensDown={tokensDown}
						tokensUp={tokensUp}
						contextTitle={contextTitle}
						tokensTitle={tokensTitle}
						onCopyWorkspacePath={copyWorkspacePath}
						simpleAppearanceDark={appearanceDark}
					/>
				</div>
			) : null}
		</div>
	);
}
