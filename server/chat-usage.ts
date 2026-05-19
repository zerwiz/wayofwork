/**
 * Model context heuristics + SSE usage normalization (Pi footer style — see `extensions/footer-context-stats.ts`).
 */

function num(v: unknown): number | undefined {
	return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** Optional override: exact context window in tokens for the active model (e.g. `131072`). */
export function resolveContextWindowFromEnv(): number | null {
	const raw = process.env.WOP_MODEL_CONTEXT_TOKENS?.trim();
	if (!raw || !/^\d+$/.test(raw)) return null;
	const n = parseInt(raw, 10);
	return n > 0 ? n : null;
}

/**
 * Best-effort context length for `% used` (Pi `getContextUsage`-style bar).
 * Prefer `WOP_MODEL_CONTEXT_TOKENS`; else heuristics from model id.
 */
export function estimateContextWindowTokens(modelId: string): number | null {
	const fromEnv = resolveContextWindowFromEnv();
	if (fromEnv != null) return fromEnv;
	const m = modelId.trim().toLowerCase();
	if (!m) return null;
	if (m.includes("128k") || m.includes("131072") || m.includes("gpt-4o") || m.includes("claude-3-opus"))
		return 128_000;
	if (m.includes("200k") || m.includes("claude-3-5") || m.includes("claude-3.5")) return 200_000;
	if (m.includes("32k") || m.includes("32768")) return 32_768;
	if (m.includes("100k") || m.includes("100000")) return 100_000;
	if (m.includes("qwen3") || m.includes("qwen2.5") || m.includes("mistral") || m.includes("mixtral"))
		return 32_768;
	if (m.includes("llama3.2") || m.includes("llama3.1") || m.includes("gemma")) return 8192;
	if (m.includes("llama3") || m.includes("70b")) return 8192;
	if (m.includes("8k") || m.includes("8192")) return 8192;
	if (m.includes("openrouter")) return 128_000;
	return 32_768;
}

export type StreamTokenUsage = {
	promptTokens: number;
	completionTokens: number;
};

function usageFromRecord(ur: Record<string, unknown>): StreamTokenUsage | null {
	const prompt =
		num(ur.prompt_tokens) ?? num(ur.prompt_eval_count) ?? num(ur.input_tokens);
	const completion =
		num(ur.completion_tokens) ?? num(ur.eval_count) ?? num(ur.output_tokens) ?? 0;
	const total = num(ur.total_tokens);
	let pt = prompt !== undefined ? Math.max(0, Math.floor(prompt)) : 0;
	let ct = Math.max(0, Math.floor(completion));
	if (pt <= 0 && ct <= 0 && total != null && total > 0) {
		ct = Math.max(0, Math.floor(total));
	}
	if (pt <= 0 && ct <= 0) return null;
	return { promptTokens: pt, completionTokens: ct };
}

/**
 * Pi-style rough token count when the provider omits stream `usage` (e.g. older Ollama without `stream_options`).
 * Uses ~4 characters per token on UTF-16 length (same order of magnitude as Pi footer hints).
 */
export function approximateStreamUsageFromMessages(
	promptMessages: ReadonlyArray<{
		content?: string | null;
		tool_calls?: ReadonlyArray<{ function: { name: string; arguments: string } }>;
	}>,
	completionText: string,
): StreamTokenUsage {
	let chars = 0;
	for (const m of promptMessages) {
		chars += m.content?.length ?? 0;
		if (m.tool_calls) {
			for (const tc of m.tool_calls) {
				chars += tc.function.name.length + tc.function.arguments.length;
			}
		}
	}
	const promptTokens = Math.max(1, Math.ceil(chars / 4));
	const completionTokens = Math.max(0, Math.ceil((completionText ?? "").length / 4));
	return { promptTokens, completionTokens };
}

/** Normalize OpenAI-style `usage` objects (and a few Ollama variants). */
export function parseStreamUsage(json: unknown): StreamTokenUsage | null {
	if (!json || typeof json !== "object") return null;
	const o = json as Record<string, unknown>;
	const u = o.usage;
	if (u && typeof u === "object") {
		const got = usageFromRecord(u as Record<string, unknown>);
		if (got) return got;
	}
	/* Some gateways put token fields on the SSE root object. */
	if (
		num(o.prompt_tokens) != null ||
		num(o.completion_tokens) != null ||
		num(o.total_tokens) != null ||
		num(o.prompt_eval_count) != null ||
		num(o.eval_count) != null
	) {
		return usageFromRecord(o);
	}
	return null;
}
