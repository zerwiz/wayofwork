import { json } from "../utils";
import { db } from "../db";
import type { Router } from "../router";

export function registerCalendarRoutes(router: Router) {
	router.get("/api/calendar/events", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			const events = db.query("SELECT * FROM calendar_events WHERE tenant_id = ? AND (user_id = ? OR created_by = ?)").all(auth.tenantId, auth.userId, auth.userId) as any[];
			return json(events || []);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch events", details: message }, 500);
		}
	});

	router.post("/api/calendar/events", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: { title?: string; description?: string; start_date?: string; end_date?: string; all_day?: boolean; project_id?: string; user_id?: string };
		try {
			body = (await req.json()) as any;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		if (!body.title || !body.start_date || !body.end_date) return json({ error: "Title, start_date and end_date required" }, 400);
		try {
			const id = `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
			db.query(`
				INSERT INTO calendar_events (id, tenant_id, user_id, project_id, title, description, start_date, end_date, all_day, created_by)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`).run(id, auth.tenantId, body.user_id || auth.userId, body.project_id || null, body.title, body.description || null, body.start_date, body.end_date, body.all_day ? 1 : 0, auth.userId);
			const event = db.query("SELECT * FROM calendar_events WHERE id = ?").get(id);
			return json(event);
		} catch (e) {
			return json({ error: "Failed to create event" }, 500);
		}
	});

	router.put("/api/calendar/events/:id", async (req, params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const eventId = params.id;
		let body: { title?: string; description?: string; start_date?: string; end_date?: string; all_day?: boolean; project_id?: string };
		try {
			body = (await req.json()) as any;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		try {
			db.query(`
				UPDATE calendar_events 
				SET title = COALESCE(?, title), 
				    description = COALESCE(?, description), 
				    start_date = COALESCE(?, start_date), 
				    end_date = COALESCE(?, end_date), 
				    all_day = COALESCE(?, all_day), 
				    project_id = COALESCE(?, project_id)
				WHERE id = ? AND tenant_id = ?
			`).run(body.title, body.description, body.start_date, body.end_date, body.all_day !== undefined ? (body.all_day ? 1 : 0) : undefined, body.project_id, eventId, auth.tenantId);
			const event = db.query("SELECT * FROM calendar_events WHERE id = ?").get(eventId);
			return json(event);
		} catch (e) {
			return json({ error: "Failed to update event" }, 500);
		}
	});

	router.delete("/api/calendar/events/:id", async (_req, params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			db.query("DELETE FROM calendar_events WHERE id = ? AND tenant_id = ?").run(params.id, auth.tenantId);
			return json({ ok: true });
		} catch (e) {
			return json({ error: "Failed to delete event" }, 500);
		}
	});
}
