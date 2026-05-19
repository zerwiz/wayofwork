import {
	ChevronDown,
	ChevronRight,
	FileCode2,
	FileJson,
	File as FileIcon,
	Folder,
	Search,
} from "lucide-react";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type DragEvent,
	type ReactNode,
} from "react";
import type { TreeNode } from "../../types/tree";
import { GitExplorerStatusBadge } from "../GitExplorerStatusBadge";
import { gitExplorerRowTitle } from "../../utils/gitStatusUi";
import {
	isExplorerFilePathDrag,
	readDraggedExplorerFilePath,
	serializeFilePathForDrag,
	WOP_FILE_PATH_DND_TYPE,
} from "../../utils/panelDockLayout";
import { posixBasename, posixDirname } from "../../utils/posixPath";
import { filterTreeByQuery } from "../../utils/filterTreeByQuery";
import { sortTreeNodes } from "../../utils/sortTreeNodes";

function fileRowIcon(name: string, appearanceDark: boolean) {
	const lower = name.toLowerCase();
	const code = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const json = appearanceDark ? "text-amber-400/90" : "text-amber-700";
	if (lower.endsWith(".json")) return <FileJson size={15} className={`shrink-0 ${json}`} />;
	if (
		lower.endsWith(".py") ||
		lower.endsWith(".ts") ||
		lower.endsWith(".tsx") ||
		lower.endsWith(".js") ||
		lower.endsWith(".jsx") ||
		lower.endsWith(".md")
	) {
		return <FileCode2 size={15} className={`shrink-0 ${code}`} />;
	}
	return <FileIcon size={15} className={`shrink-0 ${code}`} />;
}

function parentDirPaths(filePath: string): string[] {
	const norm = filePath.replace(/\\/g, "/");
	const segs = norm.split("/").filter(Boolean);
	if (segs.length <= 1) return [];
	const out: string[] = [];
	let acc = "";
	for (let i = 0; i < segs.length - 1; i++) {
		acc = acc ? `${acc}/${segs[i]}` : segs[i];
		out.push(acc);
	}
	return out;
}

function destPathForMove(from: string, toDir: string): string {
	const base = posixBasename(from);
	const d = toDir.replace(/\/+$/, "");
	return d ? `${d}/${base}` : base;
}

export function SimpleFileTree({
	nodes,
	selectedPath,
	onSelectFile,
	appearanceDark,
	onExplorerGitMutated,
	showSearch = true,
	onMoveFileToDirectory,
	allowWorkspaceRootDrop,
	/** Shown when the tree has no nodes (and not in active search). */
	emptyTreeHint,
}: {
	nodes: TreeNode[];
	selectedPath: string | null;
	onSelectFile: (path: string) => void;
	appearanceDark: boolean;
	onExplorerGitMutated?: () => void;
	/** Pin a search field above the tree (default on). */
	showSearch?: boolean;
	onMoveFileToDirectory?: (fromPath: string, toDirPath: string) => Promise<void>;
	/** Single-root workspace: empty tree padding accepts drop → workspace root (`""`). */
	allowWorkspaceRootDrop?: boolean;
	emptyTreeHint?: string;
}) {
	const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
	const [searchQuery, setSearchQuery] = useState("");
	const [dropTargetDir, setDropTargetDir] = useState<string | null>(null);
	const [rootEmptyDropActive, setRootEmptyDropActive] = useState(false);
	const suppressFileClickRef = useRef(false);
	const sorted = useMemo(() => sortTreeNodes(nodes), [nodes]);

	const searchActive = showSearch && searchQuery.trim().length > 0;
	const displayNodes = useMemo(() => {
		if (!searchActive) return sorted;
		return filterTreeByQuery(sorted, searchQuery.trim().toLowerCase());
	}, [sorted, searchActive, searchQuery]);

	useEffect(() => {
		if (!selectedPath) return;
		const parents = parentDirPaths(selectedPath);
		if (parents.length === 0) return;
		setExpanded((prev) => {
			const next = new Set(prev);
			for (const p of parents) next.add(p);
			return next;
		});
	}, [selectedPath]);

	const toggle = useCallback((path: string) => {
		setExpanded((prev) => {
			const next = new Set(prev);
			if (next.has(path)) next.delete(path);
			else next.add(path);
			return next;
		});
	}, []);

	const runMove = useCallback(
		async (from: string, toDir: string) => {
			if (!onMoveFileToDirectory) return;
			const dest = destPathForMove(from, toDir);
			if (dest.replace(/\/+$/, "") === from.replace(/\/+$/, "")) return;
			await onMoveFileToDirectory(from, toDir);
		},
		[onMoveFileToDirectory],
	);

	const onFolderDragOver = useCallback(
		(e: DragEvent, dirPath: string) => {
			if (!onMoveFileToDirectory || !isExplorerFilePathDrag(e.dataTransfer)) return;
			e.preventDefault();
			e.stopPropagation();
			e.dataTransfer.dropEffect = "move";
			setDropTargetDir(dirPath);
		},
		[onMoveFileToDirectory],
	);

	const onFolderDragLeave = useCallback((e: DragEvent) => {
		const rel = e.relatedTarget as Node | null;
		if (rel && e.currentTarget.contains(rel)) return;
		setDropTargetDir(null);
	}, []);

	const onFolderDrop = useCallback(
		async (e: DragEvent, dirPath: string) => {
			if (!onMoveFileToDirectory) return;
			e.preventDefault();
			e.stopPropagation();
			setDropTargetDir(null);
			const from = readDraggedExplorerFilePath(e.dataTransfer);
			if (!from) return;
			await runMove(from, dirPath);
			setExpanded((prev) => {
				const next = new Set(prev);
				next.add(dirPath);
				return next;
			});
		},
		[onMoveFileToDirectory, runMove],
	);

	const onFileRowDrop = useCallback(
		async (e: DragEvent, filePath: string) => {
			if (!onMoveFileToDirectory) return;
			e.preventDefault();
			e.stopPropagation();
			setDropTargetDir(null);
			const from = readDraggedExplorerFilePath(e.dataTransfer);
			if (!from || from === filePath) return;
			const toDir = posixDirname(filePath);
			await runMove(from, toDir);
			setExpanded((prev) => {
				const next = new Set(prev);
				if (toDir) next.add(toDir);
				return next;
			});
		},
		[onMoveFileToDirectory, runMove],
	);

	const onTreeRootEmptyDragOver = useCallback(
		(e: DragEvent<HTMLDivElement>) => {
			if (!allowWorkspaceRootDrop || !onMoveFileToDirectory || !isExplorerFilePathDrag(e.dataTransfer)) return;
			if (e.target !== e.currentTarget) return;
			e.preventDefault();
			e.dataTransfer.dropEffect = "move";
			setRootEmptyDropActive(true);
		},
		[allowWorkspaceRootDrop, onMoveFileToDirectory],
	);

	const onTreeRootEmptyDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
		const rel = e.relatedTarget as Node | null;
		if (rel && e.currentTarget.contains(rel)) return;
		setRootEmptyDropActive(false);
	}, []);

	const onTreeRootEmptyDrop = useCallback(
		async (e: DragEvent<HTMLDivElement>) => {
			if (!allowWorkspaceRootDrop || !onMoveFileToDirectory) return;
			if (e.target !== e.currentTarget) return;
			e.preventDefault();
			setRootEmptyDropActive(false);
			const from = readDraggedExplorerFilePath(e.dataTransfer);
			if (!from) return;
			if (posixDirname(from) === "") return;
			await onMoveFileToDirectory(from, "");
		},
		[allowWorkspaceRootDrop, onMoveFileToDirectory],
	);

	const chevron = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const dirName = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";
	const hoverRow = appearanceDark ? "hover:bg-[#3c3c3c]/80" : "hover:bg-[#e5e5e5]";
	const fileName = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";
	const searchWrap = appearanceDark ? "border-[#3c3c3c] bg-[#252526]" : "border-[#e5e5e5] bg-white";
	const searchInput = appearanceDark
		? "border-[#3c3c3c] bg-[#1e1e1e] text-[#cccccc] placeholder:text-[#6f6f6f] focus:border-[#ea580c]/60 focus:ring-[#ea580c]/25"
		: "border-[#d4d4d4] bg-white text-[#333333] placeholder:text-[#a3a3a3] focus:border-[#ea580c]/55 focus:ring-[#ea580c]/20";
	const searchIcon = appearanceDark ? "text-[#858585]" : "text-[#737373]";
	const emptySearch = appearanceDark ? "text-[#858585]" : "text-[#737373]";

	const renderNodes = (list: TreeNode[], depth: number): ReactNode =>
		list.map((node) => {
			const isDir = node.type === "dir";
			const isOpen = searchActive || expanded.has(node.path);
			const selected = selectedPath === node.path;
			const modified =
				!isDir &&
				node.gitStatus != null &&
				node.gitStatus !== "" &&
				node.gitStatus !== " " &&
				node.gitStatus !== "*";

			const rowBase = `flex w-full items-center rounded-lg border px-2 py-1.5 text-left text-[13px] font-medium transition-colors ${hoverRow}`;
			const dirDrop =
				isDir && dropTargetDir === node.path
					? appearanceDark
						? "border-[#ea580c]/50 bg-[#264f78]/30 ring-2 ring-inset ring-[#ea580c]/40"
						: "border-[#ea580c]/55 bg-[#ea580c]/12 ring-2 ring-inset ring-[#ea580c]/45"
					: "";
			const rowSelected = selected
				? appearanceDark
					? "border-[#ea580c]/40 bg-[#ea580c]/10"
					: "border-[#ea580c]/50 bg-[#ea580c]/10"
				: modified
					? "border-amber-500/25 bg-amber-500/10"
					: "border-transparent";

			return (
				<div key={node.path}>
					<button
						type="button"
						title={gitExplorerRowTitle(node.gitStatus)}
						draggable={!isDir && Boolean(onMoveFileToDirectory)}
						onClick={(e) => {
							if (!isDir && suppressFileClickRef.current) {
								e.preventDefault();
								return;
							}
							if (isDir) toggle(node.path);
							else onSelectFile(node.path);
						}}
						className={`${rowBase} ${dirDrop} ${rowSelected} w-full ${!isDir && onMoveFileToDirectory ? "cursor-grab active:cursor-grabbing" : ""}`}
						style={{ paddingLeft: `${6 + depth * 14}px` }}
						onDragOver={
							isDir
								? (e) => onFolderDragOver(e, node.path)
								: onMoveFileToDirectory
									? (e: DragEvent<HTMLButtonElement>) => {
											if (!isExplorerFilePathDrag(e.dataTransfer)) return;
											e.preventDefault();
										}
									: undefined
						}
						onDragLeave={isDir ? onFolderDragLeave : undefined}
						onDrop={
							isDir
								? (e) => void onFolderDrop(e, node.path)
								: onMoveFileToDirectory
									? (e: DragEvent<HTMLButtonElement>) => void onFileRowDrop(e, node.path)
									: undefined
						}
						onDragStart={
							!isDir && onMoveFileToDirectory
								? (e: DragEvent<HTMLButtonElement>) => {
										suppressFileClickRef.current = true;
										e.dataTransfer.setData(WOP_FILE_PATH_DND_TYPE, serializeFilePathForDrag(node.path));
										e.dataTransfer.setData("text/plain", node.path);
										e.dataTransfer.effectAllowed = "copyMove";
									}
								: undefined
						}
						onDragEnd={
							!isDir && onMoveFileToDirectory
								? () => {
										window.setTimeout(() => {
											suppressFileClickRef.current = false;
										}, 150);
									}
								: undefined
						}
					>
						<div className="flex min-w-0 flex-1 items-center gap-1.5">
							{isDir ? (
								<>
									{isOpen ? (
										<ChevronDown size={14} className={`shrink-0 ${chevron}`} aria-hidden />
									) : (
										<ChevronRight size={14} className={`shrink-0 ${chevron}`} aria-hidden />
									)}
									<Folder size={14} className={`shrink-0 ${appearanceDark ? "text-[#fb923c]/90" : "text-[#ea580c]"}`} />
									<span
										className={`min-w-0 flex-1 truncate font-mono ${dirName} ${
											node.gitStatus && node.gitStatus !== "??" && node.gitStatus !== "*"
												? appearanceDark
													? "text-[#e2c08d]"
													: "text-amber-800"
												: ""
										}${node.gitStatus === "*" ? (appearanceDark ? " text-[#858585]" : " text-[#737373]") : ""}`}
									>
										{node.name}
									</span>
									{node.gitStatus ? (
										<GitExplorerStatusBadge
											gitStatus={node.gitStatus}
											relativePath={node.path}
											variant="simple"
											appearanceDark={appearanceDark}
											onExplorerGitMutated={onExplorerGitMutated}
										/>
									) : null}
								</>
							) : (
								<>
									<div className="w-[14px] shrink-0" aria-hidden />
									{fileRowIcon(node.name, appearanceDark)}
									<span
										className={`min-w-0 flex-1 truncate font-mono ${modified ? "font-semibold text-amber-500" : fileName}`}
									>
										{node.name}
									</span>
									{node.gitStatus ? (
										<GitExplorerStatusBadge
											gitStatus={node.gitStatus}
											relativePath={node.path}
											variant="simple"
											appearanceDark={appearanceDark}
											onExplorerGitMutated={onExplorerGitMutated}
										/>
									) : null}
								</>
							)}
						</div>
					</button>
					{isDir && isOpen && node.children?.length ? renderNodes(node.children, depth + 1) : null}
				</div>
			);
		});

	const emptyDefault = "No files in workspace.";
	const treeBody =
		displayNodes.length === 0 ? (
			<p className={`px-2 py-3 text-center font-mono text-[11px] ${emptySearch}`}>
				{searchActive ? "No matching files or folders." : emptyTreeHint ?? emptyDefault}
			</p>
		) : (
			renderNodes(displayNodes, 0)
		);

	const rootDropChrome =
		allowWorkspaceRootDrop && rootEmptyDropActive
			? appearanceDark
				? "bg-[#264f78]/20 ring-2 ring-inset ring-[#ea580c]/35"
				: "bg-[#ea580c]/8 ring-2 ring-inset ring-[#ea580c]/40"
			: "";

	const treeScrollInner = (
		<div
			className={`min-h-full ${rootDropChrome}`}
			data-simple-explorer-tree
			onDragOver={allowWorkspaceRootDrop && onMoveFileToDirectory ? onTreeRootEmptyDragOver : undefined}
			onDragLeave={allowWorkspaceRootDrop && onMoveFileToDirectory ? onTreeRootEmptyDragLeave : undefined}
			onDrop={allowWorkspaceRootDrop && onMoveFileToDirectory ? (e) => void onTreeRootEmptyDrop(e) : undefined}
		>
			{treeBody}
		</div>
	);

	if (!showSearch) {
		return <div className="min-h-0 flex-1 overflow-y-auto pr-1">{treeScrollInner}</div>;
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<div className={`shrink-0 border-b px-2 py-2 ${searchWrap}`}>
				<label htmlFor="wop-simple-file-tree-search" className="sr-only">
					Search files and folders
				</label>
				<div className="relative">
					<Search
						size={14}
						className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 ${searchIcon}`}
						aria-hidden
					/>
					<input
						id="wop-simple-file-tree-search"
						type="search"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Escape") {
								e.preventDefault();
								setSearchQuery("");
							}
						}}
						placeholder="Search…"
						autoComplete="off"
						spellCheck={false}
						className={`w-full rounded-md border py-1.5 pl-8 pr-2 font-mono text-[12px] outline-none ring-2 ring-transparent transition-[border-color,box-shadow] focus:ring-2 ${searchInput}`}
					/>
				</div>
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto pr-1 pt-1">{treeScrollInner}</div>
		</div>
	);
}
