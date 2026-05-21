/**
 * Claw Bot Bridge — routes external channel messages (Telegram, WhatsApp) through
 * the Claw AI chat engine and returns responses.
 *
 * Each bot channel has its own poller / webhook that calls into this module.
 */
import { runSdkChatTurn } from "./sdk-runtime";
import { getPrimaryWorkspacePath } from "./workspace-state";
import type { ChatMessage } from "./chat";

export interface BotBridgeOpts {
	tenantId: string;
	userId: string;
	userName: string;
	messageText: string;
	channel: "telegram" | "whatsapp";
	/** Conversation context — previous messages to maintain history (optional). */
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

	const systemPrompt = [
		`You are **Claw**, an AI assistant running in Way of Work.`,
		`You are chatting with **${opts.userName}** via **${opts.channel}**.`,
		`You can help with project management, task tracking, time logging,`,
		`answering questions about the workspace, and general assistance.`,
		`Be concise and helpful. Use tools when needed.`,
		`**Tenant:** ${opts.tenantId}`,
		`**User:** ${opts.userId} (${opts.userName})`,
	].join("\n");

	const messages: ChatMessage[] = [
		{ role: "system", content: systemPrompt },
		...(opts.history ?? []),
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
			return { ok: true, response: fullResponse.trim() };
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
