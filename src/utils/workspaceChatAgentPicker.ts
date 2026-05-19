import type { AgentMeta } from "../hooks/useAgents";

/**
 * Workspace `.md` agents for the session picker: drop a duplicate **Orchestrator** row so it
 * does not collide with the built-in **Orchestrator** option (`value=""` session lead).
 */
export function agentsForSessionPicker(agents: AgentMeta[]): AgentMeta[] {
	return agents.filter((a) => a.name.trim().toLowerCase() !== "orchestrator");
}

/** Names listed in `teams.yaml` that have no matching agent `.md` yet (read-only in the picker). */
export function rosterNamesMissingFromAgents(
	teams: Record<string, string[]> | undefined,
	agents: AgentMeta[],
): string[] {
	const byKey = new Set(agents.map((a) => a.name.trim().toLowerCase()));
	const out = new Set<string>();
	if (teams) {
		for (const members of Object.values(teams)) {
			for (const m of members) {
				const t = m.trim();
				if (!t) continue;
				const k = t.toLowerCase();
				if (k === "orchestrator") continue;
				if (!byKey.has(k)) out.add(t);
			}
		}
	}
	return [...out].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}
