import { db } from "./db";
import { processBotMessage } from "./claw-bot-bridge";
import { handleTimeBotMessage } from "./whatsapp-time-bot";

export interface InboundMessage {
	channel: "telegram" | "whatsapp" | "email";
	channelUserId: string; // phone number, telegram id, or email address
	text: string;
	metadata?: any;
    botId?: string; // Add this
}

export interface InboundResult {
	ok: boolean;
	response?: string;
	error?: string;
}

/**
 * Unified router for all inbound channel messages.
 * Resolves user, scopes tenant, and dispatches to Claw AI via Bot Bridge.
 */
export async function routeInboundMessage(msg: InboundMessage): Promise<InboundResult> {
	try {
		// 1. Resolve user and tenant from channel link
        let query = `
			SELECT l.tenant_id, l.user_id, u.full_name, u.role,
			       bt.label as bot_label
			FROM user_channel_links l
			JOIN users u ON l.user_id = u.id AND l.tenant_id = u.tenant_id
			LEFT JOIN bot_telegram_accounts bt ON l.channel_bot_id = bt.id AND l.tenant_id = bt.tenant_id AND l.channel = 'telegram'
			WHERE l.channel = ? AND l.channel_user_id = ? AND l.active = 1
		`;
        const params: any[] = [msg.channel, msg.channelUserId];
        if (msg.botId) {
            query += " AND l.channel_bot_id = ?";
            params.push(msg.botId);
        }
        query += " LIMIT 1";
		const link = db.query(query).get(...params) as { tenant_id: string; user_id: string; full_name: string | null; role: string; bot_label: string | null } | undefined;

		// 1b. Fallback for WhatsApp (different bot table)
		let botLabel = link?.bot_label;
		if (link && msg.channel === 'whatsapp' && !botLabel) {
			const waBot = db.query("SELECT label FROM bot_whatsapp_accounts WHERE tenant_id = ? AND active = 1 LIMIT 1").get(link.tenant_id) as { label: string } | undefined;
			botLabel = waBot?.label;
		}

		if (!link) {
			return { 
				ok: false, 
				error: "User not linked. Please link your account in the Way of Work profile settings." 
			};
		}

		// 2. Route based on bot label (telegram/whatsapp only)
		if ((msg.channel === "telegram" || msg.channel === "whatsapp") && botLabel === "time_bot") {
			const response = handleTimeBotMessage(
				link.tenant_id,
				link.user_id,
				link.role,
				msg.text,
				link.full_name || `User ${link.user_id}`
			);
			return { ok: true, response };
		}

		// 3. Dispatch to Orchestrator via Bot Bridge
		const result = await processBotMessage({
			tenantId: link.tenant_id,
			userId: link.user_id,
			userName: link.full_name || `User ${link.user_id}`,
			messageText: msg.text,
			channel: msg.channel === "email" ? "telegram" as any : msg.channel,
			channelUserId: msg.channelUserId,
		});

		if (result.ok) {
			return { ok: true, response: result.response };
		}
		return { ok: false, error: result.error };
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return { ok: false, error: `Router error: ${message}` };
	}
}
