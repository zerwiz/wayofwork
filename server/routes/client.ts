import { json } from "../utils";
import { db } from "../db";
import type { Router } from "../router";

export function registerClientRoutes(router: Router) {
	router.get("/api/client/projects", async (_req, _params, auth) => {
		if (!auth || auth.role !== "CLIENT") return json({ error: "Forbidden" }, 403);
		try {
			const projects = db.query(`
				SELECT * FROM projects
				WHERE tenant_id = ? AND status != 'draft'
				ORDER BY created_at DESC
			`).all(auth.tenantId) as any[];
			return json(projects || []);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch projects", details: message }, 500);
		}
	});

	router.get("/api/client/projects/:id/progress", async (_req, params, auth) => {
		if (!auth || auth.role !== "CLIENT") return json({ error: "Forbidden" }, 403);
		const projectId = params.id;
		try {
			const project = db.query("SELECT * FROM projects WHERE id = ? AND tenant_id = ?")
				.get(projectId, auth.tenantId) as any;
			if (!project) return json({ error: "Project not found" }, 404);

			const tasks = db.query("SELECT * FROM tasks WHERE project_id = ?", projectId).all() as any[];
			const totalTasks = tasks.length;
			const completedTasks = tasks.filter(t => t.status === 'done').length;
			const totalHours = (db.query("SELECT SUM(hours) as total FROM time_entries WHERE project_id = ?", projectId).get() as any)?.total || 0;

			return json({
				project: project.name,
				completion: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
				tasks: { total: totalTasks, completed: completedTasks },
				hours: totalHours,
				budget: project.budget || null,
				budgetSpent: totalHours * (project.hourly_rate || 0),
			});
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch progress", details: message }, 500);
		}
	});

	router.get("/api/client/drawings", async (_req, _params, auth) => {
		if (!auth || auth.role !== "CLIENT") return json({ error: "Forbidden" }, 403);
		try {
			const drawings = db.query(`
				SELECT * FROM workspace_files
				WHERE tenant_id = ? AND (file_path LIKE '%.dwg' OR file_path LIKE '%.rvt' OR file_path LIKE '%.pdf' OR file_path LIKE '%.jpg' OR file_path LIKE '%.png')
				ORDER BY created_at DESC
			`).all(auth.tenantId) as any[];
			return json(drawings || []);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch drawings", details: message }, 500);
		}
	});

	router.post("/api/client/feedback", async (req, _params, auth) => {
		if (!auth || auth.role !== "CLIENT") return json({ error: "Forbidden" }, 403);
		let body: { rating?: number; comment?: string; category?: string };
		try {
			body = (await req.json()) as { rating?: number; comment?: string; category?: string };
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		if (!body.rating) {
			return json({ error: "Rating required" }, 400);
		}
		try {
			db.query(`
				INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, details_json)
				VALUES (?, ?, 'CLIENT_FEEDBACK', 'project', NULL, ?)
			`).run(auth.tenantId, auth.userId, JSON.stringify(body));
			return json({ ok: true });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to submit feedback", details: message }, 500);
		}
	});
}
