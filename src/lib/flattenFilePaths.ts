import type { TreeNode } from "../types/tree";

export function flattenFilePaths(nodes: TreeNode[], max = 300): string[] {
	const out: string[] = [];
	function walk(list: TreeNode[]) {
		for (const n of list) {
			if (out.length >= max) return;
			if (n.type === "file") out.push(n.path);
			else if (n.children?.length) walk(n.children);
		}
	}
	walk(nodes);
	return out;
}
