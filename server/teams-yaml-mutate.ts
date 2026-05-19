/**
 * Mutate primary workspace `.pi/agents/teams.yaml` — Pi **agent-team** parity for Way of Pi orchestrator tools.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parseTeamsYaml, serializeTeamsYaml } from "../src/utils/teamsYaml";
import type { AgentMeta } from "./agents";
import { loadWorkspaceAgents } from "./agents";
import { listWorkspaceFolders } from "./workspace-state";
import { broadcastToolLog } from "./tool-log-broadcast";

function primaryTeamsYamlAbs(): string | null {
	const folders = listWorkspaceFolders();
	const root = folders[0]?.path;
	if (!root) return null;
	return join(root, ".pi", "agents", "teams.yaml");
}

function resolveTeamKey(teams: Record<string, string[]>, requested?: string): { team: string } | { error: string } {
	const keys = Object.keys(teams);
	if (keys.length === 0) return { error: "No team keys in teams.yaml." };
	const r = requested?.trim();
	if (!r) {
		const def = [...keys].sort((a, b) => a.localeCompare(b))[0]!;
		return { team: def };
	}
	const hit = keys.find((k) => k.toLowerCase() === r.toLowerCase());
	if (!hit) return { error: `Unknown team "${r}". Valid: ${keys.join(", ")}` };
	return { team: hit };
}

function canonicalAgentName(agents: AgentMeta[], raw: string): string | null {
	const hit = agents.find((a) => a.name.toLowerCase() === raw.trim().toLowerCase());
	return hit?.name ?? null;
}

export async function toolTeamList(): Promise<string> {
	const { agents, teams, teamsPath } = await loadWorkspaceAgents();
	const lines: string[] = [];
	lines.push(`teams.yaml: ${teamsPath ?? "(not found under primary workspace — create .pi/agents/teams.yaml)"}`);
	lines.push("");
	lines.push("Teams:");
	const keys = Object.keys(teams).sort((a, b) => a.localeCompare(b));
	if (keys.length === 0) lines.push("  (none)");
	for (const k of keys) {
		lines.push(`  ${k}: ${(teams[k] ?? []).join(", ")}`);
	}
	lines.push("");
	lines.push("Agent definitions (scanned, use these names in rosters):");
	for (const a of agents) {
		lines.push(`  - ${a.name}`);
	}
	return lines.join("\n");
}

export async function toolTeamMemberRemove(
	team: string | undefined,
	agentName: string,
): Promise<{ output: string; agentsCatalogChanged: boolean }> {
	const abs = primaryTeamsYamlAbs();
	if (!abs || !existsSync(abs)) {
		return {
			output: "team_member_remove: teams.yaml not found. Create `.pi/agents/teams.yaml` or use the My Team UI.",
			agentsCatalogChanged: false,
		};
	}
	const raw = await readFile(abs, "utf8");
	const teams = parseTeamsYaml(raw);
	const tr = resolveTeamKey(teams, team);
	if ("error" in tr) return { output: `team_member_remove: ${tr.error}`, agentsCatalogChanged: false };

	const roster = [...(teams[tr.team] ?? [])];
	const idx = roster.findIndex((m) => m.toLowerCase() === agentName.trim().toLowerCase());
	if (idx < 0) {
		return {
			output: `team_member_remove: "${agentName}" is not in team "${tr.team}" (roster: ${roster.join(", ") || "empty"}).`,
			agentsCatalogChanged: false,
		};
	}
	if (roster.length <= 1) {
		return {
			output: `team_member_remove: cannot remove the last member of team "${tr.team}".`,
			agentsCatalogChanged: false,
		};
	}
	roster.splice(idx, 1);
	teams[tr.team] = roster;
	await mkdir(dirname(abs), { recursive: true });
	await writeFile(abs, serializeTeamsYaml(teams), "utf8");
	broadcastToolLog("INFO", "team_member_remove", `${tr.team}: − ${agentName}`);
	return {
		output: `team_member_remove: ok — removed "${agentName}" from team "${tr.team}".`,
		agentsCatalogChanged: true,
	};
}

export async function toolTeamMemberAdd(
	team: string | undefined,
	agentName: string,
): Promise<{ output: string; agentsCatalogChanged: boolean }> {
	const abs = primaryTeamsYamlAbs();
	if (!abs || !existsSync(abs)) {
		return {
			output: "team_member_add: teams.yaml not found. Create `.pi/agents/teams.yaml` first.",
			agentsCatalogChanged: false,
		};
	}
	const { agents } = await loadWorkspaceAgents();
	const canon = canonicalAgentName(agents, agentName);
	if (!canon) {
		return {
			output: `team_member_add: no agent definition named "${agentName}" in the workspace scan. Use team_list for valid names.`,
			agentsCatalogChanged: false,
		};
	}
	const raw = await readFile(abs, "utf8");
	const teams = parseTeamsYaml(raw);
	const tr = resolveTeamKey(teams, team);
	if ("error" in tr) return { output: `team_member_add: ${tr.error}`, agentsCatalogChanged: false };

	const roster = [...(teams[tr.team] ?? [])];
	if (roster.some((m) => m.toLowerCase() === canon.toLowerCase())) {
		return {
			output: `team_member_add: "${canon}" is already in team "${tr.team}".`,
			agentsCatalogChanged: false,
		};
	}
	roster.push(canon);
	teams[tr.team] = roster;
	await mkdir(dirname(abs), { recursive: true });
	await writeFile(abs, serializeTeamsYaml(teams), "utf8");
	broadcastToolLog("INFO", "team_member_add", `${tr.team}: + ${canon}`);
	return { output: `team_member_add: ok — added "${canon}" to team "${tr.team}".`, agentsCatalogChanged: true };
}

export async function toolTeamMemberReplace(
	team: string | undefined,
	fromAgent: string,
	toAgent: string,
): Promise<{ output: string; agentsCatalogChanged: boolean }> {
	const abs = primaryTeamsYamlAbs();
	if (!abs || !existsSync(abs)) {
		return {
			output: "team_member_replace: teams.yaml not found.",
			agentsCatalogChanged: false,
		};
	}
	const { agents } = await loadWorkspaceAgents();
	const toCanon = canonicalAgentName(agents, toAgent);
	if (!toCanon) {
		return {
			output: `team_member_replace: unknown target agent "${toAgent}". Use team_list.`,
			agentsCatalogChanged: false,
		};
	}
	const raw = await readFile(abs, "utf8");
	const teams = parseTeamsYaml(raw);
	const tr = resolveTeamKey(teams, team);
	if ("error" in tr) return { output: `team_member_replace: ${tr.error}`, agentsCatalogChanged: false };

	const roster = [...(teams[tr.team] ?? [])];
	const idx = roster.findIndex((m) => m.toLowerCase() === fromAgent.trim().toLowerCase());
	if (idx < 0) {
		return {
			output: `team_member_replace: "${fromAgent}" is not in team "${tr.team}".`,
			agentsCatalogChanged: false,
		};
	}
	if (roster.some((m, i) => i !== idx && m.toLowerCase() === toCanon.toLowerCase())) {
		return {
			output: `team_member_replace: "${toCanon}" is already in team "${tr.team}".`,
			agentsCatalogChanged: false,
		};
	}
	roster[idx] = toCanon;
	teams[tr.team] = roster;
	await mkdir(dirname(abs), { recursive: true });
	await writeFile(abs, serializeTeamsYaml(teams), "utf8");
	broadcastToolLog("INFO", "team_member_replace", `${tr.team}: ${fromAgent} → ${toCanon}`);
	return {
		output: `team_member_replace: ok — team "${tr.team}": "${fromAgent}" → "${toCanon}".`,
		agentsCatalogChanged: true,
	};
}
