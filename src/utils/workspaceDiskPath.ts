/**
 * Map between server workspace-relative editor paths and absolute host paths
 * (Electron save dialog), matching `server/workspace-state.ts` resolve rules.
 */

export type WorkspaceFolderDisk = { label: string; path: string };

function toPosix(p: string): string {
	return p.replace(/\\/g, "/");
}

/** Absolute path under a configured folder → tree/editor-relative path for `/api/file`. */
export function relativePathFromWorkspaceAbs(
	absInput: string,
	folders: WorkspaceFolderDisk[],
): string | null {
	const abs = toPosix(absInput).replace(/\/+$/, "");
	if (!abs || folders.length === 0) return null;

	for (const f of folders) {
		const root = toPosix(f.path).replace(/\/+$/, "");
		if (!root) continue;
		if (abs === root) return null;
		if (abs.startsWith(`${root}/`)) {
			const rest = abs.slice(root.length + 1);
			if (!rest) return null;
			if (folders.length === 1) return rest;
			return `${f.label}/${rest}`;
		}
	}
	return null;
}

/** Default path for a native “Save As” dialog (absolute on the machine running the shell). */
export function absolutePathForSaveAsDefault(
	relEditorPath: string | null,
	folders: WorkspaceFolderDisk[],
): string {
	const f0 = folders[0];
	if (!f0) return "untitled.txt";
	const root = toPosix(f0.path).replace(/\/+$/, "");
	if (!relEditorPath?.trim()) return `${root}/untitled.txt`;
	const trimmed = relEditorPath.replace(/^[/\\]+/, "");

	if (folders.length === 1) {
		return `${root}/${trimmed}`;
	}

	const slash = trimmed.indexOf("/");
	const first = slash === -1 ? trimmed : trimmed.slice(0, slash);
	const hit = folders.find((x) => x.label === first);
	if (slash !== -1 && hit) {
		const rest = trimmed.slice(slash + 1);
		if (!rest) return `${root}/${trimmed}`;
		return `${toPosix(hit.path).replace(/\/+$/, "")}/${rest}`;
	}
	return `${root}/${trimmed}`;
}
