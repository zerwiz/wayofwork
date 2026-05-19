import React from 'react';
import { Outlet } from 'react-router-dom';
import { useRefactor } from '../context/RefactorContext';
import { MenuBar } from '../components/MenuBar';
import { StatusBar } from '../components/StatusBar';
import { GlobalAISidebar } from './GlobalAISidebar';
import { useWorkspaceActions } from '../hooks/useWorkspaceActions';
import { useEditorCommandHandlers } from '../hooks/useEditorCommandHandlers';
import { useNavigationHandlers } from '../hooks/useNavigationHandlers';

export function AppShell() {
  const { 
    uiMode, setUiMode, technical, chrome,
    tree,
    session,
    selectedPath,
    line, col, onCursor, language, copyWorkspacePath,
    modals,
    server,
    agents,
    workspaceOperational,
    rootLabel,
    editor,
    setLeftSidebarVisible,
    setTechnicalActivity,
    leftSidebarVisible,
    debug,
    recentFolders,
    autoSave, setAutoSave,
    staticAnalysis,
    reopenLlmFixModal,
    llmFixModalAppearanceDark
  } = useRefactor();

  const {
    handleNewFile,
    handleNewFolder,
    handleNewPlanFile,
    handleNewPlanFileCreate
  } = useWorkspaceActions();

  const {
    saveAndRefresh,
    reloadFocusedOrMain
  } = useEditorCommandHandlers();

  const {
    focusWorkspaceFileFromMenu,
    openTeamsYamlFromMenu,
    goHistoryBack,
    goHistoryForward
  } = useNavigationHandlers();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#1e1e1e] text-[#cccccc] selection:bg-[#ea580c]/30">
      <MenuBar
        modelLabel={server.config?.ollamaModel || server.config?.openrouterModel || "Unknown"}
        uiMode={uiMode}
        onUiModeChange={setUiMode}
        config={server.config}
        onOpenCommandPalette={() => modals.setCommandPaletteOpen(true)}
        onSave={saveAndRefresh}
        canSave={!!selectedPath && editor.dirty}
        onRevertFile={reloadFocusedOrMain}
        canRevert={!!selectedPath && editor.dirty}
        onRefreshWorkspace={() => void tree.refresh()}
        onCopyWorkspacePath={copyWorkspacePath}
        onSelectActivity={(a) => {
          setUiMode("technical");
          setLeftSidebarVisible(true);
          setTechnicalActivity(a);
        }}
        onFocusBottomTab={() => {}} 
        leftSidebarVisible={leftSidebarVisible}
        onToggleLeftSidebar={() => setLeftSidebarVisible(!leftSidebarVisible)}
        onOpenAgentSetup={() => {}} 
        onOpenAgentPermissions={() => modals.setAgentPermissionsOpen(true)}
        onOpenTeamsYaml={openTeamsYamlFromMenu}
        onCreateAgentMarkdown={() => {}} 
        onReloadAgents={agents.reload}
        onOpenPiModelConfig={() => {}} 
        chatSessionControls={{
          mode: session.chatMode,
          switchDisabled: session.streaming,
          onSetMode: session.setChatMode,
        }}
        onNewPlanFile={() => void handleNewPlanFile()}
        newPlanFileDisabled={!workspaceOperational}
        fileMenu={{
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
        } as any}
        editMenu={{
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
        }}
        selectionMenu={{
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
        }}
        goMenu={{
            canGoBack: true,
            canGoForward: true,
            onBack: goHistoryBack,
            onForward: goHistoryForward,
            canLastEditLocation: false,
            onLastEditLocation: () => {},
            canSwitchEditorPrevious: false,
            onSwitchEditorPrevious: () => {},
            canSwitchEditorNext: false,
            onSwitchEditorNext: () => {},
            onGoToFile: () => {},
            onGoToSymbolInWorkspace: () => {},
            canLanguageFeatures: false,
            onGoToSymbolInEditor: () => {},
            onGoToDefinition: () => {},
            onGoToDeclaration: () => {},
            onGoToTypeDefinition: () => {},
            onGoToImplementations: () => {},
            canAddSymbolToChat: false,
            onAddSymbolToCurrentChat: () => {},
            onAddSymbolToNewChat: () => {},
            onGoToReferences: () => {},
            canGoToLine: true,
            onGoToLineColumn: () => {},
            canGoToBracket: false,
            onGoToBracket: () => {},
        } as any}
        runMenu={{
             debugSessionActive: debug.debugSessionActive,
             canStartDebugging: true,
             debugReplSession: debug.debugReplSession,
             terminalServerEnabled: true,
        } as any}
        terminalMenu={{
            onNewTerminal: () => {},
            onSplitTerminal: () => {},
            onRunTask: () => {},
            onConfigureTasks: () => {},
        } as any}
        helpMenu={{
            onHowToUse: () => modals.setHowToUseModalOpen(true),
            onViewLicense: () => modals.setMitLicenseModalOpen(true),
            onAbout: () => {}
        } as any}
        settingsMenu={{
             onOpenSimpleAppSettings: () => {},
             onOpenAiBrains: () => {},
             onOpenProjects: () => {},
             onOpenIndexingDocs: () => modals.setIndexingDocsOpen(true),
        } as any}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <main className="relative flex-1 overflow-hidden">
          <Outlet />
        </main>
        
        <GlobalAISidebar />
      </div>

      {chrome.statusBarVisible && (
        <StatusBar
          uiMode={uiMode}
          workspaceRoot={(tree.folders[0]?.path ?? tree.root) || "—"}
          connected={session.connected}
          line={line}
          col={col}
          language={language}
          contextPct={String(session.tokenMeter.contextPct ?? 0)}
          tokensDown={session.tokenMeter.tokensDown}
          tokensUp={session.tokenMeter.tokensUp}
          onCopyWorkspacePath={copyWorkspacePath}
          chatMode={session.chatMode}
          chatAgentName={session.chatAgentName ?? undefined}
        />
      )}
    </div>
  );
}
