import { ChevronDown, ChevronRight, FilePlus, FolderPlus, Search, SidebarClose } from "lucide-react";
import { useCallback, useMemo, useRef, useState, type DragEvent, type MouseEvent } from "react";
import { FileTree } from "./FileTree";
import type { TreeNode } from "../types/tree";
import { filterTreeByQuery } from "../utils/filterTreeByQuery";
import { isExplorerFilePathDrag, readDraggedExplorerFilePath } from "../utils/panelDockLayout";
import { posixDirname } from "../utils/posixPath";
import { sortTreeNodes } from "../utils/sortTreeNodes";

export function ExplorerSidebar({
	nodes,
	rootLabel,
	selectedPath,
	secondarySelectedPath,
	openInMainEditorPaths,
	onSelectFile,
	onSelectDirectory,
	onMoveFileToDirectory,
	allowDropToWorkspaceRoot,
	onRenameExplorerNode,
	onDeleteExplorerNode,
	onCopyExplorerPath,
	onNewFile,
	onNewFolder,
	loading,
	error,
	expandRevision,
	pathsToExpand,
	onExplorerGitMutated,
	onClosePrimarySidebar,
}: {
	nodes: TreeNode[];
	rootLabel: string;
	selectedPath: string | null;
	secondarySelectedPath?: string | null;
	openInMainEditorPaths?: readonly string[];
	onSelectFile: (path: string, ev?: MouseEvent) => void;
	onSelectDirectory?: (dirPath: string) => void;
	/** Move file on disk (single- and multi-root). */
	onMoveFileToDirectory?: (fromPath: string, toDirPath: string) => Promise<void>;
	/** Single-folder workspace: allow drop into empty area below tree → workspace root. */
	allowDropToWorkspaceRoot?: boolean;
	onRenameExplorerNode?: (path: string, kind: "file" | "dir", currentName: string) => Promise<void>;
	onDeleteExplorerNode?: (path: string, kind: "file" | "dir") => Promise<void>;
	onCopyExplorerPath?: (path: string) => void;
	onNewFile?: () => void;
	onNewFolder?: () => void;
	loading: boolean;
	error: string | null;
	expandRevision?: number;
	pathsToExpand?: string[];
	/** After staging from explorer Git badge — reload tree. */
	onExplorerGitMutated?: () => void;
	/** Hide the whole primary (left) sidebar — same as menu bar / Ctrl+B. */
	onClosePrimarySidebar?: () => void;
}) {
	const [outlineOpen, setOutlineOpen] = useState(false);
	const [timelineOpen, setTimelineOpen] = useState(false);
	const [workspaceTreeOpen, setWorkspaceTreeOpen] = useState(true);
	const [explorerSearchQuery, setExplorerSearchQuery] = useState("");
	const [rootDropActive, setRootDropActive] = useState(false);
	const explorerTreeHostRef = useRef<HTMLDivElement | null>(null);

	const explorerSearchActive = explorerSearchQuery.trim().length > 0;
	const sortedExplorerNodes = useMemo(() => sortTreeNodes(nodes), [nodes]);
	const explorerDisplayNodes = useMemo(() => {
		if (!explorerSearchActive) return sortedExplorerNodes;
		return filterTreeByQuery(sortedExplorerNodes, explorerSearchQuery.trim().toLowerCase());
	}, [sortedExplorerNodes, explorerSearchActive, explorerSearchQuery]);

	const onRootDragOver = useCallback(
		(e: DragEvent<HTMLDivElement>) => {
			if (!allowDropToWorkspaceRoot || !onMoveFileToDirectory || !isExplorerFilePathDrag(e.dataTransfer)) return;
			// Tree / FileTree handle drag feedback and empty-area root drops; avoid painting the whole pane.
			if (explorerTreeHostRef.current?.contains(e.target as Node)) return;
			e.preventDefault();
			e.dataTransfer.dropEffect = "move";
			setRootDropActive(true);
		},
		[allowDropToWorkspaceRoot, onMoveFileToDirectory],
	);

	const onRootDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
		const rel = e.relatedTarget as Node | null;
		if (rel && e.currentTarget.contains(rel)) return;
		setRootDropActive(false);
	}, []);

	const onRootDrop = useCallback(
		async (e: DragEvent<HTMLDivElement>) => {
			if (!allowDropToWorkspaceRoot || !onMoveFileToDirectory) return;
			e.preventDefault();
			setRootDropActive(false);
			const from = readDraggedExplorerFilePath(e.dataTransfer);
			if (!from) return;
			if (posixDirname(from) === "") return;
			await onMoveFileToDirectory(from, "");
		},
		[allowDropToWorkspaceRoot, onMoveFileToDirectory],
	);

	return (
		<div className="flex min-h-0 min-w-0 w-full flex-1 flex-col border-r border-[#3c3c3c] bg-[#252526]">
			<div className="flex shrink-0 w-full min-w-0 items-stretch bg-[#2d2d2d]">
				<button
					type="button"
					onClick={() => setWorkspaceTreeOpen((o) => !o)}
					className="flex min-w-0 flex-1 cursor-pointer items-center px-1 py-1 text-left text-[11px] font-bold uppercase text-[#cccccc] hover:bg-[#383838]"
				>
					{workspaceTreeOpen ? (
						<ChevronDown size={14} className="mr-1 shrink-0" />
					) : (
						<ChevronRight size={14} className="mr-1 shrink-0" />
					)}
					<span className="truncate" title={rootLabel}>
						{rootLabel || "WORKSPACE"}
					</span>
				</button>
				{onClosePrimarySidebar ? (
					<button
						type="button"
						title="Close primary sidebar (Ctrl+B)"
						aria-label="Close primary sidebar"
						onClick={(e) => {
							e.stopPropagation();
							onClosePrimarySidebar();
						}}
						className="flex shrink-0 items-center border-l border-[#3c3c3c] px-1.5 text-[#858585] hover:bg-[#383838] hover:text-[#cccccc]"
					>
						<SidebarClose size={14} strokeWidth={1.75} aria-hidden />
					</button>
				) : null}
			</div>
			{workspaceTreeOpen ? (
				<div className="flex shrink-0 min-w-0 items-center gap-1 border-b border-[#3c3c3c] bg-[#252526] px-1 py-0.5">
					<div className="relative min-w-0 flex-1">
						<label htmlFor="wop-explorer-file-search" className="sr-only">
							Search files in explorer
						</label>
						<Search
							size={12}
							className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-[#858585]"
							aria-hidden
						/>
						<input
							id="wop-explorer-file-search"
							type="search"
							value={explorerSearchQuery}
							onChange={(e) => setExplorerSearchQuery(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Escape") {
									e.preventDefault();
									setExplorerSearchQuery("");
								}
							}}
							placeholder="Search files…"
							autoComplete="off"
							spellCheck={false}
							className="w-full min-w-0 rounded border border-[#3c3c3c] bg-[#1e1e1e] py-1 pl-6 pr-1 font-mono text-[11px] text-[#cccccc] outline-none ring-0 placeholder:text-[#6f6f6f] focus:border-[#ea580c]/55 focus:ring-1 focus:ring-[#ea580c]/25"
						/>
					</div>
					<div className="flex shrink-0 items-center gap-0.5">
						<button
							type="button"
							title="New file"
							onClick={() => onNewFile?.()}
							disabled={!onNewFile}
							className="rounded p-1 text-[#cccccc] hover:bg-[#3c3c3c] disabled:cursor-not-allowed disabled:opacity-40"
						>
							<FilePlus size={16} />
						</button>
						<button
							type="button"
							title="New folder"
							onClick={() => onNewFolder?.()}
							disabled={!onNewFolder}
							className="rounded p-1 text-[#cccccc] hover:bg-[#3c3c3c] disabled:cursor-not-allowed disabled:opacity-40"
						>
							<FolderPlus size={16} />
						</button>
					</div>
				</div>
			) : null}
			<div
				className={`min-h-0 flex-1 overflow-y-auto py-1 ${rootDropActive ? "bg-[#264f78]/25 outline outline-1 outline-[#ea580c]/40 -outline-offset-1" : ""}`}
				onDragOver={allowDropToWorkspaceRoot && onMoveFileToDirectory ? onRootDragOver : undefined}
				onDragLeave={allowDropToWorkspaceRoot && onMoveFileToDirectory ? onRootDragLeave : undefined}
				onDrop={allowDropToWorkspaceRoot && onMoveFileToDirectory ? (e) => void onRootDrop(e) : undefined}
			>
				{!workspaceTreeOpen ? null : loading ? (
					<div className="px-3 py-2 font-mono text-[12px] text-[#858585]">Loading tree…</div>
				) : error ? (
					<div className="px-3 py-2 font-mono text-[12px] text-[#f14c4c]">{error}</div>
				) : explorerSearchActive && explorerDisplayNodes.length === 0 ? (
					<div className="px-3 py-2 font-mono text-[12px] text-[#858585]">No matching files or folders.</div>
				) : (
					<div ref={explorerTreeHostRef} className="flex min-h-0 flex-1 flex-col">
						<FileTree
							nodes={explorerDisplayNodes}
							selectedPath={selectedPath}
							secondarySelectedPath={secondarySelectedPath}
							openInMainEditorPaths={openInMainEditorPaths}
							onSelectFile={onSelectFile}
							onSelectDirectory={onSelectDirectory}
							onMoveFileToDirectory={onMoveFileToDirectory}
							allowWorkspaceRootDrop={allowDropToWorkspaceRoot}
							onRenameNode={onRenameExplorerNode}
							onDeleteNode={onDeleteExplorerNode}
							onCopyPath={onCopyExplorerPath}
							expandRevision={expandRevision}
							pathsToExpand={pathsToExpand}
							onExplorerGitMutated={onExplorerGitMutated}
							searchFilterActive={explorerSearchActive}
						/>
					</div>
				)}
			</div>
			<div className="shrink-0 border-t border-[#3c3c3c] bg-[#2d2d2d]">
				<button
					type="button"
					onClick={() => setOutlineOpen((o) => !o)}
					className="flex w-full cursor-pointer items-center px-1 py-1 text-left text-[11px] font-bold uppercase text-[#cccccc] hover:bg-[#383838]"
				>
					{outlineOpen ? <ChevronDown size={14} className="mr-1 shrink-0" /> : <ChevronRight size={14} className="mr-1 shrink-0" />}
					OUTLINE
				</button>
				{outlineOpen ? (
					<div className="border-t border-[#3c3c3c] px-3 py-2 font-mono text-[11px] text-[#858585]">
						{selectedPath ? (
							<span>Symbols for open file — not wired yet. File: {selectedPath}</span>
						) : (
							<span>Open a file to see outline (planned).</span>
						)}
					</div>
				) : null}
			</div>
			<div className="shrink-0 border-t border-[#3c3c3c] bg-[#2d2d2d]">
				<button
					type="button"
					onClick={() => setTimelineOpen((o) => !o)}
					className="flex w-full cursor-pointer items-center px-1 py-1 text-left text-[11px] font-bold uppercase text-[#cccccc] hover:bg-[#383838]"
				>
					{timelineOpen ? <ChevronDown size={14} className="mr-1 shrink-0" /> : <ChevronRight size={14} className="mr-1 shrink-0" />}
					TIMELINE
				</button>
				{timelineOpen ? (
					<div className="border-t border-[#3c3c3c] px-3 py-2 font-mono text-[11px] text-[#858585]">
						Git / local history — planned. Use your VCS outside the shell for now.
					</div>
				) : null}
			</div>
		</div>
	);
}
