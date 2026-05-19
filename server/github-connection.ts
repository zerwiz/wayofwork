import { existsSync, readFileSync } from "node:fs";
import { chmod, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { safeResolveUnderWorkspace } from "./paths";

/** Workspace-local PAT store (primary root). Add to the repo’s `.gitignore` if you keep the workspace here. */
export const GITHUB_CREDENTIALS_REL = ".wayofpi/github-credentials.json";

export type PersistedGithubCreds = {
	version: 1;
	login: string;
	token: string;
};

function credentialsAbsPath(): string | null {
	return safeResolveUnderWorkspace(GITHUB_CREDENTIALS_REL);
}

export async function readGithubConnectionMeta(): Promise<{ connected: boolean; login: string | null }> {
	const abs = credentialsAbsPath();
	if (!abs || !existsSync(abs)) return { connected: false, login: null };
	try {
		const raw = await readFile(abs, "utf8");
		const j = JSON.parse(raw) as Partial<PersistedGithubCreds>;
		if (j.version !== 1 || typeof j.login !== "string") return { connected: false, login: null };
		return { connected: true, login: j.login };
	} catch {
		return { connected: false, login: null };
	}
}

/** Same as {@link readGithubConnectionMeta} for sync callers (e.g. system prompt compose). */
export function readGithubConnectionMetaSync(): { connected: boolean; login: string | null } {
	const abs = credentialsAbsPath();
	if (!abs || !existsSync(abs)) return { connected: false, login: null };
	try {
		const raw = readFileSync(abs, "utf8");
		const j = JSON.parse(raw) as Partial<PersistedGithubCreds>;
		if (j.version !== 1 || typeof j.login !== "string") return { connected: false, login: null };
		return { connected: true, login: j.login };
	} catch {
		return { connected: false, login: null };
	}
}

/**
 * PAT for server-side git over HTTPS to github.com only. Never exposed via HTTP APIs or logs.
 * Returns null when missing or invalid.
 */
export async function readGithubTokenForGit(): Promise<string | null> {
	const abs = credentialsAbsPath();
	if (!abs || !existsSync(abs)) return null;
	try {
		const raw = await readFile(abs, "utf8");
		const j = JSON.parse(raw) as Partial<PersistedGithubCreds>;
		if (j.version !== 1 || typeof j.token !== "string" || !j.token.trim()) return null;
		return j.token.trim();
	} catch {
		return null;
	}
}

export async function verifyGithubToken(
	token: string,
): Promise<{ ok: true; login: string } | { ok: false; error: string }> {
	const t = token.trim();
	if (!t) return { ok: false, error: "Token is empty." };
	const res = await fetch("https://api.github.com/user", {
		headers: {
			Accept: "application/vnd.github+json",
			Authorization: `Bearer ${t}`,
			"X-GitHub-Api-Version": "2022-11-28",
			"User-Agent": "WayOfPi-UI-Server/1",
		},
	});
	if (!res.ok) {
		const snippet = (await res.text().catch(() => "")).slice(0, 240);
		if (res.status === 401) {
			return { ok: false, error: "GitHub rejected the token (401). Regenerate the PAT and try again." };
		}
		return {
			ok: false,
			error: `GitHub API HTTP ${res.status}${snippet ? ` — ${snippet}` : ""}`,
		};
	}
	const data = (await res.json()) as { login?: string };
	if (typeof data.login !== "string" || !data.login) {
		return { ok: false, error: "GitHub response did not include a login." };
	}
	return { ok: true, login: data.login };
}

export async function saveGithubCredentials(
	token: string,
	login: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
	const abs = credentialsAbsPath();
	if (!abs) return { ok: false, error: "Could not resolve a credentials path inside the workspace." };
	await mkdir(dirname(abs), { recursive: true });
	const payload: PersistedGithubCreds = { version: 1, login, token: token.trim() };
	await writeFile(abs, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
	try {
		await chmod(abs, 0o600);
	} catch {
		/* Windows may not support chmod meaningfully */
	}
	return { ok: true };
}

export async function removeGithubCredentials(): Promise<void> {
	const abs = credentialsAbsPath();
	if (!abs || !existsSync(abs)) return;
	await unlink(abs);
}
