import { existsSync } from "node:fs";
import { join } from "node:path";
import { json } from "../utils";
import { db } from "../db";
import { getPrimaryWorkspacePath } from "../workspace-state";
import { loadWorkspaceAgents } from "../agents";
import { fetchOllamaTags } from "../llm-models";
import { readPackageScripts } from "../package-scripts";
import { readUiViewsCatalog, seedUiViewsCatalogIfMissing } from "../ui-views-catalog";
import { buildClawHostTree } from "../tree";
import { readClawSchedulesMerged } from "../claw-schedules-store";
import {
	orchestratorBashEnabled,
	orchestratorToolsEnabled,
} from "../orchestrator-tools-exec";
import {
	authoritativeRuntimeEnabled,
	getWoStackForSurface,
	resolveWoBinaryPath,
	wopChatEngineFromEnv,
} from "../agent-runtime";
import {
	getClawAutomationStatus,
} from "../claw-automation-status";
import {
	getClawTelegramIntegrationStatus,
} from "../claw-telegram-status";
import {
	getClawWhatsAppIntegrationStatus,
} from "../claw-whatsapp-status";
import {
	getClawDotDirAbs,
	getClawHostRepoRoot,
	getClawWorkspaceBundleDirAbs,
} from "../claw-workspace-root";
import { resolveWoAiHost, resolveWoAiModelDefault } from "../wo-ai-env";
import { collectStaticWebManifest } from "../web-manifest";
import { broadcastToolLog } from "../tool-log-broadcast";
import { terminalAllowed, terminalShellHints } from "../terminal-ws";
import {
	patchOrchestratorGateRuntime,
	type OrchestratorGateRuntimePatch,
} from "../orchestrator-tools-exec";
import {
	patchWoJsonChatRuntimeOverride,
	authoritativeRuntimeEnabled as piDrivesChat,
} from "../agent-runtime";
import type { Router } from "../router";

function applySessionRuntimePostBody(body: Record<string, unknown>): Response {
	const orchPatch: OrchestratorGateRuntimePatch = {};
	let any = false;
	if ("orchestratorTools" in body) {
		any = true;
		const v = body.orchestratorTools;
		if (v === null) orchPatch.orchestratorTools = null;
		else if (typeof v === "boolean") orchPatch.orchestratorTools = v;
		else return json({ error: "orchestratorTools must be boolean or null" }, 400);
	}
	if ("orchestratorBash" in body) {
		any = true;
		const v = body.orchestratorBash;
		if (v === null) orchPatch.orchestratorBash = null;
		else if (typeof v === "boolean") orchPatch.orchestratorBash = v;
		else return json({ error: "orchestratorBash must be boolean or null" }, 400);
	}
	if ("piDrivesChat" in body) {
		any = true;
		const v = body.piDrivesChat;
		if (v === null) patchWoJsonChatRuntimeOverride(null);
		else if (typeof v === "boolean") patchWoJsonChatRuntimeOverride(v);
		else return json({ error: "piDrivesChat must be boolean or null" }, 400);
	}
	if (!any) {
		return json({ error: "Provide orchestratorTools, orchestratorBash, and/or piDrivesChat (boolean or null)" }, 400);
	}
	patchOrchestratorGateRuntime(orchPatch);
	return json({
		ok: true,
		orchestratorTools: orchestratorToolsEnabled(),
		orchestratorBash: orchestratorBashEnabled(),
		piDrivesChat: piDrivesChat(),
	});
}

export function registerConfigRoutes(router: Router) {
	router.get("/api/config", async (req, _params, auth) => {
		const provider = (process.env.WOP_LLM_PROVIDER || "ollama").toLowerCase();
		const engineMode = wopChatEngineFromEnv();
		const chatEngine = engineMode === "bundled" ? (process.env.WOP_CHAT_ENGINE || "").trim().toLowerCase() || provider : engineMode;
		const piEngineLive = authoritativeRuntimeEnabled();
		const sdkActive = engineMode === "sdk";
		const woBinaryResolved = resolveWoBinaryPath() != null;
		const workspaceDotPiPresent = existsSync(join(getPrimaryWorkspacePath(), ".pi"));
		const url = new URL(req.url);
		const wantClawTree = url.searchParams.get("clawTree") === "1";
		let clawHostTree: Awaited<ReturnType<typeof buildClawHostTree>> | undefined;
		if (wantClawTree) {
			try {
				clawHostTree = await buildClawHostTree();
			} catch {
				clawHostTree = { rootDisplay: "", nodes: [] };
			}
		}
		const wantSchedules = url.searchParams.get("schedules") === "1";
		let clawSchedules: { version: 1; schedules: Awaited<ReturnType<typeof readClawSchedulesMerged>> } | undefined;
		if (wantSchedules) {
			try {
				const schedules = await readClawSchedulesMerged();
				clawSchedules = { version: 1, schedules };
			} catch {
				clawSchedules = { version: 1, schedules: [] };
			}
		}
		return json({
			provider,
			chatEngine,
			clawHostRepoRoot: getClawHostRepoRoot(),
			clawDotDirAbs: getClawDotDirAbs(),
			clawWorkspaceDirAbs: getClawWorkspaceBundleDirAbs(),
			piDrivesChat: piEngineLive,
			piBinaryResolved: woBinaryResolved,
			workspaceDotPiPresent,
			sdkActive,
			orchestratorTools: orchestratorToolsEnabled(),
			orchestratorBash: orchestratorBashEnabled(),
			capabilities: {
				workspaceProblems: true,
				configRuntimePost: true,
				clawHostTreeGet: true,
				clawTelegramStatusGet: true,
				clawWhatsAppStatusGet: true,
			},
			manifestUrl: "/api/manifest",
			ollamaHost: resolveWoAiHost(),
			ollamaModel: resolveWoAiModelDefault(),
			openrouterModel: process.env.OPENROUTER_MODEL || "openrouter/auto",
			terminalEnabled: terminalAllowed(),
			...terminalShellHints(),
			...(clawHostTree ? { clawHostTree } : {}),
			...(clawSchedules ? { clawSchedules } : {}),
			clawAutomation: getClawAutomationStatus(),
			clawTelegramStatus: getClawTelegramIntegrationStatus(),
			clawWhatsAppStatus: getClawWhatsAppIntegrationStatus(),
		});
	});

	router.post("/api/config", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: Record<string, unknown>;
		try {
			body = (await req.json()) as Record<string, unknown>;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		return applySessionRuntimePostBody(body);
	});

	router.post("/api/config/orchestrator-gates", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: Record<string, unknown>;
		try {
			body = (await req.json()) as Record<string, unknown>;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		return applySessionRuntimePostBody(body);
	});

	router.get("/api/ui/views", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const data = await readUiViewsCatalog(getPrimaryWorkspacePath());
		return json(data);
	});

	router.post("/api/ui/views/seed", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const r = await seedUiViewsCatalogIfMissing(getPrimaryWorkspacePath());
		return json({ ok: true, created: r.created, path: r.path });
	});

	router.get("/api/llm/models", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const provider = (process.env.WOP_LLM_PROVIDER || "ollama").toLowerCase();
		const ollamaHost = resolveWoAiHost();
		const envDefaultOllama = resolveWoAiModelDefault();
		const envDefaultOpenrouter = process.env.OPENROUTER_MODEL || "openrouter/auto";

		if (provider === "openrouter") {
			return json({
				provider: "openrouter",
				ollamaHost,
				envDefaultOllama,
				envDefaultOpenrouter,
				models: [] as unknown[],
				catalogNote: "OpenRouter: set OPENROUTER_API_KEY on the host; default model OPENROUTER_MODEL. Type any OpenRouter model id below (same strings Pi uses with OpenRouter).",
			});
		}

		if (provider !== "ollama") {
			return json({
				provider,
				ollamaHost,
				envDefaultOllama,
				envDefaultOpenrouter,
				models: [] as unknown[],
				unsupportedProvider: true,
				catalogNote: `This server only implements web chat for WOP_LLM_PROVIDER=ollama or openrouter. Current value "${provider}" is unsupported.`,
			});
		}

		const tags = await fetchOllamaTags(ollamaHost) as any;
		if (!tags.ok) {
			return json({
				provider: "ollama",
				ollamaHost,
				envDefaultOllama,
				envDefaultOpenrouter,
				models: [],
				error: tags.error,
			});
		}
		return json({
			provider: "ollama",
			ollamaHost,
			envDefaultOllama,
			envDefaultOpenrouter,
			models: tags.models.map((m) => ({
				name: m.name,
				size: m.size,
				modified_at: m.modified_at,
			})),
		});
	});

	router.get("/api/agents", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			const data = await loadWorkspaceAgents();
			return json(data);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: message }, 500);
		}
	});

	router.get("/api/package-scripts", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			const scripts = await readPackageScripts();
			return json({ scripts });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: message }, 500);
		}
	});

	router.post("/api/run-script", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		if (process.env.WOP_ALLOW_RUN?.trim() !== "1") {
			return json({ error: "Run is disabled. Set WOP_ALLOW_RUN=1 on the server to allow npm/bun scripts from package.json." }, 403);
		}
		let body: { script?: string };
		try {
			body = (await req.json()) as { script?: string };
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		const script = String(body.script ?? "").trim();
		if (!/^[a-zA-Z0-9_-]+$/.test(script)) return json({ error: "Invalid script name" }, 400);
		const scripts = await readPackageScripts();
		if (!scripts || !(script in scripts)) return json({ error: "Script not in package.json" }, 400);
		const cwd = getPrimaryWorkspacePath();
		broadcastToolLog("INFO", "bash", `bun run ${script} (cwd ${cwd.length > 80 ? `${cwd.slice(0, 77)}…` : cwd})`);
		try {
			const proc = Bun.spawn(["bun", "run", script], { cwd, stdout: "pipe", stderr: "pipe" });
			const stdout = await new Response(proc.stdout).text();
			const stderr = await new Response(proc.stderr).text();
			const code = await proc.exited;
			return json({ ok: code === 0, exitCode: code, stdout: stdout.slice(0, 24_000), stderr: stderr.slice(0, 24_000) });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: message }, 500);
		}
	});
}
