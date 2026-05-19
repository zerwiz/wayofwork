import { type ChangeEvent, type RefObject, useMemo } from "react";
import type { SimpleTabId } from "../components/simple/SimpleNavRail";
import { useRefactor } from "../context/RefactorContext";
import { IdeLayout } from "../components/IdeLayout";
import { ClawApp } from "../components/claw/ClawApp";
import { ModalsRenderer } from "../components/ModalsRenderer";
import { useWorkspaceActions } from "../hooks/useWorkspaceActions";
import { useEditorCommandHandlers } from "../hooks/useEditorCommandHandlers";
import { useNavigationHandlers } from "../hooks/useNavigationHandlers";
import { useCommandItems } from "../hooks/useCommandItems";
import { PageHeaderProvider } from "../context/PageHeaderContext";
import type { ViewMenuTechnicalOptions } from "../types/technicalShell";
import { WorkspaceStaticAnalysisProvider } from "../context/WorkspaceStaticAnalysisContext";
import type { WorkspaceStaticAnalysisContextValue } from "../context/WorkspaceStaticAnalysisContext";

const WOP_PUBLIC_REPO_URL = "https://github.com/zerwiz/wayofpi";

export function ClawPage() {
  const {
    uiMode, setUiMode, technical,
    simpleTab, setSimpleTab,
    clawTab, setClawTab,
    selectedPath, setSelectedPath,
    autoSave, setAutoSave,
    workspaceGrid,
    leftSidebarVisible, setLeftSidebarVisible,
    setTechnicalActivity,
    workspaceEditorRef,
    editorMenuTick, bumpEditorMenu,
    commandPaletteOpen, setCommandPaletteOpen,
    editor,
    tree, server, session, preferences, agents, modals,
    llmModels,
    rootLabel, workspaceOperational, recentFolders,
    reopenLlmFixModal,
    line, col, onCursor, language, copyWorkspacePath,
    llmFixModalAppearanceDark,
    staticAnalysis
  } = useRefactor();

  const { 
    handleNewFile, handleNewFolder, handleExplorerMoveFile, 
    handleExplorerRenameNode, handleExplorerDeleteNode,
    handleNewPlanFile, handleNewPlanFileCreate,
    performCreateNewWorkspaceFile, appendLaunchConfigurationSnippet
  } = useWorkspaceActions();
  
  const {
    saveAndRefresh, reloadFocusedOrMain, discardUnsavedChanges
  } = useEditorCommandHandlers();
  
  const {
    focusWorkspaceFileFromMenu, openTeamsYamlFromMenu, goHistoryBack, goHistoryForward
  } = useNavigationHandlers();

  const { simpleCommandItems } = useCommandItems();

  const modelLabel = session.effectiveModel || server.config?.ollamaModel || server.config?.openrouterModel || "Unknown";

  const viewTechnicalMenu: ViewMenuTechnicalOptions = {
    onOpenAppearanceSettings: () => {}, 
    onToggleFullScreen: async () => {},
    leftSidebarVisible,
    onToggleLeftSidebar: () => setLeftSidebarVisible(!leftSidebarVisible),
    editorLayout: "1x1", 
    onSetEditorLayout: () => {}, 
    zenMode: false,
    onToggleZenMode: () => {},
    onEnterZen: () => {},
    onExitZen: () => {},
    statusBarVisible: true,
    onToggleStatusBar: () => {},
    menuBarVisible: true,
    onToggleMenuBar: () => {},
    breadcrumbsVisible: true,
    onToggleBreadcrumbs: () => {},
    wordWrap: true,
    onToggleWordWrap: () => {},
    centeredEditorLayout: false,
    onToggleCenteredEditorLayout: () => {},
    zoomLevel: 100,
    onZoomIn: () => {},
    onZoomOut: () => {},
    onZoomReset: () => {},
    onResetZoom: () => {},
    onApplyLayoutPreset: () => {},
    onNormalView: () => {},
    onFlipLayout: () => {},
    uiZoomPercent: 100
  };

  const fileMenu = {
    switchAllowed: tree.switchAllowed,
    recentFolders,
    autoSave,
    onToggleAutoSave: setAutoSave,
    onOpenWorkspace: tree.refresh,
    onCloseWorkspace: () => {},
    onNewFile: handleNewFile,
    onNewFolder: handleNewFolder,
    onOpenFile: () => {},
    onSave: saveAndRefresh,
    onSaveAs: () => {},
    onSaveAll: () => {},
    onRevertFile: reloadFocusedOrMain,
    onRefreshWorkspace: tree.refresh,
    onCopyWorkspacePath: copyWorkspacePath as any,
    onNewPlanMarkdown: handleNewPlanFile,
    onExit: () => {},
  } as any;

  const editMenu = {
    canEdit: true,
    canUndo: true,
    canRedo: true,
    onUndo: () => {},
    onRedo: () => {},
    onCut: () => {},
    onCopy: () => {},
    onPaste: async () => {},
    onFind: () => {},
    onReplace: () => {},
    onFindInFiles: () => {},
    onReplaceInFiles: () => {},
    onToggleLineComment: () => {},
    onToggleBlockComment: () => {},
    onEmmetExpand: () => {}
  } as any;

  const selectionMenu = {
    canEdit: true,
    onSelectAll: () => {},
    onExpandSelection: () => {},
    onShrinkSelection: () => {},
    onCopyLineUp: () => {},
    onCopyLineDown: () => {},
    onMoveLineUp: () => {},
    onMoveLineDown: () => {},
    onDuplicateSelection: () => {},
    onAddNextOccurrence: () => {},
    onAddPreviousOccurrence: () => {},
    onSelectAllOccurrences: () => {},
    onToggleCtrlClickMultiCursor: () => {},
    ctrlClickMultiCursor: false,
    onToggleColumnSelectionMode: () => {},
    columnSelectionMode: false
  } as any;

  const goMenu = {
    canGoBack: true,
    canGoForward: true,
    onBack: goHistoryBack,
    onForward: goHistoryForward,
    onGoToFile: () => {},
    onGoToSymbolInWorkspace: () => {},
    onGoToSymbolInEditor: () => {},
    onGoToDefinition: () => {},
    onGoToDeclaration: () => {},
    onGoToTypeDefinition: () => {},
    onGoToImplementations: () => {},
    onGoToReferences: () => {},
    canGoToLine: true,
    onGoToLineColumn: () => {},
  } as any;

  const runMenu = {
     debugSessionActive: false,
     canStartDebugging: true,
     debugReplSession: false,
     terminalServerEnabled: true,
  } as any;

  const terminalMenu = {
    onNewTerminal: () => {},
    onSplitTerminal: () => {},
    onRunTask: () => {},
    onConfigureTasks: () => {},
  } as any;

  const helpMenu = {
    onHowToUse: () => modals.setHowToUseModalOpen(true),
    onViewLicense: () => modals.setMitLicenseModalOpen(true),
    onAbout: () => {}
  } as any;

  const settingsMenuHandlers = {
     onOpenSimpleAppSettings: () => {},
     onOpenAiBrains: () => {},
     onOpenProjects: () => {},
     onOpenIndexingDocs: () => modals.setIndexingDocsOpen(true),
  } as any;

  const staticAnalysisValue: WorkspaceStaticAnalysisContextValue = useMemo(() => ({
      problems: staticAnalysis.snapshot.problems.map(p => ({
          ...p,
          path: p.filePath,
          source: "eslint" as const,
          column: p.column ?? 0
      })),
      loading: staticAnalysis.loading,
      runAnalysis: staticAnalysis.runAnalysis,
      scheduleDebouncedRefresh: staticAnalysis.scheduleDebouncedRefresh,
      engine: staticAnalysis.snapshot.engine,
      log: staticAnalysis.snapshot.log.join("\n"),
      ranAt: staticAnalysis.snapshot.ranAt.toISOString(),
      ok: staticAnalysis.snapshot.ok,
      error: staticAnalysis.snapshot.error ?? undefined,
      openProblem: () => {},
      refreshProblemsCache: async () => {},
  }), [staticAnalysis]);

  return (
    <PageHeaderProvider value={{
      modelLabel,
      config: server.config,
      onSelectLlmModel: session.setLlmModel,
      llmModels,
      onOpenCommandPalette: () => setCommandPaletteOpen(true),
      onSave: saveAndRefresh,
      canSave: !!selectedPath && editor.dirty,
      onRevertFile: () => void reloadFocusedOrMain(),
      canRevert: !!selectedPath && editor.dirty,
      onRefreshWorkspace: tree.refresh,
      onCopyWorkspacePath: copyWorkspacePath,
      onSelectActivity: (a: any) => {
        setUiMode("technical");
        setLeftSidebarVisible(true);
        setTechnicalActivity(a);
      },
      onFocusBottomTab: () => {},
      fileMenu,
      editMenu,
      selectionMenu,
      goMenu,
      runMenu,
      terminalMenu,
      helpMenu,
      onOpenAgentSetup: () => {},
      onOpenAgentPermissions: () => setCommandPaletteOpen(true),
      settingsMenu: settingsMenuHandlers,
      onOpenTeamsYaml: openTeamsYamlFromMenu,
      onCreateAgentMarkdown: () => {},
      onReloadAgents: agents.reload,
      onOpenPiModelConfig: (path?: string) => {
        if (path) {
          // Claw mode doesn't have a direct provider file focus but we can switch to technical
          setUiMode("technical");
          setLeftSidebarVisible(true);
          setTechnicalActivity("settings");
        } else {
          setUiMode("technical");
          setLeftSidebarVisible(true);
          setTechnicalActivity("settings");
        }
      },
      chatSessionControls: {
        mode: session.chatMode,
        switchDisabled: session.streaming,
        onSetMode: session.setChatMode,
      },
      onNewPlanFile: () => void handleNewPlanFile(),
      newPlanFileDisabled: !workspaceOperational,
      viewTechnical: viewTechnicalMenu,
    }}>
    <WorkspaceStaticAnalysisProvider value={staticAnalysisValue}>
    <IdeLayout
      workspaceFileInputRef={{ current: null }} 
      onWorkspaceFileChange={() => {}} 
    >
      <ClawApp
        uiMode={uiMode}
        setUiMode={setUiMode}
        root={tree.root || ""}
        rootLabel={rootLabel}
        nodes={tree.nodes}
        treeLoading={tree.loading}
        treeError={tree.error}
        refreshTree={tree.refresh}
        refreshTreeQuiet={tree.refreshQuiet}
        modelLabel={modelLabel}
        config={server.config}
        effectiveModel={session.effectiveModel}
        onSelectLlmModel={session.setLlmModel}
        selectedPath={selectedPath}
        setSelectedPath={setSelectedPath}
        content={editor.content}
        setContent={editor.setContent}
        persistEncoding={editor.persistEncoding}
        fileMimeType={editor.mimeType || ""}
        fileLoading={editor.loading}
        fileError={editor.error}
        dirty={editor.dirty}
        save={editor.save}
        discardUnsavedChanges={editor.discardUnsavedChanges}
        line={line}
        col={col}
        onCursor={onCursor}
        rows={session.rows}
        logs={session.logs}
        chatTabs={session.chatTabs}
        activeChatTabId={session.activeChatTabId || ""}
        onSelectChatTab={session.selectChatTab}
        onCloseChatTab={session.closeChatTab}
        onRenameChatTab={session.renameChatTab}
        onNewSession={session.startNewSession}
        streaming={session.streaming}
        chatStreamUiEnabled={true} 
        onChatStreamUiEnabledChange={() => {}} 
        chatQueuePending={Number(session.chatQueuePending)}
        chatQueueItems={session.chatQueueItems}
        editChatQueueItem={session.editChatQueueItem}
        deleteChatQueueItem={session.deleteChatQueueItem}
        forceChatQueueItem={session.forceChatQueueItem}
        connected={session.connected}
        error={session.error}
        sendChat={(text) => void session.sendChat(session.chatAgentName ?? '', text, undefined, selectedPath)}
        stop={session.stop}
        clearError={session.clearError}
        onReopenLlmFixModal={reopenLlmFixModal}
        chatAgentName={session.chatAgentName}
        dispatchTurnAgent={session.chatAgentName}
        onChatAgentChange={session.setChatAgent}
        chatMode={session.chatMode}
        onChatModeChange={session.setChatMode}
        activeTab={clawTab}
        onTabChange={setClawTab}
        workspaceEditorRef={workspaceEditorRef}
        onUndoRedoStackChange={bumpEditorMenu}
        onSelectionPrefsChange={() => {}} 
        onFindInFiles={() => {}} 
        onReplaceInFiles={() => {}} 
        teamsYamlWritePath={agents.data?.teamsPath ?? ""}
        workspaceReady={workspaceOperational}
        onOpenTeamsYaml={openTeamsYamlFromMenu}
        onCreateAgentDefinition={() => {}} 
        onNewPlanFile={() => void handleNewPlanFile()}
        newPlanFileDisabled={!workspaceOperational}
        onOpenIndexingDocs={() => modals.setIndexingDocsOpen(true)}
        onOpenHostDoctor={() => modals.setHostDoctorOpen(true)}
        onHelp={() => modals.setClawHelpOpen(true)}
        contextPct={String(session.tokenMeter.contextPct ?? 0)}
        contextFillPct={session.chatPulseMeters?.contextFillPct ?? null}
        tokensDown={session.tokenMeter.tokensDown}
        tokensUp={session.tokenMeter.tokensUp}
        contextTitle={session.tokenMeter.contextTitle ?? ''}
        tokensTitle={session.tokenMeter.tokensTitle ?? ''}
        onMoveFileToDirectory={handleExplorerMoveFile}
        allowWorkspaceRootDrop={tree.folders.length === 1}
      />
    </IdeLayout>
    <ModalsRenderer
      commandPaletteOpen={modals.commandPaletteOpen}
      onCloseCommandPalette={() => modals.setCommandPaletteOpen(false)}
      commandPaletteItems={simpleCommandItems} 
      showLlmFixModal={modals.showLlmFixModal}
      onDismissLlmFixModal={() => modals.setLlmFixModalDismissed(true)}
      onClearLlmError={session.clearError}
      llmErrorMessage={session.error ?? ""}
      llmFixModalAppearanceDark={llmFixModalAppearanceDark}
      uiMode={uiMode}
      onOpenSimpleAiBrains={() => {}} 
      onOpenProviderCatalog={() => {}} 
      hostDoctorOpen={modals.hostDoctorOpen}
      onCloseHostDoctor={() => modals.setHostDoctorOpen(false)}
      onWorkspaceFileSaved={() => void tree.refresh()}
      indexingDocsOpen={modals.indexingDocsOpen}
      onCloseIndexingDocs={() => modals.setIndexingDocsOpen(false)}
      honchoSettingsOpen={modals.honchoSettingsOpen}
      onCloseHonchoSettings={() => modals.setHonchoSettingsOpen(false)}
      integrationDocUrl={`${WOP_PUBLIC_REPO_URL}/blob/main/docs/HONCHO_INTEGRATION.md`}
      agentPermissionsOpen={modals.agentPermissionsOpen}
      onCloseAgentPermissions={() => modals.setAgentPermissionsOpen(false)}
      mitLicenseModalOpen={modals.mitLicenseModalOpen}
      onDismissMitLicense={() => modals.setMitLicenseModalOpen(false)}
      restartServerModalOpen={modals.restartServerModalOpen}
      onCloseRestartServer={() => modals.setRestartServerModalOpen(false)}
      onReconnectServer={session.reconnectWebSocket}
      howToUseModalOpen={modals.howToUseModalOpen}
      onDismissHowToUse={() => modals.setHowToUseModalOpen(false)}
      repoBlobBase={`${WOP_PUBLIC_REPO_URL}/blob/main`}
      launchConfigAddOpen={modals.launchConfigAddOpen}
      onDismissLaunchConfigAdd={() => modals.setLaunchConfigAddOpen(false)}
      onPickLaunchConfig={(id) => {
        modals.setLaunchConfigAddOpen(false);
        void appendLaunchConfigurationSnippet(id);
      }}
      installDebuggersModalOpen={modals.installDebuggersModalOpen}
      onDismissInstallDebuggers={() => modals.setInstallDebuggersModalOpen(false)}
      newPlanFileModalOpen={modals.newPlanFileModalOpen}
      onDismissNewPlanFile={() => modals.setNewPlanFileModalOpen(false)}
      onCreateNewPlanFile={(title, slug) => {
        modals.setNewPlanFileModalOpen(false);
        void handleNewPlanFileCreate(title, slug);
      }}
      newWorkspaceFileDraft={modals.newWorkspaceFileDraft}
      onDismissNewWorkspaceFileModal={() => modals.setNewWorkspaceFileDraft(null)}
      onCreateWorkspaceFile={(path, ic) => {
        modals.setNewWorkspaceFileDraft(null);
        void performCreateNewWorkspaceFile(path, ic);
      }}
      clawHelpOpen={modals.clawHelpOpen}
      onDismissClawHelp={() => modals.setClawHelpOpen(false)}
      clawHelpDefaultSection={modals.clawHelpDefaultSection}
      clawConnected={session.connected}
      clawStreaming={session.streaming}
      onGoToTelegramChannels={() => setClawTab("channels")}
      onFocusClawChatTab={() => setClawTab("chat")}
    />
    </WorkspaceStaticAnalysisProvider>
    </PageHeaderProvider>
  );
}
