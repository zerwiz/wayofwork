/**
 * Read-only WhatsApp setup hints for Claw UI.
 * Does not spawn Pi; never returns token material.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, normalize } from "node:path";

import type { ClawWhatsAppStatusV1 } from "../shared/claw-whatsapp-status";
import { getClawDotDirAbs, getClawHostRepoRoot } from "./claw-workspace-root";
import { listWorkspaceFolders } from "./workspace-state";

function fileHasWhatsAppTokenShape(abs: string): boolean {
	try {
		if (!existsSync(abs)) return false;
		const st = statSync(abs);
		if (!st.isFile() || st.size > 65536) return false;
		const raw = readFileSync(abs, "utf8");
		const j = JSON.parse(raw) as Record<string, unknown>;
		for (const key of ["token", "apiKey", "WHATSAPP_API_KEY", "accessToken"] as const) {
			const v = j[key];
			if (typeof v === "string" && v.length >= 10) return true;
		}
		return false;
	} catch {
		return false;
	}
}

function settingsJsonListsPiWhatsApp(abs: string): boolean {
	if (!existsSync(abs)) return false;
	try {
		const raw = readFileSync(abs, "utf8");
		const j = JSON.parse(raw) as { extensions?: unknown };
		const ext = j.extensions;
		if (!Array.isArray(ext)) return false;
		for (const e of ext) {
			const s = String(e ?? "").toLowerCase();
			if (s.includes("pi-whatsapp") || s.includes("badlogic/pi-whatsapp")) return true;
		}
		return false;
	} catch {
		return false;
	}
}

function scanPiWhatsAppInSettings(): boolean {
	const seen = new Set<string>();
	const roots = [getClawHostRepoRoot(), ...listWorkspaceFolders().map(({ path }) => path)];
	for (const root of roots) {
		const p = normalize(join(root, ".pi", "settings.json"));
		if (seen.has(p)) continue;
		seen.add(p);
		if (settingsJsonListsPiWhatsApp(p)) return true;
	}
	return false;
}

export function getClawWhatsAppIntegrationStatus(): ClawWhatsAppStatusV1 {
	const globalPath = join(homedir(), ".pi", "agent", "whatsapp.json");
	const workspaceTokenPath = join(getClawDotDirAbs(), "whatsapp.json");

	const globalTokenConfigured = fileHasWhatsAppTokenShape(globalPath);
	const workspaceTokenConfigured = fileHasWhatsAppTokenShape(workspaceTokenPath);
	const piWhatsAppInSettings = scanPiWhatsAppInSettings();

	let tokenSource: ClawWhatsAppStatusV1["tokenSource"] = "none";
	if (globalTokenConfigured && workspaceTokenConfigured) tokenSource = "both";
	else if (workspaceTokenConfigured) tokenSource = "workspace";
	else if (globalTokenConfigured) tokenSource = "global";

	return {
		version: 1,
		globalTokenConfigured,
		workspaceTokenConfigured,
		piWhatsAppInSettings,
		tokenSource,
	};
}
