/**
 * Pi-style `/…` lines in Way of Pi web chat (Bun server).
 * Full Pi TUI slash registry lives in Pi itself — this is a **parity subset** for the bridge chat.
 */

import { getAgentBodyByName, loadWorkspaceAgents } from "./agents";
import { fetchOllamaTags, isValidOllamaModelId, isValidOpenRouterModelId } from "./llm-models";
import { resolveOllamaHost, resolveOllamaModelDefault } from "./pi-ollama-env";
import type { ChatSessionMode } from "./session-prompts";

export type ChatSlashMutation = {
	clearTranscript?: boolean;
	setModelId?: string;
	setChatMode?: ChatSessionMode;
	setAgentName?: string | null;
};

export type ChatSlashResult =
	| { handled: false }
	| {
			handled: true;
			/** When true, do not echo `user_message` (e.g. `/clear`). */
			skipUserEcho?: boolean;
			assistantText: string;
			mutation?: ChatSlashMutation;
	  };

const PLAN_INTERVIEW_ASSISTANT_REPLY = [
	"Switched to **Plan** mode for this session.",
	"",
	"**Plan interview** — paste your answers under each heading, then send as your next user message.",
	"",
	"### Outcome",
	"- What shipped state should look like (one paragraph).",
	"",
	"### Constraints",
	"- Time, compatibility, “must not change”, performance, security.",
	"",
	"### Current state",
	"- What exists today; links/paths you already know.",
	"",
	"### Unknowns",
	"- What you are unsure about and want the planner to research or ask about.",
	"",
	"### Verification",
	"- How you will know the work is done (tests, manual checks, metrics).",
].join("\n");

const WEB_CHAT_COMMANDS = [
	"`/help` — this list (add `all` for Pi TUI pointer).",
	"`/models` — list Ollama models (or OpenRouter note + current id).",
	"`/model <id>` — set session model (same as the model picker; validated).",
	"`/plan` / `/build` — switch session system prompt (same as the toolbar: Plan = planner + `plans/PLAN-*.md`; Build = Orchestrator when no agent + `WOP_SYSTEM_PROMPT` if set).",
	"`/plan-interview` — structured headings to fill before a big plan.",
	"`/agent` — list workspace agents; `/agent <name>` or `/system <name>` — persona (merged system prompt).",
	"`/clear` — clear this tab’s transcript (Pi-style; session file rewritten).",
	"`/reload` — what reload does in Pi vs this shell (informational).",
].join("\n");

function parseSlashLine(trimmed: string): { cmd: string; rest: string } | null {
	if (trimmed.includes("\n")) return null;
	if (!trimmed.startsWith("/")) return null;
	if (trimmed === "/") return { cmd: "help", rest: "" };
	const m = trimmed.match(/^\/([A-Za-z][A-Za-z0-9_-]*)(?:\s+(.*))?$/);
	if (!m) return null;
	const cmd = m[1].toLowerCase();
	const rest = (m[2] ?? "").trim();
	return { cmd, rest };
}

async function formatModelsList(provider: string): Promise<string> {
	const envDefaultOllama = resolveOllamaModelDefault();
	const envDefaultOpenrouter = process.env.OPENROUTER_MODEL || "openrouter/auto";
	const p = provider.toLowerCase();
	if (p === "openrouter") {
		return [
			"**OpenRouter** (web chat)",
			"",
			`Default model id: \`${envDefaultOpenrouter}\``,
			"",
			"Use **`/model <openrouter-model-id>`** to set the session model (same id strings Pi uses with OpenRouter).",
			"Listing all OpenRouter models requires an API catalog call — use the **AI Brains** / model picker in the shell, or see https://openrouter.ai/models",
		].join("\n");
	}
	if (p !== "ollama") {
		return `Current **WOP_LLM_PROVIDER** is \`${provider}\` — web chat only lists models for **ollama** or **openrouter**.`;
	}
	const host = resolveOllamaHost();
	const tags = await fetchOllamaTags(host);
	if (!tags.ok) {
		return [`Could not reach Ollama at \`${host}\`: ${tags.error}`, "", `Env default: \`${envDefaultOllama}\``].join("\n");
	}
	const names = tags.models.map((m) => m.name).filter(Boolean);
	if (names.length === 0) {
		return [`No models reported by Ollama at \`${host}\`.`, "", `Env default: \`${envDefaultOllama}\``].join("\n");
	}
	const lines = ["**Ollama models** (`ollama list` / tags):", "", ...names.map((n) => `- \`${n}\``), "", `Env default: \`${envDefaultOllama}\``];
	return lines.join("\n");
}

async function formatAgentsList(): Promise<string> {
	try {
		const data = await loadWorkspaceAgents();
		const agents = data.agents ?? [];
		if (agents.length === 0) {
			return "No workspace agents found (same scan as Pi: `agents/`, `.claude/agents/`, `.pi/agents/`, `.cursor/agents/`).";
		}
		const lines = [
			"**Workspace agents** (pick in the chat toolbar or use `/agent <name>`):",
			"",
			...agents.map((a) => `- **${a.name}**${a.description ? ` — ${a.description}` : ""}`),
		];
		return lines.join("\n");
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		return `Could not load agents: ${m}`;
	}
}

export async function evalChatSlashCommand(
	trimmed: string,
	env: {
		provider: string;
		ollamaModel?: string;
		openrouterModel?: string;
	},
): Promise<ChatSlashResult> {
	const parsed = parseSlashLine(trimmed);
	if (!parsed) return { handled: false };

	const { cmd, rest } = parsed;
	const p = env.provider.toLowerCase();

	switch (cmd) {
		case "help": {
			if (rest === "all") {
				return {
					handled: true,
					assistantText: [
						"**Way of Pi web chat** — slash subset (see **`docs/commands/REFERENCE.md`** for the full Pi TUI command guide).",
						"",
						WEB_CHAT_COMMANDS,
						"",
						"Extension reload, session storage, notes, and other Pi-only flows still require the **Pi terminal** (or future headless bridge).",
					].join("\n"),
				};
			}
			return {
				handled: true,
				assistantText: [
					"**Web chat commands** (Pi-shaped):",
					"",
					WEB_CHAT_COMMANDS,
					"",
					"Type **`/help all`** for a longer note and link to the Pi command reference.",
				].join("\n"),
			};
		}
		case "models": {
			const body = await formatModelsList(p);
			return { handled: true, assistantText: body };
		}
		case "model": {
			if (!rest) {
				const body = await formatModelsList(p);
				return { handled: true, assistantText: body };
			}
			const id = rest.trim();
			if (p === "openrouter") {
				if (!isValidOpenRouterModelId(id)) {
					return { handled: true, assistantText: `Invalid OpenRouter model id: \`${id}\`` };
				}
				return {
					handled: true,
					assistantText: `Session model set to **OpenRouter** \`${id}\`.`,
					mutation: { setModelId: id },
				};
			}
			if (p !== "ollama") {
				return {
					handled: true,
					assistantText: `Cannot set model while **WOP_LLM_PROVIDER** is \`${env.provider}\` (only ollama / openrouter supported in web chat).`,
				};
			}
			if (!isValidOllamaModelId(id)) {
				return { handled: true, assistantText: `Invalid Ollama model id: \`${id}\`` };
			}
			return {
				handled: true,
				assistantText: `Session model set to **Ollama** \`${id}\`.`,
				mutation: { setModelId: id },
			};
		}
		case "plan":
			return {
				handled: true,
				assistantText:
					"Switched to **Plan** mode — **planner.md** from the workspace when present, else the built-in planner instructions. Next replies use this until you switch to **Build** or pick a different mode. Use **From plan** / **Review plan** in the chat chrome (or **GET /api/plans**) for `plans/PLAN-*.md` handoffs.",
				mutation: { setChatMode: "plan" },
			};
		case "build":
			return {
				handled: true,
				assistantText:
					"Switched to **Build** mode — **Orchestrator** posture when no workspace agent is selected; otherwise the selected **.md** agent body. Server **WOP_SYSTEM_PROMPT** is prepended when set (same merge order as the toolbar).",
				mutation: { setChatMode: "build" },
			};
		case "plan-interview":
			return {
				handled: true,
				assistantText: PLAN_INTERVIEW_ASSISTANT_REPLY,
				mutation: { setChatMode: "plan" },
			};
		case "clear":
			return {
				handled: true,
				skipUserEcho: true,
				assistantText: "",
				mutation: { clearTranscript: true },
			};
		case "reload":
			return {
				handled: true,
				assistantText: [
					"**`/reload` in Pi** reapplies `agent/settings.json` and project **`.pi/settings.json`** (extensions, etc.).",
					"",
					"**Way of Pi web chat** does not hot-reload the Bun server from here. After editing env or **`.pi/settings.json`**, restart the dev server (or **Settings → Restart server** — allowed by default in dev).",
				].join("\n"),
			};
		case "system":
		case "agent": {
			if (!rest) {
				const body = await formatAgentsList();
				const hint =
					cmd === "system"
						? "In Pi, **`/system`** is a flat picker; here use **`/agent <name>`** from the list above."
						: "Use **`/agent <name>`** to activate a persona for this session.";
				return { handled: true, assistantText: `${body}\n\n${hint}` };
			}
			const name = rest.trim();
			const body = await getAgentBodyByName(name);
			if (!body) {
				return {
					handled: true,
					assistantText: `Agent **"${name}"** not found (same scan order as Pi **agent-team**). Try **\`/agent\`** with no args for the roster.`,
				};
			}
			return {
				handled: true,
				assistantText: `Persona set to **${name}** (markdown system prompt from the workspace).`,
				mutation: { setAgentName: name },
			};
		}
		default:
			return {
				handled: true,
				assistantText: [
					`Unknown web chat command **\`/${cmd}\`**.`,
					"",
					"Type **`/help`** for commands supported here, or use the **Pi TUI** for the full slash registry (**`docs/commands/REFERENCE.md`**).",
				].join("\n"),
			};
	}
}
