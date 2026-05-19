/**
 * useWayOfPiSession Hook
 *
 * @description Manages session state including chat tabs, streaming status, and LLM connections
 * @returns Object with session state and action functions
 */

import * as React from "react";
import type { ChatQueueItem } from "../utils/chatQueueTranscript";

/** @description Chat session error state */
export enum ChatSessionError {
	NotConnected = "not-connected",
	Disconnected = "disconnected",
	Reconnecting = "reconnecting",
	NoAgents = "no-agents",
	StreamingError = "streaming-error",
}

export type UiMode = "simple" | "technical" | "claw" | "docs" | "work" | "admin" | "super_admin" | "profile" | "portal" | "client";

export interface ChatRow {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  text?: string;
  agentId?: string;
  agentName?: string;
  timestamp?: number;
  turnId?: string;
  fromUser?: string;
  segments?: { role: string; parts: string[] }[];
  reasoning?: string;
  assistantPersona?: string;
}

export interface LogRow {
  id: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  msg: string;
  timestamp: number;
  time: string;
  source: string;
}

export interface ChatSessionTab {
  id: string;
  label: string;
  agentId?: string;
  agentName?: string;
}
export type ChatPulseMeters = {
  contextFillPct?: number;
  peekPrompt?: number;
  peekCompletion?: number;
  cumPrompt?: number;
  cumCompletion?: number;
  agentId?: string;
  agentName?: string;
};

/** @description Chat session surface ID */
export type ChatSessionSurfaceId = string;

/** @description Chat session mode types */
export type ChatSessionMode = "default" | "simple" | "claw" | "build" | "plan" | "message";

/** @description Chat tab state */
export interface ChatTab {
	id: string;
	agent: string;
	label: string;
	content?: string;
	segments?: { role: string; parts: string[] }[];
	agentName?: string;
	role?: string;
	fromUser?: string;
}

/** @description Pulsing chat meter state */
export interface ChatPulseMeter {
	active: boolean;
	agentId?: string;
	agentName?: string;
}

/** @description Workspace row data */
export interface WorkspaceRow {
	id: string;
	path: string;
	name: string;
	type: string;
}

export interface UseWayOfPiSessionReturn {
	rows: ChatRow[];
	streaming: boolean;
	connected: boolean;
	error: ChatSessionError | null;
	agentName: string | null;
	agentId: string | null;
	agentIds: string[] | null;
	chatTabs: ChatTab[];
	activeChatTabId: string | null;
	model: string;
	dispatchTurnAgent: (turn: string) => Promise<void>;
	selectChatTab: (tabId?: string) => void;
	closeChatTab: (tabId?: string) => void;
	stop: () => void;
	sendChat: (
		agentId: string,
		message: string,
		turnId?: string,
		selectedPath?: string | null,
	) => Promise<void>;
	chatPulseMeters: ChatPulseMeters;
	setChatPulseMeters: (meters: ChatPulseMeters) => void;
	setChatAgent: (name: string | null) => void;
	setAgentIds: (agentIds: string[]) => void;
	updateRows: (newRows: ChatRow[]) => void;
	updateChatTabs: (newTabs: ChatTab[]) => void;
	updateModel: (newModel: string) => void;
	clearChatTabs: () => void;
	clearRows: () => void;
	clearChatPulseMeters: () => void;
	reloadSession: () => Promise<void>;
	refreshWs: () => Promise<void>;
	chatMode: ChatSessionMode;
	setChatMode: (mode: ChatSessionMode) => void;
	tokenMeter: { tokensDown: string; tokensUp: string; tokensTitle?: string; contextPct?: number; contextTitle?: string };
	clearError: () => void;
	startNewSession: () => void;
	chatQueuePending: boolean;
	chatQueueItems: ChatQueueItem[];
	editChatQueueItem: (id: string, text: string) => void;
	deleteChatQueueItem: (id: string) => void;
	forceChatQueueItem: (id: string) => void;
	reconnectWebSocket: () => void;
	effectiveModel: string;
	logs: LogRow[];
	chatAgentName: string | null;
	setLlmModel: (model: string) => void;
	llmProviderFromSocket: (socketPath?: string) => string | null;
	renameChatTab: (tabId: string, name: string) => void;
}

export function useWayOfPiSession(): UseWayOfPiSessionReturn {
	const [ws, setWs] = React.useState<WebSocket | null>(null);
	const wsRef = React.useRef<WebSocket | null>(null);
	const connectingRef = React.useRef<boolean>(false);

	const [agentName, setAgentNameState] = React.useState<string | null>(null);
	const [agentId, setAgentIdState] = React.useState<string | null>(null);
	const [agentIds, setAgentIdsState] = React.useState<string[] | null>(null);
	const [chatTabs, setChatTabs] = React.useState<ChatTab[]>([]);
	const [activeChatTabId, setActiveChatTabId] = React.useState<string | null>(null);
	const [model, setModel] = React.useState<string>("llama3.2");
	const [chatMode, setChatModeState] = React.useState<ChatSessionMode>("build");

	const [rows, setRows] = React.useState<ChatRow[] | null>(null);
	const [error, setError] = React.useState<ChatSessionError | null>(null);
	const [streaming, setStreaming] = React.useState<boolean | null>(null);

	// @description Pulsing chat meters for agent activity visualization
	const [chatPulseMeters, setChatPulseMetersState] = React.useState<ChatPulseMeters>(
		{},
	);

	const [tokenMeter, setTokenMeter] = React.useState<UseWayOfPiSessionReturn["tokenMeter"]>({
		tokensDown: "0",
		tokensUp: "0",
		tokensTitle: "",
		contextPct: 0,
		contextTitle: "",
	});

	const [logs, setLogs] = React.useState<LogRow[]>([]);
	const [chatQueuePending, setChatQueuePending] = React.useState<boolean>(false);
	const [chatQueueItems, setChatQueueItems] = React.useState<ChatQueueItem[]>([]);

	// @description Session initialization - always run on mount
	const initSession = React.useCallback(async () => {
		if (connectingRef.current) return;
		
		// Close existing if any
		if (wsRef.current) {
			try {
				wsRef.current.onclose = null;
				wsRef.current.onerror = null;
				wsRef.current.onmessage = null;
				wsRef.current.close();
			} catch (e) {
				console.warn("Error closing old WS:", e);
			}
		}

		connectingRef.current = true;

		const wsUrl =
			(import.meta as any).env?.VITE_WAYOFPI_WS_URL || `/ws`;
		const newWs = new WebSocket(wsUrl);
		wsRef.current = newWs;

		newWs.onopen = () => {
			console.log("WS Connected to:", wsUrl);
			setWs(newWs);
			connectingRef.current = false;
		};
		newWs.onclose = () => {
			console.log("WS Disconnected");
			setWs(null);
			if (wsRef.current === newWs) wsRef.current = null;
			connectingRef.current = false;
			setError(ChatSessionError.Disconnected);
		};
		newWs.onerror = (err) => {
			console.error("WS Error:", err);
			connectingRef.current = false;
			setError(ChatSessionError.Disconnected);
		};
		newWs.onmessage = (event) => {
			const data = JSON.parse(event.data);
			if (data.type === "ready") {
				if (data.chatMode) setChatModeState(data.chatMode);
				if (data.agentName) setAgentNameState(data.agentName);
				if (data.effectiveModel) setModel(data.effectiveModel);
			} else if (data.type === "model_set") {
				if (data.effectiveModel) setModel(data.effectiveModel);
			} else if (data.type === "chat_usage") {
				setTokenMeter({
					tokensDown: String(data.cumCompletion || 0),
					tokensUp: String(data.cumPrompt || 0),
					tokensTitle: `Last: ${data.lastPrompt || 0} in, ${data.lastCompletion || 0} out`,
					contextPct: data.contextPercent || 0,
					contextTitle: data.contextWindow ? `Context: ${Math.round(data.contextPercent || 0)}% of ${data.contextWindow} tokens` : "",
				});
			} else if (data.type === "user_message") {
				setRows(prev => [...(prev || []), { 
					id: window.crypto.randomUUID(), 
					role: "user", 
					content: data.content,
					timestamp: Date.now()
				}]);
			} else if (data.type === "assistant_turn_start") {
				setStreaming(true);
				setRows(prev => [...(prev || []), { 
					id: window.crypto.randomUUID(), 
					role: "assistant", 
					content: "",
					timestamp: Date.now()
				}]);
			} else if (data.type === "assistant_delta") {
				setRows(prev => {
					const next = [...(prev || [])];
					if (next.length === 0) return next;
					const lastIdx = next.length - 1;
					const last = next[lastIdx];
					if (last && (last as any).role === "assistant") {
						next[lastIdx] = { ...last, content: (last as any).content + data.content };
					}
					return next;
				});
			} else if (data.type === "assistant_reasoning_delta") {
				setRows(prev => {
					const next = [...(prev || [])];
					if (next.length === 0) return next;
					const lastIdx = next.length - 1;
					const last = next[lastIdx];
					if (last && (last as any).role === "assistant") {
						next[lastIdx] = { ...last, reasoning: ((last as any).reasoning || "") + data.content };
					}
					return next;
				});
			} else if (data.type === "done") {
				setStreaming(false);
			} else if (data.type === "error") {
				setStreaming(false);
				setError(ChatSessionError.StreamingError);
				setLogs(prev => [...prev, {
					id: window.crypto.randomUUID(),
					level: "error",
					message: data.message,
					msg: data.message,
					timestamp: Date.now(),
					time: new Date().toLocaleTimeString(),
					source: "chat"
				}]);
			} else if (data.type === "log") {
				setLogs(prev => [...prev, {
					id: window.crypto.randomUUID(),
					level: (data.level?.toLowerCase() || "info") as any,
					message: data.msg || data.message,
					msg: data.msg || data.message,
					timestamp: Date.now(),
					time: data.time || new Date().toLocaleTimeString(),
					source: data.source || "server"
				}]);
			} else if (data.type === "queue_state") {
				setChatQueuePending(data.pending > 0);
				setChatQueueItems(data.items || []);
			} else if (data.type === "session_reset") {
				setRows([]);
				setLogs([]);
			} else if (data.type === "session_transcript") {
				setRows(data.turns.map((t: any) => ({
					id: window.crypto.randomUUID(),
					role: t.role,
					content: t.content,
					timestamp: Date.now()
				})));
			}
		};
	}, []);

	// @description Reconnect WebSocket on mount or error
	React.useEffect(() => {
		let isMounted = true;
		const reconnect = async () => {
			if (!isMounted) return;
			try {
				setError(null);
				await initSession();
			} catch (e) {
				if (isMounted) {
					console.error("Session init failed:", e);
				}
			}
		};

		// Always try connect on mount
		if (!ws && !connectingRef.current) {
			reconnect();
		}

		// Reconnect on error
		if (error && !connectingRef.current) {
			reconnect();
		}

		return () => {
			isMounted = false;
		};
	}, [ws, error, initSession]);

	// @description Send chat message to server
	const sendChat: UseWayOfPiSessionReturn["sendChat"] = async (
		agentId,
		message,
		turnId,
		selectedPath,
	) => {
		setStreaming(true);
		
		// If agent name changed, tell the server first
		if (agentId !== agentName) {
			setAgentNameState(agentId);
			if (ws && ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: "set_agent", agent: agentId }));
			}
		}

		const payload = { 
			type: "chat", 
			content: message, 
			id: turnId,
			selectedPath: selectedPath || null
		};

		return new Promise((resolve, reject) => {
			if (ws && ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify(payload));
				
				// The server sends 'done' when finished
				const handleMessage = (event: MessageEvent) => {
					const data = JSON.parse(event.data);
					if (data.type === "done" || data.type === "error") {
						setStreaming(false);
						ws.removeEventListener("message", handleMessage);
						resolve(undefined);
					}
				};
				ws.addEventListener("message", handleMessage);

				// Fallback timeout
				setTimeout(() => {
					setStreaming(false);
					ws.removeEventListener("message", handleMessage);
					resolve(undefined);
				}, 120000);
			} else {
				setStreaming(false);
				reject(new Error("WebSocket not connected"));
			}
		});
	};

	// @description Stop generation / Close socket
	const stop = () => {
		if (ws && ws.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify({ type: "stop_chat" }));
			// We don't necessarily want to close the whole WS, 
			// just stop the current turn.
		}
	};

	// @description Dispatch turn to active agent
	const dispatchTurnAgent: UseWayOfPiSessionReturn["dispatchTurnAgent"] =
		async (turn: string) => {
			const payload = { type: "dispatch" };
			return new Promise((resolve) => {
				if (ws && ws.readyState === WebSocket.OPEN) {
					ws.send(JSON.stringify(payload));
					setTimeout(resolve, 100);
				}
				resolve(undefined);
			});
		};

	// @description Select chat tab by ID
	const selectChatTab: UseWayOfPiSessionReturn["selectChatTab"] = (tabId) => {
		if (tabId) {
			setActiveChatTabId(tabId);
		} else {
			// Select first tab if not specified
			setActiveChatTabId(chatTabs[0]?.id || null);
		}
	};

	// @description Clear active chat tab
	const closeChatTab: UseWayOfPiSessionReturn["closeChatTab"] = (tabId) => {
		const newTabs = chatTabs.filter((t) => t.id !== tabId);
		setChatTabs(newTabs);

		if (activeChatTabId) {
			// If we closed the active tab, select the new active one
			const newActiveId = newTabs[newTabs.length - 1]?.id;
			setActiveChatTabId(newActiveId || null);
		}
	};

	return {
		rows: (rows ?? []) as unknown as ChatRow[],
		streaming: streaming ?? false,
		connected: !!ws && ws.readyState === WebSocket.OPEN,
		error,
		agentName,
		agentId,
		agentIds,
		chatTabs,
		activeChatTabId,
		model,
		dispatchTurnAgent,
		selectChatTab,
		closeChatTab,
		stop,
		sendChat,
		chatPulseMeters,
		setChatPulseMeters: setChatPulseMetersState,
		setChatAgent: (name: string | null) => {
			setAgentNameState(name);
			if (ws && ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: "set_agent", agent: name }));
			}
		},
		setAgentIds: setAgentIdsState,
		updateRows: setRows as any,
		updateChatTabs: setChatTabs,
		updateModel: setModel,
		clearChatTabs: () => {
			setChatTabs([]);
			setActiveChatTabId(null);
			stop();
		},
		clearRows: () => setRows(null),
		clearChatPulseMeters: () => setChatPulseMetersState({}),
		reloadSession: async () => {
			// Would reload session state if needed
		},
		refreshWs: async () => {
			await initSession();
		},
		chatMode,
		setChatMode: (mode: ChatSessionMode) => {
			setChatModeState(mode);
			if (ws && ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: "set_chat_mode", mode }));
			}
		},
		tokenMeter,
		clearError: () => setError(null),
		startNewSession: () => {
			if (ws && ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: "new_session" }));
			}
		},
		chatQueuePending,
		chatQueueItems,
		editChatQueueItem: (id, text) => {
			if (ws && ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: "queue_edit", id, text }));
			}
		},
		deleteChatQueueItem: (id) => {
			if (ws && ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: "queue_delete", id }));
			}
		},
		forceChatQueueItem: (id) => {
			if (ws && ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: "queue_force", id }));
			}
		},
		reconnectWebSocket: () => {
			initSession();
		},
		effectiveModel: model,
		logs,
		chatAgentName: agentName,
		setLlmModel: (m) => {
			if (ws && ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: "set_model", model: m }));
			}
		},
		llmProviderFromSocket: () => null,
		renameChatTab: (tabId, name) => {
			setChatTabs(prev => prev.map(t => t.id === tabId ? { ...t, name } : t));
		},
	};
}
