import { json } from "../utils";
import { db, applyActiveProvider } from "../db";
import type { LlmConfig, LlmProvider } from "../db";
import type { Router } from "../router";

function adminGuard(auth: { role?: string } | null): boolean {
	return !!auth && (auth.role === "SUPER_ADMIN" || auth.role === "ADMIN");
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

	router.get("/api/admin/stats", async (_req, _params, auth) => {
		if (!auth || auth.role !== "SUPER_ADMIN") return json({ error: "Forbidden" }, 403);
		try {
			const stats = {
				tenants: (db.query("SELECT COUNT(*) as count FROM tenants").get() as any).count,
				users: (db.query("SELECT COUNT(*) as count FROM users").get() as any).count,
				clients: (db.query("SELECT COUNT(*) as count FROM users WHERE role = 'CLIENT'").get() as any).count,
				projects: (db.query("SELECT COUNT(*) as count FROM projects").get() as any).count,
				tasks: (db.query("SELECT COUNT(*) as count FROM tasks").get() as any).count,
				timeEntries: (db.query("SELECT COUNT(*) as count FROM time_entries").get() as any).count,
				system: {
					memoryUsage: process.memoryUsage(),
					uptime: process.uptime(),
					platform: process.platform,
					nodeVersion: process.version,
					bunVersion: process.versions?.bun,
				}
			};
			return json(stats);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch stats", details: message }, 500);
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
				SELECT id, tenant_id, phone_number as phoneNumber, label, active, created_at
				FROM bot_whatsapp_accounts
				WHERE tenant_id = ?
			`).all(auth!.tenantId) as any[];
			return json(bots);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch WhatsApp bots", details: message }, 500);
		}
	});

	router.post("/api/admin/channels/whatsapp-bots", async (req, _params, auth) => {
		if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
		let body: any;
		try {
			body = await req.json();
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		try {
			const id = `wab_${Date.now()}`;
			db.query(`
				INSERT INTO bot_whatsapp_accounts (id, tenant_id, phone_number, label, api_key_encrypted, active)
				VALUES (?, ?, ?, ?, ?, 1)
			`).run(id, auth!.tenantId, body.phoneNumber, body.label, body.apiKey);
			return json({ ok: true, id });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to create WhatsApp bot", details: message }, 500);
		}
	});

	router.delete("/api/admin/channels/whatsapp-bots/:id", async (_req, params, auth) => {
		if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
		try {
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
				SELECT id, tenant_id, bot_username as botUsername, label, active, created_at
				FROM bot_telegram_accounts
				WHERE tenant_id = ?
			`).all(auth!.tenantId) as any[];
			return json(bots);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch Telegram bots", details: message }, 500);
		}
	});

	router.post("/api/admin/channels/telegram-bots", async (req, _params, auth) => {
		if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
		let body: any;
		try {
			body = await req.json();
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		try {
			const id = `tgb_${Date.now()}`;
			db.query(`
				INSERT INTO bot_telegram_accounts (id, tenant_id, bot_token_encrypted, bot_username, label, active)
				VALUES (?, ?, ?, ?, ?, 1)
			`).run(id, auth!.tenantId, body.botToken, body.botUsername, body.label);
			return json({ ok: true, id });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to create Telegram bot", details: message }, 500);
		}
	});

	router.delete("/api/admin/channels/telegram-bots/:id", async (_req, params, auth) => {
		if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
		try {
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
			return json(links);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch channel links", details: message }, 500);
		}
	});

	router.delete("/api/admin/channels/links/:id", async (_req, params, auth) => {
		if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
		try {
			db.query("DELETE FROM user_channel_links WHERE id = ? AND tenant_id = ?").run(params.id, auth!.tenantId);
			return json({ ok: true });
		} catch (e) {
			return json({ error: "Failed to delete channel link" }, 500);
		}
	});

	router.get("/api/admin/channels/logs", async (req, _params, auth) => {
		if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
		const url = new URL(req.url);
		const limit = Math.min(Math.max(Number(url.searchParams?.get("limit") ?? 50), 1), 500);
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
				channel: l.channel,
				direction: l.direction,
				messageText: l.message_text,
				messageType: l.message_type,
				createdAt: l.created_at,
				userName: l.user_name,
				channelUserId: l.channel_user_id,
			})));
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch channel logs", details: message }, 500);
		}
	});

	router.get("/api/admin/llm/config", async (_req, _params, auth) => {
		if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
		try {
			const row = db.query("SELECT value FROM server_config WHERE key = 'llm_providers'").get() as { value?: string } | undefined;
			if (row?.value) {
				const raw = JSON.parse(row.value);
				// migrate old format if needed
				if (raw.activeProvider === undefined && raw.providers === undefined) {
					const providers: LlmProvider[] = [];
					if (raw.ollamaModel || raw.ollamaHost) {
						providers.push({ name: "wo-ai", label: "Wo AI (local)", model: raw.ollamaModel || "qwen3.5:9b", host: raw.ollamaHost || "http://127.0.0.1:11434", apiKey: "" });
					}
					if (raw.openrouterModel || raw.openrouterApiKey) {
						providers.push({ name: "openrouter", label: "OpenRouter", model: raw.openrouterModel || "anthropic/claude-3.5-sonnet", host: "https://openrouter.ai/api/v1", apiKey: raw.openrouterApiKey || "" });
					}
					if (providers.length === 0) {
						providers.push({ name: "wo-ai", label: "Wo AI (local)", model: "qwen3.5:9b", host: "http://127.0.0.1:11434", apiKey: "" });
					}
					const migrated: LlmConfig = { activeProvider: raw.provider || "wo-ai", providers };
					db.query("UPDATE server_config SET value = ? WHERE key = 'llm_providers'").run(JSON.stringify(migrated));
					return json(migrated);
				}
				return json(raw as LlmConfig);
			}
			return json({
				activeProvider: "wo-ai",
				providers: [
					{ name: "wo-ai", label: "Wo AI (local)", model: "qwen3.5:9b", host: "http://127.0.0.1:11434", apiKey: "" },
					{ name: "openrouter", label: "OpenRouter", model: "anthropic/claude-3.5-sonnet", host: "https://openrouter.ai/api/v1", apiKey: "" },
				],
			});
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch LLM config", details: message }, 500);
		}
	});

	router.post("/api/admin/llm/config", async (req, _params, auth) => {
		if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
		let body: LlmConfig;
		try {
			body = await req.json();
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}

		db.query(`
			INSERT INTO server_config (key, value) VALUES ('llm_providers', ?)
			ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
		`).run(JSON.stringify(body));

		// Apply active provider to runtime
		applyActiveProvider(body);

		return json({ ok: true });
	});

	// GET /api/admin/tenants/:id/config — per-tenant LLM config
	router.get("/api/admin/tenants/:id/config", async (_req, params, auth) => {
		if (!adminGuard(auth) || (auth.role !== "SUPER_ADMIN" && auth.tenantId !== params.id)) {
			return json({ error: "Forbidden" }, 403);
		}
		const rows = db.query("SELECT config_key, config_value FROM tenant_configs WHERE tenant_id = ?").all(params.id) as { config_key: string; config_value: string }[];
		const config: Record<string, string> = {};
		for (const r of rows) config[r.config_key] = r.config_value;
		return json(config);
	});

	// POST /api/admin/tenants/:id/config — set per-tenant config values
	router.post("/api/admin/tenants/:id/config", async (req, params, auth) => {
		if (!adminGuard(auth) || (auth.role !== "SUPER_ADMIN" && auth.tenantId !== params.id)) {
			return json({ error: "Forbidden" }, 403);
		}
		let body: Record<string, string>;
		try {
			body = await req.json();
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		const upsert = db.query(`
			INSERT INTO tenant_configs (tenant_id, config_key, config_value)
			VALUES (?, ?, ?)
			ON CONFLICT(tenant_id, config_key) DO UPDATE SET config_value = excluded.config_value, updated_at = datetime('now')
		`);
		for (const [key, value] of Object.entries(body)) {
			if (typeof value === "string") {
				upsert.run(params.id, key, value);
			}
		}
		return json({ ok: true });
	});
}
