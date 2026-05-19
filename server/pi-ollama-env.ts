/**
 * Resolve Ollama host + default chat model the same way Pi in this playground is typically run:
 * repo **`.env`** uses **`OLLAMA_BASE_URL`** + **`OLLAMA_MODEL`** (see **`scripts/pi-with-env`**);
 * Pi session defaults also live in **`agent/settings.json`** (`defaultProvider`, `defaultModel`).
 *
 * Way of Pi historically used **`OLLAMA_HOST`** only — we merge both shapes here.
 *
 * **Workspace-only:** default model from JSON is read only under **`listWorkspaceFolders()`** (the
 * folder(s) Way of Pi is working in — `WOP_WORKSPACE` / cwd), never from the playground repo root.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { listWorkspaceFolders } from "./workspace-state";

/**
 * Absolute path to this **Way of Pi** web-server package on disk: the directory that contains
 * **`apps/wayofwork-ui`** (resolved to the monorepo / checkout root with `wop.upstream.lock.json`, etc.).
 *
 * Use only for **install / upstream / self-check** paths. **Never** treat as the user’s opened
 * project — project roots come from **`listWorkspaceFolders()`** / **`WOP_WORKSPACE`** / Open Folder
 * (see **`workspace-state.ts`**).
 */
export function getWayOfPiBundleRepoRoot(): string {
	return join(import.meta.dir, "..", "..");
}

/** @deprecated Prefer {@link getWayOfPiBundleRepoRoot} — same path; old name referred to “playground” checkout. */
export function getPlaygroundRepoRoot(): string {
	return getWayOfPiBundleRepoRoot();
}

/** Strip trailing `/` and trailing OpenAI-style **`/v1`** so Ollama REST roots match **`fetchOllamaTags`**. */
export function normalizePiOllamaBaseUrlToHost(raw: string): string {
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
		if ((j.defaultProvider || "ollama").toLowerCase() !== "ollama") return null;
		const m = j.defaultModel?.trim();
		return m || null;
	} catch {
		return null;
	}
}

/** Prefer **`OLLAMA_HOST`**, else Pi-style **`OLLAMA_BASE_URL`** from repo `.env`. */
export function resolveOllamaHost(): string {
	const host = process.env.OLLAMA_HOST?.trim();
	if (host) return host.replace(/\/$/, "");
	const base = process.env.OLLAMA_BASE_URL?.trim();
	if (base) return normalizePiOllamaBaseUrlToHost(base);
	return "http://127.0.0.1:11434";
}

/**
 * Prefer **`OLLAMA_MODEL`**, else first **`agent/settings.json`** (Ollama `defaultModel`) under any
 * configured workspace folder (primary first), else **`llama3`**.
 */
export function resolveOllamaModelDefault(tenantId: string = "default"): string {
	const env = process.env.OLLAMA_MODEL?.trim();
	if (env) return env;
	for (const { path: root } of listWorkspaceFolders(tenantId)) {
		const m = tryReadAgentSettingsDefaultModel(root);
		if (m) return m;
	}
	return "llama3";
}
