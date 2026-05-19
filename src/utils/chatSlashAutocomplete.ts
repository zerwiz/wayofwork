/**
 * Web chat `/…` suggestions — keep in sync with **`server/chat-slash-commands.ts`**
 * (`evalChatSlashCommand` supported verbs).
 */

export type ChatWebSlashCommand = {
	id: string;
	detail: string;
};

/** Subset of Pi TUI slash commands handled by the Bun chat bridge. */
export const CHAT_WEB_SLASH_COMMANDS: ChatWebSlashCommand[] = [
	{ id: "help", detail: "List commands (`/help all` → Pi reference note)" },
	{ id: "models", detail: "List Ollama tags or OpenRouter note + current id" },
	{ id: "model", detail: "Set session model (`/model <id>`)" },
	{ id: "plan", detail: "Plan mode — planner.md + plans/PLAN-*.md (session system prompt)" },
	{ id: "plan-interview", detail: "Switch to Plan + paste structured questionnaire" },
	{ id: "build", detail: "Build mode — Orchestrator if no agent; WOP_SYSTEM_PROMPT when set" },
	{ id: "clear", detail: "Clear this tab transcript" },
	{ id: "reload", detail: "What reload means here vs Pi TUI" },
	{ id: "agent", detail: "List or pick workspace agent (`/agent <name>`)" },
	{ id: "system", detail: "Alias of agent picker (flat Pi-style)" },
];

const COMMANDS_WITH_ARG = new Set(["model", "agent", "system"]);

export type SlashMenuState = {
	lineStart: number;
	replaceTo: number;
	query: string;
	filtered: ChatWebSlashCommand[];
};

/** When the current line from `/` through the caret is only `/` + word chars, offer completions. */
export function slashMenuAtCursor(value: string, caret: number): SlashMenuState | null {
	const lineStart = value.slice(0, caret).lastIndexOf("\n") + 1;
	const fragment = value.slice(lineStart, caret);
	if (!fragment.startsWith("/")) return null;
	if (!/^\/[\w-]*$/.test(fragment)) return null;

	const query = fragment.slice(1).toLowerCase();
	const q = query.trim();
	const filtered = CHAT_WEB_SLASH_COMMANDS.filter((c) => c.id.startsWith(q)).slice(0, 12);
	if (filtered.length === 0) return null;

	return { lineStart, replaceTo: caret, query, filtered };
}

export function slashCompletionNeedsTrailingSpace(commandId: string): boolean {
	return COMMANDS_WITH_ARG.has(commandId.toLowerCase());
}

export function applySlashCompletion(
	value: string,
	lineStart: number,
	replaceTo: number,
	commandId: string,
): { value: string; caret: number } {
	const tail = value.slice(replaceTo);
	const insert = `/${commandId}${slashCompletionNeedsTrailingSpace(commandId) ? " " : ""}`;
	const next = value.slice(0, lineStart) + insert + tail;
	const caret = lineStart + insert.length;
	return { value: next, caret };
}
