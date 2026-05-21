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
let lastUpdateId = 0;
let botUsername = "";

export function getBotUsername(): string {
	return botUsername;
}

/**
 * Start long-polling for Telegram updates.
 * Must be called after server is ready.
 */
export async function startTelegramBot(): Promise<void> {
	const token = process.env.WOP_TELEGRAM_BOT_TOKEN;
	if (!token) {
		console.log("[telegram-bot] No WOP_TELEGRAM_BOT_TOKEN set — bot disabled");
		return;
	}

	// Validate token and get bot info
	try {
		const meRes = await fetch(`${TELEGRAM_API}/bot${token}/getMe`);
		const me = await meRes.json() as any;
		if (!me.ok) {
			console.error("[telegram-bot] Invalid token:", me.description);
			return;
		}
		botUsername = me.result.username;
		console.log(`[telegram-bot] Started as @${botUsername}`);
	} catch (e) {
		console.error("[telegram-bot] Failed to connect:", e);
		return;
	}

	// Register/update the bot account in the database
	registerBotInDb(token, botUsername);

	pollingInterval = setInterval(() => pollUpdates(token), 2000);
}

function registerBotInDb(token: string, username: string): void {
	try {
		const existing = db.query(
			"SELECT id FROM bot_telegram_accounts WHERE bot_username = ?"
		).get(username) as any;
		if (existing) {
			// Update bot_token_encrypted and reactivate
			db.query(
				"UPDATE bot_telegram_accounts SET bot_token_encrypted = ?, active = 1 WHERE id = ?"
			).run(token, existing.id);
		} else {
			const id = `tgb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
			db.query(`
				INSERT INTO bot_telegram_accounts (id, tenant_id, label, bot_token_encrypted, bot_username, active)
				VALUES (?, 'default', ?, ?, ?, 1)
			`).run(id, username, token, username);
		}
	} catch (e) {
		console.error("[telegram-bot] Failed to register bot in DB:", e);
	}
}

export function stopTelegramBot(): void {
	if (pollingInterval) {
		clearInterval(pollingInterval);
		pollingInterval = null;
		console.log("[telegram-bot] Stopped");
	}
}

interface TelegramUpdate {
	update_id: number;
	message?: {
		message_id: number;
		from: { id: number; first_name?: string; last_name?: string; username?: string };
		chat: { id: number; type: string };
		text?: string;
	};
}

async function pollUpdates(token: string): Promise<void> {
	try {
		const res = await fetch(
			`${TELEGRAM_API}/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=10`
		);
		const data = await res.json() as { ok: boolean; result: TelegramUpdate[] };
		if (!data.ok || !data.result?.length) return;

		for (const update of data.result) {
			if (update.update_id >= lastUpdateId) {
				lastUpdateId = update.update_id;
			}
			if (update.message?.text) {
				void handleMessage(token, update).catch((e) =>
					console.error("[telegram-bot] Error handling message:", e)
				);
			}
		}
	} catch (e) {
		// Network errors in polling are normal (timeouts, etc.)
	}
}

async function handleMessage(token: string, update: TelegramUpdate): Promise<void> {
	const msg = update.message!;
	const chatId = msg.chat.id;
	const fromId = String(msg.from.id);
	const userName = msg.from.first_name || msg.from.username || `User ${fromId}`;
	const text = msg.text?.trim() || "";
	const fromUsername = msg.from.username || "";

	if (!text) return;

	// Find the user by their Telegram user ID in channel links
	const link = db.query(`
		SELECT l.tenant_id, l.user_id, u.full_name
		FROM user_channel_links l
		JOIN users u ON l.user_id = u.id AND l.tenant_id = u.tenant_id
		WHERE l.channel = 'telegram' AND l.channel_user_id = ?
		LIMIT 1
	`).get(fromId) as { tenant_id: string; user_id: string; full_name: string | null } | undefined;

	if (!link) {
		await sendTelegramMessage(token, chatId, [
			`Hello ${userName}! I'm Claw (@${botUsername}).`,
			"",
			"You are not linked to a Way of Work account yet.",
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

	// Process through Claw AI
	const result = await processBotMessage({
		tenantId: link.tenant_id,
		userId: link.user_id,
		userName: displayName,
		messageText: text,
		channel: "telegram",
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
