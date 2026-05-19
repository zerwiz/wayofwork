import { ChevronDown, ChevronRight, FileCode2, FileJson, File as FileIcon } from "lucide-react";
import { createPortal } from "react-dom";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type DragEvent,
	type MouseEvent,
	type ReactNode,
} from "react";
import type { TreeNode } from "../types/tree";
import {
	isExplorerFilePathDrag,
	readDraggedExplorerFilePath,
	serializeFilePathForDrag,
	WOP_FILE_PATH_DND_TYPE,
} from "../utils/panelDockLayout";
import { posixBasename, posixDirname } from "../utils/posixPath";
import { GitExplorerStatusBadge } from "./GitExplorerStatusBadge";
import { gitExplorerRowTitle } from "../utils/gitStatusUi";
import { sortTreeNodes } from "../utils/sortTreeNodes";

function fileIcon(name: string) {
	const lower = name.toLowerCase();
	if (lower.endsWith(".json")) return <FileJson size={13} className="text-[#cbcb41]" />;
	if (
		lower.endsWith(".py") ||
		lower.endsWith(".ts") ||
		lower.endsWith(".tsx") ||
		lower.endsWith(".js") ||
		lower.endsWith(".jsx") ||
		lower.endsWith(".md")
	) {
		return <FileCode2 size={13} className="text-[#519aba]" />;
	}
	return <FileIcon size={13} className="text-[#cccccc]" />;
}

function destPathForMove(from: string, toDir: string): string {
	const base = posixBasename(from);
	const d = toDir.replace(/\/+$/, "");
	return d ? `${d}/${base}` : base;
}

type ContextMenuState = { x: number; y: number; path: string; kind: "file" | "dir"; name: string };

export function FileTree({
	nodes,
	selectedPath,
	secondarySelectedPath,
	openInMainEditorPaths,
	onSelectFile,
	onSelectDirectory,
	onMoveFileToDirectory,
	onRenameNode,
	onDeleteNode,
	onCopyPath,
	expandRevision,
	pathsToExpand,
	onExplorerGitMutated,
	allowWorkspaceRootDrop,
	/** When true, directories with children render expanded (explorer search filter). */
	searchFilterActive = false,
}: {
	nodes: TreeNode[];
	selectedPath: string | null;
	onSelectFile: (path: string, ev?: MouseEvent) => void;
	secondarySelectedPath?: string | null;
	openInMainEditorPaths?: readonly string[];
	onSelectDirectory?: (dirPath: string) => void;
	onMoveFileToDirectory?: (fromPath: string, toDirPath: string) => Promise<void>;
	/** Single-root workspace: empty tree area / padding accepts drop → workspace root (`""`). */
	allowWorkspaceRootDrop?: boolean;
	onRenameNode?: (path: string, kind: "file" | "dir", currentName: string) => Promise<void>;
	onDeleteNode?: (path: string, kind: "file" | "dir") => Promise<void>;
	onCopyPath?: (path: string) => void;
	expandRevision?: number;
	pathsToExpand?: string[];
	/** After explorer Git actions (e.g. stage) — reload tree so SCM badges update. */
	onExplorerGitMutated?: () => void;
	searchFilterActive?: boolean;
}) {
	const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
	const sorted = useMemo(() => sortTreeNodes(nodes), [nodes]);
	const suppressFileClickRef = useRef(false);
	const [dropTargetDir, setDropTargetDir] = useState<string | null>(null);
	const [rootEmptyDropActive, setRootEmptyDropActive] = useState(false);
	const [menu, setMenu] = useState<ContextMenuState | null>(null);
	const menuRef = useRef<HTMLDivElement | null>(null);

	const closeMenu = useCallback(() => setMenu(null), []);

	useEffect(() => {
		if (!menu) return;
		const onDown = (ev: Event) => {
			if (menuRef.current?.contains(ev.target as Node)) return;
			closeMenu();
		};
		const onKey = (ev: Event) => {
			if (ev instanceof KeyboardEvent && ev.key === "Escape") closeMenu();
		};
		document.addEventListener("mousedown", onDown, true);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onDown, true);
			document.removeEventListener("keydown", onKey);
		};
	}, [menu, closeMenu]);

	useEffect(() => {
		if (expandRevision === undefined || !pathsToExpand?.length) return;
		setExpanded((prev) => {
			const next = new Set(prev);
			for (const p of pathsToExpand) next.add(p);
			return next;
		});
	}, [expandRevision, pathsToExpand]);

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

	const onRowContextMenu = useCallback((e: MouseEvent, node: TreeNode) => {
		if (!onRenameNode && !onDeleteNode && !onCopyPath) return;
		e.preventDefault();
		e.stopPropagation();
		const pad = 8;
		const mw = 200;
		const mh = 140;
		let x = e.clientX;
		let y = e.clientY;
		x = Math.max(pad, Math.min(x, window.innerWidth - mw - pad));
		y = Math.max(pad, Math.min(y, window.innerHeight - mh - pad));
		setMenu({
			x,
			y,
			path: node.path,
			kind: node.type,
			name: node.name,
		});
	}, [onRenameNode, onDeleteNode, onCopyPath]);

	const renderNodes = (list: TreeNode[], depth: number): ReactNode => {
		return list.map((node) => {
			const dirOpen =
				node.type === "dir" &&
				(searchFilterActive ? Boolean(node.children?.length) : expanded.has(node.path));
			return (
			<div key={node.path}>
				<button
					type="button"
					title={gitExplorerRowTitle(node.gitStatus)}
					draggable={node.type === "file"}
					className={`flex w-full cursor-pointer items-center px-2 py-1 text-left hover:bg-[#2a2d2e] ${
						node.type === "dir" && dropTargetDir === node.path ? "bg-[#264f78]/90 ring-1 ring-inset ring-[#ea580c]/50" : ""
					} ${
						selectedPath === node.path
							? "bg-[#37373d]"
							: secondarySelectedPath === node.path
								? "bg-[#2d3d4a] ring-1 ring-inset ring-[#ea580c]/40"
								: node.type === "file" && openInMainEditorPaths?.includes(node.path)
									? "bg-[#2d2d2d] text-[#cccccc] ring-1 ring-inset ring-[#858585]/35"
									: "text-[#cccccc]"
					} ${node.type === "file" ? "cursor-grab active:cursor-grabbing" : ""}`}
					style={{ paddingLeft: `${depth * 12 + 8}px` }}
					onContextMenu={(e) => onRowContextMenu(e, node)}
					onDragOver={
						node.type === "dir"
							? (e) => onFolderDragOver(e, node.path)
							: onMoveFileToDirectory
								? (e: DragEvent<HTMLButtonElement>) => {
										if (!isExplorerFilePathDrag(e.dataTransfer)) return;
										e.preventDefault();
									}
								: undefined
					}
					onDragLeave={node.type === "dir" ? onFolderDragLeave : undefined}
					onDrop={
						node.type === "dir"
							? (e) => void onFolderDrop(e, node.path)
							: onMoveFileToDirectory
								? (e: DragEvent<HTMLButtonElement>) => void onFileRowDrop(e, node.path)
								: undefined
					}
					onDragStart={
						node.type === "file"
							? (e: DragEvent<HTMLButtonElement>) => {
									suppressFileClickRef.current = true;
									e.dataTransfer.setData(WOP_FILE_PATH_DND_TYPE, serializeFilePathForDrag(node.path));
									e.dataTransfer.setData("text/plain", node.path);
									e.dataTransfer.effectAllowed = "copyMove";
								}
							: undefined
					}
					onDragEnd={
						node.type === "file"
							? () => {
									window.setTimeout(() => {
										suppressFileClickRef.current = false;
									}, 150);
								}
							: undefined
					}
					onClick={(e) => {
						if (node.type === "file" && suppressFileClickRef.current) {
							e.preventDefault();
							return;
						}
						if (node.type === "dir") {
							toggle(node.path);
							onSelectDirectory?.(node.path);
						} else {
							onSelectFile(node.path, e);
						}
					}}
				>
					<div className="flex w-full min-w-0 items-center gap-1.5">
						{node.type === "dir" ? (
							<>
								{dirOpen ? (
									<ChevronDown size={14} className="shrink-0 text-[#cccccc]" />
								) : (
									<ChevronRight size={14} className="shrink-0 text-[#cccccc]" />
								)}
								<span
									className={`min-w-0 flex-1 truncate font-mono text-[13px] ${
										node.gitStatus && node.gitStatus !== "??" && node.gitStatus !== "*"
											? "text-[#e2c08d]"
											: ""
									}${node.gitStatus === "*" ? " text-[#858585]" : ""}`}
								>
									{node.name}
								</span>
								{node.gitStatus ? (
									<GitExplorerStatusBadge
										gitStatus={node.gitStatus}
										relativePath={node.path}
										variant="technical"
										onExplorerGitMutated={onExplorerGitMutated}
									/>
								) : null}
							</>
						) : (
							<>
								<div className="w-3 shrink-0" />
								{fileIcon(node.name)}
								<span
									className={`truncate font-mono text-[13px] ${
										node.gitStatus && node.gitStatus !== "??" && node.gitStatus !== "*"
											? "text-[#e2c08d]"
											: ""
									}${node.gitStatus === "*" ? " text-[#858585]" : ""}`}
								>
									{node.name}
								</span>
								{node.gitStatus ? (
									<GitExplorerStatusBadge
										gitStatus={node.gitStatus}
										relativePath={node.path}
										variant="technical"
										onExplorerGitMutated={onExplorerGitMutated}
									/>
								) : null}
							</>
						)}
					</div>
				</button>
				{node.type === "dir" && dirOpen && node.children ? renderNodes(node.children, depth + 1) : null}
			</div>
		);
		});
	};

	const menuPortal =
		menu &&
		typeof document !== "undefined" &&
		createPortal(
			<div
				ref={menuRef}
				role="menu"
				className="fixed z-[300] min-w-[188px] rounded border border-[#454545] bg-[#252526] py-0.5 shadow-lg"
				style={{ left: menu.x, top: menu.y }}
				onMouseDown={(e) => e.stopPropagation()}
			>
				{onRenameNode ? (
					<button
						type="button"
						role="menuitem"
						className="flex w-full px-3 py-1.5 text-left font-mono text-[13px] text-[#cccccc] hover:bg-[#094771]"
						onClick={() => {
							const m = menu;
							closeMenu();
							void onRenameNode(m.path, m.kind, m.name);
						}}
					>
						Rename…
					</button>
				) : null}
				{onCopyPath ? (
					<button
						type="button"
						role="menuitem"
						className="flex w-full px-3 py-1.5 text-left font-mono text-[13px] text-[#cccccc] hover:bg-[#094771]"
						onClick={() => {
							onCopyPath(menu.path);
							closeMenu();
						}}
					>
						Copy path
					</button>
				) : null}
				{onDeleteNode ? (
					<button
						type="button"
						role="menuitem"
						className="flex w-full px-3 py-1.5 text-left font-mono text-[13px] text-[#f14c4c] hover:bg-[#3c1818]"
						onClick={() => {
							const m = menu;
							closeMenu();
							void onDeleteNode(m.path, m.kind);
						}}
					>
						Delete…
					</button>
				) : null}
			</div>,
			document.body,
		);

	const rootDropChrome =
		allowWorkspaceRootDrop && rootEmptyDropActive
			? "bg-[#264f78]/25 outline outline-1 outline-[#ea580c]/40 -outline-offset-1"
			: "";

	return (
		<div
			className={`min-h-full py-1 ${rootDropChrome}`}
			data-explorer-tree
			onDragOver={allowWorkspaceRootDrop && onMoveFileToDirectory ? onTreeRootEmptyDragOver : undefined}
			onDragLeave={allowWorkspaceRootDrop && onMoveFileToDirectory ? onTreeRootEmptyDragLeave : undefined}
			onDrop={allowWorkspaceRootDrop && onMoveFileToDirectory ? (e) => void onTreeRootEmptyDrop(e) : undefined}
		>
			{renderNodes(sorted, 0)}
			{menuPortal}
		</div>
	);
}
