import { mkdir, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import type { WorkspaceGitRootState, WorkspaceGitState } from "../src/types/tree";
import { getClawDotDirAbs, getClawHostRepoRoot } from "./claw-workspace-root";
import { gitStatusMap, gitWorktreeSnapshot } from "./git";
import { shouldSkipDir } from "./paths";
import { listWorkspaceFolders, type WorkspaceFolderEntry } from "./workspace-state";

export interface TreeNode {
	name: string;
	path: string;
	type: "file" | "dir";
	gitStatus?: string;
	children?: TreeNode[];
}

const MAX_DEPTH = 20;
const MAX_NODES = 150000;

async function readTreeRecursive(
	absDir: string,
	root: string,
	gitMap: Record<string, string>,
	depth: number,
	counter: { n: number },
): Promise<TreeNode[]> {
	if (depth > MAX_DEPTH || counter.n > MAX_NODES) return [];
	const entries = await readdir(absDir, { withFileTypes: true }).catch(() => []);
	const nodes: TreeNode[] = [];
	for (const ent of entries.sort((a, b) => a.name.localeCompare(b.name))) {
		if (counter.n > MAX_NODES) break;
		if (ent.isDirectory() && shouldSkipDir(ent.name)) continue;
		const abs = join(absDir, ent.name);
		const rel = relative(root, abs).replace(/\\/g, "/");
		if (ent.isDirectory()) {
			counter.n += 1;
			const children = await readTreeRecursive(abs, root, gitMap, depth + 1, counter);
			nodes.push({
				name: ent.name,
				path: rel,
				type: "dir",
				gitStatus: gitMap[rel],
				children,
			});
		} else if (ent.isFile()) {
			counter.n += 1;
			nodes.push({
				name: ent.name,
				path: rel,
				type: "file",
				gitStatus: gitMap[rel],
			});
		}
	}
	return nodes;
}

/**
 * After leaf paths are labeled from `git status`, mark ancestor directories with `*`
 * when they contain any nested change (VS Code-style folder hint).
 */
function propagateGitDirMarkers(nodes: TreeNode[]): void {
	function walk(n: TreeNode): boolean {
		if (n.type === "file") {
			return Boolean(n.gitStatus);
		}
		let childHas = false;
		for (const c of n.children ?? []) {
			if (walk(c)) childHas = true;
		}
		if (!n.gitStatus && childHas) n.gitStatus = "*";
		return Boolean(n.gitStatus) || childHas;
	}
	for (const n of nodes) walk(n);
}

function prefixTreeNodes(nodes: TreeNode[], label: string): TreeNode[] {
	return nodes.map((n) => ({
		...n,
		path: `${label}/${n.path}`,
		children: n.children ? prefixTreeNodes(n.children, label) : undefined,
	}));
}

async function gitRootStates(folders: WorkspaceFolderEntry[]): Promise<WorkspaceGitRootState[]> {
	const roots: WorkspaceGitRootState[] = [];
	for (const f of folders) {
		const snap = await gitWorktreeSnapshot(f.path);
		roots.push({
			label: f.label,
			path: f.path,
			isRepo: snap.isRepo,
			topLevel: snap.topLevel,
			branch: snap.branch,
			error: snap.error,
		});
	}
	return roots;
}

export async function buildWorkspaceTree(tenantId: string = "default"): Promise<{
	root: string;
	nodes: TreeNode[];
	folders: WorkspaceFolderEntry[];
	git: WorkspaceGitState;
}> {
	const list = listWorkspaceFolders(tenantId);
	const git: WorkspaceGitState = { roots: await gitRootStates(list) };

	if (list.length === 1) {
		const root = list[0].path;
		const gitMap = await gitStatusMap(root);
		const counter = { n: 0 };
		const nodes = await readTreeRecursive(root, root, gitMap, 0, counter);
		propagateGitDirMarkers(nodes);
		return { root, nodes, folders: list, git };
	}

	const top: TreeNode[] = [];
	for (const f of list) {
		const gitMap = await gitStatusMap(f.path);
		const counter = { n: 0 };
		const children = await readTreeRecursive(f.path, f.path, gitMap, 0, counter);
		propagateGitDirMarkers(children);
		const prefixed = prefixTreeNodes(children, f.label);
		top.push({
			name: f.label,
			path: f.label,
			type: "dir",
			children: prefixed,
		});
	}
	propagateGitDirMarkers(top);
	const rootDisplay = list.map((x) => x.path).join(" | ");
	return { root: rootDisplay, nodes: top, folders: list, git };
}

/**
 * Tree for host **`.claw/`** (Way of Pi checkout), with paths relative to the host root
 * (e.g. `.claw/workspace/SOUL.md`). Used by Claw mode Files tab — not `WOP_WORKSPACE`.
 */
export async function buildClawHostTree(): Promise<{
	rootDisplay: string;
	nodes: TreeNode[];
}> {
	const hostRoot = getClawHostRepoRoot();
	const clawDot = getClawDotDirAbs();
	await mkdir(clawDot, { recursive: true });
	const gitMap: Record<string, string> = {};
	const counter = { n: 0 };
	const nodes = await readTreeRecursive(clawDot, hostRoot, gitMap, 0, counter);
	propagateGitDirMarkers(nodes);
	return { rootDisplay: clawDot, nodes };
}
