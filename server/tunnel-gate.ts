/**
 * Optional HTTP Basic Auth when the browser `Host` (or `X-Forwarded-Host` from Vite’s proxy)
 * looks like a public tunnel hostname (e.g. ngrok). Credentials live under **`WOP_HOME`** so the
 * Vite dev server (Node) and the Bun API can read the same file.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import type { IncomingMessage, ServerResponse } from "node:http";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const FILE_NAME = "tunnel-gate.v1.json";
const SCRYPT_N = 16384;
const SCRYPT_r = 8;
const SCRYPT_p = 1;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

export type TunnelGateFileV1 = {
	version: 1;
	enabled: boolean;
	username: string;
	/** `wop-scrypt:v1:<saltHex>:<keyHex>` */
	passwordHash: string;
};

export function getWopHomeDir(): string {
	const e = process.env.WOP_HOME?.trim();
	if (e) return e.replace(/^~(?=\/|\\)/, homedir());
	return join(homedir(), ".wayofpi");
}

export function tunnelGateConfigPath(): string {
	return join(getWopHomeDir(), FILE_NAME);
}

let cache: { mtimeMs: number; parsed: TunnelGateFileV1 | null } | null = null;

export function invalidateTunnelGateCache(): void {
	cache = null;
}

function readGateFileRaw(): TunnelGateFileV1 | null {
	const path = tunnelGateConfigPath();
	if (!existsSync(path)) return null;
	try {
		const st = readFileSync(path);
		const j = JSON.parse(st.toString("utf8")) as TunnelGateFileV1;
		if (j?.version !== 1 || typeof j.enabled !== "boolean") return null;
		if (typeof j.username !== "string" || typeof j.passwordHash !== "string") return null;
		return j;
	} catch {
		return null;
	}
}

export function readTunnelGateCached(): TunnelGateFileV1 | null {
	const path = tunnelGateConfigPath();
	if (!existsSync(path)) {
		cache = null;
		return null;
	}
	try {
		const { mtimeMs } = statSync(path);
		if (cache && cache.mtimeMs === mtimeMs) return cache.parsed;
		const parsed = readGateFileRaw();
		cache = { mtimeMs, parsed };
		return parsed;
	} catch {
		return readGateFileRaw();
	}
}

/** Prefer forwarded host (set by Vite proxy) so Bun sees the public hostname despite `changeOrigin`. */
export function effectiveTunnelHost(hostHeader: string, forwardedHostHeader: string | null): string {
	const xf = forwardedHostHeader?.trim();
	if (xf) {
		const first = xf.split(",")[0]?.trim();
		if (first) return stripPort(first);
	}
	return stripPort(hostHeader.trim());
}

export function stripPort(host: string): string {
	const h = host.trim();
	if (!h) return "";
	if (h.startsWith("[")) {
		const end = h.indexOf("]");
		if (end > 1) return h.slice(0, end + 1).toLowerCase();
	}
	const colon = h.lastIndexOf(":");
	if (colon > 0 && !h.slice(0, colon).includes("]")) {
		const left = h.slice(0, colon);
		if (!left.includes(":")) return left.toLowerCase();
	}
	return h.toLowerCase();
}

function loopbackHostname(hostname: string): boolean {
	const h = hostname.replace(/^\[|\]$/g, "").toLowerCase();
	return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "0:0:0:0:0:0:0:1";
}

/**
 * True when the request appears to use a public tunnel URL (not loopback / bare LAN is **not** matched).
 */
export function hostLooksLikePublicTunnel(hostname: string): boolean {
	const h = stripPort(hostname);
	if (!h || loopbackHostname(h)) return false;
	if (h.includes("ngrok")) return true;
	const raw = process.env.WOP_TUNNEL_GATE_HOST_MARKERS?.trim();
	if (!raw) return false;
	for (const part of raw.split(",")) {
		const m = part.trim().toLowerCase();
		if (m && h.includes(m)) return true;
	}
	return false;
}

export function hashGatePassword(plain: string): string {
	const salt = randomBytes(SALT_BYTES);
	const key = scryptSync(plain, salt, KEY_BYTES, { N: SCRYPT_N, r: SCRYPT_r, p: SCRYPT_p, maxmem: 64 * 1024 * 1024 });
	return `wop-scrypt:v1:${salt.toString("hex")}:${key.toString("hex")}`;
}

export function verifyGatePassword(plain: string, stored: string): boolean {
	if (!stored.startsWith("wop-scrypt:v1:")) return false;
	const rest = stored.slice("wop-scrypt:v1:".length);
	const idx = rest.indexOf(":");
	if (idx < 1) return false;
	const saltHex = rest.slice(0, idx);
	const keyHex = rest.slice(idx + 1);
	if (saltHex.length % 2 !== 0 || keyHex.length % 2 !== 0) return false;
	let salt: Buffer;
	let want: Buffer;
	try {
		salt = Buffer.from(saltHex, "hex");
		want = Buffer.from(keyHex, "hex");
	} catch {
		return false;
	}
	if (salt.length !== SALT_BYTES || want.length !== KEY_BYTES) return false;
	let derived: Buffer;
	try {
		derived = scryptSync(plain, salt, KEY_BYTES, { N: SCRYPT_N, r: SCRYPT_r, p: SCRYPT_p, maxmem: 64 * 1024 * 1024 });
	} catch {
		return false;
	}
	try {
		return timingSafeEqual(derived, want);
	} catch {
		return false;
	}
}

export function parseBasicAuthHeader(authorization: string | null | undefined): { user: string; pass: string } | null {
	if (!authorization) return null;
	const h = authorization.trim();
	if (!h.toLowerCase().startsWith("basic ")) return null;
	const b64 = h.slice(6).trim();
	let dec: string;
	try {
		dec = Buffer.from(b64, "base64").toString("utf8");
	} catch {
		return null;
	}
	const idx = dec.indexOf(":");
	if (idx < 0) return null;
	return { user: dec.slice(0, idx), pass: dec.slice(idx + 1) };
}

export type TunnelGateHeaderInput = {
	method: string;
	host: string;
	forwardedHost: string | null | undefined;
	authorization: string | null | undefined;
};

/** `true` = allow request through without extra auth. */
export function tunnelGateAllowsRequest(input: TunnelGateHeaderInput): boolean {
	const m = (input.method || "GET").toUpperCase();
	if (m === "OPTIONS") return true;
	const eff = effectiveTunnelHost(input.host, input.forwardedHost ?? null);
	if (!hostLooksLikePublicTunnel(eff)) return true;
	const cfg = readTunnelGateCached();
	if (!cfg?.enabled) return true;
	const u = cfg.username?.trim();
	const hash = cfg.passwordHash?.trim();
	if (!u || !hash) return false;
	const auth = parseBasicAuthHeader(input.authorization);
	if (!auth) return false;
	if (auth.user !== u) return false;
	return verifyGatePassword(auth.pass, hash);
}

export function tunnelGateUnauthorizedResponse(): Response {
	return new Response("Unauthorized", {
		status: 401,
		headers: {
			"WWW-Authenticate": 'Basic realm="Way of Pi (public link)"',
			"Cache-Control": "no-store",
			"Content-Type": "text/plain; charset=utf-8",
		},
	});
}

export function getTunnelGateDevStatusJson(): {
	ok: true;
	wopHome: string;
	configPath: string;
	/** Gate is enforcing Basic Auth on tunnel-like hosts. */
	loginEnabled: boolean;
	/** File has a username + password hash (may be disabled). */
	configured: boolean;
	username: string | null;
	publicHostHint: string;
} {
	const path = tunnelGateConfigPath();
	const cfg = readTunnelGateCached();
	const configured = Boolean(cfg?.username?.trim() && cfg?.passwordHash?.trim());
	const loginEnabled = Boolean(cfg?.enabled && configured);
	return {
		ok: true,
		wopHome: getWopHomeDir(),
		configPath: path,
		loginEnabled,
		configured,
		username: cfg?.username?.trim() ? cfg.username.trim() : null,
		publicHostHint:
			"Applies when Host (or X-Forwarded-Host) looks like a tunnel hostname (contains “ngrok”, or WOP_TUNNEL_GATE_HOST_MARKERS). Localhost stays open.",
	};
}

const USER_RE = /^[a-zA-Z0-9._-]{1,64}$/;

export async function applyTunnelGateDevPost(body: Record<string, unknown>): Promise<{ ok: boolean; message: string }> {
	const action = String(body.action ?? "").trim().toLowerCase();
	if (action === "clear") {
		try {
			if (existsSync(tunnelGateConfigPath())) unlinkSync(tunnelGateConfigPath());
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			return { ok: false, message: `Could not remove config: ${msg}` };
		}
		invalidateTunnelGateCache();
		return { ok: true, message: "Tunnel login cleared (file removed)." };
	}
	if (action !== "save") {
		return { ok: false, message: 'Body needs "action": "save" or "clear".' };
	}
	const enabled = body.enabled === true;
	const username = typeof body.username === "string" ? body.username.trim() : "";
	const password = typeof body.password === "string" ? body.password : "";
	if (!USER_RE.test(username)) {
		return {
			ok: false,
			message: "Username must be 1–64 characters: letters, digits, dot, underscore, hyphen.",
		};
	}
	const existing = readGateFileRaw();
	let passwordHash: string;
	if (password.length > 0) {
		if (password.length < 8 || password.length > 256) {
			return { ok: false, message: "Password must be at least 8 characters (max 256)." };
		}
		passwordHash = hashGatePassword(password);
	} else if (existing?.passwordHash) {
		passwordHash = existing.passwordHash;
	} else {
		return { ok: false, message: "Password is required on first save (or after clear)." };
	}
	if (enabled && password.length === 0 && !existing?.passwordHash) {
		return { ok: false, message: "Password is required when enabling tunnel login." };
	}
	if (!enabled) {
		const payload: TunnelGateFileV1 = {
			version: 1,
			enabled: false,
			username,
			passwordHash,
		};
		return writeTunnelGateFile(payload, "Saved with tunnel login off (credentials kept; turn on when you are ready).");
	}
	const payload: TunnelGateFileV1 = {
		version: 1,
		enabled: true,
		username,
		passwordHash,
	};
	return writeTunnelGateFile(payload, "Tunnel login enabled. Open your ngrok URL again — the browser will ask for this username and password.");
}

function writeTunnelGateFile(payload: TunnelGateFileV1, okMessage: string): { ok: boolean; message: string } {
	const path = tunnelGateConfigPath();
	try {
		mkdirSync(dirname(path), { recursive: true });
		const tmp = `${path}.${process.pid}.tmp`;
		writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
		renameSync(tmp, path);
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return { ok: false, message: `Could not write ${path}: ${msg}` };
	}
	invalidateTunnelGateCache();
	return { ok: true, message: okMessage };
}

export function tunnelGateAllowsBunRequest(req: Request): boolean {
	return tunnelGateAllowsRequest({
		method: req.method,
		host: req.headers.get("host") ?? "",
		forwardedHost: req.headers.get("x-forwarded-host"),
		authorization: req.headers.get("authorization"),
	});
}

/** Vite dev server (Node `IncomingMessage`) — same rules as Bun. */
export function tunnelGateAllowsNodeRequest(req: IncomingMessage): boolean {
	const method = req.method ?? "GET";
	const host = String(req.headers.host ?? "");
	const xf = req.headers["x-forwarded-host"];
	const auth = req.headers.authorization;
	return tunnelGateAllowsRequest({
		method,
		host,
		forwardedHost: xf != null ? String(xf) : undefined,
		authorization: auth != null ? String(auth) : undefined,
	});
}

export function tunnelGateWriteUnauthorizedNode(res: ServerResponse): void {
	res.statusCode = 401;
	res.setHeader("WWW-Authenticate", 'Basic realm="Way of Pi (public link)"');
	res.setHeader("Cache-Control", "no-store");
	res.setHeader("Content-Type", "text/plain; charset=utf-8");
	res.end("Unauthorized");
}
