import { db } from "./db";
import type { Ticket, TimeBlock, TimeSession, PriceList } from "../shared/ticket-types";

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
  return new Date().toISOString();
}

export interface AuthInfo {
  userId: string;
  tenantId: string;
  role: string;
}

function extractId(path: string, prefix: string): string | null {
  const parts = path.split("/");
  const idx = parts.indexOf(prefix);
  if (idx === -1 || idx + 1 >= parts.length) return null;
  return parts[idx + 1];
}

export async function handleTicketApi(p: string, method: string, auth: AuthInfo | null, req: Request): Promise<Response | null> {
  const body = method === "POST" || method === "PUT" ? await req.json().catch(() => undefined) : undefined;
  const { userId, tenantId, role } = auth ?? { userId: "", tenantId: "", role: "" };

  // POST /api/time-sessions/check-in
  if (p === "/api/time-sessions/check-in" && method === "POST") {
    const b = body as { project_id?: string; notes?: string; location_json?: string } | undefined;
    const id = uuid();
    db.run(
      "INSERT INTO time_sessions (id, tenant_id, user_id, project_id, check_in, notes, location_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, tenantId, userId, b?.project_id ?? null, now(), b?.notes ?? null, b?.location_json ?? null]
    );
    return json({ ok: true, id });
  }

  // POST /api/time-sessions/check-out
  if (p === "/api/time-sessions/check-out" && method === "POST") {
    const b = body as { break_minutes?: number } | undefined;
    const session = db.query("SELECT * FROM time_sessions WHERE user_id = ? AND tenant_id = ? AND check_out IS NULL ORDER BY created_at DESC LIMIT 1").get(userId, tenantId) as TimeSession | undefined;
    if (!session) return json({ error: "No active session" }, 400);
    const checkIn = new Date(session.check_in).getTime();
    const checkOut = Date.now();
    const totalHours = Math.round(((checkOut - checkIn) / 3600000 - (b?.break_minutes ?? 0) / 60) * 100) / 100;
    db.run("UPDATE time_sessions SET check_out = ?, total_hours = ?, break_minutes = ? WHERE id = ?",
      [now(), totalHours, b?.break_minutes ?? 0, session.id]);
    return json({ ok: true, id: session.id, total_hours: totalHours });
  }

  // GET /api/time-sessions/active
  if (p === "/api/time-sessions/active" && method === "GET") {
    const sessions = db.query("SELECT ts.*, u.username FROM time_sessions ts JOIN users u ON u.id = ts.user_id WHERE ts.tenant_id = ? AND ts.check_out IS NULL").all(tenantId);
    return json(sessions);
  }

  // GET /api/time-sessions/report
  if (p === "/api/time-sessions/report" && method === "GET") {
    const sessions = db.query("SELECT ts.*, u.username FROM time_sessions ts JOIN users u ON u.id = ts.user_id WHERE ts.tenant_id = ? ORDER BY ts.created_at DESC LIMIT 200").all(tenantId);
    return json(sessions);
  }

  // GET /api/tickets
  if (p === "/api/tickets" && method === "GET") {
    let rows;
    if (role === "WORKER" || role === "user") {
      rows = db.query("SELECT * FROM tickets WHERE tenant_id = ? AND created_by = ? ORDER BY created_at DESC").all(tenantId, userId);
    } else {
      rows = db.query("SELECT * FROM tickets WHERE tenant_id = ? ORDER BY created_at DESC").all(tenantId);
    }
    return json(rows);
  }

  // POST /api/tickets
  if (p === "/api/tickets" && method === "POST") {
    const b = body as Partial<Ticket>;
    const id = uuid();
    db.run(
      `INSERT INTO tickets (id, tenant_id, project_id, title, description, category, status, priority, created_by, materials_json, photos_json)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)`,
      [id, tenantId, b.project_id ?? null, b.title, b.description ?? null, b.category ?? "tillägg", b.priority ?? "medium", userId, b.materials_json ?? "[]", b.photos_json ?? "[]"]
    );
    const ticket = db.query("SELECT * FROM tickets WHERE id = ?").get(id);
    return json(ticket, 201);
  }

  // GET /api/tickets/:id
  const ticketGetMatch = p.match(/^\/api\/tickets\/([^/]+)$/);
  if (ticketGetMatch && method === "GET") {
    const ticket = db.query("SELECT * FROM tickets WHERE id = ? AND tenant_id = ?").get(ticketGetMatch[1], tenantId);
    if (!ticket) return json({ error: "Not found" }, 404);
    return json(ticket);
  }

  // PUT /api/tickets/:id
  if (ticketGetMatch && method === "PUT") {
    const b = body as Partial<Ticket>;
    const existing = db.query("SELECT * FROM tickets WHERE id = ? AND tenant_id = ?").get(ticketGetMatch[1], tenantId) as Ticket | undefined;
    if (!existing) return json({ error: "Not found" }, 404);
    db.run(
      `UPDATE tickets SET title = ?, description = ?, category = ?, priority = ?, project_id = ?, materials_json = ?, photos_json = ?, updated_at = ? WHERE id = ?`,
      [b.title ?? existing.title, b.description ?? existing.description, b.category ?? existing.category, b.priority ?? existing.priority, b.project_id ?? existing.project_id, b.materials_json ?? existing.materials_json, b.photos_json ?? existing.photos_json, now(), ticketGetMatch[1]]
    );
    const updated = db.query("SELECT * FROM tickets WHERE id = ?").get(ticketGetMatch[1]);
    return json(updated);
  }

  // POST /api/tickets/:id/submit
  const submitMatch = p.match(/^\/api\/tickets\/([^/]+)\/submit$/);
  if (submitMatch && method === "POST") {
    const ticket = db.query("SELECT * FROM tickets WHERE id = ? AND tenant_id = ? AND created_by = ?").get(submitMatch[1], tenantId, userId) as Ticket | undefined;
    if (!ticket) return json({ error: "Not found or not owner" }, 404);
    if (ticket.status !== "draft") return json({ error: "Already submitted" }, 400);
    db.run("UPDATE tickets SET status = 'pending_review', updated_at = ? WHERE id = ?", [now(), submitMatch[1]]);
    return json({ ok: true, status: "pending_review" });
  }

  // POST /api/tickets/:id/review — leader internal attestation
  const reviewMatch = p.match(/^\/api\/tickets\/([^/]+)\/review$/);
  if (reviewMatch && method === "POST") {
    if (role !== "LEADER" && role !== "ADMIN" && role !== "SUPER_ADMIN") return json({ error: "Forbidden" }, 403);
    const b = body as { approved?: boolean; notes?: string; forward?: boolean; cost_actual?: number } | undefined;
    const ticket = db.query("SELECT * FROM tickets WHERE id = ? AND tenant_id = ?").get(reviewMatch[1], tenantId) as Ticket | undefined;
    if (!ticket) return json({ error: "Not found" }, 404);
    if (ticket.status !== "pending_review") return json({ error: "Ticket not awaiting review" }, 400);
    if (b?.approved) {
      const nextStatus = b?.forward ? "pending_approval" : "approved";
      db.run(
        "UPDATE tickets SET status = ?, reviewed_by = ?, cost_actual = ?, updated_at = ? WHERE id = ?",
        [nextStatus, userId, b?.cost_actual ?? ticket.cost_actual, now(), reviewMatch[1]]
      );
      return json({ ok: true, status: nextStatus });
    }
    db.run("UPDATE tickets SET status = 'draft', reviewed_by = ?, rejected_reason = ?, updated_at = ? WHERE id = ?",
      [userId, b?.notes ?? "Returned by leader", now(), reviewMatch[1]]);
    return json({ ok: true, status: "draft" });
  }

  // POST /api/tickets/:id/reject-internal
  const rejectIntMatch = p.match(/^\/api\/tickets\/([^/]+)\/reject-internal$/);
  if (rejectIntMatch && method === "POST") {
    if (role !== "LEADER" && role !== "ADMIN" && role !== "SUPER_ADMIN") return json({ error: "Forbidden" }, 403);
    const b = body as { reason?: string } | undefined;
    const ticket = db.query("SELECT * FROM tickets WHERE id = ? AND tenant_id = ?").get(rejectIntMatch[1], tenantId) as Ticket | undefined;
    if (!ticket) return json({ error: "Not found" }, 404);
    if (ticket.status !== "pending_review") return json({ error: "Not pending review" }, 400);
    db.run("UPDATE tickets SET status = 'draft', rejected_reason = ?, updated_at = ? WHERE id = ?",
      [b?.reason ?? "Rejected by leader", now(), rejectIntMatch[1]]);
    return json({ ok: true, status: "draft" });
  }

  // POST /api/tickets/:id/approve — client sign-off
  const approveMatch = p.match(/^\/api\/tickets\/([^/]+)\/approve$/);
  if (approveMatch && method === "POST") {
    const ticket = db.query("SELECT * FROM tickets WHERE id = ? AND tenant_id = ?").get(approveMatch[1], tenantId) as Ticket | undefined;
    if (!ticket) return json({ error: "Not found" }, 404);
    if (ticket.status !== "pending_approval") return json({ error: "Ticket not awaiting client approval" }, 400);
    db.run("UPDATE tickets SET status = 'approved', approved_by = ?, approved_at = ?, locked_at = ?, updated_at = ? WHERE id = ?",
      [userId, now(), now(), now(), approveMatch[1]]);
    return json({ ok: true, status: "approved", locked_at: now() });
  }

  // POST /api/tickets/:id/reject — client reject
  const rejectMatch = p.match(/^\/api\/tickets\/([^/]+)\/reject$/);
  if (rejectMatch && method === "POST") {
    const b = body as { reason?: string } | undefined;
    const ticket = db.query("SELECT * FROM tickets WHERE id = ? AND tenant_id = ?").get(rejectMatch[1], tenantId) as Ticket | undefined;
    if (!ticket) return json({ error: "Not found" }, 404);
    if (ticket.status !== "pending_approval") return json({ error: "Not pending approval" }, 400);
    db.run("UPDATE tickets SET status = 'rejected', rejected_reason = ?, updated_at = ? WHERE id = ?",
      [b?.reason ?? "Rejected by client", now(), rejectMatch[1]]);
    return json({ ok: true, status: "rejected" });
  }

  // POST /api/tickets/:id/lock
  const lockMatch = p.match(/^\/api\/tickets\/([^/]+)\/lock$/);
  if (lockMatch && method === "POST") {
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") return json({ error: "Forbidden" }, 403);
    const ticket = db.query("SELECT * FROM tickets WHERE id = ? AND tenant_id = ?").get(lockMatch[1], tenantId) as Ticket | undefined;
    if (!ticket) return json({ error: "Not found" }, 404);
    if (ticket.status !== "approved") return json({ error: "Only approved tickets can be locked" }, 400);
    db.run("UPDATE tickets SET locked_at = ?, updated_at = ? WHERE id = ?", [now(), now(), lockMatch[1]]);
    return json({ ok: true, locked_at: now() });
  }

  // POST /api/tickets/:id/invoice
  const invoiceMatch = p.match(/^\/api\/tickets\/([^/]+)\/invoice$/);
  if (invoiceMatch && method === "POST") {
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") return json({ error: "Forbidden" }, 403);
    const b = body as { invoice_ref?: string } | undefined;
    const ticket = db.query("SELECT * FROM tickets WHERE id = ? AND tenant_id = ?").get(invoiceMatch[1], tenantId) as Ticket | undefined;
    if (!ticket) return json({ error: "Not found" }, 404);
    if (ticket.status !== "approved") return json({ error: "Only approved tickets can be invoiced" }, 400);
    db.run("UPDATE tickets SET status = 'invoiced', invoiced_at = ?, invoice_ref = ?, updated_at = ? WHERE id = ?",
      [now(), b?.invoice_ref ?? null, now(), invoiceMatch[1]]);
    return json({ ok: true, status: "invoiced" });
  }

  // === Time Blocks ===

  // GET /api/tickets/:id/time-blocks
  const tbListMatch = p.match(/^\/api\/tickets\/([^/]+)\/time-blocks$/);
  if (tbListMatch && method === "GET") {
    const blocks = db.query("SELECT * FROM time_blocks WHERE ticket_id = ? ORDER BY date DESC").all(tbListMatch[1]);
    return json(blocks);
  }

  // POST /api/tickets/:id/time-blocks
  if (tbListMatch && method === "POST") {
    const b = body as Partial<TimeBlock>;
    const id = uuid();
    db.run(
      `INSERT INTO time_blocks (id, ticket_id, user_id, date, check_in, check_out, hours, break_hours, description, hourly_rate, overtime, overtime_hours, overtime_rate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, tbListMatch[1], userId, b.date ?? now().slice(0, 10), b.check_in ?? null, b.check_out ?? null, b.hours ?? 0, b.break_hours ?? 0, b.description ?? null, b.hourly_rate ?? null, b.overtime ? 1 : 0, b.overtime_hours ?? 0, b.overtime_rate ?? null]
    );
    const block = db.query("SELECT * FROM time_blocks WHERE id = ?").get(id);
    return json(block, 201);
  }

  // PUT /api/tickets/:id/time-blocks/:blockId
  const tbUpdateMatch = p.match(/^\/api\/tickets\/([^/]+)\/time-blocks\/([^/]+)$/);
  if (tbUpdateMatch && method === "PUT") {
    const b = body as Partial<TimeBlock>;
    const existing = db.query("SELECT * FROM time_blocks WHERE id = ?").get(tbUpdateMatch[2]) as TimeBlock | undefined;
    if (!existing) return json({ error: "Not found" }, 404);
    db.run(
      "UPDATE time_blocks SET date = ?, check_in = ?, check_out = ?, hours = ?, break_hours = ?, description = ?, hourly_rate = ?, overtime = ?, overtime_hours = ?, overtime_rate = ? WHERE id = ?",
      [b.date ?? existing.date, b.check_in ?? existing.check_in, b.check_out ?? existing.check_out, b.hours ?? existing.hours, b.break_hours ?? existing.break_hours, b.description ?? existing.description, b.hourly_rate ?? existing.hourly_rate, b.overtime ? 1 : 0, b.overtime_hours ?? existing.overtime_hours, b.overtime_rate ?? existing.overtime_rate, tbUpdateMatch[2]]
    );
    return json({ ok: true });
  }

  // DELETE /api/tickets/:id/time-blocks/:blockId
  if (tbUpdateMatch && method === "DELETE") {
    if (role !== "LEADER" && role !== "ADMIN" && role !== "SUPER_ADMIN") return json({ error: "Forbidden" }, 403);
    db.run("DELETE FROM time_blocks WHERE id = ?", [tbUpdateMatch[2]]);
    return json({ ok: true });
  }

  // === Price Lists ===

  // GET /api/price-lists
  if (p === "/api/price-lists" && method === "GET") {
    const lists = db.query("SELECT * FROM price_lists WHERE tenant_id = ? AND active = 1 ORDER BY name").all(tenantId);
    return json(lists);
  }

  // POST /api/price-lists
  if (p === "/api/price-lists" && method === "POST") {
    if (role !== "LEADER" && role !== "ADMIN" && role !== "SUPER_ADMIN") return json({ error: "Forbidden" }, 403);
    const b = body as Partial<PriceList>;
    const id = uuid();
    db.run("INSERT INTO price_lists (id, tenant_id, name, items_json) VALUES (?, ?, ?, ?)",
      [id, tenantId, b.name, b.items_json ?? "[]"]);
    const list = db.query("SELECT * FROM price_lists WHERE id = ?").get(id);
    return json(list, 201);
  }

  // PUT /api/price-lists/:id
  const plMatch = p.match(/^\/api\/price-lists\/([^/]+)$/);
  if (plMatch && method === "PUT") {
    if (role !== "LEADER" && role !== "ADMIN" && role !== "SUPER_ADMIN") return json({ error: "Forbidden" }, 403);
    const b = body as Partial<PriceList>;
    const existing = db.query("SELECT * FROM price_lists WHERE id = ? AND tenant_id = ?").get(plMatch[1], tenantId) as PriceList | undefined;
    if (!existing) return json({ error: "Not found" }, 404);
    db.run("UPDATE price_lists SET name = ?, items_json = ?, active = ?, valid_from = ?, valid_to = ? WHERE id = ?",
      [b.name ?? existing.name, b.items_json ?? existing.items_json, b.active !== undefined ? (b.active ? 1 : 0) : existing.active ? 1 : 0, b.valid_from ?? existing.valid_from, b.valid_to ?? existing.valid_to, plMatch[1]]);
    return json({ ok: true });
  }

  // DELETE /api/price-lists/:id (deactivate)
  if (plMatch && method === "DELETE") {
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") return json({ error: "Forbidden" }, 403);
    db.run("UPDATE price_lists SET active = 0 WHERE id = ? AND tenant_id = ?", [plMatch[1], tenantId]);
    return json({ ok: true });
  }

  // === Reports ===

  // GET /api/reports/weekly-summary
  if (p === "/api/reports/weekly-summary" && method === "GET") {
    const tickets = db.query("SELECT * FROM tickets WHERE tenant_id = ? AND created_by = ? AND created_at >= datetime('now', '-7 days') ORDER BY created_at DESC").all(tenantId, userId);
    const totalHours = db.query("SELECT COALESCE(SUM(tb.hours), 0) as total FROM time_blocks tb JOIN tickets t ON t.id = tb.ticket_id WHERE t.tenant_id = ? AND tb.user_id = ? AND tb.date >= date('now', '-7 days')").get(tenantId, userId) as { total: number } | undefined;
    return json({ tickets, total_hours: totalHours?.total ?? 0 });
  }

  // GET /api/reports/project-budget
  if (p === "/api/reports/project-budget" && method === "GET") {
    if (role !== "LEADER" && role !== "ADMIN" && role !== "SUPER_ADMIN") return json({ error: "Forbidden" }, 403);
    const projects = db.query("SELECT * FROM projects WHERE tenant_id = ? AND status = 'active'").all(tenantId) as Array<{ id: string; name: string }>;
    const result = projects.map(p => {
      const hours = db.query("SELECT COALESCE(SUM(tb.hours), 0) as total FROM time_blocks tb JOIN tickets t ON t.id = tb.ticket_id WHERE t.project_id = ?").get(p.id) as { total: number };
      return { project_id: p.id, name: p.name, total_hours: hours.total };
    });
    return json(result);
  }

  // GET /api/reports/ticket-status
  if (p === "/api/reports/ticket-status" && method === "GET") {
    const counts = db.query(
      "SELECT status, COUNT(*) as count FROM tickets WHERE tenant_id = ? GROUP BY status", [tenantId]
    ).all() as Array<{ status: string; count: number }>;
    const total = db.query("SELECT COUNT(*) as total FROM tickets WHERE tenant_id = ?", [tenantId]).get() as { total: number };
    return json({ counts, total: total.total });
  }

  // GET /api/invoices/approved-tickets
  if (p === "/api/invoices/approved-tickets" && method === "GET") {
    if (role !== "LEADER" && role !== "ADMIN" && role !== "SUPER_ADMIN") return json({ error: "Forbidden" }, 403);
    const tickets = db.query("SELECT * FROM tickets WHERE tenant_id = ? AND status = 'approved' ORDER BY updated_at DESC").all(tenantId);
    return json(tickets);
  }

  return null;
}
