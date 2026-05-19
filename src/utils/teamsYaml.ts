/**
 * Pi `teams.yaml` roster format (shared with `server/agents.ts` and Pi agent-team lists).
 * Team key on its own line; members as `  - agentName`.
 */
export function parseTeamsYaml(text: string): Record<string, string[]> {
	const teams: Record<string, string[]> = {};
	let current: string | null = null;
	for (const line of text.split(/\r?\n/)) {
		const t = line.trimEnd();
		if (/^\s*#/.test(t) || t === "") continue;
		const hm = /^([a-zA-Z0-9_-]+):\s*$/.exec(t);
		if (hm) {
			current = hm[1];
			teams[current] = [];
			continue;
		}
		const im = /^\s*-\s*([a-zA-Z0-9_.-]+)\s*$/.exec(line);
		if (im && current) teams[current].push(im[1]);
	}
	return teams;
}

/**
 * Write rosters for PUT `/api/file`. Replaces the entire file (adds header comments only).
 */
export function serializeTeamsYaml(teams: Record<string, string[]>): string {
	const lines: string[] = [
		"# Pi agent-team rosters — member ids match agent frontmatter `name` (docs/AGENT_TEAMS.md).",
		"# Saving from Way of Pi replaces this file; duplicate `name` across scan dirs still follows Pi order.",
		"",
	];
	for (const name of Object.keys(teams)) {
		lines.push(`${name}:`);
		for (const m of teams[name] ?? []) {
			lines.push(`  - ${m}`);
		}
		lines.push("");
	}
	return lines.join("\n");
}
