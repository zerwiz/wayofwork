/**
 * Way of Pi web chat → **Pi-shaped JSONL** under the workspace `agent/sessions/` tree
 * (same area as Pi’s session logs — see **docs/AGENT_MEMORY.md**).
 *
 * Files: `wayofpi-chat-<sessionKey>.jsonl` so they are distinct from native Pi session names.
 */

import { appendFile, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ChatMessage } from "./chat";
import { getWorkspaceRoot } from "./paths";

const WOP_PREFIX = "wayofpi-chat-";
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

export function wayofpiSessionBasename(sessionKey: string): string {
	return `${WOP_PREFIX}${sanitizeSessionKey(sessionKey)}.jsonl`;
}

export function wayofpiSessionAbsPath(sessionKey: string): string {
	return join(agentSessionsDir(), wayofpiSessionBasename(sessionKey));
}

export async function ensureAgentSessionsDir(): Promise<void> {
	await mkdir(agentSessionsDir(), { recursive: true });
}

export type WopSessionHeader = {
	type: "session";
	kind: "wayofpi-web";
	id: string;
	workspace: string;
	createdAt: string;
	engine: "wayofpi-bun-chat";
};

export type WopMessageLine = {
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

/** Read **user** / **assistant** turns in order (Pi-style `type: message` lines). */
export async function loadWayofpiSessionMessages(sessionKey: string): Promise<ChatMessage[]> {
	const abs = wayofpiSessionAbsPath(sessionKey);
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
export async function syncWayofpiSessionFile(sessionKey: string, messages: ChatMessage[]): Promise<void> {
	const key = sanitizeSessionKey(sessionKey);
	const userAsst: Array<{ role: "user" | "assistant"; content: string }> = [];
	for (const m of messages) {
		if (m.role === "user") {
			userAsst.push({ role: "user", content: String(m.content ?? "") });
		} else if (m.role === "assistant" && String(m.content ?? "").trim().length > 0) {
			userAsst.push({ role: "assistant", content: String(m.content ?? "") });
		}
	}
	const header: WopSessionHeader = {
		type: "session",
		kind: "wayofpi-web",
		id: key,
		workspace: getWorkspaceRoot(),
		createdAt: new Date().toISOString(),
		engine: "wayofpi-bun-chat",
	};
	const lines: string[] = [JSON.stringify(header)];
	for (const m of userAsst) {
		const row: WopMessageLine = {
			type: "message",
			message: {
				role: m.role,
				content: trimContent(String(m.content ?? "")),
				createdAt: new Date().toISOString(),
			},
		};
		lines.push(JSON.stringify(row));
	}
	await ensureAgentSessionsDir();
	const abs = wayofpiSessionAbsPath(key);
	const tmp = `${abs}.tmp`;
	const body = `${lines.join("\n")}\n`;
	await writeFile(tmp, body, "utf8");
	await rename(tmp, abs);
}

async function ensureSessionHeaderExists(sessionKey: string): Promise<void> {
	const abs = wayofpiSessionAbsPath(sessionKey);
	try {
		await stat(abs);
	} catch {
		const key = sanitizeSessionKey(sessionKey);
		const header: WopSessionHeader = {
			type: "session",
			kind: "wayofpi-web",
			id: key,
			workspace: getWorkspaceRoot(),
			createdAt: new Date().toISOString(),
			engine: "wayofpi-bun-chat",
		};
		await ensureAgentSessionsDir();
		await writeFile(abs, `${JSON.stringify(header)}\n`, "utf8");
	}
}

/** Append one **message** line (after ensuring a **session** header exists). */
export async function appendWayofpiSessionMessage(
	sessionKey: string,
	role: "user" | "assistant",
	content: string,
): Promise<void> {
	const key = sanitizeSessionKey(sessionKey);
	await ensureSessionHeaderExists(key);
	const abs = wayofpiSessionAbsPath(key);
	const row: WopMessageLine = {
		type: "message",
		message: {
			role,
			content: trimContent(content),
			createdAt: new Date().toISOString(),
		},
	};
	await appendFile(abs, `${JSON.stringify(row)}\n`, "utf8");
}
