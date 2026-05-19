import { parseStreamUsage, type StreamTokenUsage } from "./chat-usage";
import { resolveOllamaHost, resolveOllamaModelDefault } from "./pi-ollama-env";

export type ChatRole = "system" | "user" | "assistant" | "tool";

/** OpenAI-style tool call attached to an assistant message (orchestrator tool loop only). */
export type ChatAssistantToolCall = {
	id: string;
	type: "function";
	function: { name: string; arguments: string };
};

export interface ChatMessage {
	role: ChatRole;
	/** Plain text; may be empty or null when assistant message only contains `tool_calls`. */
	content: string | null;
	tool_calls?: ChatAssistantToolCall[];
	tool_call_id?: string;
	name?: string;
}

function nowTime(): string {
	return new Date().toISOString().split("T")[1]?.slice(0, 12) ?? "";
}

/** Turn JSON error bodies (Ollama / OpenRouter) into a single readable line. */
export function formatLlmHttpError(vendor: string, status: number, body: string): string {
	const slice = body.slice(0, 800).trim();
	try {
		const j = JSON.parse(slice) as {
			error?: string | { message?: string; type?: string; code?: string };
			message?: string;
		};
		if (typeof j.error === "string") {
			return `${vendor} ${status}: ${j.error}`;
		}
		if (j.error && typeof j.error === "object") {
			const m = j.error.message;
			const t = j.error.type;
			if (m) {
				const tag = t ? ` (${t})` : "";
				return `${vendor} ${status}${tag}: ${m}`;
			}
		}
		if (typeof j.message === "string" && j.message) {
			return `${vendor} ${status}: ${j.message}`;
		}
	} catch {
		/* not JSON */
	}
	return `${vendor} ${status}: ${slice}`;
}

export function ollamaErrorHint(status: number, detail: string, model: string): string {
	if (status !== 404) return detail;
	const lower = detail.toLowerCase();
	if (!lower.includes("not found") && !lower.includes("model")) return detail;
	return `${detail} — Hint: run ollama pull ${model} or set OLLAMA_MODEL / the header model to an id from ollama list (many installs use tags like qwen3.5:9b, not qwen3.5:latest).`;
}

export interface ChatRuntimeModel {
	ollamaHost?: string;
	ollamaModel?: string;
	openrouterModel?: string;
}

export type StreamChatResult = { ok: true } | { ok: false; error: string } | { ok: false; aborted: true };

/** Extract incremental reasoning / “thinking” text from an OpenAI-style stream `choices[0].delta` (OpenRouter, o-series, etc.). */
export function streamingReasoningPiece(delta: unknown): string {
	if (!delta || typeof delta !== "object") return "";
	const d = delta as Record<string, unknown>;
	const r = d.reasoning;
	if (typeof r === "string" && r.length > 0) return r;
	const rc = d.reasoning_content;
	if (typeof rc === "string" && rc.length > 0) return rc;
	const details = d.reasoning_details;
	if (!Array.isArray(details)) return "";
	let out = "";
	for (const item of details) {
		if (!item || typeof item !== "object") continue;
		const o = item as Record<string, unknown>;
		const typ = String(o.type ?? "");
		if (typ === "reasoning.text" || typ === "reasoning_text") {
			const t = o.text;
			if (typeof t === "string") out += t;
		}
	}
	return out;
}

/** Serialize in-memory chat to OpenAI Chat Completions `messages` (supports tool turns). */
export function messagesToOpenAIFormat(messages: ChatMessage[]): unknown[] {
	const out: unknown[] = [];
	for (const m of messages) {
		if (m.role === "system" || m.role === "user") {
			out.push({ role: m.role, content: m.content ?? "" });
			continue;
		}
		if (m.role === "tool") {
			out.push({
				role: "tool",
				tool_call_id: m.tool_call_id ?? "",
				content: m.content ?? "",
			});
			continue;
		}
		if (m.role === "assistant") {
			if (m.tool_calls && m.tool_calls.length > 0) {
				const row: Record<string, unknown> = {
					role: "assistant",
					tool_calls: m.tool_calls,
				};
				const c = m.content;
				if (c != null && String(c).length > 0) row.content = c;
				else row.content = null;
				out.push(row);
			} else {
				out.push({ role: "assistant", content: m.content ?? "" });
			}
		}
	}
	return out;
}

export async function streamChatCompletion(
	messages: ChatMessage[],
	onDelta: (text: string) => void,
	onLog: (level: "INFO" | "WARN" | "ERROR", source: string, msg: string) => void,
	runtime?: ChatRuntimeModel,
	options?: {
		signal?: AbortSignal;
		onStreamUsage?: (u: StreamTokenUsage) => void;
		onReasoningDelta?: (text: string) => void;
	},
): Promise<StreamChatResult> {
	const signal = options?.signal;
	const provider = (process.env.WOP_LLM_PROVIDER || "ollama").toLowerCase();
	onLog("INFO", "chat", `Provider: ${provider}`);

	if (provider === "openrouter") {
		const key = process.env.OPENROUTER_API_KEY?.trim();
		const model =
			runtime?.openrouterModel?.trim() || process.env.OPENROUTER_MODEL?.trim() || "openrouter/auto";
		if (!key) return { ok: false, error: "OPENROUTER_API_KEY is not set" };
		onLog("INFO", "openrouter", `Model: ${model}`);
		let res: Response;
		try {
			res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${key}`,
					"Content-Type": "application/json",
					"HTTP-Referer": process.env.WOP_OPENROUTER_REFERER || "https://wayofpi.local",
					"X-Title": "Way of Pi",
				},
				body: JSON.stringify({
					model,
					messages: messagesToOpenAIFormat(messages),
					stream: true,
					stream_options: { include_usage: true },
				}),
				signal,
			});
		} catch (e) {
			if (signal?.aborted || (e instanceof Error && e.name === "AbortError")) {
				return { ok: false, aborted: true };
			}
			const message = e instanceof Error ? e.message : String(e);
			return { ok: false, error: message };
		}
		if (!res.ok) {
			const t = await res.text();
			return { ok: false, error: formatLlmHttpError("OpenRouter", res.status, t) };
		}
		try {
			await parseOpenAIStyleSse(res, onDelta, onLog, {
				signal,
				onStreamUsage: options?.onStreamUsage,
				onReasoningDelta: options?.onReasoningDelta,
			});
		} catch (e) {
			if (signal?.aborted || (e instanceof Error && e.name === "AbortError")) {
				return { ok: false, aborted: true };
			}
			throw e;
		}
		return { ok: true };
	}

	if (provider !== "ollama") {
		return {
			ok: false,
			error: `WOP_LLM_PROVIDER="${provider}" is not supported by Way of Pi web chat. Set it to "ollama" or "openrouter" on the server, or use Pi TUI for other backends.`,
		};
	}

	/* ollama OpenAI-compatible — host/model defaults align with Pi `.env` + `agent/settings.json` (see pi-ollama-env). */
	const host = (runtime?.ollamaHost || resolveOllamaHost()).replace(/\/$/, "");
	const model = runtime?.ollamaModel?.trim() || resolveOllamaModelDefault();
	onLog("INFO", "ollama", `${host} model=${model}`);
	const url = `${host}/v1/chat/completions`;
	const apiMessages = messagesToOpenAIFormat(messages);
	const payloadWithUsage = {
		model,
		messages: apiMessages,
		stream: true,
		stream_options: { include_usage: true },
	};
	const payloadBasic = { model, messages: apiMessages, stream: true };
	let res: Response;
	try {
		res = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payloadWithUsage),
			signal,
		});
		if (!res.ok && res.status === 400) {
			const t400 = await res.text();
			const low = t400.toLowerCase();
			if (low.includes("stream_options") || low.includes("unexpected field") || low.includes("unknown field")) {
				onLog(
					"WARN",
					"ollama",
					"Retrying chat without stream_options (older Ollama — ctx/tokens use a Pi-style ~characters÷4 estimate).",
				);
				res = await fetch(url, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payloadBasic),
					signal,
				});
			} else {
				const detail = formatLlmHttpError("Ollama", res.status, t400);
				return { ok: false, error: ollamaErrorHint(res.status, detail, model) };
			}
		}
	} catch (e) {
		if (signal?.aborted || (e instanceof Error && e.name === "AbortError")) {
			return { ok: false, aborted: true };
		}
		const message = e instanceof Error ? e.message : String(e);
		return { ok: false, error: message };
	}
	if (!res.ok) {
		const t = await res.text();
		const detail = formatLlmHttpError("Ollama", res.status, t);
		return { ok: false, error: ollamaErrorHint(res.status, detail, model) };
	}
	try {
		await parseOpenAIStyleSse(res, onDelta, onLog, {
			signal,
			onStreamUsage: options?.onStreamUsage,
			onReasoningDelta: options?.onReasoningDelta,
		});
	} catch (e) {
		if (signal?.aborted || (e instanceof Error && e.name === "AbortError")) {
			return { ok: false, aborted: true };
		}
		throw e;
	}
	return { ok: true };
}

async function parseOpenAIStyleSse(
	res: Response,
	onDelta: (t: string) => void,
	onLog: (level: "INFO" | "WARN" | "ERROR", source: string, msg: string) => void,
	opts?: {
		signal?: AbortSignal;
		onStreamUsage?: (u: StreamTokenUsage) => void;
		onReasoningDelta?: (text: string) => void;
	},
): Promise<void> {
	const signal = opts?.signal;
	const onStreamUsage = opts?.onStreamUsage;
	const onReasoningDelta = opts?.onReasoningDelta;
	const reader = res.body?.getReader();
	if (!reader) throw new Error("No response body");
	const dec = new TextDecoder();
	let buf = "";
	for (;;) {
		if (signal?.aborted) {
			try {
				await reader.cancel();
			} catch {
				/* ignore */
			}
			throw new DOMException("Aborted", "AbortError");
		}
		const { done, value } = await reader.read();
		if (done) break;
		buf += dec.decode(value, { stream: true });
		const lines = buf.split("\n");
		buf = lines.pop() || "";
		for (const line of lines) {
			const s = line.trim();
			if (!s.startsWith("data:")) continue;
			const data = s.slice(5).trim();
			if (data === "[DONE]") return;
			try {
				const json = JSON.parse(data) as {
					choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>;
				};
				const delta = json.choices?.[0]?.delta;
				const piece = delta?.content;
				if (piece) onDelta(piece);
				const think = streamingReasoningPiece(delta);
				if (think) onReasoningDelta?.(think);
				const u = parseStreamUsage(json);
				if (u) onStreamUsage?.(u);
			} catch {
				onLog("WARN", "sse", `Bad chunk at ${nowTime()}`);
			}
		}
	}
}
