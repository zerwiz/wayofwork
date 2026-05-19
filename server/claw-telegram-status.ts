/**
 * Read-only Telegram setup hints for Claw UI.
 * Does not spawn Pi; never returns token material (see docs/WOP_TELEGRAM_PLAN.md).
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, normalize } from "node:path";

import type { ClawTelegramStatusV1 } from "../shared/claw-telegram-status.ts";
import { getClawDotDirAbs, getClawHostRepoRoot } from "./claw-workspace-root";
import { listWorkspaceFolders } from "./workspace-state";

function fileHasTelegramTokenShape(abs: string): boolean {
	try {
		if (!existsSync(abs)) return false;
		const st = statSync(abs);
		if (!st.isFile() || st.size > 65536) return false;
		const raw = readFileSync(abs, "utf8");
		const j = JSON.parse(raw) as Record<string, unknown>;
		for (const key of ["token", "botToken", "TELEGRAM_BOT_TOKEN"] as const) {
			const v = j[key];
			if (typeof v === "string" && v.length >= 20 && v.includes(":")) return true;
		}
		return false;
	} catch {
		return false;
	}
}

function settingsJsonListsPiTelegram(abs: string): boolean {
	if (!existsSync(abs)) return false;
	try {
		const raw = readFileSync(abs, "utf8");
		const j = JSON.parse(raw) as { extensions?: unknown };
		const ext = j.extensions;
		if (!Array.isArray(ext)) return false;
		for (const e of ext) {
			const s = String(e ?? "").toLowerCase();
			if (s.includes("pi-telegram") || s.includes("badlogic/pi-telegram")) return true;
		}
		return false;
	} catch {
		return false;
	}
}

/** Opened workspace folder(s) plus the Way of Pi host checkout (Claw extensions often live only on the host). */
function scanPiTelegramInSettings(): boolean {
	const seen = new Set<string>();
	const roots = [getClawHostRepoRoot(), ...listWorkspaceFolders().map(({ path }) => path)];
	for (const root of roots) {
		const p = normalize(join(root, ".pi", "settings.json"));
		if (seen.has(p)) continue;
		seen.add(p);
		if (settingsJsonListsPiTelegram(p)) return true;
	}
	return false;
}

export function getClawTelegramIntegrationStatus(): ClawTelegramStatusV1 {
	const globalPath = join(homedir(), ".pi", "agent", "telegram.json");
	const workspaceTokenPath = join(getClawDotDirAbs(), "telegram.json");

	const globalTokenConfigured = fileHasTelegramTokenShape(globalPath);
	const workspaceTokenConfigured = fileHasTelegramTokenShape(workspaceTokenPath);
	const piTelegramInSettings = scanPiTelegramInSettings();

	let tokenSource: ClawTelegramStatusV1["tokenSource"] = "none";
	if (globalTokenConfigured && workspaceTokenConfigured) tokenSource = "both";
	else if (workspaceTokenConfigured) tokenSource = "workspace";
	else if (globalTokenConfigured) tokenSource = "global";

	return {
		version: 1,
		globalTokenConfigured,
		workspaceTokenConfigured,
		piTelegramInSettings,
		tokenSource,
	};
}
