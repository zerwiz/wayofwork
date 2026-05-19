/**
 * Claw UI root shell.
 *
 * Same colour system and aesthetic as SimpleApp (uses `useSimplePreferences` for dark/light).
 * Distinct from Technical: full-height **left nav rail** instead of IDE activity bar;
 * **Mission** tab as default instead of a file tree; no workspace grid.
 */
import { Cpu, FilePlus, PanelLeft } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type RefObject,
} from "react";
import { apiPostJson } from "../../api/client";
import { useMaxWidthMediaQuery } from "../../hooks/useMaxWidthMediaQuery";
import { useClawHostFileTree } from "../../hooks/useClawHostFileTree";
import { useClawWorkspace } from "../../hooks/useClawWorkspace";
import {
  clearClawWorkspaceOnboardingDismissed,
  isClawWorkspaceOnboardingDismissed,
  markClawWorkspaceOnboardingDismissed,
} from "../../utils/clawWorkspaceOnboardingStorage";
import type { ServerConfig } from "../../hooks/useServerConfig";
import type {
  ChatRow,
  ChatSessionMode,
  ChatSessionTab,
  LogRow,
} from "../../hooks/useWayOfPiSession";
import type { ChatQueueItem } from "../../utils/chatQueueTranscript";
import type { TreeNode } from "../../types/tree";
import type { FilePersistEncoding } from "../../hooks/useFileEditor";
import type { WorkspaceEditorRef } from "../../types/workspaceEditor";
import type { PiModelConfigPath } from "../../constants/piModelConfigPaths";
import { useSimplePreferences } from "../../hooks/useSimplePreferences";
import { useAgents } from "../../hooks/useAgents";
import { StatusBar } from "../StatusBar";
import { SimpleTeamView } from "../simple/SimpleTeamView";
import { SimpleSettingsView } from "../simple/SimpleSettingsView";
import { SimpleFilePanel } from "../simple/SimpleFilePanel";
import { SimpleFileTree } from "../simple/SimpleFileTree";
import { getClawUiModule, isClawBuiltinTab } from "../../claw/clawUiModules";
import { ClawNavRail, type ClawTabId } from "./ClawNavRail";
import { ClawMobileTabBar } from "../mobile";
import type { ClawHelpSectionId } from "./ClawHelpModal";
import { ClawMissionView } from "./ClawMissionView";
import { ClawChatView } from "./ClawChatView";
import { ClawSchedulesView } from "./ClawSchedulesView";
import { ClawChannelsView } from "./ClawChannelsView";
import { ClawWorkspaceOnboardingModal } from "./ClawWorkspaceOnboardingModal";
import { DockSplitHandle } from "../DockSplitHandle";
import { ClawSecondaryToolbar } from "./ClawSecondaryToolbar";

const FILES_TREE_DEFAULT_PX = 224;
const FILES_TREE_MIN_PX = 160;
const FILES_TREE_MAX_PX = 720;

function makeClawWorkspaceDocumentRel(attempt: number): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const suffix = attempt === 0 ? "" : `-${attempt}`;
  return `.claw/workspace/document-${stamp}${suffix}.md`;
}

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
    yml: "YAML",
    yaml: "YAML",
  };
  return map[ext] ?? "Plain Text";
}

type ClawAppProps = {
  uiMode: string;
  setUiMode: (m: string) => void;
  root: string | null;
  rootLabel: string;
  nodes: TreeNode[];
  treeLoading: boolean;
  treeError: string | null;
  refreshTree: () => void;
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
  chatTabs: ChatSessionTab[];
  activeChatTabId: string;
  onSelectChatTab: (id: string) => void;
  onCloseChatTab: (id: string) => void;
  onRenameChatTab: (id: string, label: string) => void;
  onNewSession: () => void;
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
  activeTab: ClawTabId;
  onTabChange: (t: ClawTabId) => void;
  providerConfigInitialPath?: PiModelConfigPath | null;
  providerConfigInitialNonce?: number;
  onConsumeProviderConfigFocus?: () => void;
  workspaceEditorRef?: RefObject<WorkspaceEditorRef | null>;
  onUndoRedoStackChange?: () => void;
  onSelectionPrefsChange?: () => void;
  onFindInFiles?: () => void;
  onReplaceInFiles?: () => void;
  teamsYamlWritePath: string;
  workspaceReady: boolean;
  onOpenTeamsYaml?: () => void;
  onCreateAgentDefinition?: () => void;
  onNewPlanFile: () => void;
  newPlanFileDisabled: boolean;
  onOpenIndexingDocs?: () => void;
  onOpenHostDoctor: () => void;
  onHelp?: (defaultSection?: ClawHelpSectionId | null) => void;
  contextPct: string;
  contextFillPct: number | null;
  tokensDown: string;
  tokensUp: string;
  contextTitle: string;
  tokensTitle: string;
  onMoveFileToDirectory?: (fromPath: string, toDirPath: string) => Promise<void>;
  allowWorkspaceRootDrop?: boolean;
  layoutVariant?: "desktop" | "mobile";
  clawMenuFileFocusRev?: number;
};

export function ClawApp({
  uiMode,
  setUiMode,
  root,
  rootLabel: _rootLabel,
  nodes: _workspaceTreeNodes,
  treeLoading: _workspaceTreeLoading,
  treeError: _treeError,
  refreshTree,
  refreshTreeQuiet,
  modelLabel,
  config,
  effectiveModel: _effectiveModel,
  onSelectLlmModel: _onSelectLlmModel,
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
  chatTabs,
  activeChatTabId,
  onSelectChatTab,
  onCloseChatTab,
  onRenameChatTab,
  onNewSession,
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
  providerConfigInitialPath: _providerConfigInitialPath,
  providerConfigInitialNonce: _providerConfigInitialNonce,
  onConsumeProviderConfigFocus: _onConsumeProviderConfigFocus,
  workspaceEditorRef,
  onUndoRedoStackChange,
  onSelectionPrefsChange,
  onFindInFiles,
  onReplaceInFiles,
  teamsYamlWritePath,
  workspaceReady,
  onOpenTeamsYaml,
  onCreateAgentDefinition,
  onNewPlanFile,
  newPlanFileDisabled: _newPlanFileDisabled,
  onOpenIndexingDocs,
  onOpenHostDoctor,
  onHelp,
  contextPct,
  contextFillPct,
  tokensDown,
  tokensUp,
  contextTitle,
  tokensTitle,
  onMoveFileToDirectory,
  allowWorkspaceRootDrop = false,
  layoutVariant = "desktop",
  clawMenuFileFocusRev,
}: ClawAppProps) {
  const { isDark, colorMode, setColorMode, approvalQueue, setApprovalQueue } =
    useSimplePreferences();
  const agentsApi = useAgents();
  const maxWidthNarrow = useMaxWidthMediaQuery(767).isAtMaxWidth;
  const narrowClawDesktop = layoutVariant === "desktop" && maxWidthNarrow;
  const [clawNavOpen, setClawNavOpen] = useState(() => {
    try {
      const stored = localStorage.getItem("wayofpi.claw.navOpen");
      if (stored !== null) return JSON.parse(stored) as boolean;
    } catch { /* ignore */ }
    return true;
  });

  /* Persist nav open/closed state */
  useEffect(() => {
    try { localStorage.setItem("wayofpi.claw.navOpen", JSON.stringify(clawNavOpen)); } catch {}
  }, [clawNavOpen]);

  useEffect(() => {
    if (!narrowClawDesktop || !clawNavOpen || layoutVariant !== "desktop")
      return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setClawNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [narrowClawDesktop, clawNavOpen, layoutVariant]);

  const workspacePath = root ?? "—";
  /** Host **`.claw/workspace/`** path from server — onboarding + settings key (not the opened project root). */
  const clawOnboardingKey = config?.clawWorkspaceDirAbs?.trim() ?? "";
  const clawWorkspace = useClawWorkspace(true);
  const clawHostFileTree = useClawHostFileTree(true);

  const [clawWorkspaceOnboardingOpen, setClawWorkspaceOnboardingOpen] =
    useState(false);
  const [deletingClawWorkspace, setDeletingClawWorkspace] = useState(false);

  useEffect(() => {
    setClawWorkspaceOnboardingOpen(false);
  }, [root, clawOnboardingKey]);

  useEffect(() => {
    if (activeTab === "files") void clawHostFileTree.refresh();
  }, [activeTab, clawHostFileTree.refresh]);

  useEffect(() => {
    if (
      !clawOnboardingKey ||
      !clawWorkspace.ready ||
      clawWorkspace.missingCount === 0
    )
      return;
    if (isClawWorkspaceOnboardingDismissed(clawOnboardingKey)) return;
    setClawWorkspaceOnboardingOpen(true);
  }, [clawOnboardingKey, clawWorkspace.ready, clawWorkspace.missingCount]);

  const dismissClawWorkspaceOnboarding = useCallback(() => {
    if (clawOnboardingKey)
      markClawWorkspaceOnboardingDismissed(clawOnboardingKey);
    setClawWorkspaceOnboardingOpen(false);
  }, [clawOnboardingKey]);

  const runNewClawWorkspaceOnboarding = useCallback(() => {
    if (!clawOnboardingKey) return;
    clearClawWorkspaceOnboardingDismissed(clawOnboardingKey);
    clawWorkspace.refresh();
    setClawWorkspaceOnboardingOpen(true);
  }, [clawOnboardingKey, clawWorkspace]);

  const deleteClawWorkspaceFromSettings = useCallback(async () => {
    if (!clawOnboardingKey) return;
    if (
      dirty &&
      selectedPath &&
      (selectedPath === ".claw" || selectedPath.startsWith(".claw/"))
    ) {
      window.alert(
        "Save or revert changes to the open .claw/ file before deleting the Claw workspace folder.",
      );
      return;
    }
    if (
      !window.confirm(
        "Delete `.claw/workspace/` from the Way of Pi host checkout?\n\nThis removes the seven scaffold files and `memory/` under that folder. It does **not** remove `.claw/telegram.json` (that stays next to `workspace/` if present). This cannot be undone.",
      )
    ) {
      return;
    }
    setDeletingClawWorkspace(true);
    try {
      await apiPostJson<{ ok: boolean }>("/api/fs/delete", {
        path: ".claw/workspace",
      });
      clearClawWorkspaceOnboardingDismissed(clawOnboardingKey);
      if (
        selectedPath &&
        (selectedPath === ".claw" || selectedPath.startsWith(".claw/"))
      ) {
        setSelectedPath(null);
      }
      await refreshTree();
      await clawHostFileTree.refresh();
      clawWorkspace.refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    } finally {
      setDeletingClawWorkspace(false);
    }
  }, [
    clawOnboardingKey,
    dirty,
    selectedPath,
    refreshTree,
    clawHostFileTree,
    clawWorkspace,
    setSelectedPath,
  ]);

  useEffect(() => {
    if (!clawWorkspaceOnboardingOpen) return;
    if (!clawWorkspace.ready || clawWorkspace.scaffolding) return;
    if (clawWorkspace.missingCount === 0) {
      if (clawOnboardingKey)
        markClawWorkspaceOnboardingDismissed(clawOnboardingKey);
      setClawWorkspaceOnboardingOpen(false);
    }
  }, [
    clawWorkspaceOnboardingOpen,
    clawOnboardingKey,
    clawWorkspace.ready,
    clawWorkspace.missingCount,
    clawWorkspace.scaffolding,
  ]);

  const clawModuleContext = useMemo(
    () => ({
      activeTab,
      workspaceRoot: root,
      appearanceDark: isDark,
      serverConfig: config,
      setTab: onTabChange,
      openWorkspaceFile: (relativePath: string) => {
        setSelectedPath(relativePath);
        onTabChange("files");
      },
    }),
    [activeTab, root, isDark, config, onTabChange, setSelectedPath],
  );

  useEffect(() => {
    if (isClawBuiltinTab(activeTab)) return;
    if (!getClawUiModule(activeTab) && onTabChange) onTabChange("mission");
  }, [activeTab, onTabChange]);

  const copyWorkspacePath = useCallback(() => {
    if (!root) return;
    void navigator.clipboard.writeText(root);
  }, [root]);

  const openAgentFile = useCallback(
    (relativePath: string) => {
      setSelectedPath(relativePath);
      onTabChange("files");
    },
    [setSelectedPath, onTabChange],
  );

  const openFile = useCallback(
    (path: string) => {
      setSelectedPath(path);
      onTabChange("files");
    },
    [setSelectedPath, onTabChange],
  );

  const moveWithClawTreeSync = useCallback(
    async (from: string, toDir: string) => {
      if (!onMoveFileToDirectory) return;
      await onMoveFileToDirectory(from, toDir);
      await clawHostFileTree.refresh();
    },
    [onMoveFileToDirectory, clawHostFileTree],
  );

  const addClawMarkdownDocument = useCallback(async () => {
    if (
      dirty &&
      selectedPath &&
      (selectedPath === ".claw" || selectedPath.startsWith(".claw/"))
    ) {
      window.alert(
        "Save or discard changes to the open .claw file before creating a new document.",
      );
      return;
    }
    setAddClawMarkdownDocumentBusy(true);
    try {
      for (let attempt = 0; attempt < 24; attempt++) {
        const rel = makeClawWorkspaceDocumentRel(attempt);
        try {
          await apiPostJson<{ ok?: boolean }>("/api/fs/entry", {
            path: rel,
            kind: "file",
          });
          await refreshTree();
          await clawHostFileTree.refresh();
          setSelectedPath(rel);
          return;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.includes("409")) continue;
          throw e;
        }
      }
      window.alert("Could not pick a free document name in Workspace.");
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    } finally {
      setAddClawMarkdownDocumentBusy(false);
    }
  }, [dirty, selectedPath, refreshTree, clawHostFileTree, setSelectedPath]);

  // Default to preview in Claw — reset whenever the open file changes.
  const [clawMarkdownMode, setClawMarkdownMode] = useState<
    "preview" | "source"
  >("preview");
  useEffect(() => {
    setClawMarkdownMode("preview");
  }, [selectedPath]);

  const [filesTreeWidthPx, setFilesTreeWidthPx] = useState(
    FILES_TREE_DEFAULT_PX,
  );
  /** Mobile Files tab: user can hide the `.claw/` tree strip so the editor uses full height. */
  const [mobileClawFilesTreeOpen, setMobileClawFilesTreeOpen] = useState(true);
  const [addClawMarkdownDocumentBusy, setAddClawMarkdownDocumentBusy] =
    useState(false);

  useEffect(() => {
    if (layoutVariant !== "mobile") setMobileClawFilesTreeOpen(true);
  }, [layoutVariant]);
  const filesSplitHandleClass =
    layoutVariant === "mobile"
      ? "hidden"
      : isDark
        ? "hidden md:block"
        : "hidden md:block !bg-[#ececec] hover:!bg-[#007acc]/35 active:!bg-[#007acc]/55";

  const bg = isDark
    ? "bg-[#1e1e1e] text-[#cccccc] selection:bg-[#264f78]"
    : "bg-[#f3f3f3] text-[#333333] selection:bg-[#add6ff]/60";

  const bodyRowClass =
    layoutVariant === "mobile"
      ? "flex min-h-0 flex-1 flex-col overflow-hidden"
      : "flex min-h-0 flex-1 flex-row overflow-hidden";

  const handleClawNavTab = useCallback(
    (id: ClawTabId) => {
      onTabChange(id);
      if (narrowClawDesktop) setClawNavOpen(false);
    },
    [onTabChange, narrowClawDesktop],
  );

  const handleClawNavHelp = useCallback(() => {
    onHelp?.();
    if (narrowClawDesktop) setClawNavOpen(false);
  }, [onHelp, narrowClawDesktop]);

  const clawNavEl = useMemo(() => (
    <ClawNavRail
      activeTab={activeTab}
      onTab={handleClawNavTab}
      onHelp={onHelp ? handleClawNavHelp : undefined}
      appearanceDark={isDark}
    />
  ), [activeTab, handleClawNavTab, onHelp, handleClawNavHelp, isDark]);

  return (
    <div
      data-claw-theme={isDark ? "dark" : "light"}
      className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden font-sans ${bg}`}
    >
      {/* ── Body ── */}
      <div className={bodyRowClass}>
        {layoutVariant === "desktop" && clawNavOpen && !narrowClawDesktop
          ? clawNavEl
          : null}

        {/* Main panel */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {layoutVariant === "desktop" && (
            <ClawSecondaryToolbar
              sidebarOpen={clawNavOpen}
              onToggleSidebar={() => setClawNavOpen(!clawNavOpen)}
              connected={connected}
              appearanceDark={isDark}
              activeTab={activeTab}
            />
          )}
          {activeTab === "mission" ? (
            <ClawMissionView
              config={config}
              connected={connected}
              streaming={streaming}
              agents={agentsApi.data?.agents ?? []}
              agentsLoading={agentsApi.loading}
              logs={logs}
              workspacePath={workspacePath}
              onStartChat={() => onTabChange("chat")}
              onNewPlan={onNewPlanFile}
              onOpenHostDoctor={onOpenHostDoctor}
              onSwitchToTeam={() => onTabChange("team")}
              onSwitchToSchedule={() => onTabChange("schedule")}
              onSwitchToChannels={() => onTabChange("channels")}
              onOpenFile={openFile}
              onOpenClawHelp={onHelp}
              dark={isDark}
              clawWorkspace={clawWorkspace}
            />
          ) : activeTab === "chat" ? (
            <ClawChatView
              chatTabs={chatTabs}
              activeChatTabId={activeChatTabId}
              onSelectChatTab={onSelectChatTab}
              onCloseChatTab={onCloseChatTab}
              onRenameChatTab={onRenameChatTab}
              onNewSession={onNewSession}
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
              filePanelNodes={clawHostFileTree.nodes}
              filePanelTreeLoading={clawHostFileTree.loading}
              onRefreshFilePanelTree={() => void clawHostFileTree.refresh()}
              filePanelRootLabel={config?.clawDotDirAbs ?? null}
              selectedPath={selectedPath}
              setSelectedPath={setSelectedPath}
              content={content}
              setContent={setContent}
              persistEncoding={persistEncoding}
              fileMimeType={fileMimeType}
              fileLoading={fileLoading}
              fileError={fileError}
              dirty={dirty}
              onSave={save}
              onDiscardUnsaved={discardUnsavedChanges}
              onCursor={onCursor}
              workspaceEditorRef={workspaceEditorRef}
              onUndoRedoStackChange={onUndoRedoStackChange}
              onSelectionPrefsChange={onSelectionPrefsChange}
              onFindInFiles={onFindInFiles}
              onReplaceInFiles={onReplaceInFiles}
              onRefreshTree={refreshTree}
              onMoveFileToDirectory={moveWithClawTreeSync}
              allowWorkspaceRootDrop={allowWorkspaceRootDrop}
              dark={isDark}
              filePanelTreeError={clawHostFileTree.error}
              onAddClawMarkdownDocument={addClawMarkdownDocument}
              addClawMarkdownDocumentBusy={addClawMarkdownDocumentBusy}
              layoutVariant={layoutVariant}
              menuFileFocusRev={clawMenuFileFocusRev}
            />
          ) : activeTab === "team" ? (
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
              appearanceDark={isDark}
            />
          ) : activeTab === "schedule" ? (
            <ClawSchedulesView
              dark={isDark}
              onOpenClawHelp={onHelp}
              serverConfig={config}
            />
          ) : activeTab === "channels" ? (
            <ClawChannelsView
              dark={isDark}
              onOpenFile={openFile}
              onOpenClawHelp={onHelp}
            />
          ) : activeTab === "files" ? (
            <div
              className={`flex min-h-0 flex-1 overflow-hidden ${layoutVariant === "mobile" ? "flex-col" : "flex-row"}`}
            >
              {layoutVariant === "mobile" && !mobileClawFilesTreeOpen ? (
                <div
                  className={`flex shrink-0 flex-wrap items-center gap-2 border-b px-2 py-2 ${
                    isDark
                      ? "border-[#3c3c3c] bg-[#1a1a1a]"
                      : "border-[#e5e5e5] bg-[#f9fafb]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setMobileClawFilesTreeOpen(true)}
                    className={`min-h-11 rounded-lg border px-3 py-2 text-xs font-semibold ${
                      isDark
                        ? "border-[#3c3c3c] bg-[#2d2d2d] text-[#cccccc] hover:bg-[#383838]"
                        : "border-[#d1d5db] bg-white text-[#374151] hover:bg-[#f9fafb]"
                    }`}
                  >
                    Show .claw tree
                  </button>
                  <button
                    type="button"
                    disabled={addClawMarkdownDocumentBusy}
                    title="Create a new Markdown file in Workspace"
                    onClick={() => void addClawMarkdownDocument()}
                    className={`inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold ${
                      isDark
                        ? "border-[#3c3c3c] bg-[#2d2d2d] text-[#cccccc] hover:bg-[#383838] disabled:opacity-50"
                        : "border-[#d1d5db] bg-white text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50"
                    }`}
                  >
                    <FilePlus
                      size={14}
                      className="shrink-0 opacity-80"
                      aria-hidden
                    />
                    Add document
                  </button>
                </div>
              ) : null}
              {/* File tree: host checkout `.claw/` (not opened WOP_WORKSPACE) */}
              {layoutVariant !== "mobile" || mobileClawFilesTreeOpen ? (
                <div
                  className={`flex min-h-0 shrink-0 flex-col overflow-hidden ${
                    isDark ? "bg-[#1a1a1a]" : "bg-white"
                  } ${layoutVariant === "mobile" ? "max-h-[40vh] w-full min-h-[120px]" : ""}`}
                  style={
                    layoutVariant === "mobile"
                      ? undefined
                      : {
                          width: filesTreeWidthPx,
                          minWidth: FILES_TREE_MIN_PX,
                          maxWidth: FILES_TREE_MAX_PX,
                        }
                  }
                >
                  <div
                    className={`shrink-0 border-b px-2 py-1.5 ${
                      isDark
                        ? "border-[#3c3c3c] bg-[#1a1a1a]"
                        : "border-[#e5e5e5] bg-[#f9fafb]"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div
                          className={`text-[10px] font-bold uppercase tracking-widest ${
                            isDark ? "text-[#858585]" : "text-[#6b7280]"
                          }`}
                        >
                          Files · .claw
                        </div>
                        {config?.clawDotDirAbs ? (
                          <div
                            className={`mt-0.5 truncate font-mono text-[9px] ${
                              isDark ? "text-[#6f6f6f]" : "text-[#9ca3af]"
                            }`}
                            title={config.clawDotDirAbs}
                          >
                            {config.clawDotDirAbs}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {layoutVariant === "mobile" ? (
                          <button
                            type="button"
                            onClick={() => setMobileClawFilesTreeOpen(false)}
                            className={`min-h-11 rounded-lg border px-3 py-2 text-xs font-semibold ${
                              isDark
                                ? "border-[#3c3c3c] bg-[#252526] text-[#cccccc] hover:bg-[#2d2d2d]"
                                : "border-[#d1d5db] bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb]"
                            }`}
                          >
                            Hide tree
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={addClawMarkdownDocumentBusy}
                          title="Create a new Markdown file in Workspace"
                          onClick={() => void addClawMarkdownDocument()}
                          className={`inline-flex shrink-0 items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-medium ${
                            isDark
                              ? "border-[#3c3c3c] bg-[#2d2d2d] text-[#cccccc] hover:bg-[#383838] disabled:opacity-50"
                              : "border-[#d1d5db] bg-white text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50"
                          } ${layoutVariant === "mobile" ? "min-h-11 rounded-lg px-3 py-2 text-xs font-semibold" : ""}`}
                        >
                          <FilePlus
                            size={layoutVariant === "mobile" ? 14 : 12}
                            className="shrink-0 opacity-80"
                            aria-hidden
                          />
                          Add document
                        </button>
                      </div>
                    </div>
                    {clawHostFileTree.error ? (
                      <div
                        className={`mt-1 text-[10px] ${isDark ? "text-red-400" : "text-red-600"}`}
                        title={clawHostFileTree.error}
                      >
                        {clawHostFileTree.error}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    {clawHostFileTree.loading ? (
                      <p
                        className={`p-3 text-[11px] ${isDark ? "text-[#858585]" : "text-[#737373]"}`}
                      >
                        Loading…
                      </p>
                    ) : (
                      <SimpleFileTree
                        nodes={clawHostFileTree.nodes}
                        selectedPath={selectedPath}
                        onSelectFile={(p) => setSelectedPath(p)}
                        appearanceDark={isDark}
                        onExplorerGitMutated={async () => {
                          await Promise.resolve(refreshTreeQuiet());
                          void clawHostFileTree.refresh();
                        }}
                        onMoveFileToDirectory={moveWithClawTreeSync}
                        allowWorkspaceRootDrop={false}
                        emptyTreeHint="No files under host .claw/ yet. Use Mission → workspace setup, Add document, or create .claw/ on disk."
                      />
                    )}
                  </div>
                </div>
              ) : null}
              <DockSplitHandle
                orientation="vertical"
                className={filesSplitHandleClass}
                onDelta={(dx) => {
                  setFilesTreeWidthPx((w) =>
                    Math.min(
                      FILES_TREE_MAX_PX,
                      Math.max(FILES_TREE_MIN_PX, w + dx),
                    ),
                  );
                }}
                ariaLabel="Resize file tree and document"
              />
              {/* Preview / editor panel — full height, markdown defaults to rendered preview */}
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
                      await clawHostFileTree.refresh();
                    }}
                    onClose={() => setSelectedPath(null)}
                    onCursor={onCursor}
                    appearanceDark={isDark}
                    onUndoRedoStackChange={onUndoRedoStackChange}
                    onSelectionPrefsChange={onSelectionPrefsChange}
                    onFindInFiles={onFindInFiles}
                    onReplaceInFiles={onReplaceInFiles}
                    columnLayout="besideChat"
                    markdownPaneMode={clawMarkdownMode}
                    onMarkdownPaneModeChange={setClawMarkdownMode as (m: any) => void}
                  />
                ) : (
                  <div
                    className={`flex flex-1 flex-col items-center justify-center gap-2 text-[13px] ${
                      isDark ? "text-[#585858]" : "text-[#aaaaaa]"
                    }`}
                  >
                    <span>
                      Select a file under host{" "}
                      <span className="font-mono">.claw/</span> to preview or
                      edit it.
                    </span>
                    <span
                      className={`text-[11px] ${isDark ? "text-[#3c3c3c]" : "text-[#cccccc]"}`}
                    >
                      Markdown opens in Preview by default. Workspace project
                      files are not listed here — open the project in Simple or
                      Technical to browse them.
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === "settings" ? (
            <SimpleSettingsView
              colorMode={colorMode}
              onColorMode={setColorMode}
              approvalQueue={approvalQueue}
              onApprovalQueue={setApprovalQueue}
              onSwitchToTechnical={() => setUiMode("technical")}
              onOpenIndexingDocs={onOpenIndexingDocs}
              serverConfig={config}
              clawWorkspaceActions={{
                workspacePresent: Boolean(clawOnboardingKey),
                onCreateClawWorkspaceFolder: () =>
                  void clawWorkspace.scaffold(),
                creatingClawWorkspaceFolder: clawWorkspace.scaffolding,
                clawWorkspaceScaffoldReady: clawWorkspace.ready,
                clawWorkspaceScaffoldMissingCount: clawWorkspace.missingCount,
                clawWorkspaceScaffoldError: clawWorkspace.scaffoldError,
                onRunNewOnboarding: runNewClawWorkspaceOnboarding,
                onDeleteClawWorkspace: () =>
                  void deleteClawWorkspaceFromSettings(),
                deletingClawWorkspace,
              }}
            />
          ) : (
            (() => {
              const mod = getClawUiModule(activeTab);
               return mod ? mod.render(clawModuleContext) : <div className="p-4 text-gray-300">Unsupported mode</div>;
            })()
          )}
        </div>

        {layoutVariant === "mobile" ? (
          <ClawMobileTabBar
            activeTab={activeTab}
            onTab={onTabChange}
            onHelp={onHelp}
            appearanceDark={isDark}
          />
        ) : null}
      </div>

      {narrowClawDesktop && clawNavOpen ? (
        <div
          className="fixed inset-0 z-[55] flex"
          role="dialog"
          aria-modal="true"
          aria-label="Claw navigation"
        >
          <div
            className={`flex h-[100dvh] max-h-screen shrink-0 flex-col shadow-2xl ${
              isDark ? "bg-[#1a1a1a]" : "bg-white"
            }`}
            style={{
              paddingTop: "max(0px, env(safe-area-inset-top))",
              paddingBottom: "max(0px, env(safe-area-inset-bottom))",
            }}
          >
            {clawNavEl}
          </div>
          <button
            type="button"
            className="min-h-0 min-w-0 flex-1 cursor-default border-0 bg-black/50 p-0"
            aria-label="Close navigation"
            onClick={() => setClawNavOpen(false)}
          />
        </div>
      ) : null}

      {/* ── Status bar ── */}
      {layoutVariant === "desktop" ? (
        <div className={narrowClawDesktop ? "hidden md:block" : undefined}>
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
            simpleAppearanceDark={isDark}
          />
        </div>
      ) : null}

      {config?.clawWorkspaceDirAbs ? (
        <ClawWorkspaceOnboardingModal
          open={clawWorkspaceOnboardingOpen}
          dark={isDark}
          clawWorkspaceDirAbs={config.clawWorkspaceDirAbs}
          ws={clawWorkspace}
          onDismiss={dismissClawWorkspaceOnboarding}
        />
      ) : null}
    </div>
  );
}
