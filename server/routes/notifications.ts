import { json } from "../utils";
import { db } from "../db";
import { notifyUser } from "../notifications";
import type { Router } from "../router";

export function registerNotificationRoutes(router: Router) {
	router.get("/api/notifications", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const url = new URL(req.url);
		const unreadOnly = url.searchParams.get("unread") === "true";
		const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
		const sql = unreadOnly
			? "SELECT * FROM notifications WHERE tenant_id = ? AND user_id = ? AND read = 0 ORDER BY created_at DESC LIMIT ?"
			: "SELECT * FROM notifications WHERE tenant_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT ?";
		const rows = db.query(sql).all(auth.tenantId, auth.userId, limit) as any[];
		const unreadCount = (db.query("SELECT COUNT(*) as count FROM notifications WHERE tenant_id = ? AND user_id = ? AND read = 0").get(auth.tenantId, auth.userId) as any).count;
		return json({ notifications: rows, unreadCount });
	});

	router.post("/api/notifications/:id/read", async (_req, params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		db.query("UPDATE notifications SET read = 1 WHERE id = ? AND tenant_id = ? AND user_id = ?")
			.run(params.id, auth.tenantId, auth.userId);
		return json({ ok: true });
	});

	router.post("/api/notifications/read-all", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		db.query("UPDATE notifications SET read = 1 WHERE tenant_id = ? AND user_id = ? AND read = 0")
			.run(auth.tenantId, auth.userId);
		return json({ ok: true });
	});

	router.delete("/api/notifications/:id", async (_req, params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		db.query("DELETE FROM notifications WHERE id = ? AND tenant_id = ? AND user_id = ?")
			.run(params.id, auth.tenantId, auth.userId);
		return json({ ok: true });
	});
}
