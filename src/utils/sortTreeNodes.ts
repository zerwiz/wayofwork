import type { TreeNode } from "../types/tree";

/** Directories first, then files; names sorted case-insensitively (VS Code–style). */
export function sortTreeNodes(list: TreeNode[]): TreeNode[] {
	return [...list]
		.sort((a, b) => {
			if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
			return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
		})
		.map((n) =>
			n.type === "dir" && n.children?.length
				? { ...n, children: sortTreeNodes(n.children) }
				: n,
		);
}
