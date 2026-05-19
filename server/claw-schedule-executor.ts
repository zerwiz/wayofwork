/**
 * Run one Claw automation (schedule or inbound webhook) as a single headless Pi turn.
 *
 * **Same runtime as Chat:** imports **`shouldUsePiJsonChat`** and **`runPiChatTurn`** from
 * **`agent-runtime.ts`** (not a fork). Binary resolution is **`resolvePiBinaryPath()`** in
 * **`pi-binary.ts`**; engine gates match **`GET /api/config`** `piDrivesChat` / Mission → Engine.
 */
import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

import type { ChatMessage } from "./chat";
import { getAgentBodyByName } from "./agents";
import { getClawWorkspaceBundleDirAbs } from "./claw-workspace-root";
import { getPiStackForSurface, runPiChatTurn, shouldUsePiJsonChat } from "./agent-runtime";
import { appendClawMissionEvent } from "./claw-mission-events";
import { getPrimaryWorkspacePath } from "./workspace-state";

export type ClawAutomationSource = "schedule" | "webhook";

export interface ClawAutomationPayload {
	/** Short label for logs */
	name: string;
	prompt: string;
	agentName: string | null;
	source: ClawAutomationSource;
	sourceId?: string;
}

function todayMemoryMdPath(): string {
	const d = new Date();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return join(getClawWorkspaceBundleDirAbs(), "memory", `${y}-${m}-${day}.md`);
}

async function appendClawMemoryLog(line: string): Promise<void> {
	try {
		const p = todayMemoryMdPath();
		await mkdir(join(getClawWorkspaceBundleDirAbs(), "memory"), { recursive: true });
		await appendFile(p, line.endsWith("\n") ? line : `${line}\n`, "utf8");
	} catch {
		/* optional */
	}
}

export async function executeClawAutomation(
	payload: ClawAutomationPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
	const cwd = getPrimaryWorkspacePath();
	if (!shouldUsePiJsonChat()) {
		const err = "Skipped — this server is not in the mode required for this automatic run.";
		void appendClawMissionEvent({
			at: new Date().toISOString(),
			kind: payload.source,
			name: payload.name,
			ok: false,
			error: err,
		}).catch(() => {});
		await appendClawMemoryLog(
			`## [Claw ${payload.source}] ${payload.name}\n**${new Date().toISOString()}** — skipped: ${err}\n`,
		);
		return { ok: false, error: err };
	}

	const intro = [
		`You are executing an **automated Claw ${payload.source}** run in Way of Pi.`,
		`**Job name:** ${payload.name}`,
		`**Workspace cwd:** \`${cwd}\``,
		`Complete the task in the user message. Prefer tools over speculation; keep the final summary concise.`,
	].join("\n");

	let system = intro;
	if (payload.agentName?.trim()) {
		const body = await getAgentBodyByName(payload.agentName.trim());
		if (body) {
			system = `${intro}\n\n---\n\n## Agent persona (\`${payload.agentName}\`)\n\n${body}`;
		}
	}

	const messages: ChatMessage[] = [
		{ role: "system", content: system },
		{ role: "user", content: payload.prompt },
	];

	let full = "";
	const started = Date.now();
	const r = await runPiChatTurn({
		cwd,
		messages,
		piStack: getPiStackForSurface("claw"),
		onDelta: (s) => {
			full += s;
		},
		onLog: () => {},
	});

	const elapsed = Date.now() - started;
	if (r.result.ok) {
		const snippet = full.trim().slice(0, 4000);
		void appendClawMissionEvent({
			at: new Date().toISOString(),
			kind: payload.source,
			name: payload.name,
			ok: true,
		}).catch(() => {});
		await appendClawMemoryLog(
			[
				`## [Claw ${payload.source}] ${payload.name}`,
				`**${new Date().toISOString()}** — completed in ${elapsed}ms`,
				snippet ? `\n${snippet}${full.length > 4000 ? "\n…(truncated)" : ""}\n` : "\n",
			].join("\n"),
		);
		return { ok: true };
	}
	const err =
		"aborted" in r.result && r.result.aborted
			? "Turn aborted"
			: "error" in r.result
				? String(r.result.error ?? "Unknown Pi error")
				: "Unknown error";
	void appendClawMissionEvent({
		at: new Date().toISOString(),
		kind: payload.source,
		name: payload.name,
		ok: false,
		error: err,
	}).catch(() => {});
	await appendClawMemoryLog(
		`## [Claw ${payload.source}] ${payload.name}\n**${new Date().toISOString()}** — **error:** ${err}\n`,
	);
	return { ok: false, error: err };
}
