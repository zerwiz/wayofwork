/**
 * Claw Phase D — opt-in timer that reads workspace schedules and runs automations via
 * **`executeClawAutomation`** → **`runPiChatTurn`** (**`agent-runtime`**, same as Chat).
 * Enable with **`WOP_CLAW_SCHEDULER=1`** (or **`true`** / **`on`**).
 */
import { cronMatchesInstant } from "../shared/claw-schedule-cron.ts";
import type { ClawSchedule } from "../shared/claw-schedules-types.ts";
import { executeClawAutomation } from "./claw-schedule-executor";
import {
	patchClawScheduleRun,
	readClawSchedulesMerged,
} from "./claw-schedules-store";

const TICK_MS = 45_000;

function envTruthy(v: string | undefined): boolean {
	const s = (v ?? "").trim().toLowerCase();
	return s === "1" || s === "true" || s === "yes" || s === "on";
}

export function clawSchedulerEnabledFromEnv(): boolean {
	return envTruthy(process.env.WOP_CLAW_SCHEDULER);
}

function startOfMinute(d: Date): number {
	return new Date(
		d.getFullYear(),
		d.getMonth(),
		d.getDate(),
		d.getHours(),
		d.getMinutes(),
		0,
		0,
	).getTime();
}

function shouldFireCron(s: ClawSchedule, now: Date): boolean {
	if (s.status !== "enabled") return false;
	if (s.triggerMode !== "cron" || !s.cron.trim()) return false;
	if (!cronMatchesInstant(s.cron, now)) return false;
	if (!s.lastRun) return true;
	return new Date(s.lastRun).getTime() < startOfMinute(now);
}

function shouldFireOnce(s: ClawSchedule, now: Date): boolean {
	if (s.status !== "enabled") return false;
	if (s.triggerMode !== "once" || !s.runOnceAt) return false;
	if (s.lastRun) return false;
	const at = new Date(s.runOnceAt);
	if (Number.isNaN(at.getTime())) return false;
	return at.getTime() <= now.getTime();
}

let timer: ReturnType<typeof setInterval> | null = null;

async function tick(): Promise<void> {
	const now = new Date();
	let list: ClawSchedule[];
	try {
		list = await readClawSchedulesMerged();
	} catch (e) {
		console.error("[claw-scheduler] read schedules:", e instanceof Error ? e.message : e);
		return;
	}

	for (const s of list) {
		const fire =
			s.triggerMode === "cron" ? shouldFireCron(s, now) : shouldFireOnce(s, now);
		if (!fire) continue;

		const iso = new Date().toISOString();
		const r = await executeClawAutomation({
			name: s.name || s.id,
			prompt: s.prompt,
			agentName: s.agentName,
			source: "schedule",
			sourceId: s.id,
		});

		await patchClawScheduleRun(s.id, {
			lastRun: iso,
			lastResult: r.ok ? "success" : "error",
			lastError: r.ok ? null : r.error,
		});
	}
}

export function startClawScheduler(): void {
	if (!clawSchedulerEnabledFromEnv()) return;
	if (timer) return;
	void tick().catch((e) =>
		console.error("[claw-scheduler] initial tick:", e instanceof Error ? e.message : e),
	);
	timer = setInterval(() => {
		void tick().catch((e) =>
			console.error("[claw-scheduler] tick:", e instanceof Error ? e.message : e),
		);
	}, TICK_MS);
	console.log("[claw-scheduler] started (WOP_CLAW_SCHEDULER) — interval", TICK_MS, "ms");
}
