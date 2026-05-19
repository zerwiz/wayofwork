/**
 * Per-workspace-root dismissal for the Claw `.claw/` onboarding modal.
 * When the user skips or completes setup, we do not show the modal again
 * for that same workspace path until they clear site data.
 */

const LS_KEY = "wayofpi.claw.onboardingDismissedRoots.v1";

function parseRoots(raw: string | null): string[] {
	if (!raw) return [];
	try {
		const v = JSON.parse(raw) as unknown;
		if (!Array.isArray(v)) return [];
		return v.filter((x): x is string => typeof x === "string" && x.length > 0);
	} catch {
		return [];
	}
}

function writeRoots(roots: string[]): void {
	try {
		localStorage.setItem(LS_KEY, JSON.stringify(roots));
	} catch {
		/* ignore quota / private mode */
	}
}

export function isClawWorkspaceOnboardingDismissed(workspaceRoot: string): boolean {
	const roots = parseRoots(localStorage.getItem(LS_KEY));
	return roots.includes(workspaceRoot);
}

export function markClawWorkspaceOnboardingDismissed(workspaceRoot: string): void {
	const roots = new Set(parseRoots(localStorage.getItem(LS_KEY)));
	roots.add(workspaceRoot);
	writeRoots([...roots]);
}

/** Removes dismissal so auto-onboarding (or Settings → Run new onboarding) can show again. */
export function clearClawWorkspaceOnboardingDismissed(workspaceRoot: string): void {
	const roots = parseRoots(localStorage.getItem(LS_KEY)).filter((r) => r !== workspaceRoot);
	writeRoots(roots);
}
