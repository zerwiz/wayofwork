/**
 * Claw Bot Bridge — routes external channel messages (Telegram, WhatsApp) through
 * the Claw AI chat engine and returns responses.
 *
 * Each bot channel has its own poller / webhook that calls into this module.
 */
import { runSdkChatTurn } from "./sdk-runtime";
import { getPrimaryWorkspacePath } from "./workspace-state";
import { getAgentBodyByName } from "./agents";
import { appendWoSessionMessage, loadWoSessionMessages } from "./wo-session-jsonl";
import type { ChatMessage } from "./chat";

export interface BotBridgeOpts {
	tenantId: string;
	userId: string;
	userName: string;
	messageText: string;
	channel: "telegram" | "whatsapp";
	channelUserId: string;
	/** Conversation context — previous messages to maintain history (optional, will be loaded from disk if not provided). */
	history?: ChatMessage[];
}

export interface BotBridgeResult {
	ok: boolean;
	response: string;
	error?: string;
}

/**
 * Process a user message through the Claw AI and return the response text.
 * Uses the Wo SDK runtime for the full AI experience (tools, agents, etc.).
 */
export async function processBotMessage(
	opts: BotBridgeOpts,
): Promise<BotBridgeResult> {
	const cwd = getPrimaryWorkspacePath(opts.tenantId);
	const sessionKey = `channel-${opts.channel}-${opts.channelUserId}`;

	// Persist the user message first
	await appendWoSessionMessage(sessionKey, "user", opts.messageText).catch(() => {});

	// Load history if not provided (or even if provided, to ensure persistence)
	let history = opts.history;
	if (!history) {
		history = await loadWoSessionMessages(sessionKey);
		// Trim to last 20 messages (10 turns)
		if (history.length > 20) {
			history = history.slice(-20);
		}
		// The message we just appended is at the end of history now
		history = history.slice(0, -1);
	}

	const agentBody = await getAgentBodyByName("claw", opts.tenantId);
	const systemPrompt = [
		agentBody ?? `You are **Claw**, an AI assistant running in Way of Work.`,
		`You are chatting with **${opts.userName}** via **${opts.channel}**.`,
		`**Tenant:** ${opts.tenantId}`,
		`**User:** ${opts.userId} (${opts.userName})`,
		"",
		"PRIVACY RULES:",
		"1. NEVER reveal other users' time, tasks, or personal data.",
		"2. ONLY answer for the authenticated user.",
		"3. If asked about others, politely explain that you can only provide information for the current user.",
	].join("\n");

	const messages: ChatMessage[] = [
		{ role: "system", content: systemPrompt },
		...history,
		{ role: "user", content: opts.messageText },
	];

	let fullResponse = "";

	try {
		const r = await runSdkChatTurn({
			cwd,
			messages,
			onDelta: (s) => { fullResponse += s; },
			onLog: () => {},
		});

		if (r.result.ok) {
			const response = fullResponse.trim();
			if (response) {
				await appendWoSessionMessage(sessionKey, "assistant", response).catch(() => {});
			}
			return { ok: true, response };
		}
		if ("aborted" in r.result && r.result.aborted) {
			return { ok: false, response: "", error: "Response aborted" };
		}
		return { ok: false, response: "", error: r.result.error ?? "Unknown error" };
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return { ok: false, response: "", error: message };
	}
}
