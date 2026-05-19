/**
 * Browser-local operator preferences for what agents are allowed to do.
 * Execution is still gated by the Pi process and Bun server env; these values
 * are the UI contract for future wiring and for operator intent.
 */

const STORAGE_KEY = "wayofpi.agentPermissions.v1";
const LEGACY_APPROVAL_KEY = "wayofpi.simple.approvalQueue";

export const AGENT_PERMISSIONS_CHANGED_EVENT = "wayofpi:agent-permissions-changed";

export type AgentPermissions = {
	/** Prefer confirmations before risky tool runs (synced with Simple Settings approval toggle). */
	requireToolApproval: boolean;
	/** read, list_dir, grep-style workspace inspection. */
	allowReadSearch: boolean;
	/** write, edit, patch workspace files. */
	allowWriteFiles: boolean;
	/** bash / host commands when the runtime exposes them. */
	allowRunCommands: boolean;
	/** Orchestrator team_member_* style roster edits (when server tools are enabled). */
	allowTeamRosterEdits: boolean;
};

const DEFAULTS: AgentPermissions = {
	requireToolApproval: true,
	allowReadSearch: true,
	allowWriteFiles: true,
	allowRunCommands: true,
	allowTeamRosterEdits: true,
};

function emitChanged(): void {
	try {
		window.dispatchEvent(new Event(AGENT_PERMISSIONS_CHANGED_EVENT));
	} catch {
		/* ignore */
	}
}

function syncLegacyApproval(requireToolApproval: boolean): void {
	try {
		localStorage.setItem(LEGACY_APPROVAL_KEY, requireToolApproval ? "1" : "0");
	} catch {
		/* ignore */
	}
}

/** Full snapshot from localStorage (with migration from legacy approval key). */
export function readAgentPermissions(): AgentPermissions {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const j = JSON.parse(raw) as Partial<AgentPermissions>;
			return {
				...DEFAULTS,
				...j,
				requireToolApproval:
					typeof j.requireToolApproval === "boolean" ? j.requireToolApproval : DEFAULTS.requireToolApproval,
				allowReadSearch: typeof j.allowReadSearch === "boolean" ? j.allowReadSearch : DEFAULTS.allowReadSearch,
				allowWriteFiles: typeof j.allowWriteFiles === "boolean" ? j.allowWriteFiles : DEFAULTS.allowWriteFiles,
				allowRunCommands: typeof j.allowRunCommands === "boolean" ? j.allowRunCommands : DEFAULTS.allowRunCommands,
				allowTeamRosterEdits:
					typeof j.allowTeamRosterEdits === "boolean" ? j.allowTeamRosterEdits : DEFAULTS.allowTeamRosterEdits,
			};
		}
	} catch {
		/* ignore */
	}
	try {
		const aq = localStorage.getItem(LEGACY_APPROVAL_KEY);
		if (aq === "0") return { ...DEFAULTS, requireToolApproval: false };
		if (aq === "1") return { ...DEFAULTS, requireToolApproval: true };
	} catch {
		/* ignore */
	}
	return { ...DEFAULTS };
}

export function writeAgentPermissions(next: AgentPermissions): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
		syncLegacyApproval(next.requireToolApproval);
	} catch {
		/* ignore */
	}
	emitChanged();
}

export function patchAgentPermissions(partial: Partial<AgentPermissions>): AgentPermissions {
	const merged = { ...readAgentPermissions(), ...partial };
	writeAgentPermissions(merged);
	return merged;
}
