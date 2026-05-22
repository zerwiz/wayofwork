/**
 * Telegram Bot — long-polling handler that bridges Telegram messages to the Claw AI.
 *
 * Reads the bot token from `WOP_TELEGRAM_BOT_TOKEN` env var.
 * Looks up users by their Telegram user ID in `user_channel_links`.
 */
import { db } from "./db";
import { processBotMessage } from "./claw-bot-bridge";

const TELEGRAM_API = "https://api.telegram.org";

let pollingInterval: ReturnType<typeof setInterval> | null = null;
const lastUpdateIds = new Map<string, number>();

/**
 * Start long-polling for all active Telegram bots.
 */
export async function startTelegramBot(): Promise<void> {
	// Initialize with the env token if provided (for backwards compatibility)
	const envToken = process.env.WOP_TELEGRAM_BOT_TOKEN;
	if (envToken) {
		// Just ensure it's in the DB with 'default' tenant
		try {
			const existing = db.query(
				"SELECT id FROM bot_telegram_accounts WHERE bot_token_encrypted = ?"
			).get(envToken) as any;
			if (!existing) {
				const id = `tgb_env_${Date.now()}`;
				db.query(`
					INSERT INTO bot_telegram_accounts (id, tenant_id, label, bot_token_encrypted, active)
					VALUES (?, 'default', 'System Bot', ?, 1)
				`).run(id, envToken);
			}
		} catch (e) {
			console.error("[telegram-bot] Failed to sync env token to DB:", e);
		}
	}

	console.log("[telegram-bot] Started multi-bot polling");
	pollingInterval = setInterval(() => pollAllBots(), 3000);
}

async function pollAllBots(): Promise<void> {
	try {
		const activeBots = db.query(`
			SELECT id, tenant_id, bot_token_encrypted as token
			FROM bot_telegram_accounts
			WHERE active = 1
		`).all() as { id: string, tenant_id: string, token: string }[];

		for (const bot of activeBots) {
			void pollUpdates(bot.token, bot.tenant_id).catch(() => {});
		}
	} catch (e) {
		console.error("[telegram-bot] Error fetching active bots:", e);
	}
}

async function pollUpdates(token: string, tenantId: string): Promise<void> {
	const lastUpdateId = lastUpdateIds.get(token) || 0;
	try {
		const res = await fetch(
			`${TELEGRAM_API}/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=5`
		);
		const data = await res.json() as { ok: boolean; result: TelegramUpdate[] };
		if (!data.ok || !data.result?.length) return;

		let maxId = lastUpdateId;
		for (const update of data.result) {
			if (update.update_id > maxId) {
				maxId = update.update_id;
			}
			if (update.message?.text) {
				void handleMessage(token, tenantId, update).catch((e) =>
					console.error("[telegram-bot] Error handling message:", e)
				);
			}
		}
		lastUpdateIds.set(token, maxId);
	} catch (e) {
		// Network errors in polling are normal
	}
}

async function handleMessage(token: string, botTenantId: string, update: TelegramUpdate): Promise<void> {
	const msg = update.message!;
	const chatId = msg.chat.id;
	const fromId = String(msg.from.id);
	const userName = msg.from.first_name || msg.from.username || `User ${fromId}`;
	const text = msg.text?.trim() || "";
	const fromUsername = msg.from.username || "";

	if (!text) return;

	// Find the user by their Telegram user ID in channel links
	// Scoped to the bot's tenant
	const link = db.query(`
		SELECT l.tenant_id, l.user_id, u.full_name
		FROM user_channel_links l
		JOIN users u ON l.user_id = u.id AND l.tenant_id = u.tenant_id
		WHERE l.channel = 'telegram' AND l.channel_user_id = ? AND l.tenant_id = ?
		LIMIT 1
	`).get(fromId, botTenantId) as { tenant_id: string; user_id: string; full_name: string | null } | undefined;

	if (!link) {
		await sendTelegramMessage(token, chatId, [
			`Hello ${userName}!`,
			"",
			"You are not linked to a Way of Work account for this bot yet.",
			"To link your account:",
			"1. Log into Way of Work",
			"2. Go to your Profile → Channel Links",
			`3. Link your Telegram ID: \`${fromId}\` (username: @${fromUsername || "none"})`,
			"",
			"Once linked, I can help you with tasks, time tracking, and more!",
		].join("\n"));
		return;
	}

	const displayName = link.full_name || userName;

	// Log the inbound message
	logChannelMessage(link.tenant_id, link.user_id, "telegram", fromId, text, "inbound", "text");

	// Show typing indicator
	await sendTelegramChatAction(token, chatId, "typing");

	// Process through Claw AI (session persistence is automated in processBotMessage)
	const result = await processBotMessage({
		tenantId: link.tenant_id,
		userId: link.user_id,
		userName: displayName,
		messageText: text,
		channel: "telegram",
		channelUserId: fromId,
	});

	if (result.ok && result.response) {
		await sendTelegramMessage(token, chatId, result.response);
		logChannelMessage(link.tenant_id, link.user_id, "telegram", fromId, result.response, "outbound", "text");
	} else if (result.error) {
		await sendTelegramMessage(token, chatId, `❌ Sorry, something went wrong: ${result.error}`);
	} else {
		await sendTelegramMessage(token, chatId, "🤔 I received your message but couldn't generate a response.");
	}
}

async function sendTelegramMessage(token: string, chatId: number, text: string): Promise<void> {
	// Telegram has a 4096 char limit; split if needed
	const maxLen = 4000;
	if (text.length > maxLen) {
		for (let i = 0; i < text.length; i += maxLen) {
			const chunk = text.slice(i, i + maxLen);
			await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ chat_id: chatId, text: chunk, parse_mode: "Markdown" }),
			});
		}
	} else {
		await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
		});
	}
}

async function sendTelegramChatAction(token: string, chatId: number, action: string): Promise<void> {
	await fetch(`${TELEGRAM_API}/bot${token}/sendChatAction`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ chat_id: chatId, action }),
	});
}

function logChannelMessage(
	tenantId: string,
	userId: string,
	channel: string,
	channelUserId: string,
	text: string,
	direction: string,
	messageType: string,
): void {
	try {
		const id = `cml_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
		db.query(`
			INSERT INTO channel_message_logs (id, tenant_id, user_id, channel, channel_user_id, direction, message_text, message_type)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`).run(id, tenantId, userId, channel, channelUserId, direction, text, messageType);
	} catch {
		// best-effort logging
	}
}
