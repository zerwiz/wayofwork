const LS_PREFIX = "wayofpi.planHandoffPath.v1";

function persistKey(workspaceKey: string): string {
	const k = workspaceKey.trim() || "(no-workspace)";
	return `${LS_PREFIX}:${encodeURIComponent(k).slice(0, 240)}`;
}

export function readPlanHandoffPathFromStorage(workspaceKey: string): string | null {
	try {
		const raw = localStorage.getItem(persistKey(workspaceKey));
		if (!raw) return null;
		const o = JSON.parse(raw) as { path?: unknown };
		return typeof o.path === "string" && o.path ? o.path : null;
	} catch {
		return null;
	}
}

export function writePlanHandoffPathToStorage(workspaceKey: string, path: string | null): void {
	try {
		const pk = persistKey(workspaceKey);
		if (!path) localStorage.removeItem(pk);
		else localStorage.setItem(pk, JSON.stringify({ path }));
	} catch {
		/* ignore quota / private mode */
	}
}

export function resolvePlanHandoffPath(
	files: Array<{ path: string }>,
	latest: { path: string } | null,
	stored: string | null,
): string | null {
	if (!files.length) return null;
	if (stored && files.some((f) => f.path === stored)) return stored;
	return latest?.path ?? files[0]?.path ?? null;
}
