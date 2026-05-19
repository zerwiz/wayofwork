import type { UiViewCatalogEntry } from "./uiViewsCatalog";
import type { PanelTab, PanelDockLayout } from "../utils/panelDockLayout";

export type TechnicalActivity = "explorer" | "search" | "scm" | "extensions" | "planning" | "settings";

export type ChatDockRegion = "right" | "bottom";

export type BottomPanelTab =
	| "problems"
	| "output"
	| "tool_log"
	| "agent_log"
	| "terminal"
	| "agent_team"
	| "agent_chat";

export interface TechnicalWorkspaceCellSnapshot {
	cellIndex: number;
	selectedPath: string | null;
	dirty: boolean;
	loading: boolean;
	error: string | null;
}

export interface WorkspaceGridState {
	cols: number;
	rows: number;
	cells: PanelDockLayout[];
	rowWeights?: number[];
	colWeights?: number[];
}

export interface ViewMenuSimpleOptions {
	catalog: any[];
	catalogRelPath: string;
	catalogSource: string;
	catalogLoading: boolean;
	catalogError: string | null;
	catalogParseWarning: string | null;
	onSeedViewsCatalog: () => Promise<void>;
	onEditCatalog: () => void;
	onOpenSchemaDoc: () => void;
	onActivateEntry: (e: UiViewCatalogEntry) => void;
	onOpenAppearanceSettings: () => void;
	onToggleFullScreen: () => Promise<void>;
}

export interface ViewMenuTechnicalOptions {
	leftSidebarVisible: boolean;
	onToggleLeftSidebar: () => void;
	editorLayout: string;
	onSetEditorLayout: (l: string) => void;
	zenMode: boolean;
	onToggleZenMode: () => void;
	onEnterZen: () => void;
	onExitZen: () => void;
	statusBarVisible: boolean;
	onToggleStatusBar: () => void;
	menuBarVisible: boolean;
	onToggleMenuBar: () => void;
	breadcrumbsVisible: boolean;
	onToggleBreadcrumbs: () => void;
	wordWrap: boolean;
	onToggleWordWrap: () => void;
	centeredEditorLayout: boolean;
	onToggleCenteredEditorLayout: () => void;
	centeredLayout?: boolean; // Legacy compat
	onToggleCenteredLayout?: () => void;
	zoomLevel: number;
	onZoomIn: () => void;
	onZoomOut: () => void;
	onZoomReset: () => void;
	onResetZoom: () => void;
	onOpenAppearanceSettings: () => void;
	onToggleFullScreen: () => Promise<void>;
	onApplyLayoutPreset: (preset: string) => void;
	onNormalView: () => void;
	onFlipLayout: () => void;
	uiZoomPercent: number;
}

export type { PanelTab };
