import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { 
  SimplePage, AtaPage, TAPlannerPage, ClawPage, DocsPage, WorkPage, KanbanPage,
  UserProfile, AdminDashboard, SuperAdminDashboard,
  ClientDashboard, WorkerPortal
} from "./pages";
import { RefactorProvider, useRefactor } from "./context/RefactorContext";
import { MenuBar } from "./components/MenuBar";
import { PageHeaderProvider, usePageHeader } from "./context/PageHeaderContext";
import { ToastProvider } from "./contexts/ToastContext";
import { LanguageProvider } from "./contexts/LanguageContext";

const uiModeRouteMap: Record<string, string> = {
  simple: "/simple",
  work: "/workboard",
  claw: "/claw",
  docs: "/docs",
  kanban: "/kanban",
};

const routeUiModeMap: Record<string, string> = {
  "/simple": "simple",
  "/workboard": "work",
  "/kanban": "kanban",
  "/claw": "claw",
  "/docs": "docs",
};

function RouteSync() {
  const { setUiMode } = useRefactor();
  const location = useLocation();
  const path = location.pathname;

  useEffect(() => {
    const mode = routeUiModeMap[path];
    if (mode) {
      setUiMode(mode);
    }
  }, [path, setUiMode]);

  return null;
}

function UiModeWatcher() {
  const { uiMode } = useRefactor();
  const navigate = useNavigate();
  const pathname = useLocation().pathname;
  const lastMode = React.useRef(uiMode);

  useEffect(() => {
    const expectedPath = uiModeRouteMap[uiMode] || "/simple";
    if (pathname !== expectedPath) {
      if (lastMode.current === uiMode) return;
      lastMode.current = uiMode;
      navigate(expectedPath, { replace: true });
    }
  }, [uiMode, navigate, pathname]);

  return null;
}

function ConnectedMenuBar() {
  const { uiMode, setUiMode, session, llmModels } = useRefactor();
  const h = usePageHeader();
  return (
    <MenuBar 
      uiMode={uiMode} 
      onUiModeChange={setUiMode} 
      onSelectLlmModel={session.setLlmModel}
      llmModels={llmModels}
      {...h} 
    />
  );
}

function WorkerPortalWrapper() {
  const { uiMode, setUiMode } = useRefactor();
  return <WorkerPortal uiMode={uiMode} setUiMode={setUiMode} />;
}

function AdminDashboardWrapper() {
  const { uiMode, setUiMode } = useRefactor();
  return <AdminDashboard uiMode={uiMode} setUiMode={setUiMode} />;
}

function SuperAdminDashboardWrapper() {
  const { uiMode, setUiMode } = useRefactor();
  return <SuperAdminDashboard uiMode={uiMode} setUiMode={setUiMode} />;
}

function ClientDashboardWrapper() {
  const { uiMode, setUiMode } = useRefactor();
  return <ClientDashboard uiMode={uiMode} setUiMode={setUiMode} />;
}

function UserProfileWrapper() {
  const { uiMode, setUiMode } = useRefactor();
  return <UserProfile uiMode={uiMode} setUiMode={setUiMode} />;
}

const defaultMenuStubs = {
  fileMenu: {
    switchAllowed: false,
    recentFolders: [],
    autoSave: false,
    onToggleAutoSave: () => {},
    workspaceFolders: [],
    dirty: false,
    hasOpenFile: false,
    canSaveFile: false,
    canRevertFile: false,
    onRefreshWorkspaceTree: () => {},
    onCopyWorkspacePath: () => {},
    onNewTextFile: () => {},
    onNewWindow: () => {},
    onNewAgentsWindow: () => {},
    onOpenFile: () => {},
    onOpenFolder: () => {},
    onAddFolderToWorkspace: () => {},
    onOpenWorkspaceFromFile: () => {},
    onOpenRecentFolder: () => {},
    onSaveWorkspaceAs: () => {},
    onDuplicateWorkspace: () => {},
    onSave: () => {},
    onSaveAs: () => {},
    onSaveAll: () => {},
    onRevertFile: () => {},
    onCloseEditor: () => {},
    onCloseWorkspace: () => {},
    onCloseWindow: () => {},
    onExit: () => {},
    onPreferencesOpen: () => {},
    onShareCopyLink: () => {},
    onRemoveWorkspaceFolder: () => {},
  } as any,
  editMenu: { canEdit: false, canUndo: false, canRedo: false, onUndo: () => {}, onRedo: () => {}, onCut: () => {}, onCopy: () => {}, onPaste: async () => {}, onFind: () => {}, onReplace: () => {}, onFindInFiles: () => {}, onReplaceInFiles: () => {}, onToggleLineComment: () => {}, onToggleBlockComment: () => {}, onEmmetExpand: () => {} } as any,
  selectionMenu: { canEdit: false, onSelectAll: () => {}, onExpandSelection: () => {}, onShrinkSelection: () => {}, onCopyLineUp: () => {}, onCopyLineDown: () => {}, onMoveLineUp: () => {}, onMoveLineDown: () => {}, onDuplicateSelection: () => {}, onAddNextOccurrence: () => {}, onAddPreviousOccurrence: () => {}, onSelectAllOccurrences: () => {}, onToggleCtrlClickMultiCursor: () => {}, ctrlClickMultiCursor: false, onToggleColumnSelectionMode: () => {}, columnSelectionMode: false } as any,
  goMenu: { canGoBack: false, onGoBack: () => {}, canGoForward: false, onGoForward: () => {}, onGoToFile: () => {}, onGoToSymbol: () => {}, onGoToLine: () => {}, onGoToProblem: () => {}, onGoToReference: () => {}, onGoToNextProblem: () => {}, onGoToPreviousProblem: () => {}, onGoToNextDifference: () => {}, onGoToPreviousDifference: () => {}, onGoToNextInFolder: () => {}, onGoToPreviousInFolder: () => {}, onGoToBreadcrumb: () => {}, onGoToTypeDefinition: () => {}, onGoToImplementation: () => {}, onGoToReferences: () => {} } as any,
  runMenu: { debugSessionActive: false, canStartDebugging: false, debugReplSession: false, terminalServerEnabled: false } as any,
  terminalMenu: { onNewTerminal: () => {}, onSplitTerminal: () => {}, onRunTask: () => {}, onConfigureTasks: () => {} } as any,
  helpMenu: { onHowToUse: () => {}, onViewLicense: () => {}, onAbout: () => {} } as any,
  settingsMenu: { onOpenSimpleAppSettings: () => {}, onOpenAiBrains: () => {}, onOpenProjects: () => {}, onOpenIndexingDocs: () => {} } as any,
  viewSimple: { onOpenAppearanceSettings: () => {}, onToggleFullScreen: async () => {}, onSeedViewsCatalog: async () => {}, appearanceDark: true, catalogSource: "default" as const, catalogLoading: false, catalogError: null, catalogParseWarning: null, onOpenDefaultViewsJson: () => {} } as any,
  viewTechnical: { onOpenAppearanceSettings: () => {}, onToggleFullScreen: async () => {}, leftSidebarVisible: true, onToggleLeftSidebar: () => {}, editorLayout: "1x1", onSetEditorLayout: () => {}, zenMode: false, onToggleZenMode: () => {}, onEnterZen: () => {}, onExitZen: () => {}, statusBarVisible: true, onToggleStatusBar: () => {}, menuBarVisible: true, onToggleMenuBar: () => {}, breadcrumbsVisible: true, onToggleBreadcrumbs: () => {}, wordWrap: true, onToggleWordWrap: () => {}, centeredEditorLayout: false, onToggleCenteredEditorLayout: () => {}, zoomLevel: 100, onZoomIn: () => {}, onZoomOut: () => {}, onZoomReset: () => {}, onResetZoom: () => {}, onApplyLayoutPreset: () => {}, onNormalView: () => {}, onFlipLayout: () => {}, uiZoomPercent: 100 } as any,
};

export default function App() {
  return (
    <RefactorProvider>
      <LanguageProvider>
        <RouteSync />
        <UiModeWatcher />
        <PageHeaderProvider value={defaultMenuStubs}>
          <ToastProvider>
            <div className="flex flex-col h-screen overflow-hidden">
            <div className="shrink-0">
              <ConnectedMenuBar />
            </div>
            <div className="flex-1 overflow-hidden">
              <Routes>
                <Route path="/" element={<Navigate to="/simple" replace />} />
                <Route path="/simple" element={<SimplePage />} />
                <Route path="/kanban" element={<KanbanPage />} />
                <Route path="/workboard" element={<WorkPage />} />
                <Route path="/ata" element={<AtaPage />} />
                <Route path="/claw" element={<ClawPage />} />
                <Route path="/docs" element={<DocsPage />} />
                <Route path="/ta-planner" element={<TAPlannerPage />} />
                <Route path="/portal" element={<WorkerPortalWrapper />} />
                <Route path="/admin" element={<AdminDashboardWrapper />} />
                <Route path="/super-admin" element={<SuperAdminDashboardWrapper />} />
                <Route path="/client" element={<ClientDashboardWrapper />} />
                <Route path="/profile" element={<UserProfileWrapper />} />
              </Routes>
            </div>
          </div>
          </ToastProvider>
        </PageHeaderProvider>
      </LanguageProvider>
    </RefactorProvider>
  );
}
