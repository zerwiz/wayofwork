import { existsSync } from "node:fs";
import { join } from "node:path";
import { applyAutoSync } from "./workspace-index";
import { broadcastToolLog } from "./tool-log-broadcast";
import { getWorkspaceRoot } from "./paths";
import { startClawScheduler } from "./claw-scheduler";
import { verifyToken } from "./auth";
import { handleTicketApi } from "./tickets-api";
import { handleOfferInvoiceApi } from "./offers-api";
import { handlePendingChangesApi } from "./pending-changes-api";
import { tunnelGateAllowsBunRequest, tunnelGateUnauthorizedResponse } from "./tunnel-gate";
import { terminalAllowed } from "./terminal-ws";
import { startNgrokTunnelDev } from "./ngrok-tunnel-manager";
import {
	authoritativeRuntimeEnabled,
	wopChatEngineFromEnv,
} from "./agent-runtime";
import { json } from "./utils";
import { Router } from "./router";
import { registerAuthRoutes } from "./routes/auth";
import { registerPortalRoutes } from "./routes/portal";
import { registerAdminRoutes } from "./routes/admin";
import { registerClientRoutes } from "./routes/client";
import { registerProjectRoutes } from "./routes/projects";
import { registerCalendarRoutes } from "./routes/calendar";
import { registerTAPlannerExtensionRoutes } from "../.wo/extensions/ta-planner-extension";
import { registerClawRoutes } from "./routes/claw";
import { registerSystemRoutes } from "./routes/system";
import { registerDevRoutes } from "./routes/dev";
import { registerNativeDialogRoutes } from "./routes/native-dialog";
import { registerChannelRoutes } from "./routes/channels";
import { registerBugReportRoutes } from "./routes/bug-reports";
import { registerWorkspaceRoutes } from "./routes/workspace";
import { registerGithubRoutes } from "./routes/github";
import { registerFileSystemRoutes } from "./routes/file-system";
import { registerConfigRoutes } from "./routes/config";
import { registerNotificationRoutes } from "./routes/notifications";
import { db } from "./db";

// Integrated terminal: in production (`NODE_ENV=production`) keep opt-in via WOP_ALLOW_TERMINAL only.
// In non-production, default on when unset so local `npm run dev` gets a real shell; disable with WOP_ALLOW_TERMINAL=0|false|no|off.
// `npm run dev` forces NODE_ENV=development for the Bun process so an inherited NODE_ENV=production cannot skip this default.
if (process.env.NODE_ENV !== "production") {
	const v = process.env.WOP_ALLOW_TERMINAL?.trim();
	if (v === undefined || v === "") {
		process.env.WOP_ALLOW_TERMINAL = "1";
	}
}

const PORT = Number(process.env.WOP_SERVER_PORT || "3333");
const DIST = join(import.meta.dir, "..", "dist");

import { 
	websocketHandler, 
	type ServerWsData, 
	type ChatWsData 
} from "./ws-handler";

const apiRouter = new Router();
registerAuthRoutes(apiRouter);
registerPortalRoutes(apiRouter);
registerAdminRoutes(apiRouter);
registerClientRoutes(apiRouter);
registerProjectRoutes(apiRouter);
registerCalendarRoutes(apiRouter);
registerTAPlannerExtensionRoutes(apiRouter);
registerClawRoutes(apiRouter);
registerSystemRoutes(apiRouter);
registerDevRoutes(apiRouter);
registerNativeDialogRoutes(apiRouter);
registerChannelRoutes(apiRouter);
registerBugReportRoutes(apiRouter);
registerWorkspaceRoutes(apiRouter);
registerGithubRoutes(apiRouter);
registerFileSystemRoutes(apiRouter);
registerConfigRoutes(apiRouter);
registerNotificationRoutes(apiRouter);

async function handleApi(url: URL, req: Request): Promise<Response> {
	const authHeader = req.headers.get("Authorization");
	const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
	let auth = token ? await verifyToken(token) : null;

	console.log(`[API] ${req.method} ${url.pathname} (Authenticated: ${!!auth}, Role: ${auth?.role})`);

	const routerRes = await apiRouter.handle(url, req, auth);
	if (routerRes) {
		console.log(`[API] Router handled: ${url.pathname}`);
		return routerRes;
	}

	const p = url.pathname.replace(/\/{2,}/g, "/").replace(/\/+$/, "") || "/";

	if (req.method === "OPTIONS" && p.startsWith("/api/")) {
		return new Response(null, {
			status: 204,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, DELETE, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
				"Access-Control-Max-Age": "86400",
			},
		});
	}

	if (!auth) {
		const isPublicRoute = p === "/api/manifest" || p === "/api/config" || p === "/api/health";
		if (!isPublicRoute) return json({ error: "Unauthorized" }, 401);
	}

	const ticketRes = await handleTicketApi(p, req.method, auth, req);
	if (ticketRes) return ticketRes;

	const offerRes = await handleOfferInvoiceApi(p, req.method, auth, req);
	if (offerRes) return offerRes;

	const pendingRes = await handlePendingChangesApi(p, req.method, auth, req);
	if (pendingRes) return pendingRes;

	return json({ error: "Not found" }, 404);
}

function serveStatic(pathname: string): Response | null {
	if (!existsSync(DIST)) return null;
	let rel = pathname === "/" || pathname === "" ? "index.html" : pathname.replace(/^\/+/, "");
	if (rel.includes("..")) return null;
	const file = join(DIST, rel);
	const distNorm = join(DIST, ".");
	if (!file.startsWith(distNorm)) return null;
	if (existsSync(file)) {
		return new Response(Bun.file(file));
	}
	if (!rel.includes(".")) {
		const idx = join(DIST, "index.html");
		if (existsSync(idx)) return new Response(Bun.file(idx));
	}
	return null;
}

const server = Bun.serve<ServerWsData>({
	port: PORT,
	async fetch(req, srv) {
		if (!tunnelGateAllowsBunRequest(req)) {
			return tunnelGateUnauthorizedResponse();
		}
		const url = new URL(req.url);

		if (url.pathname === "/ws/terminal" && req.headers.get("upgrade") === "websocket") {
			if (!terminalAllowed()) {
				return new Response(
					"Terminal disabled. Set WOP_ALLOW_TERMINAL=1 on the server and restart.",
					{ status: 403 },
				);
			}
			const upgraded = srv.upgrade(req, {
				data: {
					kind: "terminal",
					id: `term_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
					auth: null, // will be verified after upgrade if needed or before
				} as any,
			});
			if (upgraded) return undefined as unknown as Response;
			return new Response("WebSocket upgrade failed", { status: 500 });
		}

		if (
			url.pathname.startsWith("/ws") &&
			req.headers.get("upgrade")?.toLowerCase() === "websocket"
		) {
			const authHeader = req.headers.get("Authorization") || url.searchParams.get("token");
			const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
			const auth = token ? await verifyToken(token) : null;
			if (!auth) return new Response("Unauthorized", { status: 401 });

			const upgraded = srv.upgrade(req, {
				data: {
					kind: "chat",
					messages: [],
					busy: false,
					pendingChatQueue: [],
					chatMode: (url.searchParams.get("mode") as any) || "build",
					agentName: url.searchParams.get("agent") || null,
					cachedAgentBody: null,
					cachedAgentSkills: null,
					chatAbort: null,
					cumPromptTokens: 0,
					cumCompletionTokens: 0,
				wopSessionKey: url.searchParams.get("wopSessionKey") || null,
				surface: url.searchParams.get("surface") || null,
				lang: url.searchParams.get("lang") || undefined,
				tenantId: auth.tenantId,
					userId: auth.userId,
				} satisfies ChatWsData,
			});

			if (upgraded) return undefined as unknown as Response;
			return new Response("WebSocket upgrade failed", { status: 500 });
		}

		if (url.pathname.startsWith("/api/")) {
			return handleApi(url, req);
		}

		const staticRes = serveStatic(url.pathname);
		if (staticRes) return staticRes;

		return new Response("Not found", { status: 404 });
	},
	websocket: websocketHandler,
});

const _bootEngineMode = wopChatEngineFromEnv();
const _bootPiDrives = authoritativeRuntimeEnabled();
console.log(
	`Way of Work server http://127.0.0.1:${server.port} workspace=${getWorkspaceRoot()} chatEngine=${_bootEngineMode} piDrivesChat=${_bootPiDrives} manifest=/api/manifest`,
);

// Start the workspace-index auto-sync timer based on saved options.
void applyAutoSync((result) => {
	broadcastToolLog(
		"INFO",
		"index",
		`auto-sync: files=${result.state.fileCount} fingerprint=${result.state.merkleRoot}`,
	);
});

startClawScheduler();

// Start Telegram — set up webhooks when public HTTPS URL is available, otherwise poll
void (async () => {
	const { setupTelegramWebhooks, startPollingFallback } = await import("./telegram-bot");
	const publicUrl = process.env.WOP_PUBLIC_URL || `http://127.0.0.1:${PORT}`;
	if (!publicUrl.startsWith("https://")) {
		console.log("[telegram-bot] No HTTPS public URL — using polling");
		startPollingFallback();
	} else {
		const failedBotIds = await setupTelegramWebhooks(publicUrl);
		if (failedBotIds.length > 0) {
			startPollingFallback(failedBotIds);
		}
	}
})();

// Construction triggers: weather, ID06, materials — check hourly
setInterval(async () => {
  const { checkConstructionTriggers } = await import("./construction-triggers");
  const tenants = db.query("SELECT id FROM tenants").all() as { id: string }[];
  for (const t of tenants) checkConstructionTriggers(t.id);
}, 3600000);
// Check once on startup after a short delay
setTimeout(async () => {
  const { checkConstructionTriggers } = await import("./construction-triggers");
  const tenants = db.query("SELECT id FROM tenants").all() as { id: string }[];
  for (const t of tenants) checkConstructionTriggers(t.id);
}, 30000);

if (process.env.WOP_NGROK_DOMAIN) {
	void (async () => {
		// Wait a bit for Vite to potentially start, though startNgrokTunnelDev has its own probe.
		await Bun.sleep(5000);
		const r = await startNgrokTunnelDev();
		if (r.ok) {
			console.log(`[ngrok] Auto-started tunnel: ${r.publicUrl}`);
		} else {
			// Only log if it's not "already running" (though startNgrokTunnelDev returns ok: true for that).
			console.warn(`[ngrok] Auto-start skipped: ${r.message}`);
		}
	})();
}
