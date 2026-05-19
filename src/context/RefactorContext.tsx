import React, { createContext, useContext, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useUiMode } from '../hooks/useUiMode';
import { useServerConfig } from '../hooks/useServerConfig';
import { useWorkspaceTree } from '../hooks/useWorkspaceTree';
import { useWayOfPiSession } from '../hooks/useWayOfPiSession';
import { useSimplePreferences } from '../hooks/useSimplePreferences';
import { useAgents } from '../hooks/useAgents';
import { useUiViewsCatalog } from '../hooks/useUiViewsCatalog';
import { useRunMenuDebugState } from '../hooks/useRunMenuDebugState';
import { useModalState } from '../hooks/useModalState';
import { useFileEditor } from '../hooks/useFileEditor';
import { readWorkspaceGridState, writeWorkspaceGridState, type WorkspaceGridState } from '../utils/workspaceGridStorage';
import { readChromePreferences, type ChromePreferences } from '../utils/chromePreferences';
import { readLeftSidebarVisibleInitial, readDockLayout, type TechnicalDockLayout } from '../utils/technicalLayoutStorage';
import { readAutoSaveInitial } from '../utils/editorPreferences';
import { readRecentWorkspaceFolders } from '../utils/workspaceRecent';
import type { TechnicalActivity } from '../types/technicalShell';
import type { WorkspaceEditorRef } from '../types/workspaceEditor';
import type { SimpleTabId } from '../components/simple/SimpleNavRail';
import type { ClawTabId } from '../components/claw/ClawNavRail';
import type { TechnicalWorkspaceCellSnapshot } from '../components/TechnicalWorkspaceGrid';
import type { PiModelConfigPath } from '../constants/piModelConfigPaths';
import { languageFromPath } from '../utils/appHelpers';
import { useWorkspaceStaticAnalysis } from '../hooks/useWorkspaceStaticAnalysis';
import { useLlmModels } from '../hooks/useLlmModels';

interface RefactorContextValue {
  // UI State
  uiMode: string;
  setUiMode: (mode: string) => void;
  technical: boolean;
  isWsMulti: boolean;
  
  // Tabs & Perspectives
  simpleTab: SimpleTabId;
  setSimpleTab: (tab: SimpleTabId) => void;
  clawTab: ClawTabId;
  setClawTab: (tab: ClawTabId) => void;
  technicalActivity: TechnicalActivity;
  setTechnicalActivity: (activity: TechnicalActivity) => void;
  
  // Selected Item
  selectedPath: string | null;
  setSelectedPath: (path: string | null) => void;
  explorerContextDir: string;
  setExplorerContextDir: (dir: string) => void;
  treeExpand: { rev: number; paths: string[] };
  setTreeExpand: React.Dispatch<React.SetStateAction<{ rev: number; paths: string[] }>>;
  
  // Workspace Signal
  workspaceOpenSignal: { path: string; rev: number } | null;
  setWorkspaceOpenSignal: React.Dispatch<React.SetStateAction<{ path: string; rev: number } | null>>;

  // History Stack
  historyStack: string[];
  setHistoryStack: React.Dispatch<React.SetStateAction<string[]>>;
  historyIdx: number;
  setHistoryIdx: React.Dispatch<React.SetStateAction<number>>;

  // Editor Config
  autoSave: boolean;
  setAutoSave: (v: boolean) => void;
  
  // Multi-cell State
  multiCellAnyDirty: boolean;
  setMultiCellAnyDirty: (v: boolean) => void;
  multiCellSaveApiRef: React.RefObject<{ saveAllDirty: () => Promise<boolean> } | null>;
  
  // Effective (focused cell) state
  effSelectedPath: string | null;
  effDirty: boolean;
  effFileLoading: boolean;
  effFileError: string | null;
  
  // Editor State
  line: number;
  setLine: (l: number) => void;
  col: number;
  setCol: (c: number) => void;
  onCursor: (l: number, c: number) => void;
  language: string;
  copyWorkspacePath: () => void;

  // Technical Grid State
  workspaceGrid: WorkspaceGridState;
  setWorkspaceGrid: React.Dispatch<React.SetStateAction<WorkspaceGridState>>;
  wsFocusedCell: number;
  setWsFocusedCell: (index: number) => void;
  wsMaximizedCell: number | null;
  setWsMaximizedCell: (index: number | null) => void;
  techWsSnapshot: TechnicalWorkspaceCellSnapshot | null;
  setTechWsSnapshot: (s: TechnicalWorkspaceCellSnapshot | null) => void;

  // Layout State
  leftSidebarVisible: boolean;
  setLeftSidebarVisible: (v: boolean) => void;
  dockLayout: TechnicalDockLayout;
  setDockLayout: (d: TechnicalDockLayout) => void;
  chrome: ChromePreferences;
  setChrome: (c: ChromePreferences) => void;
  zenMode: boolean;
  setZenMode: (v: boolean) => void;

  // Editor Bridge
  workspaceEditorRef: React.RefObject<WorkspaceEditorRef | null>;
  editorMenuTick: number;
  bumpEditorMenu: () => void;
  
  // Shared Components State
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (v: boolean) => void;
  modals: ReturnType<typeof useModalState>;
  editor: ReturnType<typeof useFileEditor>;

  // Global Helpers/Data (from other hooks)
  tree: ReturnType<typeof useWorkspaceTree>;
  server: ReturnType<typeof useServerConfig>;
  session: ReturnType<typeof useWayOfPiSession>;
  preferences: ReturnType<typeof useSimplePreferences>;
  agents: ReturnType<typeof useAgents>;
  viewsCatalog: ReturnType<typeof useUiViewsCatalog>;
  debug: ReturnType<typeof useRunMenuDebugState>;
  staticAnalysis: ReturnType<typeof useWorkspaceStaticAnalysis>;
  llmModels: ReturnType<typeof useLlmModels>;
  
  // Missing pieces found in simple shell
  rootLabel: string;
  workspaceOperational: boolean;
  recentFolders: string[];
  simpleProviderPath: PiModelConfigPath | null;
  simpleProviderNonce: number;
  setSimpleProviderPath: (p: PiModelConfigPath | null) => void;
  setSimpleProviderNonce: (n: number) => void;
  reopenLlmFixModal: () => void;
  llmFixModalAppearanceDark: boolean;
  simpleMobileMenuFileFocusRev: number;
  setSimpleMobileMenuFileFocusRev: React.Dispatch<React.SetStateAction<number>>;
}

const RefactorContext = createContext<RefactorContextValue | undefined>(undefined);

export const RefactorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { mode: uiMode, setMode: setUiMode } = useUiMode();
  const technical = uiMode !== "simple";
  
  // Basic State
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [explorerContextDir, setExplorerContextDir] = useState("");
  const [treeExpand, setTreeExpand] = useState<{ rev: number; paths: string[] }>({ rev: 0, paths: [] });
  const [workspaceOpenSignal, setWorkspaceOpenSignal] = useState<{ path: string; rev: number } | null>(null);
  const [simpleTab, setSimpleTab] = useState<SimpleTabId>("chat");
  const [clawTab, setClawTab] = useState<ClawTabId>("mission");
  const [technicalActivity, setTechnicalActivity] = useState<TechnicalActivity>("explorer");
  
  // History
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  // Editor Config
  const [autoSave, setAutoSave] = useState(readAutoSaveInitial);
  
  // Multi-cell
  const [multiCellAnyDirty, setMultiCellAnyDirty] = useState(false);
  const multiCellSaveApiRef = useRef<{ saveAllDirty: () => Promise<boolean> } | null>(null);
  
  // Editor Cursor
  const [line, setLine] = useState(1);
  const [col, setCol] = useState(1);
  const onCursor = useCallback((l: number, c: number) => {
    setLine(l);
    setCol(c);
  }, []);

  // Technical Grid
  const [workspaceGrid, setWorkspaceGrid] = useState(() => readWorkspaceGridState());
  const [wsFocusedCell, setWsFocusedCell] = useState(0);
  const [wsMaximizedCell, setWsMaximizedCell] = useState<number | null>(null);
  const [techWsSnapshot, setTechWsSnapshot] = useState<TechnicalWorkspaceCellSnapshot | null>(null);
  
  // Layout
  const [leftSidebarVisible, setLeftSidebarVisible] = useState(readLeftSidebarVisibleInitial);
  const [dockLayout, setDockLayout] = useState<TechnicalDockLayout>(readDockLayout);
  const [chrome, setChrome] = useState(() => readChromePreferences());
  const [zenMode, setZenMode] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Editor Bridge
  const workspaceEditorRef = useRef<WorkspaceEditorRef | null>(null);
  const [editorMenuTick, setEditorMenuTick] = useState(0);
  const bumpEditorMenu = useCallback(() => setEditorMenuTick((t) => t + 1), []);

  const isWsMulti = uiMode === "technical" && (workspaceGrid.cols > 1 || workspaceGrid.rows > 1);

  // Editor Hook
  const editor = useFileEditor(isWsMulti ? null : selectedPath, {
    autoSave,
    onDiskPathMismatch: (p) => setSelectedPath(p),
  });

  // Simple provider focus
  const [simpleProviderPath, setSimpleProviderPath] = useState<PiModelConfigPath | null>(null);
  const [simpleProviderNonce, setSimpleProviderNonce] = useState(0);

  // Mobile focus
  const [simpleMobileMenuFileFocusRev, setSimpleMobileMenuFileFocusRev] = useState(0);

  // External Hooks
  const tree = useWorkspaceTree();
  const server = useServerConfig();
  const session = useWayOfPiSession();
  const preferences = useSimplePreferences();
  const agents = useAgents();
  const viewsCatalog = useUiViewsCatalog();
  const debug = useRunMenuDebugState();
  const modals = useModalState(session.error);
  const staticAnalysis = useWorkspaceStaticAnalysis(technical);
  const llmModels = useLlmModels();

  const rootLabel = useMemo(() => {
    if (!tree.root) return "";
    return tree.root.split("/").pop() || tree.root;
  }, [tree.root]);

  const workspaceOperational = useMemo(
    () => !tree.error && (tree.folders.length > 0 || Boolean(tree.root?.trim())),
    [tree.error, tree.folders.length, tree.root],
  );

  const recentFolders = useMemo(() => readRecentWorkspaceFolders(), [tree.root]);

  const reopenLlmFixModal = useCallback(() => {
    modals.setLlmFixModalDismissed(false);
  }, [modals]);

  const llmFixModalAppearanceDark = technical || preferences.isDark;

  const language = useMemo(() => languageFromPath(selectedPath), [selectedPath]);

  const copyWorkspacePath = useCallback(() => {
    if (tree.root) void navigator.clipboard.writeText(tree.root);
  }, [tree.root]);

  useEffect(() => {
    if (isWsMulti) return;
    setTechWsSnapshot(null);
  }, [isWsMulti]);

  useEffect(() => {
    if (!isWsMulti) {
      setMultiCellAnyDirty(false);
      multiCellSaveApiRef.current = null;
    }
  }, [isWsMulti]);

  const value = useMemo(() => ({
    uiMode, setUiMode, technical, isWsMulti,
    simpleTab, setSimpleTab,
    clawTab, setClawTab,
    technicalActivity, setTechnicalActivity,
    selectedPath, setSelectedPath,
    explorerContextDir, setExplorerContextDir,
    treeExpand, setTreeExpand,
    workspaceOpenSignal, setWorkspaceOpenSignal,
    historyStack, setHistoryStack,
    historyIdx, setHistoryIdx,
    autoSave, setAutoSave,
    multiCellAnyDirty, setMultiCellAnyDirty, multiCellSaveApiRef,
    effSelectedPath: isWsMulti ? (techWsSnapshot?.selectedPath ?? null) : selectedPath,
    effDirty: isWsMulti ? multiCellAnyDirty : editor.dirty,
    effFileLoading: isWsMulti ? !!techWsSnapshot?.loading : editor.loading,
    effFileError: isWsMulti ? (techWsSnapshot?.error ?? null) : editor.error,
    line, setLine, col, setCol, onCursor, language, copyWorkspacePath,
    workspaceGrid, setWorkspaceGrid,
    wsFocusedCell, setWsFocusedCell,
    wsMaximizedCell, setWsMaximizedCell,
    techWsSnapshot, setTechWsSnapshot,
    leftSidebarVisible, setLeftSidebarVisible,
    dockLayout, setDockLayout,
    chrome, setChrome,
    zenMode, setZenMode,
    workspaceEditorRef,
    editorMenuTick, bumpEditorMenu,
    commandPaletteOpen, setCommandPaletteOpen,
    editor,
    tree, server, session, preferences, agents, viewsCatalog, debug, modals,
    llmModels,
    rootLabel, workspaceOperational, recentFolders,
    simpleProviderPath, simpleProviderNonce, setSimpleProviderPath, setSimpleProviderNonce,
    reopenLlmFixModal, llmFixModalAppearanceDark,
    simpleMobileMenuFileFocusRev, setSimpleMobileMenuFileFocusRev,
    staticAnalysis
  }), [
    uiMode, technical, isWsMulti, simpleTab, clawTab, technicalActivity, selectedPath,
    explorerContextDir, treeExpand, workspaceOpenSignal, historyStack, historyIdx,
    autoSave, multiCellAnyDirty, line, col, onCursor, language, copyWorkspacePath,
    workspaceGrid, wsFocusedCell, wsMaximizedCell, techWsSnapshot,
    leftSidebarVisible, dockLayout, chrome, zenMode,
    editorMenuTick, commandPaletteOpen, editor,
    tree, server, session, preferences, agents, viewsCatalog, debug, modals,
    llmModels,
    rootLabel, workspaceOperational, recentFolders,
    simpleProviderPath, simpleProviderNonce, reopenLlmFixModal, llmFixModalAppearanceDark,
    simpleMobileMenuFileFocusRev, staticAnalysis
  ]);

  return (
    <RefactorContext.Provider value={value}>
      {children}
    </RefactorContext.Provider>
  );
};

export const useRefactor = () => {
  const context = useContext(RefactorContext);
  if (context === undefined) {
    throw new Error('useRefactor must be used within a RefactorProvider');
  }
  return context;
};
