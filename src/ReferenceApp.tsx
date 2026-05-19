import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type MouseEvent,
  type SetStateAction,
} from "react";
import { MessageSquare } from "lucide-react";
import { apiGet, apiPostJson, apiPutJson } from "./api/client";
import { requestNativePick } from "./api/nativeDialog";
import { postWorkspaceOp } from "./api/workspace";
import { ActivityBar } from "./components/ActivityBar";
import { ChatPanel } from "./components/ChatPanel";

import { AgentPermissionsModal } from "./components/AgentPermissionsModal";
import { HostDoctorModal } from "./components/HostDoctorModal";
import { HonchoSettingsModal } from "./components/HonchoSettingsModal";
import { NgrokSettingsModal } from "./components/NgrokSettingsModal";
import { IndexingDocsModal } from "./components/IndexingDocsModal";
import { InstallDebuggersModal } from "./components/InstallDebuggersModal";
import {
  HowToUseModal,
  type HowToUseSectionId,
} from "./components/HowToUseModal";
import { MitLicenseModal } from "./components/MitLicenseModal";
import { RestartServerModal } from "./components/RestartServerModal";
import { LaunchConfigAddModal } from "./components/LaunchConfigAddModal";
import { NewPlanFileModal } from "./components/NewPlanFileModal";
import { NewWorkspaceFileModal } from "./components/NewWorkspaceFileModal";
import { LlmFixModal } from "./components/LlmFixModal";
import { TechnicalPrimarySidebar } from "./components/technical/TechnicalPrimarySidebar";
import { DockSplitHandle } from "./components/DockSplitHandle";
import { ExplorerSidebar } from "./components/ExplorerSidebar";
import { MenuBar } from "./components/MenuBar";
import { SimpleApp } from "./components/simple/SimpleApp";
import type { SimpleTabId } from "./components/simple/SimpleNavRail";
import { ClawApp } from "./components/claw/ClawApp";
import {
  ClawHelpModal,
  type ClawHelpSectionId,
} from "./components/claw/ClawHelpModal";
import type { ClawTabId } from "./components/claw/ClawNavRail";
import "./claw/clawUserUiModules";
import { StatusBar } from "./components/StatusBar";
import { WorkspaceStaticAnalysisProvider } from "./context/WorkspaceStaticAnalysisContext";
import {
  TechnicalWorkspaceGrid,
  type TechnicalWorkspaceCellSnapshot,
} from "./components/technical/TechnicalWorkspaceGrid";
import { WorkspaceCellDropSurface } from "./components/WorkspaceCellDropSurface";
import type { WorkspaceGridPickerConfig } from "./components/WorkspaceGridLayoutPicker";
import { WorkspacePane } from "./components/WorkspacePane";
import {
  ExtensionsSidePanel,
  PlanningSidePanel,
  ScmSidePanel,
  SearchSidePanel,
  SettingsSidePanel,
} from "./components/technical/TechnicalSidePanels";
import { CommandPalette, type CommandItem } from "./components/technical/CommandPalette";
import { useAgents } from "./hooks/useAgents";
import {
  buildFilePutPayload,
  useFileEditor,
  type FilePersistEncoding,
} from "./hooks/useFileEditor";
import { useServerConfig } from "./hooks/useServerConfig";
import { useUiMode, type UiMode } from "./hooks/useUiMode";
import {
  MobileChrome,
  MobileTechnicalShell,
  useShellMobile,
} from "./components/mobile";
import { useUiViewsCatalog } from "./hooks/useUiViewsCatalog";
import { useRunMenuDebugState } from "./hooks/useRunMenuDebugState";
import {
  readSimpleChatStreamUiEnabled,
  useSimplePreferences,
  writeSimpleChatStreamUiEnabled,
} from "./hooks/useSimplePreferences";
import {
  useWayOfPiSession,
  type ChatSessionMode,
  type ChatSessionSurfaceId,
} from "./hooks/useWayOfPiSession";
import { useMaxWidthMediaQuery } from "./hooks/useMaxWidthMediaQuery";
import { useWorkspaceTree } from "./hooks/useWorkspaceTree";
import { useWorkspaceStaticAnalysis } from "./hooks/useWorkspaceStaticAnalysis";
import type { PiModelConfigPath } from "./constants/piModelConfigPaths";
import { PI_MODEL_CONFIG_ENTRIES } from "./constants/piModelConfigPaths";
import type { FileMenuProps } from "./types/fileMenu";
import type {
  EditMenuHandlers,
  GoMenuHandlers,
  HelpMenuHandlers,
  RunMenuHandlers,
  SelectionMenuHandlers,
  SettingsMenuHandlers,
  TerminalMenuHandlers,
  WorkspaceEditorRef,
} from "./types/workspaceEditor";
import type {
  BottomPanelTab,
  EditorLayoutPreset,
  TechnicalActivity,
  ViewMenuSimpleOptions,
  ViewMenuTechnicalOptions,
} from "./types/technicalShell";
import type { UiViewCatalogEntry } from "./types/uiViewsCatalog";
import { buildCodeWorkspacePayload } from "./utils/codeWorkspaceFile";
import {
  flattenTreeFiles,
  gitMarkedFilePathsSorted,
  nextGitReviewFilePath,
} from "./utils/flattenTree";
import {
  ancestorDirPaths,
  posixBasename,
  posixDirname,
} from "./utils/posixPath";
import { injectIntoChatComposer } from "./utils/chatComposerInjectBus";
import {
  buildImplementPlanPrompt,
  buildReviewPlanPrompt,
} from "./utils/planModeComposerTemplates";
import { createPlanArtifactInWorkspace } from "./utils/planModeWorkspace";
import { readAutoSaveInitial, writeAutoSave } from "./utils/editorPreferences";
import { chatErrorSuggestsModelFix } from "./utils/chatErrorModelHint";
import { workspaceAgentDisplayName } from "./utils/workspaceAgentDisplay";
import {
  pushRecentWorkspaceFolder,
  readRecentWorkspaceFolders,
} from "./utils/workspaceRecent";
import {
  absolutePathForSaveAsDefault,
  relativePathFromWorkspaceAbs,
} from "./utils/workspaceDiskPath";
import {
  applyAddFileTab,
  applyAddPanelTab,
  applyCloseToolTab,
  applyEnsureFileTab,
  applyFocusToolTab,
  applyPanelTabMove,
  applyRemoveFileTab,
  applyRemoveTab,
  remapFileTabPath,
  remapPathPrefixInDock,
  removeExplorerPathsFromDock,
  applyShowToolTab,
  cloneLayout,
  PANEL_DOCK_DEFAULTS,
  PANEL_TAB_DND_TYPE,
  parseFilePathDragJson,
  parsePanelTabJson,
  parseWorkspacePaneCellIndex,
  toolTabVisible,
  WOP_DND_SOURCE_CELL_TYPE,
  WOP_FILE_PATH_DND_TYPE,
  WOP_WORKSPACE_PANE_DND_TYPE,
  type PanelDockLayout,
  type PanelTab,
  type ToolTabId,
} from "./utils/panelDockLayout";
import {
  chatSizePxWhenSwitchingDock,
  clampBottomPanelHeight,
  clampChatHeight,
  clampChatWidth,
  clampLeftSidebarWidth,
  clampTopPanelHeight,
  DEFAULT_COMPACT_BOTTOM_CHAT_HEIGHT_PX,
  DOCK_DEFAULTS,
  readDockLayout,
  readLeftSidebarVisibleInitial,
  writeDockLayout,
  writeLeftSidebarVisible,
  type ChatDockRegion,
  type TechnicalDockLayout,
} from "./utils/technicalLayoutStorage";
import {
  readChromePreferences,
  writeChromePreferences,
  type ChromePreferences,
} from "./utils/chromePreferences";
import {
  applyWorkspaceGridColResizeDelta,
  applyWorkspaceGridRowResizeDelta,
  growWorkspaceGridForEdgeDrop,
  mapCellIndexAfterRemoval,
  nextFocusAfterRemove,
  readWorkspaceGridState,
  remapWorkspaceCellIndexAfterEdgeGrow,
  removeWorkspaceCellAt,
  resizeWorkspaceGrid,
  WORKSPACE_GRID_MAX_COLS,
  WORKSPACE_GRID_MAX_ROWS,
  writeWorkspaceGridState,
  type WorkspaceGridState,
} from "./utils/workspaceGridStorage";
import type { WopDropZone } from "./utils/workspaceDropZones";
import { computeWorkspaceFilePreview } from "./utils/workspaceFilePreview";
import { sendTerminalInput } from "./utils/terminalInputBridge";
import {
  mergeSnippetIntoLaunchJson,
  type LaunchSnippetId,
} from "./utils/launchJsonMutate";
import {
  getActiveFileDebugPlan,
  runActiveFileShellLine,
} from "./utils/terminalRunCommands";

function applyMovePanelTabBetweenCellsInGrid(
  g: WorkspaceGridState,
  from: number,
  to: number,
  tab: PanelTab,
  before: PanelTab | null,
): WorkspaceGridState {
  const n = g.cols * g.rows;
  if (from < 0 || from >= n || to < 0 || to >= n) return g;
  if (from === to) {
    const cells = [...g.cells];
    const dock = cells[to] ?? cloneLayout(PANEL_DOCK_DEFAULTS);
    const nextDock = applyPanelTabMove(dock, tab, before);
    if (nextDock === dock) return g;
    cells[to] = nextDock;
    return { ...g, cells };
  }
  const cells = [...g.cells];
  const fromDock = cells[from] ?? cloneLayout(PANEL_DOCK_DEFAULTS);
  const toDock = cells[to] ?? cloneLayout(PANEL_DOCK_DEFAULTS);
  const afterRemove = applyRemoveTab(fromDock, tab);
  const afterAdd = applyAddPanelTab(toDock, tab);
  const afterMove = before
    ? applyPanelTabMove(afterAdd, tab, before)
    : afterAdd;
  if (afterRemove === fromDock && afterMove === toDock) return g;
  cells[from] = afterRemove;
  cells[to] = afterMove;
  return { ...g, cells };
}

const TASKS_JSON_REL = ".vscode/tasks.json";
const TASKS_JSON_TEMPLATE = `{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "build",
      "type": "shell",
      "command": "bun run build",
      "problemMatcher": [],
      "group": {
        "kind": "build",
        "isDefault": true
      }
    }
  ]
}
`;

/** Public source repo (Help menu links, View License on GitHub). */
const WOP_PUBLIC_REPO_URL = "https://github.com/zerwiz/wayofpi";

/** Help → Give Feedback — [WhyNot Productions contact](https://whynotproductions.netlify.app/contact/). */
const WOP_FEEDBACK_CONTACT_URL =
  "https://whynotproductions.netlify.app/contact/";
/** Help → Support us — maintainer home (same as About dialog “Home”). */
const WOP_SUPPORT_HOME_URL = "https://whynotproductions.netlify.app/";

const LAUNCH_JSON_REL = ".vscode/launch.json";
const LAUNCH_JSON_TEMPLATE = `{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Program",
      "skipFiles": ["<node_internals>/**"],
      "program": "\${workspaceFolder}/index.ts"
    }
  ]
}
`;

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

export default function App() {
  const { mode: uiMode, setMode: setUiMode } = useUiMode();
  const { shellMobile, setShellMobile } = useShellMobile();
  const narrowViewport767 = useMaxWidthMediaQuery(767);
  const shouldBumpSimpleMenuFileFocus = useMemo(
    () => shellMobile || (uiMode === "simple" && narrowViewport767),
    [shellMobile, uiMode, narrowViewport767],
  );
  const shouldBumpClawMenuFileFocus = useMemo(
    () => shellMobile || (uiMode === "claw" && narrowViewport767),
    [shellMobile, uiMode, narrowViewport767],
  );
  const {
    root,
    nodes,
    folders,
    git,
    switchAllowed,
    error: treeError,
    loading: treeLoading,
    refresh,
    refreshQuiet,
  } = useWorkspaceTree();
  /** `refreshQuiet` returns tree JSON for callers like Git stage; Simple/Claw props expect `Promise<void>`. */
  const refreshTreeQuietShell = useCallback(async () => {
    await refreshQuiet();
  }, [refreshQuiet]);
  /** Server-backed workspace roots from `/api/tree` — not tied to the active editor tab (`selectedPath`). */
  const workspaceOperational = useMemo(
    () => !treeError && (folders.length > 0 || Boolean(root?.trim())),
    [treeError, folders.length, root],
  );
  const { config, refresh: refreshServerConfig } = useServerConfig();
  const [simpleChatStreamUiEnabled, setSimpleChatStreamUiEnabled] = useState(
    readSimpleChatStreamUiEnabled,
  );
  const bufferAssistantDeltasRef = useRef(false);
  bufferAssistantDeltasRef.current =
    uiMode === "simple" && !simpleChatStreamUiEnabled;
  const onSimpleChatStreamUiEnabledChange = useCallback((on: boolean) => {
    setSimpleChatStreamUiEnabled(on);
    writeSimpleChatStreamUiEnabled(on);
  }, []);
  const agentsApi = useAgents();
  const reloadAgentsCatalog = useCallback(() => {
    agentsApi.reload();
  }, [agentsApi.reload]);
  const focusAgentWrittenWorkspaceFileRef = useRef<(rel: string) => void>(
    () => {},
  );
  /**
   * Chat is one hook, three **surfaces** (`simple` | `technical` | `claw`): each keeps its own tabs, transcript,
   * queue UI, plan/build + agent prefs, and server JSONL key prefix (`wireSessionKeyForSurface`). Switching
   * `uiMode` swaps the active slice and re-`activate_session`s the socket for that surface.
   */
  const chatSurfaceId: ChatSessionSurfaceId = uiMode as ChatSessionSurfaceId;
  const session = useWayOfPiSession(
    chatSurfaceId,
    refresh,
    bufferAssistantDeltasRef,
    reloadAgentsCatalog,
    (rel) => focusAgentWrittenWorkspaceFileRef.current(rel),
  );
  const teamPulseSessionTokenSummary = useMemo(
    () => ({
      tokensDown: session.tokenMeter.tokensDown,
      tokensUp: session.tokenMeter.tokensUp,
      tokensTitle: session.tokenMeter.tokensTitle,
    }),
    [
      session.tokenMeter.tokensDown,
      session.tokenMeter.tokensUp,
      session.tokenMeter.tokensTitle,
    ],
  );
  const { isDark: simpleIsDark } = useSimplePreferences();
  /** Simple + Claw share `useSimplePreferences` color mode; Technical shell is always dark-chrome for this dialog. */
  const llmFixModalAppearanceDark =
    uiMode === "technical" ? true : simpleIsDark;
  const [llmFixModalDismissed, setLlmFixModalDismissed] = useState(false);
  const prevChatErrorRef = useRef<string | null>(null);
  useEffect(() => {
    const e = session.error;
    if (!e) {
      prevChatErrorRef.current = null;
      setLlmFixModalDismissed(false);
      return;
    }
    if (prevChatErrorRef.current !== e) {
      prevChatErrorRef.current = e;
      setLlmFixModalDismissed(false);
    }
  }, [session.error]);
  const showLlmFixModal =
    !!session.error &&
    chatErrorSuggestsModelFix(session.error) &&
    !llmFixModalDismissed;
  const teamsYamlWritePath = useMemo(() => {
    const tp = agentsApi.data?.teamsPath;
    if (tp) return tp;
    if (folders.length > 1 && folders[0])
      return `${folders[0].label}/.pi/agents/teams.yaml`;
    return ".pi/agents/teams.yaml";
  }, [agentsApi.data?.teamsPath, folders]);
  const uiViewsCatalog = useUiViewsCatalog();
  const modelLabel = useMemo(() => {
    if (!config) return "…";
    const p = (
      session.llmProviderFromSocket ??
      config.provider ??
      "ollama"
    ).toLowerCase();
    const id =
      session.effectiveModel?.trim() ||
      (p === "openrouter" ? config.openrouterModel : config.ollamaModel);
    const trimmed = String(id ?? "").trim();
    if (!trimmed) return "…";
    const stackLabel =
      p === "openrouter"
        ? `openrouter/${trimmed}`
        : p === "ollama"
          ? `ollama/${trimmed}`
          : `${p}/${trimmed}`;
    if (config.piDrivesChat) return `Pi · ${stackLabel}`;
    /** Interim Bun path — avoid implying the Pi CLI is driving turns when Mission/`piDrivesChat` say otherwise. */
    return `Bun · ${stackLabel}`;
  }, [config, session.effectiveModel, session.llmProviderFromSocket]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [explorerContextDir, setExplorerContextDir] = useState("");
  const [treeExpand, setTreeExpand] = useState<{
    rev: number;
    paths: string[];
  }>({ rev: 0, paths: [] });
  const [autoSave, setAutoSave] = useState(readAutoSaveInitial);
  const [recentTick, setRecentTick] = useState(0);
  const workspaceFileInputRef = useRef<HTMLInputElement>(null);
  const recentFolders = useMemo(
    () => readRecentWorkspaceFolders(),
    [recentTick],
  );
  const [workspaceGrid, setWorkspaceGrid] = useState(() =>
    readWorkspaceGridState(),
  );
  const [wsFocusedCell, setWsFocusedCell] = useState(0);
  const [wsMaximizedCell, setWsMaximizedCell] = useState<number | null>(null);

  useEffect(() => {
    if (wsMaximizedCell == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setWsMaximizedCell(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [wsMaximizedCell]);
  const [techWsSnapshot, setTechWsSnapshot] =
    useState<TechnicalWorkspaceCellSnapshot | null>(null);
  const [multiCellAnyDirty, setMultiCellAnyDirty] = useState(false);
  const multiCellSaveApiRef = useRef<{
    saveAllDirty: () => Promise<boolean>;
  } | null>(null);
  const [workspaceOpenSignal, setWorkspaceOpenSignal] = useState<{
    path: string;
    rev: number;
  } | null>(null);
  const [workspaceCloseEditorSignal, setWorkspaceCloseEditorSignal] = useState<{
    rev: number;
    cellIndex: number;
  } | null>(null);
  const [line, setLine] = useState(1);
  const [col, setCol] = useState(1);
  const techWsSnapshotRef = useRef<TechnicalWorkspaceCellSnapshot | null>(null);
  useLayoutEffect(() => {
    techWsSnapshotRef.current = techWsSnapshot;
  }, [techWsSnapshot]);
  /** Multi-cell editor grid exists only in Technical mode — Claw is `uiMode !== "simple"` too and must not reuse this path. */
  const isWsMulti =
    uiMode === "technical" &&
    (workspaceGrid.cols > 1 || workspaceGrid.rows > 1);
  const panelDock =
    workspaceGrid.cells[wsFocusedCell] ??
    workspaceGrid.cells[0] ??
    cloneLayout(PANEL_DOCK_DEFAULTS);
  const patchWorkspaceCellDock = useCallback(
    (cellIndex: number, update: SetStateAction<PanelDockLayout>) => {
      setWorkspaceGrid((g) => {
        const cells = [...g.cells];
        const cur = cells[cellIndex] ?? cloneLayout(PANEL_DOCK_DEFAULTS);
        const nextDock =
          typeof update === "function"
            ? (update as (p: PanelDockLayout) => PanelDockLayout)(cur)
            : update;
        if (nextDock === cur) return g;
        cells[cellIndex] = nextDock;
        const out = { ...g, cells };
        writeWorkspaceGridState(out);
        return out;
      });
    },
    [],
  );

  /** Single `setWorkspaceGrid` so remove-from + add-to cannot race when React batches updates. */
  const movePanelTabBetweenCells = useCallback(
    (from: number, to: number, tab: PanelTab, before: PanelTab | null) => {
      if (from === to) return;
      setWorkspaceGrid((g) => {
        const out = applyMovePanelTabBetweenCellsInGrid(
          g,
          from,
          to,
          tab,
          before,
        );
        if (out === g) return g;
        writeWorkspaceGridState(out);
        return out;
      });
      setWsFocusedCell(to);
    },
    [],
  );

  const onWorkspaceGridRowResize = useCallback(
    (rowEdge: number, dy: number) => {
      setWorkspaceGrid((g) => {
        const next = applyWorkspaceGridRowResizeDelta(g, rowEdge, dy);
        if (next === g) return g;
        writeWorkspaceGridState(next);
        return next;
      });
    },
    [],
  );

  const onWorkspaceGridColResize = useCallback(
    (colEdge: number, dx: number) => {
      setWorkspaceGrid((g) => {
        const next = applyWorkspaceGridColResizeDelta(g, colEdge, dx);
        if (next === g) return g;
        writeWorkspaceGridState(next);
        return next;
      });
    },
    [],
  );

  const setPanelDock = useCallback(
    (update: SetStateAction<PanelDockLayout>) => {
      const multi = workspaceGrid.cols * workspaceGrid.rows > 1;
      patchWorkspaceCellDock(multi ? wsFocusedCell : 0, update);
    },
    [
      workspaceGrid.cols,
      workspaceGrid.rows,
      wsFocusedCell,
      patchWorkspaceCellDock,
    ],
  );
  const onOpenToolPanelForCell = useCallback(
    (cellIndex: number, tab: BottomPanelTab) => {
      patchWorkspaceCellDock(cellIndex, (prev) =>
        applyShowToolTab(prev, tab as ToolTabId),
      );
    },
    [patchWorkspaceCellDock],
  );

  useEffect(() => {
    if (workspaceGrid.cols * workspaceGrid.rows <= 1) setWsMaximizedCell(null);
  }, [workspaceGrid.cols, workspaceGrid.rows]);

  useEffect(() => {
    const n = workspaceGrid.cols * workspaceGrid.rows;
    if (
      wsMaximizedCell != null &&
      (wsMaximizedCell < 0 || wsMaximizedCell >= n)
    ) {
      setWsMaximizedCell(null);
    }
  }, [workspaceGrid.cols, workspaceGrid.rows, wsMaximizedCell]);

  const splitEditorRight = useCallback(() => {
    setWorkspaceGrid((g) => {
      if (g.cols >= WORKSPACE_GRID_MAX_COLS) return g;
      const oldCols = g.cols;
      const next = resizeWorkspaceGrid(g, oldCols + 1, g.rows);
      writeWorkspaceGridState(next);
      const fc = wsFocusedCell;
      const row = Math.floor(fc / oldCols);
      const newFocus = Math.min(
        row * next.cols + oldCols,
        next.cols * next.rows - 1,
      );
      queueMicrotask(() => setWsFocusedCell(newFocus));
      return next;
    });
  }, [wsFocusedCell]);

  const onWorkspaceSurfaceDrop = useCallback(
    (e: DragEvent, surfaceCellIndex: number, zone: WopDropZone) => {
      const dt = e.dataTransfer;
      const rawPaneCell = dt.getData(WOP_WORKSPACE_PANE_DND_TYPE);
      const paneSrc = parseWorkspacePaneCellIndex(rawPaneCell);
      const rawTab = dt.getData(PANEL_TAB_DND_TYPE);
      const rawPath = dt.getData(WOP_FILE_PATH_DND_TYPE);
      const rawSrc = dt.getData(WOP_DND_SOURCE_CELL_TYPE);
      const tab = parsePanelTabJson(rawTab);
      const path =
        rawPath.length > 0
          ? parseFilePathDragJson(rawPath)
          : parseFilePathDragJson(dt.getData("text/plain"));
      const srcParsed = parseInt(rawSrc, 10);
      const sourceCell = Number.isFinite(srcParsed) ? srcParsed : undefined;

      setWorkspaceGrid((g) => {
        const { grid: g1, targetCell: t0 } = growWorkspaceGridForEdgeDrop(
          g,
          surfaceCellIndex,
          zone,
        );
        const n = g1.cols * g1.rows;
        const t = Math.max(0, Math.min(t0, n - 1));

        const paneSrcRem =
          paneSrc != null
            ? remapWorkspaceCellIndexAfterEdgeGrow(
                g,
                g1,
                zone,
                surfaceCellIndex,
                paneSrc,
              )
            : null;
        const srcRem =
          sourceCell !== undefined
            ? remapWorkspaceCellIndexAfterEdgeGrow(
                g,
                g1,
                zone,
                surfaceCellIndex,
                sourceCell,
              )
            : undefined;

        if (
          paneSrcRem != null &&
          paneSrcRem >= 0 &&
          paneSrcRem < n &&
          paneSrcRem !== t
        ) {
          const cells = [...g1.cells];
          const a = cells[paneSrcRem]!;
          const b = cells[t]!;
          cells[paneSrcRem] = b;
          cells[t] = a;
          const out = { ...g1, cells };
          writeWorkspaceGridState(out);
          queueMicrotask(() => setWsFocusedCell(t));
          return out;
        }

        if (path) {
          const cells = [...g1.cells];
          const cur = cells[t] ?? cloneLayout(PANEL_DOCK_DEFAULTS);
          cells[t] = applyAddFileTab(cur, path);
          const out = { ...g1, cells };
          writeWorkspaceGridState(out);
          queueMicrotask(() => setWsFocusedCell(t));
          return out;
        }

        if (tab) {
          const src = srcRem !== undefined ? srcRem : t;
          if (src !== t) {
            const out = applyMovePanelTabBetweenCellsInGrid(
              g1,
              src,
              t,
              tab,
              null,
            );
            if (out === g1 && g1 === g) return g;
            writeWorkspaceGridState(out);
            queueMicrotask(() => setWsFocusedCell(t));
            return out;
          }
          const cells = [...g1.cells];
          const dock = cells[t] ?? cloneLayout(PANEL_DOCK_DEFAULTS);
          const nextDock = applyPanelTabMove(dock, tab, null);
          if (nextDock === dock) {
            if (g1 !== g) {
              writeWorkspaceGridState(g1);
              queueMicrotask(() => setWsFocusedCell(t));
            }
            return g1 !== g ? g1 : g;
          }
          cells[t] = nextDock;
          const out = { ...g1, cells };
          writeWorkspaceGridState(out);
          queueMicrotask(() => setWsFocusedCell(t));
          return out;
        }

        return g;
      });
    },
    [],
  );

  const onToggleWorkspaceMaximizeCell = useCallback((cellIndex: number) => {
    setWsMaximizedCell((m) => (m === cellIndex ? null : cellIndex));
  }, []);

  const removeWorkspaceCellFromGrid = useCallback((cellIndex: number) => {
    setWorkspaceGrid((g) => {
      const next = removeWorkspaceCellAt(g, cellIndex);
      if (next === g) return g;
      writeWorkspaceGridState(next);
      queueMicrotask(() => {
        setWsFocusedCell((fc) => nextFocusAfterRemove(g, next, cellIndex, fc));
        setWsMaximizedCell((m) => {
          if (m == null) return m;
          return mapCellIndexAfterRemoval(g, cellIndex, m);
        });
      });
      return next;
    });
  }, []);

  const onTechFocusedReport = useCallback(
    (s: TechnicalWorkspaceCellSnapshot) => {
      setTechWsSnapshot(s);
      setSelectedPath(s.selectedPath);
      if (s.selectedPath) setExplorerContextDir(posixDirname(s.selectedPath));
    },
    [],
  );
  const onTechFocusedCursor = useCallback((l: number, c: number) => {
    setLine(l);
    setCol(c);
  }, []);
  const {
    content,
    setContent,
    lastPersistedContent: _lastPersistedContent,
    persistEncoding,
    mimeType: fileMimeType,
    loading: fileLoading,
    error: fileError,
    dirty,
    save,
    reload,
    discardUnsavedChanges,
  } = useFileEditor(isWsMulti ? null : selectedPath, {
    autoSave,
    /** e.g. GET `.claw/workspace/X` serves legacy `.claw/X` — keep editor path in sync */
    onDiskPathMismatch: (p) => setSelectedPath(p),
  });

  const workspaceCenterFilePreview = useMemo(() => {
    if (fileLoading) return null;
    return computeWorkspaceFilePreview(
      selectedPath,
      persistEncoding,
      fileMimeType,
      content,
    );
  }, [fileLoading, selectedPath, persistEncoding, fileMimeType, content]);
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

  const onBindMultiCellSaveApi = useCallback(
    (api: { saveAllDirty: () => Promise<boolean> } | null) => {
      multiCellSaveApiRef.current = api;
    },
    [],
  );

  const onMultiCellAnyDirtyChange = useCallback((v: boolean) => {
    setMultiCellAnyDirty(v);
  }, []);
  const effSelectedPath = isWsMulti
    ? (techWsSnapshot?.selectedPath ?? null)
    : selectedPath;
  const effDirty = isWsMulti ? !!techWsSnapshot?.dirty : dirty;
  const effFileLoading = isWsMulti ? !!techWsSnapshot?.loading : fileLoading;
  const effFileError = isWsMulti ? (techWsSnapshot?.error ?? null) : fileError;
  const {
    breakpointsByPath,
    setBreakpointsByPath,
    allBreakpointsDisabled,
    setAllBreakpointsDisabled,
    debugSessionActive,
    debugReplSession,
    beginDebugSession,
    endDebugSession,
  } = useRunMenuDebugState();
  const workspaceEditorRef = useRef<WorkspaceEditorRef | null>(null);
  const [editorMenuTick, setEditorMenuTick] = useState(0);
  const bumpEditorMenu = useCallback(() => setEditorMenuTick((t) => t + 1), []);
  const [selectionMenuTick, setSelectionMenuTick] = useState(0);
  const bumpSelectionPrefs = useCallback(
    () => setSelectionMenuTick((t) => t + 1),
    [],
  );

  const [activity, setActivity] = useState<TechnicalActivity>("explorer");
  const [simpleTab, setSimpleTab] = useState<SimpleTabId>("chat");
  const [clawTab, setClawTab] = useState<ClawTabId>("mission");
  /** Workspace editor is mounted on Claw Chat (with file) and Files — not Mission / Schedule / … */
  const clawWorkspaceEditorSurface = useMemo(
    () => uiMode === "claw" && (clawTab === "chat" || clawTab === "files"),
    [uiMode, clawTab],
  );
  const [simpleProviderPath, setSimpleProviderPath] =
    useState<PiModelConfigPath | null>(null);
  const [simpleProviderNonce, setSimpleProviderNonce] = useState(0);
  /** Simple: increment so `SimpleApp` opens the editor overlay (mobile shell or narrow viewport) when the path came from global menu / palette. */
  const [simpleMobileMenuFileFocusRev, setSimpleMobileMenuFileFocusRev] =
    useState(0);
  const bumpSimpleMobileMenuFileFocus = useCallback(() => {
    setSimpleMobileMenuFileFocusRev((r) => r + 1);
  }, []);
  const [clawMenuFileFocusRev, setClawMenuFileFocusRev] = useState(0);
  const bumpClawMenuFileFocus = useCallback(() => {
    setClawMenuFileFocusRev((r) => r + 1);
  }, []);
  /** After `setSelectedPath` for a workspace file in Claw: Chat + `.claw/` sheet bump on mobile/narrow, else Files tab. */
  const focusClawTabAfterWorkspaceFileSelect = useCallback(() => {
    if (shouldBumpClawMenuFileFocus) {
      setClawTab("chat");
      bumpClawMenuFileFocus();
    } else {
      setClawTab("files");
    }
  }, [shouldBumpClawMenuFileFocus, bumpClawMenuFileFocus, setClawTab]);
  const [chrome, setChrome] = useState(() => readChromePreferences());
  const [zenMode, setZenMode] = useState(false);
  const zenBackupRef = useRef<{
    leftSidebarVisible: boolean;
    agentPanelVisible: boolean;
    chatDock: ChatDockRegion;
    chrome: ChromePreferences;
  } | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [leftSidebarVisible, setLeftSidebarVisible] = useState(
    readLeftSidebarVisibleInitial,
  );
  const [dockLayout, setDockLayoutState] =
    useState<TechnicalDockLayout>(readDockLayout);

  const updateDockLayout = useCallback(
    (
      patch:
        | Partial<TechnicalDockLayout>
        | ((d: TechnicalDockLayout) => TechnicalDockLayout),
    ) => {
      setDockLayoutState((prev) => {
        const next =
          typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
        const chatSizePx =
          next.chatDock === "right"
            ? clampChatWidth(next.chatSizePx)
            : clampChatHeight(next.chatSizePx);
        const prevH = prev.horizontalToolDockHeightsPx;
        const nextH = next.horizontalToolDockHeightsPx ?? prevH;
        const fixed: TechnicalDockLayout = {
          ...next,
          chatSizePx,
          leftSidebarWidthPx: clampLeftSidebarWidth(
            next.leftSidebarWidthPx ?? DOCK_DEFAULTS.leftSidebarWidthPx,
          ),
          horizontalToolDockHeightsPx: {
            top: clampTopPanelHeight(
              nextH.top ??
                prevH.top ??
                DOCK_DEFAULTS.horizontalToolDockHeightsPx.top,
            ),
            bottom: clampBottomPanelHeight(
              nextH.bottom ??
                prevH.bottom ??
                DOCK_DEFAULTS.horizontalToolDockHeightsPx.bottom,
            ),
          },
        };
        writeDockLayout(fixed);
        return fixed;
      });
    },
    [],
  );

  const flipDockLayout = useCallback(() => {
    updateDockLayout((d) => {
      const next = d.chatDock === "right" ? "bottom" : "right";
      return {
        ...d,
        chatDock: next,
        chatSizePx: chatSizePxWhenSwitchingDock(d.chatDock, next, d.chatSizePx),
      };
    });
  }, [updateDockLayout]);

  const focusToolTab = useCallback((t: BottomPanelTab) => {
    setPanelDock((prev) => {
      const next = toolTabVisible(prev, t as ToolTabId)
        ? applyFocusToolTab(prev, t as ToolTabId)
        : applyShowToolTab(prev, t as ToolTabId);
      return next;
    });
  }, []);

  const staticAnalysisEnabled =
    uiMode === "technical" && !!(folders[0]?.path ?? root);
  const workspaceStaticAnalysis = useWorkspaceStaticAnalysis(
    staticAnalysisEnabled,
  );

  const openProblemLocation = useCallback(
    (relPath: string, line: number, column: number) => {
      const path = relPath.replace(/^[/\\]+/, "");
      if (!path) return;
      setExplorerContextDir(posixDirname(path));
      if (
        uiMode === "technical" &&
        (workspaceGrid.cols > 1 || workspaceGrid.rows > 1)
      ) {
        setWorkspaceOpenSignal((s) => ({ path, rev: (s?.rev ?? 0) + 1 }));
      } else {
        setSelectedPath(path);
        if (uiMode === "technical") {
          setPanelDock((prev) => applyAddFileTab(prev, path));
        }
      }
      queueMicrotask(() => {
        workspaceEditorRef.current?.goToLineColumn(
          Math.max(1, line),
          Math.max(1, column),
        );
      });
    },
    [uiMode, workspaceGrid.cols, workspaceGrid.rows],
  );

  const workspaceStaticAnalysisApi = useMemo(
    () => ({
      problems: workspaceStaticAnalysis.snapshot.problems,
      loading: workspaceStaticAnalysis.loading,
      runAnalysis: workspaceStaticAnalysis.runAnalysis,
      scheduleDebouncedRefresh:
        workspaceStaticAnalysis.scheduleDebouncedRefresh,
      engine: workspaceStaticAnalysis.snapshot.engine,
      log: workspaceStaticAnalysis.snapshot.log,
      ranAt: workspaceStaticAnalysis.snapshot.ranAt,
      ok: workspaceStaticAnalysis.snapshot.ok,
      error: workspaceStaticAnalysis.snapshot.error,
      openProblem: openProblemLocation,
      refreshProblemsCache: workspaceStaticAnalysis.loadCached,
    }),
    [
      workspaceStaticAnalysis.loading,
      workspaceStaticAnalysis.runAnalysis,
      workspaceStaticAnalysis.scheduleDebouncedRefresh,
      workspaceStaticAnalysis.loadCached,
      workspaceStaticAnalysis.snapshot.problems,
      workspaceStaticAnalysis.snapshot.engine,
      workspaceStaticAnalysis.snapshot.log,
      workspaceStaticAnalysis.snapshot.ranAt,
      workspaceStaticAnalysis.snapshot.ok,
      workspaceStaticAnalysis.snapshot.error,
      openProblemLocation,
    ],
  );

  const prevEffDirtyForProblems = useRef(effDirty);
  useEffect(() => {
    if (!staticAnalysisEnabled) return;
    if (prevEffDirtyForProblems.current && !effDirty && effSelectedPath) {
      workspaceStaticAnalysis.scheduleDebouncedRefresh();
    }
    prevEffDirtyForProblems.current = effDirty;
  }, [
    effDirty,
    effSelectedPath,
    staticAnalysisEnabled,
    workspaceStaticAnalysis.scheduleDebouncedRefresh,
  ]);

  const onOpenToolPanel = useCallback((tab: BottomPanelTab) => {
    setPanelDock((prev) => applyShowToolTab(prev, tab as ToolTabId));
  }, []);

  useEffect(() => {
    writeChromePreferences(chrome);
  }, [chrome]);

  const persistLeftSidebar = useCallback((visible: boolean) => {
    setLeftSidebarVisible(visible);
    writeLeftSidebarVisible(visible);
  }, []);

  const toggleLeftSidebar = useCallback(() => {
    setLeftSidebarVisible((v) => {
      const next = !v;
      writeLeftSidebarVisible(next);
      return next;
    });
  }, []);

  const selectActivityWithSidebar = useCallback(
    (a: TechnicalActivity) => {
      persistLeftSidebar(true);
      setActivity(a);
    },
    [persistLeftSidebar],
  );

  const openPiModelConfigInEditor = useCallback(
    (path: PiModelConfigPath) => {
      if (
        uiMode === "technical" &&
        (workspaceGrid.cols > 1 || workspaceGrid.rows > 1)
      ) {
        setWorkspaceOpenSignal((s) => ({ path, rev: (s?.rev ?? 0) + 1 }));
      } else {
        setSelectedPath(path);
      }
      setExplorerContextDir(posixDirname(path));
      if (uiMode === "technical") {
        setActivity("explorer");
        persistLeftSidebar(true);
      } else if (uiMode === "claw") {
        focusClawTabAfterWorkspaceFileSelect();
      } else if (uiMode === "simple") {
        setSimpleTab("chat");
        if (shouldBumpSimpleMenuFileFocus) bumpSimpleMobileMenuFileFocus();
      }
    },
    [
      persistLeftSidebar,
      uiMode,
      workspaceGrid.cols,
      workspaceGrid.rows,
      shouldBumpSimpleMenuFileFocus,
      bumpSimpleMobileMenuFileFocus,
      focusClawTabAfterWorkspaceFileSelect,
    ],
  );

  const openPiModelConfigInSimpleBrains = useCallback(
    (path: PiModelConfigPath) => {
      if (uiMode === "claw") {
        openPiModelConfigInEditor(path);
        return;
      }
      setSimpleTab("models");
      setSimpleProviderPath(path);
      setSimpleProviderNonce((n) => n + 1);
    },
    [uiMode, openPiModelConfigInEditor],
  );

  const dismissLlmFixModal = useCallback(
    () => setLlmFixModalDismissed(true),
    [],
  );
  const reopenLlmFixModal = useCallback(
    () => setLlmFixModalDismissed(false),
    [],
  );

  const openLlmFixSimpleBrains = useCallback(() => {
    dismissLlmFixModal();
    queueMicrotask(() => {
      if (uiMode === "claw") {
        setClawTab("settings");
        return;
      }
      if (uiMode === "technical") {
        setUiMode("simple");
      }
      setSimpleTab("models");
    });
  }, [dismissLlmFixModal, uiMode, setUiMode, setClawTab]);

  const openLlmFixProviderCatalog = useCallback(() => {
    dismissLlmFixModal();
    queueMicrotask(() => {
      openPiModelConfigInEditor("agent/models.json");
    });
  }, [dismissLlmFixModal, openPiModelConfigInEditor]);

  /** Menu Settings → My Team (Pi `.pi/agents/*.md`, `teams.yaml`); Technical switches to Simple for that UI; Claw uses Team tab. */
  const openAgentSetupFromMenu = useCallback(() => {
    if (uiMode === "claw") {
      setClawTab("team");
      return;
    }
    setUiMode("simple");
    setSimpleTab("team");
  }, [uiMode, setUiMode, setClawTab, setSimpleTab]);

  /** Open a workspace-relative file from the menu (Technical: explorer / grid; Simple: editor + chat layout). */
  const focusWorkspaceFileFromMenu = useCallback(
    (rel: string) => {
      setExplorerContextDir(posixDirname(rel));
      if (uiMode === "simple") {
        setSelectedPath(rel);
        setSimpleTab("chat");
        if (shouldBumpSimpleMenuFileFocus) bumpSimpleMobileMenuFileFocus();
      } else if (uiMode === "claw") {
        setSelectedPath(rel);
        focusClawTabAfterWorkspaceFileSelect();
      } else {
        if (workspaceGrid.cols > 1 || workspaceGrid.rows > 1) {
          setWorkspaceOpenSignal((s) => ({
            path: rel,
            rev: (s?.rev ?? 0) + 1,
          }));
        } else {
          setSelectedPath(rel);
        }
        setActivity("explorer");
        persistLeftSidebar(true);
      }
    },
    [
      uiMode,
      workspaceGrid.cols,
      workspaceGrid.rows,
      persistLeftSidebar,
      shouldBumpSimpleMenuFileFocus,
      bumpSimpleMobileMenuFileFocus,
      focusClawTabAfterWorkspaceFileSelect,
    ],
  );
  focusAgentWrittenWorkspaceFileRef.current = focusWorkspaceFileFromMenu;

  const openTeamsYamlFromMenu = useCallback(() => {
    const rel = agentsApi.data?.teamsPath ?? ".pi/agents/teams.yaml";
    focusWorkspaceFileFromMenu(rel);
  }, [agentsApi.data?.teamsPath, focusWorkspaceFileFromMenu]);

  const createNewAgentMarkdownFromMenu = useCallback(() => {
    const teamsPath = agentsApi.data?.teamsPath;
    const baseDir = teamsPath ? posixDirname(teamsPath) : ".pi/agents";
    const raw = window.prompt(
      "New agent id (filename and YAML name; letters, numbers, -, _, .)",
      "my-agent",
    );
    if (raw == null) return;
    const trimmed = raw.trim().replace(/\.md$/i, "");
    if (!trimmed || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(trimmed)) {
      window.alert(
        "Use a non-empty id: letters, digits, hyphen, underscore, or dot (no slashes).",
      );
      return;
    }
    const rel = `${baseDir}/${trimmed}.md`;
    const content = `---
name: ${trimmed}
description:
---

`;
    void (async () => {
      try {
        await apiPutJson<{ ok: boolean }>("/api/file", { path: rel, content });
        setTreeExpand({ rev: Date.now(), paths: ancestorDirPaths(rel) });
        await refresh();
        focusWorkspaceFileFromMenu(rel);
        agentsApi.reload();
      } catch (e) {
        window.alert(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [
    agentsApi.data?.teamsPath,
    agentsApi.reload,
    focusWorkspaceFileFromMenu,
    refresh,
  ]);

  const settingsMenuHandlers = useMemo<SettingsMenuHandlers>(
    () => ({
      onOpenSimpleAppSettings: () => {
        if (uiMode === "claw") {
          setClawTab("settings");
          return;
        }
        setUiMode("simple");
        setSimpleTab("settings");
      },
      onOpenAiBrains: () => {
        if (uiMode === "claw") {
          setClawTab("settings");
          return;
        }
        setUiMode("simple");
        setSimpleTab("models");
      },
      onOpenProjects: () => {
        if (uiMode === "claw") {
          setClawTab("files");
          return;
        }
        setUiMode("simple");
        setSimpleTab("projects");
      },
      onOpenIndexingDocs: () => {
        setIndexingDocsOpen(true);
      },
      onOpenHonchoSettings: () => {
        setHonchoSettingsOpen(true);
      },
      onOpenNgrokSettings: () => {
        setNgrokSettingsOpen(true);
      },
      onEditWorkspaceViewsCatalog: () => {
        const rel =
          uiViewsCatalog.data?.catalogRelPath ?? ".wayofpi/ui-views.json";
        if (uiMode === "claw") {
          focusWorkspaceFileFromMenu(rel);
          return;
        }
        setUiMode("simple");
        setSelectedPath(rel);
        setSimpleTab("chat");
        if (shouldBumpSimpleMenuFileFocus) bumpSimpleMobileMenuFileFocus();
      },
      onRestartServer: () => {
        setRestartServerModalOpen(true);
      },
    }),
    [
      uiMode,
      uiViewsCatalog.data?.catalogRelPath,
      focusWorkspaceFileFromMenu,
      shouldBumpSimpleMenuFileFocus,
      bumpSimpleMobileMenuFileFocus,
      setSelectedPath,
      setSimpleTab,
      setUiMode,
      setClawTab,
    ],
  );

  const consumeSimpleProviderFocus = useCallback(() => {
    setSimpleProviderPath(null);
  }, []);

  const onCursor = useCallback((l: number, c: number) => {
    setLine(l);
    setCol(c);
  }, []);

  const rootLabel = useMemo(() => {
    if (folders.length > 1) return `Multi-root (${folders.length})`;
    const p = folders[0]?.path ?? root;
    if (!p) return "";
    const parts = p.split(/[/\\]/);
    return parts[parts.length - 1] || p;
  }, [folders, root]);

  const bumpRecent = useCallback(() => setRecentTick((t) => t + 1), []);

  useEffect(() => {
    if (selectedPath) setExplorerContextDir(posixDirname(selectedPath));
  }, [selectedPath]);

  function sanitizeNewEntryName(raw: string): string | null {
    const t = raw.trim().replace(/\\/g, "/").replace(/^\/+/, "");
    if (!t || t === "." || t.includes("..")) return null;
    return t;
  }

  const handleNewFile = useCallback(async () => {
    const name = window.prompt(
      "New file name (under the selected folder)",
      "untitled.txt",
    );
    if (name == null) return;
    const safe = sanitizeNewEntryName(name);
    if (!safe) {
      window.alert(
        "Invalid name: no .. or empty segments; avoid leading slashes.",
      );
      return;
    }
    const rel = explorerContextDir ? `${explorerContextDir}/${safe}` : safe;
    try {
      await apiPostJson<{ ok: boolean }>("/api/fs/entry", {
        path: rel,
        kind: "file",
      });
      setTreeExpand({ rev: Date.now(), paths: ancestorDirPaths(rel) });
      await refresh();
      setSelectedPath(rel);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    }
  }, [explorerContextDir, refresh]);

  const handleNewFolder = useCallback(async () => {
    const name = window.prompt(
      "New folder name (under the selected folder)",
      "new-folder",
    );
    if (name == null) return;
    const safe = sanitizeNewEntryName(name);
    if (!safe) {
      window.alert(
        "Invalid name: no .. or empty segments; avoid leading slashes.",
      );
      return;
    }
    const rel = explorerContextDir ? `${explorerContextDir}/${safe}` : safe;
    try {
      await apiPostJson<{ ok: boolean }>("/api/fs/entry", {
        path: rel,
        kind: "dir",
      });
      setTreeExpand({
        rev: Date.now(),
        paths: [...ancestorDirPaths(rel), rel],
      });
      await refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    }
  }, [explorerContextDir, refresh]);

  const handleExplorerMoveFile = useCallback(
    async (from: string, toDir: string) => {
      const destPreview = toDir
        ? `${toDir}/${posixBasename(from)}`
        : posixBasename(from);
      if (destPreview.replace(/\/+$/, "") === from.replace(/\/+$/, "")) return;
      if (effDirty && effSelectedPath === from) {
        window.alert("Save or revert the open file before moving it.");
        return;
      }
      try {
        const r = await apiPostJson<{ ok: boolean; to: string }>(
          "/api/fs/move",
          { from, toDir },
        );
        const toPath = r.to;
        setTreeExpand({ rev: Date.now(), paths: ancestorDirPaths(toPath) });
        setWorkspaceGrid((g) => {
          const cells = g.cells.map((dock) =>
            remapFileTabPath(dock, from, toPath),
          );
          const out = { ...g, cells };
          writeWorkspaceGridState(out);
          return out;
        });
        if (selectedPath === from) setSelectedPath(toPath);
        await refresh();
      } catch (e) {
        window.alert(e instanceof Error ? e.message : String(e));
      }
    },
    [effDirty, effSelectedPath, selectedPath, refresh],
  );

  const handleExplorerCopyPath = useCallback((path: string) => {
    void navigator.clipboard.writeText(path).catch(() => {
      window.alert("Could not copy to the clipboard.");
    });
  }, []);

  const handleExplorerRenameNode = useCallback(
    async (path: string, kind: "file" | "dir", currentName: string) => {
      const next = window.prompt(`Rename ${kind}`, currentName);
      if (next == null) return;
      const safe = sanitizeNewEntryName(next);
      if (!safe) {
        window.alert("Invalid name: no .. or empty segments; avoid slashes.");
        return;
      }
      if (safe === currentName) return;
      if (
        effDirty &&
        effSelectedPath &&
        (effSelectedPath === path ||
          (kind === "dir" && effSelectedPath.startsWith(`${path}/`)))
      ) {
        window.alert("Save or revert open file(s) before renaming.");
        return;
      }
      try {
        const r = await apiPostJson<{ ok: boolean; to: string }>(
          "/api/fs/rename",
          { from: path, newName: safe },
        );
        const toPath = r.to;
        setTreeExpand({ rev: Date.now(), paths: ancestorDirPaths(toPath) });
        setWorkspaceGrid((g) => {
          const cells = g.cells.map((dock) =>
            kind === "dir"
              ? remapPathPrefixInDock(dock, path, toPath)
              : remapFileTabPath(dock, path, toPath),
          );
          const out = { ...g, cells };
          writeWorkspaceGridState(out);
          return out;
        });
        setSelectedPath((p) => {
          if (!p) return p;
          if (kind === "file") return p === path ? toPath : p;
          if (p === path) return toPath;
          if (p.startsWith(`${path}/`))
            return `${toPath}/${p.slice(path.length + 1)}`;
          return p;
        });
        await refresh();
      } catch (e) {
        window.alert(e instanceof Error ? e.message : String(e));
      }
    },
    [effDirty, effSelectedPath, refresh],
  );

  const handleExplorerDeleteNode = useCallback(
    async (path: string, kind: "file" | "dir") => {
      const label =
        kind === "dir"
          ? `folder “${posixBasename(path)}” and everything inside it`
          : `“${posixBasename(path)}”`;
      if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
      if (
        effDirty &&
        effSelectedPath &&
        (effSelectedPath === path ||
          (kind === "dir" && effSelectedPath.startsWith(`${path}/`)))
      ) {
        window.alert("Save or revert open file(s) before deleting.");
        return;
      }
      try {
        await apiPostJson<{ ok: boolean }>("/api/fs/delete", { path });
        setWorkspaceGrid((g) => {
          const cells = g.cells.map((dock) =>
            removeExplorerPathsFromDock(dock, path, kind),
          );
          const out = { ...g, cells };
          writeWorkspaceGridState(out);
          return out;
        });
        setSelectedPath((p) => {
          if (!p) return p;
          if (p === path || (kind === "dir" && p.startsWith(`${path}/`)))
            return null;
          return p;
        });
        await refresh();
      } catch (e) {
        window.alert(e instanceof Error ? e.message : String(e));
      }
    },
    [effDirty, effSelectedPath, refresh],
  );

  const [newPlanFileModalOpen, setNewPlanFileModalOpen] = useState(false);

  const handleNewPlanFile = useCallback(() => {
    if (!workspaceOperational) {
      window.alert(
        "No workspace loaded — use File → Open Folder, or wait until the file tree finishes loading.",
      );
      return;
    }
    setNewPlanFileModalOpen(true);
  }, [workspaceOperational]);

  const handleNewPlanFileCreate = useCallback(
    async (title: string, slugSuggestion: string) => {
      setNewPlanFileModalOpen(false);
      try {
        const { path } = await createPlanArtifactInWorkspace({
          slugSuggestion,
          title,
        });
        setTreeExpand({ rev: Date.now(), paths: ancestorDirPaths(path) });
        await refresh();
        setSelectedPath(path);
        if (uiMode === "claw") {
          focusClawTabAfterWorkspaceFileSelect();
        } else if (uiMode === "technical") {
          persistLeftSidebar(true);
          setActivity("explorer");
        } else {
          setSimpleTab("chat");
          if (shouldBumpSimpleMenuFileFocus) bumpSimpleMobileMenuFileFocus();
        }
      } catch (e) {
        window.alert(e instanceof Error ? e.message : String(e));
      }
    },
    [
      persistLeftSidebar,
      refresh,
      setActivity,
      setSelectedPath,
      setSimpleTab,
      uiMode,
      shouldBumpSimpleMenuFileFocus,
      bumpSimpleMobileMenuFileFocus,
      focusClawTabAfterWorkspaceFileSelect,
    ],
  );

  const orchestratorPlanBootstrapLockRef = useRef(false);

  /**
   * When Plan mode is active as Orchestrator and the workspace has no `plans/PLAN-*.md` yet,
   * create `plans/PLAN-<date>-session.md` (toolbar, `/plan`, reconnect, or saved Plan preference).
   */
  const tryOrchestratorPlanArtifactBootstrap = useCallback(
    (agentName: string | null) => {
      if (agentName != null) return;
      const hasWorkspace = Boolean(root) || folders.length > 0;
      if (!hasWorkspace) return;
      if (orchestratorPlanBootstrapLockRef.current) return;
      orchestratorPlanBootstrapLockRef.current = true;
      void (async () => {
        try {
          const d = await apiGet<{ files: Array<{ path: string }> }>(
            "/api/plans",
          );
          if ((d.files?.length ?? 0) > 0) return;
          const { path } = await createPlanArtifactInWorkspace({
            slugSuggestion: "session",
            title: "Plan",
          });
          setTreeExpand({ rev: Date.now(), paths: ancestorDirPaths(path) });
          await refresh();
          setSelectedPath(path);
        } catch {
          /* user can create manually via File: New plan markdown */
        } finally {
          orchestratorPlanBootstrapLockRef.current = false;
        }
      })();
    },
    [folders.length, refresh, root],
  );

  useEffect(() => {
    if (!session.connected) return;
    if (session.chatMode !== "plan") return;
    tryOrchestratorPlanArtifactBootstrap(session.chatAgentName);
  }, [
    session.connected,
    session.chatMode,
    session.chatAgentName,
    tryOrchestratorPlanArtifactBootstrap,
  ]);

  /** Plan mode: server prompt via WebSocket; Orchestrator + empty workspace plans → seed `plans/PLAN-*.md`. */
  const handleChatModeChange = useCallback(
    (m: Parameters<typeof session.setChatMode>[0]) => {
      const agentAtClick = session.chatAgentName;
      session.setChatMode(m);
      if (m === "plan" && (uiMode === "simple" || uiMode === "claw")) {
        setSelectedPath((p) => {
          if (!p) return null;
          const norm = p.replace(/\\/g, "/");
          if (/(^|\/)plans\/plan-[^/]+\.md$/i.test(norm)) return null;
          return p;
        });
      }
      if (m !== "plan") return;
      tryOrchestratorPlanArtifactBootstrap(agentAtClick);
    },
    [
      session.chatAgentName,
      session.setChatMode,
      setSelectedPath,
      uiMode,
      tryOrchestratorPlanArtifactBootstrap,
    ],
  );

  /** Technical shell: show Planning in the primary sidebar while Plan chat mode is on; restore shell when leaving Plan. */
  const prevTechnicalChatModeRef = useRef<ChatSessionMode | null>(null);
  const latestShellForPlanRef = useRef<{
    activity: TechnicalActivity;
    leftSidebarVisible: boolean;
  }>({
    activity: "explorer",
    leftSidebarVisible: true,
  });
  const shellBeforePlanRef = useRef<{
    activity: TechnicalActivity;
    leftSidebarVisible: boolean;
  } | null>(null);
  latestShellForPlanRef.current = { activity, leftSidebarVisible };

  useEffect(() => {
    /** Plan sidebar layout is Technical-only; Claw has its own chat `surfaceId` and must not drive this ref. */
    if (uiMode !== "technical") return;
    const prev = prevTechnicalChatModeRef.current;
    const mode = session.chatMode;
    prevTechnicalChatModeRef.current = mode;

    if (mode === "plan") {
      if (prev !== "plan") {
        shellBeforePlanRef.current = { ...latestShellForPlanRef.current };
        persistLeftSidebar(true);
        setActivity("planning");
      }
      return;
    }

    if (prev === "plan") {
      const snap = shellBeforePlanRef.current;
      shellBeforePlanRef.current = null;
      if (snap) {
        setActivity(snap.activity);
        persistLeftSidebar(snap.leftSidebarVisible);
      }
    } else {
      shellBeforePlanRef.current = null;
    }
    // `latestShellForPlanRef` is updated each render; do not list `activity` / `leftSidebarVisible` here or the effect would fire on every sidebar change while in Plan.
  }, [persistLeftSidebar, session.chatMode, uiMode]);

  const openWorkspaceSearch = useCallback(() => {
    setUiMode("technical");
    persistLeftSidebar(true);
    setActivity("search");
  }, [persistLeftSidebar]);

  const navHistoryRef = useRef<{ stack: string[]; idx: number }>({
    stack: [],
    idx: -1,
  });
  const skipHistoryPushRef = useRef(false);
  const [navHistoryTick, setNavHistoryTick] = useState(0);

  useEffect(() => {
    if (skipHistoryPushRef.current) {
      skipHistoryPushRef.current = false;
      setNavHistoryTick((t) => t + 1);
      return;
    }
    if (!selectedPath) {
      setNavHistoryTick((t) => t + 1);
      return;
    }
    const h = navHistoryRef.current;
    const cur = h.stack[h.idx];
    if (cur === selectedPath) {
      setNavHistoryTick((t) => t + 1);
      return;
    }
    const nextStack = h.stack.slice(0, h.idx + 1);
    nextStack.push(selectedPath);
    navHistoryRef.current = { stack: nextStack, idx: nextStack.length - 1 };
    setNavHistoryTick((t) => t + 1);
  }, [selectedPath]);

  const goHistoryBack = useCallback(() => {
    const h = navHistoryRef.current;
    if (h.idx <= 0) return;
    h.idx -= 1;
    const p = h.stack[h.idx];
    if (!p) return;
    skipHistoryPushRef.current = true;
    setSelectedPath(p);
    setNavHistoryTick((t) => t + 1);
    if (uiMode === "simple") {
      setSimpleTab("chat");
      if (shouldBumpSimpleMenuFileFocus) bumpSimpleMobileMenuFileFocus();
    } else if (uiMode === "claw") {
      focusClawTabAfterWorkspaceFileSelect();
    }
  }, [
    uiMode,
    shouldBumpSimpleMenuFileFocus,
    bumpSimpleMobileMenuFileFocus,
    focusClawTabAfterWorkspaceFileSelect,
    setSimpleTab,
  ]);

  const goHistoryForward = useCallback(() => {
    const h = navHistoryRef.current;
    if (h.idx >= h.stack.length - 1) return;
    h.idx += 1;
    const p = h.stack[h.idx];
    if (!p) return;
    skipHistoryPushRef.current = true;
    setSelectedPath(p);
    setNavHistoryTick((t) => t + 1);
    if (uiMode === "simple") {
      setSimpleTab("chat");
      if (shouldBumpSimpleMenuFileFocus) bumpSimpleMobileMenuFileFocus();
    } else if (uiMode === "claw") {
      focusClawTabAfterWorkspaceFileSelect();
    }
  }, [
    uiMode,
    shouldBumpSimpleMenuFileFocus,
    bumpSimpleMobileMenuFileFocus,
    focusClawTabAfterWorkspaceFileSelect,
    setSimpleTab,
  ]);

  useLayoutEffect(() => {
    bumpEditorMenu();
  }, [
    effSelectedPath,
    effFileLoading,
    effFileError,
    uiMode,
    simpleTab,
    bumpEditorMenu,
    isWsMulti,
    techWsSnapshot?.panelDock?.activeIndex,
    techWsSnapshot?.panelDock?.tabs,
    panelDock.activeIndex,
    panelDock.tabs,
  ]);

  const editMenu = useMemo((): EditMenuHandlers => {
    const fileReady = !!effSelectedPath && !effFileLoading && !effFileError;
    const inSimpleFileSurface = uiMode === "simple" && simpleTab === "chat";
    const inTechnicalIdeSurface = uiMode === "technical";
    const dockForEditMenu = isWsMulti
      ? (techWsSnapshot?.panelDock ?? panelDock)
      : panelDock;
    const activeDockTab = dockForEditMenu.tabs[dockForEditMenu.activeIndex];
    const fileTabFocusedInPane = activeDockTab?.type === "file";
    const bufferMounted = Boolean(workspaceEditorRef.current);
    const canEdit =
      fileReady &&
      ((inSimpleFileSurface && bufferMounted) ||
        (clawWorkspaceEditorSurface && bufferMounted) ||
        (inTechnicalIdeSurface && fileTabFocusedInPane && bufferMounted));
    return {
      canEdit,
      onUndo: () => {
        workspaceEditorRef.current?.undo();
        bumpEditorMenu();
      },
      onRedo: () => {
        workspaceEditorRef.current?.redo();
        bumpEditorMenu();
      },
      onCut: () => workspaceEditorRef.current?.cut(),
      onCopy: () => workspaceEditorRef.current?.copy(),
      onPaste: async () => {
        await workspaceEditorRef.current?.paste();
      },
      onFind: () => workspaceEditorRef.current?.find(),
      onReplace: () => workspaceEditorRef.current?.replace(),
      onFindInFiles: () => openWorkspaceSearch(),
      onReplaceInFiles: () => openWorkspaceSearch(),
      onToggleLineComment: () =>
        workspaceEditorRef.current?.toggleLineComment(),
      onToggleBlockComment: () =>
        workspaceEditorRef.current?.toggleBlockComment(),
      onEmmetExpand: () => workspaceEditorRef.current?.emmetExpand(),
      canUndo: workspaceEditorRef.current?.canUndo() ?? false,
      canRedo: workspaceEditorRef.current?.canRedo() ?? false,
    };
  }, [
    effSelectedPath,
    effFileLoading,
    effFileError,
    simpleTab,
    uiMode,
    clawWorkspaceEditorSurface,
    isWsMulti,
    techWsSnapshot,
    panelDock,
    editorMenuTick,
    bumpEditorMenu,
    openWorkspaceSearch,
  ]);

  const selectionMenu = useMemo((): SelectionMenuHandlers => {
    const ed = workspaceEditorRef.current;
    const fileReady = !!effSelectedPath && !effFileLoading && !effFileError;
    const inSimpleFileSurface = uiMode === "simple" && simpleTab === "chat";
    const inTechnicalIdeSurface = uiMode === "technical";
    const dockForEditMenu = isWsMulti
      ? (techWsSnapshot?.panelDock ?? panelDock)
      : panelDock;
    const activeDockTab = dockForEditMenu.tabs[dockForEditMenu.activeIndex];
    const fileTabFocusedInPane = activeDockTab?.type === "file";
    const bufferMounted = Boolean(workspaceEditorRef.current);
    const canEdit =
      fileReady &&
      ((inSimpleFileSurface && bufferMounted) ||
        (clawWorkspaceEditorSurface && bufferMounted) ||
        (inTechnicalIdeSurface && fileTabFocusedInPane && bufferMounted));
    return {
      canEdit,
      ctrlClickMultiCursor: ed?.getCtrlClickMultiCursor() ?? false,
      columnSelectionMode: ed?.getColumnSelectionMode() ?? false,
      onSelectAll: () => workspaceEditorRef.current?.selectAll(),
      onExpandSelection: () => workspaceEditorRef.current?.expandSelection(),
      onShrinkSelection: () => workspaceEditorRef.current?.shrinkSelection(),
      onCopyLineUp: () => workspaceEditorRef.current?.copyLineUp(),
      onCopyLineDown: () => workspaceEditorRef.current?.copyLineDown(),
      onMoveLineUp: () => workspaceEditorRef.current?.moveLineUp(),
      onMoveLineDown: () => workspaceEditorRef.current?.moveLineDown(),
      onDuplicateSelection: () =>
        workspaceEditorRef.current?.duplicateSelection(),
      onAddNextOccurrence: () =>
        workspaceEditorRef.current?.addNextOccurrence(),
      onAddPreviousOccurrence: () =>
        workspaceEditorRef.current?.addPreviousOccurrence(),
      onSelectAllOccurrences: () =>
        workspaceEditorRef.current?.selectAllOccurrences(),
      onToggleCtrlClickMultiCursor: () => {
        const ed = workspaceEditorRef.current;
        if (!ed) return;
        ed.setCtrlClickMultiCursor(!ed.getCtrlClickMultiCursor());
        bumpSelectionPrefs();
      },
      onToggleColumnSelectionMode: () => {
        const ed = workspaceEditorRef.current;
        if (!ed) return;
        ed.setColumnSelectionMode(!ed.getColumnSelectionMode());
        bumpSelectionPrefs();
      },
    };
  }, [
    effSelectedPath,
    effFileLoading,
    effFileError,
    simpleTab,
    uiMode,
    clawWorkspaceEditorSurface,
    isWsMulti,
    techWsSnapshot,
    panelDock,
    editorMenuTick,
    selectionMenuTick,
    bumpSelectionPrefs,
  ]);

  const focusTerminalForCommands = useCallback(() => {
    setUiMode("technical");
    persistLeftSidebar(true);
    focusToolTab("terminal");
  }, [persistLeftSidebar, focusToolTab]);

  const openTasksJsonInEditor = useCallback(async () => {
    setUiMode("technical");
    persistLeftSidebar(true);
    setActivity("explorer");
    try {
      await apiGet<{ path: string; content: string }>(
        `/api/file?path=${encodeURIComponent(TASKS_JSON_REL)}`,
      );
    } catch {
      await apiPutJson<{ ok: boolean }>("/api/file", {
        path: TASKS_JSON_REL,
        content: TASKS_JSON_TEMPLATE,
      });
    }
    setExplorerContextDir(".vscode");
    setSelectedPath(TASKS_JSON_REL);
  }, [persistLeftSidebar]);

  const openLaunchJsonInEditor = useCallback(async () => {
    setUiMode("technical");
    persistLeftSidebar(true);
    setActivity("explorer");
    try {
      await apiGet<{ path: string; content: string }>(
        `/api/file?path=${encodeURIComponent(LAUNCH_JSON_REL)}`,
      );
    } catch {
      await apiPutJson<{ ok: boolean }>("/api/file", {
        path: LAUNCH_JSON_REL,
        content: LAUNCH_JSON_TEMPLATE,
      });
    }
    setExplorerContextDir(".vscode");
    setSelectedPath(LAUNCH_JSON_REL);
  }, [persistLeftSidebar]);

  const appendLaunchConfigurationSnippet = useCallback(
    async (id: LaunchSnippetId) => {
      setLaunchConfigAddOpen(false);
      setUiMode("technical");
      persistLeftSidebar(true);
      setActivity("explorer");
      let base = '{"version":"0.2.0","configurations":[]}';
      try {
        const r = await apiGet<{ path: string; content: string }>(
          `/api/file?path=${encodeURIComponent(LAUNCH_JSON_REL)}`,
        );
        base = r.content;
      } catch {
        /* missing file: start from empty configurations */
      }
      const merged = mergeSnippetIntoLaunchJson(base, id);
      await apiPutJson<{ ok: boolean }>("/api/file", {
        path: LAUNCH_JSON_REL,
        content: merged,
      });
      setExplorerContextDir(".vscode");
      setSelectedPath(LAUNCH_JSON_REL);
      void refresh();
    },
    [persistLeftSidebar, refresh],
  );

  const terminalMenu = useMemo((): TerminalMenuHandlers => {
    const termOk = config?.terminalEnabled === true;
    return {
      terminalServerEnabled: termOk,
      onNewTerminal: () => {
        focusTerminalForCommands();
      },
      onSplitTerminal: () => {
        setUiMode("technical");
        persistLeftSidebar(true);
        onOpenToolPanel("terminal");
      },
      onRunTask: () => {
        setCommandPaletteOpen(true);
      },
      onRunBuildTask: () => {
        focusTerminalForCommands();
        if (termOk) sendTerminalInput("bun run build\r");
      },
      onRunActiveFile: () => {
        focusTerminalForCommands();
        if (!termOk || !selectedPath) return;
        const line = runActiveFileShellLine(selectedPath);
        if (line) sendTerminalInput(line);
      },
      onRunSelectedText: () => {
        focusTerminalForCommands();
        if (!termOk) return;
        const t = workspaceEditorRef.current?.getSelectedText() ?? "";
        if (!t.trim()) return;
        sendTerminalInput(t.endsWith("\n") ? t : `${t}\r`);
      },
      onConfigureTasks: () => {
        void openTasksJsonInEditor();
      },
      onConfigureDefaultBuildTask: () => {
        void openTasksJsonInEditor();
      },
    };
  }, [
    config?.terminalEnabled,
    focusTerminalForCommands,
    persistLeftSidebar,
    onOpenToolPanel,
    effSelectedPath,
    openTasksJsonInEditor,
  ]);

  const runWithoutDebugging = useCallback(() => {
    endDebugSession();
    focusTerminalForCommands();
    if (config?.terminalEnabled !== true || !effSelectedPath) return;
    const shellLine = runActiveFileShellLine(effSelectedPath);
    if (shellLine) sendTerminalInput(shellLine);
  }, [
    endDebugSession,
    focusTerminalForCommands,
    config?.terminalEnabled,
    effSelectedPath,
    sendTerminalInput,
  ]);

  const startDebugging = useCallback(() => {
    focusTerminalForCommands();
    if (config?.terminalEnabled !== true || !effSelectedPath) return;
    const plan = getActiveFileDebugPlan(effSelectedPath);
    if (!plan) return;
    sendTerminalInput(plan.line);
    beginDebugSession(plan.repl);
  }, [
    focusTerminalForCommands,
    config?.terminalEnabled,
    effSelectedPath,
    sendTerminalInput,
    beginDebugSession,
  ]);

  const stopDebugging = useCallback(() => {
    focusTerminalForCommands();
    if (config?.terminalEnabled === true) sendTerminalInput("\x03");
    endDebugSession();
  }, [
    focusTerminalForCommands,
    config?.terminalEnabled,
    sendTerminalInput,
    endDebugSession,
  ]);

  const restartDebugging = useCallback(() => {
    focusTerminalForCommands();
    if (config?.terminalEnabled === true) sendTerminalInput("\x03");
    endDebugSession();
    window.setTimeout(() => {
      if (config?.terminalEnabled !== true || !effSelectedPath) return;
      const plan = getActiveFileDebugPlan(effSelectedPath);
      if (!plan) return;
      focusTerminalForCommands();
      sendTerminalInput(plan.line);
      beginDebugSession(plan.repl);
    }, 150);
  }, [
    focusTerminalForCommands,
    config?.terminalEnabled,
    effSelectedPath,
    sendTerminalInput,
    endDebugSession,
    beginDebugSession,
  ]);

  const sendReplDebugCommand = useCallback(
    (cmd: string) => {
      if (!debugReplSession || config?.terminalEnabled !== true) return;
      focusTerminalForCommands();
      sendTerminalInput(cmd.endsWith("\r") ? cmd : `${cmd}\r`);
    },
    [
      debugReplSession,
      config?.terminalEnabled,
      focusTerminalForCommands,
      sendTerminalInput,
    ],
  );

  const toggleBreakpointAtCursor = useCallback(() => {
    const fileReady = !!effSelectedPath && !effFileLoading && !effFileError;
    const canBpSurface =
      uiMode === "technical" ||
      (uiMode === "simple" && simpleTab === "chat") ||
      clawWorkspaceEditorSurface;
    if (!fileReady || !canBpSurface) return;
    setBreakpointsByPath((prev: Record<string, number[]>) => {
      const path = effSelectedPath as string;
      const cur = prev[path] ? [...prev[path]] : [];
      const idx = cur.indexOf(line);
      if (idx >= 0) cur.splice(idx, 1);
      else cur.push(line);
      cur.sort((a, b) => a - b);
      if (cur.length === 0) {
        const { [path]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [path]: cur };
    });
  }, [
    effSelectedPath,
    line,
    effFileLoading,
    effFileError,
    uiMode,
    simpleTab,
    clawWorkspaceEditorSurface,
  ]);

  const runMenu = useMemo((): RunMenuHandlers => {
    const termOk = config?.terminalEnabled === true;
    const fileReady = !!effSelectedPath && !effFileLoading && !effFileError;
    const canToggleBreakpoint =
      fileReady &&
      (uiMode === "technical" ||
        (uiMode === "simple" && simpleTab === "chat") ||
        clawWorkspaceEditorSurface);
    const hasBreakpoints = Object.values(
      breakpointsByPath as Record<string, number[]>,
    ).some((lines) => lines.length > 0);
    const canStartDebugging =
      termOk &&
      !!effSelectedPath &&
      getActiveFileDebugPlan(effSelectedPath) != null;
    return {
      debugSessionActive,
      canStartDebugging,
      debugReplSession,
      terminalServerEnabled: termOk,
      canToggleBreakpoint,
      hasBreakpoints,
      allBreakpointsDisabled,
      onStartDebugging: startDebugging,
      onRunWithoutDebugging: runWithoutDebugging,
      onStopDebugging: stopDebugging,
      onRestartDebugging: restartDebugging,
      onOpenConfigurations: () => {
        void openLaunchJsonInEditor();
      },
      onAddConfiguration: () => setLaunchConfigAddOpen(true),
      onStepOver: () => sendReplDebugCommand("n"),
      onStepInto: () => sendReplDebugCommand("s"),
      onStepOut: () => sendReplDebugCommand("return"),
      onContinue: () => sendReplDebugCommand("c"),
      onToggleBreakpoint: toggleBreakpointAtCursor,
      onNewBreakpointInline: () => setCommandPaletteOpen(true),
      onNewBreakpointConditional: () => setCommandPaletteOpen(true),
      onNewBreakpointLogpoint: () => setCommandPaletteOpen(true),
      onNewBreakpointTriggered: () => setCommandPaletteOpen(true),
      onNewBreakpointFunction: () => setCommandPaletteOpen(true),
      onEnableAllBreakpoints: () => setAllBreakpointsDisabled(false),
      onDisableAllBreakpoints: () => setAllBreakpointsDisabled(true),
      onRemoveAllBreakpoints: () => {
        setBreakpointsByPath({});
        setAllBreakpointsDisabled(false);
      },
      onInstallAdditionalDebuggers: () => setInstallDebuggersModalOpen(true),
    };
  }, [
    config?.terminalEnabled,
    effSelectedPath,
    effFileLoading,
    effFileError,
    uiMode,
    simpleTab,
    clawWorkspaceEditorSurface,
    breakpointsByPath,
    allBreakpointsDisabled,
    debugSessionActive,
    debugReplSession,
    startDebugging,
    runWithoutDebugging,
    stopDebugging,
    restartDebugging,
    sendReplDebugCommand,
    toggleBreakpointAtCursor,
    openLaunchJsonInEditor,
  ]);

  const promptGoToLine = useCallback(() => {
    const raw = window.prompt("Go to line:column", `${line}`);
    if (raw == null) return;
    const m = raw.trim().match(/^(\d+)(?::(\d+))?/);
    if (!m) return;
    const ln = parseInt(m[1], 10);
    const c = m[2] ? parseInt(m[2], 10) : 1;
    workspaceEditorRef.current?.goToLineColumn(ln, c);
  }, [line]);

  const goMenu = useMemo((): GoMenuHandlers => {
    void navHistoryTick;
    const fileReady = !!effSelectedPath && !effFileLoading && !effFileError;
    const canEditSurface =
      fileReady &&
      (uiMode === "technical" ||
        (uiMode === "simple" && simpleTab === "chat") ||
        clawWorkspaceEditorSurface);
    const h = navHistoryRef.current;
    return {
      canGoBack: h.idx > 0,
      canGoForward: h.idx < h.stack.length - 1,
      onBack: goHistoryBack,
      onForward: goHistoryForward,
      canLastEditLocation: false,
      onLastEditLocation: () => {},
      canSwitchEditorPrevious: false,
      canSwitchEditorNext: false,
      onSwitchEditorPrevious: () => {},
      onSwitchEditorNext: () => {},
      onGoToFile: () => openWorkspaceSearch(),
      onGoToSymbolInWorkspace: () => setCommandPaletteOpen(true),
      canGoToLine: canEditSurface,
      onGoToLineColumn: promptGoToLine,
      canGoToBracket: canEditSurface,
      onGoToBracket: () => workspaceEditorRef.current?.goToMatchingBracket(),
      canLanguageFeatures: false,
      onGoToSymbolInEditor: () => setCommandPaletteOpen(true),
      onGoToDefinition: () => {},
      onGoToDeclaration: () => {},
      onGoToTypeDefinition: () => {},
      onGoToImplementations: () => {},
      onGoToReferences: () => {},
      canAddSymbolToChat: false,
      onAddSymbolToCurrentChat: () => {},
      onAddSymbolToNewChat: () => {},
      canNavigateProblems: uiMode === "technical",
      onNextProblem: () => {
        setUiMode("technical");
        focusToolTab("problems");
      },
      onPreviousProblem: () => {
        setUiMode("technical");
        focusToolTab("problems");
      },
      canNavigateChanges: false,
      onNextChange: () => {},
      onPreviousChange: () => {},
    };
  }, [
    navHistoryTick,
    effSelectedPath,
    effFileLoading,
    effFileError,
    uiMode,
    simpleTab,
    clawWorkspaceEditorSurface,
    goHistoryBack,
    goHistoryForward,
    openWorkspaceSearch,
    promptGoToLine,
    focusToolTab,
  ]);

  const [hostDoctorOpen, setHostDoctorOpen] = useState(false);
  const [indexingDocsOpen, setIndexingDocsOpen] = useState(false);
  const [honchoSettingsOpen, setHonchoSettingsOpen] = useState(false);
  const [ngrokSettingsOpen, setNgrokSettingsOpen] = useState(false);
  const [agentPermissionsOpen, setAgentPermissionsOpen] = useState(false);
  const [launchConfigAddOpen, setLaunchConfigAddOpen] = useState(false);
  const [installDebuggersModalOpen, setInstallDebuggersModalOpen] =
    useState(false);
  const [mitLicenseModalOpen, setMitLicenseModalOpen] = useState(false);
  const [restartServerModalOpen, setRestartServerModalOpen] = useState(false);
  const [howToUseModalOpen, setHowToUseModalOpen] = useState(false);
  const [howToUseInitialSection, setHowToUseInitialSection] =
    useState<HowToUseSectionId | null>(null);
  const [clawHelpOpen, setClawHelpOpen] = useState(false);
  const [clawHelpDefaultSection, setClawHelpDefaultSection] =
    useState<ClawHelpSectionId | null>(null);
  /**
   * Per-shell session agent (see **`useWayOfPiSession`** `surfaceId`): Simple + Technical use orchestrator
   * (null); Claw defaults to **`claw`** once per Claw visit (including after `/api/agents` loads), without
   * overriding a deliberate orchestrator choice on Claw.
   */
  const chatAgentShellPrevRef = useRef<UiMode | null>(null);
  useEffect(() => {
    const from = chatAgentShellPrevRef.current;
    const to = uiMode;
    const hasClaw = (agentsApi.data?.agents ?? []).some(
      (a) => a.name.trim().toLowerCase() === "claw",
    );

    if (from != null && from !== to) {
      if (to === "simple" || to === "technical") {
        session.setChatAgent(null);
      } else if (to === "claw" && hasClaw && session.chatAgentName == null) {
        session.setChatAgent("claw");
      }
    }

    chatAgentShellPrevRef.current = to;
  }, [
    uiMode,
    session.chatAgentName,
    session.setChatAgent,
    agentsApi.data?.agents,
  ]);

  /** First time on Claw (or when catalog loads) pick **`claw`** if still unset; do not override null after user chose orchestrator (`ref` stays true once `claw` was active). */
  const clawAutoAgentAppliedRef = useRef(false);
  useEffect(() => {
    if (uiMode !== "claw") {
      clawAutoAgentAppliedRef.current = false;
      return;
    }
    const n = session.chatAgentName?.trim().toLowerCase() ?? null;
    if (n === "claw") {
      clawAutoAgentAppliedRef.current = true;
      return;
    }
    const hasClaw = (agentsApi.data?.agents ?? []).some(
      (a) => a.name.trim().toLowerCase() === "claw",
    );
    if (
      !hasClaw ||
      session.chatAgentName != null ||
      clawAutoAgentAppliedRef.current
    )
      return;
    session.setChatAgent("claw");
    clawAutoAgentAppliedRef.current = true;
  }, [
    uiMode,
    session.chatAgentName,
    session.setChatAgent,
    agentsApi.data?.agents,
  ]);
  const [newWorkspaceFileDraft, setNewWorkspaceFileDraft] = useState<{
    defaultPath: string;
    initialContent?: string;
  } | null>(null);
  const openHostDoctor = useCallback(() => {
    setHostDoctorOpen(true);
  }, []);

  const openShareNgrokFromSettings = useCallback(() => {
    setNgrokSettingsOpen(false);
    if (uiMode === "claw") {
      setClawHelpDefaultSection("ngrok");
      setClawHelpOpen(true);
      return;
    }
    setHowToUseInitialSection("ngrok");
    setHowToUseModalOpen(true);
  }, [uiMode]);

  const helpMenu = useMemo((): HelpMenuHandlers => {
    const repo = WOP_PUBLIC_REPO_URL;
    const shell = typeof window !== "undefined" ? window.wopShell : undefined;
    return {
      onShowAllCommands: () => setCommandPaletteOpen(true),
      onHowToUse: () => {
        if (uiMode === "claw") {
          setClawHelpDefaultSection(null);
          setClawHelpOpen(true);
        } else {
          setHowToUseInitialSection(null);
          setHowToUseModalOpen(true);
        }
      },
      onOpenHostDoctor: openHostDoctor,
      onEditorPlayground: () =>
        window.open(
          `${repo}/blob/main/docs/PLAYGROUND.md`,
          "_blank",
          "noopener,noreferrer",
        ),
      onAccessibilityFeatures: () =>
        window.open(
          "https://code.visualstudio.com/docs/editor/accessibility",
          "_blank",
          "noopener,noreferrer",
        ),
      onGiveFeedback: () => {
        // Use window.open (not openExternalUrl) so Electron’s setWindowOpenHandler opens an in-app window.
        window.open(WOP_FEEDBACK_CONTACT_URL, "_blank", "noopener,noreferrer");
      },
      onSupportUs: () => {
        window.open(WOP_SUPPORT_HOME_URL, "_blank", "noopener,noreferrer");
      },
      onViewLicense: () => setMitLicenseModalOpen(true),
      canToggleDeveloperTools: Boolean(shell?.toggleDevtools),
      onToggleDeveloperTools: () => {
        void shell?.toggleDevtools?.();
      },
      canOpenProcessExplorer: false,
      onOpenProcessExplorer: () => {},
      canDownloadUpdate: true,
      onDownloadUpdate: () =>
        window.open(`${repo}/releases`, "_blank", "noopener,noreferrer"),
    };
  }, [openHostDoctor, uiMode]);

  const saveAndRefresh = useCallback(async () => {
    let ok = true;
    if (uiMode === "technical" && workspaceGrid.cols * workspaceGrid.rows > 1) {
      const s = techWsSnapshotRef.current;
      ok = s ? await s.save() : true;
    } else {
      ok = await save();
    }
    if (ok) {
      await refresh();
      if (staticAnalysisEnabled) {
        workspaceStaticAnalysis.scheduleDebouncedRefresh();
      }
    }
  }, [
    uiMode,
    staticAnalysisEnabled,
    workspaceGrid.cols,
    workspaceGrid.rows,
    save,
    refresh,
    workspaceStaticAnalysis.scheduleDebouncedRefresh,
  ]);

  const reloadFocusedOrMain = useCallback(async () => {
    if (uiMode === "technical" && workspaceGrid.cols * workspaceGrid.rows > 1) {
      await techWsSnapshotRef.current?.reload?.();
    } else {
      await reload();
    }
  }, [uiMode, workspaceGrid.cols, workspaceGrid.rows, reload]);

  const copyWorkspacePath = useCallback(() => {
    const primary = folders[0]?.path ?? root;
    if (!primary) return;
    void navigator.clipboard.writeText(primary);
  }, [folders, root]);

  /** Native OS picker on the server host; falls back to a path prompt if unavailable. */
  const pickAbsoluteServerPath = useCallback(
    async (kind: "file" | "folder"): Promise<string | null> => {
      if (switchAllowed) {
        const r = await requestNativePick(kind);
        if ("path" in r) return r.path;
        if ("cancelled" in r) return null;
      }
      const def = kind === "folder" ? root || "" : "";
      const msg =
        kind === "folder"
          ? "Open folder (absolute path on the server machine)"
          : "Open file (absolute path on the server machine)";
      const p = window.prompt(msg, def);
      if (p == null || !p.trim()) return null;
      return p.trim();
    },
    [switchAllowed, root],
  );

  const openFolderAbs = useCallback(
    async (abs: string) => {
      const r = await postWorkspaceOp({ op: "open_folder", path: abs });
      if (r.error) {
        window.alert(r.error);
        return;
      }
      pushRecentWorkspaceFolder(abs);
      bumpRecent();
      setSelectedPath(null);
      setExplorerContextDir("");
      await refresh();
    },
    [bumpRecent, refresh],
  );

  const handleOpenFolderPrompt = useCallback(() => {
    void (async () => {
      const p = await pickAbsoluteServerPath("folder");
      if (!p) return;
      void openFolderAbs(p);
    })();
  }, [openFolderAbs, pickAbsoluteServerPath]);

  const handleOpenFilePrompt = useCallback(() => {
    void (async () => {
      const abs = await pickAbsoluteServerPath("file");
      if (!abs) return;
      const r = await postWorkspaceOp({ op: "open_file", path: abs });
      if (r.error) {
        window.alert(r.error);
        return;
      }
      const parent = abs.replace(/[/\\][^/\\]*$/, "");
      if (parent) pushRecentWorkspaceFolder(parent);
      bumpRecent();
      if (r.selectPath) {
        setExplorerContextDir(posixDirname(r.selectPath));
        if (
          uiMode === "technical" &&
          (workspaceGrid.cols > 1 || workspaceGrid.rows > 1)
        ) {
          setWorkspaceOpenSignal((s) => ({
            path: r.selectPath!,
            rev: (s?.rev ?? 0) + 1,
          }));
        } else {
          setSelectedPath(r.selectPath);
          if (uiMode === "simple") {
            setSimpleTab("chat");
            if (shouldBumpSimpleMenuFileFocus) bumpSimpleMobileMenuFileFocus();
          } else if (uiMode === "claw") {
            focusClawTabAfterWorkspaceFileSelect();
          }
        }
      }
      await refresh();
    })();
  }, [
    bumpRecent,
    bumpSimpleMobileMenuFileFocus,
    focusClawTabAfterWorkspaceFileSelect,
    pickAbsoluteServerPath,
    refresh,
    setSimpleTab,
    shouldBumpSimpleMenuFileFocus,
    uiMode,
    workspaceGrid.cols,
    workspaceGrid.rows,
  ]);

  const handleAddFolderPrompt = useCallback(() => {
    void (async () => {
      const p = await pickAbsoluteServerPath("folder");
      if (!p) return;
      const r = await postWorkspaceOp({ op: "add_folder", path: p });
      if (r.error) window.alert(r.error);
      else {
        pushRecentWorkspaceFolder(p);
        bumpRecent();
        await refresh();
      }
    })();
  }, [bumpRecent, pickAbsoluteServerPath, refresh]);

  const handleOpenRecentFolder = useCallback(
    (abs: string) => {
      void openFolderAbs(abs);
    },
    [openFolderAbs],
  );

  const handleRemoveWorkspaceFolder = useCallback(
    (label: string) => {
      void (async () => {
        const r = await postWorkspaceOp({ op: "remove_folder", label });
        if (r.error) window.alert(r.error);
        else {
          setSelectedPath(null);
          await refresh();
        }
      })();
    },
    [refresh],
  );

  const handleCloseWorkspace = useCallback(() => {
    void (async () => {
      const r = await postWorkspaceOp({ op: "close_workspace" });
      if (r.error) window.alert(r.error);
      else {
        setSelectedPath(null);
        setExplorerContextDir("");
        await refresh();
      }
    })();
  }, [refresh]);

  const handleCloseEditor = useCallback(() => {
    if (isWsMulti) {
      const s = techWsSnapshotRef.current;
      const p = s?.selectedPath;
      if (!p) return;
      if (
        s.dirty &&
        !window.confirm("Close editor? Unsaved changes will be lost.")
      )
        return;
      setWorkspaceCloseEditorSignal((sig) => ({
        rev: (sig?.rev ?? 0) + 1,
        cellIndex: wsFocusedCell,
      }));
      return;
    }
    const t = panelDock.tabs[panelDock.activeIndex];
    const pathToClose =
      t?.type === "file"
        ? t.path
        : (panelDock.tabs.find((x) => x.type === "file")?.path ?? selectedPath);
    if (!pathToClose) return;
    const closingActiveBuffer = pathToClose === selectedPath;
    if (
      closingActiveBuffer &&
      dirty &&
      !window.confirm("Close editor? Unsaved changes will be lost.")
    )
      return;
    setPanelDock((prev) => applyRemoveFileTab(prev, pathToClose));
  }, [
    isWsMulti,
    selectedPath,
    dirty,
    wsFocusedCell,
    panelDock.tabs,
    panelDock.activeIndex,
  ]);

  const closeAppWindowOrTab = useCallback(() => {
    const shell = typeof window !== "undefined" ? window.wopShell : undefined;
    if (shell?.closeWindow) {
      void shell.closeWindow();
      return;
    }
    window.close();
    window.setTimeout(() => {
      window.alert("If the tab is still open, close it from the browser.");
    }, 100);
  }, []);

  const downloadWorkspaceJson = useCallback(
    (suggestedName: string, workspaceFileParentDir: string | null) => {
      const payload = buildCodeWorkspacePayload(
        folders[0]
      );
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = suggestedName;
      a.click();
      URL.revokeObjectURL(a.href);
    },
    [folders],
  );

  const promptWorkspaceFileParentDir = useCallback((): string | null => {
    const primary = folders[0]?.path ?? "";
    const msg =
      "Parent folder of the .code-workspace file — folder paths will be relative to this (VS Code / Cursor style). OK with empty = absolute paths only.";
    return window.prompt(msg, primary);
  }, [folders]);

  const resolveSaveWorkspaceServerPath = useCallback(
    async (suggestedFileName: string): Promise<string | null> => {
      const shellApi = window.wopShell;
      if (shellApi?.saveWorkspaceFileAs) {
        const r = await shellApi.saveWorkspaceFileAs(suggestedFileName);
        if ("cancelled" in r && r.cancelled) return null;
        if ("error" in r && r.error) {
          window.alert(r.error);
          return null;
        }
        if ("path" in r && r.path) return r.path;
        return null;
      }
      const p = window.prompt(
        `Save workspace file (absolute path on the server machine; filename e.g. ${suggestedFileName})`,
        suggestedFileName,
      );
      if (p == null || !p.trim()) return null;
      return p.trim();
    },
    [],
  );

  const handleSaveWorkspaceAs = useCallback(() => {
    void (async () => {
      if (switchAllowed) {
        const target = await resolveSaveWorkspaceServerPath(
          "wayof-pi.code-workspace",
        );
        if (!target) return;
        const r = await postWorkspaceOp({
          op: "save_code_workspace_file",
          path: target,
        });
        if (r.error) window.alert(r.error);
        else await refresh();
        return;
      }
      const raw = promptWorkspaceFileParentDir();
      if (raw == null) return;
      downloadWorkspaceJson("wayof-pi.code-workspace", raw.trim() || null);
    })();
  }, [
    switchAllowed,
    resolveSaveWorkspaceServerPath,
    refresh,
    downloadWorkspaceJson,
    promptWorkspaceFileParentDir,
  ]);

  const handleDuplicateWorkspace = useCallback(() => {
    void (async () => {
      if (switchAllowed) {
        const target = await resolveSaveWorkspaceServerPath(
          "wayof-pi-copy.code-workspace",
        );
        if (!target) return;
        const r = await postWorkspaceOp({
          op: "save_code_workspace_file",
          path: target,
        });
        if (r.error) window.alert(r.error);
        else await refresh();
        return;
      }
      const name = window.prompt(
        "Save duplicate workspace as",
        "wayof-pi-copy.code-workspace",
      );
      if (name == null) return;
      const raw = promptWorkspaceFileParentDir();
      if (raw == null) return;
      downloadWorkspaceJson(
        name.trim() || "wayof-pi-copy.code-workspace",
        raw.trim() || null,
      );
    })();
  }, [
    switchAllowed,
    resolveSaveWorkspaceServerPath,
    refresh,
    downloadWorkspaceJson,
    promptWorkspaceFileParentDir,
  ]);

  const handleNewTextFile = useCallback(() => {
    const name = window.prompt("New file name", "untitled.txt");
    if (name == null) return;
    const safe = sanitizeNewEntryName(name);
    if (!safe) {
      window.alert("Invalid name.");
      return;
    }
    const rel = explorerContextDir ? `${explorerContextDir}/${safe}` : safe;
    void (async () => {
      try {
        await apiPostJson("/api/fs/entry", { path: rel, kind: "file" });
        setTreeExpand({ rev: Date.now(), paths: ancestorDirPaths(rel) });
        await refresh();
        setSelectedPath(rel);
        if (uiMode === "simple") {
          setSimpleTab("chat");
          if (shouldBumpSimpleMenuFileFocus) bumpSimpleMobileMenuFileFocus();
        } else if (uiMode === "claw") {
          focusClawTabAfterWorkspaceFileSelect();
        }
      } catch (e) {
        window.alert(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [
    explorerContextDir,
    refresh,
    uiMode,
    shouldBumpSimpleMenuFileFocus,
    bumpSimpleMobileMenuFileFocus,
    focusClawTabAfterWorkspaceFileSelect,
    setSimpleTab,
  ]);

  const performCreateNewWorkspaceFile = useCallback(
    async (relRaw: string, initialContent?: string) => {
      const safe = sanitizeNewEntryName(relRaw);
      if (!safe) {
        window.alert("Invalid name.");
        return;
      }
      const rel = safe;
      try {
        await apiPostJson("/api/fs/entry", { path: rel, kind: "file" });
        if (initialContent !== undefined) {
          await apiPutJson<{ ok: boolean }>("/api/file", {
            path: rel,
            content: initialContent,
          });
        }
        setTreeExpand({ rev: Date.now(), paths: ancestorDirPaths(rel) });
        await refresh();
        if (
          uiMode === "technical" &&
          (workspaceGrid.cols > 1 || workspaceGrid.rows > 1)
        ) {
          setWorkspaceOpenSignal((s) => ({
            path: rel,
            rev: (s?.rev ?? 0) + 1,
          }));
        } else {
          setSelectedPath(rel);
          if (uiMode === "technical") {
            setPanelDock((prev) => applyAddFileTab(prev, rel));
          } else if (uiMode === "simple") {
            setSimpleTab("chat");
            if (shouldBumpSimpleMenuFileFocus) bumpSimpleMobileMenuFileFocus();
          } else if (uiMode === "claw") {
            focusClawTabAfterWorkspaceFileSelect();
          }
        }
      } catch (e) {
        window.alert(e instanceof Error ? e.message : String(e));
      }
    },
    [
      refresh,
      uiMode,
      workspaceGrid.cols,
      workspaceGrid.rows,
      shouldBumpSimpleMenuFileFocus,
      bumpSimpleMobileMenuFileFocus,
      focusClawTabAfterWorkspaceFileSelect,
      setPanelDock,
      setSimpleTab,
    ],
  );

  /** From the workspace + tab strip: path is relative to the workspace (primary root), not the explorer selection. */
  const handleNewFileInDock = useCallback(
    (defaultSuggestion: string, initialContent?: string) => {
      setNewWorkspaceFileDraft({
        defaultPath: defaultSuggestion,
        initialContent,
      });
    },
    [],
  );

  const handleOpenFileInDock = useCallback(() => {
    void (async () => {
      const abs = await pickAbsoluteServerPath("file");
      if (!abs) return;
      const r = await postWorkspaceOp({ op: "open_file", path: abs });
      if (r.error) {
        window.alert(r.error);
        return;
      }
      const parent = abs.replace(/[/\\][^/\\]*$/, "");
      if (parent) pushRecentWorkspaceFolder(parent);
      bumpRecent();
      if (r.selectPath) {
        setExplorerContextDir(posixDirname(r.selectPath));
        if (
          uiMode === "technical" &&
          (workspaceGrid.cols > 1 || workspaceGrid.rows > 1)
        ) {
          setWorkspaceOpenSignal((s) => ({
            path: r.selectPath!,
            rev: (s?.rev ?? 0) + 1,
          }));
        } else {
          setSelectedPath(r.selectPath);
          if (uiMode === "technical") {
            setPanelDock((prev) => applyAddFileTab(prev, r.selectPath!));
          } else if (uiMode === "simple") {
            setSimpleTab("chat");
            if (shouldBumpSimpleMenuFileFocus) bumpSimpleMobileMenuFileFocus();
          } else if (uiMode === "claw") {
            focusClawTabAfterWorkspaceFileSelect();
          }
        }
      }
      await refresh();
    })();
  }, [
    bumpRecent,
    bumpSimpleMobileMenuFileFocus,
    focusClawTabAfterWorkspaceFileSelect,
    pickAbsoluteServerPath,
    refresh,
    setPanelDock,
    setSimpleTab,
    shouldBumpSimpleMenuFileFocus,
    uiMode,
    workspaceGrid.cols,
    workspaceGrid.rows,
  ]);

  const workspaceDockFileActions = useMemo(
    () => [
      {
        label: "New file…",
        detail: "Opens as a new editor tab — workspace path — hover for type",
        run: () => handleNewFileInDock("untitled.txt"),
        submenu: [
          {
            label: "Plain text",
            detail: ".txt",
            run: () => handleNewFileInDock("untitled.txt"),
          },
          {
            label: "Markdown",
            detail: ".md",
            run: () => handleNewFileInDock("untitled.md", "# \n\n"),
          },
          {
            label: "JSON",
            detail: ".json",
            run: () => handleNewFileInDock("untitled.json", "{\n  \n}\n"),
          },
          {
            label: "TypeScript",
            detail: ".ts",
            run: () => handleNewFileInDock("untitled.ts", "// \n"),
          },
          {
            label: "JavaScript",
            detail: ".js",
            run: () => handleNewFileInDock("untitled.js", "// \n"),
          },
          {
            label: "Python",
            detail: ".py",
            run: () => handleNewFileInDock("untitled.py", "# \n"),
          },
          {
            label: "YAML",
            detail: ".yaml",
            run: () => handleNewFileInDock("untitled.yaml", "# \n"),
          },
          {
            label: "Shell script",
            detail: ".sh",
            run: () =>
              handleNewFileInDock("untitled.sh", "#!/usr/bin/env bash\n\n"),
          },
        ],
      },
      { label: "Open file in workspace…", run: handleOpenFileInDock },
    ],
    [handleNewFileInDock, handleOpenFileInDock],
  );

  const resolveSaveAsTargetPath = useCallback(
    async (relEditorPath: string): Promise<string | null> => {
      const shellSave =
        typeof window !== "undefined" ? window.wopShell?.saveFileAs : undefined;
      if (shellSave && folders.length > 0) {
        const defaultPath = absolutePathForSaveAsDefault(
          relEditorPath,
          folders,
        );
        const r = await shellSave({ defaultPath });
        if ("cancelled" in r && r.cancelled) return null;
        if ("error" in r && r.error) {
          window.alert(r.error);
          return null;
        }
        if ("path" in r && r.path) {
          const rel = relativePathFromWorkspaceAbs(r.path, folders);
          if (!rel) {
            window.alert(
              "Save location must be inside an open workspace folder. Choose a path under your project root.",
            );
            return null;
          }
          return rel;
        }
        return null;
      }
      const rel = window.prompt(
        "Save as (path relative to workspace)",
        relEditorPath,
      );
      if (rel == null || !rel.trim()) return null;
      return rel.trim().replace(/^[/\\]+/, "");
    },
    [folders],
  );

  const handleSaveAs = useCallback(() => {
    const multi =
      uiMode === "technical" && workspaceGrid.cols * workspaceGrid.rows > 1;
    const snap = techWsSnapshotRef.current;
    const path = multi ? (snap?.selectedPath ?? null) : selectedPath;
    const fileContent = multi ? (snap?.content ?? "") : content;
    const enc: FilePersistEncoding = multi
      ? (snap?.persistEncoding ?? "utf8")
      : persistEncoding;
    if (!path) return;
    void (async () => {
      const target = await resolveSaveAsTargetPath(path);
      if (!target) return;
      try {
        await apiPutJson(
          "/api/file",
          buildFilePutPayload(target, fileContent, enc),
        );
        if (multi) {
          setWorkspaceOpenSignal((s) => ({
            path: target,
            rev: (s?.rev ?? 0) + 1,
          }));
        } else {
          setSelectedPath(target);
          if (uiMode === "technical") {
            setPanelDock((prev) => applyAddFileTab(prev, target));
          } else if (uiMode === "simple") {
            setSimpleTab("chat");
            if (shouldBumpSimpleMenuFileFocus) bumpSimpleMobileMenuFileFocus();
          } else if (uiMode === "claw") {
            focusClawTabAfterWorkspaceFileSelect();
          }
        }
        setExplorerContextDir(posixDirname(target));
        setTreeExpand({ rev: Date.now(), paths: ancestorDirPaths(target) });
        await refresh();
        if (staticAnalysisEnabled) {
          workspaceStaticAnalysis.scheduleDebouncedRefresh();
        }
      } catch (e) {
        window.alert(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [
    content,
    selectedPath,
    persistEncoding,
    refresh,
    resolveSaveAsTargetPath,
    uiMode,
    workspaceGrid.cols,
    workspaceGrid.rows,
    staticAnalysisEnabled,
    workspaceStaticAnalysis.scheduleDebouncedRefresh,
    shouldBumpSimpleMenuFileFocus,
    bumpSimpleMobileMenuFileFocus,
    focusClawTabAfterWorkspaceFileSelect,
    setPanelDock,
  ]);

  const handleSaveAll = useCallback(async () => {
    const multi =
      uiMode === "technical" && workspaceGrid.cols * workspaceGrid.rows > 1;
    if (multi) {
      const api = multiCellSaveApiRef.current;
      let ok = true;
      if (api) ok = await api.saveAllDirty();
      if (ok) {
        await refresh();
        if (staticAnalysisEnabled) {
          workspaceStaticAnalysis.scheduleDebouncedRefresh();
        }
      }
    } else if (dirty && selectedPath) {
      await saveAndRefresh();
    }
  }, [
    dirty,
    selectedPath,
    saveAndRefresh,
    refresh,
    uiMode,
    workspaceGrid.cols,
    workspaceGrid.rows,
    staticAnalysisEnabled,
    workspaceStaticAnalysis.scheduleDebouncedRefresh,
  ]);

  const onWorkspaceFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      e.target.value = "";
      if (!f) return;
      let text: string;
      try {
        text = await f.text();
      } catch {
        window.alert("Could not read file");
        return;
      }
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        window.alert("Invalid JSON workspace file");
        return;
      }
      const absWs = await pickAbsoluteServerPath("file");
      if (!absWs) return;
      const r = await postWorkspaceOp({
        op: "from_code_workspace_file",
        workspaceFilePath: absWs,
        json,
      });
      if (r.error) window.alert(r.error);
      else {
        setSelectedPath(null);
        await refresh();
      }
    },
    [pickAbsoluteServerPath, refresh],
  );

  const openPreferences = useCallback(() => {
    setUiMode("technical");
    persistLeftSidebar(true);
    setActivity("settings");
  }, [persistLeftSidebar]);

  const fileMenu: FileMenuProps = useMemo(
    () => ({
      switchAllowed,
      recentFolders,
      autoSave,
      onToggleAutoSave: () => {
        setAutoSave((v) => {
          const n = !v;
          writeAutoSave(n);
          return n;
        });
      },
      workspaceFolders: folders,
      dirty: isWsMulti ? multiCellAnyDirty : effDirty,
      hasOpenFile: !!effSelectedPath,
      canSaveFile: !!effSelectedPath && effDirty,
      canRevertFile: !!effSelectedPath && effDirty,
      onRefreshWorkspaceTree: refresh,
      onCopyWorkspacePath: copyWorkspacePath,
      onNewTextFile: handleNewTextFile,
      onNewWindow: () => {
        window.open(window.location.href, "_blank", "noopener,noreferrer");
      },
      onNewAgentsWindow: () => {
        const u = new URL(window.location.href);
        u.searchParams.set("agents", "1");
        window.open(u.toString(), "_blank", "noopener,noreferrer");
      },
      onOpenFile: handleOpenFilePrompt,
      onOpenFolder: handleOpenFolderPrompt,
      onAddFolderToWorkspace: handleAddFolderPrompt,
      onOpenWorkspaceFromFile: () => workspaceFileInputRef.current?.click(),
      onOpenRecentFolder: handleOpenRecentFolder,
      onSaveWorkspaceAs: handleSaveWorkspaceAs,
      onDuplicateWorkspace: handleDuplicateWorkspace,
      onSave: saveAndRefresh,
      onSaveAs: handleSaveAs,
      onSaveAll: handleSaveAll,
      onRevertFile: reloadFocusedOrMain,
      onCloseEditor: handleCloseEditor,
      onCloseWorkspace: handleCloseWorkspace,
      onCloseWindow: closeAppWindowOrTab,
      onExit: closeAppWindowOrTab,
      onPreferencesOpen: openPreferences,
      onShareCopyLink: () =>
        void navigator.clipboard.writeText(window.location.href),
      onRemoveWorkspaceFolder: handleRemoveWorkspaceFolder,
    }),
    [
      switchAllowed,
      recentFolders,
      autoSave,
      folders,
      isWsMulti,
      multiCellAnyDirty,
      effDirty,
      effSelectedPath,
      refresh,
      copyWorkspacePath,
      handleNewTextFile,
      handleOpenFilePrompt,
      handleOpenFolderPrompt,
      handleAddFolderPrompt,
      handleOpenRecentFolder,
      handleSaveWorkspaceAs,
      handleDuplicateWorkspace,
      saveAndRefresh,
      handleSaveAs,
      handleSaveAll,
      reloadFocusedOrMain,
      handleCloseEditor,
      handleCloseWorkspace,
      closeAppWindowOrTab,
      openPreferences,
      handleRemoveWorkspaceFolder,
    ],
  );

  const enterZen = useCallback(() => {
    setChrome((c) => {
      zenBackupRef.current = {
        leftSidebarVisible,
        agentPanelVisible: dockLayout.agentPanelVisible,
        chatDock: dockLayout.chatDock,
        chrome: { ...c },
      };
      return { ...c, statusBarVisible: false, menuBarVisible: false };
    });
    persistLeftSidebar(false);
    updateDockLayout({ agentPanelVisible: false });
    setZenMode(true);
  }, [
    dockLayout.agentPanelVisible,
    dockLayout.chatDock,
    leftSidebarVisible,
    persistLeftSidebar,
    updateDockLayout,
  ]);

  const exitZen = useCallback(() => {
    const b = zenBackupRef.current;
    if (b) {
      persistLeftSidebar(b.leftSidebarVisible);
      updateDockLayout({
        agentPanelVisible: b.agentPanelVisible,
        chatDock: b.chatDock,
      });
      setChrome(b.chrome);
      zenBackupRef.current = null;
    }
    setZenMode(false);
  }, [persistLeftSidebar, updateDockLayout]);

  const restoreNormalView = useCallback(() => {
    if (zenMode) exitZen();
    setChrome((c) => ({ ...c, centeredEditorLayout: false }));
    void (async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
      } catch {
        /* ignore */
      }
    })();
  }, [zenMode, exitZen]);

  useEffect(() => {
    if (!zenMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exitZen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zenMode, exitZen]);

  const applyWorkspaceGridShape = useCallback((cols: number, rows: number) => {
    setWorkspaceGrid((g) => {
      const next = resizeWorkspaceGrid(g, cols, rows);
      writeWorkspaceGridState(next);
      return next;
    });
    setWsFocusedCell((f) => Math.min(f, cols * rows - 1));
  }, []);

  const applyEditorLayoutPreset = useCallback(
    (preset: EditorLayoutPreset) => {
      switch (preset) {
        case "single":
          persistLeftSidebar(true);
          updateDockLayout((d) => ({
            ...d,
            agentPanelVisible: false,
            chatDock: "right",
          }));
          applyWorkspaceGridShape(1, 1);
          break;
        case "two_columns":
          persistLeftSidebar(true);
          updateDockLayout((d) => ({
            ...d,
            agentPanelVisible: true,
            chatDock: "right",
          }));
          break;
        case "two_rows":
          persistLeftSidebar(true);
          updateDockLayout((d) => ({
            ...d,
            agentPanelVisible: true,
            chatDock: "bottom",
            chatSizePx: clampChatHeight(DEFAULT_COMPACT_BOTTOM_CHAT_HEIGHT_PX),
          }));
          break;
        case "two_rows_right":
          persistLeftSidebar(true);
          updateDockLayout((d) => ({
            ...d,
            agentPanelVisible: true,
            chatDock: "right",
          }));
          break;
        case "two_columns_bottom":
          persistLeftSidebar(true);
          updateDockLayout((d) => ({
            ...d,
            agentPanelVisible: true,
            chatDock: "bottom",
            chatSizePx: clampChatHeight(DEFAULT_COMPACT_BOTTOM_CHAT_HEIGHT_PX),
          }));
          break;
        case "grid_2x2":
          persistLeftSidebar(true);
          updateDockLayout((d) => ({
            ...d,
            agentPanelVisible: true,
            chatDock: "right",
          }));
          break;
        case "focus_terminal":
          persistLeftSidebar(true);
          updateDockLayout((d) => ({ ...d, agentPanelVisible: false }));
          focusToolTab("terminal");
          break;
        case "workspace_grid_1x1":
          applyWorkspaceGridShape(1, 1);
          break;
        case "workspace_grid_3x1":
          applyWorkspaceGridShape(3, 1);
          break;
        case "workspace_grid_1x3":
          applyWorkspaceGridShape(1, 3);
          break;
        case "workspace_grid_2x2":
          applyWorkspaceGridShape(2, 2);
          break;
        case "workspace_grid_3x4":
          applyWorkspaceGridShape(3, 4);
          break;
        default:
          break;
      }
    },
    [
      applyWorkspaceGridShape,
      focusToolTab,
      persistLeftSidebar,
      updateDockLayout,
    ],
  );

  const workspaceGridToolbar = useMemo((): WorkspaceGridPickerConfig | null => {
    if (uiMode !== "technical") return null;
    return {
      cols: workspaceGrid.cols,
      rows: workspaceGrid.rows,
      maxCols: WORKSPACE_GRID_MAX_COLS,
      maxRows: WORKSPACE_GRID_MAX_ROWS,
      onSelect: applyWorkspaceGridShape,
    };
  }, [uiMode, workspaceGrid.cols, workspaceGrid.rows, applyWorkspaceGridShape]);

  const agentTeamWorkspacePane = useMemo(
    () => ({
      agentTeams: agentsApi.data?.teams ?? {},
      agents: agentsApi.data?.agents ?? [],
      agentsLoading: agentsApi.loading,
      /** Full active-tab session (same rows as Session Chat) — Team pulse transcript mirror. */
      teamSessionTranscript: session.rows,
      streaming: session.streaming,
      chatAgentName: session.chatAgentName,
      dispatchTurnAgent: session.dispatchTurnAgent,
      chatPulseMeters: session.chatPulseMeters,
      sessionTokenSummary: teamPulseSessionTokenSummary,
      onEditTeam: openAgentSetupFromMenu,
    }),
    [
      agentsApi.data?.teams,
      agentsApi.data?.agents,
      agentsApi.loading,
      session.rows,
      session.streaming,
      session.chatAgentName,
      session.dispatchTurnAgent,
      session.chatPulseMeters,
      teamPulseSessionTokenSummary,
      openAgentSetupFromMenu,
    ],
  );

  /** Stable localStorage key scoped to the primary workspace root — passed to plan-handoff pickers. */
  const planHandoffWorkspaceKey = folders[0]?.path ?? root ?? "";

  /** Cursor-style: roster beside the editor — show the agent dock and expand Team in Session Chat (not a center tab). */
  const [teamPulseDockSignal, setTeamPulseDockSignal] = useState(0);
  const openTeamPulseInAgentDock = useCallback(() => {
    if (uiMode !== "technical") return;
    updateDockLayout({ agentPanelVisible: true });
    setTeamPulseDockSignal((n) => n + 1);
  }, [uiMode, updateDockLayout]);

  const openPlanFileForReview = useCallback(
    (workspaceRelativePath: string) => {
      const p = workspaceRelativePath.replace(/^[/\\]+/, "");
      if (!p) return;
      setExplorerContextDir(posixDirname(p));
      if (
        uiMode === "technical" &&
        (workspaceGrid.cols > 1 || workspaceGrid.rows > 1)
      ) {
        setWorkspaceOpenSignal((s) => ({ path: p, rev: (s?.rev ?? 0) + 1 }));
      } else {
        setSelectedPath(p);
        if (uiMode === "simple") {
          setSimpleTab("chat");
          if (shouldBumpSimpleMenuFileFocus) bumpSimpleMobileMenuFileFocus();
        } else if (uiMode === "technical") {
          setPanelDock((prev) => applyAddFileTab(prev, p));
        } else if (uiMode === "claw") {
          focusClawTabAfterWorkspaceFileSelect();
        }
      }
    },
    [
      uiMode,
      workspaceGrid.cols,
      workspaceGrid.rows,
      setPanelDock,
      shouldBumpSimpleMenuFileFocus,
      bumpSimpleMobileMenuFileFocus,
      focusClawTabAfterWorkspaceFileSelect,
    ],
  );

  const workspaceEmbeddedChat = useCallback(
    () => (
      <ChatPanel
        uiMode={uiMode}
        rows={session.rows}
        chatTabs={session.chatTabs}
        activeChatTabId={session.activeChatTabId}
        onSelectChatTab={session.selectChatTab}
        onCloseChatTab={session.closeChatTab}
        streaming={session.streaming}
        connected={session.connected}
        error={session.error}
        onSend={session.sendChat}
        onStop={session.stop}
        onClearError={session.clearError}
        onReopenLlmFixModal={reopenLlmFixModal}
        onNewSession={session.startNewSession}
        chatMode={session.chatMode}
        onChatModeChange={handleChatModeChange}
        agents={agentsApi.data?.agents ?? []}
        agentsLoading={agentsApi.loading}
        agentTeams={agentsApi.data?.teams ?? {}}
        onOpenAgentTeamInPane={openTeamPulseInAgentDock}
        openTeamPulseSignal={teamPulseDockSignal}
        onEditTeam={openAgentSetupFromMenu}
        chatAgentName={session.chatAgentName}
        dispatchTurnAgent={session.dispatchTurnAgent}
        onChatAgentChange={session.setChatAgent}
        chatQueuePending={session.chatQueuePending}
        chatQueueItems={session.chatQueueItems}
        editChatQueueItem={session.editChatQueueItem}
        deleteChatQueueItem={session.deleteChatQueueItem}
        forceChatQueueItem={session.forceChatQueueItem}
        chatPulseMeters={session.chatPulseMeters}
        contextTitle={session.tokenMeter.contextTitle}
        sessionTokenSummary={teamPulseSessionTokenSummary}
        embeddedInWorkspace
        onOpenPlanFileForReview={openPlanFileForReview}
        planHandoffWorkspaceKey={planHandoffWorkspaceKey}
      />
    ),
    [
      uiMode,
      session.rows,
      session.chatTabs,
      session.activeChatTabId,
      session.selectChatTab,
      session.closeChatTab,
      session.streaming,
      session.connected,
      session.error,
      session.sendChat,
      session.stop,
      session.clearError,
      reopenLlmFixModal,
      session.startNewSession,
      session.chatMode,
      handleChatModeChange,
      agentsApi.data?.agents,
      agentsApi.loading,
      agentsApi.data?.teams,
      openTeamPulseInAgentDock,
      teamPulseDockSignal,
      openAgentSetupFromMenu,
      session.chatAgentName,
      session.dispatchTurnAgent,
      session.setChatAgent,
      session.chatQueuePending,
      session.chatQueueItems,
      session.editChatQueueItem,
      session.deleteChatQueueItem,
      session.forceChatQueueItem,
      session.chatPulseMeters,
      session.tokenMeter.contextTitle,
      teamPulseSessionTokenSummary,
      openPlanFileForReview,
      planHandoffWorkspaceKey,
    ],
  );

  const toggleFullScreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      /* ignore */
    }
  }, []);

  const viewTechnicalOptions: ViewMenuTechnicalOptions = useMemo(
    () => ({
      statusBarVisible: chrome.statusBarVisible,
      onToggleStatusBar: () =>
        setChrome((c) => ({ ...c, statusBarVisible: !c.statusBarVisible })),
      menuBarVisible: chrome.menuBarVisible,
      onToggleMenuBar: () =>
        setChrome((c) => ({ ...c, menuBarVisible: !c.menuBarVisible })),
      zenMode,
      onEnterZen: enterZen,
      onExitZen: exitZen,
      onToggleFullScreen: toggleFullScreen,
      centeredLayout: chrome.centeredEditorLayout,
      onToggleCenteredLayout: () =>
        setChrome((c) => ({
          ...c,
          centeredEditorLayout: !c.centeredEditorLayout,
        })),
      onNormalView: restoreNormalView,
      wordWrap: chrome.editorWordWrap,
      onToggleWordWrap: () =>
        setChrome((c) => ({ ...c, editorWordWrap: !c.editorWordWrap })),
      breadcrumbsVisible: chrome.breadcrumbsVisible,
      onToggleBreadcrumbs: () =>
        setChrome((c) => ({ ...c, breadcrumbsVisible: !c.breadcrumbsVisible })),
      uiZoomPercent: chrome.uiZoomPercent,
      onZoomIn: () =>
        setChrome((c) => ({
          ...c,
          uiZoomPercent: Math.min(150, c.uiZoomPercent + 10),
        })),
      onZoomOut: () =>
        setChrome((c) => ({
          ...c,
          uiZoomPercent: Math.max(75, c.uiZoomPercent - 10),
        })),
      onZoomReset: () => setChrome((c) => ({ ...c, uiZoomPercent: 100 })),
      onFlipLayout: flipDockLayout,
      onApplyLayoutPreset: applyEditorLayoutPreset,
    }),
    [
      chrome.statusBarVisible,
      chrome.menuBarVisible,
      chrome.centeredEditorLayout,
      chrome.editorWordWrap,
      chrome.breadcrumbsVisible,
      chrome.uiZoomPercent,
      zenMode,
      enterZen,
      exitZen,
      restoreNormalView,
      toggleFullScreen,
      flipDockLayout,
      applyEditorLayoutPreset,
    ],
  );

  const viewSimpleMenu: ViewMenuSimpleOptions | null = useMemo(() => {
    if (uiMode !== "simple" && uiMode !== "claw") return null;
    const d = uiViewsCatalog.data;
    const catalogRel = d?.catalogRelPath ?? ".wayofpi/ui-views.json";
    const schemaRel = d?.schemaDocRelPath ?? "docs/WOP_SIMPLE_UI_VIEWS.md";

    const onActivateEntry = (e: UiViewCatalogEntry) => {
      if (e.kind === "simpleTab") {
        const t = e.target;
        if (
          t !== "chat" &&
          t !== "team" &&
          t !== "models" &&
          t !== "projects" &&
          t !== "settings"
        )
          return;
        if (uiMode === "claw") {
          if (t === "chat") setClawTab("chat");
          else if (t === "team") setClawTab("team");
          else if (t === "models" || t === "settings") setClawTab("settings");
          else if (t === "projects") setClawTab("files");
        } else {
          setSimpleTab(t);
        }
        return;
      }
      if (e.kind === "openFile") {
        setSelectedPath(e.target);
        if (uiMode === "claw") {
          focusClawTabAfterWorkspaceFileSelect();
        } else {
          setSimpleTab("chat");
          if (shouldBumpSimpleMenuFileFocus) bumpSimpleMobileMenuFileFocus();
        }
        return;
      }
      if (e.kind === "technicalActivity") {
        const a = e.target;
        if (
          a === "explorer" ||
          a === "search" ||
          a === "scm" ||
          a === "extensions" ||
          a === "planning" ||
          a === "settings"
        ) {
          setUiMode("technical");
          persistLeftSidebar(true);
          setActivity(a);
        }
      }
    };

    return {
      onOpenAppearanceSettings: () => {
        if (uiMode === "claw") setClawTab("settings");
        else setSimpleTab("settings");
      },
      onToggleFullScreen: () => void toggleFullScreen(),
      onSeedViewsCatalog: () => void uiViewsCatalog.seedCatalog(),
      catalog: d?.entries ?? [],
      catalogLoading: uiViewsCatalog.loading,
      catalogError: uiViewsCatalog.error,
      catalogParseWarning: d?.parseError ?? null,
      catalogSource: d?.source ?? "default",
      catalogRelPath: catalogRel,
      onActivateEntry,
      onEditCatalog: () => {
        if (uiMode === "claw") {
          focusWorkspaceFileFromMenu(catalogRel);
          return;
        }
        setSelectedPath(catalogRel);
        setSimpleTab("chat");
        if (shouldBumpSimpleMenuFileFocus) bumpSimpleMobileMenuFileFocus();
      },
      onOpenSchemaDoc: () => {
        if (uiMode === "claw") {
          focusWorkspaceFileFromMenu(schemaRel);
          return;
        }
        setSelectedPath(schemaRel);
        setSimpleTab("chat");
        if (shouldBumpSimpleMenuFileFocus) bumpSimpleMobileMenuFileFocus();
      },
    };
  }, [
    uiMode,
    uiViewsCatalog.data,
    uiViewsCatalog.loading,
    uiViewsCatalog.error,
    uiViewsCatalog.seedCatalog,
    toggleFullScreen,
    persistLeftSidebar,
    setActivity,
    shouldBumpSimpleMenuFileFocus,
    bumpSimpleMobileMenuFileFocus,
    focusClawTabAfterWorkspaceFileSelect,
    focusWorkspaceFileFromMenu,
    setSelectedPath,
    setSimpleTab,
    setClawTab,
    setUiMode,
  ]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inChat = (e.target as HTMLElement | null)?.closest?.(
        "[data-wop-chat-root]",
      );
      const inXterm = (e.target as HTMLElement | null)?.closest?.(".xterm");
      if (!inChat && !inXterm) {
        /** View → Appearance: full screen (not while debug REPL maps plain F11 to Step Into). */
        if (
          e.key === "F11" &&
          !e.shiftKey &&
          !e.ctrlKey &&
          !e.altKey &&
          !e.metaKey &&
          !(debugSessionActive && debugReplSession)
        ) {
          e.preventDefault();
          void toggleFullScreen();
          return;
        }
        if (
          e.key === "F9" &&
          !e.ctrlKey &&
          !e.shiftKey &&
          !e.metaKey &&
          !e.altKey
        ) {
          e.preventDefault();
          toggleBreakpointAtCursor();
          return;
        }
        if (e.key === "F5") {
          if (!e.ctrlKey && !e.shiftKey && !e.altKey) {
            e.preventDefault();
            if (debugSessionActive) {
              if (debugReplSession) {
                focusTerminalForCommands();
                sendTerminalInput("c\r");
              }
            } else {
              startDebugging();
            }
            return;
          }
          if (e.ctrlKey && !e.shiftKey && !e.altKey) {
            e.preventDefault();
            runWithoutDebugging();
            return;
          }
          if (e.shiftKey && !e.ctrlKey && !e.altKey) {
            if (debugSessionActive) {
              e.preventDefault();
              stopDebugging();
            }
            return;
          }
          if (e.ctrlKey && e.shiftKey && !e.altKey) {
            if (debugSessionActive) {
              e.preventDefault();
              restartDebugging();
            }
            return;
          }
        }
        if (debugSessionActive && debugReplSession) {
          if (e.key === "F10" && !e.ctrlKey && !e.shiftKey && !e.altKey) {
            e.preventDefault();
            focusTerminalForCommands();
            sendTerminalInput("n\r");
            return;
          }
          if (e.key === "F11" && !e.shiftKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            focusTerminalForCommands();
            sendTerminalInput("s\r");
            return;
          }
          if (e.key === "F11" && e.shiftKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            focusTerminalForCommands();
            sendTerminalInput("return\r");
            return;
          }
        }
        const isMinusKey =
          e.key === "-" ||
          e.key === "_" ||
          e.code === "Minus" ||
          e.code === "NumpadSubtract";
        if ((e.metaKey || e.ctrlKey) && e.altKey && isMinusKey && !e.shiftKey) {
          e.preventDefault();
          goHistoryBack();
          return;
        }
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && isMinusKey && !e.altKey) {
          e.preventDefault();
          goHistoryForward();
          return;
        }
        if (
          (e.metaKey || e.ctrlKey) &&
          e.key.toLowerCase() === "p" &&
          !e.shiftKey &&
          !e.altKey
        ) {
          e.preventDefault();
          openWorkspaceSearch();
          return;
        }
        if (
          (e.metaKey || e.ctrlKey) &&
          e.key.toLowerCase() === "t" &&
          !e.shiftKey &&
          !e.altKey
        ) {
          e.preventDefault();
          setCommandPaletteOpen(true);
          return;
        }
        if (
          (e.metaKey || e.ctrlKey) &&
          e.shiftKey &&
          e.key.toLowerCase() === "o" &&
          !e.altKey
        ) {
          e.preventDefault();
          setCommandPaletteOpen(true);
          return;
        }
        if (
          (e.metaKey || e.ctrlKey) &&
          e.key.toLowerCase() === "g" &&
          !e.shiftKey &&
          !e.altKey
        ) {
          e.preventDefault();
          promptGoToLine();
          return;
        }
        if (e.key === "F8" && !e.ctrlKey && !e.altKey) {
          if (uiMode === "simple") {
            e.preventDefault();
            setUiMode("technical");
            focusToolTab("problems");
            return;
          }
          if (uiMode === "technical") {
            e.preventDefault();
            focusToolTab("problems");
            return;
          }
        }
      }
      if (
        uiMode === "technical" &&
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "b" &&
        !e.shiftKey &&
        !e.altKey
      ) {
        e.preventDefault();
        toggleLeftSidebar();
        return;
      }
      if (
        uiMode === "technical" &&
        (e.metaKey || e.ctrlKey) &&
        e.altKey &&
        e.key.toLowerCase() === "b" &&
        !e.shiftKey
      ) {
        e.preventDefault();
        updateDockLayout((d) => ({
          ...d,
          agentPanelVisible: !d.agentPanelVisible,
        }));
        return;
      }
      /** View → Appearance: Zen (toggle) / centered editor column */
      if (
        uiMode === "technical" &&
        (e.metaKey || e.ctrlKey) &&
        e.altKey &&
        !e.shiftKey &&
        e.key.toLowerCase() === "z"
      ) {
        e.preventDefault();
        if (zenMode) exitZen();
        else enterZen();
        return;
      }
      if (
        uiMode === "technical" &&
        (e.metaKey || e.ctrlKey) &&
        e.altKey &&
        !e.shiftKey &&
        e.key.toLowerCase() === "c"
      ) {
        e.preventDefault();
        setChrome((c) => ({
          ...c,
          centeredEditorLayout: !c.centeredEditorLayout,
        }));
        return;
      }
      if (
        uiMode === "technical" &&
        (e.metaKey || e.ctrlKey) &&
        e.altKey &&
        !e.shiftKey &&
        e.key.toLowerCase() === "n"
      ) {
        e.preventDefault();
        restoreNormalView();
        return;
      }
      if (
        uiMode === "technical" &&
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "j" &&
        !e.shiftKey &&
        !e.altKey
      ) {
        e.preventDefault();
        focusToolTab("terminal");
        return;
      }
      if (
        uiMode === "technical" &&
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "m"
      ) {
        e.preventDefault();
        focusToolTab("problems");
        return;
      }
      if (
        uiMode === "technical" &&
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "p"
      ) {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }
      if (
        !inXterm &&
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "b" &&
        !e.altKey
      ) {
        e.preventDefault();
        focusTerminalForCommands();
        if (config?.terminalEnabled === true)
          sendTerminalInput("bun run build\r");
        return;
      }
      if (
        !inXterm &&
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.code === "Digit5"
      ) {
        e.preventDefault();
        setUiMode("technical");
        persistLeftSidebar(true);
        onOpenToolPanel("terminal");
        return;
      }
      if (
        uiMode === "technical" &&
        e.altKey &&
        !e.metaKey &&
        !e.ctrlKey &&
        e.key.toLowerCase() === "z"
      ) {
        if (!inChat) {
          e.preventDefault();
          setChrome((c) => ({ ...c, editorWordWrap: !c.editorWordWrap }));
        }
        return;
      }
      if (
        uiMode === "technical" &&
        e.shiftKey &&
        e.altKey &&
        (e.key === "0" || e.code === "Digit0")
      ) {
        e.preventDefault();
        flipDockLayout();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }
      if (inChat && (e.metaKey || e.ctrlKey)) {
        const k = e.key.toLowerCase();
        if (k === "n" || k === "o" || k === "w" || k === "q") return;
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "s"
      ) {
        e.preventDefault();
        handleSaveAs();
        return;
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === "s"
      ) {
        e.preventDefault();
        void saveAndRefresh();
        return;
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === "n"
      ) {
        e.preventDefault();
        handleNewTextFile();
        return;
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === "o"
      ) {
        e.preventDefault();
        handleOpenFilePrompt();
        return;
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === "w"
      ) {
        e.preventDefault();
        handleCloseEditor();
        return;
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === "q"
      ) {
        e.preventDefault();
        closeAppWindowOrTab();
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    saveAndRefresh,
    uiMode,
    toggleLeftSidebar,
    updateDockLayout,
    focusToolTab,
    flipDockLayout,
    setCommandPaletteOpen,
    handleSaveAs,
    handleNewTextFile,
    handleOpenFilePrompt,
    handleCloseEditor,
    closeAppWindowOrTab,
    focusTerminalForCommands,
    config?.terminalEnabled,
    persistLeftSidebar,
    onOpenToolPanel,
    setUiMode,
    toggleBreakpointAtCursor,
    startDebugging,
    runWithoutDebugging,
    stopDebugging,
    restartDebugging,
    debugSessionActive,
    debugReplSession,
    sendTerminalInput,
    focusTerminalForCommands,
    goHistoryBack,
    goHistoryForward,
    openWorkspaceSearch,
    promptGoToLine,
    toggleFullScreen,
    enterZen,
    exitZen,
    restoreNormalView,
    zenMode,
    setChrome,
  ]);

  const workspaceDockActionsMain = useMemo(
    () => ({
      onOpenFile: handleOpenFilePrompt,
      onShowAgentChat: (cellIndex: number) => {
        if (
          uiMode === "technical" &&
          (workspaceGrid.cols > 1 || workspaceGrid.rows > 1)
        ) {
          setWsFocusedCell(cellIndex);
          patchWorkspaceCellDock(cellIndex, (prev) =>
            applyShowToolTab(prev, "agent_chat"),
          );
        } else {
          setPanelDock((prev) => applyShowToolTab(prev, "agent_chat"));
        }
      },
    }),
    [
      handleOpenFilePrompt,
      uiMode,
      workspaceGrid.cols,
      workspaceGrid.rows,
      patchWorkspaceCellDock,
    ],
  );

  const setWorkspaceActiveIndex = useCallback((index: number) => {
    setPanelDock((prev) => ({ ...prev, activeIndex: index }));
  }, []);

  const onDockEntryMove = useCallback(
    (moving: PanelTab, before: PanelTab | null) => {
      setPanelDock((prev) => applyPanelTabMove(prev, moving, before));
    },
    [],
  );

  const onDockEntryClose = useCallback((entry: PanelTab) => {
    setPanelDock((prev) =>
      entry.type === "tool"
        ? applyCloseToolTab(prev, entry.id)
        : applyRemoveFileTab(prev, entry.path),
    );
  }, []);

  const onSelectFileFromWorkspaceTab = useCallback((path: string) => {
    setSelectedPath(path);
    setExplorerContextDir(posixDirname(path));
  }, []);

  const gitReviewHasAnyMarked = useMemo(
    () => gitMarkedFilePathsSorted(nodes).length > 0,
    [nodes],
  );
  const gitReviewCanAdvanceNext = useMemo(
    () => nextGitReviewFilePath(selectedPath, nodes) != null,
    [selectedPath, nodes],
  );

  const workspaceGitFileReviewActions = useMemo(() => {
    if (isWsMulti || uiMode !== "technical") return null;
    return {
      onSaveAndStage: async () => {
        if (!selectedPath) return;
        if (dirty) {
          const ok = await save();
          if (!ok) return;
        }
        const r = await apiPostJson<{ ok?: boolean; error?: string }>(
          "/api/git/stage",
          { path: selectedPath },
        );
        if (!r.ok) return;
        await refreshQuiet();
      },
      onOpenNextGitReviewPath: async () => {
        if (!selectedPath) return;
        if (dirty) {
          const ok = await save();
          if (!ok) return;
        }
        const data = await refreshQuiet();
        if (!data) return;
        const next = nextGitReviewFilePath(selectedPath, data.nodes);
        if (next) onSelectFileFromWorkspaceTab(next);
      },
    };
  }, [
    isWsMulti,
    uiMode,
    selectedPath,
    dirty,
    save,
    refreshQuiet,
    onSelectFileFromWorkspaceTab,
  ]);

  const onExplorerSelectFile = useCallback(
    (p: string, _ev?: MouseEvent) => {
      setExplorerContextDir(posixDirname(p));
      if (
        uiMode === "technical" &&
        (workspaceGrid.cols > 1 || workspaceGrid.rows > 1)
      ) {
        setWorkspaceOpenSignal((s) => ({ path: p, rev: (s?.rev ?? 0) + 1 }));
      } else {
        setSelectedPath(p);
        if (uiMode === "technical") {
          setPanelDock((prev) => applyAddFileTab(prev, p));
        }
      }
    },
    [uiMode, workspaceGrid.cols, workspaceGrid.rows],
  );

  /** Keep a tab row entry when code paths set `selectedPath` without going through the explorer.
   * Technical-mode only — Claw and Simple drive `selectedPath` directly without a panel dock. */
  useEffect(() => {
    if (isWsMulti) return;
    if (uiMode !== "technical") return;
    if (!selectedPath) return;
    setPanelDock((prev) => {
      const next = applyEnsureFileTab(prev, selectedPath);
      return next === prev ? prev : next;
    });
  }, [selectedPath, isWsMulti, uiMode]);

  /** Active file tab drives the editor buffer; tool tabs leave `selectedPath` as last file (if any).
   * Technical-mode only — in Claw/Simple the panel dock must not override the selected file. */
  useEffect(() => {
    if (isWsMulti) return;
    if (uiMode !== "technical") return;
    const a = panelDock.tabs[panelDock.activeIndex];
    if (a?.type !== "file") return;
    setSelectedPath((p) => (p === a.path ? p : a.path));
    setExplorerContextDir(posixDirname(a.path));
  }, [panelDock.activeIndex, panelDock.tabs, isWsMulti, uiMode]);

  useEffect(() => {
    if (isWsMulti) return;
    if (uiMode !== "technical") return;
    const hasFile = panelDock.tabs.some((t) => t.type === "file");
    if (!hasFile) setSelectedPath(null);
  }, [panelDock.tabs, isWsMulti, uiMode]);

  const dockForZedStrip = isWsMulti
    ? (techWsSnapshot?.panelDock ?? panelDock)
    : panelDock;

  /** Zed-style status bar icons — see Zed docs (`project_panel`, `terminal`, `agent`, `search`, `git_panel`, `diagnostics`, `status_bar`). */
  const technicalZedStrip = useMemo(
    () => ({
      onToggleLeftSidebar: toggleLeftSidebar,
      leftSidebarVisible,
      onFocusTerminal: () => focusToolTab("terminal"),
      terminalDockedVisible: toolTabVisible(dockForZedStrip, "terminal"),
      onFocusPlanning: () => {
        persistLeftSidebar(true);
        setActivity("planning");
      },
      planningActive: activity === "planning",
      onToggleAgent: () =>
        updateDockLayout((d) => ({
          ...d,
          agentPanelVisible: !d.agentPanelVisible,
        })),
      agentVisible: dockLayout.agentPanelVisible,
      onFocusSearch: () => {
        persistLeftSidebar(true);
        setActivity("search");
      },
      searchActive: activity === "search",
      onFocusScm: () => {
        persistLeftSidebar(true);
        setActivity("scm");
      },
      scmActive: activity === "scm",
      onFocusDiagnostics: () => focusToolTab("problems"),
      problemsVisible: toolTabVisible(dockForZedStrip, "problems"),
      onOpenSettings: openPreferences,
      diagnosticsCount: workspaceStaticAnalysis.totalCount,
    }),
    [
      toggleLeftSidebar,
      leftSidebarVisible,
      focusToolTab,
      dockForZedStrip,
      persistLeftSidebar,
      activity,
      updateDockLayout,
      dockLayout.agentPanelVisible,
      openPreferences,
      workspaceStaticAnalysis.totalCount,
    ],
  );

  const commandItems: CommandItem[] = useMemo(() => {
    const setAct = (a: TechnicalActivity) => () => {
      persistLeftSidebar(true);
      setActivity(a);
    };
    return [
      {
        id: "palette",
        label: "Command palette",
        keywords: ["commands"],
        run: () => setCommandPaletteOpen(true),
      },
      {
        id: "host-doctor",
        label: "Help: Host doctor",
        detail:
          "Workspace, env, Ollama/OpenRouter, Pi CLI, terminal — GET /api/diagnostics",
        keywords: ["doctor", "diagnostics", "health", "wop", "env", "ollama"],
        run: openHostDoctor,
      },
      {
        id: "how-to-use",
        label: "Help: How to use Way of Pi",
        detail: "Getting started modal + doc links",
        keywords: ["help", "start", "guide", "tutorial", "onboarding"],
        run: () => {
          setHowToUseInitialSection(null);
          setHowToUseModalOpen(true);
        },
      },
      {
        id: "layout-simple",
        label: "Layout: Simple UI",
        keywords: ["mode", "shell"],
        run: () => setUiMode("simple"),
      },
      {
        id: "layout-technical",
        label: "Layout: Technical UI",
        keywords: ["mode", "shell", "ide"],
        run: () => setUiMode("technical"),
      },
      {
        id: "layout-claw",
        label: "Layout: Claw UI",
        detail:
          "Roadmap autonomous-agent shell — docs/WOP_CLAW_MODE_PLAN.md, docs/WOP_CLAW_UI_PLAN.md",
        keywords: ["mode", "shell", "claw", "automation"],
        run: () => setUiMode("claw"),
      },
      {
        id: "leftsidebar",
        label: leftSidebarVisible
          ? "View: Hide primary sidebar"
          : "View: Show primary sidebar",
        detail: "Ctrl+B",
        keywords: ["activity", "explorer", "dock", "zed"],
        run: toggleLeftSidebar,
      },
      {
        id: "explorer",
        label: "View: Explorer",
        keywords: ["files", "tree"],
        run: setAct("explorer"),
      },
      {
        id: "search",
        label: "View: Search",
        keywords: ["find", "file"],
        run: setAct("search"),
      },
      {
        id: "scm",
        label: "View: Source control",
        keywords: ["git"],
        run: setAct("scm"),
      },
      { id: "ext", label: "View: Run / Extensions", run: setAct("extensions") },
      {
        id: "planning",
        label: "View: Plan / Build",
        keywords: ["cursor", "planner", "agent", "mode"],
        run: setAct("planning"),
      },
      {
        id: "chat-mode-plan",
        label: "Agent: Plan mode (Pi planner prompt)",
        keywords: ["cursor", "planning"],
        run: () => handleChatModeChange("plan"),
      },
      {
        id: "chat-mode-build",
        label: "Agent: Build mode",
        keywords: ["cursor", "coding"],
        run: () => handleChatModeChange("build"),
      },
      {
        id: "chat-agent-default",
        label: "Chat: Orchestrator (no .md agent)",
        keywords: ["persona", "pi"],
        run: () => session.setChatAgent(null),
      },
      ...((agentsApi.data?.agents ?? []).slice(0, 48).map((a) => ({
        id: `chat-agent-${a.name}`,
        label: `Chat: Agent ${workspaceAgentDisplayName(a.name)}`,
        keywords: [
          a.name,
          workspaceAgentDisplayName(a.name),
          a.description,
          "pi",
          "persona",
        ],
        run: () => session.setChatAgent(a.name),
      })) satisfies CommandItem[]),
      { id: "settings", label: "View: Settings", run: setAct("settings") },
      {
        id: "save",
        label: "File: Save",
        detail: "Ctrl+S",
        keywords: ["write", "disk"],
        run: () => void saveAndRefresh(),
      },
      {
        id: "revert",
        label: "File: Revert from disk",
        run: () => void reloadFocusedOrMain(),
      },
      {
        id: "refresh",
        label: "Workspace: Refresh tree",
        run: () => void refresh(),
      },
      {
        id: "copypath",
        label: "Workspace: Copy path",
        run: copyWorkspacePath,
      },
      {
        id: "new-plan-file",
        label: "File: New plan markdown (plans/PLAN-…)",
        keywords: ["plan", "planner", "markdown", "spec"],
        run: () => void handleNewPlanFile(),
      },
      {
        id: "chat-build-from-plan-compose",
        label: "Chat: Insert Build handoff from latest plan",
        keywords: ["plan", "implement", "build", "composer"],
        run: () => {
          void apiGet<{ latest: { path: string } | null }>("/api/plans")
            .then((d) => {
              const p = d.latest?.path;
              if (!p) {
                injectIntoChatComposer(
                  "No `plans/PLAN-*.md` file found yet — use **File: New plan markdown** or add one under `plans/`.",
                );
                return;
              }
              injectIntoChatComposer(buildImplementPlanPrompt(p));
            })
            .catch(() =>
              injectIntoChatComposer(
                "Could not load `/api/plans` — is the Way of Pi server running?",
              ),
            );
        },
      },
      {
        id: "chat-review-plan-compose",
        label: "Chat: Insert review prompt for latest plan",
        keywords: ["plan", "review", "critique"],
        run: () => {
          void apiGet<{ latest: { path: string } | null }>("/api/plans")
            .then((d) => {
              const p = d.latest?.path;
              if (!p) {
                injectIntoChatComposer("No `plans/PLAN-*.md` file found yet.");
                return;
              }
              openPlanFileForReview(p);
              injectIntoChatComposer(buildReviewPlanPrompt(p));
            })
            .catch(() =>
              injectIntoChatComposer("Could not load `/api/plans`."),
            );
        },
      },
      {
        id: "chat-plan-reviewer-latest",
        label: "Chat: Set plan-reviewer + review latest plan",
        keywords: ["plan-reviewer", "plan", "review"],
        run: () => {
          const roster = agentsApi.data?.agents ?? [];
          if (roster.some((a) => a.name === "plan-reviewer")) {
            session.setChatAgent("plan-reviewer");
          }
          void apiGet<{ latest: { path: string } | null }>("/api/plans")
            .then((d) => {
              const p = d.latest?.path;
              if (!p) {
                injectIntoChatComposer("No `plans/PLAN-*.md` file found yet.");
                return;
              }
              openPlanFileForReview(p);
              injectIntoChatComposer(buildReviewPlanPrompt(p));
            })
            .catch(() =>
              injectIntoChatComposer("Could not load `/api/plans`."),
            );
        },
      },
      {
        id: "agent-dock-right",
        label: "View: Dock agent panel to the right",
        keywords: ["chat", "session", "sidebar", "zed", "cursor"],
        run: () =>
          updateDockLayout((d) => ({
            ...d,
            chatDock: "right",
            agentPanelVisible: true,
            chatSizePx: chatSizePxWhenSwitchingDock(
              d.chatDock,
              "right",
              d.chatSizePx,
            ),
          })),
      },
      {
        id: "agent-dock-bottom",
        label: "View: Dock agent panel to the bottom",
        keywords: ["chat", "session", "terminal", "zed", "cursor"],
        run: () =>
          updateDockLayout((d) => ({
            ...d,
            chatDock: "bottom",
            agentPanelVisible: true,
            chatSizePx: chatSizePxWhenSwitchingDock(
              d.chatDock,
              "bottom",
              d.chatSizePx,
            ),
          })),
      },
      {
        id: "agent-toggle",
        label: dockLayout.agentPanelVisible
          ? "View: Hide agent panel"
          : "View: Show agent panel",
        detail: "Ctrl+Alt+B (macOS: Cmd+Alt+B)",
        keywords: ["chat", "session", "copilot"],
        run: () =>
          updateDockLayout((d) => ({
            ...d,
            agentPanelVisible: !d.agentPanelVisible,
          })),
      },
      {
        id: "toollog",
        label: "Panel: Tool log",
        run: () => focusToolTab("tool_log"),
      },
      {
        id: "terminal",
        label: "Panel: Terminal",
        run: () => focusToolTab("terminal"),
      },
      {
        id: "output",
        label: "Panel: Output",
        run: () => focusToolTab("output"),
      },
      ...PI_MODEL_CONFIG_ENTRIES.map(
        (e) =>
          ({
            id: `pi-model-file-${e.id}`,
            label: `Pi: Open ${e.path}`,
            keywords: [
              "models",
              "provider",
              "ollama",
              "openrouter",
              e.id,
              "json",
            ],
            run: () => openPiModelConfigInEditor(e.path),
          }) satisfies CommandItem,
      ),
    ];
  }, [
    panelDock.tabs,
    panelDock.activeIndex,
    dockLayout.chatDock,
    copyWorkspacePath,
    focusToolTab,
    leftSidebarVisible,
    openPiModelConfigInEditor,
    persistLeftSidebar,
    refresh,
    reloadFocusedOrMain,
    saveAndRefresh,
    toggleLeftSidebar,
    dockLayout.agentPanelVisible,
    updateDockLayout,
    handleChatModeChange,
    session.setChatAgent,
    agentsApi.data?.agents,
    handleNewPlanFile,
    openHostDoctor,
    session.setChatAgent,
    setUiMode,
    setHowToUseModalOpen,
    openPlanFileForReview,
  ]);

  const simpleCommandItems: CommandItem[] = useMemo(() => {
    const files = flattenTreeFiles(nodes).slice(0, 120);
    return [
      {
        id: "s-palette",
        label: "Command palette",
        keywords: ["commands"],
        run: () => setCommandPaletteOpen(true),
      },
      {
        id: "s-host-doctor",
        label: "Help: Host doctor",
        detail: "GET /api/diagnostics — checks + copy JSON",
        keywords: ["doctor", "diagnostics", "health", "env", "ollama"],
        run: openHostDoctor,
      },
      {
        id: "s-how-to-use",
        label:
          uiMode === "claw"
            ? "Help: Claw guide & roadmap"
            : "Help: How to use Way of Pi",
        detail:
          uiMode === "claw"
            ? "Claw Help — operator shell, phases, schedules, channels"
            : "Getting started modal + doc links",
        keywords: ["help", "start", "guide", "tutorial", "claw", "roadmap"],
        run: () => {
          if (uiMode === "claw") {
            setClawHelpDefaultSection(null);
            setClawHelpOpen(true);
          } else {
            setHowToUseInitialSection(null);
            setHowToUseModalOpen(true);
          }
        },
      },
      {
        id: "s-chat",
        label: uiMode === "claw" ? "Claw: Chat" : "Simple: Chat",
        run: () =>
          uiMode === "claw" ? setClawTab("chat") : setSimpleTab("chat"),
      },
      {
        id: "s-team",
        label: uiMode === "claw" ? "Claw: Team" : "Simple: My Team",
        run: () =>
          uiMode === "claw" ? setClawTab("team") : setSimpleTab("team"),
      },
      {
        id: "s-models",
        label: uiMode === "claw" ? "Claw: Settings" : "Simple: AI Brains",
        run: () =>
          uiMode === "claw" ? setClawTab("settings") : setSimpleTab("models"),
      },
      {
        id: "s-projects",
        label: uiMode === "claw" ? "Claw: Files" : "Simple: Projects",
        run: () =>
          uiMode === "claw" ? setClawTab("files") : setSimpleTab("projects"),
      },
      {
        id: "s-settings",
        label: uiMode === "claw" ? "Claw: Settings" : "Simple: Settings",
        run: () =>
          uiMode === "claw" ? setClawTab("settings") : setSimpleTab("settings"),
      },
      {
        id: "s-tech",
        label: "Layout: Technical UI",
        run: () => setUiMode("technical"),
      },
      {
        id: "s-claw",
        label: "Layout: Claw UI",
        detail:
          "Roadmap shell — docs/WOP_CLAW_MODE_PLAN.md, docs/WOP_CLAW_UI_PLAN.md",
        run: () => setUiMode("claw"),
      },
      {
        id: "s-save",
        label: "File: Save",
        detail: "Ctrl+S",
        run: () => void saveAndRefresh(),
      },
      {
        id: "s-revert",
        label: "File: Revert from disk",
        run: () => void reload(),
      },
      {
        id: "s-refresh",
        label: "Workspace: Refresh tree",
        run: () => void refresh(),
      },
      { id: "s-copy", label: "Workspace: Copy path", run: copyWorkspacePath },
      {
        id: "s-chat-plan",
        label: "Agent: Plan mode (Pi planner prompt)",
        keywords: ["cursor", "planning"],
        run: () => handleChatModeChange("plan"),
      },
      {
        id: "s-chat-build",
        label: "Agent: Build mode",
        keywords: ["cursor", "coding"],
        run: () => handleChatModeChange("build"),
      },
      {
        id: "s-new-plan",
        label: "File: New plan markdown (plans/PLAN-…)",
        keywords: ["plan", "planner", "spec"],
        run: () => void handleNewPlanFile(),
      },
      {
        id: "s-chat-build-from-plan",
        label: "Chat: Insert Build handoff from latest plan",
        keywords: ["plan", "implement"],
        run: () => {
          if (uiMode === "simple") setSimpleTab("chat");
          else if (uiMode === "claw") setClawTab("chat");
          void apiGet<{ latest: { path: string } | null }>("/api/plans")
            .then((d) => {
              const p = d.latest?.path;
              if (!p) {
                injectIntoChatComposer("No `plans/PLAN-*.md` file found yet.");
                return;
              }
              injectIntoChatComposer(buildImplementPlanPrompt(p));
            })
            .catch(() =>
              injectIntoChatComposer("Could not load `/api/plans`."),
            );
        },
      },
      {
        id: "s-chat-review-plan",
        label: "Chat: Insert review prompt for latest plan",
        keywords: ["plan", "review"],
        run: () => {
          if (uiMode === "simple") setSimpleTab("chat");
          else if (uiMode === "claw") setClawTab("chat");
          void apiGet<{ latest: { path: string } | null }>("/api/plans")
            .then((d) => {
              const p = d.latest?.path;
              if (!p) {
                injectIntoChatComposer("No `plans/PLAN-*.md` file found yet.");
                return;
              }
              openPlanFileForReview(p);
              injectIntoChatComposer(buildReviewPlanPrompt(p));
            })
            .catch(() =>
              injectIntoChatComposer("Could not load `/api/plans`."),
            );
        },
      },
      ...PI_MODEL_CONFIG_ENTRIES.map(
        (e) =>
          ({
            id: `s-pi-model-file-${e.id}`,
            label: `Pi: ${e.label} (${e.path})`,
            keywords: ["models", "provider", "brains", e.id],
            run: () => openPiModelConfigInSimpleBrains(e.path),
          }) satisfies CommandItem,
      ),
      ...files.map((f) => ({
        id: `s-file-${f.path}`,
        label: `Open: ${f.path}`,
        keywords: [f.name, f.path],
        run: () => {
          setSelectedPath(f.path);
          if (uiMode === "simple") {
            setSimpleTab("chat");
            if (shouldBumpSimpleMenuFileFocus) bumpSimpleMobileMenuFileFocus();
          } else if (uiMode === "claw") {
            focusClawTabAfterWorkspaceFileSelect();
          }
        },
      })),
    ];
  }, [
    nodes,
    copyWorkspacePath,
    handleNewPlanFile,
    openPiModelConfigInSimpleBrains,
    refresh,
    reload,
    saveAndRefresh,
    handleChatModeChange,
    setSelectedPath,
    setSimpleTab,
    setUiMode,
    openHostDoctor,
    setHowToUseModalOpen,
    uiMode,
    setClawHelpOpen,
    setClawHelpDefaultSection,
    shouldBumpSimpleMenuFileFocus,
    bumpSimpleMobileMenuFileFocus,
    focusClawTabAfterWorkspaceFileSelect,
    setClawTab,
  ]);

  const leftPanel =
    activity === "explorer" ? (
      <ExplorerSidebar
        nodes={nodes}
        rootLabel={rootLabel}
        selectedPath={selectedPath}
        onSelectFile={onExplorerSelectFile}
        onSelectDirectory={setExplorerContextDir}
        onMoveFileToDirectory={handleExplorerMoveFile}
        allowDropToWorkspaceRoot={folders.length === 1}
        onRenameExplorerNode={handleExplorerRenameNode}
        onDeleteExplorerNode={handleExplorerDeleteNode}
        onCopyExplorerPath={handleExplorerCopyPath}
        onNewFile={handleNewFile}
        onNewFolder={handleNewFolder}
        loading={treeLoading}
        error={treeError}
        expandRevision={treeExpand.rev}
        pathsToExpand={treeExpand.paths}
        onExplorerGitMutated={refreshQuiet}
        onClosePrimarySidebar={() => persistLeftSidebar(false)}
      />
    ) : activity === "search" ? (
      <SearchSidePanel
        nodes={nodes}
        selectedPath={selectedPath}
        onSelectFile={(p, ev) => {
          onExplorerSelectFile(p, ev);
          setActivity("explorer");
        }}
      />
    ) : activity === "scm" ? (
      <ScmSidePanel
        root={root}
        git={git}
        nodes={nodes}
        treeLoading={treeLoading}
        treeError={treeError}
        onRefresh={refresh}
        onOpenFile={(p) => {
          onExplorerSelectFile(p);
          setActivity("explorer");
        }}
      />
    ) : activity === "extensions" ? (
      <ExtensionsSidePanel
        folders={folders}
        config={config}
        refreshServerConfig={refreshServerConfig}
        chatMode={session.chatMode}
        onChatModeChange={handleChatModeChange}
        streaming={session.streaming}
        hasWorkspace={!!root || folders.length > 0}
        focusWorkspaceFile={focusWorkspaceFileFromMenu}
        onOpenTeamsYaml={openTeamsYamlFromMenu}
        onFocusToolLog={() => focusToolTab("tool_log")}
        onTreeRefresh={refresh}
      />
    ) : activity === "planning" ? (
      <PlanningSidePanel
        chatMode={session.chatMode}
        onChatModeChange={handleChatModeChange}
        streaming={session.streaming}
        hasWorkspace={!!root || folders.length > 0}
        onNewPlanFile={() => void handleNewPlanFile()}
      />
    ) : (
      <SettingsSidePanel
        config={config}
        workspaceRoot={folders[0]?.path ?? root ?? ""}
        onOpenPiModelConfig={openPiModelConfigInEditor}
      />
    );

  // ── Claw shell ───────────────────────────────────────────────
  if (uiMode === "claw") {
    return (
      <>
        <input
          ref={workspaceFileInputRef}
          type="file"
          accept=".code-workspace,.json,application/json"
          className="hidden"
          aria-hidden
          onChange={onWorkspaceFileChange}
        />
        <div
          className={`flex min-h-0 w-full flex-col overflow-hidden font-sans selection:bg-[#9a3412] ${shellMobile ? "h-[100dvh] max-h-[100dvh]" : "h-[100dvh] max-h-[100dvh]"}`}
        >
          {shellMobile ? (
            <>
              <MobileChrome
                title="Claw"
                subtitle={rootLabel}
                onDesktopLayout={() => setShellMobile(false)}
              />
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <ClawApp
                  layoutVariant="mobile"
                  refreshTreeQuiet={refreshTreeQuietShell}
                  uiMode={uiMode}
                  setUiMode={setUiMode}
                  root={root || null}
                  rootLabel={rootLabel}
                  nodes={nodes}
                  treeLoading={treeLoading}
                  treeError={treeError}
                  refreshTree={refresh}
                  modelLabel={modelLabel}
                  config={config}
                  effectiveModel={session.effectiveModel}
                  onSelectLlmModel={session.setLlmModel}
                  selectedPath={selectedPath}
                  setSelectedPath={setSelectedPath}
                  content={content}
                  setContent={setContent}
                  persistEncoding={persistEncoding}
                  fileMimeType={fileMimeType}
                  fileLoading={fileLoading}
                  fileError={fileError}
                  dirty={dirty}
                  save={save}
                  discardUnsavedChanges={discardUnsavedChanges}
                  line={line}
                  col={col}
                  onCursor={onCursor}
                  rows={session.rows}
                  logs={session.logs}
                  chatTabs={session.chatTabs}
                  activeChatTabId={session.activeChatTabId}
                  onSelectChatTab={session.selectChatTab}
                  onCloseChatTab={session.closeChatTab}
                  onRenameChatTab={session.renameChatTab}
                  onNewSession={session.startNewSession}
                  streaming={session.streaming}
                  chatStreamUiEnabled={simpleChatStreamUiEnabled}
                  onChatStreamUiEnabledChange={
                    onSimpleChatStreamUiEnabledChange
                  }
                  chatQueuePending={session.chatQueuePending}
                  chatQueueItems={session.chatQueueItems}
                  editChatQueueItem={session.editChatQueueItem}
                  deleteChatQueueItem={session.deleteChatQueueItem}
                  forceChatQueueItem={session.forceChatQueueItem}
                  connected={session.connected}
                  error={session.error}
                  sendChat={session.sendChat}
                  stop={session.stop}
                  clearError={session.clearError}
                  onReopenLlmFixModal={reopenLlmFixModal}
                  chatAgentName={session.chatAgentName}
                  dispatchTurnAgent={session.dispatchTurnAgent}
                  onChatAgentChange={session.setChatAgent}
                  chatMode={session.chatMode}
                  onChatModeChange={handleChatModeChange}
                  activeTab={clawTab}
                  onTabChange={setClawTab}
                  providerConfigInitialPath={simpleProviderPath}
                  providerConfigInitialNonce={simpleProviderNonce}
                  onConsumeProviderConfigFocus={consumeSimpleProviderFocus}
                  workspaceEditorRef={workspaceEditorRef}
                  onUndoRedoStackChange={bumpEditorMenu}
                  onSelectionPrefsChange={bumpSelectionPrefs}
                  onFindInFiles={openWorkspaceSearch}
                  onReplaceInFiles={openWorkspaceSearch}
                  teamsYamlWritePath={teamsYamlWritePath}
                  workspaceReady={workspaceOperational}
                  onOpenTeamsYaml={openTeamsYamlFromMenu}
                  onCreateAgentDefinition={createNewAgentMarkdownFromMenu}
                  onNewPlanFile={() => void handleNewPlanFile()}
                  newPlanFileDisabled={!workspaceOperational}
                  onOpenIndexingDocs={() => setIndexingDocsOpen(true)}
                  onOpenHostDoctor={openHostDoctor}
                  onHelp={(section) => {
                    setClawHelpDefaultSection(section ?? null);
                    setClawHelpOpen(true);
                  }}
                  contextPct={session.tokenMeter.contextPct}
                  contextFillPct={
                    session.chatPulseMeters?.contextFillPct ?? null
                  }
                  tokensDown={session.tokenMeter.tokensDown}
                  tokensUp={session.tokenMeter.tokensUp}
                  contextTitle={session.tokenMeter.contextTitle}
                  tokensTitle={session.tokenMeter.tokensTitle}
                  onMoveFileToDirectory={handleExplorerMoveFile}
                  allowWorkspaceRootDrop={folders.length === 1}
                  clawMenuFileFocusRev={
                    shouldBumpClawMenuFileFocus
                      ? clawMenuFileFocusRev
                      : undefined
                  }
                />
              </div>
            </>
          ) : (
            <>
              <MenuBar
                modelLabel={modelLabel}
                uiMode={uiMode}
                onUiModeChange={setUiMode}
                config={config}
                onOpenCommandPalette={() => setCommandPaletteOpen(true)}
                onSave={saveAndRefresh}
                canSave={!!selectedPath && dirty}
                onRevertFile={() => void reload()}
                canRevert={!!selectedPath && dirty}
                onRefreshWorkspace={refresh}
                onCopyWorkspacePath={copyWorkspacePath}
                onSelectActivity={(a) => {
                  setUiMode("technical");
                  persistLeftSidebar(true);
                  setActivity(a);
                }}
                onFocusBottomTab={(t) => {
                  setUiMode("technical");
                  focusToolTab(t);
                }}
                fileMenu={fileMenu}
                editMenu={editMenu}
                selectionMenu={selectionMenu}
                goMenu={goMenu}
                runMenu={runMenu}
                terminalMenu={terminalMenu}
                helpMenu={helpMenu}
                onOpenAgentSetup={openAgentSetupFromMenu}
                onOpenAgentPermissions={() => setAgentPermissionsOpen(true)}
                settingsMenu={settingsMenuHandlers}
                onOpenTeamsYaml={openTeamsYamlFromMenu}
                onCreateAgentMarkdown={createNewAgentMarkdownFromMenu}
                onReloadAgents={agentsApi.reload}
                onOpenPiModelConfig={openPiModelConfigInSimpleBrains}
                chatSessionControls={{
                  mode: session.chatMode,
                  switchDisabled: session.streaming,
                  onSetMode: handleChatModeChange,
                }}
                onNewPlanFile={() => void handleNewPlanFile()}
                newPlanFileDisabled={!workspaceOperational}
                viewSimple={viewSimpleMenu ?? undefined}
              />
              <ClawApp
                refreshTreeQuiet={refreshTreeQuietShell}
                uiMode={uiMode}
                setUiMode={setUiMode}
                root={root || null}
                rootLabel={rootLabel}
                nodes={nodes}
                treeLoading={treeLoading}
                treeError={treeError}
                refreshTree={refresh}
                modelLabel={modelLabel}
                config={config}
                effectiveModel={session.effectiveModel}
                onSelectLlmModel={session.setLlmModel}
                selectedPath={selectedPath}
                setSelectedPath={setSelectedPath}
                content={content}
                setContent={setContent}
                persistEncoding={persistEncoding}
                fileMimeType={fileMimeType}
                fileLoading={fileLoading}
                fileError={fileError}
                dirty={dirty}
                save={save}
                discardUnsavedChanges={discardUnsavedChanges}
                line={line}
                col={col}
                onCursor={onCursor}
                rows={session.rows}
                logs={session.logs}
                chatTabs={session.chatTabs}
                activeChatTabId={session.activeChatTabId}
                onSelectChatTab={session.selectChatTab}
                onCloseChatTab={session.closeChatTab}
                onRenameChatTab={session.renameChatTab}
                onNewSession={session.startNewSession}
                streaming={session.streaming}
                chatStreamUiEnabled={simpleChatStreamUiEnabled}
                onChatStreamUiEnabledChange={onSimpleChatStreamUiEnabledChange}
                chatQueuePending={session.chatQueuePending}
                chatQueueItems={session.chatQueueItems}
                editChatQueueItem={session.editChatQueueItem}
                deleteChatQueueItem={session.deleteChatQueueItem}
                forceChatQueueItem={session.forceChatQueueItem}
                connected={session.connected}
                error={session.error}
                sendChat={session.sendChat}
                stop={session.stop}
                clearError={session.clearError}
                onReopenLlmFixModal={reopenLlmFixModal}
                chatAgentName={session.chatAgentName}
                dispatchTurnAgent={session.dispatchTurnAgent}
                onChatAgentChange={session.setChatAgent}
                chatMode={session.chatMode}
                onChatModeChange={handleChatModeChange}
                activeTab={clawTab}
                onTabChange={setClawTab}
                providerConfigInitialPath={simpleProviderPath}
                providerConfigInitialNonce={simpleProviderNonce}
                onConsumeProviderConfigFocus={consumeSimpleProviderFocus}
                workspaceEditorRef={workspaceEditorRef}
                onUndoRedoStackChange={bumpEditorMenu}
                onSelectionPrefsChange={bumpSelectionPrefs}
                onFindInFiles={openWorkspaceSearch}
                onReplaceInFiles={openWorkspaceSearch}
                teamsYamlWritePath={teamsYamlWritePath}
                workspaceReady={workspaceOperational}
                onOpenTeamsYaml={openTeamsYamlFromMenu}
                onCreateAgentDefinition={createNewAgentMarkdownFromMenu}
                onNewPlanFile={() => void handleNewPlanFile()}
                newPlanFileDisabled={!workspaceOperational}
                onOpenIndexingDocs={() => setIndexingDocsOpen(true)}
                onOpenHostDoctor={openHostDoctor}
                onHelp={(section) => {
                  setClawHelpDefaultSection(section ?? null);
                  setClawHelpOpen(true);
                }}
                contextPct={session.tokenMeter.contextPct}
                contextFillPct={session.chatPulseMeters?.contextFillPct ?? null}
                tokensDown={session.tokenMeter.tokensDown}
                tokensUp={session.tokenMeter.tokensUp}
                contextTitle={session.tokenMeter.contextTitle}
                tokensTitle={session.tokenMeter.tokensTitle}
                onMoveFileToDirectory={handleExplorerMoveFile}
                allowWorkspaceRootDrop={folders.length === 1}
                clawMenuFileFocusRev={
                  shouldBumpClawMenuFileFocus ? clawMenuFileFocusRev : undefined
                }
              />
            </>
          )}
        </div>
        <CommandPalette
          open={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          items={simpleCommandItems}
        />
        <LlmFixModal
          open={showLlmFixModal}
          onClose={dismissLlmFixModal}
          onClearError={session.clearError}
          errorMessage={session.error ?? ""}
          appearanceDark={llmFixModalAppearanceDark}
          uiMode={uiMode}
          onOpenSimpleAiBrains={openLlmFixSimpleBrains}
          onOpenProviderCatalog={openLlmFixProviderCatalog}
        />
        <HostDoctorModal
          open={hostDoctorOpen}
          onClose={() => setHostDoctorOpen(false)}
          appearanceDark={llmFixModalAppearanceDark}
          onWorkspaceFileSaved={() => void refresh()}
        />
        <IndexingDocsModal
          open={indexingDocsOpen}
          onClose={() => setIndexingDocsOpen(false)}
          appearanceDark={llmFixModalAppearanceDark}
        />
        <HonchoSettingsModal
          open={honchoSettingsOpen}
          onClose={() => setHonchoSettingsOpen(false)}
          appearanceDark={llmFixModalAppearanceDark}
          integrationDocUrl={`${WOP_PUBLIC_REPO_URL}/blob/main/docs/HONCHO_INTEGRATION.md`}
        />
        <NgrokSettingsModal
          open={ngrokSettingsOpen}
          onClose={() => setNgrokSettingsOpen(false)}
          appearanceDark={llmFixModalAppearanceDark}
          onOpenShareNgrokHelp={openShareNgrokFromSettings}
        />
        <AgentPermissionsModal
          open={agentPermissionsOpen}
          onClose={() => setAgentPermissionsOpen(false)}
          appearanceDark={llmFixModalAppearanceDark}
        />
        <NewWorkspaceFileModal
          open={newWorkspaceFileDraft != null}
          defaultPath={newWorkspaceFileDraft?.defaultPath ?? ""}
          initialContent={newWorkspaceFileDraft?.initialContent}
          onDismiss={() => setNewWorkspaceFileDraft(null)}
          onCreate={(path, ic) => {
            setNewWorkspaceFileDraft(null);
            void performCreateNewWorkspaceFile(path, ic);
          }}
          appearanceDark={llmFixModalAppearanceDark}
        />
        <LaunchConfigAddModal
          open={launchConfigAddOpen}
          onDismiss={() => setLaunchConfigAddOpen(false)}
          onPick={(id) => void appendLaunchConfigurationSnippet(id)}
          appearanceDark={llmFixModalAppearanceDark}
        />
        <InstallDebuggersModal
          open={installDebuggersModalOpen}
          onDismiss={() => setInstallDebuggersModalOpen(false)}
          appearanceDark={llmFixModalAppearanceDark}
        />
        <MitLicenseModal
          open={mitLicenseModalOpen}
          onDismiss={() => setMitLicenseModalOpen(false)}
          repoLicenseUrl={`${WOP_PUBLIC_REPO_URL}/blob/main/LICENSE`}
          appearanceDark={llmFixModalAppearanceDark}
        />
        <RestartServerModal
          open={restartServerModalOpen}
          onClose={() => setRestartServerModalOpen(false)}
          appearanceDark={llmFixModalAppearanceDark}
          onReconnectIfStillUp={session.reconnectWebSocket}
        />
        <ClawHelpModal
          open={clawHelpOpen}
          onDismiss={() => {
            setClawHelpOpen(false);
            setClawHelpDefaultSection(null);
          }}
          defaultSection={clawHelpDefaultSection}
          connected={session.connected}
          streaming={session.streaming}
          onGoToTelegramChannels={() => setClawTab("channels")}
          onFocusClawChatTab={() => setClawTab("chat")}
          layout={shellMobile ? "mobile" : "desktop"}
        />
        <NewPlanFileModal
          open={newPlanFileModalOpen}
          onDismiss={() => setNewPlanFileModalOpen(false)}
          onCreate={(title, slug) => void handleNewPlanFileCreate(title, slug)}
          appearanceDark={llmFixModalAppearanceDark}
        />
      </>
    );
  }

  // ── Simple shell ───────────────────────────────────────────────
  if (uiMode === "simple") {
    return (
      <>
        <input
          ref={workspaceFileInputRef}
          type="file"
          accept=".code-workspace,.json,application/json"
          className="hidden"
          aria-hidden
          onChange={onWorkspaceFileChange}
        />
        <div
          className={`flex min-h-0 w-full flex-col overflow-hidden bg-[#1e1e1e] font-sans text-[#cccccc] selection:bg-[#9a3412] ${shellMobile ? "h-[100dvh] max-h-[100dvh]" : "h-[100dvh] max-h-[100dvh]"}`}
        >
          {shellMobile ? (
            <MobileChrome
              title="Simple"
              subtitle={rootLabel}
              onDesktopLayout={() => setShellMobile(false)}
            />
          ) : (
            <MenuBar
              modelLabel={modelLabel}
              uiMode={uiMode}
              onUiModeChange={setUiMode}
              config={config}
              onOpenCommandPalette={() => setCommandPaletteOpen(true)}
              onSave={saveAndRefresh}
              canSave={!!selectedPath && dirty}
              onRevertFile={() => void reload()}
              canRevert={!!selectedPath && dirty}
              onRefreshWorkspace={refresh}
              onCopyWorkspacePath={copyWorkspacePath}
              onSelectActivity={(a) => {
                setUiMode("technical");
                persistLeftSidebar(true);
                setActivity(a);
              }}
              onFocusBottomTab={(t) => {
                setUiMode("technical");
                focusToolTab(t);
              }}
              fileMenu={fileMenu}
              editMenu={editMenu}
              selectionMenu={selectionMenu}
              goMenu={goMenu}
              runMenu={runMenu}
              terminalMenu={terminalMenu}
              helpMenu={helpMenu}
              onOpenAgentSetup={openAgentSetupFromMenu}
              onOpenAgentPermissions={() => setAgentPermissionsOpen(true)}
              settingsMenu={settingsMenuHandlers}
              onOpenTeamsYaml={openTeamsYamlFromMenu}
              onCreateAgentMarkdown={createNewAgentMarkdownFromMenu}
              onReloadAgents={agentsApi.reload}
              onOpenPiModelConfig={openPiModelConfigInSimpleBrains}
              chatSessionControls={{
                mode: session.chatMode,
                switchDisabled: session.streaming,
                onSetMode: handleChatModeChange,
              }}
              onNewPlanFile={() => void handleNewPlanFile()}
              newPlanFileDisabled={!workspaceOperational}
              viewSimple={viewSimpleMenu ?? undefined}
            />
          )}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <SimpleApp
              layoutVariant={shellMobile ? "mobile" : "desktop"}
              simpleMobileMenuFileFocusRev={
                shouldBumpSimpleMenuFileFocus
                  ? simpleMobileMenuFileFocusRev
                  : undefined
              }
              uiMode={uiMode}
              setUiMode={setUiMode}
              root={root || null}
              rootLabel={rootLabel}
              nodes={nodes}
              treeLoading={treeLoading}
              treeError={treeError}
              refreshTree={refresh}
              refreshTreeQuiet={refreshTreeQuietShell}
              modelLabel={modelLabel}
              config={config}
              effectiveModel={session.effectiveModel}
              onSelectLlmModel={session.setLlmModel}
              selectedPath={selectedPath}
              setSelectedPath={setSelectedPath}
              content={content}
              setContent={setContent}
              persistEncoding={persistEncoding}
              fileMimeType={fileMimeType}
              fileLoading={fileLoading}
              fileError={fileError}
              dirty={dirty}
              save={save}
              discardUnsavedChanges={discardUnsavedChanges}
              line={line}
              col={col}
              onCursor={onCursor}
              rows={session.rows}
              logs={session.logs}
              streaming={session.streaming}
              chatStreamUiEnabled={simpleChatStreamUiEnabled}
              onChatStreamUiEnabledChange={onSimpleChatStreamUiEnabledChange}
              chatQueuePending={session.chatQueuePending}
              chatQueueItems={session.chatQueueItems}
              editChatQueueItem={session.editChatQueueItem}
              deleteChatQueueItem={session.deleteChatQueueItem}
              forceChatQueueItem={session.forceChatQueueItem}
              connected={session.connected}
              error={session.error}
              sendChat={session.sendChat}
              stop={session.stop}
              clearError={session.clearError}
              onReopenLlmFixModal={reopenLlmFixModal}
              chatAgentName={session.chatAgentName}
              dispatchTurnAgent={session.dispatchTurnAgent}
              onChatAgentChange={session.setChatAgent}
              chatMode={session.chatMode}
              onChatModeChange={handleChatModeChange}
              activeTab={simpleTab}
              onTabChange={setSimpleTab}
              providerConfigInitialPath={simpleProviderPath}
              providerConfigInitialNonce={simpleProviderNonce}
              onConsumeProviderConfigFocus={consumeSimpleProviderFocus}
              workspaceEditorRef={workspaceEditorRef}
              onUndoRedoStackChange={bumpEditorMenu}
              onSelectionPrefsChange={bumpSelectionPrefs}
              onFindInFiles={openWorkspaceSearch}
              onReplaceInFiles={openWorkspaceSearch}
              teamsYamlWritePath={teamsYamlWritePath}
              workspaceReady={workspaceOperational}
              onOpenTeamsYaml={openTeamsYamlFromMenu}
              onCreateAgentDefinition={createNewAgentMarkdownFromMenu}
              onOpenFolder={handleOpenFolderPrompt}
              onOpenRecentFolder={handleOpenRecentFolder}
              recentFolders={recentFolders}
              onHelp={() => {
                setHowToUseInitialSection(null);
                setHowToUseModalOpen(true);
              }}
              onConfigRefresh={refreshServerConfig}
              onNewPlanFile={() => void handleNewPlanFile()}
              newPlanFileDisabled={!workspaceOperational}
              onOpenIndexingDocs={() => setIndexingDocsOpen(true)}
              contextPct={session.tokenMeter.contextPct}
              contextFillPct={session.chatPulseMeters?.contextFillPct ?? null}
              tokensDown={session.tokenMeter.tokensDown}
              tokensUp={session.tokenMeter.tokensUp}
              contextTitle={session.tokenMeter.contextTitle}
              tokensTitle={session.tokenMeter.tokensTitle}
              planHandoffWorkspaceKey={planHandoffWorkspaceKey}
              onMoveFileToDirectory={handleExplorerMoveFile}
              allowWorkspaceRootDrop={folders.length === 1}
            />
          </div>
        </div>
        <CommandPalette
          open={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          items={simpleCommandItems}
        />
        <LlmFixModal
          open={showLlmFixModal}
          onClose={dismissLlmFixModal}
          onClearError={session.clearError}
          errorMessage={session.error ?? ""}
          appearanceDark={llmFixModalAppearanceDark}
          uiMode={uiMode}
          onOpenSimpleAiBrains={openLlmFixSimpleBrains}
          onOpenProviderCatalog={openLlmFixProviderCatalog}
        />
        <HostDoctorModal
          open={hostDoctorOpen}
          onClose={() => setHostDoctorOpen(false)}
          appearanceDark={llmFixModalAppearanceDark}
          onWorkspaceFileSaved={() => void refresh()}
        />
        <IndexingDocsModal
          open={indexingDocsOpen}
          onClose={() => setIndexingDocsOpen(false)}
          appearanceDark={llmFixModalAppearanceDark}
        />
        <HonchoSettingsModal
          open={honchoSettingsOpen}
          onClose={() => setHonchoSettingsOpen(false)}
          appearanceDark={llmFixModalAppearanceDark}
          integrationDocUrl={`${WOP_PUBLIC_REPO_URL}/blob/main/docs/HONCHO_INTEGRATION.md`}
        />
        <NgrokSettingsModal
          open={ngrokSettingsOpen}
          onClose={() => setNgrokSettingsOpen(false)}
          appearanceDark={llmFixModalAppearanceDark}
          onOpenShareNgrokHelp={openShareNgrokFromSettings}
        />
        <AgentPermissionsModal
          open={agentPermissionsOpen}
          onClose={() => setAgentPermissionsOpen(false)}
          appearanceDark={llmFixModalAppearanceDark}
        />
        <NewWorkspaceFileModal
          open={newWorkspaceFileDraft != null}
          defaultPath={newWorkspaceFileDraft?.defaultPath ?? ""}
          initialContent={newWorkspaceFileDraft?.initialContent}
          onDismiss={() => setNewWorkspaceFileDraft(null)}
          onCreate={(path, ic) => {
            setNewWorkspaceFileDraft(null);
            void performCreateNewWorkspaceFile(path, ic);
          }}
          appearanceDark={llmFixModalAppearanceDark}
        />
        <NewPlanFileModal
          open={newPlanFileModalOpen}
          onDismiss={() => setNewPlanFileModalOpen(false)}
          onCreate={(title, slug) => void handleNewPlanFileCreate(title, slug)}
          appearanceDark={llmFixModalAppearanceDark}
        />
        <LaunchConfigAddModal
          open={launchConfigAddOpen}
          onDismiss={() => setLaunchConfigAddOpen(false)}
          onPick={(id) => void appendLaunchConfigurationSnippet(id)}
          appearanceDark={llmFixModalAppearanceDark}
        />
        <InstallDebuggersModal
          open={installDebuggersModalOpen}
          onDismiss={() => setInstallDebuggersModalOpen(false)}
          appearanceDark={llmFixModalAppearanceDark}
        />
        <MitLicenseModal
          open={mitLicenseModalOpen}
          onDismiss={() => setMitLicenseModalOpen(false)}
          repoLicenseUrl={`${WOP_PUBLIC_REPO_URL}/blob/main/LICENSE`}
          appearanceDark={llmFixModalAppearanceDark}
        />
        <RestartServerModal
          open={restartServerModalOpen}
          onClose={() => setRestartServerModalOpen(false)}
          appearanceDark={llmFixModalAppearanceDark}
          onReconnectIfStillUp={session.reconnectWebSocket}
        />
        <HowToUseModal
          open={howToUseModalOpen}
          onDismiss={() => {
            setHowToUseModalOpen(false);
            setHowToUseInitialSection(null);
          }}
          initialSectionId={howToUseInitialSection}
          repoBlobBase={`${WOP_PUBLIC_REPO_URL}/blob/main`}
        />
      </>
    );
  }

  const workspaceEditorBody = isWsMulti ? (
    <TechnicalWorkspaceGrid
      grid={workspaceGrid}
      onPatchCell={patchWorkspaceCellDock}
      focusedCell={wsFocusedCell}
      onFocusCell={setWsFocusedCell}
      onFocusedReport={onTechFocusedReport}
      onFocusedCursor={onTechFocusedCursor}
      workspaceEditorRef={workspaceEditorRef}
      logs={session.logs}
      fileActions={workspaceDockFileActions}
      onOpenToolPanelForCell={onOpenToolPanelForCell}
      onOpenWorkspace={refresh}
      workspaceDockActions={workspaceDockActionsMain}
      wordWrap={chrome.editorWordWrap}
      showBreadcrumbs={chrome.breadcrumbsVisible}
      onFindInFiles={openWorkspaceSearch}
      onReplaceInFiles={openWorkspaceSearch}
      onUndoRedoStackChange={bumpEditorMenu}
      onSelectionPrefsChange={bumpSelectionPrefs}
      refresh={refresh}
      autoSave={autoSave}
      externalOpenFile={workspaceOpenSignal}
      externalCloseEditor={workspaceCloseEditorSignal}
      onWorkspaceSurfaceDrop={onWorkspaceSurfaceDrop}
      onSplitEditorRight={splitEditorRight}
      splitEditorDisabled={workspaceGrid.cols >= WORKSPACE_GRID_MAX_COLS}
      maximizedCell={wsMaximizedCell}
      onToggleMaximizeCell={onToggleWorkspaceMaximizeCell}
      onRemoveWorkspaceCell={removeWorkspaceCellFromGrid}
      workspaceGridPicker={workspaceGridToolbar}
      agentTeamPane={agentTeamWorkspacePane}
      workspaceEmbeddedChat={workspaceEmbeddedChat}
      onCrossCellTabMoveBetweenCells={movePanelTabBetweenCells}
      onWorkspaceGridRowResize={onWorkspaceGridRowResize}
      onWorkspaceGridColResize={onWorkspaceGridColResize}
      onBindMultiCellSaveApi={onBindMultiCellSaveApi}
      onMultiCellAnyDirtyChange={onMultiCellAnyDirtyChange}
      breadcrumbWorkspaceLabel={rootLabel || null}
      workspaceTreeNodes={nodes}
      refreshQuiet={refreshQuiet}
    />
  ) : (
    <WorkspaceCellDropSurface
      cellIndex={0}
      cols={1}
      rows={1}
      onDropPayload={onWorkspaceSurfaceDrop}
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      <WorkspacePane
        ref={workspaceEditorRef}
        tabs={panelDock.tabs}
        activeIndex={panelDock.activeIndex}
        onActiveIndexChange={setWorkspaceActiveIndex}
        onSelectFileTab={onSelectFileFromWorkspaceTab}
        onReorderTab={onDockEntryMove}
        onCloseTab={onDockEntryClose}
        onAddTool={onOpenToolPanel}
        fileActions={workspaceDockFileActions}
        logs={session.logs}
        editorPath={selectedPath}
        content={content}
        onChange={setContent}
        loading={fileLoading}
        error={fileError}
        dirty={dirty}
        persistEncoding={persistEncoding}
        filePreview={workspaceCenterFilePreview}
        onSave={async () => {
          const ok = await save();
          if (ok) await refresh();
        }}
        onDiscardUnsaved={discardUnsavedChanges}
        onCursor={onCursor}
        compact
        showExplorerHint={false}
        onOpenWorkspace={refresh}
        workspaceDockActions={workspaceDockActionsMain}
        wordWrap={chrome.editorWordWrap}
        showBreadcrumbs={chrome.breadcrumbsVisible}
        onFindInFiles={openWorkspaceSearch}
        onReplaceInFiles={openWorkspaceSearch}
        onUndoRedoStackChange={bumpEditorMenu}
        onSelectionPrefsChange={bumpSelectionPrefs}
        dndSourceCellIndex={0}
        onExternalFileDrop={(path, before) => {
          setPanelDock((prev) => {
            const next = applyAddFileTab(prev, path);
            const moving: PanelTab = { type: "file", path };
            return applyPanelTabMove(next, moving, before);
          });
        }}
        onSplitEditorRight={splitEditorRight}
        splitEditorDisabled={workspaceGrid.cols >= WORKSPACE_GRID_MAX_COLS}
        workspaceGridPicker={workspaceGridToolbar}
        agentTeamPane={agentTeamWorkspacePane}
        workspaceEmbeddedChat={workspaceEmbeddedChat}
        breadcrumbWorkspaceLabel={rootLabel || null}
        gitFileReviewActions={workspaceGitFileReviewActions}
        gitReviewHasAnyMarked={gitReviewHasAnyMarked}
        gitReviewCanAdvanceNext={gitReviewCanAdvanceNext}
      />
    </WorkspaceCellDropSurface>
  );

  return (
    <WorkspaceStaticAnalysisProvider value={workspaceStaticAnalysisApi}>
      {uiMode === "technical" && shellMobile ? (
        <>
          <input
            ref={workspaceFileInputRef}
            type="file"
            accept=".code-workspace,.json,application/json"
            className="hidden"
            aria-hidden
            onChange={onWorkspaceFileChange}
          />
          <MobileTechnicalShell
            subtitle={rootLabel}
            onDesktopLayout={() => setShellMobile(false)}
          />
        </>
      ) : (
        <div
          data-ui-mode={uiMode}
          className="flex h-[100dvh] max-h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-[#1e1e1e] font-sans text-[#cccccc] selection:bg-[#9a3412] wop-density-compact"
        >
          <input
            ref={workspaceFileInputRef}
            type="file"
            accept=".code-workspace,.json,application/json"
            className="hidden"
            aria-hidden
            onChange={onWorkspaceFileChange}
          />
          {chrome.menuBarVisible ? (
            <MenuBar
              modelLabel={modelLabel}
              uiMode={uiMode}
              onUiModeChange={setUiMode}
              config={config}
              onOpenCommandPalette={() => setCommandPaletteOpen(true)}
              onSave={saveAndRefresh}
              canSave={!!effSelectedPath && effDirty}
              onRevertFile={() => void reloadFocusedOrMain()}
              canRevert={!!effSelectedPath && effDirty}
              onRefreshWorkspace={refresh}
              onCopyWorkspacePath={copyWorkspacePath}
              onSelectActivity={selectActivityWithSidebar}
              technicalActivity={activity}
              onFocusBottomTab={focusToolTab}
              leftSidebarVisible={leftSidebarVisible}
              onToggleLeftSidebar={toggleLeftSidebar}
              agentPanelVisible={dockLayout.agentPanelVisible}
              agentChatDock={dockLayout.chatDock}
              onSetAgentChatDock={(r) =>
                updateDockLayout((d) => ({
                  ...d,
                  chatDock: r,
                  agentPanelVisible: true,
                  chatSizePx: chatSizePxWhenSwitchingDock(
                    d.chatDock,
                    r,
                    d.chatSizePx,
                  ),
                }))
              }
              onToggleAgentPanel={() =>
                updateDockLayout((d) => ({
                  ...d,
                  agentPanelVisible: !d.agentPanelVisible,
                }))
              }
              fileMenu={fileMenu}
              editMenu={editMenu}
              selectionMenu={selectionMenu}
              goMenu={goMenu}
              runMenu={runMenu}
              terminalMenu={terminalMenu}
              helpMenu={helpMenu}
              onOpenAgentSetup={openAgentSetupFromMenu}
              onOpenAgentPermissions={() => setAgentPermissionsOpen(true)}
              settingsMenu={settingsMenuHandlers}
              onOpenTeamsYaml={openTeamsYamlFromMenu}
              onCreateAgentMarkdown={createNewAgentMarkdownFromMenu}
              onReloadAgents={agentsApi.reload}
              onOpenPiModelConfig={openPiModelConfigInEditor}
              chatSessionControls={{
                mode: session.chatMode,
                switchDisabled: session.streaming,
                onSetMode: handleChatModeChange,
              }}
              onNewPlanFile={() => void handleNewPlanFile()}
              newPlanFileDisabled={!workspaceOperational}
              viewTechnical={viewTechnicalOptions}
            />
          ) : (
            <div className="flex h-8 shrink-0 items-center gap-2 border-b border-[#252526] bg-[#2d2d2d] px-2">
              <button
                type="button"
                onClick={() =>
                  setChrome((c) => ({ ...c, menuBarVisible: true }))
                }
                className="rounded px-2 py-0.5 text-[11px] text-[#fed7aa] hover:bg-[#3c3c3c]"
              >
                ⋯ Show menu bar
              </button>
              {zenMode ? (
                <button
                  type="button"
                  onClick={() => exitZen()}
                  className="rounded px-2 py-0.5 text-[11px] text-[#ce9178] hover:bg-[#3c3c3c]"
                >
                  Exit Zen (Esc)
                </button>
              ) : null}
            </div>
          )}

          <CommandPalette
            open={commandPaletteOpen}
            onClose={() => setCommandPaletteOpen(false)}
            items={commandItems}
          />
          <LlmFixModal
            open={showLlmFixModal}
            onClose={dismissLlmFixModal}
            onClearError={session.clearError}
            errorMessage={session.error ?? ""}
            appearanceDark={llmFixModalAppearanceDark}
            uiMode={uiMode}
            onOpenSimpleAiBrains={openLlmFixSimpleBrains}
            onOpenProviderCatalog={openLlmFixProviderCatalog}
          />
          <HostDoctorModal
            open={hostDoctorOpen}
            onClose={() => setHostDoctorOpen(false)}
            appearanceDark={llmFixModalAppearanceDark}
            onWorkspaceFileSaved={() => void refresh()}
          />
          <IndexingDocsModal
            open={indexingDocsOpen}
            onClose={() => setIndexingDocsOpen(false)}
            appearanceDark={llmFixModalAppearanceDark}
          />
          <HonchoSettingsModal
            open={honchoSettingsOpen}
            onClose={() => setHonchoSettingsOpen(false)}
            appearanceDark={llmFixModalAppearanceDark}
            integrationDocUrl={`${WOP_PUBLIC_REPO_URL}/blob/main/docs/HONCHO_INTEGRATION.md`}
          />
          <NgrokSettingsModal
            open={ngrokSettingsOpen}
            onClose={() => setNgrokSettingsOpen(false)}
            appearanceDark={llmFixModalAppearanceDark}
            onOpenShareNgrokHelp={openShareNgrokFromSettings}
          />
          <AgentPermissionsModal
            open={agentPermissionsOpen}
            onClose={() => setAgentPermissionsOpen(false)}
            appearanceDark={llmFixModalAppearanceDark}
          />
          <NewWorkspaceFileModal
            open={newWorkspaceFileDraft != null}
            defaultPath={newWorkspaceFileDraft?.defaultPath ?? ""}
            initialContent={newWorkspaceFileDraft?.initialContent}
            onDismiss={() => setNewWorkspaceFileDraft(null)}
            onCreate={(path, ic) => {
              setNewWorkspaceFileDraft(null);
              void performCreateNewWorkspaceFile(path, ic);
            }}
            appearanceDark={llmFixModalAppearanceDark}
          />
          <NewPlanFileModal
            open={newPlanFileModalOpen}
            onDismiss={() => setNewPlanFileModalOpen(false)}
            onCreate={(title, slug) =>
              void handleNewPlanFileCreate(title, slug)
            }
            appearanceDark={llmFixModalAppearanceDark}
          />
          <LaunchConfigAddModal
            open={launchConfigAddOpen}
            onDismiss={() => setLaunchConfigAddOpen(false)}
            onPick={(id) => void appendLaunchConfigurationSnippet(id)}
            appearanceDark={llmFixModalAppearanceDark}
          />
          <InstallDebuggersModal
            open={installDebuggersModalOpen}
            onDismiss={() => setInstallDebuggersModalOpen(false)}
            appearanceDark={llmFixModalAppearanceDark}
          />
          <MitLicenseModal
            open={mitLicenseModalOpen}
            onDismiss={() => setMitLicenseModalOpen(false)}
            repoLicenseUrl={`${WOP_PUBLIC_REPO_URL}/blob/main/LICENSE`}
            appearanceDark={llmFixModalAppearanceDark}
          />
          <RestartServerModal
            open={restartServerModalOpen}
            onClose={() => setRestartServerModalOpen(false)}
            appearanceDark={llmFixModalAppearanceDark}
            onReconnectIfStillUp={session.reconnectWebSocket}
          />
          <HowToUseModal
            open={howToUseModalOpen}
            onDismiss={() => {
              setHowToUseModalOpen(false);
              setHowToUseInitialSection(null);
            }}
            initialSectionId={howToUseInitialSection}
            repoBlobBase={`${WOP_PUBLIC_REPO_URL}/blob/main`}
          />

          <div
            className="flex min-h-0 flex-1 overflow-hidden"
            style={{ zoom: chrome.uiZoomPercent / 100 }}
          >
            {!zenMode ? (
              <div className="hidden md:contents">
                <ActivityBar
                  active={activity}
                  onSelect={selectActivityWithSidebar}
                />
              </div>
            ) : null}
            {leftSidebarVisible ? (
              <>
                <TechnicalPrimarySidebar
                  widthPx={dockLayout.leftSidebarWidthPx}
                >
                  {leftPanel}
                </TechnicalPrimarySidebar>
                <DockSplitHandle
                  orientation="vertical"
                  ariaLabel="Resize primary sidebar"
                  onDelta={(dx) =>
                    updateDockLayout((d) => ({
                      ...d,
                      leftSidebarWidthPx: clampLeftSidebarWidth(
                        d.leftSidebarWidthPx + dx,
                      ),
                    }))
                  }
                />
              </>
            ) : null}

            <main
              className={`flex min-w-0 flex-1 flex-col bg-[#1e1e1e] ${chrome.centeredEditorLayout ? "mx-auto w-full max-w-[1400px]" : ""}`}
            >
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex min-h-0 flex-1 overflow-hidden">
                  {dockLayout.agentPanelVisible &&
                  dockLayout.chatDock === "right" ? (
                    <>
                      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                        {workspaceEditorBody}
                      </div>
                      <DockSplitHandle
                        orientation="vertical"
                        ariaLabel="Resize editor vs agent panel width"
                        onDelta={(dx) =>
                          updateDockLayout((d) => ({
                            ...d,
                            /* Pointer right (+dx) → vertical edge follows cursor → wider editor, narrower agent. */
                            chatSizePx: clampChatWidth(d.chatSizePx - dx),
                          }))
                        }
                      />
                      <div
                        className="flex min-h-0 shrink-0 flex-col overflow-hidden"
                        style={{
                          width: dockLayout.chatSizePx,
                          minWidth: 220,
                          maxWidth: 1280,
                        }}
                      >
                        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border border-[#3c3c3c] bg-[#1e1e1e]">
                          <ChatPanel
                            uiMode={uiMode}
                            rows={session.rows}
                            chatTabs={session.chatTabs}
                            activeChatTabId={session.activeChatTabId}
                            onSelectChatTab={session.selectChatTab}
                            onCloseChatTab={session.closeChatTab}
                            streaming={session.streaming}
                            connected={session.connected}
                            error={session.error}
                            onSend={session.sendChat}
                            onStop={session.stop}
                            onClearError={session.clearError}
                            onReopenLlmFixModal={reopenLlmFixModal}
                            onNewSession={session.startNewSession}
                            chatMode={session.chatMode}
                            onChatModeChange={handleChatModeChange}
                            agents={agentsApi.data?.agents ?? []}
                            agentsLoading={agentsApi.loading}
                            agentTeams={agentsApi.data?.teams ?? {}}
                            onOpenAgentTeamInPane={openTeamPulseInAgentDock}
                            openTeamPulseSignal={teamPulseDockSignal}
                            onEditTeam={openAgentSetupFromMenu}
                            chatAgentName={session.chatAgentName}
                            dispatchTurnAgent={session.dispatchTurnAgent}
                            onChatAgentChange={session.setChatAgent}
                            chatQueuePending={session.chatQueuePending}
                            chatQueueItems={session.chatQueueItems}
                            editChatQueueItem={session.editChatQueueItem}
                            deleteChatQueueItem={session.deleteChatQueueItem}
                            forceChatQueueItem={session.forceChatQueueItem}
                            chatPulseMeters={session.chatPulseMeters}
                            contextTitle={session.tokenMeter.contextTitle}
                            sessionTokenSummary={teamPulseSessionTokenSummary}
                            dockPanelFrame
                            onOpenPlanFileForReview={openPlanFileForReview}
                            planHandoffWorkspaceKey={planHandoffWorkspaceKey}
                            technicalDock={{
                              region: "right",
                              sizePx: dockLayout.chatSizePx,
                              onSetRegion: (r) =>
                                updateDockLayout((d) => ({
                                  ...d,
                                  chatDock: r,
                                  chatSizePx: chatSizePxWhenSwitchingDock(
                                    d.chatDock,
                                    r,
                                    d.chatSizePx,
                                  ),
                                })),
                              onHidePanel: () =>
                                updateDockLayout({ agentPanelVisible: false }),
                            }}
                          />
                        </div>
                      </div>
                    </>
                  ) : dockLayout.agentPanelVisible &&
                    dockLayout.chatDock === "bottom" ? (
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                        {workspaceEditorBody}
                      </div>
                      <DockSplitHandle
                        orientation="horizontal"
                        ariaLabel="Resize agent session doc height"
                        onDelta={(_dx, dy) =>
                          updateDockLayout((d) => ({
                            ...d,
                            chatSizePx: clampChatHeight(d.chatSizePx - dy),
                          }))
                        }
                      />
                      <div
                        className="flex min-h-0 shrink-0 flex-col overflow-hidden"
                        style={{
                          height: dockLayout.chatSizePx,
                          minHeight: 120,
                          maxHeight: 720,
                        }}
                      >
                        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border border-[#3c3c3c] bg-[#1e1e1e]">
                          <ChatPanel
                            uiMode={uiMode}
                            rows={session.rows}
                            chatTabs={session.chatTabs}
                            activeChatTabId={session.activeChatTabId}
                            onSelectChatTab={session.selectChatTab}
                            onCloseChatTab={session.closeChatTab}
                            streaming={session.streaming}
                            connected={session.connected}
                            error={session.error}
                            onSend={session.sendChat}
                            onStop={session.stop}
                            onClearError={session.clearError}
                            onReopenLlmFixModal={reopenLlmFixModal}
                            onNewSession={session.startNewSession}
                            chatMode={session.chatMode}
                            onChatModeChange={handleChatModeChange}
                            agents={agentsApi.data?.agents ?? []}
                            agentsLoading={agentsApi.loading}
                            agentTeams={agentsApi.data?.teams ?? {}}
                            onOpenAgentTeamInPane={openTeamPulseInAgentDock}
                            openTeamPulseSignal={teamPulseDockSignal}
                            onEditTeam={openAgentSetupFromMenu}
                            chatAgentName={session.chatAgentName}
                            dispatchTurnAgent={session.dispatchTurnAgent}
                            onChatAgentChange={session.setChatAgent}
                            chatQueuePending={session.chatQueuePending}
                            chatQueueItems={session.chatQueueItems}
                            editChatQueueItem={session.editChatQueueItem}
                            deleteChatQueueItem={session.deleteChatQueueItem}
                            forceChatQueueItem={session.forceChatQueueItem}
                            chatPulseMeters={session.chatPulseMeters}
                            contextTitle={session.tokenMeter.contextTitle}
                            sessionTokenSummary={teamPulseSessionTokenSummary}
                            dockPanelFrame
                            onOpenPlanFileForReview={openPlanFileForReview}
                            planHandoffWorkspaceKey={planHandoffWorkspaceKey}
                            technicalDock={{
                              region: "bottom",
                              sizePx: dockLayout.chatSizePx,
                              onSetRegion: (r) =>
                                updateDockLayout((d) => ({
                                  ...d,
                                  chatDock: r,
                                  chatSizePx: chatSizePxWhenSwitchingDock(
                                    d.chatDock,
                                    r,
                                    d.chatSizePx,
                                  ),
                                })),
                              onHidePanel: () =>
                                updateDockLayout({ agentPanelVisible: false }),
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
                      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                        {workspaceEditorBody}
                      </div>
                      <button
                        type="button"
                        title="Show agent panel"
                        aria-label="Show agent panel"
                        onClick={() =>
                          updateDockLayout({ agentPanelVisible: true })
                        }
                        className="flex w-7 shrink-0 flex-col items-center justify-center gap-1 border-l border-[#252526] bg-[#333333] py-2 text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]"
                      >
                        <MessageSquare
                          size={16}
                          className="shrink-0 opacity-90"
                        />
                        <span
                          className="max-w-[1.25rem] text-center font-mono text-[8px] uppercase leading-tight tracking-tight text-[#858585]"
                          style={{
                            writingMode: "vertical-rl",
                            textOrientation: "mixed",
                          }}
                        >
                          Agents
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </main>
          </div>

          {chrome.statusBarVisible ? (
            <StatusBar
              uiMode={uiMode}
              workspaceRoot={(folders[0]?.path ?? root) || "—"}
              connected={session.connected}
              line={line}
              col={col}
              language={languageFromPath(selectedPath)}
              contextPct={session.tokenMeter.contextPct}
              tokensDown={session.tokenMeter.tokensDown}
              tokensUp={session.tokenMeter.tokensUp}
              contextTitle={session.tokenMeter.contextTitle}
              tokensTitle={session.tokenMeter.tokensTitle}
              onCopyWorkspacePath={copyWorkspacePath}
              chatMode={session.chatMode}
              chatAgentName={session.chatAgentName}
              technicalZedStrip={technicalZedStrip}
              technicalToolDock={{
                onReveal: (id) => focusToolTab(id),
                isVisible: (id) =>
                  toolTabVisible(dockForZedStrip, id as ToolTabId),
              }}
              diagnosticsSummary={
                staticAnalysisEnabled
                  ? {
                      total: workspaceStaticAnalysis.totalCount,
                      errors: workspaceStaticAnalysis.errorCount,
                      warnings: workspaceStaticAnalysis.warningCount,
                      onOpenProblems: () => focusToolTab("problems"),
                    }
                  : null
              }
            />
          ) : null}
        </div>
      )}
    </WorkspaceStaticAnalysisProvider>
  );
}
