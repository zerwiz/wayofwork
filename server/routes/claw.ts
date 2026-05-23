import { json } from "../utils";
import { buildClawHostTree } from "../tree";
import { getClawAutomationStatus } from "../claw-automation-status";
import { readClawMissionEvents } from "../claw-mission-events";
import { 
	readClawSchedulesMerged, 
	writeClawSchedulesDefinitions,
	normalizeSchedule
} from "../claw-schedules-store";
import {
	clawWebhookConfigured,
	clawWebhookInboundEnabled,
	ensureWebhookSecret,
	readWebhookSecret,
	rotateWebhookSecret,
	verifyWebhookBearer,
} from "../claw-webhook-store";
import { getClawTelegramIntegrationStatus } from "../claw-telegram-status";
import { getClawWhatsAppIntegrationStatus } from "../claw-whatsapp-status";
import { executeClawAutomation } from "../claw-schedule-executor";
import type { Router } from "../router";

export function registerClawRoutes(router: Router) {
	router.get("/api/claw/telegram/status", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			return json(getClawTelegramIntegrationStatus());
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ version: 1, error: message }, 500);
		}
	});

	router.get("/api/claw/whatsapp/status", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			return json(getClawWhatsAppIntegrationStatus());
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ version: 1, error: message }, 500);
		}
	});

	router.post("/api/claw/webhook/ensure", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			const r = await ensureWebhookSecret();
			return json({ ok: true, created: r.created, secret: r.secret });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ ok: false, error: message }, 500);
		}
	});

	router.post("/api/claw/webhook/rotate", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			const secret = await rotateWebhookSecret();
			return json({ ok: true, secret });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ ok: false, error: message }, 500);
		}
	});

	router.get("/api/claw/webhook/meta", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		return json({
			version: 1,
			configured: clawWebhookConfigured(),
			inboundEnabled: clawWebhookInboundEnabled(),
		});
	});

	router.post("/api/claw/inbound", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const secret = await readWebhookSecret();
		if (!secret) {
			return json({ ok: false, error: "No webhook secret — use POST /api/claw/webhook/ensure first." }, 404);
		}
		if (!clawWebhookInboundEnabled()) {
			return json({ ok: false, error: "Inbound webhook disabled (WOP_CLAW_INBOUND)." }, 403);
		}
		const authHeaderStr = req.headers.get("authorization");
		if (!verifyWebhookBearer(authHeaderStr, secret)) {
			return json({ ok: false, error: "Unauthorized" }, 401);
		}
		let body: Record<string, unknown>;
		try {
			body = (await req.json()) as Record<string, unknown>;
		} catch {
			return json({ ok: false, error: "Invalid JSON" }, 400);
		}
		const prompt = String(body.prompt ?? "").trim();
		if (!prompt) return json({ ok: false, error: "prompt required" }, 400);
		const agentRaw = body.agentName;
		const agentName = agentRaw === null || agentRaw === undefined ? null : typeof agentRaw === "string" ? agentRaw.trim() || null : null;
		const name = String(body.name ?? "Inbound webhook").trim() || "Inbound webhook";
		try {
			const r = await executeClawAutomation({
				name,
				prompt,
				agentName,
				source: "webhook",
				tenantId: auth?.tenantId || "default",
				userId: auth?.userId || "system",
			}) as any;
			if (r.ok) return json({ ok: true });
			return json({ ok: false, error: r.error }, 500);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ ok: false, error: message }, 500);
		}
	});
	router.get("/api/claw/tree", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			const { rootDisplay, nodes } = await buildClawHostTree();
			return json({ rootDisplay, nodes });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: message }, 500);
		}
	});

	router.get("/api/claw/automation", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			return json(getClawAutomationStatus());
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ version: 1, error: message }, 500);
		}
	});

	router.get("/api/claw/mission-events", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			const events = await readClawMissionEvents(40);
			return json({ version: 1, events });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ version: 1, events: [], error: message }, 500);
		}
	});

	router.get("/api/claw/schedules", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			const schedules = await readClawSchedulesMerged();
			return json({ version: 1, schedules });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ version: 1, schedules: [], error: message }, 500);
		}
	});

	router.put("/api/claw/schedules", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: Record<string, unknown>;
		try {
			body = (await req.json()) as Record<string, unknown>;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		const raw = body.schedules;
		if (!Array.isArray(raw)) return json({ error: "schedules array required" }, 400);
		const coerced = raw.map(normalizeSchedule).filter((s): s is NonNullable<typeof s> => s !== null);
		try {
			await writeClawSchedulesDefinitions(coerced);
			const schedules = await readClawSchedulesMerged();
			return json({ ok: true, version: 1, schedules });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ ok: false, error: message }, 500);
		}
	});
}
