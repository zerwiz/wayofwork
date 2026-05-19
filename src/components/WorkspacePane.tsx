/**
 * **One** workspace pane (Zed-style): a single tab row and one body that hosts **files**, **terminal**,
 * **problems**, etc. Multiple panes later = mount several `WorkspacePane` instances in a split layout — same component.
 */
import {
	AlertCircle,
	Bot,
	Braces,
	ChevronLeft,
	ChevronRight,
	Columns2,
	FileCode2,
	FolderOpen,
	GripVertical,
	Maximize2,
	MessageSquare,
	ScrollText,
	TerminalSquare,
	Users,
	X,
} from "lucide-react";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { AgentMeta } from "../hooks/useAgents";
import type { FilePersistEncoding } from "../hooks/useFileEditor";
import type { FilePreview } from "../types/workspaceFile";
import { filePreviewSupportsSourceToggle } from "../utils/workspaceFilePreview";
import type { ChatPulseMeters, ChatRow, LogRow } from "../hooks/useWayOfPiSession";
import type { BottomPanelTab } from "../types/technicalShell";
import type { WorkspaceEditorRef } from "../types/workspaceEditor";
import {
	PANEL_TAB_DND_TYPE,
	parseFilePathDragJson,
	parsePanelTabJson,
	serializePanelTab,
	tabsEqual,
	WOP_DND_SOURCE_CELL_TYPE,
	WOP_FILE_PATH_DND_TYPE,
	WOP_WORKSPACE_PANE_DND_TYPE,
	serializeWorkspacePaneCellIndex,
	type PanelTab,
	type ToolTabId,
} from "../utils/panelDockLayout";
import { dataTransferHasType } from "../utils/dataTransferTypes";
import { DockZoneAddMenu, type DockFileActionItem } from "./dockToolAddMenu";
import { WorkspaceGridLayoutPicker, type WorkspaceGridPickerConfig } from "./WorkspaceGridLayoutPicker";
import { ToolPanelBody } from "./ToolPanelBody";
import { WorkspaceAgentTeamPane } from "./WorkspaceAgentTeamPane";
import { MarkdownPreviewPane } from "./MarkdownPreviewPane";
import { MermaidPreviewPane } from "./MermaidPreviewPane";
import { WorkspaceSvgPreview } from "./WorkspaceSvgPreview";
import {
	WOP_WORKSPACE_EDITOR_GUTTER_DARK,
	WOP_WORKSPACE_EDITOR_SCROLL_DARK,
	WOP_WORKSPACE_EDITOR_TEXTAREA_DARK,
} from "../constants/workspaceEditorChrome";
import { WorkspaceTextBuffer } from "./WorkspaceTextBuffer";
import { firstMarkdownHeadingLine, workspacePathBreadcrumbSegments } from "../utils/workspaceEditorChrome";

const TAB_LABELS: Record<ToolTabId, string> = {
	problems: "Problems",
	output: "Output",
	tool_log: "Tool Log",
	agent_log: "Agent Log",
	terminal: "Terminal",
	agent_team: "Team pulse",
	agent_chat: "Agent chat",
};

function entryLabel(e: PanelTab): string {
	if (e.type === "tool") return TAB_LABELS[e.id];
	const parts = e.path.split("/");
	return parts[parts.length - 1] || e.path;
}

function entryKey(e: PanelTab): string {
	return e.type === "tool" ? `tool:${e.id}` : `file:${e.path}`;
}

/** Zed-style: `drop_target_border` — show where the tab will land (between tabs / VS Code–style gap). */
type DropHint = { kind: "before"; tab: PanelTab } | { kind: "append" };

function PanelTabIcon({ entry, active }: { entry: PanelTab; active: boolean }) {
	const iconClass = `shrink-0 ${active ? "text-[#cccccc]" : "text-[#858585]"}`;
	if (entry.type === "file") {
		return <FileCode2 size={14} className="shrink-0 text-[#519aba]" aria-hidden />;
	}
	switch (entry.id) {
		case "problems":
			return <AlertCircle size={14} className={iconClass} aria-hidden />;
		case "output":
			return <Braces size={14} className={iconClass} aria-hidden />;
		case "tool_log":
			return <ScrollText size={14} className={iconClass} aria-hidden />;
		case "agent_log":
			return <Bot size={14} className={iconClass} aria-hidden />;
		case "terminal":
			return <TerminalSquare size={14} className={iconClass} aria-hidden />;
		case "agent_team":
			return <Users size={14} className={iconClass} aria-hidden />;
		case "agent_chat":
			return <MessageSquare size={14} className={active ? "text-[#cccccc]" : "text-[#858585]"} aria-hidden />;
	}
}

export type WorkspacePaneProps = {
	tabs: PanelTab[];
	activeIndex: number;
	onActiveIndexChange: (index: number) => void;
	onSelectFileTab: (path: string) => void;
	onReorderTab: (moving: PanelTab, before: PanelTab | null) => void;
	onCloseTab: (entry: PanelTab) => void;
	onAddTool: (tab: BottomPanelTab) => void;
	fileActions: DockFileActionItem[];
	logs: LogRow[];
	/** Path loaded in `useFileEditor` — when the active tab is a file, it should match for the buffer to show. */
	editorPath: string | null;
	content: string;
	onChange: (next: string) => void;
	loading: boolean;
	error: string | null;
	dirty: boolean;
	/** From `useFileEditor`: UTF-8 text vs Latin-1 bytes (GET/PUT base64 on the server). */
	persistEncoding: FilePersistEncoding;
	/** When set (e.g. PNG / SVG), show a preview instead of the byte or text buffer. */
	filePreview?: FilePreview | null;
	onSave: () => void | Promise<void>;
	onDiscardUnsaved?: () => void;
	onCursor?: (line: number, col: number) => void;
	wordWrap?: boolean;
	showBreadcrumbs?: boolean;
	workspaceDockActions?: {
		onOpenFile: () => void;
		/** Opens/focuses the **Agent chat** tool tab in this pane (`dndSourceCellIndex` in multi-grid). */
		onShowAgentChat: (cellIndex: number) => void;
	};
	/** Factory so each grid cell mounts its own chat tree (same session props from the parent). */
	workspaceEmbeddedChat?: () => ReactNode;
	onOpenWorkspace?: () => void;
	onFindInFiles?: () => void;
	onReplaceInFiles?: () => void;
	onUndoRedoStackChange?: () => void;
	onSelectionPrefsChange?: () => void;
	showExplorerHint?: boolean;
	compact?: boolean;
	/** Grid cell index for cross-cell tab moves (omit in 1×1 if unused). */
	dndSourceCellIndex?: number;
	/** When set, show a grip to drag this entire pane onto another cell to swap layouts. */
	workspacePaneReorderCellIndex?: number;
	/** Drop explorer / path payload onto the tab bar (reorder like panel tabs). */
	onExternalFileDrop?: (path: string, before: PanelTab | null) => void;
	/** Multi-grid: drop a tab dragged from another cell onto this pane’s tab strip (with insert position). */
	onCrossCellTabDrop?: (fromCell: number, tab: PanelTab, before: PanelTab | null) => void;
	onSplitEditorRight?: () => void;
	splitEditorDisabled?: boolean;
	onToggleWorkspaceMaximize?: () => void;
	workspaceMaximizeActive?: boolean;
	workspaceMaximizeDisabled?: boolean;
	/** Close this grid cell: shrink multi-cell layout, or exit maximized view when that mode is active (parent decides). */
	onCloseWorkspacePane?: () => void;
	closeWorkspacePaneDisabled?: boolean;
	/** Toolbar control for **`TechnicalWorkspaceGrid`** size (omit in Simple UI). */
	workspaceGridPicker?: WorkspaceGridPickerConfig | null;
	/** Data for **Team pulse** tool tab (`agent_team`). */
	agentTeamPane?: {
		agentTeams: Record<string, string[]>;
		agents: AgentMeta[];
		agentsLoading?: boolean;
		/** Active chat tab rows (user + assistant) — full transcript mirror for Team pulse. */
		teamSessionTranscript?: ChatRow[];
		streaming?: boolean;
		chatAgentName?: string | null;
		dispatchTurnAgent?: string | null;
		chatPulseMeters?: ChatPulseMeters | null;
		sessionTokenSummary?: { tokensDown: string; tokensUp: string; tokensTitle?: string } | null;
		onEditTeam?: () => void;
	} | null;
	/** First breadcrumb segment (e.g. workspace folder name); optional. */
	breadcrumbWorkspaceLabel?: string | null;
	/**
	 * When set (single-pane technical workspace), the breadcrumb **File review** row uses Git-aware actions:
	 * **Keep** → save if dirty, then `git add` this path; **Review next** → save if dirty, then open the next file with an explorer Git badge.
	 */
	gitFileReviewActions?: {
		onSaveAndStage: () => void | Promise<void>;
		onOpenNextGitReviewPath: () => void | Promise<void>;
	} | null;
	/** True when the tree reports at least one Git-marked file (shows the review row with only one tab open). */
	gitReviewHasAnyMarked?: boolean;
	/** True when `nextGitReviewFilePath` would move to a different file (enables **Review next**). */
	gitReviewCanAdvanceNext?: boolean;
};

export const WorkspacePane = forwardRef<WorkspaceEditorRef, WorkspacePaneProps>(function WorkspacePane(
	{
		tabs: entries,
		activeIndex,
		onActiveIndexChange,
		onSelectFileTab,
		onReorderTab,
		onCloseTab,
		onAddTool,
		fileActions,
		logs,
		editorPath,
		content,
		onChange,
		loading,
		error,
		dirty,
		persistEncoding,
		filePreview = null,
		onSave,
		onDiscardUnsaved,
		onCursor,
		wordWrap = true,
		showBreadcrumbs = true,
		workspaceDockActions,
		workspaceEmbeddedChat,
		onOpenWorkspace,
		onFindInFiles,
		onReplaceInFiles,
		onUndoRedoStackChange,
		onSelectionPrefsChange,
		showExplorerHint = true,
		compact = false,
		dndSourceCellIndex,
		workspacePaneReorderCellIndex,
		onExternalFileDrop,
		onCrossCellTabDrop,
		onSplitEditorRight,
		splitEditorDisabled = false,
		onToggleWorkspaceMaximize,
		workspaceMaximizeActive = false,
		workspaceMaximizeDisabled = false,
		onCloseWorkspacePane,
		closeWorkspacePaneDisabled = false,
		workspaceGridPicker = null,
		agentTeamPane = null,
		breadcrumbWorkspaceLabel = null,
		gitFileReviewActions = null,
		gitReviewHasAnyMarked = false,
		gitReviewCanAdvanceNext = false,
	},
	ref,
) {
	const paneRootRef = useRef<HTMLDivElement>(null);
	const dropHintRef = useRef<DropHint | null>(null);
	const tabStripScrollRef = useRef<HTMLDivElement>(null);
	const [dropHint, setDropHint] = useState<DropHint | null>(null);
	const [histPast, setHistPast] = useState<number[]>([]);
	const [histFuture, setHistFuture] = useState<number[]>([]);
	/** Preview (image / SVG / Mermaid render) vs Source (buffer). */
	const [visualMediaMode, setVisualMediaMode] = useState<"preview" | "source">("preview");
	/** Markdown `.md` UTF-8: rendered preview vs source editor. */
	const [markdownViewMode, setMarkdownViewMode] = useState<"preview" | "source">("source");

	const syncDropHint = (h: DropHint | null) => {
		dropHintRef.current = h;
		setDropHint(h);
	};

	const onDragStart = (e: React.DragEvent, entry: PanelTab) => {
		e.dataTransfer.setData(PANEL_TAB_DND_TYPE, serializePanelTab(entry));
		if (dndSourceCellIndex != null) {
			e.dataTransfer.setData(WOP_DND_SOURCE_CELL_TYPE, String(dndSourceCellIndex));
		}
		e.dataTransfer.effectAllowed = "move";
	};

	const clearDragUi = () => {
		dropHintRef.current = null;
		setDropHint(null);
	};

	const allowDrop = (e: React.DragEvent) => {
		if (
			dataTransferHasType(e.dataTransfer, PANEL_TAB_DND_TYPE) ||
			dataTransferHasType(e.dataTransfer, WOP_FILE_PATH_DND_TYPE)
		) {
			e.preventDefault();
			e.dataTransfer.dropEffect = "move";
		}
	};

	/** Pointer half decides insert-before this tab vs after (→ before next, or append). Same idea as Zed #34740. */
	const updateDropHintForTab = (e: React.DragEvent, entry: PanelTab, idx: number) => {
		if (
			!dataTransferHasType(e.dataTransfer, PANEL_TAB_DND_TYPE) &&
			!dataTransferHasType(e.dataTransfer, WOP_FILE_PATH_DND_TYPE)
		)
			return;
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
		const el = e.currentTarget as HTMLElement;
		const r = el.getBoundingClientRect();
		const mid = r.left + r.width / 2;
		if (e.clientX < mid) {
			syncDropHint({ kind: "before", tab: entry });
		} else if (idx < entries.length - 1) {
			syncDropHint({ kind: "before", tab: entries[idx + 1]! });
		} else {
			syncDropHint({ kind: "append" });
		}
	};

	const hintToBeforeTab = (h: DropHint | null): PanelTab | null => {
		if (!h || h.kind === "append") return null;
		return h.tab;
	};

	const onBarDrop = (e: React.DragEvent) => {
		const rawSrc = e.dataTransfer.getData(WOP_DND_SOURCE_CELL_TYPE);
		const srcParsed = parseInt(rawSrc, 10);
		const sourceCell = Number.isFinite(srcParsed) ? srcParsed : undefined;
		const thisCell = dndSourceCellIndex ?? 0;
		const rawTab = e.dataTransfer.getData(PANEL_TAB_DND_TYPE);
		const moving = parsePanelTabJson(rawTab);
		if (moving && sourceCell !== undefined && sourceCell !== thisCell) {
			e.preventDefault();
			const before = hintToBeforeTab(dropHintRef.current);
			if (onCrossCellTabDrop) {
				onCrossCellTabDrop(sourceCell, moving, before);
				e.stopPropagation();
			}
			clearDragUi();
			return;
		}

		e.preventDefault();
		e.stopPropagation();
		const rawPath = e.dataTransfer.getData(WOP_FILE_PATH_DND_TYPE);
		const path =
			rawPath.length > 0 ? parseFilePathDragJson(rawPath) : parseFilePathDragJson(e.dataTransfer.getData("text/plain"));
		const before = hintToBeforeTab(dropHintRef.current);
		if (moving) {
			if (before && tabsEqual(moving, before)) {
				clearDragUi();
				return;
			}
			onReorderTab(moving, before);
		} else if (path && onExternalFileDrop) {
			onExternalFileDrop(path, before);
		}
		clearDragUi();
	};

	const safeIndex =
		entries.length === 0 ? 0 : Math.min(Math.max(0, activeIndex), entries.length - 1);
	const activeEntry = entries.length > 0 ? entries[safeIndex] : null;

	useEffect(() => {
		const n = entries.length;
		setHistPast((p) => p.filter((i) => i >= 0 && i < n));
		setHistFuture((f) => f.filter((i) => i >= 0 && i < n));
	}, [entries.length]);

	useEffect(() => {
		setVisualMediaMode("preview");
		setMarkdownViewMode("source");
	}, [editorPath]);

	useEffect(() => {
		if (!dirty) return;
		const root = paneRootRef.current;
		if (!root) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== "Enter" || (!e.ctrlKey && !e.metaKey)) return;
			const t = e.target;
			if (!(t instanceof HTMLTextAreaElement) || !root.contains(t)) return;
			e.preventDefault();
			void onSave();
		};
		document.addEventListener("keydown", onKey, true);
		return () => document.removeEventListener("keydown", onKey, true);
	}, [dirty, onSave]);

	useEffect(() => {
		const el = tabStripScrollRef.current;
		if (!el) return;
		const onWheel = (e: WheelEvent) => {
			if (el.scrollWidth <= el.clientWidth) return;
			if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
			e.preventDefault();
			el.scrollLeft += e.deltaY;
		};
		el.addEventListener("wheel", onWheel, { passive: false });
		return () => el.removeEventListener("wheel", onWheel);
	}, []);

	const userActivateTab = useCallback(
		(idx: number) => {
			const cur =
				entries.length === 0 ? 0 : Math.min(Math.max(0, activeIndex), entries.length - 1);
			if (idx === cur || idx < 0 || idx >= entries.length) return;
			setHistPast((p) => [...p, cur]);
			setHistFuture([]);
			onActiveIndexChange(idx);
			const e = entries[idx];
			if (e?.type === "file") onSelectFileTab(e.path);
		},
		[entries, activeIndex, onActiveIndexChange, onSelectFileTab],
	);

	const goHistoryBack = useCallback(() => {
		if (histPast.length === 0) return;
		const prev = histPast[histPast.length - 1]!;
		if (prev < 0 || prev >= entries.length) {
			setHistPast([]);
			return;
		}
		const cur = safeIndex;
		setHistPast((p) => p.slice(0, -1));
		setHistFuture((f) => [cur, ...f]);
		onActiveIndexChange(prev);
		const e = entries[prev];
		if (e?.type === "file") onSelectFileTab(e.path);
	}, [histPast, entries, safeIndex, onActiveIndexChange, onSelectFileTab]);

	const goHistoryForward = useCallback(() => {
		if (histFuture.length === 0) return;
		const next = histFuture[0]!;
		if (next < 0 || next >= entries.length) {
			setHistFuture([]);
			return;
		}
		const cur = safeIndex;
		setHistFuture((f) => f.slice(1));
		setHistPast((p) => [...p, cur]);
		onActiveIndexChange(next);
		const e = entries[next];
		if (e?.type === "file") onSelectFileTab(e.path);
	}, [histFuture, entries, safeIndex, onActiveIndexChange, onSelectFileTab]);

	const goAdjacentFileForReview = useCallback(
		async (direction: 1 | -1, opts?: { saveFirst?: boolean }) => {
			const idxs = entries.map((e, i) => (e.type === "file" ? i : -1)).filter((i): i is number => i >= 0);
			if (idxs.length < 2) return;
			let k = idxs.indexOf(safeIndex);
			if (k < 0) k = direction > 0 ? idxs.length - 1 : 0;
			const next = idxs[(k + direction + idxs.length) % idxs.length]!;
			if (dirty) {
				if (opts?.saveFirst) {
					await onSave();
					userActivateTab(next);
					return;
				}
				if (onDiscardUnsaved) {
					if (!window.confirm("Discard unsaved changes and open another file?")) return;
					onDiscardUnsaved();
				}
			}
			userActivateTab(next);
		},
		[entries, safeIndex, dirty, onDiscardUnsaved, onSave, userActivateTab],
	);

	const canHistBack = entries.length > 0 && histPast.length > 0;
	const canHistForward = entries.length > 0 && histFuture.length > 0;

	/** File is active and loaded — drive ALL document chrome (Preview/Source, Keep, nav). */
	const showDocChrome =
		Boolean(activeEntry?.type === "file" && activeEntry.path === editorPath && editorPath && !loading && !error);
	/** Only show the breadcrumb path text when the View → Breadcrumbs setting is on. */
	const showBread =
		showBreadcrumbs && showDocChrome;

	const mediaDualChrome =
		Boolean(
			showDocChrome &&
				filePreview &&
				filePreviewSupportsSourceToggle(filePreview),
		);
	const showMediaAsSource = mediaDualChrome && visualMediaMode === "source";

	const mediaSegOn = "rounded-md border border-[#ea580c]/60 bg-[#3c3c3c] px-2.5 py-1 font-mono text-[11px] text-[#fed7aa]";
	const mediaSegOff =
		"rounded-md border border-[#3c3c3c] bg-[#2d2d2d] px-2.5 py-1 font-mono text-[11px] text-[#cccccc] hover:bg-[#3c3c3c]";
	const reviewBtnGhost =
		"rounded-md border border-[#3c3c3c] bg-[#2d2d2d] px-2.5 py-1 font-mono text-[11px] text-[#cccccc] hover:bg-[#3c3c3c] disabled:cursor-not-allowed disabled:opacity-40";
	const reviewBtnPrimary =
		"rounded-md border border-[#0e639c] bg-[#0e639c] px-2.5 py-1 font-mono text-[11px] font-semibold text-white hover:bg-[#1177bb] disabled:cursor-not-allowed disabled:opacity-40";

	const pathSegments = editorPath ? workspacePathBreadcrumbSegments(editorPath) : [];
	const isMarkdownUtf8 =
		Boolean(
			showDocChrome &&
				persistEncoding === "utf8" &&
				editorPath &&
				/\.md$/i.test(editorPath) &&
				!filePreview,
		);
	const mdHeading = isMarkdownUtf8 && showBread ? firstMarkdownHeadingLine(content) : null;
	const fileTabIndices = entries.map((e, i) => (e.type === "file" ? i : -1)).filter((i): i is number => i >= 0);
	const fileReviewTotal = fileTabIndices.length;
	const rawPosInFileTabs =
		activeEntry?.type === "file" ? fileTabIndices.indexOf(safeIndex) : -1;
	const fileReviewIndexLabel =
		activeEntry?.type === "file" && fileReviewTotal > 0 && rawPosInFileTabs >= 0
			? `${rawPosInFileTabs + 1} / ${fileReviewTotal}`
			: "";
	const canNextFileForReview = fileReviewTotal >= 2;
	const showGitFileReviewChrome = Boolean(gitFileReviewActions) && gitReviewHasAnyMarked;
	/** Tab-cycling review (2+ file tabs) or Git queue review (marked paths in workspace tree). */
	const showFileReviewChrome = canNextFileForReview || showGitFileReviewChrome;
	const showMdPreview = isMarkdownUtf8 && markdownViewMode === "preview";

	return (
		<div
			ref={paneRootRef}
			className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border border-[#3c3c3c] bg-[#1e1e1e]"
			data-wop-workspace-pane
		>
			<div
				data-wop-workspace-tab-bar
				className="relative z-10 flex h-9 w-full min-w-0 shrink-0 items-center gap-0 border-b border-[#2d2d2d] bg-[#252526]"
				onDragOver={allowDrop}
				onDragLeave={(e) => {
					if (!e.currentTarget.contains(e.relatedTarget as Node)) {
						syncDropHint(null);
					}
				}}
				onDrop={onBarDrop}
				title="Workspace — one tab stack for files and tools (Zed-style)"
			>
				<div className="flex h-9 shrink-0 items-center gap-0.5 border-r border-[#2d2d2d] px-1">
					{workspacePaneReorderCellIndex != null ? (
						<button
							type="button"
							draggable
							onDragStart={(e) => {
								e.dataTransfer.setData(
									WOP_WORKSPACE_PANE_DND_TYPE,
									serializeWorkspacePaneCellIndex(workspacePaneReorderCellIndex),
								);
								e.dataTransfer.effectAllowed = "move";
							}}
							className="cursor-grab rounded p-1.5 text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc] active:cursor-grabbing"
							title="Drag to swap this editor pane with another cell"
							aria-label="Drag to swap editor pane"
						>
							<GripVertical size={14} strokeWidth={2} aria-hidden />
						</button>
					) : null}
					<button
						type="button"
						disabled={!canHistBack}
						onClick={goHistoryBack}
						className={`rounded p-1.5 ${
							canHistBack
								? "text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]"
								: "cursor-not-allowed text-[#555]"
						}`}
						title="Back — previous tab in this pane"
						aria-label="Back"
					>
						<ChevronLeft size={14} strokeWidth={2} />
					</button>
					<button
						type="button"
						disabled={!canHistForward}
						onClick={goHistoryForward}
						className={`rounded p-1.5 ${
							canHistForward
								? "text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]"
								: "cursor-not-allowed text-[#555]"
						}`}
						title="Forward — next tab in this pane"
						aria-label="Forward"
					>
						<ChevronRight size={14} strokeWidth={2} />
					</button>
					<DockZoneAddMenu
						menuHeading="Workspace"
						onAddTool={onAddTool}
						fileActions={fileActions}
						rootClassName="relative flex h-9 shrink-0 items-center px-0.5"
					/>
					{workspaceGridPicker ? (
						<WorkspaceGridLayoutPicker
							cols={workspaceGridPicker.cols}
							rows={workspaceGridPicker.rows}
							maxCols={workspaceGridPicker.maxCols}
							maxRows={workspaceGridPicker.maxRows}
							onSelect={workspaceGridPicker.onSelect}
							rootClassName="relative flex h-9 shrink-0 items-center border-l border-[#2d2d2d] px-0.5"
						/>
					) : null}
				</div>
				<div
					ref={tabStripScrollRef}
					className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col justify-center overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:thin] touch-pan-x"
				>
					<div className="inline-flex h-9 min-w-max max-w-none flex-nowrap items-stretch">
					{entries.map((entry, idx) => {
						const active = safeIndex === idx;
						const fileDirty = entry.type === "file" && dirty && editorPath === entry.path;
						const showLineBefore =
							dropHint?.kind === "before" && tabsEqual(dropHint.tab, entry);
						const showLineAfter =
							dropHint?.kind === "append" && idx === entries.length - 1;
						return (
							<div
								key={entryKey(entry)}
								className={`group relative flex h-9 min-w-[120px] max-w-[240px] shrink-0 grow-0 items-center border-r border-t border-r-[#2d2d2d] ${
									active
										? "border-[#ea580c] bg-[#1e1e1e]"
										: "cursor-pointer border-t-transparent border-b border-b-[#252526] bg-[#2d2d2d] text-[#858585]"
								}`}
								onDragOver={(e) => updateDropHintForTab(e, entry, idx)}
								onDrop={onBarDrop}
							>
								{showLineBefore ? (
									<span
										className="pointer-events-none absolute left-0 top-1 z-20 h-[calc(100%-8px)] w-0.5 rounded-sm bg-[#ea580c] shadow-[0_0_10px_rgba(234,88,12,0.85)]"
										aria-hidden
									/>
								) : null}
								{showLineAfter ? (
									<span
										className="pointer-events-none absolute right-0 top-1 z-20 h-[calc(100%-8px)] w-0.5 rounded-sm bg-[#ea580c] shadow-[0_0_10px_rgba(234,88,12,0.85)]"
										aria-hidden
									/>
								) : null}
								<button
									type="button"
									draggable
									onDragStart={(e) => onDragStart(e, entry)}
									onDragEnd={clearDragUi}
									onDragOver={(e) => updateDropHintForTab(e, entry, idx)}
									onClick={() => userActivateTab(idx)}
									className={`flex min-w-0 flex-1 cursor-grab items-center gap-2 px-3 text-left active:cursor-grabbing ${
										active ? "text-white" : "text-[#cccccc]"
									}`}
									title={`${entryLabel(entry)} — drag to reorder`}
								>
									<PanelTabIcon entry={entry} active={active} />
									<span className="min-w-0 flex-1 truncate text-[13px]">
										{entryLabel(entry)}
										{fileDirty ? <span className="ml-1 text-[#ea580c]">●</span> : null}
									</span>
								</button>
								<div className="flex shrink-0 items-center gap-0.5 pr-0.5">
									{active && entry.type === "file" && fileDirty && onDiscardUnsaved ? (
										<button
											type="button"
											draggable={false}
											className="rounded px-1 py-0.5 font-mono text-[9px] uppercase text-[#858585] hover:bg-[#3c3c3c]"
											title="Revert"
											onClick={(e) => {
												e.stopPropagation();
												onDiscardUnsaved();
											}}
										>
											Rev
										</button>
									) : null}
									{active && entry.type === "file" && fileDirty ? (
										<button
											type="button"
											draggable={false}
											className="rounded px-1 py-0.5 font-mono text-[9px] font-bold uppercase text-[#ea580c] hover:underline"
											title="Save"
											onClick={(e) => {
												e.stopPropagation();
												void onSave();
											}}
										>
											Save
										</button>
									) : null}
									<button
										type="button"
										draggable={false}
										className="rounded p-0.5 text-[#858585] opacity-0 hover:bg-[#3c3c3c] hover:text-[#cccccc] group-hover:opacity-100"
										title={entry.type === "tool" ? "Close panel" : "Close tab"}
										onClick={(e) => {
											e.stopPropagation();
											onCloseTab(entry);
										}}
									>
										<X size={14} strokeWidth={2} />
									</button>
								</div>
							</div>
						);
					})}
					<div
						className="min-h-9 min-w-10 shrink-0 self-stretch"
						onDragOver={(e) => {
							if (
								dataTransferHasType(e.dataTransfer, PANEL_TAB_DND_TYPE) ||
								dataTransferHasType(e.dataTransfer, WOP_FILE_PATH_DND_TYPE)
							) {
								e.preventDefault();
								e.dataTransfer.dropEffect = "move";
								syncDropHint({ kind: "append" });
							}
						}}
						onDrop={onBarDrop}
						aria-hidden
					/>
					</div>
				</div>
				<div className="flex h-9 shrink-0 items-center gap-0.5 border-l border-[#2d2d2d] px-1">
					{workspaceDockActions ? (
						<>
							<button
								type="button"
								title="Open file"
								aria-label="Open file"
								onClick={workspaceDockActions.onOpenFile}
								className="rounded p-1.5 text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]"
							>
								<FolderOpen size={14} strokeWidth={2} />
							</button>
							<button
								type="button"
								title="Agent chat in this pane"
								aria-label="Agent chat in this pane"
								onClick={() => workspaceDockActions.onShowAgentChat(dndSourceCellIndex ?? 0)}
								className="rounded p-1.5 text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]"
							>
								<MessageSquare size={14} strokeWidth={2} />
							</button>
						</>
					) : null}
					<button
						type="button"
						disabled={splitEditorDisabled || !onSplitEditorRight}
						onClick={() => onSplitEditorRight?.()}
						className={`rounded p-1.5 ${
							splitEditorDisabled || !onSplitEditorRight
								? "cursor-not-allowed text-[#555]"
								: "text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]"
						}`}
						title={splitEditorDisabled ? "Maximum columns reached" : "Split editor right (add column)"}
						aria-label="Split editor right"
					>
						<Columns2 size={14} strokeWidth={2} />
					</button>
					<button
						type="button"
						disabled={workspaceMaximizeDisabled || !onToggleWorkspaceMaximize}
						onClick={() => onToggleWorkspaceMaximize?.()}
						className={`rounded p-1.5 ${
							workspaceMaximizeDisabled || !onToggleWorkspaceMaximize
								? "cursor-not-allowed text-[#555]"
								: workspaceMaximizeActive
									? "bg-[#3c3c3c] text-[#ea580c]"
									: "text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]"
						}`}
						title={
							workspaceMaximizeDisabled
								? "Maximize (needs multi-cell grid)"
								: workspaceMaximizeActive
									? "Exit maximized cell"
									: "Maximize this editor cell"
						}
						aria-label="Maximize workspace cell"
					>
						<Maximize2 size={14} strokeWidth={2} />
					</button>
					{onCloseWorkspacePane ? (
						<button
							type="button"
							disabled={closeWorkspacePaneDisabled}
							onClick={() => onCloseWorkspacePane()}
							className={`rounded p-1.5 ${
								closeWorkspacePaneDisabled
									? "cursor-not-allowed text-[#555]"
									: "text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]"
							}`}
							title={
								workspaceMaximizeActive
									? "Exit maximized view"
									: "Remove this editor cell (shrink grid)"
							}
							aria-label={
								workspaceMaximizeActive ? "Exit maximized workspace view" : "Close workspace cell"
							}
						>
							<X size={14} strokeWidth={2} />
						</button>
					) : null}
				</div>
			</div>

			{showDocChrome ? (
				<div
					className="flex min-h-9 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-[#2d2d2d] bg-[#252526] px-3 py-2"
					role="region"
					aria-label="Document"
				>
					{showBread ? (
						<div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-1 font-mono text-[11px] text-[#d4d4d4]">
							{breadcrumbWorkspaceLabel ? (
								<>
									<span className="shrink-0 text-[#cccccc]" title={breadcrumbWorkspaceLabel}>
										{breadcrumbWorkspaceLabel}
									</span>
									<span className="shrink-0 text-[#858585]" aria-hidden>
										›
									</span>
								</>
							) : null}
							{pathSegments.map((seg, i) => (
								<span key={`${seg}-${i}`} className="flex min-w-0 items-center gap-x-1">
									{i > 0 ? (
										<span className="shrink-0 text-[#858585]" aria-hidden>
											›
										</span>
									) : null}
									<span className={i === pathSegments.length - 1 ? "truncate font-medium text-[#fed7aa]" : "truncate"}>
										{seg}
									</span>
								</span>
							))}
							{mdHeading ? (
								<>
									<span className="shrink-0 text-[#858585]" aria-hidden>
										›
									</span>
									<span className="min-w-0 truncate text-[#a3a3a3]" title={mdHeading}>
										{mdHeading}
									</span>
								</>
							) : null}
						</div>
					) : (
						<div className="min-w-0 flex-1 truncate font-mono text-[11px] text-[#fed7aa]" title={editorPath ?? ""}>
							{pathSegments[pathSegments.length - 1] ?? ""}
						</div>
					)}
					<div className="flex flex-wrap items-center justify-end gap-2">
						{isMarkdownUtf8 ? (
							<div className="flex items-center gap-1.5" role="group" aria-label="Markdown view">
								<button
									type="button"
									onClick={() => setMarkdownViewMode("preview")}
									className={markdownViewMode === "preview" ? mediaSegOn : mediaSegOff}
								>
									Preview
								</button>
								<button
									type="button"
									onClick={() => setMarkdownViewMode("source")}
									className={markdownViewMode === "source" ? mediaSegOn : mediaSegOff}
								>
									Source
								</button>
								<span className="font-mono text-[10px] text-[#858585]">Markdown</span>
							</div>
						) : null}
						{showFileReviewChrome ? (
							<div
								className="flex flex-wrap items-center gap-2 border-l border-[#3c3c3c] pl-2"
								role="group"
								aria-label="File review"
							>
								<div className="flex flex-wrap items-center gap-1.5">
									<button
										type="button"
										disabled={
											gitFileReviewActions
												? !editorPath || loading || Boolean(error)
												: !dirty
										}
										onClick={() =>
											void (gitFileReviewActions
												? gitFileReviewActions.onSaveAndStage()
												: onSave())
										}
										className={reviewBtnPrimary}
										title={
											gitFileReviewActions
												? "Save if needed, then stage this file for commit (git add)"
												: dirty
													? "Save this file (Ctrl+Enter)"
													: "No unsaved changes"
										}
									>
										Keep
									</button>
									<button
										type="button"
										disabled={gitFileReviewActions ? !gitReviewCanAdvanceNext : false}
										onClick={() =>
											void (gitFileReviewActions
												? gitFileReviewActions.onOpenNextGitReviewPath()
												: goAdjacentFileForReview(1, { saveFirst: true }))
										}
										className={reviewBtnGhost}
										title={
											gitFileReviewActions
												? dirty
													? "Save if needed, then open the next file with a Git change in the workspace"
													: "Open the next file with a Git change in the workspace"
												: dirty
													? "Save this file, then open the next file tab in this pane"
													: "Open the next file tab in this pane"
										}
									>
										Review next
									</button>
								</div>
								<div className="flex items-center gap-1 font-mono text-[11px] text-[#858585]">
									<button
										type="button"
										onClick={() => void goAdjacentFileForReview(-1)}
										className="rounded p-0.5 text-[#cccccc] hover:bg-[#3c3c3c]"
										title="Previous open file tab in this pane (discards unsaved changes — confirm)"
										aria-label="Previous file in review"
									>
										<ChevronLeft size={14} strokeWidth={2} aria-hidden />
									</button>
									<span className="min-w-[3.25rem] text-center tabular-nums" title="Open file tabs in this workspace pane">
										{fileReviewIndexLabel || "—"}
									</span>
									<button
										type="button"
										onClick={() => void goAdjacentFileForReview(1)}
										className="rounded p-0.5 text-[#cccccc] hover:bg-[#3c3c3c]"
										title="Next open file tab in this pane (discards unsaved changes — confirm)"
										aria-label="Next file in review"
									>
										<ChevronRight size={14} strokeWidth={2} aria-hidden />
									</button>
								</div>
							</div>
						) : null}
						{dirty ? (
							<div className="flex flex-wrap items-center gap-2 border-l border-[#3c3c3c] pl-2">
								{onDiscardUnsaved ? (
									<button
										type="button"
										onClick={onDiscardUnsaved}
										className={reviewBtnGhost}
										title="Revert editor to last saved version"
									>
										Undo changes
									</button>
								) : null}
								{showFileReviewChrome ? null : (
									<button
										type="button"
										onClick={() => void onSave()}
										className={reviewBtnPrimary}
										title="Save file (Ctrl+Enter)"
									>
										Keep file
										<span className="ml-1.5 hidden font-normal opacity-80 sm:inline">Ctrl+Enter</span>
									</button>
								)}
							</div>
						) : null}
					</div>
				</div>
			) : null}
			{mediaDualChrome ? (
				<div
					className="flex h-8 shrink-0 items-center gap-2 border-b border-[#2d2d2d] bg-[#252526] px-3"
					role="group"
					aria-label="File view mode"
				>
					<span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#858585]">
						View
					</span>
					<button
						type="button"
						onClick={() => setVisualMediaMode("preview")}
						className={visualMediaMode === "preview" ? mediaSegOn : mediaSegOff}
					>
						Preview
					</button>
					<button
						type="button"
						onClick={() => setVisualMediaMode("source")}
						className={visualMediaMode === "source" ? mediaSegOn : mediaSegOff}
					>
						Source
					</button>
				</div>
			) : null}

			<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
				{!activeEntry ? (
					<div
						className={`flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center ${compact ? "gap-3" : "gap-4"}`}
					>
						<p className="max-w-md font-mono text-[12px] leading-relaxed text-[#858585]">
							<strong className="text-[#cccccc]">Workspace</strong> — add a tab with + (files, terminal,
							problems, …). Same pane type can be split later.
						</p>
						{showExplorerHint ? (
							<p className="max-w-sm font-mono text-[11px] text-[#6b6b6b]">Use + or open a file from the explorer.</p>
						) : null}
						{onOpenWorkspace ? (
							<button
								type="button"
								onClick={onOpenWorkspace}
								className="rounded border border-[#3c3c3c] bg-[#252526] px-3 py-2 font-mono text-[11px] uppercase text-[#858585] hover:bg-[#3c3c3c]"
							>
								Refresh workspace
							</button>
						) : null}
					</div>
				) : activeEntry.type === "tool" && activeEntry.id === "agent_chat" ? (
					<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
						{workspaceEmbeddedChat ? (
							workspaceEmbeddedChat()
						) : (
							<p className="p-3 font-mono text-[12px] text-[#858585]">Agent chat is not wired for this pane.</p>
						)}
					</div>
				) : activeEntry.type === "tool" && activeEntry.id === "agent_team" ? (
					<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
						{agentTeamPane ? (
							<WorkspaceAgentTeamPane
								agentTeams={agentTeamPane.agentTeams}
								agents={agentTeamPane.agents}
								agentsLoading={agentTeamPane.agentsLoading}
								teamSessionTranscript={agentTeamPane.teamSessionTranscript}
								streaming={agentTeamPane.streaming}
								chatAgentName={agentTeamPane.chatAgentName}
								dispatchTurnAgent={agentTeamPane.dispatchTurnAgent}
								chatPulseMeters={agentTeamPane.chatPulseMeters}
								sessionTokenSummary={agentTeamPane.sessionTokenSummary}
								onEditTeam={agentTeamPane.onEditTeam}
							/>
						) : (
							<p className="p-3 font-mono text-[12px] text-[#858585]">Team pulse data not wired for this pane.</p>
						)}
					</div>
				) : activeEntry.type === "tool" ? (
					<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
						<ToolPanelBody tab={activeEntry.id} logs={logs} />
					</div>
				) : activeEntry.path !== editorPath ? (
					<div className="flex flex-1 items-center justify-center p-6 font-mono text-[13px] text-[#858585]">
						Loading…
					</div>
				) : loading ? (
					<div className="flex flex-1 items-center justify-center p-6 font-mono text-[13px] text-[#858585]">
						Loading…
					</div>
				) : error ? (
					<div className="flex flex-1 items-center justify-center p-6 font-mono text-[13px] text-[#f14c4c]">{error}</div>
				) : showMediaAsSource ? (
					<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
						{persistEncoding === "base64" ? (
							<div className="shrink-0 border-b border-[#2d2d2d] bg-[#252526] px-3 py-1 font-mono text-[10px] text-[#858585]">
								Byte editor (Latin-1) — colors off; Save writes the exact file bytes.
							</div>
						) : null}
						<WorkspaceTextBuffer
							ref={ref}
							path={editorPath}
							content={content}
							onChange={onChange}
							loading={false}
							error={null}
							onCursor={onCursor}
							wordWrap={wordWrap}
							disableSyntaxHighlight={persistEncoding === "base64"}
							scrollClassName={`px-3 py-2 ${WOP_WORKSPACE_EDITOR_SCROLL_DARK}`}
							lineGutterClassName={WOP_WORKSPACE_EDITOR_GUTTER_DARK}
							textareaClassName={WOP_WORKSPACE_EDITOR_TEXTAREA_DARK}
							findBarClassName="shrink-0 border-t border-[#2d2d2d]"
							statusLoadingClassName="p-4 text-sm text-[#858585]"
							statusErrorClassName="p-4 text-sm text-red-500"
							onFindInFiles={onFindInFiles}
							onReplaceInFiles={onReplaceInFiles}
							onUndoRedoStackChange={onUndoRedoStackChange}
							onSelectionPrefsChange={onSelectionPrefsChange}
						/>
					</div>
				) : filePreview?.kind === "image" ? (
					<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#1e1e1e]">
						<div className="flex min-h-0 flex-1 overflow-auto p-4">
							<img
								src={filePreview.src}
								alt=""
								className="mx-auto block h-auto max-w-full object-contain [image-rendering:auto]"
								loading="lazy"
								decoding="async"
							/>
						</div>
					</div>
				) : filePreview?.kind === "svg" ? (
					<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#1e1e1e]">
						<div className="flex min-h-0 flex-1 overflow-auto p-4">
							<WorkspaceSvgPreview
								xml={filePreview.xml}
								imgClassName="mx-auto block h-auto max-w-full object-contain [image-rendering:auto]"
							/>
						</div>
					</div>
				) : filePreview?.kind === "mermaid" ? (
					<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#1e1e1e]">
						<MermaidPreviewPane source={filePreview.source} appearanceDark />
					</div>
				) : filePreview?.kind === "binary" ? (
					<div className="flex min-h-0 flex-1 overflow-auto bg-[#1e1e1e] p-4 font-mono text-[13px] leading-relaxed text-[#d4d4d4]">
						<div className="max-w-xl text-[#858585]">
							<p className="mb-2 text-[#cccccc]">Binary file</p>
							<p>
								Type <span className="text-[#fed7aa]">{filePreview.mimeType}</span>. This file is not shown as text.
								Open it externally or use the workspace on disk.
							</p>
						</div>
					</div>
				) : showMdPreview ? (
					<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#1e1e1e]">
						<MarkdownPreviewPane markdown={content} appearanceDark />
					</div>
				) : (
					<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
						{persistEncoding === "base64" ? (
							<div className="shrink-0 border-b border-[#2d2d2d] bg-[#252526] px-3 py-1 font-mono text-[10px] text-[#858585]">
								Byte editor (Latin-1) — colors off; Save writes the exact file bytes.
							</div>
						) : null}
						<WorkspaceTextBuffer
							ref={ref}
							path={editorPath}
							content={content}
							onChange={onChange}
							loading={false}
							error={null}
							onCursor={onCursor}
							wordWrap={wordWrap}
							disableSyntaxHighlight={persistEncoding === "base64"}
							scrollClassName={`px-3 py-2 ${WOP_WORKSPACE_EDITOR_SCROLL_DARK}`}
							lineGutterClassName={WOP_WORKSPACE_EDITOR_GUTTER_DARK}
							textareaClassName={WOP_WORKSPACE_EDITOR_TEXTAREA_DARK}
							findBarClassName="shrink-0 border-t border-[#2d2d2d]"
							statusLoadingClassName="p-4 text-sm text-[#858585]"
							statusErrorClassName="p-4 text-sm text-red-500"
							onFindInFiles={onFindInFiles}
							onReplaceInFiles={onReplaceInFiles}
							onUndoRedoStackChange={onUndoRedoStackChange}
							onSelectionPrefsChange={onSelectionPrefsChange}
						/>
					</div>
				)}
			</div>
		</div>
	);
});
