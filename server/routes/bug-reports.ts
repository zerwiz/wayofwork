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
			const reports = db.query("SELECT * FROM bug_reports ORDER BY created_at DESC").all() as any[];
			return json(reports);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch reports", details: message }, 500);
		}
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

		try {
			const id = `bug_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
			db.run(`
				INSERT INTO bug_reports (id, tenant_id, user_id, username, title, category, severity, description, expected_behavior, actual_behavior, steps_to_reproduce, environment)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`, [
				id,
				auth.tenantId,
				auth.userId,
				"user", // Should be fetched from users table
				body.title,
				body.category,
				body.severity || "medium",
				body.description,
				body.expected_behavior || null,
				body.actual_behavior || null,
				JSON.stringify(body.steps_to_reproduce || []),
				JSON.stringify(body.environment || {})
			]);
			return json({ ok: true, id }, 201);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to submit report", details: message }, 500);
		}
	});
}
