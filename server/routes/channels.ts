import { json } from "../utils";
import { db } from "../db";
import type { Router } from "../router";
import { processTelegramUpdate, sendTelegramMessage } from "../telegram-bot";
import { routeInboundMessage } from "../channel-router";
import { handleTimeBotMessage } from "../whatsapp-time-bot";
import { sendEmail } from "../email";

export function registerChannelRoutes(router: Router) {
	router.get("/api/channels/links", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			const links = db.query(`
				SELECT l.*, u.username as user_name
				FROM user_channel_links l
				LEFT JOIN users u ON l.user_id = u.id
				WHERE l.tenant_id = ? AND l.user_id = ?
				ORDER BY l.created_at DESC
			`).all(auth.tenantId, auth.userId) as any[];
			return json(links.map((l: any) => ({
				id: l.id,
				channel: l.channel,
				channelUserId: l.channel_user_id,
				channelUsername: l.channel_username,
				channelBotId: l.channel_bot_id,
				active: l.active === 1,
				lastActivityAt: l.last_activity_at,
				createdAt: l.created_at,
			})));
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch channel links", details: message }, 500);
		}
	});

	router.post("/api/channels/link", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: { channel?: string; channelUserId?: string; channelUsername?: string; channelBotId?: string };
		try {
			body = (await req.json()) as any;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		if (!body.channel || !body.channelUserId) {
			return json({ error: "channel and channelUserId required" }, 400);
		}
		const id = `cl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
		const existing = db.query(
			"SELECT id FROM user_channel_links WHERE user_id = ? AND tenant_id = ? AND channel = ?"
		).get(auth.userId, auth.tenantId, body.channel) as { id: string } | undefined;
		if (existing) {
			db.query(`
				UPDATE user_channel_links SET channel_user_id = ?, channel_username = ?, channel_bot_id = ?, active = 1 WHERE id = ?
			`).run(body.channelUserId, body.channelUsername || null, body.channelBotId || null, existing.id);
			return json({ ok: true, id: existing.id, updated: true });
		}
		try {
			db.query(`
				INSERT INTO user_channel_links (id, tenant_id, user_id, channel, channel_user_id, channel_username, channel_bot_id)
				VALUES (?, ?, ?, ?, ?, ?, ?)
			`).run(id, auth.tenantId, auth.userId, body.channel, body.channelUserId, body.channelUsername || null, body.channelBotId || null);
			return json({ ok: true, id });
		} catch (e) {
			return json({ error: "Failed to create link (may already exist)" }, 409);
		}
	});

	router.delete("/api/channels/unlink", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const url = new URL(_req.url);
		const linkId = url.searchParams.get("id") || "";
		if (!linkId) return json({ error: "id parameter required" }, 400);
		try {
			const existing = db.query("SELECT * FROM user_channel_links WHERE id = ? AND user_id = ? AND tenant_id = ?").get(linkId, auth.userId, auth.tenantId);
			if (!existing) return json({ error: "Link not found" }, 404);
			db.query("DELETE FROM user_channel_links WHERE id = ? AND user_id = ? AND tenant_id = ?").run(linkId, auth.userId, auth.tenantId);
			return json({ ok: true });
		} catch (e) {
			return json({ error: "Failed to delete link" }, 500);
		}
	});

	router.post("/api/channels/log", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: { channel?: string; channelUserId?: string; direction?: string; messageText?: string; messageType?: string; handledBy?: string; botId?: string };
		try {
			body = (await req.json()) as any;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		try {
			const id = `cml_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
			db.query(`
				INSERT INTO channel_message_logs (id, tenant_id, user_id, channel, channel_user_id, direction, message_text, message_type, handled_by, bot_id)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`).run(id, auth.tenantId, auth.userId, body.channel || "unknown", body.channelUserId || null, body.direction || "inbound", body.messageText || null, body.messageType || "text", body.handledBy || null, body.botId || null);
			return json({ ok: true, id });
		} catch (e) {
			return json({ error: "Failed to log message" }, 500);
		}
	});

	// ---- Telegram Webhook ----

	router.post("/api/channels/telegram/webhook/:botId", async (req, params) => {
		const botId = params.botId;
		if (!botId) return json({ error: "Missing botId" }, 400);

		const bot = db.query(
			"SELECT id, tenant_id, bot_token_encrypted as token FROM bot_telegram_accounts WHERE id = ? AND active = 1"
		).get(botId) as { id: string; tenant_id: string; token: string } | undefined;

		if (!bot) return json({ error: "Bot not found or inactive" }, 404);

		let update: any;
		try {
			update = await req.json();
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}

		// Fire and forget — don't block the Telegram webhook
		void processTelegramUpdate(update, bot.token, bot.tenant_id, bot.id);

		return json({ ok: true });
	});

	// ---- WhatsApp Webhook ----

	router.get("/api/channels/whatsapp/webhook", async (req) => {
		const url = new URL(req.url);
		const mode = url.searchParams.get("hub.mode");
		const verifyToken = url.searchParams.get("hub.verify_token");
		const challenge = url.searchParams.get("hub.challenge");

		if (mode !== "subscribe" || !verifyToken || !challenge) {
			return new Response("Bad request", { status: 400 });
		}

		// Look up the verify token in bot_whatsapp_accounts
		const bot = db.query(
			"SELECT id FROM bot_whatsapp_accounts WHERE api_key_encrypted = ? AND active = 1 LIMIT 1"
		).get(verifyToken) as { id: string } | undefined;

		if (!bot) {
			return new Response("Forbidden", { status: 403 });
		}

		return new Response(challenge, {
			status: 200,
			headers: { "Content-Type": "text/plain" },
		});
	});

	router.post("/api/channels/whatsapp/webhook", async (req) => {
		let body: any;
		try {
			body = await req.json();
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}

		// Parse WhatsApp Cloud API payload
		const entries = body?.entry;
		if (!Array.isArray(entries)) return json({ ok: true });

		for (const entry of entries) {
			const changes = entry.changes;
			if (!Array.isArray(changes)) continue;

			for (const change of changes) {
				const value = change.value;
				if (!value?.messages || !value.metadata) continue;

				const phoneNumberId = value.metadata.phone_number_id;
				const messages = value.messages;

				// Find the bot account by phone number ID
				const bot = db.query(
					"SELECT id, tenant_id, label FROM bot_whatsapp_accounts WHERE phone_number = ? AND active = 1 LIMIT 1"
				).get(phoneNumberId) as { id: string; tenant_id: string; label: string | null } | undefined;

				if (!bot) continue;

				for (const msg of messages) {
					const from = msg.from;
					if (!from) continue;

					let text = "";
					let msgType = msg.type || "text";

					if (msgType === "text" && msg.text?.body) {
						text = msg.text.body;
					} else if (msgType === "interactive" && msg.interactive?.button_reply?.title) {
						text = msg.interactive.button_reply.title;
					} else if (msgType === "interactive" && msg.interactive?.list_reply?.title) {
						text = msg.interactive.list_reply.title;
					}

					if (!text) continue;

					// Check if this is a time-bot labeled number
					if (bot.label === "time_bot") {
						const link = db.query(`
							SELECT l.tenant_id, l.user_id, u.full_name, u.role
							FROM user_channel_links l
							JOIN users u ON l.user_id = u.id AND l.tenant_id = u.tenant_id
							WHERE l.channel = 'whatsapp' AND l.channel_user_id = ? AND l.active = 1
							LIMIT 1
						`).get(from) as { tenant_id: string; user_id: string; full_name: string | null; role: string } | undefined;

						if (link) {
							const response = handleTimeBotMessage(
								link.tenant_id,
								link.user_id,
								link.role,
								text,
								link.full_name || `User ${link.user_id}`
							);
							// Send response back via WhatsApp outbound
							const phoneNumberId = value.metadata.phone_number_id;
							const accessToken = process.env.WOP_WHATSAPP_ACCESS_TOKEN;
							if (accessToken) {
								await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
									method: "POST",
									headers: {
										"Authorization": `Bearer ${accessToken}`,
										"Content-Type": "application/json",
									},
									body: JSON.stringify({
										messaging_product: "whatsapp",
										to: from,
										type: "text",
										text: { body: response },
									}),
								});
							}
						}
					} else {
						// Route through unified channel router
						const result = await routeInboundMessage({
							channel: "whatsapp",
							channelUserId: from,
							text,
							metadata: { botTenantId: bot.tenant_id, phoneNumberId },
						});

						if (result.ok && result.response) {
							const accessToken = process.env.WOP_WHATSAPP_ACCESS_TOKEN;
							if (accessToken) {
								await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
									method: "POST",
									headers: {
										"Authorization": `Bearer ${accessToken}`,
										"Content-Type": "application/json",
									},
									body: JSON.stringify({
										messaging_product: "whatsapp",
										to: from,
										type: "text",
										text: { body: result.response },
									}),
								});
							}
						}
					}
				}
			}
		}

		return json({ ok: true });
	});

	// ---- Email Inbound Webhook ----

	router.post("/api/channels/email/inbound", async (req) => {
		let body: any;
		try {
			body = await req.json();
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}

		const from = body.from || body.sender || "";
		const subject = body.subject || "";
		const text = body.text || body.plain || body.strippedText || "";
		const html = body.html || "";

		if (!from || !text) return json({ error: "from and text required" }, 400);

		const fullText = subject ? `[${subject}]\n\n${text}` : text;

		// Route through unified channel router
		const result = await routeInboundMessage({
			channel: "email",
			channelUserId: from,
			text: fullText,
			metadata: { subject, html },
		});

		if (result.ok && result.response) {
			await sendEmail({
				to: from,
				subject: `Re: ${subject}`,
				text: result.response,
			}).catch(() => {});
		}

		return json({ ok: true });
	});
}
