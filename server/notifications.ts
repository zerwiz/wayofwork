import { db } from "./db";
import { toolTelegramSend, toolWhatsappSend } from "./orchestrator-channel-tools";

export type NotificationType = "approval" | "deadline" | "mention" | "alert" | "announcement" | "security" | "weather" | "system" | "kanban";
export type NotificationSeverity = "info" | "success" | "warning" | "error";

export interface NotifyOptions {
	tenantId: string;
	userId: string;
	type: NotificationType;
	severity: NotificationSeverity;
	title: string;
	message: string;
	link?: string;
	sendSms?: boolean;
	sendTelegram?: boolean;
	sendWhatsapp?: boolean;
}

/**
 * Send a notification to a user.
 * 1. Persists to database (for in-app UI)
 * 2. Optionally sends to external channels (Telegram, WhatsApp) if linked
 */
export async function notifyUser(opts: NotifyOptions) {
	try {
		// 1. Persist to DB
		const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
		db.run(`
			INSERT INTO notifications (id, tenant_id, user_id, type, severity, title, message, link, read, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))
		`, [id, opts.tenantId, opts.userId, opts.type, opts.severity, opts.title, opts.message, opts.link || null]);

		// 2. External Channels
		const links = db.query("SELECT * FROM user_channel_links WHERE user_id = ? AND tenant_id = ? AND active = 1").all(opts.userId, opts.tenantId) as any[];

		for (const link of links) {
			const text = `🔔 *${opts.title}*\n${opts.message}${opts.link ? `\n\n🔗 [Open in Way of Work](${process.env.WOP_PUBLIC_URL || 'http://localhost:3333'}${opts.link})` : ''}`;

			if (link.channel === "telegram" && opts.sendTelegram !== false) {
				await toolTelegramSend({ userId: opts.userId, text }, opts.tenantId);
			}
			if (link.channel === "whatsapp" && opts.sendWhatsapp !== false) {
				await toolWhatsappSend({ userId: opts.userId, text }, opts.tenantId);
			}
		}

		return { ok: true, id };
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		console.error("[notifyUser] Error:", m);
		return { ok: false, error: m };
	}
}
