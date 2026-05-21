import { existsSync } from "node:fs";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { basename as posixBasename, join as posixJoin } from "node:path/posix";
import type { ChatMessage, StreamChatResult } from "./chat";
import { runOrchestratorToolLoop } from "./chat-orchestrator-tools";
import { streamChatCompletion } from "./chat";
import {
	approximateStreamUsageFromMessages,
	estimateContextWindowTokens,
	type StreamTokenUsage,
} from "./chat-usage";
import { applyChatContextBudget } from "./chat-context-budget";
import { applyLeadSystem, type ChatSessionMode } from "./session-prompts";
import { getAgentBodyByName, loadWorkspaceAgents, readPlannerAgentBodySync } from "./agents";
import { fetchOllamaTags, isValidOllamaModelId, isValidOpenRouterModelId } from "./llm-models";
import {
	getClawDotDirAbs,
	getClawHostRepoRoot,
	getClawWorkspaceBundleDirAbs,
	clawWorkspaceBundleToLegacyFlatRel,
	resolveWorkspaceOrClawAbs,
} from "./claw-workspace-root";
import { getWorkspaceRoot, MAX_FILE_BYTES, safeResolveUnderWorkspace } from "./paths";
import { imageMimeFromPath } from "./workspace-file-mime";
import { listPlansCatalog } from "./plans-catalog";
import { readPackageScripts } from "./package-scripts";
import { readUiViewsCatalog, seedUiViewsCatalogIfMissing } from "./ui-views-catalog";
import { gitStageAbsolutePath, gitStageAllFromAbsolutePath } from "./git";
import { buildClawHostTree, buildWorkspaceTree } from "./tree";
import {
	addFolder,
	getFrozenInitialWorkspacePath,
	getPrimaryWorkspacePath,
	listWorkspaceFolders,
	loadFoldersFromWorkspaceJson,
	openFileInWorkspace,
	openFolder,
	removeFolderByLabel,
	resetWorkspaceToInitial,
	saveCodeWorkspaceFileToPath,
	setWorkspaceFoldersAbs,
	workspaceSwitchAllowed,
} from "./workspace-state";
import { pickNativePath } from "./native-file-dialog";
import {
	attachTerminalSession,
	disposeTerminal,
	handleTerminalMessage,
	terminalAllowed,
	terminalShellHints,
	type TerminalWsData,
} from "./terminal-ws";
import { getClawAutomationStatus } from "./claw-automation-status";
import { readClawMissionEvents } from "./claw-mission-events";
import {
	normalizeSchedule,
	readClawSchedulesMerged,
	writeClawSchedulesDefinitions,
} from "./claw-schedules-store";
import { executeClawAutomation } from "./claw-schedule-executor";
import { startClawScheduler } from "./claw-scheduler";
import {
	clawWebhookConfigured,
	clawWebhookInboundEnabled,
	ensureWebhookSecret,
	readWebhookSecret,
	rotateWebhookSecret,
	verifyWebhookBearer,
} from "./claw-webhook-store";
import { getClawTelegramIntegrationStatus } from "./claw-telegram-status";
import { getClawWhatsAppIntegrationStatus } from "./claw-whatsapp-status";
import { collectDiagnostics, collectUpstreamSnapshot } from "./diagnostics";
import { runWorkspaceProblemsAnalysis, type WorkspaceProblemsRunResult } from "./workspace-problems";
import { resolveOllamaHost, resolveOllamaModelDefault } from "./pi-ollama-env";
import { collectStaticWebManifest } from "./web-manifest";
import {
	broadcastToolLog,
	registerChatSocketForToolLogs,
	unregisterChatSocketForToolLogs,
} from "./tool-log-broadcast";
import {
	appendWayofpiSessionMessage,
	loadWayofpiSessionMessages,
	sanitizeSessionKey,
	syncWayofpiSessionFile,
	wayofpiSessionBasename,
} from "./wop-session-jsonl";
import { tryAutoDispatchFromUserText } from "./orchestrator-dispatch-intent";
import {
	orchestratorBashEnabled,
	orchestratorToolsEnabled,
	patchOrchestratorGateRuntime,
	type OrchestratorGateRuntimePatch,
} from "./orchestrator-tools-exec";
import {
	patchPiJsonChatRuntimeOverride,
	piAgentRuntimeBlockedReason,
	getPiStackForSurface,
	resolvePiBinaryPath,
	runPiChatTurn,
	shouldUsePiJsonChat,
	wopChatEngineFromEnv,
} from "./agent-runtime";
import { evalChatSlashCommand, type ChatSlashMutation } from "./chat-slash-commands";
import {
	addWorkspaceIndexDoc,
	applyAutoSync,
	clearWorkspaceIndex,
	getWorkspaceIndexChatBoostSync,
	getWorkspaceIndexStatus,
	patchWorkspaceIndexOptions,
	removeWorkspaceIndexDoc,
	syncWorkspaceIndex,
	syncWorkspaceIndexDoc,
} from "./workspace-index";
import {
	readGithubConnectionMeta,
	removeGithubCredentials,
	saveGithubCredentials,
	verifyGithubToken,
} from "./github-connection";
import { db } from "./db";
import { createToken, verifyToken } from "./auth";
import { handleTicketApi } from "./tickets-api";
import {
	configureNgrokAuthtokenDev,
	getNgrokTunnelDevJson,
	installNgrokBundledDev,
	startNgrokTunnelDev,
	stopNgrokTunnelDev,
	updateNgrokBundledDev,
} from "./ngrok-tunnel-manager";
import {
	applyTunnelGateDevPost,
	getTunnelGateDevStatusJson,
	tunnelGateAllowsBunRequest,
	tunnelGateUnauthorizedResponse,
} from "./tunnel-gate";
import { getShareUrlHintsJson } from "./share-url-hints";
import { json, logLine } from "./utils";
import { Router } from "./router";
import { registerAuthRoutes } from "./routes/auth";
import { registerPortalRoutes } from "./routes/portal";
import { registerAdminRoutes } from "./routes/admin";
import { registerClientRoutes } from "./routes/client";

// Integrated terminal: in production (`NODE_ENV=production`) keep opt-in via WOP_ALLOW_TERMINAL only.
// In non-production, default on when unset so local `npm run dev` gets a real shell; disable with WOP_ALLOW_TERMINAL=0|false|no|off.
// `npm run dev` forces NODE_ENV=development for the Bun process so an inherited NODE_ENV=production cannot skip this default.
if (process.env.NODE_ENV !== "production") {
	const v = process.env.WOP_ALLOW_TERMINAL?.trim();
	if (v === undefined || v === "") {
		process.env.WOP_ALLOW_TERMINAL = "1";
	}
}

/** Settings → Restart server: allowed when unset in dev (`NODE_ENV !== "production"`). Production requires explicit `1`/`true`/`yes`/`on`. Disable in dev with `0`/`false`/`no`/`off`. */
function isWopServerRestartHttpAllowed(): boolean {
	const raw = process.env.WOP_ALLOW_SERVER_RESTART?.trim() ?? "";
	if (raw === "") {
		return process.env.NODE_ENV !== "production";
	}
	const v = raw.toLowerCase();
	if (v === "0" || v === "false" || v === "no" || v === "off") return false;
	return v === "1" || v === "true" || v === "yes" || v === "on";
}

const PORT = Number(process.env.WOP_SERVER_PORT || "3333");
const DIST = join(import.meta.dir, "..", "dist");

type PendingChatItem = { id: string; text: string };

type ChatWsData = {
	kind: "chat";
	messages: ChatMessage[];
	/** True while a chat completion stream is in flight. */
	busy: boolean;
	/** User texts received while `busy`; run after the current turn completes (stable ids for queue UI). */
	pendingChatQueue: PendingChatItem[];
	/** Per-connection override (UI-selected); falls back to Pi-aligned defaults (`resolveOllamaModelDefault` / OPENROUTER_MODEL). */
	ollamaModel?: string;
	openrouterModel?: string;
	/** Cursor-style Plan vs Build: Plan injects Pi planner-style system instructions. */
	chatMode: ChatSessionMode;
	/** Selected Pi agent `name` from workspace `.md`, or null for generic assistant. */
	agentName: string | null;
	/** Resolved agent markdown body (after frontmatter); mirrors last successful `agentName`. */
	cachedAgentBody: string | null;
	/** Comma-separated skills string from agent frontmatter, cached alongside `cachedAgentBody`. */
	cachedAgentSkills: string | null;
	/** Abort in-flight LLM stream (Pi-style stop generation). */
	chatAbort: AbortController | null;
	/** Cumulative prompt + completion tokens (Pi footer-style — sums per finished assistant turn). */
	cumPromptTokens: number;
	cumCompletionTokens: number;
	/** Client chat tab id — persists transcript under `agent/sessions/wayofpi-chat-*.jsonl`. */
	wopSessionKey: string | null;
	tenantId: string;
	userId: string;
};

type ServerWsData = ChatWsData | TerminalWsData;

async function resolveAgentSkillsFromName(agentName: string, tenantId: string): Promise<string | null> {
	try {
		const { agents } = await loadWorkspaceAgents(tenantId);
		const hit = agents.find((a) => a.name.toLowerCase() === agentName.trim().toLowerCase());
		return hit?.skills ?? null;
	} catch {
		return null;
	}
}

async function applyLeadFromCache(
	data: ChatWsData,
	opts?: {
		/**
		 * Phrase-dispatch: specialist body is merged for this turn only while `agentName` stays null (Pi dispatcher).
		 * Must match that specialist for Plan-mode planner dedup (avoid stacking planner twice on `planner.md`).
		 */
		effectiveAgentNameLower?: string | null;
	},
) {
	const agentNameLower =
		data.agentName?.trim().toLowerCase() ??
		(opts?.effectiveAgentNameLower != null ? opts.effectiveAgentNameLower.trim().toLowerCase() : null) ??
		null;
	let plannerBody: string | null = null;
	if (data.chatMode === "plan" && agentNameLower !== "planner") {
		plannerBody = readPlannerAgentBodySync(getPrimaryWorkspacePath(data.tenantId));
	}
	const piJson = shouldUsePiJsonChat();
	await applyLeadSystem(data.messages, {
		mode: data.chatMode,
		envSystemPrompt: process.env.WOP_SYSTEM_PROMPT,
		agentBody: data.cachedAgentBody,
		agentSkills: data.cachedAgentSkills,
		agentNameLower,
		plannerAgentBody: plannerBody,
		orchestratorPiToolsEnabled: orchestratorToolsEnabled() && !piJson,
		piJsonChatRuntime: piJson,
		workspaceIndexBoost: getWorkspaceIndexChatBoostSync(),
	});
}

function sendQueueState(ws: { send: (data: string) => void }, queue: PendingChatItem[]) {
	try {
		ws.send(
			JSON.stringify({
				type: "queue_state",
				pending: queue.length,
				items: queue.map((q) => ({ id: q.id, text: q.text })),
			}),
		);
	} catch {
		/* socket may be closing */
	}
}

function effectiveChatModelId(data: ChatWsData): string {
	const provider = (process.env.WOP_LLM_PROVIDER || "ollama").toLowerCase();
	if (provider === "openrouter") {
		return (data.openrouterModel || process.env.OPENROUTER_MODEL || "openrouter/auto").trim();
	}
	return (data.ollamaModel || resolveOllamaModelDefault(data.tenantId)).trim();
}

function sendChatUsageMeter(
	ws: { send: (data: string) => void },
	data: ChatWsData,
	lastTurn: StreamTokenUsage,
	usageApproximate: boolean,
) {
	const model = effectiveChatModelId(data);
	const win = estimateContextWindowTokens(model);
	const lp = lastTurn.promptTokens;
	const pct = win != null && lp > 0 ? Math.min(100, (lp / win) * 100) : null;
	try {
		ws.send(
			JSON.stringify({
				type: "chat_usage",
				streamPeek: false,
				lastPrompt: lastTurn.promptTokens,
				lastCompletion: lastTurn.completionTokens,
				cumPrompt: data.cumPromptTokens,
				cumCompletion: data.cumCompletionTokens,
				contextWindow: win,
				contextPercent: pct,
				approximate: usageApproximate,
			}),
		);
	} catch {
		/* closing */
	}
}

/** Mid-stream usage from SSE (Pi-style live footer) — session cum not incremented until the turn completes. */
function sendChatUsageStreamPeek(
	ws: { send: (data: string) => void },
	data: ChatWsData,
	u: StreamTokenUsage,
) {
	const model = effectiveChatModelId(data);
	const win = estimateContextWindowTokens(model);
	const cumP = data.cumPromptTokens;
	const cumC = data.cumCompletionTokens;
	const lp = Math.max(0, u.promptTokens);
	const lc = Math.max(0, u.completionTokens);
	const estInput = cumP + lp;
	const pct = win != null && estInput > 0 ? Math.min(100, (estInput / win) * 100) : null;
	try {
		ws.send(
			JSON.stringify({
				type: "chat_usage",
				streamPeek: true,
				lastPrompt: lp,
				lastCompletion: lc,
				cumPrompt: cumP,
				cumCompletion: cumC,
				contextWindow: win,
				contextPercent: pct,
				approximate: false,
			}),
		);
	} catch {
		/* closing */
	}
}

async function processActivateSession(
	ws: { data: ChatWsData; send: (data: string) => void },
	msg: { transcript?: unknown; sessionKey?: unknown },
): Promise<void> {
	const raw = msg.transcript;
	if (!Array.isArray(raw)) {
		ws.send(
			JSON.stringify({
				type: "error",
				message: "activate_session requires a transcript array of user/assistant messages.",
			}),
		);
		return;
	}
	const skRaw = msg.sessionKey;
	const sessionKey =
		typeof skRaw === "string" && skRaw.trim() ? sanitizeSessionKey(skRaw.trim()) : null;
	ws.data.wopSessionKey = sessionKey;

	const next: ChatMessage[] = [];
	for (const item of raw.slice(0, 500)) {
		if (!item || typeof item !== "object") continue;
		const role = (item as { role?: unknown }).role;
		const content = String((item as { content?: unknown }).content ?? "");
		if (role === "user" || role === "assistant") {
			next.push({ role, content });
		}
	}

	let hydratedFromDisk = false;
	if (next.length === 0 && sessionKey) {
		const disk = await loadWayofpiSessionMessages(sessionKey);
		if (disk.length > 0) {
			ws.data.messages = disk;
			hydratedFromDisk = true;
		} else {
			ws.data.messages = [];
		}
	} else {
		ws.data.messages = next;
	}

	ws.data.pendingChatQueue = [];
	ws.data.cumPromptTokens = 0;
	ws.data.cumCompletionTokens = 0;
	sendQueueState(ws, []);
	await applyLeadFromCache(ws.data);

	if (sessionKey) {
		try {
			await syncWayofpiSessionFile(sessionKey, ws.data.messages);
			const n = ws.data.messages.filter((m) => m.role === "user" || m.role === "assistant").length;
			broadcastToolLog(
				"INFO",
				"session",
				`JSONL ${wayofpiSessionBasename(sessionKey)} (${n} turn${n === 1 ? "" : "s"})`,
			);
		} catch (e) {
			const m = e instanceof Error ? e.message : String(e);
			ws.send(logLine("WARN", "session", `Failed to write session JSONL: ${m}`));
		}
	}

	const userAsstCount = ws.data.messages.filter(
		(m) =>
			m.role === "user" ||
			(m.role === "assistant" && String(m.content ?? "").trim().length > 0),
	).length;
	ws.send(
		logLine(
			"INFO",
			"chat",
			hydratedFromDisk && sessionKey
				? `Restored ${userAsstCount} message(s) from ${wayofpiSessionBasename(sessionKey)}`
				: `Chat tab active — ${userAsstCount} message${userAsstCount === 1 ? "" : "s"} for this connection.`,
		),
	);

	if (hydratedFromDisk && sessionKey) {
		const turns = ws.data.messages
			.filter(
				(m) =>
					m.role === "user" ||
					(m.role === "assistant" && String(m.content ?? "").trim().length > 0),
			)
			.map((m) => ({ role: m.role as "user" | "assistant", content: String(m.content ?? "") }));
		ws.send(JSON.stringify({ type: "session_transcript", sessionKey, turns }));
	}
}

async function applySlashMutations(
	ws: { data: ChatWsData; send: (data: string) => void },
	mutation: ChatSlashMutation | undefined,
): Promise<void> {
	if (!mutation) return;
	const data = ws.data;
	if (mutation.setModelId) {
		const id = mutation.setModelId;
		const provider = (process.env.WOP_LLM_PROVIDER || "ollama").toLowerCase();
		if (provider === "openrouter") {
			data.openrouterModel = id;
			data.ollamaModel = undefined;
		} else {
			data.ollamaModel = id;
			data.openrouterModel = undefined;
		}
		ws.send(JSON.stringify({ type: "model_set", effectiveModel: id, provider }));
	}
	if (mutation.setChatMode) {
		data.chatMode = mutation.setChatMode;
		await applyLeadFromCache(data);
		ws.send(JSON.stringify({ type: "chat_mode", mode: mutation.setChatMode }));
		ws.send(
			logLine(
				"INFO",
				"chat",
				mutation.setChatMode === "plan"
					? "Plan mode — session uses workspace planner.md (Pi) when present, else built-in fallback; no duplicate if agent is planner."
					: "Build mode — Orchestrator when no .md agent, else selected agent; WOP_SYSTEM_PROMPT prepended when set.",
			),
		);
	}
	if (mutation.reload) {
		// Re-scan cache: if an agent is active, refresh its body and skills from disk
		if (data.agentName) {
			const freshBody = await getAgentBodyByName(data.agentName, data.tenantId);
			if (freshBody) {
				data.cachedAgentBody = freshBody;
				data.cachedAgentSkills = await resolveAgentSkillsFromName(data.agentName, data.tenantId);
			}
		}
		await applyLeadFromCache(data);
		try {
			ws.send(JSON.stringify({ type: "agents_catalog_changed" }));
		} catch {
			/* ignore */
		}
	}
	if (mutation.setAgentName !== undefined) {
		const name = mutation.setAgentName;
		if (name) {
			const body = await getAgentBodyByName(name, ws.data.tenantId);
			data.agentName = name;
			data.cachedAgentBody = body ?? null;
			data.cachedAgentSkills = await resolveAgentSkillsFromName(name, ws.data.tenantId);
		} else {
			data.agentName = null;
			data.cachedAgentBody = null;
			data.cachedAgentSkills = null;
		}
		await applyLeadFromCache(data);
		ws.send(JSON.stringify({ type: "agent", name: data.agentName }));
		ws.send(
			logLine(
				"INFO",
				"chat",
				data.agentName
					? `Agent persona: ${data.agentName} (markdown system prompt from workspace).`
					: "Agent persona: Orchestrator (no workspace .md — server injects Pi-shaped orchestrator system prompt).",
			),
		);
	}
}

async function runChatTurn(
	ws: { data: ChatWsData; send: (data: string) => void },
	text: string,
	notifyUser: boolean,
	selectedPath?: string | null,
): Promise<void> {
	const data = ws.data;
	data.busy = true;
	/** Snapshot before phrase-dispatch overwrites `cachedAgentBody` for one turn (Pi: dispatcher unchanged). */
	let phraseDispatchRestoreCached: string | null | undefined = undefined;
	try {
		const trimmed = text.trim();
		const slash = await evalChatSlashCommand(trimmed, {
			provider: (process.env.WOP_LLM_PROVIDER || "ollama").toLowerCase(),
			ollamaModel: data.ollamaModel,
			openrouterModel: data.openrouterModel,
		});

		if (slash.handled) {
			if (slash.mutation?.clearTranscript) {
				data.messages = [];
				data.pendingChatQueue = [];
				data.cumPromptTokens = 0;
				data.cumCompletionTokens = 0;
				sendQueueState(ws, []);
				await applyLeadFromCache(data);
				if (data.wopSessionKey) {
					try {
						await syncWayofpiSessionFile(data.wopSessionKey, data.messages);
					} catch (e) {
						const m = e instanceof Error ? e.message : String(e);
						ws.send(logLine("WARN", "session", `sync JSONL after /clear: ${m}`));
					}
				}
				ws.send(JSON.stringify({ type: "session_reset" }));
				ws.send(JSON.stringify({ type: "chat_mode", mode: data.chatMode }));
				ws.send(JSON.stringify({ type: "agent", name: data.agentName }));
				ws.send(logLine("INFO", "chat", "Transcript cleared (/clear)."));
				return;
			}
			await applySlashMutations(ws, slash.mutation);
			if (!slash.skipUserEcho) {
				if (notifyUser) ws.send(JSON.stringify({ type: "user_message", content: trimmed }));
				data.messages.push({ role: "user", content: trimmed });
				if (data.wopSessionKey) await appendWayofpiSessionMessage(data.wopSessionKey, "user", trimmed).catch(() => {});
			}
			ws.send(JSON.stringify({ type: "assistant_turn_start" }));
			const reply = slash.assistantText;
			if (reply.length > 0) {
				ws.send(JSON.stringify({ type: "assistant_delta", content: reply }));
				data.messages.push({ role: "assistant", content: reply });
				if (data.wopSessionKey) await appendWayofpiSessionMessage(data.wopSessionKey, "assistant", reply).catch(() => {});
			}
			ws.send(JSON.stringify({ type: "done" }));
			return;
		}

		await applySlashMutations(ws, slash.mutation);

		if (slash.handled && !slash.skipUserEcho) {
			const lenBeforeUserMsg = data.messages.length;
			if (notifyUser) {
				ws.send(JSON.stringify({ type: "user_message", content: text }));
			}
			
			// Inject context about open file
			let historyText = text;
			if (selectedPath) {
				historyText = `[System Context: User is viewing/editing "${selectedPath}"]\n\n${text}`;
			}
			data.messages.push({ role: "user", content: historyText });

			if (data.wopSessionKey) {
				try {
					await appendWayofpiSessionMessage(data.wopSessionKey, "user", historyText);
				} catch (e) {
					const m = e instanceof Error ? e.message : String(e);
					ws.send(logLine("WARN", "session", `append user JSONL: ${m}`));
				}
			}

			/** Re-merge lead system from disk + env (planner.md, WOP_SYSTEM_PROMPT) before phrase-dispatch and the model. */
			await applyLeadFromCache(data);

			const sendLog = (level: "INFO" | "WARN" | "ERROR", source: string, m: string) => {
				ws.send(logLine(level, source, m));
			};

			ws.send(JSON.stringify({ type: "assistant_turn_start" }));
			const reply = slash.assistantText;
			if (reply?.length > 0) {
				ws.send(JSON.stringify({ type: "assistant_delta", content: reply }));
				data.messages.push({ role: "assistant", content: reply });
				if (data.wopSessionKey) {
					try {
						await appendWayofpiSessionMessage(data.wopSessionKey, "assistant", reply);
					} catch (e) {
						const m = e instanceof Error ? e.message : String(e);
						ws.send(logLine("WARN", "session", `append assistant JSONL: ${m}`));
					}
				}
			}
			ws.send(JSON.stringify({ type: "done" }));
			return;
		}

		const lenBeforeUserMsg = data.messages.length;
		if (notifyUser) {
			ws.send(JSON.stringify({ type: "user_message", content: text }));
		}
		data.messages.push({ role: "user", content: text });
		if (data.wopSessionKey) {
			try {
				await appendWayofpiSessionMessage(data.wopSessionKey, "user", text);
			} catch (e) {
				const m = e instanceof Error ? e.message : String(e);
				ws.send(logLine("WARN", "session", `append user JSONL: ${m}`));
			}
		}

		/** Re-merge lead `system` from disk + env (planner.md, WOP_SYSTEM_PROMPT) before phrase-dispatch and the model. */
		await applyLeadFromCache(data);

		const sendLog = (level: "INFO" | "WARN" | "ERROR", source: string, m: string) => {
			ws.send(logLine(level, source, m));
		};

		/**
		 * Pi-style **phrase dispatch** — infer specialist ("start scout", "dispatch the planner …") like roster hints.
		 * Does **not** persist `agentName` (picker / `set_agent`): specialist `.md` is merged **for this turn only**,
		 * matching Pi **agent-team** where the dispatcher process stays primary.
		 */
		try {
			const disp = await tryAutoDispatchFromUserText(text, data.agentName);
			if (disp.kind === "orchestrator") {
				data.agentName = null;
				data.cachedAgentBody = null;
				data.cachedAgentSkills = null;
				phraseDispatchRestoreCached = undefined;
				await applyLeadFromCache(data);
				ws.send(JSON.stringify({ type: "agent", name: data.agentName }));
				sendLog(
					"INFO",
					"dispatch",
					"Switched to **Orchestrator** (Pi dispatcher posture — no merged specialist `.md`).",
				);
				broadcastToolLog("INFO", "dispatch_agent", "→ orchestrator");
			} else if (disp.kind === "agent") {
				phraseDispatchRestoreCached = data.cachedAgentBody;
				data.cachedAgentBody = disp.body;
				await applyLeadFromCache(data, { effectiveAgentNameLower: disp.canonicalName.trim().toLowerCase() });
				try {
					ws.send(JSON.stringify({ type: "dispatch_turn", agent: disp.canonicalName }));
				} catch {
					/* closing */
				}
				sendLog(
					"INFO",
					"dispatch",
					`Phrase-dispatch **${disp.canonicalName}** for this reply only — session persona unchanged (Pi **dispatch_agent** / dispatcher posture).`,
				);
				broadcastToolLog(
					"INFO",
					"dispatch_agent",
					`→ ${disp.canonicalName} (one turn) — ${text.length > 140 ? `${text.slice(0, 137)}…` : text}`,
				);
			}
		} catch (e) {
			const m = e instanceof Error ? e.message : String(e);
			sendLog("WARN", "dispatch", `Handoff detection skipped: ${m}`);
		}

		ws.send(JSON.stringify({ type: "assistant_turn_start" }));

		const piBlocked = piAgentRuntimeBlockedReason();
		if (piBlocked) {
			ws.send(JSON.stringify({ type: "error", message: piBlocked }));
			sendLog("ERROR", "chat", piBlocked);
			data.messages.length = lenBeforeUserMsg;
			if (data.wopSessionKey) {
				try {
					await syncWayofpiSessionFile(data.wopSessionKey, data.messages);
				} catch {
					/* ignore */
				}
			}
			return;
		}

		const budget = applyChatContextBudget(data.messages, sendLog);
		if (budget.droppedMessages > 0 && data.wopSessionKey) {
			try {
				await syncWayofpiSessionFile(data.wopSessionKey, data.messages);
			} catch (e) {
				const m = e instanceof Error ? e.message : String(e);
				sendLog("WARN", "session", `sync JSONL after context budget trim: ${m}`);
			}
		}

		const ac = new AbortController();
		data.chatAbort = ac;
		const usePiChat = shouldUsePiJsonChat();
		const useOrchestratorTools = !usePiChat && orchestratorToolsEnabled();
		sendLog(
			"INFO",
			"chat",
			usePiChat
				? "Running turn via headless Pi (`pi --mode json`)…"
				: useOrchestratorTools
					? "Chat completion with workspace tools (read, list_dir, grep, write, team_list, team_member_*, …)…"
					: "Requesting completion…",
		);
		let full = "";
		let lastStreamUsage: StreamTokenUsage | null = null;
		const emitUsagePeek = (u: StreamTokenUsage) => {
			sendChatUsageStreamPeek(ws, data, u);
		};
		const sendReasoning = (delta: string) => {
			try {
				ws.send(JSON.stringify({ type: "assistant_reasoning_delta", content: delta }));
			} catch {
				/* closing */
			}
		};
		try {
			let result: StreamChatResult;
			if (usePiChat) {
				const surface = data.wopSessionKey?.split(".")[0] || null;
				const piStack = getPiStackForSurface(surface);
				const o = await runPiChatTurn({
					cwd: getPrimaryWorkspacePath(data.tenantId),
					messages: data.messages,
					piStack,
					onDelta: (delta) => {
						full += delta;
						ws.send(JSON.stringify({ type: "assistant_delta", content: delta }));
					},
					onReasoningDelta: sendReasoning,
					onStreamUsage: emitUsagePeek,
					onLog: sendLog,
					signal: ac.signal,
					runtime: {
						ollamaModel: data.ollamaModel,
						openrouterModel: data.openrouterModel,
					},
				});
				result = o.result;
				lastStreamUsage = o.lastStreamUsage;
			} else if (useOrchestratorTools) {
				const o = await runOrchestratorToolLoop(
					data.messages,
					(delta) => {
						full += delta;
						ws.send(JSON.stringify({ type: "assistant_delta", content: delta }));
					},
					sendLog,
					{
						ollamaModel: data.ollamaModel,
						openrouterModel: data.openrouterModel,
					},
					{
						signal: ac.signal,
						onStreamUsage: emitUsagePeek,
						onReasoningDelta: sendReasoning,
						onAgentsCatalogChanged: () => {
							try {
								ws.send(JSON.stringify({ type: "agents_catalog_changed" }));
							} catch {
								/* closing */
							}
						},
						onWorkspaceFileWritten: (relPath) => {
							try {
								ws.send(JSON.stringify({ type: "focus_workspace_file", path: relPath }));
							} catch {
								/* closing */
							}
						},
						tenantId: data.tenantId,
						userId: data.userId,
					},
				);
				result = o.result;
				lastStreamUsage = o.lastStreamUsage;
				full = o.finalAssistantText;
			} else {
				result = await streamChatCompletion(
					data.messages,
					(delta) => {
						full += delta;
						ws.send(JSON.stringify({ type: "assistant_delta", content: delta }));
					},
					sendLog,
					{
						ollamaModel: data.ollamaModel,
						openrouterModel: data.openrouterModel,
					},
					{
						signal: ac.signal,
						onReasoningDelta: sendReasoning,
						onStreamUsage: (u) => {
							lastStreamUsage = u;
							emitUsagePeek(u);
						},
					},
				);
			}

			if (!result.ok) {
				if ("aborted" in result && result.aborted) {
					if (useOrchestratorTools) {
						data.messages.length = lenBeforeUserMsg;
						sendLog("WARN", "chat", "Generation stopped by user.");
						ws.send(JSON.stringify({ type: "done" }));
						return;
					}
					const msgsBeforeAssistantAbort = data.messages;
					const turnUsageAbort =
						lastStreamUsage ??
						approximateStreamUsageFromMessages(msgsBeforeAssistantAbort, full);
					const approxAbort = lastStreamUsage == null;
					if (full.length > 0) {
						data.messages.push({ role: "assistant", content: full });
						if (data.wopSessionKey) {
							try {
								await appendWayofpiSessionMessage(data.wopSessionKey, "assistant", full);
							} catch (e) {
								const m = e instanceof Error ? e.message : String(e);
								sendLog("WARN", "session", `append assistant JSONL: ${m}`);
							}
						}
					}
					sendLog("WARN", "chat", "Generation stopped by user.");
					data.cumPromptTokens += turnUsageAbort.promptTokens;
					data.cumCompletionTokens += turnUsageAbort.completionTokens;
					sendChatUsageMeter(ws, data, turnUsageAbort, approxAbort);
					ws.send(JSON.stringify({ type: "done" }));
					return;
				}
				if ("error" in result) {
					ws.send(JSON.stringify({ type: "error", message: result.error }));
					data.messages.length = lenBeforeUserMsg;
					if (data.wopSessionKey) {
						try {
							await syncWayofpiSessionFile(data.wopSessionKey, data.messages);
						} catch {
							/* ignore */
						}
					}
				}
				return;
			}

			const msgsBeforeAssistant = useOrchestratorTools
				? data.messages.slice(0, -1)
				: data.messages;
			const turnUsage =
				lastStreamUsage ?? approximateStreamUsageFromMessages(msgsBeforeAssistant, full);
			const approxTurn = lastStreamUsage == null;
			data.cumPromptTokens += turnUsage.promptTokens;
			data.cumCompletionTokens += turnUsage.completionTokens;
			if (!useOrchestratorTools) {
				data.messages.push({ role: "assistant", content: full });
			}
			if (data.wopSessionKey && full.length > 0) {
				try {
					await appendWayofpiSessionMessage(data.wopSessionKey, "assistant", full);
				} catch (e) {
					const m = e instanceof Error ? e.message : String(e);
					sendLog("WARN", "session", `append assistant JSONL: ${m}`);
				}
			}
			sendChatUsageMeter(ws, data, turnUsage, approxTurn);
			ws.send(JSON.stringify({ type: "done" }));
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			ws.send(JSON.stringify({ type: "error", message }));
			data.messages.length = lenBeforeUserMsg;
			if (data.wopSessionKey) {
				try {
					await syncWayofpiSessionFile(data.wopSessionKey, data.messages);
				} catch {
					/* ignore */
				}
			}
		}
	} finally {
		if (phraseDispatchRestoreCached !== undefined) {
			data.cachedAgentBody = phraseDispatchRestoreCached;
			phraseDispatchRestoreCached = undefined;
			await applyLeadFromCache(data);
		}
		data.chatAbort = null;
		data.busy = false;
		const next = data.pendingChatQueue.shift();
		sendQueueState(ws, data.pendingChatQueue);
		if (next != null) {
			void runChatTurn(ws, next.text, false).catch(() => {
				/* runChatTurn already reports errors to the client */
			});
		}
	}
}

/** Last static analysis snapshot (ESLint or `tsc` under the primary workspace root). */
let lastWorkspaceProblems: WorkspaceProblemsRunResult | null = null;

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
		if (v === null) patchPiJsonChatRuntimeOverride(null);
		else if (typeof v === "boolean") patchPiJsonChatRuntimeOverride(v);
		else return json({ error: "piDrivesChat must be boolean or null" }, 400);
	}
	if (!any) {
		return json(
			{ error: "Provide orchestratorTools, orchestratorBash, and/or piDrivesChat (boolean or null)" },
			400,
		);
	}
	patchOrchestratorGateRuntime(orchPatch);
	return json({
		ok: true,
		orchestratorTools: orchestratorToolsEnabled(),
		orchestratorBash: orchestratorBashEnabled(),
		piDrivesChat: shouldUsePiJsonChat(),
	});
}

const apiRouter = new Router();
registerAuthRoutes(apiRouter);
registerPortalRoutes(apiRouter);
registerAdminRoutes(apiRouter);
registerClientRoutes(apiRouter);

async function handleApi(url: URL, req: Request): Promise<Response> {
	/** Collapse duplicate slashes; strip trailing slash (except root). */
	const p = url.pathname.replace(/\/{2,}/g, "/").replace(/\/+$/, "") || "/";

	// Extract auth before any route handling so router-based routes get it too
	const authHeader = req.headers.get("Authorization");
	const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
	let auth = token ? await verifyToken(token) : null;

	// Check router-based routes first (login portals) — passes auth so portal/admin routes work
	const routerRes = await apiRouter.handle(url, req, auth);
	if (routerRes) return routerRes;

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

	const isPublicRoute = p === "/api/manifest" || p === "/api/config" || p === "/api/health";

	if (!auth) {
		if (!isPublicRoute) {
			return json({ error: "Unauthorized" }, 401);
		}
	}

	if (p === "/api/health") {
		return json({
			ok: true,
			service: "wayofwork-ui-server",
			time: new Date().toISOString(),
			/** Bump clients (Vite/Electron “Start service”) so they do not treat an old Bun on this port as healthy. */
			capabilities: {
				workspaceProblems: true,
				/** **`POST /api/config`** runtime toggles (Pi drives chat, orchestrator tools/bash) exist on this build. */
				configRuntimePost: true,
				/** **`GET /api/claw/tree`** — host **`.claw/`** file explorer for Claw mode. */
				clawHostTreeGet: true,
				/** **`GET /api/claw/telegram/status`** and **`GET /api/config`** → **`clawTelegramStatus`**. */
				clawTelegramStatusGet: true,
			},
		});
	}

	// Ticket system (ÄTA) API
	const ticketRes = await handleTicketApi(p, req.method, auth, req);
	if (ticketRes) return ticketRes;

	if (p === "/api/claw/tree" && req.method === "GET") {
		try {
			const { rootDisplay, nodes } = await buildClawHostTree();
			return json({ rootDisplay, nodes });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: message }, 500);
		}
	}

	if (p === "/api/claw/automation" && req.method === "GET") {
		try {
			return json(getClawAutomationStatus());
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ version: 1, error: message }, 500);
		}
	}

	if (p === "/api/claw/mission-events" && req.method === "GET") {
		try {
			const events = await readClawMissionEvents(40);
			return json({ version: 1, events });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ version: 1, events: [], error: message }, 500);
		}
	}

	if (p === "/api/claw/schedules" && req.method === "GET") {
		try {
			const schedules = await readClawSchedulesMerged();
			return json({ version: 1, schedules });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ version: 1, schedules: [], error: message }, 500);
		}
	}

	if (p === "/api/claw/schedules" && req.method === "PUT") {
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
	}

	// Worker Portal APIs
	if (p === "/api/projects" && req.method === "GET") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			const projects = db.query("SELECT * FROM projects WHERE tenant_id = ?").all(auth.tenantId) as any[];
			return json(projects || []);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch projects", details: message }, 500);
		}
	}

	if (p === "/api/projects" && req.method === "POST") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: { name?: string; description?: string; budget_allocated?: number; status?: string };
		try {
			body = (await req.json()) as any;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		if (!body.name) return json({ error: "Name required" }, 400);
		try {
			const id = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
			db.query(`
				INSERT INTO projects (id, tenant_id, name, description, budget_allocated, status, created_by)
				VALUES (?, ?, ?, ?, ?, ?, ?)
			`).run(id, auth.tenantId, body.name, body.description || null, body.budget_allocated || 0, body.status || "active", auth.userId);
			const project = db.query("SELECT * FROM projects WHERE id = ?").get(id);
			return json(project);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to create project", details: message }, 500);
		}
	}

	if (p.startsWith("/api/projects/") && req.method === "PUT") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const id = p.split("/")[3];
		let body: any;
		try {
			body = await req.json();
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		try {
			const existing = db.query("SELECT * FROM projects WHERE id = ? AND tenant_id = ?").get(id, auth.tenantId);
			if (!existing) return json({ error: "Project not found" }, 404);
			
			db.query(`
				UPDATE projects 
				SET name = COALESCE(?, name), 
				    description = COALESCE(?, description), 
				    budget_allocated = COALESCE(?, budget_allocated), 
				    status = COALESCE(?, status)
				WHERE id = ? AND tenant_id = ?
			`).run(body.name, body.description, body.budget_allocated, body.status, id, auth.tenantId);
			
			const project = db.query("SELECT * FROM projects WHERE id = ?").get(id);
			return json(project);
		} catch (e) {
			return json({ error: "Failed to update project" }, 500);
		}
	}

	if (p.startsWith("/api/projects/") && req.method === "DELETE") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const id = p.split("/")[3];
		try {
			const existing = db.query("SELECT * FROM projects WHERE id = ? AND tenant_id = ?").get(id, auth.tenantId);
			if (!existing) return json({ error: "Project not found" }, 404);
			db.query("DELETE FROM projects WHERE id = ? AND tenant_id = ?").run(id, auth.tenantId);
			db.query("UPDATE tasks SET project_id = NULL WHERE project_id = ?").run(id);
			return json({ ok: true });
		} catch (e) {
			return json({ error: "Failed to delete project" }, 500);
		}
	}

	if (p === "/api/notes" && req.method === "GET") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			const notes = db.query("SELECT * FROM notes WHERE tenant_id = ?").all(auth.tenantId) as any[];
			return json(notes || []);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch notes", details: message }, 500);
		}
	}

	if (p === "/api/notes" && req.method === "POST") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: { title?: string; content?: string; project_id?: string };
		try {
			body = (await req.json()) as any;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		if (!body.title) return json({ error: "Title required" }, 400);
		try {
			const id = `note_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
			db.query(`
				INSERT INTO notes (id, tenant_id, project_id, title, content, created_by)
				VALUES (?, ?, ?, ?, ?, ?)
			`).run(id, auth.tenantId, body.project_id || null, body.title, body.content || null, auth.userId);
			const note = db.query("SELECT * FROM notes WHERE id = ?").get(id);
			return json(note);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to create note", details: message }, 500);
		}
	}

	if (p.startsWith("/api/notes/") && req.method === "PUT") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const id = p.split("/")[3];
		let body: any;
		try {
			body = await req.json();
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		try {
			db.query(`
				UPDATE notes 
				SET title = COALESCE(?, title), 
				    content = COALESCE(?, content),
				    updated_at = datetime('now')
				WHERE id = ? AND tenant_id = ?
			`).run(body.title, body.content, id, auth.tenantId);
			const note = db.query("SELECT * FROM notes WHERE id = ?").get(id);
			return json(note);
		} catch (e) {
			return json({ error: "Failed to update note" }, 500);
		}
	}

	if (p === "/api/calendar/events" && req.method === "GET") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			const events = db.query("SELECT * FROM calendar_events WHERE tenant_id = ? AND (user_id = ? OR created_by = ?)").all(auth.tenantId, auth.userId, auth.userId) as any[];
			return json(events || []);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch events", details: message }, 500);
		}
	}

	if (p === "/api/calendar/events" && req.method === "POST") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: { title?: string; description?: string; start_date?: string; end_date?: string; all_day?: boolean; project_id?: string };
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
			`).run(id, auth.tenantId, auth.userId, body.project_id || null, body.title, body.description || null, body.start_date, body.end_date, body.all_day ? 1 : 0, auth.userId);
			const event = db.query("SELECT * FROM calendar_events WHERE id = ?").get(id);
			return json(event);
		} catch (e) {
			return json({ error: "Failed to create event" }, 500);
		}
	}

	// PUT /api/calendar/events/:id
	const calendarEventMatch = p.match(/^\/api\/calendar\/events\/(.+)$/);
	if (calendarEventMatch && req.method === "PUT") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const eventId = calendarEventMatch[1];
		let body: { title?: string; description?: string; start_date?: string; end_date?: string; all_day?: boolean; project_id?: string };
		try {
			body = (await req.json()) as any;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		try {
			const existing = db.query("SELECT * FROM calendar_events WHERE id = ? AND tenant_id = ?").get(eventId, auth.tenantId) as any;
			if (!existing) return json({ error: "Event not found" }, 404);
			const title = body.title ?? existing.title;
			const description = body.description !== undefined ? body.description : existing.description;
			const start_date = body.start_date ?? existing.start_date;
			const end_date = body.end_date ?? existing.end_date;
			const all_day = body.all_day !== undefined ? (body.all_day ? 1 : 0) : existing.all_day;
			const project_id = body.project_id !== undefined ? body.project_id : existing.project_id;
			db.query(`
				UPDATE calendar_events SET title = ?, description = ?, start_date = ?, end_date = ?, all_day = ?, project_id = ?
				WHERE id = ? AND tenant_id = ?
			`).run(title, description, start_date, end_date, all_day, project_id, eventId, auth.tenantId);
			const updated = db.query("SELECT * FROM calendar_events WHERE id = ?").get(eventId);
			return json(updated);
		} catch (e) {
			return json({ error: "Failed to update event" }, 500);
		}
	}

	if (calendarEventMatch && req.method === "DELETE") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const eventId = calendarEventMatch[1];
		try {
			const existing = db.query("SELECT * FROM calendar_events WHERE id = ? AND tenant_id = ?").get(eventId, auth.tenantId) as any;
			if (!existing) return json({ error: "Event not found" }, 404);
			db.query("DELETE FROM calendar_events WHERE id = ? AND tenant_id = ?").run(eventId, auth.tenantId);
			return json({ ok: true });
		} catch (e) {
			return json({ error: "Failed to delete event" }, 500);
		}
	}

	if (p === "/api/portal/me" && req.method === "GET") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const user = db.query("SELECT id, username, role, tenant_id FROM users WHERE id = ?").get(auth.userId) as any;
		if (!user) return json({ error: "User not found" }, 404);
		return json({ id: user.id, username: user.username, role: user.role, tenantId: user.tenant_id });
	}

	if (p === "/api/portal/me" && req.method === "PUT") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: any;
		try {
			body = await req.json();
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		try {
			db.query(`
				UPDATE users 
				SET full_name = COALESCE(?, full_name), 
				    email = COALESCE(?, email),
				    phone = COALESCE(?, phone)
				WHERE id = ? AND tenant_id = ?
			`).run(body.full_name, body.email, body.phone, auth.userId, auth.tenantId);
			const user = db.query("SELECT id, username, role, tenant_id, full_name, email, phone FROM users WHERE id = ?").get(auth.userId);
			return json(user);
		} catch (e) {
			return json({ error: "Failed to update profile" }, 500);
		}
	}

	if (p === "/api/portal/change-pin" && req.method === "POST") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: { pin?: string };
		try {
			body = await req.json();
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		if (!body.pin || body.pin.length !== 4) return json({ error: "4-digit PIN required" }, 400);
		try {
			db.query("UPDATE users SET pin = ? WHERE id = ? AND tenant_id = ?").run(body.pin, auth.userId, auth.tenantId);
			return json({ ok: true });
		} catch (e) {
			return json({ error: "Failed to update PIN" }, 500);
		}
	}

	if (p === "/api/portal/tasks" && req.method === "GET") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			// Workers see only their tasks, Leaders/Admins see all tasks for the tenant
			const isLeader = auth.role === "LEADER" || auth.role === "ADMIN" || auth.role === "SUPER_ADMIN";
			
			if (isLeader) {
				const tasks = db.query(`
					SELECT t.*, u.username as assigned_name, p.name as project_name
					FROM tasks t
					LEFT JOIN users u ON t.assigned_to = u.id
					LEFT JOIN projects p ON t.project_id = p.id
					WHERE t.tenant_id = ?
					ORDER BY t.due_date ASC, t.created_at DESC
				`).all(auth.tenantId) as any[];
				return json(tasks || []);
			} else {
				const tasks = db.query(`
					SELECT t.*, p.name as project_name
					FROM tasks t
					LEFT JOIN projects p ON t.project_id = p.id
					WHERE t.tenant_id = ? AND t.assigned_to = ?
					ORDER BY t.due_date ASC, t.created_at DESC
				`).all(auth.tenantId, auth.userId) as any[];
				return json(tasks || []);
			}
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch tasks", details: message }, 500);
		}
	}

	if (p === "/api/portal/files" && req.method === "GET") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			const files = db.query(`
				SELECT *
				FROM workspace_files
				WHERE tenant_id = ?
				ORDER BY created_at DESC
			`).all(auth.tenantId) as any[];
			return json(files || []);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch files", details: message }, 500);
		}
	}

	if (p.startsWith("/api/portal/files/") && req.method === "GET") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const id = p.split("/")[4];
		try {
			const file = db.query("SELECT * FROM workspace_files WHERE id = ? AND tenant_id = ?").get(id, auth.tenantId);
			if (!file) return json({ error: "File not found" }, 404);
			return json(file);
		} catch (e) {
			return json({ error: "Failed to fetch file" }, 500);
		}
	}

	if (p.startsWith("/api/portal/files/") && req.method === "PUT") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const id = p.split("/")[4];
		let body: any;
		try {
			body = await req.json();
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		try {
			db.query(`
				UPDATE workspace_files 
				SET kanban_card_id = COALESCE(?, kanban_card_id), 
				    kanban_board_id = COALESCE(?, kanban_board_id)
				WHERE id = ? AND tenant_id = ?
			`).run(body.kanban_card_id, body.kanban_board_id, id, auth.tenantId);
			const file = db.query("SELECT * FROM workspace_files WHERE id = ?").get(id);
			return json(file);
		} catch (e) {
			return json({ error: "Failed to update file" }, 500);
		}
	}

	if (p.startsWith("/api/portal/files/") && req.method === "DELETE") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const id = p.split("/")[4];
		try {
			const result = db.query("DELETE FROM workspace_files WHERE id = ? AND tenant_id = ?").run(id, auth.tenantId);
			if (result.changes === 0) return json({ error: "File not found" }, 404);
			return json({ ok: true });
		} catch (e) {
			return json({ error: "Failed to delete file" }, 500);
		}
	}

	if (p === "/api/portal/time" && req.method === "GET") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			const entries = db.query(`
				SELECT te.*, t.title as task_title, p.name as project_name
				FROM time_entries te
				LEFT JOIN tasks t ON te.task_id = t.id
				LEFT JOIN projects p ON te.project_id = p.id
				WHERE te.tenant_id = ? AND te.user_id = ?
				ORDER BY te.date DESC, te.created_at DESC
				LIMIT 100
			`).all(auth.tenantId, auth.userId) as any[];
			return json(entries || []);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch time entries", details: message }, 500);
		}
	}

	if (p === "/api/portal/time" && req.method === "POST") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: { hours?: number; project?: string; date?: string; taskId?: string; description?: string; drawingRef?: string };
		try {
			body = (await req.json()) as { hours?: number; project?: string; date?: string; taskId?: string; description?: string; drawingRef?: string };
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}

		if (!body.hours || !body.project || !body.date) {
			return json({ error: "Missing required fields: hours, project, date" }, 400);
		}

		try {
			const id = `time_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
			const result = db.query(`
				INSERT INTO time_entries (id, tenant_id, user_id, project_id, task_id, date, hours, description, drawing_ref, status)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
			`).run(id, auth.tenantId, auth.userId, body.project, body.taskId || null, body.date, body.hours, body.description || null, body.drawingRef || null);

			if (result.changes === 0) {
				return json({ error: "Failed to save time entry" }, 500);
			}

			return json({ ok: true, id });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to save time entry", details: message }, 500);
		}
	}

	if (p.startsWith("/api/portal/time/") && req.method === "GET") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const id = p.split("/")[4];
		if (id === "approve" || id === "reject") {
			// handled by other regexes
		} else {
			try {
				const entry = db.query("SELECT * FROM time_entries WHERE id = ? AND tenant_id = ?").get(id, auth.tenantId);
				if (!entry) return json({ error: "Entry not found" }, 404);
				return json(entry);
			} catch (e) {
				return json({ error: "Failed to fetch time entry" }, 500);
			}
		}
	}

	if (p.startsWith("/api/portal/time/") && req.method === "PUT") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const id = p.split("/")[4];
		if (id === "approve" || id === "reject") {
			// handled by other regexes
		} else {
			let body: any;
			try {
				body = await req.json();
			} catch {
				return json({ error: "Invalid JSON" }, 400);
			}
			try {
				db.query(`
					UPDATE time_entries 
					SET hours = COALESCE(?, hours), 
					    date = COALESCE(?, date),
					    description = COALESCE(?, description),
					    drawing_ref = COALESCE(?, drawing_ref),
					    project_id = COALESCE(?, project_id),
					    task_id = COALESCE(?, task_id)
					WHERE id = ? AND tenant_id = ?
				`).run(body.hours, body.date, body.description, body.drawing_ref, body.project_id, body.task_id, id, auth.tenantId);
				const entry = db.query("SELECT * FROM time_entries WHERE id = ?").get(id);
				return json(entry);
			} catch (e) {
				return json({ error: "Failed to update time entry" }, 500);
			}
		}
	}

	if (p.startsWith("/api/portal/time/") && req.method === "DELETE") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const id = p.split("/")[4];
		try {
			const result = db.query("DELETE FROM time_entries WHERE id = ? AND tenant_id = ?").run(id, auth.tenantId);
			if (result.changes === 0) return json({ error: "Entry not found" }, 404);
			return json({ ok: true });
		} catch (e) {
			return json({ error: "Failed to delete time entry" }, 500);
		}
	}

	// Time Entry Approve
	if (p.match(/^\/api\/portal\/time\/[^/]+\/approve$/) && req.method === "POST") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			const timeId = p.split("/")[4];
			const result = db.query("UPDATE time_entries SET status = 'approved', reviewed_at = datetime('now') WHERE id = ? AND tenant_id = ?")
				.run(timeId, auth.tenantId);
			if (result.changes === 0) return json({ error: "Time entry not found" }, 404);
			return json({ ok: true, status: "approved" });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to approve time entry", details: message }, 500);
		}
	}

	// Time Entry Reject
	if (p.match(/^\/api\/portal\/time\/[^/]+\/reject$/) && req.method === "POST") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: { notes?: string };
		try {
			body = (await req.json()) as { notes?: string };
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		try {
			const timeId = p.split("/")[4];
			const result = db.query("UPDATE time_entries SET status = 'rejected', leader_notes = ?, reviewed_at = datetime('now') WHERE id = ? AND tenant_id = ?")
				.run(body.notes || null, timeId, auth.tenantId);
			if (result.changes === 0) return json({ error: "Time entry not found" }, 404);
			return json({ ok: true, status: "rejected" });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to reject time entry", details: message }, 500);
		}
	}

	// Task Management - Create task
	if (p === "/api/portal/tasks" && req.method === "POST") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: { title?: string; assigned_to?: string; project_id?: string; estimated_hours?: number; due_date?: string; kanban_card_id?: string; kanban_board_id?: string };
		try {
			body = (await req.json()) as any;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		if (!body.title) {
			return json({ error: "Title required" }, 400);
		}
		try {
			const id = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
			db.query(`
				INSERT INTO tasks (id, tenant_id, title, assigned_to, project_id, estimated_hours, due_date, status, created_by, kanban_card_id, kanban_board_id)
				VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)
			`).run(id, auth.tenantId, body.title, body.assigned_to || null, body.project_id || null, body.estimated_hours || null, body.due_date || null, auth.userId, body.kanban_card_id || null, body.kanban_board_id || null);
			const task = db.query("SELECT * FROM tasks WHERE id = ?").get(id);
			return json(task);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to create task", details: message }, 500);
		}
	}

	if (p.startsWith("/api/portal/tasks/") && req.method === "GET") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const id = p.split("/")[4];
		if (id === "status") {
			// handled by regex
		} else {
			try {
				const task = db.query("SELECT * FROM tasks WHERE id = ? AND tenant_id = ?").get(id, auth.tenantId);
				if (!task) return json({ error: "Task not found" }, 404);
				return json(task);
			} catch (e) {
				return json({ error: "Failed to fetch task" }, 500);
			}
		}
	}

	if (p.startsWith("/api/portal/tasks/") && req.method === "PUT") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const id = p.split("/")[4];
		if (id === "status") {
			// handled below
		} else {
			let body: any;
			try {
				body = await req.json();
			} catch {
				return json({ error: "Invalid JSON" }, 400);
			}
			try {
				const existing = db.query("SELECT * FROM tasks WHERE id = ? AND tenant_id = ?").get(id, auth.tenantId);
				if (!existing) return json({ error: "Task not found" }, 404);
				
				db.query(`
					UPDATE tasks 
					SET title = COALESCE(?, title), 
					    assigned_to = COALESCE(?, assigned_to),
					    project_id = COALESCE(?, project_id),
					    estimated_hours = COALESCE(?, estimated_hours),
					    due_date = COALESCE(?, due_date),
					    status = COALESCE(?, status),
					    kanban_card_id = COALESCE(?, kanban_card_id),
					    kanban_board_id = COALESCE(?, kanban_board_id),
					    updated_at = datetime('now')
					WHERE id = ? AND tenant_id = ?
				`).run(body.title, body.assigned_to, body.project_id, body.estimated_hours, body.due_date, body.status, body.kanban_card_id, body.kanban_board_id, id, auth.tenantId);
				
				const task = db.query("SELECT * FROM tasks WHERE id = ?").get(id);
				return json(task);
			} catch (e) {
				return json({ error: "Failed to update task" }, 500);
			}
		}
	}

	if (p.startsWith("/api/portal/tasks/") && req.method === "DELETE") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const id = p.split("/")[4];
		try {
			const result = db.query("DELETE FROM tasks WHERE id = ? AND tenant_id = ?").run(id, auth.tenantId);
			if (result.changes === 0) return json({ error: "Task not found" }, 404);
			return json({ ok: true });
		} catch (e) {
			return json({ error: "Failed to delete task" }, 500);
		}
	}

	// Task Management - Update task status
	if (p.match(/^\/api\/portal\/tasks\/[^/]+\/status$/) && req.method === "PUT") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: { status?: string };
		try {
			body = (await req.json()) as { status?: string };
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		try {
			const taskId = p.split("/")[4];
			const result = db.query("UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ? AND tenant_id = ?")
				.run(body.status, taskId, auth.tenantId);
			if (result.changes === 0) return json({ error: "Task not found" }, 404);
			return json({ ok: true, status: body.status });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to update task", details: message }, 500);
		}
	}

	// Time Reports
	if (p === "/api/portal/reports/time" && req.method === "GET") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const startDate = url.searchParams.get("start") || "";
		const endDate = url.searchParams.get("end") || "";
		try {
			let query = `
				SELECT te.*, t.title as task_title, p.name as project_name
				FROM time_entries te
				LEFT JOIN tasks t ON te.task_id = t.id
				LEFT JOIN projects p ON te.project_id = p.id
				WHERE te.tenant_id = ?
			`;
			const params: any[] = [auth.tenantId];
			if (startDate) {
				query += " AND te.date >= ?";
				params.push(startDate);
			}
			if (endDate) {
				query += " AND te.date <= ?";
				params.push(endDate);
			}
			query += " ORDER BY te.date DESC";
			const entries = db.query(query).all(...params) as any[];
			return json({ entries: entries || [], startDate, endDate });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to generate report", details: message }, 500);
		}
	}

	if (p.startsWith("/api/portal/download/") && req.method === "GET") {
		if (!auth) return json({ error: "Unauthorized" }, 401);

		const fileId = p.split("/").pop();
		if (!fileId) return json({ error: "File ID required" }, 400);

		try {
			// Get file info from DB (tenant-scoped)
			const file = db.query("SELECT * FROM workspace_files WHERE id = ? AND tenant_id = ?")
				.get(fileId, auth.tenantId) as any;

			if (!file) return json({ error: "File not found" }, 404);

			// Build safe path within tenant workspace
			const workspaceRoot = getPrimaryWorkspacePath(auth.tenantId);
			const safePath = resolve(workspaceRoot, file.file_path);

			// Ensure path is within workspace
			if (!safePath.startsWith(workspaceRoot)) {
				return json({ error: "Invalid file path" }, 403);
			}

			// Check if file exists
			const fileInfo = stat(safePath);
			if (!fileInfo.isFile) {
				return json({ error: "File not found on disk" }, 404);
			}

			// Update download count
			db.query("UPDATE workspace_files SET download_count = download_count + 1 WHERE id = ?")
				.run(fileId);

			// Log audit
			db.query(`
				INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, details_json)
				VALUES (?, ?, 'FILE_DOWNLOAD', 'file', ?, ?)
			`).run(auth.tenantId, auth.userId, fileId, JSON.stringify({ path: file.file_path }));

			// Return file
			const fileContent = readFile(safePath);
			return new Response(fileContent, {
				headers: {
					"Content-Type": file.mime_type || "application/octet-stream",
					"Content-Disposition": `attachment; filename="${file.file_path.split("/").pop()}"`,
					"Content-Length": fileInfo.size.toString(),
				}
			});

		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to download file", details: message }, 500);
		}
	}

	// Admin APIs
	if (p === "/api/admin/tenants" && req.method === "GET") {
		if (!auth || auth.role !== "SUPER_ADMIN") return json({ error: "Forbidden" }, 403);
		try {
			const tenants = db.query(`
				SELECT t.*, COUNT(u.id) as user_count
				FROM tenants t
				LEFT JOIN users u ON t.id = u.tenant_id
				GROUP BY t.id
				ORDER BY t.created_at DESC
			`).all() as any[];
			return json(tenants || []);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch tenants", details: message }, 500);
		}
	}

	if (p === "/api/admin/tenants" && req.method === "POST") {
		if (!auth || auth.role !== "SUPER_ADMIN") return json({ error: "Forbidden" }, 403);
		let body: { name?: string; slug?: string; subscription_tier?: string };
		try {
			body = (await req.json()) as { name?: string; slug?: string; subscription_tier?: string };
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		if (!body.name || !body.slug) {
			return json({ error: "Name and slug required" }, 400);
		}
		try {
			const id = `tenant_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
			db.query(`
				INSERT INTO tenants (id, name, slug, subscription_tier)
				VALUES (?, ?, ?, ?)
			`).run(id, body.name, body.slug, body.subscription_tier || 'basic');
			return json({ ok: true, id });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to create tenant", details: message }, 500);
		}
	}

	if (p === "/api/admin/stats" && req.method === "GET") {
		if (!auth || auth.role !== "SUPER_ADMIN") return json({ error: "Forbidden" }, 403);
		try {
			const stats = {
				tenants: (db.query("SELECT COUNT(*) as count FROM tenants").get() as any).count,
				users: (db.query("SELECT COUNT(*) as count FROM users").get() as any).count,
				clients: (db.query("SELECT COUNT(*) as count FROM users WHERE role = 'CLIENT'").get() as any).count,
				projects: (db.query("SELECT COUNT(*) as count FROM projects").get() as any).count,
				tasks: (db.query("SELECT COUNT(*) as count FROM tasks").get() as any).count,
				timeEntries: (db.query("SELECT COUNT(*) as count FROM time_entries").get() as any).count,
				system: {
					memoryUsage: process.memoryUsage(),
					uptime: process.uptime(),
					platform: process.platform,
					nodeVersion: process.version,
					bunVersion: process.versions?.bun,
				}
			};
			return json(stats);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch stats", details: message }, 500);
		}
	}

	if (p === "/api/admin/users" && req.method === "GET") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const isSuper = auth.role === "SUPER_ADMIN";
		const isAdmin = auth.role === "ADMIN";
		if (!isSuper && !isAdmin) return json({ error: "Forbidden" }, 403);
		
		try {
			let users;
			if (isSuper) {
				users = db.query(`
					SELECT u.id, u.username, u.role, u.tenant_id, u.full_name, u.job_title, u.email, u.phone, t.name as tenant_name
					FROM users u
					LEFT JOIN tenants t ON u.tenant_id = t.id
					ORDER BY u.created_at DESC
				`).all() as any[];
			} else {
				users = db.query(`
					SELECT id, username, role, tenant_id, full_name, job_title, email, phone
					FROM users
					WHERE tenant_id = ?
					ORDER BY created_at DESC
				`).all(auth.tenantId) as any[];
			}
			return json(users || []);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch users", details: message }, 500);
		}
	}

	if (p === "/api/admin/users" && req.method === "POST") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const isSuper = auth.role === "SUPER_ADMIN";
		const isAdmin = auth.role === "ADMIN";
		if (!isSuper && !isAdmin) return json({ error: "Forbidden" }, 403);

		let body: any;
		try {
			body = await req.json();
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}

		if (!body.username || !body.password || !body.role) {
			return json({ error: "Username, password and role required" }, 400);
		}

		const targetTenantId = isSuper ? (body.tenantId || auth.tenantId) : auth.tenantId;

		try {
			const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
			const hash = await Bun.password.hash(body.password);
			db.query(`
				INSERT INTO users (id, tenant_id, username, password_hash, role, full_name, job_title, email, phone, pin)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`).run(id, targetTenantId, body.username, hash, body.role, body.full_name || null, body.job_title || null, body.email || null, body.phone || null, body.pin || null);
			
			const user = db.query("SELECT id, username, role, tenant_id, full_name FROM users WHERE id = ?").get(id);
			return json(user);
		} catch (e) {
			return json({ error: "Failed to create user (username might already exist)" }, 400);
		}
	}

	// Client APIs
	if (p === "/api/client/projects" && req.method === "GET") {
		if (!auth || auth.role !== "CLIENT") return json({ error: "Forbidden" }, 403);
		try {
			const projects = db.query(`
				SELECT * FROM projects
				WHERE tenant_id = ? AND status != 'draft'
				ORDER BY created_at DESC
			`).all(auth.tenantId) as any[];
			return json(projects || []);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch projects", details: message }, 500);
		}
	}

	if (p.match(/^\/api\/client\/projects\/[^\/]+\/progress$/) && req.method === "GET") {
		if (!auth || auth.role !== "CLIENT") return json({ error: "Forbidden" }, 403);
		const projectId = p.split("/")[4];
		try {
			const project = db.query("SELECT * FROM projects WHERE id = ? AND tenant_id = ?")
				.get(projectId, auth.tenantId) as any;
			if (!project) return json({ error: "Project not found" }, 404);

			const tasks = db.query("SELECT * FROM tasks WHERE project_id = ?", projectId).all() as any[];
			const totalTasks = tasks.length;
			const completedTasks = tasks.filter(t => t.status === 'done').length;
			const totalHours = (db.query("SELECT SUM(hours) as total FROM time_entries WHERE project_id = ?", projectId).get() as any)?.total || 0;

			return json({
				project: project.name,
				completion: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
				tasks: { total: totalTasks, completed: completedTasks },
				hours: totalHours,
				budget: project.budget || null,
				budgetSpent: totalHours * (project.hourly_rate || 0),
			});
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch progress", details: message }, 500);
		}
	}

	if (p === "/api/client/drawings" && req.method === "GET") {
		if (!auth || auth.role !== "CLIENT") return json({ error: "Forbidden" }, 403);
		try {
			const drawings = db.query(`
				SELECT * FROM workspace_files
				WHERE tenant_id = ? AND (file_path LIKE '%.dwg' OR file_path LIKE '%.rvt' OR file_path LIKE '%.pdf' OR file_path LIKE '%.jpg' OR file_path LIKE '%.png')
				ORDER BY created_at DESC
			`).all(auth.tenantId) as any[];
			return json(drawings || []);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch drawings", details: message }, 500);
		}
	}

	if (p === "/api/client/feedback" && req.method === "POST") {
		if (!auth || auth.role !== "CLIENT") return json({ error: "Forbidden" }, 403);
		let body: { rating?: number; comment?: string; category?: string };
		try {
			body = (await req.json()) as { rating?: number; comment?: string; category?: string };
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		if (!body.rating) {
			return json({ error: "Rating required" }, 400);
		}
		try {
			db.query(`
				INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, details_json)
				VALUES (?, ?, 'CLIENT_FEEDBACK', 'project', NULL, ?)
			`).run(auth.tenantId, auth.userId, JSON.stringify(body));
			return json({ ok: true });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to submit feedback", details: message }, 500);
		}
	}

	// Manifest API (role-based UI configuration)
	if (p === "/api/manifest" && req.method === "GET") {
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
	}

	if (p === "/api/diagnostics" && req.method === "GET") {
		try {
			return json(await collectDiagnostics());
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ ok: false, error: message }, 500);
		}
	}

	if (p === "/api/dev/ngrok-tunnel" && req.method === "GET") {
		const data = await getNgrokTunnelDevJson();
		return json(data);
	}

	if (p === "/api/dev/ngrok-tunnel" && req.method === "POST") {
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
	}

	if (p === "/api/dev/tunnel-gate" && req.method === "GET") {
		return json(getTunnelGateDevStatusJson());
	}

	if (p === "/api/dev/tunnel-gate" && req.method === "POST") {
		let body: Record<string, unknown>;
		try {
			body = (await req.json()) as Record<string, unknown>;
		} catch {
			return json({ ok: false, message: "Invalid JSON" }, 400);
		}
		const r = await applyTunnelGateDevPost(body);
		return json(r);
	}

	if (p === "/api/dev/share-url-hints" && req.method === "GET") {
		const data = await getShareUrlHintsJson();
		return json(data);
	}

	if (p === "/api/upstream" && req.method === "GET") {
		try {
			return json(await collectUpstreamSnapshot());
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ ok: false, error: message }, 500);
		}
	}

	/** Process exit from Settings → Restart server (dev default on; production needs WOP_ALLOW_SERVER_RESTART=1). `concurrently` does not auto-restart Bun alone. */
	if (p === "/api/server/restart" && req.method === "POST") {
		if (!isWopServerRestartHttpAllowed()) {
			const raw = process.env.WOP_ALLOW_SERVER_RESTART?.trim() ?? "";
			const v = raw.toLowerCase();
			const hint =
				v === "0" || v === "false" || v === "no" || v === "off"
					? "WOP_ALLOW_SERVER_RESTART disables this exit. Unset it for the usual dev default (on), or set it to 1, then use Settings → Restart server again."
					: process.env.NODE_ENV === "production"
						? "Set WOP_ALLOW_SERVER_RESTART=1 on the Way of Work Bun process, then use Settings → Restart server again. Otherwise stop and start your dev command in the terminal (e.g. npm run dev from apps/wayofwork-ui)."
						: `Unrecognized WOP_ALLOW_SERVER_RESTART value. Use 1, true, yes, or on; unset for the dev default. Current: ${raw || "(empty)"}`;
			return json(
				{
					ok: false,
					error: "Server restart is disabled.",
					hint,
				},
				403,
			);
		}
		queueMicrotask(() => {
			setTimeout(() => process.exit(0), 80);
		});
		return json({
			ok: true,
			exiting: true,
			message:
				"Way of Work server process will exit. Start it again from the terminal (npm run dev / bun run server/index.ts).",
		});
	}

	/** Toggle terminal on/off at runtime + persist to .env file so it survives restarts. */
	if (p === "/api/terminal/set-enabled" && req.method === "POST") {
		let body: { enabled?: unknown };
		try {
			body = (await req.json()) as { enabled?: unknown };
		} catch {
			return json({ ok: false, error: "Bad JSON body" }, 400);
		}
		const enable = body.enabled === true || body.enabled === 1 || body.enabled === "1";
		// Apply immediately — terminalAllowed() re-reads process.env on each call
		process.env.WOP_ALLOW_TERMINAL = enable ? "1" : "0";

		// Persist to the repo-root .env file (create if missing)
		let persisted = false;
		try {
			const { join: pathJoin } = await import("node:path");
			const { readFileSync, writeFileSync } = await import("node:fs");
			// server/ → wayofwork-ui/ → apps/ → repo root
			const dotEnvPath = pathJoin(import.meta.dir, "..", "..", "..", ".env");
			let src = "";
			try { src = readFileSync(dotEnvPath, "utf8"); } catch { /* file may not exist yet */ }
			const key = "WOP_ALLOW_TERMINAL";
			const val = enable ? "1" : "0";
			const re = new RegExp(`^${key}=.*$`, "m");
			src = re.test(src) ? src.replace(re, `${key}=${val}`) : src + (src.endsWith("\n") || src === "" ? "" : "\n") + `${key}=${val}\n`;
			writeFileSync(dotEnvPath, src, "utf8");
			persisted = true;
		} catch {
			// persist failed — runtime change still works for this session
		}

		return json({ ok: true, enabled: enable, persisted });
	}

	if (p === "/api/native-dialog/pick" && req.method === "POST") {
		if (!workspaceSwitchAllowed()) {
			return json({ error: "Native pick requires workspace switch (WOP_ALLOW_WORKSPACE_SWITCH)", fallback: true }, 403);
		}
		let body: Record<string, unknown>;
		try {
			body = (await req.json()) as Record<string, unknown>;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		const kind = String(body.kind ?? "") === "folder" ? "folder" : "file";
		const result = pickNativePath(kind);
		if ("error" in result) {
			return json({ error: result.error, fallback: true });
		}
		if ("cancelled" in result) {
			return json({ cancelled: true });
		}
		return json({ path: result.path });
	}

	if (p === "/api/workspace" && req.method === "GET") {
		return json({
			root: getPrimaryWorkspacePath(),
			folders: listWorkspaceFolders(),
			switchAllowed: workspaceSwitchAllowed(),
			initialRoot: getFrozenInitialWorkspacePath(),
		});
	}

	if (p === "/api/workspace/problems" && req.method === "GET") {
		if (lastWorkspaceProblems) return json(lastWorkspaceProblems);
		return json({
			ok: true,
			ranAt: new Date(0).toISOString(),
			engine: "none",
			problems: [],
			exitCode: null,
			log: "No analysis run yet — open the Problems panel and choose Run analysis. (Requires ESLint or tsconfig at workspace root, or under apps/wayofwork-ui in this monorepo.)",
		} satisfies WorkspaceProblemsRunResult);
	}

	if (p === "/api/workspace/problems/run" && req.method === "POST") {
		try {
			const root = getPrimaryWorkspacePath();
			const result = await runWorkspaceProblemsAnalysis(root);
			lastWorkspaceProblems = result;
			broadcastToolLog(
				"INFO",
				"analyze",
				`workspace problems: engine=${result.engine} count=${result.problems.length}${result.error ? ` (${result.error})` : ""}`,
			);
			return json(result);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ ok: false, error: message, ranAt: new Date().toISOString(), engine: "error", problems: [], exitCode: null, log: message }, 500);
		}
	}

	if (p === "/api/workspace-index" && req.method === "GET") {
		try {
			const payload = await getWorkspaceIndexStatus();
			return json(payload);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: message }, 500);
		}
	}

	if (p === "/api/workspace-index/sync" && req.method === "POST") {
		try {
			const result = await syncWorkspaceIndex();
			broadcastToolLog("INFO", "index", `workspace index sync: files=${result.state.fileCount}`);
			return json(result);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ ok: false, error: message }, 500);
		}
	}

	if (p === "/api/workspace-index/clear" && req.method === "POST") {
		try {
			await clearWorkspaceIndex();
			broadcastToolLog("INFO", "index", "workspace index cleared");
			return json({ ok: true });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ ok: false, error: message }, 500);
		}
	}

	if (p === "/api/workspace-index/options" && req.method === "POST") {
		let body: Record<string, unknown>;
		try {
			body = (await req.json()) as Record<string, unknown>;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		try {
		const partial: {
			indexNewFolders?: boolean;
			instantGrepIndex?: boolean;
			attachSummaryToChat?: boolean;
			autoSyncIntervalMinutes?: number;
		} = {};
		if (typeof body.indexNewFolders === "boolean") partial.indexNewFolders = body.indexNewFolders;
		if (typeof body.instantGrepIndex === "boolean") partial.instantGrepIndex = body.instantGrepIndex;
		if (typeof body.attachSummaryToChat === "boolean") partial.attachSummaryToChat = body.attachSummaryToChat;
		if (typeof body.autoSyncIntervalMinutes === "number") partial.autoSyncIntervalMinutes = body.autoSyncIntervalMinutes;
		const options = await patchWorkspaceIndexOptions(partial);
		// Re-arm or cancel the background timer whenever options change.
		void applyAutoSync((result) => {
			broadcastToolLog(
				"INFO",
				"index",
				`auto-sync: files=${result.state.fileCount} fingerprint=${result.state.merkleRoot}`,
			);
		});
		return json({ ok: true, options });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ ok: false, error: message }, 500);
		}
	}

	if (p === "/api/workspace-index/docs" && req.method === "POST") {
		let body: Record<string, unknown>;
		try {
			body = (await req.json()) as Record<string, unknown>;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		const url = String(body.url ?? "").trim();
		if (!url) return json({ error: "url required" }, 400);
		try {
			const entry = await addWorkspaceIndexDoc(url);
			return json({ ok: true, entry });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ ok: false, error: message }, 400);
		}
	}

	if (p === "/api/workspace-index/docs/sync" && req.method === "POST") {
		let body: Record<string, unknown>;
		try {
			body = (await req.json()) as Record<string, unknown>;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		const id = String(body.id ?? "").trim();
		if (!id) return json({ error: "id required" }, 400);
		try {
			const entry = await syncWorkspaceIndexDoc(id);
			if (!entry) return json({ error: "not found" }, 404);
			return json({ ok: true, entry });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ ok: false, error: message }, 500);
		}
	}

	if (p === "/api/workspace-index/docs/remove" && req.method === "POST") {
		let body: Record<string, unknown>;
		try {
			body = (await req.json()) as Record<string, unknown>;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		const id = String(body.id ?? "").trim();
		if (!id) return json({ error: "id required" }, 400);
		const ok = await removeWorkspaceIndexDoc(id);
		if (!ok) return json({ error: "not found" }, 404);
		return json({ ok: true });
	}

	if (p === "/api/workspace" && req.method === "POST") {
		let body: Record<string, unknown>;
		try {
			body = (await req.json()) as Record<string, unknown>;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		const op = String(body.op ?? "");
		try {
			if (op === "open_folder") {
				const p = String(body.path ?? "").trim();
				if (!p) return json({ error: "path required" }, 400);
				await openFolder(p);
				broadcastToolLog("INFO", "cd", `workspace open_folder ${p.length > 160 ? `${p.slice(0, 157)}…` : p}`);
				return json({ ok: true, folders: listWorkspaceFolders(), root: getPrimaryWorkspacePath() });
			}
			if (op === "add_folder") {
				const p = String(body.path ?? "").trim();
				if (!p) return json({ error: "path required" }, 400);
				await addFolder(p);
				broadcastToolLog("INFO", "cd", `workspace add_folder ${p.length > 160 ? `${p.slice(0, 157)}…` : p}`);
				return json({ ok: true, folders: listWorkspaceFolders(), root: getPrimaryWorkspacePath() });
			}
			if (op === "remove_folder") {
				const label = String(body.label ?? "").trim();
				if (!label) return json({ error: "label required" }, 400);
				removeFolderByLabel(label);
				return json({ ok: true, folders: listWorkspaceFolders(), root: getPrimaryWorkspacePath() });
			}
			if (op === "save_code_workspace_file") {
				const filePath = String(body.path ?? "").trim();
				if (!filePath) return json({ error: "path required" }, 400);
				await saveCodeWorkspaceFileToPath(filePath);
				broadcastToolLog(
					"INFO",
					"write",
					`workspace save_code_workspace_file ${filePath.length > 200 ? `${filePath.slice(0, 197)}…` : filePath}`,
				);
				return json({ ok: true, folders: listWorkspaceFolders(), root: getPrimaryWorkspacePath() });
			}
			if (op === "close_workspace" || op === "reset_workspace") {
				resetWorkspaceToInitial();
				return json({ ok: true, folders: listWorkspaceFolders(), root: getPrimaryWorkspacePath() });
			}
			if (op === "open_file") {
				const p = String(body.path ?? "").trim();
				if (!p) return json({ error: "path required" }, 400);
				const selectPath = await openFileInWorkspace(p);
				broadcastToolLog("INFO", "read", `workspace open_file ${p.length > 200 ? `${p.slice(0, 197)}…` : p}`);
				return json({
					ok: true,
					folders: listWorkspaceFolders(),
					root: getPrimaryWorkspacePath(),
					selectPath,
				});
			}
			if (op === "apply_workspace_folders") {
				const pathsRaw = body.paths;
				if (!Array.isArray(pathsRaw) || pathsRaw.length === 0) {
					return json({ error: "paths array required" }, 400);
				}
				const paths = pathsRaw.map((item) => String(item ?? "").trim()).filter(Boolean);
				if (paths.length === 0) return json({ error: "No valid paths" }, 400);
				await setWorkspaceFoldersAbs(paths);
				return json({ ok: true, folders: listWorkspaceFolders(), root: getPrimaryWorkspacePath() });
			}
			if (op === "from_code_workspace_file") {
				const filePath = String(body.workspaceFilePath ?? "").trim();
				const rawJson = body.json;
				if (!filePath || rawJson === undefined) {
					return json({ error: "workspaceFilePath and json required" }, 400);
				}
				await loadFoldersFromWorkspaceJson(rawJson, filePath);
				return json({ ok: true, folders: listWorkspaceFolders(), root: getPrimaryWorkspacePath() });
			}
			return json({ error: `Unknown op: ${op}` }, 400);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: message }, 400);
		}
	}

	if (
		req.method === "POST" &&
		(p === "/api/config" || p === "/api/config/orchestrator-gates")
	) {
		let body: Record<string, unknown>;
		try {
			body = (await req.json()) as Record<string, unknown>;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		return applySessionRuntimePostBody(body);
	}

	if (p === "/api/config" && req.method === "GET") {
		const provider = (process.env.WOP_LLM_PROVIDER || "ollama").toLowerCase();
		const engineMode = wopChatEngineFromEnv();
		const chatEngine =
			engineMode === "bundled"
				? (process.env.WOP_CHAT_ENGINE || "").trim().toLowerCase() || provider
				: engineMode;
		const piEngineLive = shouldUsePiJsonChat();
		const piBackendRequested = engineMode === "pi" || engineMode === "auto";
		const piBinaryResolved = resolvePiBinaryPath() != null;
		const workspaceDotPiPresent = existsSync(join(getPrimaryWorkspacePath(), ".pi"));
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
			/** Absolute Way of Work checkout root where host-scoped **`.claw/`** lives (not `WOP_WORKSPACE`). */
			clawHostRepoRoot: getClawHostRepoRoot(),
			/** Absolute path to host **`.claw/`** (e.g. optional `telegram.json`). */
			clawDotDirAbs: getClawDotDirAbs(),
			/** Absolute path to **`.claw/workspace/`** (seven scaffold files + `memory/`). */
			clawWorkspaceDirAbs: getClawWorkspaceBundleDirAbs(),
			/** True when headless **`pi --mode json`** is active (**`pi`**, **`auto`**, or unset default **`auto`**) and the **`pi`** CLI resolves — full Pi tools. */
			piDrivesChat: piEngineLive,
			/** Whether a **`pi`** executable was resolved (`WOP_PI_BINARY` or PATH); **on** still needs this for headless Pi turns. */
			piBinaryResolved,
			/** Open folder contains a **`.pi/`** directory (Pi-shaped **config**). Not the same as a resolvable **`pi`** binary. */
			workspaceDotPiPresent,
			piChatEngineRequested: piBackendRequested,
			piChatEngineWired: piEngineLive,
			/** Interim Bun tool loop only — superseded once Pi owns tools per `docs/WOP_PI_BACKEND_WIRING_PLAN.md`. */
			orchestratorTools: orchestratorToolsEnabled(),
			orchestratorBash: orchestratorBashEnabled(),
			/** Same shape as **`GET /api/health`**. so the UI can detect a stale Bun without a second request. */
			capabilities: {
				workspaceProblems: true,
				configRuntimePost: true,
				clawHostTreeGet: true,
				clawTelegramStatusGet: true,
				clawWhatsAppStatusGet: true,
			},
			manifestUrl: "/api/manifest",
			ollamaHost: resolveOllamaHost(),
			ollamaModel: resolveOllamaModelDefault(),
			openrouterModel: process.env.OPENROUTER_MODEL || "openrouter/auto",
			terminalEnabled: terminalAllowed(),
			...terminalShellHints(),
			...(clawHostTree ? { clawHostTree } : {}),
			/** Same shape as **`GET /api/claw/schedules`** when **`?schedules=1`** — Claw Schedule tab fallback if the dedicated path 404s. */
			...(clawSchedules ? { clawSchedules } : {}),
			/** Same payload as **`GET /api/claw/automation`** — embedded so Claw Mission survives older route ordering or proxy quirks. */
			clawAutomation: getClawAutomationStatus(),
			/** Same payload as **`GET /api/claw/telegram/status`** — embedded so Claw Channels works even if a proxy drops that path. */
			clawTelegramStatus: getClawTelegramIntegrationStatus(),
			/** Same payload as **`GET /api/claw/whatsapp/status`** — embedded so Claw Channels works even if a proxy drops that path. */
			clawWhatsAppStatus: getClawWhatsAppIntegrationStatus(),
		});
	}

	if (p === "/api/github/status" && req.method === "GET") {
		try {
			return json(await readGithubConnectionMeta());
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ connected: false, login: null, error: message }, 500);
		}
	}

	if (p === "/api/claw/telegram/status" && req.method === "GET") {
		try {
			return json(getClawTelegramIntegrationStatus());
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ version: 1, error: message }, 500);
		}
	}

	if (p === "/api/claw/whatsapp/status" && req.method === "GET") {
		try {
			return json(getClawWhatsAppIntegrationStatus());
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ version: 1, error: message }, 500);
		}
	}

	if (p === "/api/claw/webhook/ensure" && req.method === "POST") {
		try {
			const r = await ensureWebhookSecret();
			return json({ ok: true, created: r.created, secret: r.secret });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ ok: false, error: message }, 500);
		}
	}

	if (p === "/api/claw/webhook/rotate" && req.method === "POST") {
		try {
			const secret = await rotateWebhookSecret();
			return json({ ok: true, secret });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ ok: false, error: message }, 500);
		}
	}

	if (p === "/api/claw/webhook/meta" && req.method === "GET") {
		return json({
			version: 1,
			configured: clawWebhookConfigured(),
			inboundEnabled: clawWebhookInboundEnabled(),
		});
	}

	if (p === "/api/claw/inbound" && req.method === "POST") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const secret = await readWebhookSecret();
		if (!secret) {
			return json({ ok: false, error: "No webhook secret — use POST /api/claw/webhook/ensure first." }, 404);
		}
		if (!clawWebhookInboundEnabled()) {
			return json({ ok: false, error: "Inbound webhook disabled (WOP_CLAW_INBOUND)." }, 403);
		}
		const auth = req.headers.get("authorization");
		if (!verifyWebhookBearer(auth, secret)) {
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
		const agentName =
			agentRaw === null || agentRaw === undefined
				? null
				: typeof agentRaw === "string"
					? agentRaw.trim() || null
					: null;
		const name = String(body.name ?? "Inbound webhook").trim() || "Inbound webhook";
		try {
				const r = await executeClawAutomation({
					name,
					prompt,
					agentName,
					source: "webhook",
					tenantId: auth?.tenantId,
					userId: auth?.userId,
				});
			if (r.ok) return json({ ok: true });
			return json({ ok: false, error: r.error }, 500);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ ok: false, error: message }, 500);
		}
	}

	// ── Self-service channel link management ──

	if (p === "/api/channels/links" && req.method === "GET") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			const links = db.query(`
				SELECT l.*, u.username as user_name
				FROM user_channel_links l
				LEFT JOIN users u ON l.user_id = u.id
				WHERE l.tenant_id = ? AND l.user_id = ?
				ORDER BY l.created_at DESC
			`).all(auth.tenantId, auth.userId) as any[];
			return json(links.map((l: any) => ({
				id: l.id,
				channel: l.channel,
				channelUserId: l.channel_user_id,
				channelUsername: l.channel_username,
				channelBotId: l.channel_bot_id,
				active: l.active === 1,
				lastActivityAt: l.last_activity_at,
				createdAt: l.created_at,
			})));
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: "Failed to fetch links", details: message }, 500);
		}
	}

	if (p === "/api/channels/link" && req.method === "POST") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: { channel?: string; channelUserId?: string; channelUsername?: string; channelBotId?: string };
		try {
			body = (await req.json()) as any;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		if (!body.channel || !body.channelUserId) {
			return json({ error: "channel and channelUserId required" }, 400);
		}
		const id = `cl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
		const existing = db.query(
			"SELECT id FROM user_channel_links WHERE user_id = ? AND tenant_id = ? AND channel = ?"
		).get(auth.userId, auth.tenantId, body.channel) as { id: string } | undefined;
		if (existing) {
			db.query(`
				UPDATE user_channel_links SET channel_user_id = ?, channel_username = ?, channel_bot_id = ?, active = 1 WHERE id = ?
			`).run(body.channelUserId, body.channelUsername || null, body.channelBotId || null, existing.id);
			return json({ ok: true, id: existing.id, updated: true });
		}
		try {
			db.query(`
				INSERT INTO user_channel_links (id, tenant_id, user_id, channel, channel_user_id, channel_username, channel_bot_id)
				VALUES (?, ?, ?, ?, ?, ?, ?)
			`).run(id, auth.tenantId, auth.userId, body.channel, body.channelUserId, body.channelUsername || null, body.channelBotId || null);
			return json({ ok: true, id });
		} catch (e) {
			return json({ error: "Failed to create link (may already exist)" }, 409);
		}
	}

	if (p === "/api/channels/unlink" && req.method === "DELETE") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const linkId = url.searchParams.get("id") || "";
		if (!linkId) return json({ error: "id parameter required" }, 400);
		try {
			const existing = db.query("SELECT * FROM user_channel_links WHERE id = ? AND user_id = ? AND tenant_id = ?").get(linkId, auth.userId, auth.tenantId);
			if (!existing) return json({ error: "Link not found" }, 404);
			db.query("DELETE FROM user_channel_links WHERE id = ? AND user_id = ? AND tenant_id = ?").run(linkId, auth.userId, auth.tenantId);
			return json({ ok: true });
		} catch (e) {
			return json({ error: "Failed to delete link" }, 500);
		}
	}

	if (p === "/api/channels/log" && req.method === "POST") {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: { channel?: string; channelUserId?: string; direction?: string; messageText?: string; messageType?: string; handledBy?: string; botId?: string };
		try {
			body = (await req.json()) as any;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		try {
			const id = `cml_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
			db.query(`
				INSERT INTO channel_message_logs (id, tenant_id, user_id, channel, channel_user_id, direction, message_text, message_type, handled_by, bot_id)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`).run(id, auth.tenantId, auth.userId, body.channel || "unknown", body.channelUserId || null, body.direction || "inbound", body.messageText || null, body.messageType || "text", body.handledBy || null, body.botId || null);
			return json({ ok: true, id });
		} catch (e) {
			return json({ error: "Failed to log message" }, 500);
		}
	}

	if (p === "/api/github/connect" && req.method === "POST") {
		let body: Record<string, unknown>;
		try {
			body = (await req.json()) as Record<string, unknown>;
		} catch {
			return json({ ok: false, error: "Invalid JSON" }, 400);
		}
		const token = String(body.token ?? "");
		const verified = await verifyGithubToken(token);
		if (!verified.ok) return json({ ok: false, error: verified.error }, 400);
		const saved = await saveGithubCredentials(token, verified.login);
		if (!saved.ok) return json({ ok: false, error: saved.error }, 500);
		return json({ ok: true, login: verified.login });
	}

	if (p === "/api/github/disconnect" && req.method === "POST") {
		try {
			await removeGithubCredentials();
			return json({ ok: true });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ ok: false, error: message }, 500);
		}
	}

	if (p === "/api/manifest" && req.method === "GET") {
		try {
			return json(collectStaticWebManifest());
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: message }, 500);
		}
	}

	if (p === "/api/ui/views" && req.method === "GET") {
		const data = await readUiViewsCatalog(getPrimaryWorkspacePath());
		return json(data);
	}

	if (p === "/api/ui/views/seed" && req.method === "POST") {
		const r = await seedUiViewsCatalogIfMissing(getPrimaryWorkspacePath());
		return json({ ok: true, created: r.created, path: r.path });
	}

	if (p === "/api/llm/models" && req.method === "GET") {
		const provider = (process.env.WOP_LLM_PROVIDER || "ollama").toLowerCase();
		const ollamaHost = resolveOllamaHost();
		const envDefaultOllama = resolveOllamaModelDefault();
		const envDefaultOpenrouter = process.env.OPENROUTER_MODEL || "openrouter/auto";

		if (provider === "openrouter") {
			return json({
				provider: "openrouter",
				ollamaHost,
				envDefaultOllama,
				envDefaultOpenrouter,
				models: [] as unknown[],
				catalogNote:
					"OpenRouter: set OPENROUTER_API_KEY on the host; default model OPENROUTER_MODEL. Type any OpenRouter model id below (same strings Pi uses with OpenRouter).",
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
				catalogNote: `This server only implements web chat for WOP_LLM_PROVIDER=ollama or openrouter. Current value "${provider}" is unsupported — change host env or use Pi TUI for other providers.`,
			});
		}

		const tags = await fetchOllamaTags(ollamaHost);
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
	}

	if (p === "/api/agents" && req.method === "GET") {
		try {
			const data = await loadWorkspaceAgents();
			return json(data);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: message }, 500);
		}
	}

	if (p === "/api/package-scripts" && req.method === "GET") {
		try {
			const scripts = await readPackageScripts();
			return json({ scripts });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: message }, 500);
		}
	}

	if (p === "/api/run-script" && req.method === "POST") {
		if (process.env.WOP_ALLOW_RUN?.trim() !== "1") {
			return json(
				{
					error:
						"Run is disabled. Set WOP_ALLOW_RUN=1 on the server to allow npm/bun scripts from package.json (security-sensitive).",
				},
				403,
			);
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
		const cwd = getWorkspaceRoot();
		broadcastToolLog("INFO", "bash", `bun run ${script} (cwd ${cwd.length > 80 ? `${cwd.slice(0, 77)}…` : cwd})`);
		try {
			const proc = Bun.spawn(["bun", "run", script], {
				cwd,
				stdout: "pipe",
				stderr: "pipe",
			});
			const stdout = await new Response(proc.stdout).text();
			const stderr = await new Response(proc.stderr).text();
			const code = await proc.exited;
			return json({
				ok: code === 0,
				exitCode: code,
				stdout: stdout.slice(0, 24_000),
				stderr: stderr.slice(0, 24_000),
			});
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: message }, 500);
		}
	}

	if (p === "/api/tree" && req.method === "GET") {
		try {
			const { root, nodes, folders, git } = await buildWorkspaceTree();
			return json({
				root,
				nodes,
				folders,
				git,
				switchAllowed: workspaceSwitchAllowed(),
				initialRoot: getFrozenInitialWorkspacePath(),
			});
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: message }, 500);
		}
	}

	if (p === "/api/git/stage" && req.method === "POST") {
		let body: { path?: string; all?: boolean };
		try {
			body = (await req.json()) as { path?: string; all?: boolean };
		} catch {
			return json({ ok: false as const, error: "Invalid JSON" });
		}
		const rel = String(body.path ?? "").trim();
		const abs = safeResolveUnderWorkspace(rel);
		if (!abs) return json({ ok: false as const, error: "Invalid path" });
		if (body.all === true) {
			const result = await gitStageAllFromAbsolutePath(abs);
			if (!result.ok) {
				broadcastToolLog("WARN", "git", `stage all failed (anchor ${rel}): ${result.error}`);
				return json(result);
			}
			broadcastToolLog("INFO", "git", `staged all changes (repo from ${rel})`);
			return json(result);
		}
		const result = await gitStageAbsolutePath(abs);
		if (!result.ok) {
			broadcastToolLog("WARN", "git", `stage failed ${rel}: ${result.error}`);
			return json(result);
		}
		broadcastToolLog("INFO", "git", `staged ${rel}`);
		return json(result);
	}

	if (p === "/api/plans" && req.method === "GET") {
		try {
			const catalog = await listPlansCatalog();
			return json(catalog);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: message }, 500);
		}
	}

	if (p === "/api/file" && req.method === "GET") {
		const rel = url.searchParams.get("path") || "";
		const relNorm = rel.trim();
		let abs = resolveWorkspaceOrClawAbs(relNorm);
		if (!abs) return json({ error: "Invalid path" }, 400);
		let readRel = relNorm;
		let st: Awaited<ReturnType<typeof stat>>;
		try {
			st = await stat(abs);
		} catch {
			const legRel = clawWorkspaceBundleToLegacyFlatRel(relNorm);
			if (!legRel) {
				const message = "Not found";
				return json({ error: message }, 404);
			}
			const legAbs = resolveWorkspaceOrClawAbs(legRel);
			if (!legAbs) return json({ error: "Not found" }, 404);
			try {
				st = await stat(legAbs);
				readRel = legRel;
				abs = legAbs;
			} catch {
				return json({ error: "Not found" }, 404);
			}
		}
		try {
			if (!st.isFile()) return json({ error: "Not a file" }, 400);
			if (st.size > MAX_FILE_BYTES) return json({ error: "File too large for editor" }, 413);
			const imageMime = imageMimeFromPath(readRel);
			if (imageMime) {
				const buf = await readFile(abs);
				broadcastToolLog("INFO", "read", `read ${readRel} (image, ${buf.length} bytes)`);
				return json({
					path: readRel,
					encoding: "base64",
					mimeType: imageMime,
					content: buf.toString("base64"),
				});
			}
			const buf = await readFile(abs);
			if (buf.includes(0)) {
				broadcastToolLog("INFO", "read", `read ${readRel} (binary, ${buf.length} bytes)`);
				return json({
					path: readRel,
					encoding: "base64",
					mimeType: "application/octet-stream",
					content: buf.toString("base64"),
				});
			}
			broadcastToolLog("INFO", "read", `read ${readRel} (${buf.length} chars utf8)`);
			return json({ path: readRel, content: buf.toString("utf8") });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: message }, 404);
		}
	}

	if (p === "/api/file" && req.method === "PUT") {
		let body: { path?: string; content?: string; encoding?: string };
		try {
			body = (await req.json()) as { path?: string; content?: string; encoding?: string };
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		const rel = body.path || "";
		const abs = resolveWorkspaceOrClawAbs(rel);
		if (!abs) return json({ error: "Invalid path" }, 400);
		const raw = body.content ?? "";
		try {
			await mkdir(dirname(abs), { recursive: true });
			if (body.encoding === "base64") {
				let buf: Buffer;
				try {
					buf = Buffer.from(raw, "base64");
				} catch {
					return json({ error: "Invalid base64" }, 400);
				}
				if (buf.length > MAX_FILE_BYTES) return json({ error: "Content too large" }, 413);
				await writeFile(abs, buf);
				broadcastToolLog("INFO", "write", `write ${rel} (binary, ${buf.length} bytes)`);
			} else {
				if (Buffer.byteLength(raw, "utf8") > MAX_FILE_BYTES) return json({ error: "Content too large" }, 413);
				await writeFile(abs, raw, "utf8");
				broadcastToolLog("INFO", "write", `write ${rel} (${Buffer.byteLength(raw, "utf8")} bytes utf8)`);
			}
			return json({ ok: true, path: rel });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: message }, 500);
		}
	}

	if (p === "/api/fs/move" && req.method === "POST") {
		let body: { from?: string; toDir?: string };
		try {
			body = (await req.json()) as { from?: string; toDir?: string };
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		const fromRel = String(body.from ?? "")
			.trim()
			.replace(/^[/\\]+/, "");
		const toDirRaw = body.toDir;
		const toDirRel =
			typeof toDirRaw === "string"
				? toDirRaw.trim().replace(/^[/\\]+/, "").replace(/[/\\]+$/, "")
				: "";
		if (!fromRel || fromRel.includes("..")) {
			return json({ error: "Invalid from path" }, 400);
		}
		if (toDirRel.includes("..")) {
			return json({ error: "Invalid toDir" }, 400);
		}
		if (listWorkspaceFolders().length > 1 && !toDirRel) {
			return json({ error: "Drop onto a folder (multi-root workspace has no single root)." }, 400);
		}
		const fromAbs = resolveWorkspaceOrClawAbs(fromRel);
		if (!fromAbs) {
			return json({ error: "Invalid from path" }, 400);
		}
		let stFrom: Awaited<ReturnType<typeof stat>>;
		try {
			stFrom = await stat(fromAbs);
		} catch {
			return json({ error: "Source not found" }, 404);
		}
		if (!stFrom.isFile()) {
			return json({ error: "Only files can be moved from the explorer" }, 400);
		}
		const destRel = toDirRel ? posixJoin(toDirRel, posixBasename(fromRel)) : posixBasename(fromRel);
		const normFrom = fromRel.replace(/\/+$/, "");
		const normDest = destRel.replace(/\/+$/, "");
		if (normDest === normFrom) {
			return json({ error: "Already in that folder" }, 400);
		}
		const destAbs = resolveWorkspaceOrClawAbs(destRel);
		if (!destAbs) {
			return json({ error: "Invalid destination" }, 400);
		}
		if (toDirRel) {
			const toDirAbs = resolveWorkspaceOrClawAbs(toDirRel);
			if (!toDirAbs) {
				return json({ error: "Invalid folder" }, 400);
			}
			let stDir: Awaited<ReturnType<typeof stat>>;
			try {
				stDir = await stat(toDirAbs);
			} catch {
				return json({ error: "Folder not found" }, 404);
			}
			if (!stDir.isDirectory()) {
				return json({ error: "Target is not a folder" }, 400);
			}
		}
		if (existsSync(destAbs)) {
			return json({ error: "A file with that name already exists in the target folder" }, 409);
		}
		try {
			await rename(fromAbs, destAbs);
			broadcastToolLog("INFO", "mv", `mv ${fromRel} → ${destRel}`);
			return json({ ok: true, to: destRel });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: message }, 500);
		}
	}

	if (p === "/api/fs/entry" && req.method === "POST") {
		let body: { path?: string; kind?: string };
		try {
			body = (await req.json()) as { path?: string; kind?: string };
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		const rel = String(body.path ?? "").trim().replace(/^[/\\]+/, "");
		const kind = body.kind === "dir" ? "dir" : body.kind === "file" ? "file" : "";
		if (!rel || rel === "." || rel.includes("..")) {
			return json({ error: "Invalid path" }, 400);
		}
		if (kind !== "file" && kind !== "dir") {
			return json({ error: 'kind must be "file" or "dir"' }, 400);
		}
		const abs = resolveWorkspaceOrClawAbs(rel);
		if (!abs) return json({ error: "Invalid path" }, 400);
		if (existsSync(abs)) {
			return json({ error: "Path already exists" }, 409);
		}
		try {
			if (kind === "dir") {
				await mkdir(abs, { recursive: true });
				broadcastToolLog("INFO", "mkdir", `mkdir ${rel}`);
			} else {
				await mkdir(dirname(abs), { recursive: true });
				await writeFile(abs, "", "utf8");
				broadcastToolLog("INFO", "write", `touch ${rel}`);
			}
			return json({ ok: true, path: rel });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: message }, 500);
		}
	}

	if (p === "/api/fs/delete" && req.method === "POST") {
		let body: { path?: string };
		try {
			body = (await req.json()) as { path?: string };
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		const rel = String(body.path ?? "")
			.trim()
			.replace(/^[/\\]+/, "");
		if (!rel || rel === "." || rel.includes("..")) {
			return json({ error: "Invalid path" }, 400);
		}
		const abs = resolveWorkspaceOrClawAbs(rel);
		if (!abs) return json({ error: "Invalid path" }, 400);
		try {
			await rm(abs, { recursive: true, force: true });
			broadcastToolLog("INFO", "rm", `rm ${rel}`);
			return json({ ok: true as const, path: rel });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: message }, 500);
		}
	}

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
					"Terminal disabled. Set WOP_ALLOW_TERMINAL=1 on the server and restart. This exposes a real host shell (security-sensitive).",
					{ status: 403 },
				);
			}
			const upgraded = srv.upgrade(req, {
				data: {
					kind: "terminal",
					session: null,
					stdinLogBuffer: "",
				} satisfies TerminalWsData,
			});
			if (upgraded) return undefined as unknown as Response;
			return new Response("WebSocket upgrade failed", { status: 500 });
		}

                if (
                        url.pathname.startsWith("/ws") &&
                        req.headers.get("upgrade")?.toLowerCase() === "websocket"
                ) {
                        let auth: any = null;
                        
                        const authHeader = req.headers.get("Authorization");
                        let token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
                                
                        // Support token in query param (common for WebSockets)
                        if (!token) {
                                token = url.searchParams.get("token");
                        }
                                
                        auth = token ? await verifyToken(token) : null;
                        if (!auth) {
                                return new Response("Unauthorized", { status: 401 });
                        }
                        
                        const upgraded = srv.upgrade(req, {
                                data: {
                                        kind: "chat",
                                        messages: [] as ChatMessage[],
                                        busy: false,
                                        pendingChatQueue: [],
                                        ollamaModel: undefined,
                                        openrouterModel: undefined,
                                        chatMode: "build",
                                        agentName: null,
                                        cachedAgentBody: null,
                                        cachedAgentSkills: null,
                                        chatAbort: null,
                                        cumPromptTokens: 0,
                                        cumCompletionTokens: 0,
                                        wopSessionKey: null,
					tenantId: auth?.tenantId || "dev-tenant",
					userId: auth?.userId || "dev-user",
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
	websocket: {
		async open(ws) {
			try {
				if (ws.data.kind === "terminal") {
					attachTerminalSession(ws);
					return;
				}
				await applyLeadFromCache(ws.data);
				const provider = (process.env.WOP_LLM_PROVIDER || "ollama").toLowerCase();
				const envOllama = resolveOllamaModelDefault();
				const envOr = process.env.OPENROUTER_MODEL || "openrouter/auto";
				const effectiveModel =
					provider === "openrouter"
						? ws.data.openrouterModel || envOr
						: ws.data.ollamaModel || envOllama;
				ws.send(
					JSON.stringify({
						type: "ready",
						workspace: getWorkspaceRoot(),
						provider,
						effectiveModel,
						ollamaModel: ws.data.ollamaModel ?? null,
						openrouterModel: ws.data.openrouterModel ?? null,
						chatMode: ws.data.chatMode,
						agentName: ws.data.agentName,
					}),
				);
				registerChatSocketForToolLogs(ws);
			} catch (e) {
				const m = e instanceof Error ? e.message : String(e);
				console.error("[ws open handler error]", m);
				try { ws.close(1011, `Server error: ${m}`); } catch { /* ignore */ }
			}
		},
		close(ws) {
			if (ws.data.kind === "terminal") {
				disposeTerminal(ws);
			} else if (ws.data.kind === "chat") {
				unregisterChatSocketForToolLogs(ws);
			}
		},
		async message(ws, raw) {
			try {
				if (ws.data.kind === "terminal") {
					handleTerminalMessage(ws, raw);
					return;
				}
				let msg: { type?: string; content?: string; model?: string; mode?: string; agent?: string | null };
				try {
					msg = JSON.parse(String(raw));
				} catch {
					ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
					return;
				}
				if (msg.type === "ping") {
				ws.send(JSON.stringify({ type: "pong" }));
				return;
			}
			if (msg.type === "stop_chat") {
				ws.data.chatAbort?.abort();
				return;
			}
			if (msg.type === "set_model") {
				if (ws.data.busy) {
					ws.send(
						JSON.stringify({
							type: "error",
							message: "Wait for the current reply to finish before changing the model.",
						}),
					);
					return;
				}
				const provider = (process.env.WOP_LLM_PROVIDER || "ollama").toLowerCase();
				const id = String(msg.model ?? "").trim();
				if (provider !== "openrouter" && provider !== "ollama") {
					ws.send(
						JSON.stringify({
							type: "error",
							message: `WOP_LLM_PROVIDER="${provider}" — web chat only supports ollama or openrouter; cannot set session model.`,
						}),
					);
					return;
				}
				if (provider === "openrouter") {
					if (!isValidOpenRouterModelId(id)) {
						ws.send(JSON.stringify({ type: "error", message: "Invalid OpenRouter model id" }));
						return;
					}
					ws.data.openrouterModel = id;
					ws.data.ollamaModel = undefined;
				} else {
					if (!isValidOllamaModelId(id)) {
						ws.send(JSON.stringify({ type: "error", message: "Invalid Ollama model id" }));
						return;
					}
					ws.data.ollamaModel = id;
					ws.data.openrouterModel = undefined;
				}
				ws.send(
					JSON.stringify({
						type: "model_set",
						effectiveModel: id,
						provider,
					}),
				);
				return;
			}
			if (msg.type === "set_chat_mode") {
				if (ws.data.busy) {
					ws.send(
						JSON.stringify({
							type: "error",
							message: "Wait for the current reply to finish before switching Plan / Build mode.",
						}),
					);
					return;
				}
				const next: ChatSessionMode = String(msg.mode ?? "") === "plan" ? "plan" : "build";
				ws.data.chatMode = next;
				await applyLeadFromCache(ws.data);
				ws.send(JSON.stringify({ type: "chat_mode", mode: next }));
				ws.send(
					logLine(
						"INFO",
						"chat",
						next === "plan"
							? "Plan mode — session uses workspace planner.md (Pi) when present, else built-in fallback; no duplicate if agent is planner."
							: "Build mode — Orchestrator when no .md agent, else selected agent; WOP_SYSTEM_PROMPT prepended when set.",
					),
				);
				return;
			}
			if (msg.type === "set_agent") {
				if (ws.data.busy) {
					ws.send(
						JSON.stringify({
							type: "error",
							message: "Wait for the current reply to finish before changing the agent.",
						}),
					);
					return;
				}
				const raw = msg.agent;
				const nextName =
					raw === null || raw === undefined || String(raw).trim() === ""
						? null
						: String(raw).trim();
				if (nextName) {
					const body = await getAgentBodyByName(nextName);
					if (!body) {
						ws.send(
							JSON.stringify({
								type: "error",
								message: `Agent "${nextName}" not found under agents/, .claude/agents/, .pi/agents/, or .cursor/agents/ (same scan order as Pi agent-team).`,
							}),
						);
						return;
					}
					ws.data.agentName = nextName;
					ws.data.cachedAgentBody = body;
					ws.data.cachedAgentSkills = await resolveAgentSkillsFromName(nextName, ws.data.tenantId);
				} else {
					ws.data.agentName = null;
					ws.data.cachedAgentBody = null;
					ws.data.cachedAgentSkills = null;
				}
				await applyLeadFromCache(ws.data);
				ws.send(JSON.stringify({ type: "agent", name: ws.data.agentName }));
				ws.send(
					logLine(
						"INFO",
						"chat",
						ws.data.agentName
							? `Agent persona: ${ws.data.agentName} (markdown system prompt from workspace).`
							: "Agent persona: Orchestrator (no workspace .md — server injects Pi-shaped orchestrator system prompt).",
					),
				);
				return;
			}
			if (msg.type === "activate_session") {
				if (ws.data.busy) {
					ws.send(
						JSON.stringify({
							type: "error",
							message: "Cannot switch chat tab while a reply is still streaming.",
						}),
					);
					return;
				}
				await processActivateSession(ws, msg as { transcript?: unknown; sessionKey?: unknown });
				return;
			}
			if (msg.type === "new_session") {
				if (ws.data.busy) {
					ws.send(
						JSON.stringify({
							type: "error",
							message: "Cannot start a new session while a reply is still streaming.",
						}),
					);
					return;
				}
				ws.data.messages = [];
				ws.data.pendingChatQueue = [];
				ws.data.wopSessionKey = null;
				ws.data.cumPromptTokens = 0;
				ws.data.cumCompletionTokens = 0;
				sendQueueState(ws, []);
				await applyLeadFromCache(ws.data);
				ws.send(JSON.stringify({ type: "session_reset" }));
				ws.send(JSON.stringify({ type: "chat_mode", mode: ws.data.chatMode }));
				ws.send(JSON.stringify({ type: "agent", name: ws.data.agentName }));
				ws.send(logLine("INFO", "chat", "New session — conversation context cleared for this connection."));
				return;
			}
			if (msg.type === "queue_edit") {
				const id = String((msg as { id?: unknown }).id ?? "").trim();
				const nextText = String((msg as { text?: unknown }).text ?? "").trim();
				if (!id || !nextText) {
					ws.send(JSON.stringify({ type: "error", message: "queue_edit requires id and non-empty text." }));
					return;
				}
				const item = ws.data.pendingChatQueue.find((q) => q.id === id);
				if (!item) {
					ws.send(JSON.stringify({ type: "error", message: "Unknown queue message id." }));
					return;
				}
				item.text = nextText;
				sendQueueState(ws, ws.data.pendingChatQueue);
				return;
			}
			if (msg.type === "queue_delete") {
				const id = String((msg as { id?: unknown }).id ?? "").trim();
				if (!id) {
					ws.send(JSON.stringify({ type: "error", message: "queue_delete requires id." }));
					return;
				}
				const before = ws.data.pendingChatQueue.length;
				ws.data.pendingChatQueue = ws.data.pendingChatQueue.filter((q) => q.id !== id);
				if (ws.data.pendingChatQueue.length === before) {
					ws.send(JSON.stringify({ type: "error", message: "Unknown queue message id." }));
					return;
				}
				sendQueueState(ws, ws.data.pendingChatQueue);
				return;
			}
			if (msg.type === "queue_force") {
				const id = String((msg as { id?: unknown }).id ?? "").trim();
				if (!id) {
					ws.send(JSON.stringify({ type: "error", message: "queue_force requires id." }));
					return;
				}
				const idx = ws.data.pendingChatQueue.findIndex((q) => q.id === id);
				if (idx < 0) {
					ws.send(JSON.stringify({ type: "error", message: "Unknown queue message id." }));
					return;
				}
				const [item] = ws.data.pendingChatQueue.splice(idx, 1);
				if (!item) return;
				if (ws.data.busy) {
					ws.data.pendingChatQueue.unshift(item);
					sendQueueState(ws, ws.data.pendingChatQueue);
					return;
				}
				try {
					ws.send(JSON.stringify({ type: "queue_runtime_bind", queueId: item.id }));
				} catch {
					/* socket may be closing */
				}
				sendQueueState(ws, ws.data.pendingChatQueue);
				void runChatTurn(ws, item.text, false).catch(() => {
					/* runChatTurn already reports errors to the client */
				});
				return;
			}
			if (msg.type !== "chat") return;
			const text = String(msg.content ?? "").trim();
			if (!text) return;
			const selectedPath = (msg as any).selectedPath || null;

			if (ws.data.busy) {
				const id = crypto.randomUUID();
				ws.data.pendingChatQueue.push({ id, text });
				ws.send(JSON.stringify({ type: "user_queued", content: text, queueId: id }));
				sendQueueState(ws, ws.data.pendingChatQueue);
				return;
			}

			void runChatTurn(ws, text, true, selectedPath).catch(() => {
				/* runChatTurn already reports errors to the client */
			});
			} catch (e) {
				const m = e instanceof Error ? e.message : String(e);
				console.error("[ws message handler error]", m);
				try { ws.send(JSON.stringify({ type: "error", message: `Server error: ${m}` })); } catch { /* ignore */ }
			}
		},
	},
});

const _bootEngineMode = wopChatEngineFromEnv();
const _bootPiDrives = shouldUsePiJsonChat();
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

// Start Telegram bot (if token is configured)
void (async () => {
	const { startTelegramBot } = await import("./telegram-bot");
	await startTelegramBot();
})();

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
