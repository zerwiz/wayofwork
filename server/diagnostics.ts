import { existsSync, realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, normalize } from "node:path";
import { fetchOllamaTags, ollamaTagsIncludeRequestedModel } from "./llm-models";
import { orchestratorBashEnabled, orchestratorToolsEnabled } from "./orchestrator-tools-exec";
import { getWoBundleRepoRoot, resolveWoAiHost, resolveWoAiModelDefault } from "./wo-ai-env";
import { isSdkAvailable, wopChatEngineFromEnv, authoritativeRuntimeEnabled, resolveWoBinaryPath } from "./agent-runtime";
import { collectStaticWebManifest } from "./web-manifest";
import {
	getFrozenInitialWorkspacePath,
	getPrimaryWorkspacePath,
	listWorkspaceFolders,
} from "./workspace-state";
import { terminalAllowed } from "./terminal-ws";

export type DoctorCheck = {
	id: string;
	title: string;
	status: "ok" | "warn" | "error" | "skip" | "info";
	summary: string;
	hint?: string;
};

function doctorStatusRollup(checks: DoctorCheck[]) {
	let worst: DoctorCheck["status"] = "ok";
	let errorN = 0;
	let warnN = 0;
	for (const c of checks) {
		if (c.status === "error") {
			worst = "error";
			errorN++;
		} else if (c.status === "warn" && worst !== "error") {
			worst = "warn";
			warnN++;
		}
	}
	return { worst, errorN, warnN };
}

export async function collectDiagnostics(): Promise<Record<string, unknown>> {
	const provider = (process.env.WOP_LLM_PROVIDER || "wo-ai").toLowerCase();
	const woAiHost = resolveWoAiHost();
	let ollamaSummary: Record<string, unknown>;
	if (provider !== "wo-ai" && provider !== "ollama") {
		ollamaSummary = { skipped: true, reason: `WOP_LLM_PROVIDER=${provider}` };
	} else {
		const tags = await fetchOllamaTags(woAiHost, { signal: AbortSignal.timeout(2500) });
		if (tags.ok) {
			const configuredModel = resolveWoAiModelDefault();
			const configuredModelPresent = ollamaTagsIncludeRequestedModel(tags.models, configuredModel);
			ollamaSummary = {
				ok: true,
				modelCount: tags.models.length,
				configuredModel,
				configuredModelPresent,
			};
		} else {
			ollamaSummary = { ok: false, error: (tags as any).error };
		}
	}

	const man = collectStaticWebManifest();
	const extensionShimCount = man.shimFiles.reduce((n, s) => n + s.files.length, 0);
	const settingsExtensionEntriesTotal = man.settingsExtensions.reduce((n, s) => n + s.entries.length, 0);

	const engineMode = wopChatEngineFromEnv();
	const sdkActive = engineMode === "sdk";
	const piDrivesChat = authoritativeRuntimeEnabled();
	const piStrictBlock: string | null = null;
	const terminalEnabled = terminalAllowed();
	const openRouterKeySet = Boolean(process.env.OPENROUTER_API_KEY?.trim());
	const primary = getPrimaryWorkspacePath();

	const checks: DoctorCheck[] = [];

	// 1. Workspace
	checks.push({
		id: "workspace_path",
		title: "Primary workspace",
		status: "ok",
		summary: primary,
		hint:
			primary === getWoBundleRepoRoot()
				? "Primary workspace is this Way of Work install folder."
				: "Primary workspace is a different directory than this Way of Work install — expected when you open another folder.",
	});

	// 2. Chat Engine
	if (sdkActive) {
		checks.push({
			id: "wo_ai_sdk",
			title: "Chat engine",
			status: "ok",
			summary: "Wo AI SDK (@wayofmono/wo-agent)",
			hint: "Using direct in-process SDK. Fastest path; supports tools.",
		});
	} else if (engineMode === "bundled") {
		checks.push({
			id: "bun_bundled",
			title: "Chat engine",
			status: "ok",
			summary: "Bundled Bun HTTP streaming",
			hint: "WOP_CHAT_ENGINE=bundled forces direct provider streaming.",
		});
	} else {
		checks.push({
			id: "chat_engine",
			title: "Chat engine",
			status: "warn",
			summary: `Unknown engine mode: ${engineMode}`,
		});
	}

	if (sdkActive) {
		checks.push({
			id: "wo_agent_sdk",
			title: "Wo Agent SDK",
			status: "ok",
			summary: "Available in node_modules",
		});
	}

	checks.push(
		terminalEnabled
			? { id: "terminal", title: "Embedded terminal", status: "ok", summary: "Enabled by server" }
			: {
					id: "terminal",
					title: "Embedded terminal",
					status: "warn",
					summary: "Disabled by server policy",
					hint: "See terminal env / WOP flags in server docs if you expected a shell panel.",
				},
	);

	if (provider === "wo-ai" || provider === "ollama") {
		if (ollamaSummary.skipped === true) {
			checks.push({
				id: "wo_ai",
				title: "Wo AI (local) API",
				status: "skip",
				summary: String(ollamaSummary.reason ?? "skipped"),
			});
		} else if (ollamaSummary.ok === true) {
			const n = typeof ollamaSummary.modelCount === "number" ? ollamaSummary.modelCount : 0;
			const configured =
				typeof ollamaSummary.configuredModel === "string" ? ollamaSummary.configuredModel.trim() : "";
			const present = ollamaSummary.configuredModelPresent === true;
			checks.push({
				id: "wo_ai",
				title: "Wo AI (local) API",
				status: "ok",
				summary: `${n} model tag(s) listed`,
				hint: "Reachable daemon and tag count only — the next row validates your resolved default model id.",
			});
			if (configured) {
				checks.push({
					id: "wo_ai_default_model",
					title: "Default Wo AI model (server)",
					status: present ? "ok" : "error",
					summary: present
						? `Resolved id “${configured}” matches a local pull (WOP_AI_MODEL, workspace agent/settings.json, or built-in fallback).`
						: `Resolved id “${configured}” is not in the local Wo AI list — chat will 404 until you pull it or change the id.`,
					hint: present
						? undefined
						: "Compare with `ollama list`; set WOP_AI_MODEL or workspace `agent/settings.json` defaultModel, or run `ollama pull` for a tag you actually have (e.g. qwen3.5:9b).",
				});
			}
		} else {
			const err = typeof ollamaSummary.error === "string" ? ollamaSummary.error : "unreachable";
			checks.push({
				id: "wo_ai",
				title: "Wo AI (local) API",
				status: "error",
				summary: err,
				hint: "Start the Ollama daemon or set WOP_AI_BASE_URL / resolved host to match your setup.",
			});
		}
	} else if (provider === "openrouter") {
		checks.push(
			openRouterKeySet
				? { id: "openrouter", title: "OpenRouter API", status: "ok", summary: "API key is set" }
				: {
						id: "openrouter",
						title: "OpenRouter API",
						status: "error",
						summary: "OPENROUTER_API_KEY is missing",
						hint: "Add OPENROUTER_API_KEY to your .env or server process.",
					},
		);
	}

	const doctorRollup = doctorStatusRollup(checks);
	const pi = { exists: false, resolvedPath: null, version: null, versionError: null };
	const sdk = { available: true };

	return {
		ok: doctorRollup.worst !== "error",
		time: new Date().toISOString(),
		platform: process.platform,
		arch: process.arch,
		node: process.version,
		bun: process.versions?.bun ?? null,
		cwd: process.cwd(),
		home: homedir(),
		bundleRoot: getWoBundleRepoRoot(),
		workspace: {
			primary,
			folders: listWorkspaceFolders(),
			initialFrozen: getFrozenInitialWorkspacePath(),
		},
		env: {
			WOP_HOME: process.env.WOP_HOME?.trim() || null,
			WOP_PI_BINARY: process.env.WOP_PI_BINARY?.trim() || null,
			WOP_WORKSPACE: process.env.WOP_WORKSPACE?.trim() || null,
			WOP_LLM_PROVIDER: provider,
			WOP_CHAT_ENGINE: process.env.WOP_CHAT_ENGINE?.trim() || null,
			WOP_SERVER_PORT: process.env.WOP_SERVER_PORT?.trim() || null,
			WOP_AI_HOST: process.env.WOP_AI_HOST?.trim() || null,
			resolvedWoAiHost: woAiHost,
			resolvedWoAiModelDefault: resolveWoAiModelDefault(),
			terminalEnabled,
			openRouterApiKeySet: openRouterKeySet,
		},
		llm: {
			provider,
			woAiHost: woAiHost,
			woAi: ollamaSummary,
		},
		piBinary: pi,
		piSdk: sdk,
		manifestStatic: {
			source: man.source,
			extensionShimCount,
			settingsJsonCount: man.settingsExtensions.length,
			settingsExtensionEntriesTotal,
		},
		chatRuntime: {
			wopChatEngine: engineMode,
			authoritativeRuntime: piDrivesChat,
			cliResolvable: Bun.which("pi") != null,
			blockedReason: piStrictBlock,
		},
		orchestrator: {
			tools: orchestratorToolsEnabled(),
			bash: orchestratorBashEnabled(),
		},
		checks,
		doctorSummary: {
			worst: doctorRollup.worst,
			errors: doctorRollup.errorN,
			warnings: doctorRollup.warnN,
			total: checks.length,
		},
		note: "Host doctor: workspace.primary = opened project (API/tree/chat cwd). playgroundRoot / wayOfPiBundleRoot = this app’s checkout only. They differ whenever you edit another repo. Web chat uses Wo AI/OpenRouter unless authoritative runtime is active. GET /api/manifest reads workspace roots only.",
	};
}

/** Read-only snapshot of upstream mirror config + lock (no GitHub/npm refresh). */
export async function collectUpstreamSnapshot(): Promise<Record<string, unknown>> {
	const root = getWoBundleRepoRoot();
	const configPath = join(root, "package.json");
	const lockPath = join(root, "bun.lock");

	let configRaw: string | null = null;
	try {
		configRaw = await readFile(configPath, "utf8");
	} catch {}

	let lockRaw: string | null = null;
	try {
		lockRaw = await readFile(lockPath, "utf8");
	} catch {}

	let config: any = null;
	if (configRaw) {
		try {
			config = JSON.parse(configRaw);
		} catch {}
	}

	let lock: any = null;
	// Bun lock is binary or complex, just reporting existence for now
	if (lockRaw) lock = { present: true, size: lockRaw.length };

	return {
		bundleRoot: root,
		configPath,
		lockPresent: lockRaw != null,
		configPresent: configRaw != null,
		lock,
		config,
		note: "Read-only. Remote check + lock updates: `bun scripts/wop-pi-upstream.ts check` from the playground repo.",
	};
}
