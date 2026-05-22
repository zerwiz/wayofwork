import { json } from "../utils";
import { db } from "../db";
import type { Router } from "../router";
import { auditLog } from "../audit-logger";

export function registerTAPlannerRoutes(router: Router) {
	// GET /api/ta-plans - List all TA plans for the tenant
	router.get("/api/ta-plans", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			const plans = db.query(`
				SELECT * FROM ta_plans 
				WHERE tenant_id = ? 
				ORDER BY created_at DESC
			`).all(auth.tenantId) as any[];
			return json(plans || []);
		} catch (e) {
			return json({ error: "Failed to fetch TA plans" }, 500);
		}
	});

	// GET /api/ta-plans/:id - Get TA plan detail
	router.get("/api/ta-plans/:id", async (_req, params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			const plan = db.query("SELECT * FROM ta_plans WHERE id = ? AND tenant_id = ?")
				.get(params.id, auth.tenantId) as any;
			if (!plan) return json({ error: "Plan not found" }, 404);
			return json(plan);
		} catch (e) {
			return json({ error: "Failed to fetch TA plan" }, 500);
		}
	});

	// POST /api/ta-plans - Create a new TA plan
	router.post("/api/ta-plans", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: any;
		try {
			body = await req.json();
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}

		if (!body.title) return json({ error: "Title required" }, 400);

		try {
			const id = `tap_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
			db.query(`
				INSERT INTO ta_plans (
					id, tenant_id, project_id, title, road_number, speed_limit, 
					traffic_volume_adt, work_type, sketch_id, risk_assessment_json, 
					validation_status, status, created_by
				)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)
			`).run(
				id, auth.tenantId, body.project_id || null, body.title, body.road_number || null,
				body.speed_limit || null, body.traffic_volume_adt || null, body.work_type || 'fixed',
				body.sketch_id || null, JSON.stringify(body.risk_assessment || {}),
				'valid', auth.userId
			);

			auditLog({
				tenantId: auth.tenantId,
				userId: auth.userId,
				action: "CREATE",
				resourceType: "ta_plan",
				resourceId: id,
				summary: `User created TA plan: ${body.title}`
			});

			const plan = db.query("SELECT * FROM ta_plans WHERE id = ?").get(id);
			return json(plan);
		} catch (e) {
			return json({ error: "Failed to create TA plan" }, 500);
		}
	});

	// PUT /api/ta-plans/:id - Update TA plan
	router.put("/api/ta-plans/:id", async (req, params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: any;
		try {
			body = await req.json();
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}

		try {
			const existing = db.query("SELECT * FROM ta_plans WHERE id = ? AND tenant_id = ?").get(params.id, auth.tenantId);
			if (!existing) return json({ error: "Plan not found" }, 404);

			db.query(`
				UPDATE ta_plans SET
					title = COALESCE(?, title),
					road_number = COALESCE(?, road_number),
					speed_limit = COALESCE(?, speed_limit),
					traffic_volume_adt = COALESCE(?, traffic_volume_adt),
					work_type = COALESCE(?, work_type),
					sketch_id = COALESCE(?, sketch_id),
					risk_assessment_json = COALESCE(?, risk_assessment_json),
					status = COALESCE(?, status),
					updated_at = datetime('now')
				WHERE id = ? AND tenant_id = ?
			`).run(
				body.title, body.road_number, body.speed_limit, body.traffic_volume_adt,
				body.work_type, body.sketch_id, 
				body.risk_assessment ? JSON.stringify(body.risk_assessment) : null,
				body.status, params.id, auth.tenantId
			);

			const plan = db.query("SELECT * FROM ta_plans WHERE id = ?").get(params.id);
			return json(plan);
		} catch (e) {
			return json({ error: "Failed to update TA plan" }, 500);
		}
	});

	// DELETE /api/ta-plans/:id - Delete TA plan
	router.delete("/api/ta-plans/:id", async (_req, params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			const existing = db.query("SELECT * FROM ta_plans WHERE id = ? AND tenant_id = ?").get(params.id, auth.tenantId);
			if (!existing) return json({ error: "Plan not found" }, 404);

			db.query("DELETE FROM ta_plans WHERE id = ? AND tenant_id = ?").run(params.id, auth.tenantId);
			return json({ ok: true });
		} catch (e) {
			return json({ error: "Failed to delete TA plan" }, 500);
		}
	});

	// ── Trafikverket Proxy ──

	router.get("/api/trafikverket/road-data", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const url = new URL(req.url);
		const roadNumber = url.searchParams.get("road");
		if (!roadNumber) return json({ error: "road parameter required" }, 400);

		// Mock implementation for now - would use real Trafikverket API with API Key
		// TDOK 2024:0043 requires road data for validation
		return json({
			roadNumber,
			speedLimit: 70,
			trafficVolume: 1500,
			region: "Stockholm",
			source: "mock-trafikverket-api"
		});
	});
}
