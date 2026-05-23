import { json } from "../utils";
import { db } from "../db";
import type { Router } from "../router";
import { auditLog } from "../audit-logger";

export function registerProjectRoutes(router: Router) {
	// GET /api/projects - List projects (isolated for workers)
	router.get("/api/projects", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			const isWorker = auth.role === "WORKER";
			const isClient = auth.role === "CLIENT";
			let projects: any[];

			if (isWorker) {
				projects = db.query(`
					SELECT p.* FROM projects p
					JOIN project_members pm ON p.id = pm.project_id
					WHERE p.tenant_id = ? AND pm.user_id = ?
				`).all(auth.tenantId, auth.userId) as any[];
			} else if (isClient) {
				projects = db.query(`
					SELECT * FROM projects WHERE tenant_id = ? AND status != 'draft'
					ORDER BY created_at DESC
				`).all(auth.tenantId) as any[];
			} else {
				// ADMIN, LEADER, SUPER_ADMIN
				projects = db.query("SELECT * FROM projects WHERE tenant_id = ? ORDER BY created_at DESC").all(auth.tenantId) as any[];
			}

			// Economics shield: Hide budget info from workers, clients, and leaders
			const isLeader = auth.role === "LEADER";
			if (isWorker || isClient || isLeader) {
				projects = projects.map(p => {
					const { budget_allocated, budget_spent, budget, ...rest } = p;
					return rest;
				});
			}

			return json(projects || []);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch projects", details: message }, 500);
		}
	});

	// GET /api/projects/:id - Get project detail
	router.get("/api/projects/:id", async (req, params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			const isWorker = auth.role === "WORKER";
			const isClient = auth.role === "CLIENT";
			
			const project = db.query("SELECT * FROM projects WHERE id = ? AND tenant_id = ?")
				.get(params.id, auth.tenantId) as any;
			
			if (!project) return json({ error: "Project not found" }, 404);

			if (isWorker) {
				const isMember = db.query("SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?")
					.get(params.id, auth.userId);
				if (!isMember) {
					auditLog({
						tenantId: auth.tenantId,
						userId: auth.userId,
						action: "ACCESS_DENIED",
						resourceType: "project",
						resourceId: params.id,
						summary: `Worker attempted to access project they are not a member of`
					});
					return json({ error: "Forbidden" }, 403);
				}
			}

			// Economics shield
			const isLeader = auth.role === "LEADER";
			if (isWorker || isClient || isLeader) {
				const { budget_allocated, budget_spent, budget, ...rest } = project;
				return json(rest);
			}

			// Admin access - log economics view
			auditLog({
				tenantId: auth.tenantId,
				userId: auth.userId,
				action: "VIEW_ECONOMICS",
				resourceType: "project",
				resourceId: params.id,
				summary: `Admin viewed project economics data`
			});

			return json(project);
		} catch (e) {
			return json({ error: "Failed to fetch project" }, 500);
		}
	});

	// POST /api/projects - Create project
	router.post("/api/projects", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		if (auth.role === "WORKER" || auth.role === "CLIENT") return json({ error: "Forbidden" }, 403);

		let body: { name?: string; description?: string; budget_allocated?: number; status?: string };
		try {
			body = (await req.json()) as any;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		if (!body.name) return json({ error: "Name required" }, 400);

		try {
			const id = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
			db.query(`
				INSERT INTO projects (id, tenant_id, name, description, budget_allocated, status, created_by)
				VALUES (?, ?, ?, ?, ?, ?, ?)
			`).run(id, auth.tenantId, body.name, body.description || null, body.budget_allocated || 0, body.status || "active", auth.userId);
			
			const project = db.query("SELECT * FROM projects WHERE id = ?").get(id);
			return json(project);
		} catch (e) {
			return json({ error: "Failed to create project" }, 500);
		}
	});

	// PUT /api/projects/:id - Update project
	router.put("/api/projects/:id", async (req, params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		if (auth.role === "WORKER" || auth.role === "CLIENT") return json({ error: "Forbidden" }, 403);

		const id = params.id;
		let body: any;
		try {
			body = await req.json();
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}

		try {
			const existing = db.query("SELECT * FROM projects WHERE id = ? AND tenant_id = ?").get(id, auth.tenantId);
			if (!existing) return json({ error: "Project not found" }, 404);
			
			db.query(`
				UPDATE projects 
				SET name = COALESCE(?, name), 
				    description = COALESCE(?, description), 
				    budget_allocated = COALESCE(?, budget_allocated), 
				    status = COALESCE(?, status),
				    settings_json = COALESCE(?, settings_json)
				    WHERE id = ? AND tenant_id = ?
				    `).run(
				    body.name, 
				    body.description, 
				    body.budget_allocated, 
				    body.status, 
				    (body.settings_json || body.settings) ? JSON.stringify(body.settings_json || body.settings) : null, 
				    id, 
				    auth.tenantId
				    );
			const project = db.query("SELECT * FROM projects WHERE id = ?").get(id);
			return json(project);
		} catch (e) {
			return json({ error: "Failed to update project" }, 500);
		}
	});

	// DELETE /api/projects/:id - Delete project
	router.delete("/api/projects/:id", async (_req, params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		if (auth.role === "WORKER" || auth.role === "CLIENT") return json({ error: "Forbidden" }, 403);

		const id = params.id;
		try {
			const existing = db.query("SELECT * FROM projects WHERE id = ? AND tenant_id = ?").get(id, auth.tenantId);
			if (!existing) return json({ error: "Project not found" }, 404);
			
			db.query("DELETE FROM projects WHERE id = ? AND tenant_id = ?").run(id, auth.tenantId);
			db.query("UPDATE tasks SET project_id = NULL WHERE project_id = ?").run(id);
			return json({ ok: true });
		} catch (e) {
			return json({ error: "Failed to delete project" }, 500);
		}
	});

	// --- Project Members ---

	router.get("/api/projects/:id/members", async (_req, params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		// LEADER and above can see members
		if (auth.role === "WORKER" || auth.role === "CLIENT") return json({ error: "Forbidden" }, 403);
		
		try {
			const members = db.query(`
				SELECT u.id, u.username, u.full_name, pm.role
				FROM project_members pm
				JOIN users u ON pm.user_id = u.id
				WHERE pm.project_id = ? AND pm.tenant_id = ?
			`).all(params.id, auth.tenantId) as any[];
			return json(members || []);
		} catch (e) {
			return json({ error: "Failed to fetch project members" }, 500);
		}
	});

	router.post("/api/projects/:id/members", async (req, params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		if (auth.role === "WORKER" || auth.role === "CLIENT") return json({ error: "Forbidden" }, 403);

		let body: { userId?: string; role?: string };
		try {
			body = await req.json();
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		if (!body.userId) return json({ error: "userId required" }, 400);

		try {
			db.query(`
				INSERT INTO project_members (tenant_id, project_id, user_id, role)
				VALUES (?, ?, ?, ?)
				ON CONFLICT(project_id, user_id) DO UPDATE SET role = excluded.role
			`).run(auth.tenantId, params.id, body.userId, body.role || "WORKER");
			return json({ ok: true });
		} catch (e) {
			return json({ error: "Failed to add project member" }, 500);
		}
	});

	router.delete("/api/projects/:id/members/:userId", async (_req, params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		if (auth.role === "WORKER" || auth.role === "CLIENT") return json({ error: "Forbidden" }, 403);

		try {
			db.query("DELETE FROM project_members WHERE project_id = ? AND user_id = ? AND tenant_id = ?")
				.run(params.id, params.userId, auth.tenantId);
			return json({ ok: true });
		} catch (e) {
			return json({ error: "Failed to remove project member" }, 500);
		}
	});

	// --- Notes ---

	router.get("/api/notes", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			const notes = db.query("SELECT * FROM notes WHERE tenant_id = ? ORDER BY updated_at DESC").all(auth.tenantId) as any[];
			return json(notes || []);
		} catch (e) {
			return json({ error: "Failed to fetch notes" }, 500);
		}
	});

	router.post("/api/notes", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: { title?: string; content?: string; project_id?: string };
		try {
			body = await req.json();
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		if (!body.title) return json({ error: "Title required" }, 400);
		try {
			const id = `note_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
			db.query(`
				INSERT INTO notes (id, tenant_id, project_id, title, content, created_by)
				VALUES (?, ?, ?, ?, ?, ?)
			`).run(id, auth.tenantId, body.project_id || null, body.title, body.content || null, auth.userId);
			const note = db.query("SELECT * FROM notes WHERE id = ?").get(id);
			return json(note);
		} catch (e) {
			return json({ error: "Failed to create note" }, 500);
		}
	});

	router.put("/api/notes/:id", async (req, params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: any;
		try {
			body = await req.json();
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		try {
			db.query(`
				UPDATE notes 
				SET title = COALESCE(?, title), 
				    content = COALESCE(?, content),
				    updated_at = datetime('now')
				WHERE id = ? AND tenant_id = ?
			`).run(body.title, body.content, params.id, auth.tenantId);
			const note = db.query("SELECT * FROM notes WHERE id = ?").get(params.id);
			return json(note);
		} catch (e) {
			return json({ error: "Failed to update note" }, 500);
		}
	});

	router.delete("/api/notes/:id", async (_req, params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			db.query("DELETE FROM notes WHERE id = ? AND tenant_id = ?").run(params.id, auth.tenantId);
			return json({ ok: true });
		} catch (e) {
			return json({ error: "Failed to delete note" }, 500);
		}
	});
}
