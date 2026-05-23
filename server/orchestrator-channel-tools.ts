import { db } from "./db";
import { sendEmail } from "./email";

const TELEGRAM_API = "https://api.telegram.org";

async function sendTelegram(token: string, chatId: string, text: string): Promise<boolean> {
	try {
		const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
		});
		return res.ok;
	} catch {
		return false;
	}
}

async function sendWhatsapp(to: string, text: string): Promise<boolean> {
	const phoneNumberId = process.env.WOP_WHATSAPP_PHONE_NUMBER_ID;
	const accessToken = process.env.WOP_WHATSAPP_ACCESS_TOKEN;
	if (!phoneNumberId || !accessToken) return false;
	const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
	try {
		const res = await fetch(url, {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				messaging_product: "whatsapp",
				to,
				type: "text",
				text: { body: text },
			}),
		});
		return res.ok;
	} catch {
		return false;
	}
}

function logChannelMessage(
	tenantId: string,
	userId: string,
	channel: string,
	channelUserId: string,
	text: string,
	direction: string,
): void {
	try {
		const id = `cml_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
		db.query(`
			INSERT INTO channel_message_logs (id, tenant_id, user_id, channel, channel_user_id, direction, message_text, message_type)
			VALUES (?, ?, ?, ?, ?, ?, ?, 'text')
		`).run(id, tenantId, userId, channel, channelUserId, direction, text);
	} catch { /* ignore */ }
}

export async function toolTelegramSend(args: { userId: string; text: string }, tenantId: string): Promise<string> {
	const link = db.query(
		"SELECT channel_user_id FROM user_channel_links WHERE tenant_id = ? AND user_id = ? AND channel = 'telegram' AND active = 1"
	).get(tenantId, args.userId) as { channel_user_id: string } | undefined;

	if (!link) return `Error: User ${args.userId} has no active Telegram link.`;

	const bot = db.query(
		"SELECT bot_token_encrypted FROM bot_telegram_accounts WHERE tenant_id = ? AND active = 1 ORDER BY created_at DESC LIMIT 1"
	).get(tenantId) as { bot_token_encrypted: string } | undefined;

	const token = bot?.bot_token_encrypted || process.env.WOP_TELEGRAM_BOT_TOKEN;
	if (!token) return "Error: No Telegram bot configured for this tenant.";

	const ok = await sendTelegram(token, link.channel_user_id, args.text);
	if (ok) {
		logChannelMessage(tenantId, args.userId, "telegram", link.channel_user_id, args.text, "outbound");
		return `Successfully sent Telegram message to ${args.userId}.`;
	}
	return `Error: Failed to send Telegram message to ${args.userId}.`;
}

export async function toolWhatsappSend(args: { userId: string; text: string }, tenantId: string): Promise<string> {
	const link = db.query(
		"SELECT channel_user_id FROM user_channel_links WHERE tenant_id = ? AND user_id = ? AND channel = 'whatsapp' AND active = 1"
	).get(tenantId, args.userId) as { channel_user_id: string } | undefined;

	if (!link) return `Error: User ${args.userId} has no active WhatsApp link.`;

	const ok = await sendWhatsapp(link.channel_user_id, args.text);
	if (ok) {
		logChannelMessage(tenantId, args.userId, "whatsapp", link.channel_user_id, args.text, "outbound");
		return `Successfully sent WhatsApp message to ${args.userId}.`;
	}
	return `Error: Failed to send WhatsApp message to ${args.userId}.`;
}

export async function toolEmailSend(args: { userId: string; subject: string; text: string }, tenantId: string): Promise<string> {
	const link = db.query(
		"SELECT email FROM users WHERE id = ? AND tenant_id = ?"
	).get(args.userId, tenantId) as { email: string } | undefined;

	if (!link || !link.email) return `Error: User ${args.userId} has no email address on file.`;

	const result = await sendEmail({
		to: link.email,
		subject: args.subject,
		text: args.text,
	});

	if (result.ok) {
		logChannelMessage(tenantId, args.userId, "email", link.email, args.text, "outbound");
		return `Successfully sent email to ${args.userId} (${link.email}).`;
	}
	return `Error: Failed to send email: ${result.error}`;
}

export const ORCHESTRATOR_CHANNEL_TOOLS_OPENAI = [
	{
		type: "function" as const,
		function: {
			name: "telegram_send",
			description: "Send a Telegram message to a user. The user must have a linked Telegram account.",
			parameters: {
				type: "object",
				properties: {
					userId: { type: "string", description: "The Way of Work user ID" },
					text: { type: "string", description: "The message text (Markdown supported)" },
				},
				required: ["userId", "text"],
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "whatsapp_send",
			description: "Send a WhatsApp message to a user. The user must have a linked WhatsApp account.",
			parameters: {
				type: "object",
				properties: {
					userId: { type: "string", description: "The Way of Work user ID" },
					text: { type: "string", description: "The message text" },
				},
				required: ["userId", "text"],
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "email_send",
			description: "Send an email to a user. The user must have an email address on file.",
			parameters: {
				type: "object",
				properties: {
					userId: { type: "string", description: "The Way of Work user ID" },
					subject: { type: "string", description: "Email subject line" },
					text: { type: "string", description: "Email body text" },
				},
				required: ["userId", "subject", "text"],
			},
		},
	},
];
