import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
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
import { getAgentBodyByName, readPlannerAgentBodySync, resolveAgentSkillsFromName } from "./agents";
import { isValidOllamaModelId, isValidOpenRouterModelId } from "./llm-models";
import { getWorkspaceRoot } from "./paths";
import {
	getPrimaryWorkspacePath,
} from "./workspace-state";
import {
	attachTerminalSession,
	disposeTerminal,
	handleTerminalMessage,
	type TerminalWsData,
} from "./terminal-ws";
import {
	registerChatSocketForToolLogs,
	unregisterChatSocketForToolLogs,
} from "./tool-log-broadcast";
import {
	appendWoSessionMessage,
	loadWoSessionMessages,
	sanitizeSessionKey,
	syncWoSessionFile,
	woSessionBasename,
} from "./wo-session-jsonl";
import { tryAutoDispatchFromUserText } from "./orchestrator-dispatch-intent";
import {
	orchestratorToolsEnabled,
} from "./orchestrator-tools-exec";
import {
	woAgentRuntimeBlockedReason,
	getWoStackForSurface,
	runWoChatTurn,
	authoritativeRuntimeEnabled,
} from "./agent-runtime";
import { evalChatSlashCommand, type ChatSlashMutation } from "./chat-slash-commands";
import { getWorkspaceIndexChatBoostSync } from "./workspace-index";
import { resolveWoAiModelDefault } from "./wo-ai-env";
import { logLine } from "./utils";

export type PendingChatItem = { id: string; text: string };

export type ChatWsData = {
	kind: "chat";
	messages: ChatMessage[];
	busy: boolean;
	pendingChatQueue: PendingChatItem[];
	ollamaModel?: string;
	openrouterModel?: string;
	chatMode: ChatSessionMode;
	agentName: string | null;
	cachedAgentBody: string | null;
	cachedAgentSkills: string | null;
	chatAbort: AbortController | null;
	cumPromptTokens: number;
	cumCompletionTokens: number;
	wopSessionKey: string | null;
	surface: string | null;
	tenantId: string;
	userId: string;
	lang?: string;
};

export type ServerWsData = ChatWsData | TerminalWsData;

/** Helper: Apply system prompt leads. */
async function applyLeadFromCache(data: ChatWsData, opts?: { effectiveAgentNameLower?: string | null }) {
	const agentNameLower = data.agentName?.trim().toLowerCase() ?? opts?.effectiveAgentNameLower?.trim().toLowerCase() ?? null;
	let plannerBody: string | null = null;
	if (data.chatMode === "plan" && agentNameLower !== "planner") {
		plannerBody = readPlannerAgentBodySync(getPrimaryWorkspacePath(data.tenantId));
	}
	const piJson = authoritativeRuntimeEnabled();
	await applyLeadSystem(data.messages, {
		mode: data.chatMode,
		envSystemPrompt: process.env.WOP_SYSTEM_PROMPT,
		agentBody: data.cachedAgentBody,
		agentSkills: data.cachedAgentSkills,
		agentNameLower,
		plannerAgentBody: plannerBody,
		orchestratorToolsEnabled: orchestratorToolsEnabled() && !piJson,
		authoritativeRuntime: piJson,
		workspaceIndexBoost: getWorkspaceIndexChatBoostSync(),
		lang: data.lang,
	});
}

function sendQueueState(ws: { send: (data: string) => void }, queue: PendingChatItem[]) {
	try {
		ws.send(JSON.stringify({
			type: "queue_state",
			pending: queue.length,
			items: queue.map((q) => ({ id: q.id, text: q.text })),
		}));
	} catch { /* closing */ }
}

function effectiveChatModelId(data: ChatWsData): string {
	const provider = (process.env.WOP_LLM_PROVIDER || "ollama").toLowerCase();
	if (provider === "openrouter") {
		return (data.openrouterModel || process.env.OPENROUTER_MODEL || "openrouter/auto").trim();
	}
	return (data.ollamaModel || resolveWoAiModelDefault(data.tenantId)).trim();
}

function sendChatUsageMeter(ws: { send: (data: string) => void }, data: ChatWsData, lastTurn: StreamTokenUsage, usageApproximate: boolean) {
	const model = effectiveChatModelId(data);
	const win = estimateContextWindowTokens(model);
	const lp = lastTurn.promptTokens;
	const pct = win != null && lp > 0 ? Math.min(100, (lp / win) * 100) : null;
	try {
		ws.send(JSON.stringify({
			type: "chat_usage",
			streamPeek: false,
			lastPrompt: lastTurn.promptTokens,
			lastCompletion: lastTurn.completionTokens,
			cumPrompt: data.cumPromptTokens,
			cumCompletion: data.cumCompletionTokens,
			contextWindow: win,
			contextPercent: pct,
			approximate: usageApproximate,
		}));
	} catch { /* closing */ }
}

function sendChatUsageStreamPeek(ws: { send: (data: string) => void }, data: ChatWsData, u: StreamTokenUsage) {
	const model = effectiveChatModelId(data);
	const win = estimateContextWindowTokens(model);
	const cumP = data.cumPromptTokens;
	const cumC = data.cumCompletionTokens;
	const lp = Math.max(0, u.promptTokens);
	const lc = Math.max(0, u.completionTokens);
	const estInput = cumP + lp;
	const pct = win != null && estInput > 0 ? Math.min(100, (estInput / win) * 100) : null;
	try {
		ws.send(JSON.stringify({
			type: "chat_usage",
			streamPeek: true,
			lastPrompt: lp,
			lastCompletion: lc,
			cumPrompt: cumP,
			cumCompletion: cumC,
			contextWindow: win,
			contextPercent: pct,
			approximate: false,
		}));
	} catch { /* closing */ }
}

async function processActivateSession(ws: any, msg: { transcript?: unknown; sessionKey?: unknown }) {
	const raw = msg.transcript;
	if (!Array.isArray(raw)) {
		ws.send(JSON.stringify({ type: "error", message: "activate_session requires a transcript array." }));
		return;
	}
	const sessionKey = typeof msg.sessionKey === "string" && msg.sessionKey.trim() ? sanitizeSessionKey(msg.sessionKey.trim()) : null;
	ws.data.wopSessionKey = sessionKey;

	const next: ChatMessage[] = [];
	for (const item of raw.slice(0, 500)) {
		if (!item || typeof item !== "object") continue;
		const role = (item as any).role;
		const content = String((item as any).content ?? "");
		if (role === "user" || role === "assistant") {
			next.push({ role, content });
		}
	}

	let hydratedFromDisk = false;
	if (next.length === 0 && sessionKey) {
		const disk = await loadWoSessionMessages(sessionKey, ws.data.surface || undefined);
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
			await syncWoSessionFile(sessionKey, ws.data.messages, ws.data.surface || undefined);
		} catch (e) {
			const m = e instanceof Error ? e.message : String(e);
			ws.send(logLine("WARN", "session", `Failed to write session JSONL: ${m}`));
		}
	}

	if (hydratedFromDisk && sessionKey) {
		const turns = ws.data.messages
			.filter((m) => m.role === "user" || (m.role === "assistant" && String(m.content ?? "").trim().length > 0))
			.map((m) => ({ role: m.role as "user" | "assistant", content: String(m.content ?? "") }));
		ws.send(JSON.stringify({ type: "session_transcript", sessionKey, turns }));
	}
}

async function applySlashMutations(ws: any, mutation: ChatSlashMutation | undefined) {
	if (!mutation) return;
	const data = ws.data as ChatWsData;
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
	}
	if (mutation.reload) {
		if (data.agentName) {
			const freshBody = await getAgentBodyByName(data.agentName, data.tenantId);
			if (freshBody) {
				data.cachedAgentBody = freshBody;
				data.cachedAgentSkills = await resolveAgentSkillsFromName(data.agentName, data.tenantId);
			}
		}
		await applyLeadFromCache(data);
		try { ws.send(JSON.stringify({ type: "agents_catalog_changed" })); } catch {}
	}
	if (mutation.setAgentName !== undefined) {
		const name = mutation.setAgentName;
		if (name) {
			const body = await getAgentBodyByName(name, data.tenantId);
			data.agentName = name;
			data.cachedAgentBody = body ?? null;
			data.cachedAgentSkills = await resolveAgentSkillsFromName(name, data.tenantId);
		} else {
			data.agentName = null;
			data.cachedAgentBody = null;
			data.cachedAgentSkills = null;
		}
		await applyLeadFromCache(data);
		ws.send(JSON.stringify({ type: "agent", name: data.agentName }));
	}
}

async function runChatTurn(ws: any, text: string, notifyUser: boolean, selectedPath?: string | null) {
	const data = ws.data as ChatWsData;
	data.busy = true;
	let phraseDispatchRestoreCached: string | null | undefined = undefined;
	try {
		const trimmed = text.trim();
		const slash = await evalChatSlashCommand(trimmed, {
			provider: (process.env.WOP_LLM_PROVIDER || "ollama").toLowerCase(),
			ollamaModel: data.ollamaModel,
			openrouterModel: data.openrouterModel,
		});

		if (slash.handled) {
			const mutation = slash.mutation;
			// ... (rest of block)
		}

		// Removed redundant applySlashMutations call for unhandled slash command.

		const lenBeforeUserMsg = data.messages.length;
		if (notifyUser) ws.send(JSON.stringify({ type: "user_message", content: text }));
		
		let historyText = text;
		if (selectedPath) {
			historyText = `[System Context: User is viewing/editing "${selectedPath}"]\n\n${text}`;
		}
		data.messages.push({ role: "user", content: historyText });
		if (data.wopSessionKey) await appendWoSessionMessage(data.wopSessionKey, "user", historyText, data.surface || undefined).catch(() => {});

		await applyLeadFromCache(data);

		const sendLog = (level: "INFO" | "WARN" | "ERROR", source: string, m: string) => {
			ws.send(logLine(level, source, m));
		};

		try {
			const disp = await tryAutoDispatchFromUserText(text, data.agentName);
			if (disp.kind === "orchestrator") {
				data.agentName = null;
				data.cachedAgentBody = null;
				data.cachedAgentSkills = null;
				await applyLeadFromCache(data);
				ws.send(JSON.stringify({ type: "agent", name: data.agentName }));
			} else if (disp.kind === "agent") {
				phraseDispatchRestoreCached = data.cachedAgentBody;
				data.cachedAgentBody = disp.body;
				await applyLeadFromCache(data, { effectiveAgentNameLower: disp.canonicalName.trim().toLowerCase() });
				ws.send(JSON.stringify({ type: "dispatch_turn", agent: disp.canonicalName }));
			}
		} catch {}

		ws.send(JSON.stringify({ type: "assistant_turn_start" }));

		const woBlocked = woAgentRuntimeBlockedReason();
		if (woBlocked) {
			ws.send(JSON.stringify({ type: "error", message: woBlocked }));
			return;
		}

		applyChatContextBudget(data.messages, sendLog);

		const ac = new AbortController();
		data.chatAbort = ac;
		const useAuthRt = authoritativeRuntimeEnabled();
		
		let full = "";
		let lastStreamUsage: StreamTokenUsage | null = null;

		try {
			let result: StreamChatResult;
			if (useAuthRt) {
				const surface = data.wopSessionKey?.split(".")[0] || null;
				const woStack = getWoStackForSurface(surface);
				const o = await runWoChatTurn({
					woStack,
					cwd: getPrimaryWorkspacePath(data.tenantId),
					messages: data.messages,
					onDelta: (delta) => {
						full += delta;
						ws.send(JSON.stringify({ type: "assistant_delta", content: delta }));
					},
					onReasoningDelta: (d) => ws.send(JSON.stringify({ type: "assistant_reasoning_delta", content: d })),
					onStreamUsage: (u) => sendChatUsageStreamPeek(ws, data, u),
					onLog: sendLog,
					signal: ac.signal,
					runtime: { ollamaModel: data.ollamaModel, openrouterModel: data.openrouterModel },
				});
				result = o.result;
				lastStreamUsage = o.lastStreamUsage;
			} else {
				const o = await runOrchestratorToolLoop(data.messages, (delta) => {
					full += delta;
					ws.send(JSON.stringify({ type: "assistant_delta", content: delta }));
				}, sendLog, {
					ollamaModel: data.ollamaModel,
					openrouterModel: data.openrouterModel,
				}, {
					signal: ac.signal,
					onStreamUsage: (u) => sendChatUsageStreamPeek(ws, data, u),
					onReasoningDelta: (d) => ws.send(JSON.stringify({ type: "assistant_reasoning_delta", content: d })),
					tenantId: data.tenantId,
					userId: data.userId,
				});
				result = o.result;
				lastStreamUsage = o.lastStreamUsage;
				full = o.finalAssistantText;
			}

			if (result.ok) {
				if (data.wopSessionKey && full.length > 0) {
					await appendWoSessionMessage(data.wopSessionKey, "assistant", full, data.surface || undefined).catch(() => {});
				}
				data.cumPromptTokens += lastStreamUsage?.promptTokens || 0;
				data.cumCompletionTokens += lastStreamUsage?.completionTokens || 0;
				if (!authoritativeRuntimeEnabled() && !orchestratorToolsEnabled()) {
					data.messages.push({ role: "assistant", content: full });
				}
				sendChatUsageMeter(ws, data, lastStreamUsage || { promptTokens: 0, completionTokens: 0 }, lastStreamUsage == null);
			}

			ws.send(JSON.stringify({ type: "done" }));
		} catch (e) {
			ws.send(JSON.stringify({ type: "error", message: String(e) }));
		}
	} finally {
		if (phraseDispatchRestoreCached !== undefined) {
			data.cachedAgentBody = phraseDispatchRestoreCached;
			await applyLeadFromCache(data);
		}
		data.chatAbort = null;
		data.busy = false;
		const next = data.pendingChatQueue.shift();
		if (next) void runChatTurn(ws, next.text, false);
	}
}

export const websocketHandler = {
	async open(ws: any) {
		try {
			if (ws.data.kind === "terminal") {
				attachTerminalSession(ws);
				return;
			}

			if (!ws.data.agentName && ws.data.surface) {
				const s = ws.data.surface;
				if (s === "claw") ws.data.agentName = "claw";
				else if (s === "docs") ws.data.agentName = "docs";
				else if (s === "kanban") ws.data.agentName = "kanban";
				else if (s === "ata") ws.data.agentName = "ata";
				else if (s === "billing") ws.data.agentName = "fakturering";
				else if (s === "planning") ws.data.agentName = "schemaplanerare";
				else if (s === "project") ws.data.agentName = "projektledare";
			}

			if (ws.data.agentName && !ws.data.cachedAgentBody) {
				ws.data.cachedAgentBody = await getAgentBodyByName(ws.data.agentName, ws.data.tenantId);
				ws.data.cachedAgentSkills = await resolveAgentSkillsFromName(ws.data.agentName, ws.data.tenantId);
			}

			await applyLeadFromCache(ws.data);
			const provider = (process.env.WOP_LLM_PROVIDER || "ollama").toLowerCase();
			const envOllama = resolveWoAiModelDefault();
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
	close(ws: any) {
		if (ws.data.kind === "terminal") {
			disposeTerminal(ws);
		} else if (ws.data.kind === "chat") {
			unregisterChatSocketForToolLogs(ws);
		}
	},
	async message(ws: any, raw: any) {
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
				const id = String(msg.model ?? "").trim();
				const provider = (process.env.WOP_LLM_PROVIDER || "ollama").toLowerCase();
				if (provider === "openrouter") {
					if (isValidOpenRouterModelId(id)) {
						ws.data.openrouterModel = id;
						ws.data.ollamaModel = undefined;
					}
				} else {
					if (isValidOllamaModelId(id)) {
						ws.data.ollamaModel = id;
						ws.data.openrouterModel = undefined;
					}
				}
				ws.send(JSON.stringify({ type: "model_set", effectiveModel: id, provider }));
				return;
			}
			if (msg.type === "set_chat_mode") {
				const next: ChatSessionMode = String(msg.mode ?? "") === "plan" ? "plan" : "build";
				ws.data.chatMode = next;
				await applyLeadFromCache(ws.data);
				ws.send(JSON.stringify({ type: "chat_mode", mode: next }));
				return;
			}
			if (msg.type === "set_agent") {
				const rawAgent = msg.agent;
				const nextName = rawAgent === null || rawAgent === undefined || String(rawAgent).trim() === "" ? null : String(rawAgent).trim();
				if (nextName) {
					const body = await getAgentBodyByName(nextName, ws.data.tenantId);
					if (body) {
						ws.data.agentName = nextName;
						ws.data.cachedAgentBody = body;
						ws.data.cachedAgentSkills = await resolveAgentSkillsFromName(nextName, ws.data.tenantId);
					}
				} else {
					ws.data.agentName = null;
					ws.data.cachedAgentBody = null;
					ws.data.cachedAgentSkills = null;
				}
				await applyLeadFromCache(ws.data);
				ws.send(JSON.stringify({ type: "agent", name: ws.data.agentName }));
				return;
			}
			if (msg.type === "activate_session") {
				if (!ws.data.busy) await processActivateSession(ws, msg as any);
				return;
			}
			if (msg.type === "new_session") {
				if (!ws.data.busy) {
					ws.data.messages = [];
					ws.data.pendingChatQueue = [];
					ws.data.wopSessionKey = null;
					ws.data.cumPromptTokens = 0;
					ws.data.cumCompletionTokens = 0;
					sendQueueState(ws, []);
					await applyLeadFromCache(ws.data);
					ws.send(JSON.stringify({ type: "session_reset" }));
				}
				return;
			}
			if (msg.type === "queue_edit") {
				const item = ws.data.pendingChatQueue.find((q: any) => q.id === (msg as any).id);
				if (item) {
					item.text = (msg as any).text;
					sendQueueState(ws, ws.data.pendingChatQueue);
				}
				return;
			}
			if (msg.type === "queue_delete") {
				ws.data.pendingChatQueue = ws.data.pendingChatQueue.filter((q: any) => q.id !== (msg as any).id);
				sendQueueState(ws, ws.data.pendingChatQueue);
				return;
			}
			if (msg.type === "queue_force") {
				const idx = ws.data.pendingChatQueue.findIndex((q: any) => q.id === (msg as any).id);
				if (idx >= 0) {
					const [item] = ws.data.pendingChatQueue.splice(idx, 1);
					if (ws.data.busy) {
						ws.data.pendingChatQueue.unshift(item);
					} else {
						ws.send(JSON.stringify({ type: "queue_runtime_bind", queueId: item.id }));
						void runChatTurn(ws, item.text, false);
					}
					sendQueueState(ws, ws.data.pendingChatQueue);
				}
				return;
			}
			if (msg.type !== "chat") return;
			
			const text = String(msg.content ?? "").trim();
			if (!text) return;
			const selectedPath = (msg as any).selectedPath || null;

			if (ws.data.busy) {
				const id = randomUUID();
				ws.data.pendingChatQueue.push({ id, text });
				ws.send(JSON.stringify({ type: "user_queued", content: text, queueId: id }));
				sendQueueState(ws, ws.data.pendingChatQueue);
				return;
			}

			void runChatTurn(ws, text, true, selectedPath).catch(() => {});
		} catch (e) {
			const m = e instanceof Error ? e.message : String(e);
			console.error("[ws message handler error]", m);
			try { ws.send(JSON.stringify({ type: "error", message: `Server error: ${m}` })); } catch { /* ignore */ }
		}
	},
};
