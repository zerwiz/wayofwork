import { json } from "../utils";
import { db, applyActiveProvider } from "../db";
import type { LlmConfig, LlmProvider } from "../db";
import type { Router } from "../router";

function adminGuard(auth: { role?: string } | null): boolean {
	return !!auth && (auth.role === "SUPER_ADMIN" || auth.role === "ADMIN");
}

function channelBotResponse(bot: Record<string, unknown>): Record<string, unknown> {
	return {
		id: bot.id,
		tenantId: bot.tenant_id,
		phoneNumber: bot.phone_number,
		label: bot.label,
		active: bot.active === 1,
		createdAt: bot.created_at,
	};
}

export function registerAdminRoutes(router: Router) {
	router.get("/api/admin/tenants", async (_req, _params, auth) => {
		if (!auth || auth.role !== "SUPER_ADMIN") return json({ error: "Forbidden" }, 403);
		try {
			const tenants = db.query(`
				SELECT t.*, COUNT(u.id) as user_count
				FROM tenants t
				LEFT JOIN users u ON t.id = u.tenant_id
				GROUP BY t.id
				ORDER BY t.created_at DESC
			`).all() as any[];
			return json(tenants || []);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch tenants", details: message }, 500);
		}
	});

	router.post("/api/admin/tenants", async (req, _params, auth) => {
		if (!auth || auth.role !== "SUPER_ADMIN") return json({ error: "Forbidden" }, 403);
		let body: { name?: string; slug?: string; subscription_tier?: string };
		try {
			body = (await req.json()) as { name?: string; slug?: string; subscription_tier?: string };
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		if (!body.name || !body.slug) {
			return json({ error: "Name and slug required" }, 400);
		}
		try {
			const id = `tenant_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
			db.query(`
				INSERT INTO tenants (id, name, slug, subscription_tier)
				VALUES (?, ?, ?, ?)
			`).run(id, body.name, body.slug, body.subscription_tier || 'basic');
			return json({ ok: true, id });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to create tenant", details: message }, 500);
		}
	});

	// ── Admin: Stats ──

	router.get("/api/admin/stats", async (_req, _params, auth) => {
		if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
		try {
			const stats: Record<string, unknown> = {
				users: (db.query("SELECT COUNT(*) as count FROM users WHERE tenant_id = ?").get(auth!.tenantId) as any).count,
				clients: (db.query("SELECT COUNT(*) as count FROM users WHERE tenant_id = ? AND role = 'CLIENT'").get(auth!.tenantId) as any).count,
				projects: (db.query("SELECT COUNT(*) as count FROM projects WHERE tenant_id = ?").get(auth!.tenantId) as any).count,
				tasks: (db.query("SELECT COUNT(*) as count FROM tasks WHERE tenant_id = ?").get(auth!.tenantId) as any).count,
				timeEntries: (db.query("SELECT COUNT(*) as count FROM time_entries WHERE tenant_id = ?").get(auth!.tenantId) as any).count,
				whatsappBots: (db.query("SELECT COUNT(*) as count FROM bot_whatsapp_accounts WHERE tenant_id = ?").get(auth!.tenantId) as any).count,
				telegramBots: (db.query("SELECT COUNT(*) as count FROM bot_telegram_accounts WHERE tenant_id = ?").get(auth!.tenantId) as any).count,
				channelLinks: (db.query("SELECT COUNT(*) as count FROM user_channel_links WHERE tenant_id = ?").get(auth!.tenantId) as any).count,
				priceLists: (db.query("SELECT COUNT(*) as count FROM price_lists WHERE tenant_id = ? AND active = 1").get(auth!.tenantId) as any).count,
				pendingChanges: (db.query("SELECT COUNT(*) as count FROM pending_changes WHERE tenant_id = ? AND status = 'pending'").get(auth!.tenantId) as any).count,
			};
			return json(stats);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch stats", details: message }, 500);
		}
	});

	router.get("/api/admin/audit-logs", async (_req, _params, auth) => {
		if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);

		try {
			const logs = db.query(`
				SELECT al.*, u.username, u.full_name
				FROM audit_logs al
				JOIN users u ON al.user_id = u.id
				WHERE al.tenant_id = ?
				ORDER BY al.created_at DESC
				LIMIT 500
			`).all(auth!.tenantId) as any[];
			return json(logs);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch audit logs", details: message }, 500);
		}
	});

	router.get("/api/admin/channels/whatsapp-bots", async (_req, _params, auth) => {
		if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
		try {
			const bots = db.query(`
				SELECT * FROM bot_whatsapp_accounts WHERE tenant_id = ? ORDER BY created_at DESC
			`).all(auth!.tenantId) as any[];
			return json(bots.map(channelBotResponse));
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch WhatsApp bots", details: message }, 500);
		}
	});

	router.post("/api/admin/channels/whatsapp-bots", async (req, _params, auth) => {
		if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
		let body: { phoneNumber?: string; label?: string; apiKey?: string };
		try {
			body = (await req.json()) as any;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		if (!body.phoneNumber) return json({ error: "phoneNumber required" }, 400);
		const id = `wa_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
		try {
			db.query(`
				INSERT INTO bot_whatsapp_accounts (id, tenant_id, phone_number, label, api_key_encrypted)
				VALUES (?, ?, ?, ?, ?)
			`).run(id, auth!.tenantId, body.phoneNumber, body.label || null, body.apiKey || null);
			const bot = db.query("SELECT * FROM bot_whatsapp_accounts WHERE id = ?").get(id) as any;
			return json(channelBotResponse(bot));
		} catch (e) {
			return json({ error: "Failed to create WhatsApp bot" }, 500);
		}
	});

	router.put("/api/admin/channels/whatsapp-bots/:id", async (req, params, auth) => {
		if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
		let body: { phoneNumber?: string; label?: string; apiKey?: string; active?: boolean };
		try {
			body = (await req.json()) as any;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		try {
			const existing = db.query("SELECT * FROM bot_whatsapp_accounts WHERE id = ? AND tenant_id = ?").get(params.id, auth!.tenantId) as any;
			if (!existing) return json({ error: "Bot not found" }, 404);
			const phoneNumber = body.phoneNumber ?? existing.phone_number;
			const label = body.label !== undefined ? body.label : existing.label;
			const apiKey = body.apiKey !== undefined ? body.apiKey : existing.api_key_encrypted;
			const active = body.active !== undefined ? (body.active ? 1 : 0) : existing.active;
			db.query(`
				UPDATE bot_whatsapp_accounts SET phone_number = ?, label = ?, api_key_encrypted = ?, active = ?
				WHERE id = ? AND tenant_id = ?
			`).run(phoneNumber, label, apiKey, active, params.id, auth!.tenantId);
			const bot = db.query("SELECT * FROM bot_whatsapp_accounts WHERE id = ?").get(params.id) as any;
			return json(channelBotResponse(bot));
		} catch (e) {
			return json({ error: "Failed to update WhatsApp bot" }, 500);
		}
	});

	router.delete("/api/admin/channels/whatsapp-bots/:id", async (_req, params, auth) => {
		if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
		try {
			const existing = db.query("SELECT * FROM bot_whatsapp_accounts WHERE id = ? AND tenant_id = ?").get(params.id, auth!.tenantId);
			if (!existing) return json({ error: "Bot not found" }, 404);
			db.query("DELETE FROM bot_whatsapp_accounts WHERE id = ? AND tenant_id = ?").run(params.id, auth!.tenantId);
			return json({ ok: true });
		} catch (e) {
			return json({ error: "Failed to delete WhatsApp bot" }, 500);
		}
	});

	router.get("/api/admin/channels/telegram-bots", async (_req, _params, auth) => {
		if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
		try {
			const bots = db.query(`
				SELECT id, tenant_id, bot_username, label, active, created_at FROM bot_telegram_accounts WHERE tenant_id = ? ORDER BY created_at DESC
			`).all(auth!.tenantId) as any[];
			return json(bots.map((b: any) => ({ id: b.id, tenantId: b.tenant_id, botUsername: b.bot_username, label: b.label, active: b.active === 1, createdAt: b.created_at })));
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch Telegram bots", details: message }, 500);
		}
	});

	router.post("/api/admin/channels/telegram-bots", async (req, _params, auth) => {
		if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
		let body: { botToken?: string; botUsername?: string; label?: string };
		try {
			body = (await req.json()) as any;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		if (!body.botToken) return json({ error: "botToken required" }, 400);
		const id = `tg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
		try {
			db.query(`
				INSERT INTO bot_telegram_accounts (id, tenant_id, bot_token_encrypted, bot_username, label)
				VALUES (?, ?, ?, ?, ?)
			`).run(id, auth!.tenantId, body.botToken, body.botUsername || null, body.label || null);
			const bot = db.query("SELECT id, tenant_id, bot_username, label, active, created_at FROM bot_telegram_accounts WHERE id = ?").get(id) as any;
			return json({ id: bot.id, tenantId: bot.tenant_id, botUsername: bot.bot_username, label: bot.label, active: bot.active === 1, createdAt: bot.created_at });
		} catch (e) {
			return json({ error: "Failed to create Telegram bot" }, 500);
		}
	});

	router.delete("/api/admin/channels/telegram-bots/:id", async (_req, params, auth) => {
		if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
		try {
			const existing = db.query("SELECT * FROM bot_telegram_accounts WHERE id = ? AND tenant_id = ?").get(params.id, auth!.tenantId);
			if (!existing) return json({ error: "Bot not found" }, 404);
			db.query("DELETE FROM bot_telegram_accounts WHERE id = ? AND tenant_id = ?").run(params.id, auth!.tenantId);
			return json({ ok: true });
		} catch (e) {
			return json({ error: "Failed to delete Telegram bot" }, 500);
		}
	});

	router.get("/api/admin/channels/links", async (_req, _params, auth) => {
		if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
		try {
			const links = db.query(`
				SELECT l.*, u.username as user_name
				FROM user_channel_links l
				LEFT JOIN users u ON l.user_id = u.id
				WHERE l.tenant_id = ?
				ORDER BY l.created_at DESC
			`).all(auth!.tenantId) as any[];
			return json(links.map((l: any) => ({
				id: l.id,
				tenantId: l.tenant_id,
				userId: l.user_id,
				userName: l.user_name,
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

	router.delete("/api/admin/channels/links/:id", async (_req, params, auth) => {
		if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
		try {
			const existing = db.query("SELECT * FROM user_channel_links WHERE id = ? AND tenant_id = ?").get(params.id, auth!.tenantId);
			if (!existing) return json({ error: "Link not found" }, 404);
			db.query("DELETE FROM user_channel_links WHERE id = ? AND tenant_id = ?").run(params.id, auth!.tenantId);
			return json({ ok: true });
		} catch (e) {
			return json({ error: "Failed to delete channel link" }, 500);
		}
	});

	router.get("/api/admin/channels/logs", async (_req, _params, auth) => {
		if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
		const limit = Math.min(Math.max(Number(_req.url.searchParams?.get("limit") ?? 50), 1), 500);
		try {
			const logs = db.query(`
				SELECT l.*, u.username as user_name
				FROM channel_message_logs l
				LEFT JOIN users u ON l.user_id = u.id
				WHERE l.tenant_id = ?
				ORDER BY l.created_at DESC
				LIMIT ?
			`).all(auth!.tenantId, limit) as any[];
			return json(logs.map((l: any) => ({
				id: l.id,
				tenantId: l.tenant_id,
				userId: l.user_id,
				userName: l.user_name,
				channel: l.channel,
				channelUserId: l.channel_user_id,
				botId: l.bot_id,
				direction: l.direction,
				messageText: l.message_text?.slice(0, 500),
				messageType: l.message_type,
				handledBy: l.handled_by,
				createdAt: l.created_at,
			})));
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch channel logs", details: message }, 500);
		}
	});

	router.get("/api/admin/users", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const isSuper = auth.role === "SUPER_ADMIN";
		const isAdmin = auth.role === "ADMIN";
		if (!isSuper && !isAdmin) return json({ error: "Forbidden" }, 403);
		
		try {
			let users;
			if (isSuper) {
				users = db.query(`
					SELECT u.id, u.username, u.role, u.tenant_id, u.full_name, u.job_title, u.email, u.phone, t.name as tenant_name
					FROM users u
					LEFT JOIN tenants t ON u.tenant_id = t.id
					ORDER BY u.created_at DESC
				`).all() as any[];
			} else {
				users = db.query(`
					SELECT id, username, role, tenant_id, full_name, job_title, email, phone
					FROM users
					WHERE tenant_id = ?
					ORDER BY created_at DESC
				`).all(auth.tenantId) as any[];
			}
			return json(users || []);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch users", details: message }, 500);
		}
	});

	router.post("/api/admin/users", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const isSuper = auth.role === "SUPER_ADMIN";
		const isAdmin = auth.role === "ADMIN";
		if (!isSuper && !isAdmin) return json({ error: "Forbidden" }, 403);

		let body: any;
		try {
			body = await req.json();
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}

		if (!body.username || !body.password || !body.role) {
			return json({ error: "Username, password and role required" }, 400);
		}

		const targetTenantId = isSuper ? (body.tenantId || auth.tenantId) : auth.tenantId;

		try {
			const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
			const hash = await Bun.password.hash(body.password);
			db.query(`
				INSERT INTO users (id, tenant_id, username, password_hash, role, full_name, job_title, email, phone, pin)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`).run(id, targetTenantId, body.username, hash, body.role, body.full_name || null, body.job_title || null, body.email || null, body.phone || null, body.pin || null);
			
			const user = db.query("SELECT id, username, role, tenant_id, full_name FROM users WHERE id = ?").get(id);
			return json(user);
		} catch (e) {
			return json({ error: "Failed to create user (username might already exist)" }, 400);
		}
	});

	// ── LLM Provider Config ──

	function getLlmConfig(): LlmConfig {
		const row = db.query("SELECT value FROM server_config WHERE key = 'llm_providers'").get() as { value?: string } | undefined;
		if (row?.value) {
			const raw = JSON.parse(row.value);
			// migrate old format
			if (raw.activeProvider === undefined && raw.providers === undefined) {
				const providers: LlmProvider[] = [];
				if (raw.ollamaModel || raw.ollamaHost) {
					providers.push({ name: "ollama", label: "Ollama (local)", model: raw.ollamaModel || "qwen3.5:9b", host: raw.ollamaHost || "http://127.0.0.1:11434", apiKey: "" });
				}
				if (raw.openrouterModel || raw.openrouterApiKey) {
					providers.push({ name: "openrouter", label: "OpenRouter", model: raw.openrouterModel || "anthropic/claude-3.5-sonnet", host: "https://openrouter.ai/api/v1", apiKey: raw.openrouterApiKey ? "••••••" : "" });
				}
				if (providers.length === 0) {
					providers.push({ name: "ollama", label: "Ollama (local)", model: "qwen3.5:9b", host: "http://127.0.0.1:11434", apiKey: "" });
				}
				const migrated: LlmConfig = { activeProvider: raw.provider || "ollama", providers };
				db.query("UPDATE server_config SET value = ? WHERE key = 'llm_providers'").run(JSON.stringify(migrated));
				return migrated;
			}
			return raw as LlmConfig;
		}
		return {
			activeProvider: "ollama",
			providers: [
				{ name: "ollama", label: "Ollama (local)", model: "qwen3.5:9b", host: "http://127.0.0.1:11434", apiKey: "" },
				{ name: "openrouter", label: "OpenRouter", model: "anthropic/claude-3.5-sonnet", host: "https://openrouter.ai/api/v1", apiKey: "" },
			],
		};
	}

	router.get("/api/admin/llm-providers", async (_req, _params, auth) => {
		if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
		return json(getLlmConfig());
	});

	router.put("/api/admin/llm-providers", async (req, _params, auth) => {
		if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
		let body: LlmConfig;
		try {
			body = await req.json() as any;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}

		if (!body.activeProvider || !Array.isArray(body.providers) || body.providers.length === 0) {
			return json({ error: "activeProvider and providers[] required" }, 400);
		}

		// Mask API keys — keep existing ones if masked sent back
		const existing = db.query("SELECT value FROM server_config WHERE key = 'llm_providers'").get() as { value?: string } | undefined;
		const existingCfg: LlmConfig | null = existing?.value ? JSON.parse(existing.value) : null;

		for (const p of body.providers) {
			if (p.apiKey === "••••••" && existingCfg) {
				const existing = existingCfg.providers.find((ep: LlmProvider) => ep.name === p.name);
				if (existing?.apiKey) p.apiKey = existing.apiKey;
			}
		}

		// Persist
		db.query(`
			INSERT INTO server_config (key, value, updated_at) VALUES ('llm_providers', ?, datetime('now'))
			ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
		`).run(JSON.stringify(body));

		// Apply active provider to runtime
		applyActiveProvider(body);

		return json({ ok: true });
	});
}
