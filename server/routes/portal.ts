import { stat, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { json } from "../utils";
import { db, createResourcePermission } from "../db";
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
		const user = db.query("SELECT id, username, role, tenant_id, full_name, email, phone, job_title, status, language FROM users WHERE id = ?").get(auth.userId) as any;
		if (!user) return json({ error: "User not found" }, 404);
		return json({
			id: user.id,
			username: user.username,
			role: user.role,
			tenantId: user.tenant_id,
			fullName: user.full_name,
			email: user.email,
			phone: user.phone,
			jobTitle: user.job_title,
			status: user.status,
			language: user.language || "sv",
		});
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
				    phone = COALESCE(?, phone),
				    language = COALESCE(?, language)
				WHERE id = ? AND tenant_id = ?
			`).run(body.full_name, body.email, body.phone, body.language, auth.userId, auth.tenantId);
			const user = db.query("SELECT id, username, role, tenant_id, full_name, email, phone, language FROM users WHERE id = ?").get(auth.userId);
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
			const isSuper = auth.role === "ADMIN" || auth.role === "SUPER_ADMIN";

			let baseQuery = `
				SELECT
					t.*,
					u.username as assigned_name,
					p.name as project_name,
					rp.owner_id,
					rp.visibility
				FROM
					tasks t
				LEFT JOIN users u ON t.assigned_to = u.id
				LEFT JOIN projects p ON t.project_id = p.id
				LEFT JOIN resource_permissions rp ON t.resource_permission_id = rp.resource_id
			`;

			const queryParams: (string | number)[] = [auth.tenantId];
			const whereClauses: string[] = ["t.tenant_id = ?"];

			if (!isLeader) { // Workers and Clients have restricted view
				whereClauses.push("t.assigned_to = ?"); // Assigned to them
				queryParams.push(auth.userId);
				whereClauses.push(`
					(
						rp.owner_id = ? OR                                  -- User is the owner
						rp.visibility = 'tenant' OR                         -- Visible to all in tenant
						EXISTS(SELECT 1 FROM resource_shares rs WHERE rs.resource_id = t.resource_permission_id AND rs.shared_with_id = ?) OR -- Explicitly shared
						EXISTS(SELECT 1 FROM project_members pm WHERE t.project_id = pm.project_id AND pm.user_id = ?) -- Member of project
					)
				`);
				queryParams.push(auth.userId, auth.userId, auth.userId);
			} else if (!isSuper) { // Leaders can see all in tenant that are not private, or are shared, or they own
				whereClauses.push(`
					(
						rp.owner_id = ? OR
						rp.visibility = 'tenant' OR
						EXISTS(SELECT 1 FROM resource_shares rs WHERE rs.resource_id = t.resource_permission_id AND rs.shared_with_id = ?) OR
						EXISTS(SELECT 1 FROM project_members pm WHERE t.project_id = pm.project_id AND pm.user_id = ?)
					)
				`);
				queryParams.push(auth.userId, auth.userId, auth.userId);
			}
			
			const fullQuery = `${baseQuery} WHERE ${whereClauses.join(" AND ")} ORDER BY t.deadline ASC, t.created_at DESC`;

			let tasks = db.query(fullQuery).all(...queryParams) as any[];

			// Economics shield (WOW-016): hide estimated_hours from workers and leaders
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

			const baseQuery = `
				SELECT
					f.*,
					rp.resource_id AS rp_resource_id,
					rp.resource_type AS rp_resource_type,
					rp.owner_id AS rp_owner_id,
					rp.visibility AS rp_visibility,
					rp.created_at AS rp_created_at,
					rp.updated_at AS rp_updated_at
				FROM
					workspace_files f
				LEFT JOIN
					resource_permissions rp ON f.resource_permission_id = rp.resource_id
			`;

			const queryParams: (string | number)[] = [auth.tenantId];
			const whereClauses: string[] = ["f.tenant_id = ?"];

			if (isWorker) {
				// Workers can only see files in projects they are members of, AND files they own/are shared with
				whereClauses.push(`
					(
						EXISTS(SELECT 1 FROM project_members pm WHERE f.project_id = pm.project_id AND pm.user_id = ?)
						AND
						(
							rp.owner_id = ? OR
							rp.visibility = 'tenant' OR
							EXISTS(SELECT 1 FROM resource_shares rs WHERE rs.resource_id = f.resource_permission_id AND rs.shared_with_id = ?)
						)
					)
				`);
				queryParams.push(auth.userId, auth.userId, auth.userId);
			} else if (auth.role !== "ADMIN" && auth.role !== "SUPER_ADMIN") {
				// Other non-admin/super_admin roles (e.g., Leader, Client)
				whereClauses.push(`(
					rp.owner_id = ? OR
					rp.visibility = 'tenant' OR
					EXISTS(SELECT 1 FROM resource_shares rs WHERE rs.resource_id = f.resource_permission_id AND rs.shared_with_id = ?)
				)`);
				queryParams.push(auth.userId, auth.userId);
			}

			const fullQuery = `${baseQuery} WHERE ${whereClauses.join(" AND ")} ORDER BY f.created_at DESC`;
			let files = db.query(fullQuery).all(...queryParams) as any[];

			// Map results to include resourcePermission object
			const formattedFiles = files.map(file => {
				const { 
					rp_resource_id, rp_resource_type, rp_owner_id, rp_visibility, rp_created_at, rp_updated_at, 
					...rest 
				} = file;
				return {
					...rest,
					resourcePermission: rp_resource_id ? {
						resource_id: rp_resource_id,
						resource_type: rp_resource_type,
						owner_id: rp_owner_id,
						visibility: rp_visibility,
						created_at: rp_created_at,
						updated_at: rp_updated_at,
					} : undefined,
				};
			});

			return json(formattedFiles || []);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch files", details: message }, 500);
		}
	});

	router.get("/api/portal/files/:id", async (_req, params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const fileId = params.id;
		try {
			const hasAccess = await checkResourceAccess(fileId, 'workspace_file', auth);
			if (!hasAccess) {
				auditLog({
					tenantId: auth.tenantId,
					userId: auth.userId,
					action: "ACCESS_DENIED",
					resourceType: "workspace_file",
					resourceId: fileId,
					summary: `User attempted to access workspace file without permission`
				});
				return json({ error: "Forbidden" }, 403);
			}

			const file = db.query(`
				SELECT
					f.*,
					rp.resource_id AS rp_resource_id,
					rp.resource_type AS rp_resource_type,
					rp.owner_id AS rp_owner_id,
					rp.visibility AS rp_visibility,
					rp.created_at AS rp_created_at,
					rp.updated_at AS rp_updated_at
				FROM workspace_files f
				LEFT JOIN resource_permissions rp ON f.resource_permission_id = rp.resource_id
				WHERE f.id = ? AND f.tenant_id = ?
			`).get(fileId, auth.tenantId) as any;
			if (!file) return json({ error: "File not found" }, 404);

			const { 
				rp_resource_id, rp_resource_type, rp_owner_id, rp_visibility, rp_created_at, rp_updated_at, 
				...rest 
			} = file;
			
			const formattedFile = {
				...rest,
				resourcePermission: rp_resource_id ? {
					resource_id: rp_resource_id,
					resource_type: rp_resource_type,
					owner_id: rp_owner_id,
					visibility: rp_visibility,
					created_at: rp_created_at,
					updated_at: rp_updated_at,
				} : undefined,
			};

			return json(formattedFile);
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
		let body: { title?: string; assigned_to?: string; project_id?: string; estimated_hours?: number; deadline?: string; status?: string; priority?: string; description?: string };
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
			createResourcePermission(id, 'task', auth.userId); // Create permission first

			db.query(`
				INSERT INTO tasks (id, tenant_id, title, assigned_to, project_id, estimated_hours, deadline, status, priority, description, resource_permission_id)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`).run(id, auth.tenantId, body.title, body.assigned_to || null, body.project_id || null, body.estimated_hours || null, body.deadline || null, body.status || 'todo', body.priority || 'medium', body.description || null, id);
			const task = db.query("SELECT * FROM tasks WHERE id = ?").get(id);
			return json(task);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to create task", details: message }, 500);
		}
	});

	router.post("/api/portal/files/upload", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const workspaceRoot = getPrimaryWorkspacePath(auth.tenantId);
		const uploadDir = resolve(workspaceRoot, auth.tenantId, "files"); // Tenant-specific upload directory
		
		try {
			// Ensure the upload directory exists
			await mkdir(uploadDir, { recursive: true });

			const formData = await req.formData();
			const file = formData.get("file") as File;
			const projectId = formData.get("project_id") as string | null;

			if (!file) {
				return json({ error: "No file uploaded" }, 400);
			}

			const filename = file.name;
			const mimeType = file.type;
			const fileSize = file.size;
			const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
			const filePath = resolve(uploadDir, fileId + "_" + filename); // Store with unique ID prefix

			await Bun.write(filePath, file); // Save the file
			createResourcePermission(fileId, 'workspace_file', auth.userId); // Create permission first

			db.query(`
				INSERT INTO workspace_files (id, tenant_id, project_id, file_path, filename, mime_type, size, created_by, resource_permission_id)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
			`).run(fileId, auth.tenantId, projectId, filePath, filename, mimeType, fileSize, auth.userId, fileId);

			const uploadedFile = db.query("SELECT * FROM workspace_files WHERE id = ?").get(fileId);
			auditLog({
				tenantId: auth.tenantId,
				userId: auth.userId,
				action: "FILE_UPLOAD",
				resourceType: "file",
				resourceId: fileId,
				summary: `Uploaded file: ${filename}`,
				details: { path: filePath, projectId: projectId }
			});
			return json(uploadedFile, 201);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to upload file", details: message }, 500);
		}
	});

	// GET /api/portal/tasks/:id - Get single card
	router.get("/api/portal/tasks/:id", async (_req, params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const taskId = params.id;
		try {
			const hasAccess = await checkResourceAccess(taskId, 'task', auth);
			if (!hasAccess) {
				auditLog({
					tenantId: auth.tenantId,
					userId: auth.userId,
					action: "ACCESS_DENIED",
					resourceType: "task",
					resourceId: taskId,
					summary: `User attempted to access task without permission`
				});
				return json({ error: "Forbidden" }, 403);
			}

			const task = db.query(`
				SELECT t.*, u.username as assigned_name, p.name as project_name
				FROM tasks t
				LEFT JOIN users u ON t.assigned_to = u.id
				LEFT JOIN projects p ON t.project_id = p.id
				WHERE t.id = ? AND t.tenant_id = ?
			`).get(taskId, auth.tenantId);
			if (!task) return json({ error: "Task not found" }, 404);
			return json(task);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch task", details: message }, 500);
		}
	});

	// PUT /api/portal/tasks/:id - Update card (title, status/column, priority, assignee, etc.)
	router.put("/api/portal/tasks/:id", async (req, params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		if (auth.role === "CLIENT") return json({ error: "Forbidden" }, 403);
		let body: { title?: string; status?: string; priority?: string; assigned_to?: string; description?: string; deadline?: string; estimated_hours?: number; cover?: string };
		try {
			body = (await req.json()) as any;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		try {
			const existing = db.query("SELECT * FROM tasks WHERE id = ? AND tenant_id = ?").get(params.id, auth.tenantId);
			if (!existing) return json({ error: "Task not found" }, 404);
			db.query(`
				UPDATE tasks
				SET title = COALESCE(?, title),
				    description = COALESCE(?, description),
				    status = COALESCE(?, status),
				    priority = COALESCE(?, priority),
				    assigned_to = COALESCE(?, assigned_to),
				    deadline = COALESCE(?, deadline),
				    estimated_hours = COALESCE(?, estimated_hours),
				    cover = COALESCE(?, cover)
				WHERE id = ? AND tenant_id = ?
			`).run(
				body.title || null,
				body.description !== undefined ? body.description : null,
				body.status || null,
				body.priority || null,
				body.assigned_to || null,
				body.deadline || null,
				body.estimated_hours ?? null,
				body.cover !== undefined ? body.cover : null,
				params.id,
				auth.tenantId,
			);
			const task = db.query("SELECT * FROM tasks WHERE id = ?").get(params.id);
			return json(task);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to update task", details: message }, 500);
		}
	});

	// DELETE /api/portal/tasks/:id - Delete card
	router.delete("/api/portal/tasks/:id", async (_req, params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		if (auth.role === "CLIENT") return json({ error: "Forbidden" }, 403);
		try {
			const existing = db.query("SELECT * FROM tasks WHERE id = ? AND tenant_id = ?").get(params.id, auth.tenantId);
			if (!existing) return json({ error: "Task not found" }, 404);
			db.query("DELETE FROM tasks WHERE id = ? AND tenant_id = ?").run(params.id, auth.tenantId);
			return json({ ok: true });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to delete task", details: message }, 500);
		}
	});

	// GET /api/portal/licenses - Get current user's licenses
	router.get("/api/portal/licenses", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			const licenses = db.query(`
				SELECT l.* FROM user_licenses l
				WHERE l.user_id = ? AND l.tenant_id = ?
				ORDER BY l.category, l.name
			`).all(auth.userId, auth.tenantId);
			return json(licenses);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch licenses", details: message }, 500);
		}
	});

	// PUT /api/portal/licenses - Save all licenses for current user (replace)
	router.put("/api/portal/licenses", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: { licenses: Array<{ name: string; issuer?: string; valid_until?: string; category: string; status: string }> };
		try {
			body = (await req.json()) as any;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		if (!Array.isArray(body.licenses)) return json({ error: "licenses array required" }, 400);
		try {
			db.query("DELETE FROM user_licenses WHERE user_id = ? AND tenant_id = ?").run(auth.userId, auth.tenantId);
			const stmt = db.prepare("INSERT INTO user_licenses (id, user_id, tenant_id, name, issuer, valid_until, category, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
			for (const lic of body.licenses) {
				const id = `lic_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
				stmt.run(id, auth.userId, auth.tenantId, lic.name, lic.issuer || null, lic.valid_until || null, lic.category, lic.status);
			}
			return json({ ok: true });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to save licenses", details: message }, 500);
		}
	});
}
