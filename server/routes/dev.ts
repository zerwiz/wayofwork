import { json } from "../utils";
import { 
	getNgrokTunnelDevJson, 
	startNgrokTunnelDev, 
	stopNgrokTunnelDev, 
	configureNgrokAuthtokenDev, 
	installNgrokBundledDev, 
	updateNgrokBundledDev 
} from "../ngrok-tunnel-manager";
import { getTunnelGateDevStatusJson, applyTunnelGateDevPost } from "../tunnel-gate";
import { getShareUrlHintsJson } from "../share-url-hints";
import type { Router } from "../router";

export function registerDevRoutes(router: Router) {
	router.get("/api/dev/ngrok-tunnel", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const data = await getNgrokTunnelDevJson();
		return json(data);
	});

	router.post("/api/dev/ngrok-tunnel", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: Record<string, unknown>;
		try {
			body = (await req.json()) as Record<string, unknown>;
		} catch {
			return json({ ok: false, message: "Invalid JSON" }, 400);
		}
		const action = String(body.action ?? "").trim().toLowerCase();
		if (action === "start") {
			const r = await startNgrokTunnelDev();
			return json(r);
		}
		if (action === "stop") {
			const r = await stopNgrokTunnelDev();
			return json(r);
		}
		if (action === "set-authtoken") {
			const r = await configureNgrokAuthtokenDev(String(body.authtoken ?? ""));
			return json(r);
		}
		if (action === "install-bundled") {
			const r = await installNgrokBundledDev();
			return json(r);
		}
		if (action === "update-bundled") {
			const r = await updateNgrokBundledDev();
			return json(r);
		}
		return json({ ok: false, message: "Unknown action" }, 400);
	});

	router.get("/api/dev/tunnel-gate", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		return json(getTunnelGateDevStatusJson());
	});

	router.post("/api/dev/tunnel-gate", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: Record<string, unknown>;
		try {
			body = (await req.json()) as Record<string, unknown>;
		} catch {
			return json({ ok: false, message: "Invalid JSON" }, 400);
		}
		const r = await applyTunnelGateDevPost(body);
		return json(r);
	});

	router.get("/api/dev/share-url-hints", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const data = await getShareUrlHintsJson();
		return json(data);
	});
}
