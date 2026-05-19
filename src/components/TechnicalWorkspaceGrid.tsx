import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { apiPostJson } from "../api/client";
import type { AgentMeta } from "../hooks/useAgents";
import type { ChatPulseMeters, ChatRow, LogRow } from "../hooks/useWayOfPiSession";
import { useFileEditor } from "../hooks/useFileEditor";
import type { BottomPanelTab } from "../types/technicalShell";
import type { TreeNode, WorkspaceResponse } from "../types/tree";
import type { WorkspaceEditorRef } from "../types/workspaceEditor";
import type { FilePersistEncoding } from "../hooks/useFileEditor";
import type { WorkspaceGridState } from "../utils/workspaceGridStorage";
import {
	applyAddFileTab,
	applyCloseToolTab,
	applyEnsureFileTab,
	applyPanelTabMove,
	applyRemoveFileTab,
	type PanelDockLayout,
	type PanelTab,
} from "../utils/panelDockLayout";
import { gitMarkedFilePathsSorted, nextGitReviewFilePath } from "../utils/flattenTree";
import { computeWorkspaceFilePreview } from "../utils/workspaceFilePreview";
import type { WopDropZone } from "../utils/workspaceDropZones";
import type { DockFileActionItem } from "./dockToolAddMenu";
import { DockSplitHandle } from "./DockSplitHandle";
import { WorkspaceCellDropSurface } from "./WorkspaceCellDropSurface";
import type { WorkspaceGridPickerConfig } from "./WorkspaceGridLayoutPicker";
import { WorkspacePane } from "./WorkspacePane";

export type TechnicalWorkspaceCellSnapshot = {
	selectedPath: string | null;
	content: string;
	setContent: (next: string) => void;
	loading: boolean;
	error: string | null;
	dirty: boolean;
	persistEncoding: FilePersistEncoding;
	save: () => Promise<boolean>;
	reload: () => Promise<void>;
	discardUnsavedChanges: () => void;
	panelDock: PanelDockLayout;
};

type WorkspaceGridCellProps = {
	cellIndex: number;
	panelDock: PanelDockLayout;
	/** Stable per-cell wrapper — do not pass a fresh inline `(u) => onPatchCell(i,u)` each parent render. */
	onPatchCell: (cellIndex: number, update: SetStateAction<PanelDockLayout>) => void;
	isFocused: boolean;
	onActivate: () => void;
	onReportFocused: (s: TechnicalWorkspaceCellSnapshot) => void;
	onCursor: (line: number, col: number) => void;
	editorRef: React.Ref<WorkspaceEditorRef> | undefined;
	logs: LogRow[];
	fileActions: DockFileActionItem[];
	onAddTool: (tab: BottomPanelTab) => void;
	onOpenWorkspace: () => void | Promise<void>;
	workspaceDockActions?: {
		onOpenFile: () => void;
		onShowAgentChat: (cellIndex: number) => void;
	};
	/** Factory: new chat UI per pane (see `WorkspacePane`). */
	workspaceEmbeddedChat?: () => ReactNode;
	wordWrap: boolean;
	showBreadcrumbs: boolean;
	onFindInFiles?: () => void;
	onReplaceInFiles?: () => void;
	onUndoRedoStackChange?: () => void;
	onSelectionPrefsChange?: () => void;
	refresh: () => Promise<void>;
	autoSave: boolean;
	/** When `rev` changes, focused cell opens this path (explorer / dock actions). */
	externalOpenFile: { path: string; rev: number } | null;
	/** File → Close editor: `cellIndex` must match this cell; `rev` bumps each menu action. */
	externalCloseEditor: { rev: number; cellIndex: number } | null;
	/** Hit-testing for snap overlay (1×1 when this cell is maximized). */
	hitCols: number;
	hitRows: number;
	/** Actual workspace grid size (for split / maximize toolbar). */
	layoutCols: number;
	layoutRows: number;
	onWorkspaceSurfaceDrop: (e: React.DragEvent, surfaceCellIndex: number, zone: WopDropZone) => void;
	onSplitEditorRight?: () => void;
	splitEditorDisabled?: boolean;
	maximizedCell: number | null;
	onToggleMaximizeCell?: (cellIndex: number) => void;
	onRemoveWorkspaceCell?: (cellIndex: number) => void;
	workspaceGridPicker: WorkspaceGridPickerConfig | null;
	agentTeamPane: {
		agentTeams: Record<string, string[]>;
		agents: AgentMeta[];
		agentsLoading?: boolean;
		teamSessionTranscript?: ChatRow[];
		streaming?: boolean;
		chatAgentName?: string | null;
		dispatchTurnAgent?: string | null;
		chatPulseMeters?: ChatPulseMeters | null;
		sessionTokenSummary?: { tokensDown: string; tokensUp: string; tokensTitle?: string } | null;
		onEditTeam?: () => void;
	} | null;
	onCrossCellTabMoveBetweenCells?: (
		fromCell: number,
		toCell: number,
		tab: PanelTab,
		before: PanelTab | null,
	) => void;
	/** Multi-cell: register per-cell save + dirty for File → Save All. */
	registerCellSave?: (cellIndex: number, entry: { dirty: boolean; save: () => Promise<boolean> } | null) => void;
	/** First breadcrumb segment in the editor chrome (workspace folder name). */
	breadcrumbWorkspaceLabel?: string | null;
	/** Tree from `/api/tree` (Git badges) — powers Git-aware **Keep** / **Review next** in this cell. */
	workspaceTreeNodes: TreeNode[];
	/** Reload tree without toggling global loading (same as explorer after Git stage). */
	refreshQuiet: () => Promise<WorkspaceResponse | null>;
};

function WorkspaceGridCell({
	cellIndex,
	panelDock,
	onPatchCell,
	isFocused,
	onActivate,
	onReportFocused,
	onCursor,
	editorRef,
	logs,
	fileActions,
	onAddTool,
	onOpenWorkspace,
	workspaceDockActions,
	workspaceEmbeddedChat,
	wordWrap,
	showBreadcrumbs,
	onFindInFiles,
	onReplaceInFiles,
	onUndoRedoStackChange,
	onSelectionPrefsChange,
	refresh,
	autoSave,
	externalOpenFile,
	hitCols,
	hitRows,
	layoutCols,
	layoutRows,
	onWorkspaceSurfaceDrop,
	onSplitEditorRight,
	splitEditorDisabled,
	maximizedCell,
	onToggleMaximizeCell,
	onRemoveWorkspaceCell,
	workspaceGridPicker,
	agentTeamPane,
	onCrossCellTabMoveBetweenCells,
	registerCellSave,
	externalCloseEditor,
	breadcrumbWorkspaceLabel = null,
	workspaceTreeNodes,
	refreshQuiet,
}: WorkspaceGridCellProps) {
	const patchDock = useCallback(
		(u: SetStateAction<PanelDockLayout>) => onPatchCell(cellIndex, u),
		[onPatchCell, cellIndex],
	);
	const [selectedPath, setSelectedPath] = useState<string | null>(null);
	const lastExternalRev = useRef(0);
	const lastCloseEditorRev = useRef(0);
	const {
		content,
		setContent,
		persistEncoding,
		mimeType,
		loading: fileLoading,
		error: fileError,
		dirty,
		save,
		reload,
		discardUnsavedChanges,
	} = useFileEditor(selectedPath, { autoSave });

	const filePreview = useMemo(() => {
		if (fileLoading) return null;
		return computeWorkspaceFilePreview(selectedPath, persistEncoding, mimeType, content);
	}, [fileLoading, selectedPath, persistEncoding, mimeType, content]);

	const setWorkspaceActiveIndex = useCallback(
		(index: number) => {
			patchDock((prev) => ({ ...prev, activeIndex: index }));
		},
		[patchDock],
	);

	const onDockEntryMove = useCallback(
		(moving: PanelTab, before: PanelTab | null) => {
			patchDock((prev) => applyPanelTabMove(prev, moving, before));
		},
		[patchDock],
	);

	const onDockEntryClose = useCallback(
		(entry: PanelTab) => {
			patchDock((prev) =>
				entry.type === "tool"
					? applyCloseToolTab(prev, entry.id)
					: applyRemoveFileTab(prev, entry.path),
			);
		},
		[patchDock],
	);

	const onSelectFileFromWorkspaceTab = useCallback((path: string) => {
		setSelectedPath(path);
	}, []);

	useEffect(() => {
		if (!isFocused || !externalOpenFile) return;
		if (externalOpenFile.rev === lastExternalRev.current) return;
		lastExternalRev.current = externalOpenFile.rev;
		setSelectedPath(externalOpenFile.path);
		patchDock((prev) => applyAddFileTab(prev, externalOpenFile.path));
	}, [isFocused, externalOpenFile, patchDock]);

	useEffect(() => {
		if (!externalCloseEditor) return;
		if (externalCloseEditor.cellIndex !== cellIndex) return;
		if (externalCloseEditor.rev === lastCloseEditorRev.current) return;
		lastCloseEditorRev.current = externalCloseEditor.rev;
		const t = panelDock.tabs[panelDock.activeIndex];
		const path =
			t?.type === "file"
				? t.path
				: (panelDock.tabs.find((x) => x.type === "file") as { type: "file"; path: string } | undefined)
						?.path ?? selectedPath;
		if (!path) return;
		patchDock((prev) => applyRemoveFileTab(prev, path));
		setSelectedPath(null);
	}, [externalCloseEditor, cellIndex, panelDock.tabs, panelDock.activeIndex, selectedPath, patchDock]);

	useEffect(() => {
		if (!selectedPath) return;
		patchDock((prev) => {
			const next = applyEnsureFileTab(prev, selectedPath);
			return next === prev ? prev : next;
		});
	}, [selectedPath, patchDock]);

	useEffect(() => {
		const a = panelDock.tabs[panelDock.activeIndex];
		if (a?.type !== "file") return;
		setSelectedPath((p) => (p === a.path ? p : a.path));
	}, [panelDock.activeIndex, panelDock.tabs]);

	useEffect(() => {
		const hasFile = panelDock.tabs.some((t) => t.type === "file");
		if (!hasFile) setSelectedPath(null);
	}, [panelDock.tabs]);

	const buildSnapshot = useCallback((): TechnicalWorkspaceCellSnapshot => {
		return {
			selectedPath,
			content,
			setContent,
			loading: fileLoading,
			error: fileError,
			dirty,
			persistEncoding,
			save,
			reload,
			discardUnsavedChanges,
			panelDock,
		};
	}, [
		selectedPath,
		content,
		setContent,
		fileLoading,
		fileError,
		dirty,
		persistEncoding,
		save,
		reload,
		discardUnsavedChanges,
		panelDock,
	]);

	useLayoutEffect(() => {
		if (!isFocused) return;
		onReportFocused(buildSnapshot());
	}, [isFocused, onReportFocused, buildSnapshot]);

	useEffect(() => {
		if (!registerCellSave) return;
		const hasFile = !!selectedPath;
		const cellDirty = hasFile && dirty;
		registerCellSave(cellIndex, { dirty: cellDirty, save });
		return () => registerCellSave(cellIndex, null);
	}, [registerCellSave, cellIndex, selectedPath, dirty, save]);

	const onSave = useCallback(async () => {
		const ok = await save();
		if (ok) await refresh();
	}, [save, refresh]);

	const gitReviewHasAnyMarked = useMemo(
		() => gitMarkedFilePathsSorted(workspaceTreeNodes).length > 0,
		[workspaceTreeNodes],
	);
	const gitReviewCanAdvanceNext = useMemo(
		() => nextGitReviewFilePath(selectedPath, workspaceTreeNodes) != null,
		[selectedPath, workspaceTreeNodes],
	);

	const cellGitFileReviewActions = useMemo(
		() => ({
			onSaveAndStage: async () => {
				if (!selectedPath) return;
				if (dirty) {
					const ok = await save();
					if (!ok) return;
				}
				const r = await apiPostJson<{ ok?: boolean; error?: string }>("/api/git/stage", { path: selectedPath });
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
				if (next) {
					patchDock((prev) => applyAddFileTab(prev, next));
					setSelectedPath(next);
				}
			},
		}),
		[selectedPath, dirty, save, refreshQuiet, patchDock],
	);

	const onExternalFileDrop = useCallback(
		(path: string, before: PanelTab | null) => {
			patchDock((prev) => {
				const next = applyAddFileTab(prev, path);
				const moving: PanelTab = { type: "file", path };
				return applyPanelTabMove(next, moving, before);
			});
		},
		[patchDock],
	);

	const layoutMulti = layoutCols * layoutRows > 1;

	return (
		<WorkspaceCellDropSurface
			cellIndex={cellIndex}
			cols={hitCols}
			rows={hitRows}
			onDropPayload={onWorkspaceSurfaceDrop}
			className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${
				isFocused ? "ring-2 ring-[#ea580c] ring-inset" : "ring-0"
			}`}
		>
			<div
				className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
				data-wop-workspace-cell={cellIndex}
				onMouseDownCapture={() => onActivate()}
			>
				<WorkspacePane
					ref={editorRef}
					tabs={panelDock.tabs}
					activeIndex={panelDock.activeIndex}
					onActiveIndexChange={setWorkspaceActiveIndex}
					onSelectFileTab={onSelectFileFromWorkspaceTab}
					onReorderTab={onDockEntryMove}
					onCloseTab={onDockEntryClose}
					onAddTool={onAddTool}
					fileActions={fileActions}
					logs={logs}
					editorPath={selectedPath}
					content={content}
					onChange={setContent}
					loading={fileLoading}
					error={fileError}
					dirty={dirty}
					persistEncoding={persistEncoding}
					filePreview={filePreview}
					onSave={onSave}
					onDiscardUnsaved={discardUnsavedChanges}
					onCursor={onCursor}
					compact
					showExplorerHint={false}
					onOpenWorkspace={onOpenWorkspace}
					workspaceDockActions={workspaceDockActions}
					wordWrap={wordWrap}
					showBreadcrumbs={showBreadcrumbs}
					onFindInFiles={onFindInFiles}
					onReplaceInFiles={onReplaceInFiles}
					onUndoRedoStackChange={onUndoRedoStackChange}
					onSelectionPrefsChange={onSelectionPrefsChange}
					dndSourceCellIndex={cellIndex}
					workspacePaneReorderCellIndex={
						layoutMulti && maximizedCell == null ? cellIndex : undefined
					}
					onExternalFileDrop={onExternalFileDrop}
					onCrossCellTabDrop={
						onCrossCellTabMoveBetweenCells
							? (fromCell, tab, before) =>
									onCrossCellTabMoveBetweenCells(fromCell, cellIndex, tab, before)
							: undefined
					}
					onSplitEditorRight={onSplitEditorRight}
					splitEditorDisabled={splitEditorDisabled}
					onToggleWorkspaceMaximize={
						layoutMulti ? () => onToggleMaximizeCell?.(cellIndex) : undefined
					}
					workspaceMaximizeActive={maximizedCell === cellIndex}
					workspaceMaximizeDisabled={!layoutMulti}
					onCloseWorkspacePane={
						layoutMulti
							? maximizedCell != null
								? () => onToggleMaximizeCell?.(cellIndex)
								: () => onRemoveWorkspaceCell?.(cellIndex)
							: undefined
					}
					closeWorkspacePaneDisabled={false}
					workspaceGridPicker={workspaceGridPicker}
					agentTeamPane={agentTeamPane}
					workspaceEmbeddedChat={workspaceEmbeddedChat}
					breadcrumbWorkspaceLabel={breadcrumbWorkspaceLabel}
					gitFileReviewActions={cellGitFileReviewActions}
					gitReviewHasAnyMarked={gitReviewHasAnyMarked}
					gitReviewCanAdvanceNext={gitReviewCanAdvanceNext}
				/>
			</div>
		</WorkspaceCellDropSurface>
	);
}

export type TechnicalWorkspaceGridProps = {
	grid: WorkspaceGridState;
	onPatchCell: (cellIndex: number, update: SetStateAction<PanelDockLayout>) => void;
	focusedCell: number;
	onFocusCell: Dispatch<SetStateAction<number>>;
	onFocusedReport: (s: TechnicalWorkspaceCellSnapshot) => void;
	onFocusedCursor: (line: number, col: number) => void;
	workspaceEditorRef: React.RefObject<WorkspaceEditorRef | null>;
	logs: LogRow[];
	fileActions: DockFileActionItem[];
	onOpenToolPanelForCell: (cellIndex: number, tab: BottomPanelTab) => void;
	onOpenWorkspace: () => void | Promise<void>;
	workspaceDockActions?: {
		onOpenFile: () => void;
		onShowAgentChat: (cellIndex: number) => void;
	};
	workspaceEmbeddedChat?: () => ReactNode;
	wordWrap: boolean;
	showBreadcrumbs: boolean;
	onFindInFiles?: () => void;
	onReplaceInFiles?: () => void;
	onUndoRedoStackChange?: () => void;
	onSelectionPrefsChange?: () => void;
	refresh: () => Promise<void>;
	autoSave: boolean;
	externalOpenFile: { path: string; rev: number } | null;
	externalCloseEditor: { rev: number; cellIndex: number } | null;
	onWorkspaceSurfaceDrop: (e: React.DragEvent, surfaceCellIndex: number, zone: WopDropZone) => void;
	onSplitEditorRight?: () => void;
	splitEditorDisabled?: boolean;
	maximizedCell: number | null;
	onToggleMaximizeCell?: (cellIndex: number) => void;
	onRemoveWorkspaceCell?: (cellIndex: number) => void;
	workspaceGridPicker: WorkspaceGridPickerConfig | null;
	agentTeamPane: {
		agentTeams: Record<string, string[]>;
		agents: AgentMeta[];
		agentsLoading?: boolean;
		teamSessionTranscript?: ChatRow[];
		streaming?: boolean;
		chatAgentName?: string | null;
		dispatchTurnAgent?: string | null;
		chatPulseMeters?: ChatPulseMeters | null;
		sessionTokenSummary?: { tokensDown: string; tokensUp: string; tokensTitle?: string } | null;
		onEditTeam?: () => void;
	} | null;
	onCrossCellTabMoveBetweenCells?: (
		fromCell: number,
		toCell: number,
		tab: PanelTab,
		before: PanelTab | null,
	) => void;
	/** Drag horizontal bar between stacked rows (`rows > 1`). */
	onWorkspaceGridRowResize?: (rowEdge: number, dy: number) => void;
	/** Drag vertical bar between columns (`cols > 1`). */
	onWorkspaceGridColResize?: (colEdge: number, dx: number) => void;
	/** File → Save All across editor cells. */
	onBindMultiCellSaveApi?: (api: { saveAllDirty: () => Promise<boolean> } | null) => void;
	onMultiCellAnyDirtyChange?: (anyDirty: boolean) => void;
	/** First breadcrumb segment in the editor chrome (workspace folder name). */
	breadcrumbWorkspaceLabel?: string | null;
	/** Workspace tree (Git badges) for per-cell **Keep** / **Review next**. */
	workspaceTreeNodes: TreeNode[];
	refreshQuiet: () => Promise<WorkspaceResponse | null>;
};

export function TechnicalWorkspaceGrid({
	grid,
	onPatchCell,
	focusedCell,
	onFocusCell,
	onFocusedReport,
	onFocusedCursor,
	workspaceEditorRef,
	logs,
	fileActions,
	onOpenToolPanelForCell,
	onOpenWorkspace,
	workspaceDockActions,
	workspaceEmbeddedChat,
	wordWrap,
	showBreadcrumbs,
	onFindInFiles,
	onReplaceInFiles,
	onUndoRedoStackChange,
	onSelectionPrefsChange,
	refresh,
	autoSave,
	externalOpenFile,
	externalCloseEditor,
	onWorkspaceSurfaceDrop,
	onSplitEditorRight,
	splitEditorDisabled,
	maximizedCell,
	onToggleMaximizeCell,
	onRemoveWorkspaceCell,
	workspaceGridPicker,
	agentTeamPane,
	onCrossCellTabMoveBetweenCells,
	onWorkspaceGridRowResize,
	onWorkspaceGridColResize,
	onBindMultiCellSaveApi,
	onMultiCellAnyDirtyChange,
	breadcrumbWorkspaceLabel = null,
	workspaceTreeNodes,
	refreshQuiet,
}: TechnicalWorkspaceGridProps) {
	const total = grid.cols * grid.rows;

	const cellSaveRegistry = useRef(new Map<number, { dirty: boolean; save: () => Promise<boolean> }>());

	const registerCellSave = useCallback(
		(cellIndex: number, entry: { dirty: boolean; save: () => Promise<boolean> } | null) => {
			if (entry == null) cellSaveRegistry.current.delete(cellIndex);
			else cellSaveRegistry.current.set(cellIndex, entry);
			if (!onMultiCellAnyDirtyChange) return;
			let any = false;
			for (const [, v] of cellSaveRegistry.current) {
				if (v.dirty) {
					any = true;
					break;
				}
			}
			onMultiCellAnyDirtyChange(any);
		},
		[onMultiCellAnyDirtyChange],
	);

	useEffect(() => {
		if (!onBindMultiCellSaveApi) return;
		const api = {
			saveAllDirty: async () => {
				let ok = true;
				for (const [, v] of cellSaveRegistry.current) {
					if (v.dirty) ok = (await v.save()) && ok;
				}
				return ok;
			},
		};
		onBindMultiCellSaveApi(api);
		return () => onBindMultiCellSaveApi(null);
	}, [onBindMultiCellSaveApi]);

	if (maximizedCell != null && maximizedCell >= 0 && maximizedCell < total) {
		const dock = grid.cells[maximizedCell] ?? grid.cells[0]!;
		return (
			<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
				<WorkspaceGridCell
					key={maximizedCell}
					cellIndex={maximizedCell}
					panelDock={dock}
					onPatchCell={onPatchCell}
					isFocused
					onActivate={() => onFocusCell(maximizedCell)}
					onReportFocused={onFocusedReport}
					onCursor={onFocusedCursor}
					editorRef={workspaceEditorRef}
					logs={logs}
					fileActions={fileActions}
					onAddTool={(tab) => onOpenToolPanelForCell(maximizedCell, tab)}
					onOpenWorkspace={onOpenWorkspace}
					workspaceDockActions={workspaceDockActions}
					wordWrap={wordWrap}
					showBreadcrumbs={showBreadcrumbs}
					onFindInFiles={onFindInFiles}
					onReplaceInFiles={onReplaceInFiles}
					onUndoRedoStackChange={onUndoRedoStackChange}
					onSelectionPrefsChange={onSelectionPrefsChange}
					refresh={refresh}
					autoSave={autoSave}
					externalOpenFile={externalOpenFile}
					externalCloseEditor={externalCloseEditor}
					hitCols={1}
					hitRows={1}
					layoutCols={grid.cols}
					layoutRows={grid.rows}
					onWorkspaceSurfaceDrop={onWorkspaceSurfaceDrop}
					onSplitEditorRight={onSplitEditorRight}
					splitEditorDisabled={splitEditorDisabled}
					maximizedCell={maximizedCell}
					onToggleMaximizeCell={onToggleMaximizeCell}
					onRemoveWorkspaceCell={onRemoveWorkspaceCell}
					workspaceGridPicker={workspaceGridPicker}
					agentTeamPane={agentTeamPane}
					workspaceEmbeddedChat={workspaceEmbeddedChat}
					onCrossCellTabMoveBetweenCells={onCrossCellTabMoveBetweenCells}
					registerCellSave={registerCellSave}
					breadcrumbWorkspaceLabel={breadcrumbWorkspaceLabel}
					workspaceTreeNodes={workspaceTreeNodes}
					refreshQuiet={refreshQuiet}
				/>
			</div>
		);
	}

	const rowW =
		grid.rowWeights?.length === grid.rows
			? grid.rowWeights
			: Array.from({ length: grid.rows }, () => 1);
	const colW =
		grid.colWeights?.length === grid.cols
			? grid.colWeights
			: Array.from({ length: grid.cols }, () => 1);

	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#252526]">
			{Array.from({ length: grid.rows }, (_, r) => (
				<Fragment key={`wrow-${r}`}>
					{r > 0 ? (
						<DockSplitHandle
							orientation="horizontal"
							ariaLabel={`Resize workspace row ${r} / ${r + 1}`}
							onDelta={(_, dy) => onWorkspaceGridRowResize?.(r - 1, dy)}
						/>
					) : null}
					<div
						className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden"
						style={{
							flex: rowW[r],
							minHeight: grid.rows > 1 ? 72 : undefined,
						}}
					>
						{Array.from({ length: grid.cols }, (_, c) => {
							const cellIndex = r * grid.cols + c;
							const dock = grid.cells[cellIndex] ?? grid.cells[0]!;
							return (
								<Fragment key={`wcell-${cellIndex}`}>
									{c > 0 ? (
										<DockSplitHandle
											orientation="vertical"
											ariaLabel={`Resize workspace column ${c} / ${c + 1}`}
											onDelta={(dx) => onWorkspaceGridColResize?.(c - 1, dx)}
										/>
									) : null}
									<div
										className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
										style={{
											flex: colW[c],
											minWidth: grid.cols > 1 ? 96 : undefined,
										}}
									>
										<WorkspaceGridCell
											cellIndex={cellIndex}
											panelDock={dock}
											onPatchCell={onPatchCell}
											isFocused={focusedCell === cellIndex}
											onActivate={() => onFocusCell(cellIndex)}
											onReportFocused={onFocusedReport}
											onCursor={(line, col) => {
												if (focusedCell === cellIndex) onFocusedCursor(line, col);
											}}
											editorRef={focusedCell === cellIndex ? workspaceEditorRef : undefined}
											logs={logs}
											fileActions={fileActions}
											onAddTool={(tab) => onOpenToolPanelForCell(cellIndex, tab)}
											onOpenWorkspace={onOpenWorkspace}
											workspaceDockActions={workspaceDockActions}
											wordWrap={wordWrap}
											showBreadcrumbs={showBreadcrumbs}
											onFindInFiles={onFindInFiles}
											onReplaceInFiles={onReplaceInFiles}
											onUndoRedoStackChange={onUndoRedoStackChange}
											onSelectionPrefsChange={onSelectionPrefsChange}
											refresh={refresh}
											autoSave={autoSave}
											externalOpenFile={externalOpenFile}
											externalCloseEditor={externalCloseEditor}
											hitCols={grid.cols}
											hitRows={grid.rows}
											layoutCols={grid.cols}
											layoutRows={grid.rows}
											onWorkspaceSurfaceDrop={onWorkspaceSurfaceDrop}
											onSplitEditorRight={onSplitEditorRight}
											splitEditorDisabled={splitEditorDisabled}
											maximizedCell={maximizedCell}
											onToggleMaximizeCell={onToggleMaximizeCell}
											onRemoveWorkspaceCell={onRemoveWorkspaceCell}
											workspaceGridPicker={workspaceGridPicker}
											agentTeamPane={agentTeamPane}
											workspaceEmbeddedChat={workspaceEmbeddedChat}
											onCrossCellTabMoveBetweenCells={onCrossCellTabMoveBetweenCells}
											registerCellSave={registerCellSave}
											breadcrumbWorkspaceLabel={breadcrumbWorkspaceLabel}
											workspaceTreeNodes={workspaceTreeNodes}
											refreshQuiet={refreshQuiet}
										/>
									</div>
								</Fragment>
							);
						})}
					</div>
				</Fragment>
			))}
		</div>
	);
}
