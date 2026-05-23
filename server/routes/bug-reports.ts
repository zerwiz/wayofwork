import { json } from "../utils";
import { db } from "../db";
import type { Router } from "../router";
import { type AuthInfo } from "./auth";

function adminGuard(auth: AuthInfo | null): boolean {
	return !!auth && (auth.role === "SUPER_ADMIN" || auth.role === "ADMIN");
}

export function registerBugReportRoutes(router: Router) {
	// GET /api/admin/bug-reports — list all (SUPER ADMIN only)
	router.get("/api/admin/bug-reports", async (_req, _params, auth) => {
		if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
		try {
			const reports = db.query(`
				SELECT br.*, COALESCE(u.full_name, u.username, br.username) as submitter_name
				FROM bug_reports br
				LEFT JOIN users u ON br.user_id = u.id
				ORDER BY br.created_at DESC
			`).all() as any[];
			return json(reports);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch reports", details: message }, 500);
		}
	});

	// GET /api/admin/bug-reports/:id — single report detail
	router.get("/api/admin/bug-reports/:id", async (_req, params, auth) => {
		if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
		const row = db.query(`
			SELECT br.*, COALESCE(u.full_name, u.username, br.username) as submitter_name
			FROM bug_reports br
			LEFT JOIN users u ON br.user_id = u.id
			WHERE br.id = ?
		`).get(params.id) as any;
		if (!row) return json({ error: "Not found" }, 404);
		// Parse JSON fields for display
		try { row.steps_to_reproduce = JSON.parse(row.steps_to_reproduce || "[]"); } catch { row.steps_to_reproduce = []; }
		try { row.environment = JSON.parse(row.environment || "{}"); } catch { row.environment = {}; }
		try { row.screenshots = JSON.parse(row.screenshots || "[]"); } catch { row.screenshots = []; }
		try { row.comments = JSON.parse(row.comments || "[]"); } catch { row.comments = []; }
		try { row.labels = JSON.parse(row.labels || "[]"); } catch { row.labels = []; }
		return json(row);
	});

	// PATCH /api/admin/bug-reports/:id — update status, assign, mark duplicate
	router.put("/api/admin/bug-reports/:id", async (req, params, auth) => {
		if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
		let body: any;
		try {
			body = await req.json();
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		const existing = db.query("SELECT * FROM bug_reports WHERE id = ?").get(params.id) as any;
		if (!existing) return json({ error: "Not found" }, 404);

		const now = new Date().toISOString().replace("T", " ").slice(0, 19);
		const updates: string[] = ["updated_at = ?"];
		const values: any[] = [now];

		if (body.status && body.status !== existing.status) {
			updates.push("status = ?", "status_changed_at = ?");
			values.push(body.status, now);
		}
		if (body.assigned_to !== undefined) {
			updates.push("assigned_to = ?");
			values.push(body.assigned_to);
		}
		if (body.status_reason !== undefined) {
			updates.push("status_reason = ?");
			values.push(body.status_reason);
		}
		if (body.is_duplicate_of !== undefined) {
			updates.push("is_duplicate_of = ?");
			values.push(body.is_duplicate_of || null);
		}
		if (body.severity !== undefined) {
			updates.push("severity = ?");
			values.push(body.severity);
		}
		if (body.fixed_in_version !== undefined) {
			updates.push("fixed_in_version = ?");
			values.push(body.fixed_in_version);
		}
		if (body.labels !== undefined) {
			updates.push("labels = ?");
			values.push(JSON.stringify(body.labels));
		}

		if (updates.length === 1) return json({ error: "No fields to update" }, 400);

		values.push(params.id);
		db.query(`UPDATE bug_reports SET ${updates.join(", ")} WHERE id = ?`).run(...values);

		const updated = db.query("SELECT * FROM bug_reports WHERE id = ?").get(params.id) as any;
		return json(updated);
	});

	// POST /api/bug-reports — user submission
	router.post("/api/bug-reports", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: any;
		try {
			body = await req.json();
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}

		if (!body.title || !body.category || !body.description) {
			return json({ error: "Missing required fields" }, 400);
		}

		// Resolve username from user table
		const userRow = db.query("SELECT username, full_name FROM users WHERE id = ?").get(auth.userId) as { username: string; full_name: string | null } | undefined;
		const username = userRow?.full_name || userRow?.username || auth.userId;

		try {
			const id = `bug_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
			db.run(`
				INSERT INTO bug_reports (id, tenant_id, user_id, username, title, category, severity, description, expected_behavior, actual_behavior, steps_to_reproduce, environment, screenshots, reproduction_rate, is_security_issue)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`, [
				id,
				auth.tenantId,
				auth.userId,
				username,
				body.title,
				body.category,
				body.severity || "medium",
				body.description,
				body.expected_behavior || null,
				body.actual_behavior || null,
				body.steps_to_reproduce ? JSON.stringify(body.steps_to_reproduce) : null,
				body.environment ? JSON.stringify(body.environment) : null,
				body.screenshots ? JSON.stringify(body.screenshots) : null,
				body.reproduction_rate || "often",
				body.category === "security" ? 1 : 0,
			]);
			return json({ ok: true, id }, 201);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to submit report", details: message }, 500);
		}
	});

	// GET /api/bug-reports — user's own reports
	router.get("/api/bug-reports", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const reports = db.query("SELECT * FROM bug_reports WHERE user_id = ? AND tenant_id = ? ORDER BY created_at DESC").all(auth.userId, auth.tenantId) as any[];
		return json(reports);
	});
}
