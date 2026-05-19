const KEY = "wayofpi.workspace.recentFolders";
const MAX = 12;

export function readRecentWorkspaceFolders(): string[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return [];
		const o = JSON.parse(raw) as unknown;
		if (!Array.isArray(o)) return [];
		return o.map((x) => String(x).trim()).filter(Boolean);
	} catch {
		return [];
	}
}

export function pushRecentWorkspaceFolder(absPath: string): void {
	const p = absPath.trim();
	if (!p) return;
	try {
		const prev = readRecentWorkspaceFolders().filter((x) => x !== p);
		const next = [p, ...prev].slice(0, MAX);
		localStorage.setItem(KEY, JSON.stringify(next));
	} catch {
		/* ignore */
	}
}
