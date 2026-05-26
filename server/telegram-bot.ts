/**
 * Telegram Bot — webhook-first handler with long-polling fallback for multi-bot support.
 *
 * On startup, sets up webhooks for all active bots. If webhook registration fails,
 * falls back to polling. All updates (messages, edited_messages, media) are processed
 * through the unified channel router.
 */
import { db } from "./db";
import { routeInboundMessage } from "./channel-router";
import { getWorkspaceRoot } from "./paths";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const TELEGRAM_API = "https://api.telegram.org";

let pollingInterval: ReturnType<typeof setInterval> | null = null;
const lastUpdateIds = new Map<string, number>();

interface TelegramPhoto {
	file_id: string;
	file_unique_id: string;
	file_size?: number;
	width: number;
	height: number;
}

interface TelegramDocument {
	file_id: string;
	file_unique_id: string;
	file_name?: string;
	mime_type?: string;
	file_size?: number;
}

interface TelegramMessage {
	message_id: number;
	from?: { id: number; username?: string; first_name?: string };
	chat: { id: number; type: string };
	date: number;
	text?: string;
	caption?: string;
	photo?: TelegramPhoto[];
	document?: TelegramDocument;
}

interface TelegramUpdate {
	update_id: number;
	message?: TelegramMessage;
	edited_message?: TelegramMessage;
}

/**
 * Set up Telegram webhooks for all active bots.
 * Returns a list of bot IDs that failed (will use polling instead).
 */
export async function setupTelegramWebhooks(baseUrl: string): Promise<string[]> {
	const failed: string[] = [];
	try {
		const activeBots = db.query(`
			SELECT id, bot_token_encrypted as token
			FROM bot_telegram_accounts
			WHERE active = 1
		`).all() as { id: string; token: string }[];

		for (const bot of activeBots) {
			const webhookUrl = `${baseUrl.replace(/\/+$/, "")}/api/channels/telegram/webhook/${bot.id}`;
			try {
				const res = await fetch(`${TELEGRAM_API}/bot${bot.token}/setWebhook`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						url: webhookUrl,
						allowed_updates: ["message", "edited_message"],
					}),
				});
				const data = await res.json() as { ok: boolean; description?: string };
				if (data.ok) {
					console.log(`[telegram-bot] Webhook set for bot ${bot.id} → ${webhookUrl}`);
				} else {
					console.warn(`[telegram-bot] Webhook failed for bot ${bot.id}: ${data.description} — falling back to polling`);
					failed.push(bot.id);
				}
			} catch {
				console.warn(`[telegram-bot] Webhook setup error for bot ${bot.id} — falling back to polling`);
				failed.push(bot.id);
			}
		}
	} catch (e) {
		console.error("[telegram-bot] Error fetching bots for webhook setup:", e);
	}
	return failed;
}

/**
 * Start long-polling as fallback for bots that couldn't use webhooks.
 */
export function startPollingFallback(failedBotIds?: string[]): void {
	if (pollingInterval) return;

	const failedSet = failedBotIds ? new Set(failedBotIds) : null;
	console.log("[telegram-bot] Starting polling fallback");
	pollingInterval = setInterval(() => pollAllBots(failedSet), 3000);
}

async function pollAllBots(failedSet?: Set<string>): Promise<void> {
	try {
		let query = "SELECT id, tenant_id, bot_token_encrypted as token FROM bot_telegram_accounts WHERE active = 1";
		const params: string[] = [];
		if (failedSet && failedSet.size > 0) {
			const placeholders = [...failedSet].map(() => "?").join(",");
			query += ` AND id IN (${placeholders})`;
			params.push(...failedSet);
		}
		const activeBots = db.query(query).all(...params) as { id: string; tenant_id: string; token: string }[];

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
			if (update.update_id > maxId) maxId = update.update_id;
			await processTelegramUpdate(update, bot.token, bot.tenant_id, bot.id);
		}

		lastUpdateIds.set(token, maxId);
	} catch {
		// Network errors in polling are normal
	}
}

/**
 * Process a Telegram update (message or edited_message).
 * Shared between polling and webhook paths.
 */
export async function processTelegramUpdate(
	update: TelegramUpdate,
	token: string,
	botTenantId: string,
    botId: string,
): Promise<void> {
	const msg = update.message || update.edited_message;
	if (!msg) return;
	if (!msg.from) return;

	const isEdited = !!update.edited_message;
	const chatId = msg.chat.id;
	const fromId = String(msg.from.id);
	const userName = msg.from.first_name || msg.from.username || `User ${fromId}`;
	const text = (msg.text || msg.caption || "").trim();
	const fromUsername = msg.from.username || "";

	// Handle media (photo, document) — download and save to workspace
	let mediaRef = "";
	if (msg.photo && msg.photo.length > 0) {
		const largest = msg.photo[msg.photo.length - 1];
		mediaRef = await downloadTelegramFile(token, largest.file_id, "photos", fromId, undefined, botTenantId);
	}
	if (msg.document) {
		mediaRef = await downloadTelegramFile(token, msg.document.file_id, "documents", fromId, msg.document.file_name, botTenantId);
	}

	const fullText = mediaRef
		? `${text}${text ? "\n\n" : ""}[Media saved: ${mediaRef}]`
		: text;

	if (!fullText) return;

	const result = await routeInboundMessage({
		channel: "telegram",
		channelUserId: fromId,
		text: fullText,
		metadata: { botTenantId, userName, fromUsername, chatId, isEdited, mediaRef },
        botId,
	});

	if (result.ok && result.response) {
		await sendTelegramMessage(token, chatId, result.response);
	} else if (!result.ok && result.error) {
		if (result.error.includes("User not linked")) {
			await sendTelegramMessage(token, chatId, [
				`Hello ${userName}!`,
				"",
				"You are not linked to a Way of Work account for this bot yet.",
				isEdited ? "(edited message)" : "",
				"To link your account:",
				"1. Log into Way of Work",
				"2. Go to your Profile → Channel Links",
				`3. Link your Telegram ID: \`${fromId}\` (username: @${fromUsername || "none"})`,
				"",
				"Once linked, I can help you with tasks, time tracking, and more!",
			].filter(Boolean).join("\n"));
		} else {
			await sendTelegramMessage(token, chatId, `❌ Sorry, something went wrong: ${result.error}`);
		}
	}
}

/**
 * Download a file from Telegram (photo, document) and save to workspace.
 * Returns the saved file path relative to workspace.
 */
async function downloadTelegramFile(
	token: string,
	fileId: string,
	subDir: string,
	userId: string,
	fileName?: string,
    tenantId: string,
): Promise<string> {
	try {
		const fileRes = await fetch(`${TELEGRAM_API}/bot${token}/getFile?file_id=${fileId}`);
		const fileData = await fileRes.json() as { ok: boolean; result?: { file_path: string } };
		if (!fileData.ok || !fileData.result?.file_path) return "";

		const filePath = fileData.result.file_path;
		const ext = filePath.includes(".") ? filePath.split(".").pop() : "";
		const name = fileName || `${fileId.slice(0, 12)}.${ext || "bin"}`;

		const dlRes = await fetch(`${TELEGRAM_API}/file/bot${token}/${filePath}`);
		if (!dlRes.ok) return "";
		const buffer = await dlRes.arrayBuffer();

		const saveDir = join(getWorkspaceRoot(tenantId), ".telegram", subDir, userId);
		await mkdir(saveDir, { recursive: true });
		const savePath = join(saveDir, name);
		await writeFile(savePath, Buffer.from(buffer));

		return `.telegram/${subDir}/${userId}/${name}`;
	} catch {
		return "";
	}
}

export async function sendTelegramMessage(token: string, chatId: number, text: string): Promise<void> {
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
