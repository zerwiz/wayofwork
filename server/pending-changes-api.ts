import { db } from "./db";
import { type AuthInfo } from "./auth";
import { notifyUser } from "./notifications";

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

async function readBody<T>(req: Request): Promise<T | undefined> {
  return await req.json().catch(() => undefined) as T | undefined;
}

function adminGuard(auth: AuthInfo | null): boolean {
  return !!auth && (auth.role === "SUPER_ADMIN" || auth.role === "ADMIN");
}

export async function createPendingChange(tenantId: string, userId: string, data: {
  change_type: string;
  target_table: string;
  target_id?: string;
  proposed_data: any;
  current_data?: any;
  summary: string;
  assigned_to?: string;
}) {
  const id = uuid();
  db.query(`
    INSERT INTO pending_changes (id, tenant_id, change_type, status, target_table, target_id, proposed_data, current_data, summary, suggested_by, suggested_by_user, assigned_to)
    VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    tenantId,
    data.change_type,
    data.target_table,
    data.target_id || null,
    JSON.stringify(data.proposed_data),
    data.current_data ? JSON.stringify(data.current_data) : null,
    data.summary,
    "ai",
    userId,
    data.assigned_to || null
  );
  return id;
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
    
    try {
      const id = await createPendingChange(tenantId, auth.userId, body);
      const row = db.query("SELECT * FROM pending_changes WHERE id = ?").get(id) as any;
      return json(row, 201);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return json({ error: "Failed to create suggestion", details: message }, 500);
    }
  }

  // GET /api/admin/pending-changes — list all pending changes
  if (path === "/api/admin/pending-changes" && method === "GET") {
    if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
    const rows = db.query("SELECT * FROM pending_changes WHERE tenant_id = ? ORDER BY created_at DESC").all(tenantId) as any[];
    return json(rows);
  }

  // GET /api/admin/pending-changes/:id — detail
  const detailMatch = path.match(/^\/api\/admin\/pending-changes\/([^/]+)$/);
  if (detailMatch && method === "GET") {
    if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
    const id = detailMatch[1];
    const row = db.query("SELECT * FROM pending_changes WHERE id = ? AND tenant_id = ?").get(id, tenantId) as any;
    if (!row) return json({ error: "Not found" }, 404);
    return json(row);
  }

  // POST /api/admin/pending-changes/:id/approve
  const approveMatch = path.match(/^\/api\/admin\/pending-changes\/([^/]+)\/approve$/);
  if (approveMatch && method === "POST") {
    if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
    const id = approveMatch[1];
    const row = db.query("SELECT * FROM pending_changes WHERE id = ? AND tenant_id = ?").get(id, tenantId) as any;
    if (!row) return json({ error: "Not found" }, 404);
    if (row.status !== "pending") return json({ error: "Already processed" }, 400);

    try {
      // Apply change to target table
      const proposed = JSON.parse(row.proposed_data);
      const targetTable = row.target_table;
      const targetId = row.target_id;

      if (targetTable === "price_lists") {
        if (targetId) {
          db.query(`UPDATE price_lists SET items_json = ?, updated_at = ? WHERE id = ?`).run(JSON.stringify(proposed.items), now(), targetId);
        } else {
          db.query(`INSERT INTO price_lists (id, tenant_id, name, items_json) VALUES (?, ?, ?, ?)`).run(uuid(), tenantId, proposed.name, JSON.stringify(proposed.items));
        }
      } else if (targetTable === "tasks") {
        if (targetId) {
          db.query(`UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, assigned_to = ?, updated_at = ? WHERE id = ?`).run(proposed.title, proposed.description, proposed.status, proposed.priority, proposed.assigned_to, now(), targetId);
        }
      }

      db.query(`UPDATE pending_changes SET status = 'approved', approved_by = ?, approved_at = ? WHERE id = ?`).run(auth.userId, now(), row.id);

      if (row.suggested_by_user) {
        notifyUser({
          tenantId,
          userId: row.suggested_by_user,
          type: "approval",
          severity: "success",
          title: "Förändring godkänd",
          message: row.summary || `Change to ${targetTable} was approved`,
          link: "/admin/pending-changes",
        }).catch(() => {});
      }

      return json({ ok: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return json({ error: "Failed to apply change", details: message }, 500);
    }
  }

  // POST /api/admin/pending-changes/:id/reject
  const rejectMatch = path.match(/^\/api\/admin\/pending-changes\/([^/]+)\/reject$/);
  if (rejectMatch && method === "POST") {
    if (!adminGuard(auth)) return json({ error: "Forbidden" }, 403);
    const id = rejectMatch[1];
    const body = await readBody<{ reason?: string }>(req);
    const row = db.query("SELECT * FROM pending_changes WHERE id = ? AND tenant_id = ?").get(id, tenantId) as any;
    if (!row) return json({ error: "Not found" }, 404);
    
    db.query(`UPDATE pending_changes SET status = 'rejected', approved_by = ?, rejected_reason = ?, approved_at = ? WHERE id = ?`).run(
      auth.userId,
      body?.reason || "No reason given",
      now(),
      row.id
    );

    if (row.suggested_by_user) {
      notifyUser({
        tenantId,
        userId: row.suggested_by_user,
        type: "approval",
        severity: "warning",
        title: "Förändring avvisad",
        message: row.summary || `Change to ${row.target_table} was rejected`,
        link: "/admin/pending-changes",
      }).catch(() => {});
    }

    const updated = db.query("SELECT * FROM pending_changes WHERE id = ?").get(row.id) as any;
    return json(updated);
  }

  return null;
}
