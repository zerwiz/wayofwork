import type { TreeNode } from "../types/tree";

export interface FlatFile {
	path: string;
	name: string;
}

export function flattenTreeFiles(nodes: TreeNode[]): FlatFile[] {
	const out: FlatFile[] = [];
	function walk(n: TreeNode): void {
		if (n.type === "file") out.push({ path: n.path, name: n.name });
		if (n.children) for (const c of n.children) walk(c);
	}
	for (const n of nodes) walk(n);
	out.sort((a, b) => a.path.localeCompare(b.path));
	return out;
}

export interface GitMarkedTreeEntry {
	path: string;
	name: string;
	status: string;
	type: "file" | "dir";
}

/** All nodes that carry a Git label (including propagated `*` on folders). */
export function flattenTreeGitEntries(nodes: TreeNode[]): GitMarkedTreeEntry[] {
	const out: GitMarkedTreeEntry[] = [];
	function walk(n: TreeNode): void {
		if (n.gitStatus) out.push({ path: n.path, name: n.name, status: n.gitStatus, type: n.type });
		if (n.children) for (const c of n.children) walk(c);
	}
	for (const n of nodes) walk(n);
	out.sort((a, b) => a.path.localeCompare(b.path));
	return out;
}

/** Paths Git reported directly — omit folder-only `*` markers (nested changes). */
export function flattenDirectGitStatusPaths(nodes: TreeNode[]): GitMarkedTreeEntry[] {
	return flattenTreeGitEntries(nodes).filter((e) => e.type === "file" || e.status !== "*");
}

/** Sorted file paths that still carry an explorer Git badge (staged/unstaged/untracked). */
export function gitMarkedFilePathsSorted(nodes: TreeNode[]): string[] {
	return flattenDirectGitStatusPaths(nodes)
		.filter((e) => e.type === "file")
		.map((e) => e.path)
		.sort((a, b) => a.localeCompare(b));
}

/**
 * Next file path in sorted Git-marked order after `current` (wrap). Used for “Review next” in the editor chrome.
 * Returns `null` when there is nowhere to advance (no marks, or a single marked file that is already active).
 */
export function nextGitReviewFilePath(current: string | null, nodes: TreeNode[]): string | null {
	const paths = gitMarkedFilePathsSorted(nodes);
	if (paths.length === 0) return null;
	if (paths.length === 1) {
		const only = paths[0]!;
		return only === current ? null : only;
	}
	const idx = current ? paths.indexOf(current) : -1;
	const nextIdx = idx >= 0 ? (idx + 1) % paths.length : 0;
	return paths[nextIdx] ?? null;
}
