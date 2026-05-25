/**
 * Bot Bridge — routes external channel messages (Telegram, WhatsApp) through
 * the Orchestrator chat engine and returns responses.
 *
 * Each bot channel has its own poller / webhook that calls into this module.
 * The Orchestrator decides intent and dispatches to specialized sub-agents
 * (fakturering, ata, docs, claw, etc.) via the dispatch_agent tool.
 */
import { runOrchestratorToolLoop } from "./chat-orchestrator-tools";
import { composeLeadSystem } from "./session-prompts";
import { getPrimaryWorkspacePath } from "./workspace-state";
import { appendWoSessionMessage, loadWoSessionMessages } from "./wo-session-jsonl";
import { getAgentBodyByName, resolveAgentSkillsFromName } from "./agents";
import type { ChatMessage } from "./chat";

export interface BotBridgeOpts {
	tenantId: string;
	userId: string;
	userName: string;
	messageText: string;
	channel: "telegram" | "whatsapp";
	channelUserId: string;
    agentName?: string;
	/** Conversation context — previous messages to maintain history (optional, will be loaded from disk if not provided). */
	history?: ChatMessage[];
}

export interface BotBridgeResult {
	ok: boolean;
	response: string;
	error?: string;
}

/**
 * Process a user message through the Orchestrator and return the response text.
 * The Orchestrator has access to the dispatch_agent tool and can route to
 * specialized sub-agents (fakturering, ata, docs, claw, etc.) as needed.
 */
export async function processBotMessage(
	opts: BotBridgeOpts,
): Promise<BotBridgeResult> {
	const sessionKey = `channel-${opts.channel}-${opts.channelUserId}`;

	// Persist the user message first
	await appendWoSessionMessage(sessionKey, "user", opts.messageText, opts.channel).catch(() => {});

	// Load history if not provided (or even if provided, to ensure persistence)
	let history = opts.history;
	if (!history) {
		history = await loadWoSessionMessages(sessionKey, opts.channel);
		// Trim to last 20 messages (10 turns)
		if (history.length > 20) {
			history = history.slice(-20);
		}
		// The message we just appended is at the end of history now
		history = history.slice(0, -1);
	}

	// Build orchestrator system prompt (agentBody=null → ORCHESTRATOR_WEB_SHELL_SYSTEM)
	const baseSystem = await composeLeadSystem({
		mode: "build",
		agentBody: opts.agentName ? await getAgentBodyByName(opts.agentName, opts.tenantId) : null,
		agentNameLower: opts.agentName?.toLowerCase() ?? null,
		agentSkills: opts.agentName ? await resolveAgentSkillsFromName(opts.agentName, opts.tenantId) : null,
		plannerAgentBody: null,
		orchestratorToolsEnabled: !opts.agentName,
		authoritativeRuntime: false,
		workspaceIndexBoost: null,
	});

	// Add channel-specific context
	const systemPrompt = [
		baseSystem,
		"",
		`**Channel Context:** You are chatting with **${opts.userName}** via **${opts.channel}**.`,
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
		const r = await runOrchestratorToolLoop(
			messages,
			(s) => { fullResponse += s; },
			(_level, _source, _msg) => {},
			undefined, // use env defaults for model config
			{
				tenantId: opts.tenantId,
				userId: opts.userId,
			},
		);

		if (r.result.ok) {
			const response = fullResponse.trim();
			if (response) {
				await appendWoSessionMessage(sessionKey, "assistant", response, opts.channel).catch(() => {});
			}
			return { ok: true, response };
		}
		if ("aborted" in r.result && (r.result as any).aborted) {
			return { ok: false, response: "", error: "Response aborted" };
		}
		return { ok: false, response: "", error: (r.result as any).error ?? "Unknown error" };
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return { ok: false, response: "", error: message };
	}
}
