/**
 * Resolve Way of Work AI (Wo AI) host + default chat model.
 *
 * Support for both local (Ollama-style) and remote providers.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { listWorkspaceFolders } from "./workspace-state";

/**
 * Absolute path to this **Way of Work** web-server package on disk.
 */
export function getWoBundleRepoRoot(): string {
	return join(import.meta.dir, "..", "..");
}

/** Strip trailing `/` and trailing OpenAI-style **`/v1`** so roots match tag fetching. */
export function normalizeWoAiBaseUrlToHost(raw: string): string {
	let u = raw.trim().replace(/\/+$/, "");
	if (u.endsWith("/v1")) u = u.slice(0, -3).replace(/\/+$/, "");
	return u || "http://127.0.0.1:11434";
}

function tryReadAgentSettingsDefaultModel(agentDirRoot: string): string | null {
	const p = join(agentDirRoot, "agent", "settings.json");
	if (!existsSync(p)) return null;
	try {
		const j = JSON.parse(readFileSync(p, "utf8")) as {
			defaultModel?: string;
			defaultProvider?: string;
		};
		if ((j.defaultProvider || "wo-ai").toLowerCase() !== "wo-ai" && 
		    (j.defaultProvider || "wo-ai").toLowerCase() !== "ollama") return null;
		const m = j.defaultModel?.trim();
		return m || null;
	} catch {
		return null;
	}
}

/** Prefer **`WOP_AI_HOST`**, then **`OLLAMA_HOST`**, else default. */
export function resolveWoAiHost(): string {
	const host = (process.env.WOP_AI_HOST || process.env.OLLAMA_HOST)?.trim();
	if (host) return host.replace(/\/$/, "");
	const base = process.env.WOP_AI_BASE_URL?.trim();
	if (base) return normalizeWoAiBaseUrlToHost(base);
	return "http://127.0.0.1:11434";
}

/**
 * Prefer **`WOP_AI_MODEL`**, then **`OLLAMA_MODEL`**, then **tenant_configs.llm_model**,
 * else **`agent/settings.json`**, else **`qwen3.5:9b`**.
 */
export function resolveWoAiModelDefault(tenantId: string = "default"): string {
	const env = (process.env.WOP_AI_MODEL || process.env.OLLAMA_MODEL)?.trim();
	if (env) return env;
	if (tenantId && tenantId !== "default") {
		try {
			const { db } = require("./db") as { db: import("bun:sqlite").Database };
			const row = db.query("SELECT config_value FROM tenant_configs WHERE tenant_id = ? AND config_key = ?").get(tenantId, "llm_model") as { config_value: string } | undefined;
			if (row?.config_value?.trim()) return row.config_value.trim();
		} catch { /* fall through */ }
	}
	for (const { path: root } of listWorkspaceFolders(tenantId)) {
		const m = tryReadAgentSettingsDefaultModel(root);
		if (m) return m;
	}
	return "qwen3.5:9b";
}

/**
 * Resolve per-tenant LLM provider. Falls back to env var, then `tenant_configs`, then `"ollama"`.
 */
export function resolveWoAiProvider(tenantId: string = "default"): string {
	const env = (process.env.WOP_LLM_PROVIDER || process.env.LLM_PROVIDER)?.trim();
	if (env) return env;
	if (tenantId && tenantId !== "default") {
		try {
			const { db } = require("./db") as { db: import("bun:sqlite").Database };
			const row = db.query("SELECT config_value FROM tenant_configs WHERE tenant_id = ? AND config_key = ?").get(tenantId, "llm_provider") as { config_value: string } | undefined;
			if (row?.config_value?.trim()) return row.config_value.trim();
		} catch { /* fall through */ }
	}
	return "ollama";
}

/** Settings → Restart server: allowed when unset in dev (`NODE_ENV !== "production"`). Production requires explicit `1`/`true`/`yes`/`on`. Disable in dev with `0`/`false`/`no`/`off`. */
export function isWopServerRestartHttpAllowed(): boolean {
	const raw = process.env.WOP_ALLOW_SERVER_RESTART?.trim() ?? "";
	if (raw === "") {
		return process.env.NODE_ENV !== "production";
	}
	const v = raw.toLowerCase();
	if (v === "0" || v === "false" || v === "no" || v === "off") return false;
	return v === "1" || v === "true" || v === "yes" || v === "on";
}
