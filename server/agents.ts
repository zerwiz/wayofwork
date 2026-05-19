import { existsSync, readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, normalize, relative } from "node:path";
import { parseTeamsYaml } from "../src/utils/teamsYaml";
import { shouldSkipDir } from "./paths";
import { listWorkspaceFolders } from "./workspace-state";
import { getClawHostRepoRoot } from "./claw-workspace-root";

export interface AgentMeta {
	name: string;
	description: string;
	tools: string;
	skills: string;
	relativePath: string;
}

function unquoteFrontmatterField(raw: string): string {
	let s = raw.trim();
	if (
		(s.startsWith('"') && s.endsWith('"')) ||
		(s.startsWith("'") && s.endsWith("'"))
	) {
		s = s.slice(1, -1);
	}
	return s.trim();
}

/**
 * Mirrors `parseAgentFile` in `extensions/agent-team.ts`: YAML block between first
 * `---` and closing `---`, then body. CRLF in the file is normalized so the same
 * files Pi loads are recognized here.
 */
function parseAgentMarkdownPiStyle(raw: string): {
	name: string;
	description: string;
	tools: string;
	skills: string;
	body: string;
} | null {
	const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
	const match = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
	if (!match) return null;

	const frontmatter: Record<string, string> = {};
	for (const line of match[1].split("\n")) {
		const idx = line.indexOf(":");
		if (idx > 0) {
			frontmatter[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
		}
	}

	if (!frontmatter.name) return null;

	const name = unquoteFrontmatterField(frontmatter.name);
	if (!name) return null;

	return {
		name,
		description: unquoteFrontmatterField(frontmatter.description || ""),
		tools: unquoteFrontmatterField(frontmatter.tools || "read,grep,find,ls"),
		skills: unquoteFrontmatterField(frontmatter.skills || ""),
		body: match[2].trim(),
	};
}

/** Same recursive `*.md` collection as `extensions/agent-dir-scan.ts` (no filename skips). */
async function collectAgentMarkdownFiles(absDir: string): Promise<string[]> {
	const out: string[] = [];
	async function walk(d: string) {
		let entries;
		try {
			entries = await readdir(d, { withFileTypes: true });
		} catch {
			return;
		}
		for (const e of entries) {
			const p = join(d, e.name);
			if (e.isDirectory()) {
				if (shouldSkipDir(e.name)) continue;
				await walk(p);
			} else if (e.isFile() && e.name.endsWith(".md")) {
				out.push(p);
			}
		}
	}
	await walk(absDir);
	return out;
}

/**
 * Same order as `scanAgentDirs` in `extensions/agent-team.ts` (first path wins on duplicate
 * `name`); `.cursor/agents` is appended for Cursor-native layouts.
 */
function agentScanRoots(workspaceRoot: string): string[] {
	const roots = [
		join(workspaceRoot, "agents"),
		join(workspaceRoot, ".claude", "agents"),
		join(workspaceRoot, ".pi", "agents"),
		join(workspaceRoot, ".cursor", "agents"),
	];

	// Also include Way of Pi host repo root agents if it's different from the workspace
	const hostRoot = getClawHostRepoRoot();
	if (hostRoot && normalize(hostRoot) !== normalize(workspaceRoot)) {
		roots.push(join(hostRoot, ".pi", "agents"));
	}

	return roots;
}

/**
 * Sync read of `planner.md` from Pi agent scan roots (same order as `agent-team`).
 * Used for Plan mode system prompt so the web shell matches on-disk `.pi/agents/planner.md`.
 */
export function readPlannerAgentBodySync(workspaceRoot: string): string | null {
	for (const dir of agentScanRoots(workspaceRoot)) {
		const p = join(dir, "planner.md");
		if (!existsSync(p)) continue;
		try {
			const raw = readFileSync(p, "utf8");
			const parsed = parseAgentMarkdownPiStyle(raw);
			if (parsed && parsed.name.toLowerCase() === "planner") return parsed.body;
		} catch {
			continue;
		}
	}
	return null;
}

export async function loadWorkspaceAgents(tenantId: string = "default"): Promise<{
	agents: AgentMeta[];
	teams: Record<string, string[]>;
	teamsPath: string | null;
}> {
	const folders = listWorkspaceFolders(tenantId);
	const multi = folders.length > 1;
	/** Lowercase agent name → meta; first scanned file wins (Pi `agent-team` rule). */
	const byKey = new Map<string, AgentMeta>();

	for (const { label, path: root } of folders) {
		for (const dir of agentScanRoots(root)) {
			if (!existsSync(dir)) continue;
			const mdFiles = await collectAgentMarkdownFiles(dir);
			for (const abs of mdFiles) {
				let raw: string;
				try {
					raw = await readFile(abs, "utf8");
				} catch {
					continue;
				}
				const parsed = parseAgentMarkdownPiStyle(raw);
				if (!parsed) continue;
				const key = parsed.name.toLowerCase();
				if (byKey.has(key)) continue;
				const rel = relative(root, abs).replace(/\\/g, "/");
				const displayRel = multi ? `${label}/${rel}` : rel;
				byKey.set(key, {
					name: parsed.name,
					description: parsed.description,
					tools: parsed.tools,
					skills: parsed.skills,
					relativePath: displayRel,
				});
			}
		}
	}

	const agents = [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));

	let teams: Record<string, string[]> = {};
	let teamsPath: string | null = null;
	const primary = folders[0]?.path;
	const primaryLabel = folders[0]?.label;
	if (primary && primaryLabel) {
		const ty = join(primary, ".pi", "agents", "teams.yaml");
		if (existsSync(ty)) {
			try {
				teams = parseTeamsYaml(await readFile(ty, "utf8"));
				teamsPath = relative(primary, ty).replace(/\\/g, "/");
				if (multi) teamsPath = `${primaryLabel}/${teamsPath}`;
			} catch {
				/* ignore */
			}
		}
	}

	return { agents, teams, teamsPath };
}

/** Markdown body after closing `---` of YAML frontmatter (Pi agent `.md` files). */
export function extractBodyAfterFrontmatter(raw: string): string {
	const p = parseAgentMarkdownPiStyle(raw);
	if (p) return p.body;
	return raw.trim();
}

/** First workspace match for agent `name` (same scan order as `loadWorkspaceAgents`). */
export async function getAgentBodyByName(agentName: string, tenantId: string = "default"): Promise<string | null> {
	const want = agentName.trim().toLowerCase();
	if (!want) return null;
	const folders = listWorkspaceFolders(tenantId);
	for (const { path: root } of folders) {
		for (const dir of agentScanRoots(root)) {
			if (!existsSync(dir)) continue;
			const mdFiles = await collectAgentMarkdownFiles(dir);
			for (const abs of mdFiles) {
				let raw: string;
				try {
					raw = await readFile(abs, "utf8");
				} catch {
					continue;
				}
				const parsed = parseAgentMarkdownPiStyle(raw);
				if (!parsed || parsed.name.toLowerCase() !== want) continue;
				return parsed.body;
			}
		}
	}
	return null;
}
