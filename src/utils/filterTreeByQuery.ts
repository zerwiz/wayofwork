import type { TreeNode } from "../types/tree";

/** Pruned copy: files match by name/path; dirs match if self or any descendant matches. */
export function filterTreeByQuery(nodes: TreeNode[], qLower: string): TreeNode[] {
	const out: TreeNode[] = [];
	for (const n of nodes) {
		if (n.type === "file") {
			if (n.name.toLowerCase().includes(qLower) || n.path.toLowerCase().includes(qLower)) {
				out.push(n);
			}
			continue;
		}
		const kids = n.children ?? [];
		const filteredKids = filterTreeByQuery(kids, qLower);
		const selfHit = n.name.toLowerCase().includes(qLower) || n.path.toLowerCase().includes(qLower);
		if (selfHit) {
			out.push({ ...n, children: kids.length ? [...kids] : undefined });
		} else if (filteredKids.length > 0) {
			out.push({ ...n, children: filteredKids });
		}
	}
	return out;
}
