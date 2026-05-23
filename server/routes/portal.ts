import { stat, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { json } from "../utils";
import { db } from "../db";
import { auditLog } from "../audit-logger";
import { getPrimaryWorkspacePath } from "../workspace-state";
import type { Router } from "../router";

export function registerPortalRoutes(router: Router) {
	router.get("/api/portal/download/:fileId", async (_req, params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const fileId = params.fileId;
		if (!fileId) return json({ error: "File ID required" }, 400);
		try {
			const file = db.query("SELECT * FROM workspace_files WHERE id = ? AND tenant_id = ?")
				.get(fileId, auth.tenantId) as any;
			if (!file) return json({ error: "File not found" }, 404);
			const workspaceRoot = getPrimaryWorkspacePath(auth.tenantId);
			const safePath = resolve(workspaceRoot, file.file_path);
			if (!safePath.startsWith(workspaceRoot)) return json({ error: "Invalid file path" }, 403);
			const fileInfo = await stat(safePath);
			if (!fileInfo.isFile()) return json({ error: "File not found on disk" }, 404);
			db.query("UPDATE workspace_files SET download_count = download_count + 1 WHERE id = ?").run(fileId);
			auditLog({
				tenantId: auth.tenantId,
				userId: auth.userId,
				action: "FILE_DOWNLOAD",
				resourceType: "file",
				resourceId: fileId,
				details: { path: file.file_path }
			});
			const fileContent = await readFile(safePath);
			return new Response(fileContent, {
				headers: {
					"Content-Type": file.mime_type || "application/octet-stream",
					"Content-Disposition": `attachment; filename="${file.file_path.split("/").pop()}"`,
					"Content-Length": fileInfo.size.toString(),
				}
			});
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to download file", details: message }, 500);
		}
	});
	router.get("/api/portal/me", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const user = db.query("SELECT id, username, role, tenant_id FROM users WHERE id = ?").get(auth.userId) as any;
		if (!user) return json({ error: "User not found" }, 404);
		return json({ id: user.id, username: user.username, role: user.role, tenantId: user.tenant_id });
	});

	router.put("/api/portal/me", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: any;
		try {
			body = await req.json();
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		try {
			db.query(`
				UPDATE users 
				SET full_name = COALESCE(?, full_name), 
				    email = COALESCE(?, email),
				    phone = COALESCE(?, phone)
				WHERE id = ? AND tenant_id = ?
			`).run(body.full_name, body.email, body.phone, auth.userId, auth.tenantId);
			const user = db.query("SELECT id, username, role, tenant_id, full_name, email, phone FROM users WHERE id = ?").get(auth.userId);
			return json(user);
		} catch (e) {
			return json({ error: "Failed to update profile" }, 500);
		}
	});

	router.post("/api/portal/change-pin", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: { pin?: string };
		try {
			body = await req.json();
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		if (!body.pin || body.pin.length !== 4) return json({ error: "4-digit PIN required" }, 400);
		try {
			db.query("UPDATE users SET pin = ? WHERE id = ? AND tenant_id = ?").run(body.pin, auth.userId, auth.tenantId);
			return json({ ok: true });
		} catch (e) {
			return json({ error: "Failed to update PIN" }, 500);
		}
	});

	router.get("/api/portal/tasks", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			const isLeader = auth.role === "LEADER" || auth.role === "ADMIN" || auth.role === "SUPER_ADMIN";
			let tasks: any[];
			if (isLeader) {
				tasks = db.query(`
					SELECT t.*, u.username as assigned_name, p.name as project_name
					FROM tasks t
					LEFT JOIN users u ON t.assigned_to = u.id
					LEFT JOIN projects p ON t.project_id = p.id
					WHERE t.tenant_id = ?
					ORDER BY t.due_date ASC, t.created_at DESC
				`).all(auth.tenantId) as any[];
			} else {
				tasks = db.query(`
					SELECT t.*, p.name as project_name
					FROM tasks t
					LEFT JOIN projects p ON t.project_id = p.id
					WHERE t.tenant_id = ? AND t.assigned_to = ?
					ORDER BY t.due_date ASC, t.created_at DESC
				`).all(auth.tenantId, auth.userId) as any[];
			}

			// Economics shield (WOW-016): hide estimated_hours from workers and leaders
			const isSuper = auth.role === "ADMIN" || auth.role === "SUPER_ADMIN";
			if (!isSuper) {
				tasks = tasks.map(t => {
					const { estimated_hours, ...rest } = t;
					return rest;
				});
			}

			return json(tasks || []);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch tasks", details: message }, 500);
		}
	});

	router.get("/api/portal/files", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			const isWorker = auth.role === "WORKER";
			let files;
			if (isWorker) {
				files = db.query(`
					SELECT f.*
					FROM workspace_files f
					JOIN project_members pm ON f.project_id = pm.project_id
					WHERE f.tenant_id = ? AND pm.user_id = ?
					ORDER BY f.created_at DESC
				`).all(auth.tenantId, auth.userId) as any[];
			} else {
				files = db.query(`
					SELECT *
					FROM workspace_files
					WHERE tenant_id = ?
					ORDER BY created_at DESC
				`).all(auth.tenantId) as any[];
			}
			return json(files || []);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch files", details: message }, 500);
		}
	});

	router.get("/api/portal/files/:id", async (_req, params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const id = params.id;
		try {
			const isWorker = auth.role === "WORKER";
			const file = db.query("SELECT * FROM workspace_files WHERE id = ? AND tenant_id = ?").get(id, auth.tenantId) as any;
			if (!file) return json({ error: "File not found" }, 404);

			if (isWorker && file.project_id) {
				const isMember = db.query("SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?")
					.get(file.project_id, auth.userId);
				if (!isMember) return json({ error: "Forbidden" }, 403);
			}

			return json(file);
		} catch (e) {
			return json({ error: "Failed to fetch file" }, 500);
		}
	});

	router.put("/api/portal/files/:id", async (req, params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const id = params.id;
		let body: any;
		try {
			body = await req.json();
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		try {
			db.query(`
				UPDATE workspace_files 
				SET kanban_card_id = COALESCE(?, kanban_card_id), 
				    kanban_board_id = COALESCE(?, kanban_board_id)
				WHERE id = ? AND tenant_id = ?
			`).run(body.kanban_card_id, body.kanban_board_id, id, auth.tenantId);
			const file = db.query("SELECT * FROM workspace_files WHERE id = ?").get(id);
			return json(file);
		} catch (e) {
			return json({ error: "Failed to update file" }, 500);
		}
	});

	router.delete("/api/portal/files/:id", async (_req, params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const id = params.id;
		try {
			const result = db.query("DELETE FROM workspace_files WHERE id = ? AND tenant_id = ?").run(id, auth.tenantId);
			if (result.changes === 0) return json({ error: "File not found" }, 404);
			return json({ ok: true });
		} catch (e) {
			return json({ error: "Failed to delete file" }, 500);
		}
	});

	router.get("/api/portal/time", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			const entries = db.query(`
				SELECT te.*, t.title as task_title, p.name as project_name
				FROM time_entries te
				LEFT JOIN tasks t ON te.task_id = t.id
				LEFT JOIN projects p ON te.project_id = p.id
				WHERE te.tenant_id = ? AND te.user_id = ?
				ORDER BY te.date DESC, te.created_at DESC
				LIMIT 100
			`).all(auth.tenantId, auth.userId) as any[];
			return json(entries || []);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch time entries", details: message }, 500);
		}
	});

	router.post("/api/portal/time", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: { hours?: number; project?: string; date?: string; taskId?: string; description?: string; drawingRef?: string };
		try {
			body = (await req.json()) as { hours?: number; project?: string; date?: string; taskId?: string; description?: string; drawingRef?: string };
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}

		if (!body.hours || !body.project || !body.date) {
			return json({ error: "Missing required fields: hours, project, date" }, 400);
		}

		try {
			const id = `time_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
			const result = db.query(`
				INSERT INTO time_entries (id, tenant_id, user_id, project_id, task_id, date, hours, description, drawing_ref, status)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
			`).run(id, auth.tenantId, auth.userId, body.project, body.taskId || null, body.date, body.hours, body.description || null, body.drawingRef || null);

			if (result.changes === 0) {
				return json({ error: "Failed to save time entry" }, 500);
			}

			return json({ ok: true, id });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to save time entry", details: message }, 500);
		}
	});

	router.get("/api/portal/time/:id", async (_req, params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const id = params.id;
		try {
			const entry = db.query("SELECT * FROM time_entries WHERE id = ? AND tenant_id = ?").get(id, auth.tenantId);
			if (!entry) return json({ error: "Entry not found" }, 404);
			return json(entry);
		} catch (e) {
			return json({ error: "Failed to fetch time entry" }, 500);
		}
	});

	router.put("/api/portal/time/:id", async (req, params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const id = params.id;
		let body: any;
		try {
			body = await req.json();
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		try {
			db.query(`
				UPDATE time_entries 
				SET hours = COALESCE(?, hours), 
				    date = COALESCE(?, date),
				    description = COALESCE(?, description),
				    drawing_ref = COALESCE(?, drawing_ref),
				    project_id = COALESCE(?, project_id),
				    task_id = COALESCE(?, task_id)
				WHERE id = ? AND tenant_id = ?
			`).run(body.hours, body.date, body.description, body.drawing_ref, body.project_id, body.task_id, id, auth.tenantId);
			const entry = db.query("SELECT * FROM time_entries WHERE id = ?").get(id);
			return json(entry);
		} catch (e) {
			return json({ error: "Failed to update time entry" }, 500);
		}
	});

	router.delete("/api/portal/time/:id", async (_req, params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const id = params.id;
		try {
			const result = db.query("DELETE FROM time_entries WHERE id = ? AND tenant_id = ?").run(id, auth.tenantId);
			if (result.changes === 0) return json({ error: "Entry not found" }, 404);
			return json({ ok: true });
		} catch (e) {
			return json({ error: "Failed to delete time entry" }, 500);
		}
	});

	router.post("/api/portal/time/:id/approve", async (_req, params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const timeId = params.id;
		try {
			const result = db.query("UPDATE time_entries SET status = 'approved', reviewed_at = datetime('now') WHERE id = ? AND tenant_id = ?")
				.run(timeId, auth.tenantId);
			if (result.changes === 0) return json({ error: "Time entry not found" }, 404);
			return json({ ok: true, status: "approved" });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to approve time entry", details: message }, 500);
		}
	});

	router.post("/api/portal/time/:id/reject", async (req, params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const timeId = params.id;
		let body: { notes?: string };
		try {
			body = (await req.json()) as { notes?: string };
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		try {
			const result = db.query("UPDATE time_entries SET status = 'rejected', leader_notes = ?, reviewed_at = datetime('now') WHERE id = ? AND tenant_id = ?")
				.run(body.notes || null, timeId, auth.tenantId);
			if (result.changes === 0) return json({ error: "Time entry not found" }, 404);
			return json({ ok: true, status: "rejected" });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to reject time entry", details: message }, 500);
		}
	});

	router.post("/api/portal/tasks", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: { title?: string; assigned_to?: string; project_id?: string; estimated_hours?: number; due_date?: string; kanban_card_id?: string; kanban_board_id?: string };
		try {
			body = (await req.json()) as any;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		if (!body.title) {
			return json({ error: "Title required" }, 400);
		}
		try {
			const id = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
			db.query(`
				INSERT INTO tasks (id, tenant_id, title, assigned_to, project_id, estimated_hours, due_date, status, created_by, kanban_card_id, kanban_board_id)
				VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)
			`).run(id, auth.tenantId, body.title, body.assigned_to || null, body.project_id || null, body.estimated_hours || null, body.due_date || null, auth.userId, body.kanban_card_id || null, body.kanban_board_id || null);
			const task = db.query("SELECT * FROM tasks WHERE id = ?").get(id);
			return json(task);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to create task", details: message }, 500);
		}
	});
}
