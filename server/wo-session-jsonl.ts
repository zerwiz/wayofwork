/**
 * Way of Work web chat JSONL under the workspace `agent/sessions/` tree.
 *
 * Files: `wo-chat-<sessionKey>.jsonl`
 */

import { appendFile, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ChatMessage } from "./chat";
import { getWorkspaceRoot } from "./paths";

const WO_PREFIX = "wo-chat-";
const MAX_LINE_CHARS = 1_000_000;
const MAX_FILE_BYTES = 12 * 1024 * 1024;

/** Allowlist tab ids from the client (`t-<time>-<rand>`). */
export function sanitizeSessionKey(raw: string): string {
	const t = raw.trim().slice(0, 200).replace(/[^a-zA-Z0-9._-]/g, "_");
	return t.length > 0 ? t : "session";
}

export function agentSessionsDir(): string {
	return join(getWorkspaceRoot(), "agent", "sessions");
}

export function channelSessionsDir(channel: string): string {
	return join(agentSessionsDir(), "channel", channel);
}

export function woSessionBasename(sessionKey: string, surface?: string): string {
	const prefix = surface ? `${WO_PREFIX}${surface}-` : WO_PREFIX;
	return `${prefix}${sanitizeSessionKey(sessionKey)}.jsonl`;
}

export function woSessionAbsPath(sessionKey: string, surface?: string): string {
	if (sessionKey.startsWith("channel-")) {
		const parts = sessionKey.split("-"); // channel-telegram-12345
		if (parts.length >= 3) {
			const channel = parts[1];
			const userId = parts.slice(2).join("-");
			return join(channelSessionsDir(channel), `${userId}.jsonl`);
		}
	}
	return join(agentSessionsDir(), woSessionBasename(sessionKey, surface));
}

export async function ensureAgentSessionsDir(sessionKey?: string): Promise<void> {
	if (sessionKey?.startsWith("channel-")) {
		const parts = sessionKey.split("-");
		if (parts.length >= 3) {
			await mkdir(channelSessionsDir(parts[1]), { recursive: true });
			return;
		}
	}
	await mkdir(agentSessionsDir(), { recursive: true });
}

export type WoSessionHeader = {
	type: "session";
	kind: "wo-web";
	id: string;
	workspace: string;
	createdAt: string;
	engine: "wo-bun-chat";
};

export type WoMessageLine = {
	type: "message";
	message: {
		role: "user" | "assistant";
		content: string;
		createdAt: string;
	};
};

function trimContent(s: string): string {
	if (s.length <= MAX_LINE_CHARS) return s;
	return `${s.slice(0, MAX_LINE_CHARS - 20)}\n…[truncated]`;
}

/** Read **user** / **assistant** turns in order. */
export async function loadWoSessionMessages(sessionKey: string, surface?: string): Promise<ChatMessage[]> {
	const abs = woSessionAbsPath(sessionKey, surface);
	try {
		const st = await stat(abs);
		if (!st.isFile() || st.size > MAX_FILE_BYTES) return [];
		const text = await readFile(abs, "utf8");
		const out: ChatMessage[] = [];
		for (const line of text.split("\n")) {
			const t = line.trim();
			if (!t) continue;
			try {
				const row = JSON.parse(t) as { type?: string; message?: { role?: string; content?: unknown } };
				if (row.type !== "message" || !row.message) continue;
				const role = row.message.role;
				const content = String(row.message.content ?? "");
				if (role === "user" || role === "assistant") {
					out.push({ role, content });
				}
			} catch {
				/* skip bad line */
			}
		}
		return out;
	} catch {
		return [];
	}
}

/** Rewrite JSONL from the in-memory branch (user + assistant only). */
export async function syncWoSessionFile(
	sessionKey: string,
	messages: ChatMessage[],
	surface?: string,
): Promise<void> {
	const key = sanitizeSessionKey(sessionKey);
	const userAsst: Array<{ role: "user" | "assistant"; content: string }> = [];
	for (const m of messages) {
		if (m.role === "user") {
			userAsst.push({ role: "user", content: String(m.content ?? "") });
		} else if (m.role === "assistant" && String(m.content ?? "").trim().length > 0) {
			userAsst.push({ role: "assistant", content: String(m.content ?? "") });
		}
	}
	const header: WoSessionHeader = {
		type: "session",
		kind: "wo-web",
		id: key,
		workspace: getWorkspaceRoot(),
		createdAt: new Date().toISOString(),
		engine: "wo-bun-chat",
	};
	const lines: string[] = [JSON.stringify(header)];
	for (const m of userAsst) {
		const row: WoMessageLine = {
			type: "message",
			message: {
				role: m.role,
				content: trimContent(String(m.content ?? "")),
				createdAt: new Date().toISOString(),
			},
		};
		lines.push(JSON.stringify(row));
	}
	await ensureAgentSessionsDir(key);
	const abs = woSessionAbsPath(key, surface);
	const tmp = `${abs}.tmp`;
	const body = `${lines.join("\n")}\n`;
	await writeFile(tmp, body, "utf8");
	await rename(tmp, abs);
}

async function ensureSessionHeaderExists(sessionKey: string, surface?: string): Promise<void> {
	const abs = woSessionAbsPath(sessionKey, surface);
	if (!existsSync(abs)) {
		const key = sanitizeSessionKey(sessionKey);
		const header: WoSessionHeader = {
			type: "session",
			kind: "wo-web",
			id: key,
			workspace: getWorkspaceRoot(),
			createdAt: new Date().toISOString(),
			engine: "wo-bun-chat",
		};
		await ensureAgentSessionsDir(key);
		await writeFile(abs, `${JSON.stringify(header)}\n`, "utf8");
	}
}

/** Append one **message** line (after ensuring a **session** header exists). */
export async function appendWoSessionMessage(
	sessionKey: string,
	role: "user" | "assistant",
	content: string,
	surface?: string,
): Promise<void> {
	const key = sanitizeSessionKey(sessionKey);
	await ensureSessionHeaderExists(key, surface);
	const abs = woSessionAbsPath(key, surface);
	const row: WoMessageLine = {
		type: "message",
		message: {
			role,
			content: trimContent(content),
			createdAt: new Date().toISOString(),
		},
	};
	await appendFile(abs, `${JSON.stringify(row)}\n`, "utf8");
}
