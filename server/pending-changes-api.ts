import { db } from "./db";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function uuid() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

interface AuthInfo {
  userId: string;
  tenantId: string;
  role: string;
}

async function readBody<T>(req: Request): Promise<T | undefined> {
  return await req.json().catch(() => undefined) as T | undefined;
}

function adminGuard(auth: AuthInfo | null): boolean {
  return !!auth && (auth.role === "SUPER_ADMIN" || auth.role === "ADMIN");
}

export async function handlePendingChangesApi(
  path: string,
  method: string,
  auth: AuthInfo | null,
  req: Request
): Promise<Response | null> {
  const tenantId = auth?.tenantId || "default";

  // POST /api/pending-changes — AI creates a suggestion
  if (path === "/api/pending-changes" && method === "POST") {
    if (!auth) return json({ error: "Unauthorized" }, 401);
    const body = await readBody<{
      change_type: string;
      target_table: string;
      target_id?: string;
      proposed_data: any;
      current_data?: any;
      summary: string;
      assigned_to?: string;
    }>(req);
    if (!body || !body.change_type || !body.target_table || !body.summary) {
      return json({ error: "Missing required fields: change_type, target_table, summary" }, 400);
    }
    const id = uuid();
    db.query(`
      INSERT INTO pending_changes (id, tenant_id, change_type, status, target_table, target_id, proposed_data, current_data, summary, suggested_by, suggested_by_user, assigned_to)
      VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      tenantId,
      body.change_type,
      body.target_table,
      body.target_id || null,
      JSON.stringify(body.proposed_data),
      body.current_data ? JSON.stringify(body.current_data) : null,
      body.summary,
      "ai",
      auth.userId,
      body.assigned_to || null
    );
    const row = db.query("SELECT * FROM pending_changes WHERE id = ?").get(id) as any;
    return json(row, 201);
  }

  // GET /api/admin/pending-changes — list all pending changes
  if (path === "/api/admin/pending-changes" && method === "GET") {
    if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
    const rows = db.query(`
      SELECT pc.*, u.username as assigned_username
      FROM pending_changes pc
      LEFT JOIN users u ON u.id = pc.assigned_to
      WHERE pc.tenant_id = ?
      ORDER BY pc.created_at DESC
    `).all(tenantId) as any[];
    return json(rows);
  }

  // GET /api/admin/pending-changes/:id — single change detail
  const singleMatch = path.match(/^\/api\/admin\/pending-changes\/([^/]+)$/);
  if (singleMatch && method === "GET") {
    if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
    const row = db.query("SELECT * FROM pending_changes WHERE id = ? AND tenant_id = ?").get(singleMatch[1], tenantId) as any;
    if (!row) return json({ error: "Not found" }, 404);
    return json(row);
  }

  // POST /api/admin/pending-changes/:id/approve
  const approveMatch = path.match(/^\/api\/admin\/pending-changes\/([^/]+)\/approve$/);
  if (approveMatch && method === "POST") {
    if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
    const row = db.query("SELECT * FROM pending_changes WHERE id = ? AND tenant_id = ?").get(approveMatch[1], tenantId) as any;
    if (!row) return json({ error: "Not found" }, 404);
    if (row.status !== "pending") return json({ error: "Change is not pending" }, 400);
    if (row.assigned_to && row.assigned_to !== auth.userId) {
      return json({ error: "This change is assigned to another admin" }, 403);
    }

    const proposed = JSON.parse(row.proposed_data);

    try {
      if (row.target_table === "price_lists") {
        if (row.target_id) {
          db.query(`UPDATE price_lists SET name = ?, items_json = ?, updated_at = ? WHERE id = ? AND tenant_id = ?`).run(
            proposed.name,
            JSON.stringify(proposed.items_json || []),
            now(),
            row.target_id,
            tenantId
          );
        } else {
          const newId = uuid();
          db.query(`INSERT INTO price_lists (id, tenant_id, name, items_json, active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)`).run(
            newId,
            tenantId,
            proposed.name,
            JSON.stringify(proposed.items_json || []),
            now(),
            now()
          );
        }
      } else if (row.target_table === "offers") {
        if (row.target_id) {
          db.query(`UPDATE offers SET status = ?, updated_at = ? WHERE id = ? AND tenant_id = ?`).run(
            proposed.status || "draft",
            now(),
            row.target_id,
            tenantId
          );
        }
      } else if (row.target_table === "tasks") {
        if (row.target_id) {
          db.query(`
            UPDATE tasks SET 
              title = COALESCE(?, title),
              description = COALESCE(?, description),
              status = COALESCE(?, status),
              priority = COALESCE(?, priority),
              assigned_to = COALESCE(?, assigned_to),
              due_date = COALESCE(?, due_date),
              estimated_hours = COALESCE(?, estimated_hours),
              updated_at = datetime('now')
            WHERE id = ? AND tenant_id = ?
          `).run(
            proposed.title || null,
            proposed.description || null,
            proposed.status || null,
            proposed.priority || null,
            proposed.assigned_to || null,
            proposed.due_date || null,
            proposed.estimated_hours ?? null,
            row.target_id,
            tenantId
          );
        } else {
          const newId = `task_${Date.now()}_${uuid().slice(0, 8)}`;
          db.query(`
            INSERT INTO tasks (id, tenant_id, project_id, title, description, assigned_to, status, priority, due_date, estimated_hours, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            newId,
            tenantId,
            proposed.project_id || null,
            proposed.title,
            proposed.description || null,
            proposed.assigned_to || null,
            proposed.status || 'todo',
            proposed.priority || 'medium',
            proposed.due_date || null,
            proposed.estimated_hours ?? null,
            auth.userId
          );
        }
      } else if (row.target_table === "projects") {
        if (row.target_id) {
          db.query(`
            UPDATE projects SET
              name = COALESCE(?, name),
              description = COALESCE(?, description),
              status = COALESCE(?, status),
              updated_at = datetime('now')
            WHERE id = ? AND tenant_id = ?
          `).run(
            proposed.name || null,
            proposed.description || null,
            proposed.status || null,
            row.target_id,
            tenantId
          );
        }
      }

      db.query(`UPDATE pending_changes SET status = 'approved', approved_by = ?, approved_at = ? WHERE id = ?`).run(
        auth.userId,
        now(),
        row.id
      );

      const updated = db.query("SELECT * FROM pending_changes WHERE id = ?").get(row.id) as any;
      return json(updated);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return json({ error: "Failed to apply change", details: message }, 500);
    }
  }

  // POST /api/admin/pending-changes/:id/reject
  const rejectMatch = path.match(/^\/api\/admin\/pending-changes\/([^/]+)\/reject$/);
  if (rejectMatch && method === "POST") {
    if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
    const row = db.query("SELECT * FROM pending_changes WHERE id = ? AND tenant_id = ?").get(rejectMatch[1], tenantId) as any;
    if (!row) return json({ error: "Not found" }, 404);
    if (row.status !== "pending") return json({ error: "Change is not pending" }, 400);

    const body = await readBody<{ reason?: string }>(req);
    db.query(`UPDATE pending_changes SET status = 'rejected', approved_by = ?, rejected_reason = ?, approved_at = ? WHERE id = ?`).run(
      auth.userId,
      body?.reason || "No reason given",
      now(),
      row.id
    );

    const updated = db.query("SELECT * FROM pending_changes WHERE id = ?").get(row.id) as any;
    return json(updated);
  }

  return null;
}
