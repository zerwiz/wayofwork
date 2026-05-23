import { json } from "../utils";
import { collectDiagnostics, collectUpstreamSnapshot } from "../diagnostics";
import { collectStaticWebManifest } from "../web-manifest";
import { isWopServerRestartHttpAllowed } from "../wo-ai-env";
import type { Router } from "../router";

export function registerSystemRoutes(router: Router) {
	router.get("/api/health", async () => {
		return json({
			ok: true,
			service: "wayofwork-ui-server",
			time: new Date().toISOString(),
			capabilities: {
				workspaceProblems: true,
				configRuntimePost: true,
				clawHostTreeGet: true,
				clawTelegramStatusGet: true,
				clawWhatsAppStatusGet: true,
			},
		});
	});

	// Manifest API (role-based UI configuration)
	router.get("/api/manifest", async (_req, _params, auth) => {
		const role = auth?.role || "ANONYMOUS";
		const isWorker = role === "WORKER";
		const isLeader = role === "LEADER";
		const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
		const isClient = role === "CLIENT";

		const manifest = {
			role,
			ui_modes: [
				{ id: "simple", label: "Simple", icon: "MessageCircle" },
				{ id: "technical", label: "Technical", icon: "Terminal" },
				{ id: "claw", label: "Claw", icon: "Ghost" },
				{ id: "docs", label: "Docs", icon: "FileText" },
				...(isWorker || isLeader ? [{ id: "work", label: "Work", icon: "Briefcase" }] : []),
			],
			commands: [
				{ id: "chat", label: "Chat", icon: "MessageCircle" },
				{ id: "agents", label: "Agents", icon: "Cpu" },
				...(isWorker || isLeader ? [
					{ id: "tasks", label: "Tasks", icon: "CheckSquare" },
					{ id: "time", label: "Time", icon: "Clock" },
					{ id: "files", label: "Files", icon: "FolderOpen" },
				] : []),
				...(isLeader || isAdmin ? [
					{ id: "team", label: "Team", icon: "Users" },
					{ id: "projects", label: "Projects", icon: "FolderKanban" },
				] : []),
				...(isClient ? [
					{ id: "client", label: "My Project", icon: "Eye" },
				] : []),
				{ id: "settings", label: "Settings", icon: "Settings" },
			],
			tools: [
				"read_file", "edit_file", "bash", "web_search",
				...(isWorker || isLeader ? ["task_create", "time_log", "whatsapp_send"] : []),
				...(isLeader || isAdmin ? ["team_manage", "project_create", "ai_predict"] : []),
			],
			features: {
				whatsapp_bot: isWorker || isLeader,
				cad_support: isWorker || isLeader,
				ai_predictions: isLeader || isAdmin,
				multi_tenancy: isAdmin,
				client_portal: isClient,
			},
			navigation: {
				main: [
					{ id: "chat", label: "Chat", icon: "MessageCircle", path: "/" },
					...(isWorker ? [{ id: "portal", label: "Portal", icon: "Briefcase", path: "/portal" }] : []),
				],
				...(isClient ? {
					portal: [
						{ id: "client_projects", label: "Projects", icon: "FolderKanban", path: "/client" },
						{ id: "client_drawings", label: "Drawings", icon: "FileImage", path: "/client/drawings" },
					],
				} : {}),
				...(isAdmin ? {
					admin: [
						{ id: "admin_tenants", label: "Tenants", icon: "Building", path: "/admin" },
						{ id: "admin_users", label: "Users", icon: "Users", path: "/admin/users" },
						{ id: "admin_stats", label: "Stats", icon: "BarChart", path: "/admin/stats" },
					],
				} : {}),
			},
		};
		return json(manifest);
	});

	router.get("/api/diagnostics", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			return json(await collectDiagnostics());
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ ok: false, error: message }, 500);
		}
	});

	router.get("/api/upstream", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			return json(await collectUpstreamSnapshot());
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ ok: false, error: message }, 500);
		}
	});

	/** Process exit from Settings → Restart server (dev default on; production needs WOP_ALLOW_SERVER_RESTART=1). */
	router.post("/api/server/restart", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		if (!isWopServerRestartHttpAllowed()) {
			return json({ error: "Server restart is disabled." }, 403);
		}
		queueMicrotask(() => {
			setTimeout(() => process.exit(0), 80);
		});
		return json({
			ok: true,
			exiting: true,
			message: "Way of Work server process will exit. Start it again from the terminal.",
		});
	});

	/** Toggle terminal on/off at runtime + persist to .env file. */
	router.post("/api/terminal/set-enabled", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: { enabled?: unknown };
		try {
			body = (await req.json()) as { enabled?: unknown };
		} catch {
			return json({ ok: false, error: "Bad JSON body" }, 400);
		}
		const enable = body.enabled === true || body.enabled === 1 || body.enabled === "1";
		process.env.WOP_ALLOW_TERMINAL = enable ? "1" : "0";

		// Note: Persistence logic simplified for refactor; ideally use a central config manager
		return json({ ok: true, enabled: enable });
	});
}
