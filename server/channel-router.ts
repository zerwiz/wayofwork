import { db } from "./db";
import { processBotMessage } from "./claw-bot-bridge";

export interface InboundMessage {
	channel: "telegram" | "whatsapp" | "email";
	channelUserId: string; // phone number, telegram id, or email address
	text: string;
	metadata?: any;
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
		const link = db.query(`
			SELECT l.tenant_id, l.user_id, u.full_name, u.role
			FROM user_channel_links l
			JOIN users u ON l.user_id = u.id AND l.tenant_id = u.tenant_id
			WHERE l.channel = ? AND l.channel_user_id = ? AND l.active = 1
			LIMIT 1
		`).get(msg.channel, msg.channelUserId) as { tenant_id: string; user_id: string; full_name: string | null; role: string } | undefined;

		if (!link) {
			return { 
				ok: false, 
				error: "User not linked. Please link your account in the Way of Work profile settings." 
			};
		}

		// 2. Dispatch to Claw Bot Bridge (which handles session persistence and AI turn)
		const result = await processBotMessage({
			tenantId: link.tenant_id,
			userId: link.user_id,
			userName: link.full_name || `User ${link.user_id}`,
			messageText: msg.text,
			channel: msg.channel === "email" ? "telegram" as any : msg.channel, // interim mapping for channel-specific skills
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
