/** Browser-safe POSIX-style dirname (workspace paths use `/`). */
export function posixDirname(p: string): string {
	const n = p.replace(/\\/g, "/").replace(/\/+$/, "");
	const i = n.lastIndexOf("/");
	return i <= 0 ? "" : n.slice(0, i);
}

/** Browser-safe basename for workspace-relative paths. */
export function posixBasename(p: string): string {
	const n = p.replace(/\\/g, "/").replace(/\/+$/, "");
	const i = n.lastIndexOf("/");
	return i < 0 ? n : n.slice(i + 1);
}

/** Directory segments to expand so `filePath` is visible (e.g. `a/b/c.txt` → `["a","a/b"]`). */
export function ancestorDirPaths(filePath: string): string[] {
	const norm = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
	const parts = norm.split("/").filter(Boolean);
	if (parts.length <= 1) return [];
	const out: string[] = [];
	for (let i = 0; i < parts.length - 1; i++) {
		out.push(parts.slice(0, i + 1).join("/"));
	}
	return out;
}
