/**
 * Workspace-local secret for **POST /api/claw/inbound** (Claw Phase E).
 * Stored only under the primary workspace `.wayofpi/` (never committed by default).
 */
import { randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { getPrimaryWorkspacePath } from "./workspace-state";

const FILE = "claw-webhook.v1.json";

interface WebhookFile {
	version: 1;
	secret: string;
	createdAt: string;
}

function path(): string {
	return join(getPrimaryWorkspacePath(), ".wayofpi", FILE);
}

async function ensureDir(): Promise<void> {
	await mkdir(dirname(path()), { recursive: true });
}

function envInboundDisabled(): boolean {
	const v = process.env.WOP_CLAW_INBOUND?.trim().toLowerCase();
	return v === "0" || v === "false" || v === "no" || v === "off";
}

/** Secret file exists and inbound route is not disabled by **`WOP_CLAW_INBOUND`**. */
export function clawWebhookInboundEnabled(): boolean {
	if (!clawWebhookConfigured()) return false;
	return !envInboundDisabled();
}

export function clawWebhookConfigured(): boolean {
	return existsSync(path());
}

export async function readWebhookSecret(): Promise<string | null> {
	try {
		const raw = await readFile(path(), "utf8");
		const j = JSON.parse(raw) as Partial<WebhookFile>;
		if (j?.version !== 1 || typeof j.secret !== "string" || !j.secret.trim()) return null;
		return j.secret.trim();
	} catch {
		return null;
	}
}

function newSecret(): string {
	return randomBytes(32).toString("base64url");
}

/** Create secret if missing. Returns secret only when newly created. */
export async function ensureWebhookSecret(): Promise<{ created: boolean; secret: string | null }> {
	await ensureDir();
	const existing = await readWebhookSecret();
	if (existing) return { created: false, secret: null };
	const secret = newSecret();
	const body: WebhookFile = { version: 1, secret, createdAt: new Date().toISOString() };
	await writeFile(path(), JSON.stringify(body, null, 2), "utf8");
	return { created: true, secret };
}

/** Replace secret; always returns the new secret (operator action). */
export async function rotateWebhookSecret(): Promise<string> {
	await ensureDir();
	const secret = newSecret();
	const body: WebhookFile = { version: 1, secret, createdAt: new Date().toISOString() };
	await writeFile(path(), JSON.stringify(body, null, 2), "utf8");
	return secret;
}

export function verifyWebhookBearer(header: string | null, expected: string): boolean {
	if (!header || !header.startsWith("Bearer ")) return false;
	const token = header.slice("Bearer ".length).trim();
	if (!token || !expected) return false;
	const a = Buffer.from(token);
	const b = Buffer.from(expected);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}
