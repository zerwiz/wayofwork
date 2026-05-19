import { existsSync, realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, normalize } from "node:path";
import { fetchOllamaTags, ollamaTagsIncludeRequestedModel } from "./llm-models";
import { orchestratorBashEnabled, orchestratorToolsEnabled } from "./orchestrator-tools-exec";
import { getWayOfPiBundleRepoRoot, resolveOllamaHost, resolveOllamaModelDefault } from "./pi-ollama-env";
import { isSdkAvailable, wopChatEngineFromEnv } from "./agent-runtime";
import { collectStaticWebManifest } from "./web-manifest";
import {
	getFrozenInitialWorkspacePath,
	getPrimaryWorkspacePath,
	listWorkspaceFolders,
} from "./workspace-state";
import { terminalAllowed } from "./terminal-ws";

/** One row in **Host doctor** (GET `/api/diagnostics`). */
export type DoctorCheckStatus = "ok" | "warn" | "error" | "skip" | "info";

export type DoctorCheck = {
	id: string;
	title: string;
	status: DoctorCheckStatus;
	summary: string;
	hint?: string;
};

/** @deprecated use {@link getWayOfPiBundleRepoRoot} from pi-ollama-env */
export function getWayOfPiPlaygroundRoot(): string {
	return getWayOfPiBundleRepoRoot();
}

function canonicalFsPath(abs: string): string {
	try {
		return normalize(realpathSync(abs));
	} catch {
		return normalize(abs);
	}
}

async function readTextIfExists(abs: string): Promise<string | null> {
	try {
		return await readFile(abs, "utf8");
	} catch {
		return null;
	}
}

async function probePiVersion(bin: string, ms: number): Promise<{ version: string | null; error: string | null }> {
	const proc = Bun.spawn([bin, "--version"], { stdout: "pipe", stderr: "pipe" });
	let tid: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<{ version: null; error: string }>((resolve) => {
		tid = setTimeout(() => {
			try {
				proc.kill();
			} catch {
				/* ignore */
			}
			resolve({ version: null, error: `timeout after ${ms}ms` });
		}, ms);
	});
	const run = (async () => {
		try {
			const out = await new Response(proc.stdout).text();
			const err = await new Response(proc.stderr).text();
			const code = await proc.exited;
			if (tid !== undefined) clearTimeout(tid);
			const text = (out || err).trim().split("\n")[0] ?? "";
			if (code !== 0 && !text) {
				return { version: null, error: `exit ${code}` } as const;
			}
			return { version: text || null, error: code !== 0 ? `exit ${code}` : null } as const;
		} catch (e) {
			if (tid !== undefined) clearTimeout(tid);
			const message = e instanceof Error ? e.message : String(e);
			return { version: null, error: message } as const;
		}
	})();
	return Promise.race([run, timeout]);
}

function expandUserPath(p: string): string {
	const t = p.trim();
	if (t.startsWith("~/")) return join(homedir(), t.slice(2));
	if (t === "~") return homedir();
	return t;
}

export async function probePiBinary(): Promise<{
	resolvedPath: string | null;
	source: "WOP_PI_BINARY" | "PATH" | null;
	exists: boolean;
	version: string | null;
	versionError: string | null;
}> {
	const envRaw = process.env.WOP_PI_BINARY?.trim();
	if (envRaw) {
		const expanded = expandUserPath(envRaw);
		const ex = existsSync(expanded);
		if (!ex) {
			return { resolvedPath: expanded, source: "WOP_PI_BINARY", exists: false, version: null, versionError: "file missing" };
		}
		const v = await probePiVersion(expanded, 4000);
		return { resolvedPath: expanded, source: "WOP_PI_BINARY", exists: true, version: v.version, versionError: v.error };
	}
	const onPath = Bun.which("pi");
	if (!onPath) {
		return { resolvedPath: null, source: null, exists: false, version: null, versionError: null };
	}
	const v = await probePiVersion(onPath, 4000);
	return { resolvedPath: onPath, source: "PATH", exists: true, version: v.version, versionError: v.error };
}

type PiBinaryProbe = Awaited<ReturnType<typeof probePiBinary>>;

function probeSdk(): { available: boolean; version: string | null } {
	const available = isSdkAvailable();
	let version: string | null = null;
	if (available) {
		try {
			version = "@earendil-works/pi-coding-agent";
		} catch {
			version = null;
		}
	}
	return { available, version };
}

function buildDoctorChecks(options: {
	primary: string;
	bundleRepoRoot: string;
	provider: string;
	ollamaSummary: Record<string, unknown>;
	pi: PiBinaryProbe;
	sdk: { available: boolean; version: string | null };
	engineMode: ReturnType<typeof wopChatEngineFromEnv>;
	piDrivesChat: boolean;
	piStrictBlock: string | null;
	terminalEnabled: boolean;
	openRouterKeySet: boolean;
}): DoctorCheck[] {
	const {
		primary,
		bundleRepoRoot,
		provider,
		ollamaSummary,
		pi,
		sdk,
		engineMode,
		piDrivesChat,
		piStrictBlock,
		terminalEnabled,
		openRouterKeySet,
	} = options;
	const checks: DoctorCheck[] = [];

	checks.push({
		id: "workspace_primary",
		title: "Primary workspace folder (your project)",
		status: existsSync(primary) ? "ok" : "error",
		summary: primary,
		hint: existsSync(primary)
			? "Tree, /api/file, plans, agents, and Pi chat cwd use this root (Open Folder / WOP_WORKSPACE / server cwd). It is not the Way of Pi app install path unless you opened that repo here. The active editor tab does not retarget this."
			: "Path missing or unreadable. Fix WOP_WORKSPACE or open a valid folder.",
	});

	checks.push({
		id: "wayofpi_bundle_root",
		title: "Way of Pi app checkout (install path)",
		status: existsSync(bundleRepoRoot) ? "ok" : "error",
		summary: bundleRepoRoot,
		hint: existsSync(bundleRepoRoot)
			? "This is where this server binary lives (upstream lock, scripts). It is not your opened project unless the paths match. Chat and file tools do not use this path by default."
			: "Server cannot resolve its own package checkout — fix install or cwd.",
	});

	{
		const same = canonicalFsPath(primary) === canonicalFsPath(bundleRepoRoot);
		checks.push({
			id: "workspace_vs_bundle",
			title: "Project workspace vs Way of Pi install",
			status: "info",
			summary: same
				? "Primary workspace equals this Way of Pi checkout (typical when developing Way of Pi itself)."
				: "Primary workspace is a different directory than this Way of Pi install — expected when you opened another repo.",
			hint: "Never infer the project root from the app install path or from which file tab is focused.",
		});
	}

	if (provider === "ollama") {
		if (ollamaSummary.skipped === true) {
			checks.push({
				id: "ollama",
				title: "Ollama API",
				status: "skip",
				summary: String(ollamaSummary.reason ?? "skipped"),
			});
		} else if (ollamaSummary.ok === true) {
			const n = typeof ollamaSummary.modelCount === "number" ? ollamaSummary.modelCount : 0;
			const configured =
				typeof ollamaSummary.configuredModel === "string" ? ollamaSummary.configuredModel.trim() : "";
			const present = ollamaSummary.configuredModelPresent === true;
			checks.push({
				id: "ollama",
				title: "Ollama API",
				status: "ok",
				summary: `${n} model tag(s) listed`,
				hint: "Reachable daemon and tag count only — the next row validates your resolved default model id.",
			});
			if (configured) {
				checks.push({
					id: "ollama_default_model",
					title: "Default Ollama model (server)",
					status: present ? "ok" : "error",
					summary: present
						? `Resolved id “${configured}” matches a local pull (OLLAMA_MODEL, workspace agent/settings.json, or built-in fallback).`
						: `Resolved id “${configured}” is not in the local ollama list — chat will 404 until you pull it or change the id.`,
					hint: present
						? undefined
						: "Compare with `ollama list`; set OLLAMA_MODEL or workspace `agent/settings.json` defaultModel, or run `ollama pull` for a tag you actually have (e.g. llama3.2:latest).",
				});
			}
		} else {
			const err = typeof ollamaSummary.error === "string" ? ollamaSummary.error : "unreachable";
			checks.push({
				id: "ollama",
				title: "Ollama API",
				status: "error",
				summary: err,
				hint: "Start the Ollama daemon or set OLLAMA_BASE_URL / resolved host to match your setup.",
			});
		}
	} else if (provider === "openrouter") {
		checks.push(
			openRouterKeySet
				? {
						id: "openrouter",
						title: "OpenRouter API key",
						status: "ok",
						summary: "OPENROUTER_API_KEY is set",
					}
				: {
						id: "openrouter",
						title: "OpenRouter API key",
						status: "error",
						summary: "OPENROUTER_API_KEY is missing or empty",
						hint: "Set the key in the server environment and restart Way of Pi.",
					},
		);
	} else {
		checks.push({
			id: "llm_provider",
			title: "Session LLM provider",
			status: "warn",
			summary: `WOP_LLM_PROVIDER=${provider}`,
			hint: "Web chat is wired for ollama or openrouter; other values may fail.",
		});
	}

	checks.push({
		id: "pi_sdk",
		title: "Pi SDK (@earendil-works/pi-coding-agent)",
		status: sdk.available ? "ok" : "warn",
		summary: sdk.available
			? `SDK available — direct import replaces subprocess (WOP_CHAT_ENGINE=sdk)`
			: `SDK not available — falling back to pi subprocess or bundled provider`,
		hint: sdk.available
			? undefined
			: "Run `bun install` to install the SDK. Then set `WOP_CHAT_ENGINE=sdk` to use the direct import path.",
	});

	if (piStrictBlock) {
		checks.push({
			id: "pi_engine",
			title: "Pi chat engine",
			status: "error",
			summary: piStrictBlock,
		});
	} else if (engineMode === "pi") {
		if (!pi.resolvedPath) {
			checks.push({
				id: "pi_engine",
				title: "Pi chat engine",
				status: "error",
				summary: "WOP_CHAT_ENGINE=pi but the pi executable was not found",
				hint: "Install Pi, set WOP_PI_BINARY, or use WOP_CHAT_ENGINE=auto to fall back.",
			});
		} else if (!pi.exists) {
			checks.push({
				id: "pi_engine",
				title: "Pi chat engine",
				status: "error",
				summary: `Configured binary missing: ${pi.resolvedPath}`,
			});
		} else if (pi.versionError) {
			checks.push({
				id: "pi_engine",
				title: "Pi chat engine",
				status: "warn",
				summary: `pi --version: ${pi.versionError}`,
			});
		} else {
			checks.push({
				id: "pi_engine",
				title: "Pi chat engine",
				status: "ok",
				summary: pi.version ? pi.version : "Pi CLI responds",
			});
		}
	} else if (engineMode === "auto") {
		if (!pi.resolvedPath || !pi.exists) {
			checks.push({
				id: "pi_engine",
				title: "Pi chat engine",
				status: "info",
				summary: "Auto: Pi not found or binary invalid; using bundled Bun provider",
			});
		} else if (piDrivesChat) {
			checks.push({
				id: "pi_engine",
				title: "Pi chat engine",
				status: "ok",
				summary: pi.version ? `Auto: Pi JSON engine (${pi.version})` : "Auto: Pi JSON engine active",
			});
		} else if (pi.versionError) {
			checks.push({
				id: "pi_engine",
				title: "Pi chat engine",
				status: "warn",
				summary: `Pi found but pi --version failed: ${pi.versionError}`,
			});
		} else {
			checks.push({
				id: "pi_engine",
				title: "Pi chat engine",
				status: "warn",
				summary: "Pi binary present but JSON engine is not active — check server wiring",
			});
		}
	} else {
		checks.push({
			id: "pi_engine",
			title: "Pi chat engine",
			status: "skip",
			summary: "Bundled interim provider (WOP_CHAT_ENGINE=bundled or bun — Bun-only, no headless Pi)",
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

	return checks;
}

function summarizeDoctorChecks(checks: DoctorCheck[]): { worst: "ok" | "warn" | "error"; errorN: number; warnN: number } {
	let worst: "ok" | "warn" | "error" = "ok";
	let errorN = 0;
	let warnN = 0;
	for (const c of checks) {
		if (c.status === "error") {
			errorN += 1;
			worst = "error";
		} else if (c.status === "warn") {
			warnN += 1;
			if (worst === "ok") worst = "warn";
		}
	}
	return { worst, errorN, warnN };
}

export async function collectDiagnostics(): Promise<Record<string, unknown>> {
	const provider = (process.env.WOP_LLM_PROVIDER || "ollama").toLowerCase();
	const ollamaHost = resolveOllamaHost();
	let ollamaSummary: Record<string, unknown>;
	if (provider !== "ollama") {
		ollamaSummary = { skipped: true, reason: `WOP_LLM_PROVIDER=${provider}` };
	} else {
		const tags = await fetchOllamaTags(ollamaHost, { signal: AbortSignal.timeout(2500) });
		if (tags.ok) {
			const configuredModel = resolveOllamaModelDefault();
			const configuredModelPresent = ollamaTagsIncludeRequestedModel(tags.models, configuredModel);
			ollamaSummary = {
				ok: true,
				modelCount: tags.models.length,
				configuredModel,
				configuredModelPresent,
			};
		} else {
			ollamaSummary = { ok: false, error: tags.error };
		}
	}

	const pi = await probePiBinary();
	const sdk = probeSdk();
	const man = collectStaticWebManifest();
	const extensionShimCount = man.shimFiles.reduce((n, s) => n + s.files.length, 0);
	const settingsExtensionEntriesTotal = man.settingsExtensions.reduce((n, s) => n + s.entries.length, 0);

	const engineMode = wopChatEngineFromEnv();
	const piDrivesChat = false;
	const piStrictBlock: string | null = null;
	const terminalEnabled = terminalAllowed();
	const openRouterKeySet = Boolean(process.env.OPENROUTER_API_KEY?.trim());
	const primary = getPrimaryWorkspacePath();
	const bundleRepoRoot = getWayOfPiBundleRepoRoot();
	const checks = buildDoctorChecks({
		primary,
		bundleRepoRoot,
		provider,
		ollamaSummary,
		pi,
		sdk,
		engineMode,
		piDrivesChat,
		piStrictBlock,
		terminalEnabled,
		openRouterKeySet,
	});

	const bundlePlaygroundMarker = join(bundleRepoRoot, ".playground-from");
	if ((await readTextIfExists(bundlePlaygroundMarker)) != null) {
		checks.push({
			id: "legacy_bundle_playground_marker",
			title: "Remove repo-root .playground-from",
			status: "warn",
			summary: "Machine-specific playground path marker exists at the Way of Pi checkout root.",
			hint: "Delete `.playground-from` in the repo root. Linked projects record the playground only in `<project>/.pi/.playground-from` (see `scripts/enable-playground-in-project`).",
		});
	}

	const projectPlaygroundMarker = join(primary, ".pi", ".playground-from");
	const markerRaw = await readTextIfExists(projectPlaygroundMarker);
	if (markerRaw != null) {
		const target = markerRaw.split(/\r?\n/)[0]?.trim() ?? "";
		if (!target) {
			checks.push({
				id: "pi_playground_link_marker",
				title: "Pi playground link (.pi/.playground-from)",
				status: "warn",
				summary: "Marker file is empty or whitespace only.",
				hint: "Remove `.pi/.playground-from` or re-run `enable-playground-in-project` / `pi-e` option 2 from your Way of Pi clone on this machine.",
			});
		} else if (!existsSync(target)) {
			checks.push({
				id: "pi_playground_link_marker",
				title: "Pi playground link (.pi/.playground-from)",
				status: "error",
				summary: `Recorded playground root does not exist: ${target}`,
				hint: "Another machine’s absolute path is often the cause. Re-link: run `disable-playground-in-project` in the project, then `enable-playground-in-project` from your local Way of Pi checkout.",
			});
		} else {
			checks.push({
				id: "pi_playground_link_marker",
				title: "Pi playground link (.pi/.playground-from)",
				status: "ok",
				summary: target,
				hint: "Project `.pi/` is wired to load agents/skills/themes from this playground checkout.",
			});
		}
	}

	const doctorRollup = summarizeDoctorChecks(checks);

	return {
		ok: true,
		service: "wayofwork-ui-server",
		time: new Date().toISOString(),
		playgroundRoot: bundleRepoRoot,
		wayOfPiBundleRoot: bundleRepoRoot,
		workspace: {
			primary,
			folders: listWorkspaceFolders(),
			initialRoot: getFrozenInitialWorkspacePath(),
		},
		env: {
			WOP_HOME: process.env.WOP_HOME?.trim() || null,
			WOP_PI_BINARY: process.env.WOP_PI_BINARY?.trim() || null,
			WOP_WORKSPACE: process.env.WOP_WORKSPACE?.trim() || null,
			WOP_LLM_PROVIDER: provider,
			WOP_CHAT_ENGINE: process.env.WOP_CHAT_ENGINE?.trim() || null,
			WOP_SERVER_PORT: process.env.WOP_SERVER_PORT?.trim() || null,
			OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL?.trim() || null,
			resolvedOllamaHost: ollamaHost,
			resolvedOllamaModelDefault: resolveOllamaModelDefault(),
			terminalEnabled,
			openRouterApiKeySet: openRouterKeySet,
		},
		llm: {
			provider,
			ollamaHost,
			ollama: ollamaSummary,
		},
		piBinary: pi,
		piSdk: sdk,
		manifestStatic: {
			source: man.source,
			piDrivesRuntime: man.piDrivesRuntime,
			extensionShimCount,
			settingsJsonCount: man.settingsExtensions.length,
			settingsExtensionEntriesTotal,
		},
		chatRuntime: {
			wopChatEngine: engineMode,
			piDrivesChat,
			piCliResolvable: Bun.which("pi") != null,
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
		note: "Host doctor: workspace.primary = opened project (API/tree/chat cwd). playgroundRoot / wayOfPiBundleRoot = this app’s checkout only. They differ whenever you edit another repo. Web chat uses Ollama/OpenRouter unless Pi JSON engine is active. GET /api/manifest reads workspace roots only.",
	};
}

/** Read-only snapshot of upstream mirror config + lock (no GitHub/npm refresh). */
export async function collectUpstreamSnapshot(): Promise<Record<string, unknown>> {
	const root = getWayOfPiBundleRepoRoot();
	const lockPath = join(root, "wop.upstream.lock.json");
	const configPath = join(root, "scripts", "wop-upstream", "config.json");
	const lockRaw = await readTextIfExists(lockPath);
	const configRaw = await readTextIfExists(configPath);
	let lock: unknown = null;
	let config: unknown = null;
	if (lockRaw) {
		try {
			lock = JSON.parse(lockRaw) as unknown;
		} catch {
			lock = { parseError: true };
		}
	}
	if (configRaw) {
		try {
			config = JSON.parse(configRaw) as unknown;
		} catch {
			config = { parseError: true };
		}
	}
	return {
		ok: true,
		playgroundRoot: root,
		lockPath,
		configPath,
		lockPresent: lockRaw != null,
		configPresent: configRaw != null,
		lock,
		config,
		note: "Read-only. Remote check + lock updates: `bun scripts/wop-pi-upstream.ts check` from the playground repo.",
	};
}
