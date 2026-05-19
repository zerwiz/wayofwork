/**
 * Pi-shaped **phrase dispatch** for the web shell when chat is **not** inside Pi JSON mode:
 * infer specialist handoffs from natural language (same roster as **`dispatch_agent`**
 * — workspace **`.md`** agents) and return the target body, or signal return to orchestrator.
 *
 * Callers merge the specialist system block **for one assistant turn only** — like Pi **agent-team**
 * where the **dispatcher** process stays primary; they must **not** persist `agentName` from this alone.
 *
 * Headless Pi turns should use the real **`dispatch_agent`** tool instead of this heuristic.
 */
import type { AgentMeta } from "./agents";
import { getAgentBodyByName, loadWorkspaceAgents } from "./agents";
import { getPrimaryWorkspacePath } from "./workspace-state";

let rosterCache: { root: string; agents: AgentMeta[]; at: number } | null = null;
const ROSTER_TTL_MS = 12_000;

async function agentsForDispatch(): Promise<AgentMeta[]> {
	const root = getPrimaryWorkspacePath();
	const now = Date.now();
	if (rosterCache && rosterCache.root === root && now - rosterCache.at < ROSTER_TTL_MS) {
		return rosterCache.agents;
	}
	const { agents } = await loadWorkspaceAgents();
	rosterCache = { root, agents, at: now };
	return agents;
}

/** User wants the **Orchestrator** persona again (no merged `.md` body). */
export function tryResolveOrchestratorReturn(userText: string): boolean {
	const t = userText.replace(/\s+/g, " ").trim().toLowerCase();
	if (!t) return false;
	if (/^\s*(?:back\s+to\s+|return\s+to\s+)?orchestrator\b/.test(t)) return true;
	if (/\bswitch\s+to\s+orchestrator\b/.test(t)) return true;
	if (/\buse\s+orchestrator\b/.test(t)) return true;
	if (/\bmain\s+(?:session|agent)\b/.test(t)) return true;
	if (/^\s*\/orchestrator\b/.test(t)) return true;
	return false;
}

function canonicalNameForLower(agents: AgentMeta[], lower: string): string {
	const hit = agents.find((a) => a.name.toLowerCase() === lower);
	return hit?.name ?? lower;
}

/**
 * If `userText` is a clear handoff to a roster agent, returns that agent's **lowercase** name.
 * Returns `null` if no match or already on that agent.
 */
export function tryResolveDispatchAgentName(
	userText: string,
	rosterLower: ReadonlySet<string>,
	currentAgentLower: string | null,
): string | null {
	const raw = userText.replace(/\s+/g, " ").trim();
	if (!raw || raw.length > 6000) return null;

	const typoFixes: [RegExp, string][] = [
		[/\bcout\b/gi, "scout"],
		[/\bcsout\b/gi, "scout"],
		[/\bscount\b/gi, "scout"],
		[/\bsvout\b/gi, "scout"],
		[/\bscoot\b/gi, "scout"],
		[/\bsatrt\b/gi, "start"],
		[/\bstrt\b/gi, "start"],
		[/\byuo\b/gi, "you"],
	];
	let t = raw;
	for (const [rx, rep] of typoFixes) {
		t = t.replace(rx, rep);
	}
	const lower = t.toLowerCase();

	const jsonAgent = lower.match(/"agent"\s*:\s*"([^"]+)"/);
	if (jsonAgent) {
		const n = jsonAgent[1].trim().toLowerCase();
		if (rosterLower.has(n) && n !== currentAgentLower) return n;
	}

	const names = [...rosterLower].sort((a, b) => b.length - a.length);

	for (const name of names) {
		if (name === currentAgentLower) continue;
		const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

		const patterns: RegExp[] = [
			/* Mid-sentence: "can you dispatch the scout …", "/dispatch the planner" — must not require ^ or [.!?] */
			new RegExp(
				`\\b(?:dispatch|hand\\s*off|handoff)\\s+(?:to\\s+)?(?:the\\s+)?(${esc})\\b`,
				"i",
			),
			/* "start scout", "tell the planner …", "use reviewer" */
			new RegExp(
				`(?:^|[.!?]\\s+)\\s*(?:please\\s+)?(?:can\\s+you\\s+|could\\s+you\\s+)?(?:start|switch\\s+(?:to|the)|use|tell|ask|invoke|run|open)\\s+(?:the\\s+)?(${esc})\\b`,
				"i",
			),
			/* "scout, look …" / "planner: …" */
			new RegExp(`^${esc}\\s*[,:\\-–]\\s`, "i"),
			/* "scout to look …" (Pi-like task phrasing) */
			new RegExp(`^${esc}\\s+to\\s+`, "i"),
			/* Slack-style @scout at start */
			new RegExp(`^@${esc}\\b`, "i"),
		];

		for (const rx of patterns) {
			if (rx.test(t)) return name;
		}
	}
	return null;
}

export type AutoDispatchResult =
	| { kind: "none" }
	| { kind: "orchestrator" }
	| { kind: "agent"; canonicalName: string; body: string };

/**
 * Detect orchestrator return or roster dispatch; resolve **`.md`** body when switching to an agent.
 */
export async function tryAutoDispatchFromUserText(
	userText: string,
	currentAgentName: string | null,
): Promise<AutoDispatchResult> {
	if (tryResolveOrchestratorReturn(userText)) {
		if (currentAgentName?.trim()) return { kind: "orchestrator" };
		return { kind: "none" };
	}

	const agents = await agentsForDispatch();
	const roster = new Set(agents.map((a) => a.name.toLowerCase()));
	const cur = currentAgentName?.trim().toLowerCase() ?? null;
	const hit = tryResolveDispatchAgentName(userText, roster, cur);
	if (!hit) return { kind: "none" };

	const canonical = canonicalNameForLower(agents, hit);
	const body = await getAgentBodyByName(canonical);
	if (!body) return { kind: "none" };
	return { kind: "agent", canonicalName: canonical, body };
}
