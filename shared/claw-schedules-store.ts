/**
 * Host **`.claw/schedule/`** on the Way of Pi checkout (see `getClawDotDirAbs()`): definitions
 * **`claw-schedules.v1.json`** plus server-owned **`claw-schedule-runs.v1.json`**.
 *
 * Legacy: older builds used **`<WOP_WORKSPACE>/.wayofpi/`** — migrated once on read when the new
 * definitions file is missing but the legacy file exists.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type {
	ClawSchedule,
	ClawScheduleRunEntry,
	ClawScheduleRunsFile,
	ClawSchedulesDefinitionsFile,
} from "../shared/claw-schedules-types.ts";
import { CLAW_SCHEDULES_FILE_VERSION } from "../shared/claw-schedules-types.ts";
import { getClawDotDirAbs } from "./claw-workspace-root";
import { getPrimaryWorkspacePath } from "../server/workspace-state";

function scheduleDir(): string {
	return join(getClawDotDirAbs(), "schedule");
}

function definitionsPath(): string {
	return join(scheduleDir(), "claw-schedules.v1.json");
}

function runsPath(): string {
	return join(scheduleDir(), "claw-schedule-runs.v1.json");
}

function legacyDefinitionsPath(): string {
	return join(getPrimaryWorkspacePath(), ".wayofpi", "claw-schedules.v1.json");
}

function legacyRunsPath(): string {
	return join(getPrimaryWorkspacePath(), ".wayofpi", "claw-schedule-runs.v1.json");
}

/** Copy legacy workspace `.wayofpi/*.json` into `.claw/schedule/` if the new definitions file is absent. */
async function migrateLegacyClawScheduleFilesIfNeeded(): Promise<void> {
	const nextDef = definitionsPath();
	if (existsSync(nextDef)) return;
	const legDef = legacyDefinitionsPath();
	if (!existsSync(legDef)) return;
	try {
		await ensureParentDir(nextDef);
		await writeFile(nextDef, await readFile(legDef, "utf8"), "utf8");
		const legRuns = legacyRunsPath();
		const nextRuns = runsPath();
		if (existsSync(legRuns)) {
			await ensureParentDir(nextRuns);
			await writeFile(nextRuns, await readFile(legRuns, "utf8"), "utf8");
		}
	} catch {
		/* next read will retry */
	}
}

async function ensureParentDir(file: string): Promise<void> {
	await mkdir(dirname(file), { recursive: true });
}

function emptyRuns(): ClawScheduleRunsFile {
	return { version: 1, byId: {} };
}

export async function readClawScheduleRuns(): Promise<ClawScheduleRunsFile> {
	await migrateLegacyClawScheduleFilesIfNeeded();
	const p = runsPath();
	try {
		const raw = await readFile(p, "utf8");
		const j = JSON.parse(raw) as Partial<ClawScheduleRunsFile>;
		if (j?.version !== 1 || !j.byId || typeof j.byId !== "object") return emptyRuns();
		return { version: 1, byId: { ...j.byId } };
	} catch {
		return emptyRuns();
	}
}

export async function writeClawScheduleRuns(runs: ClawScheduleRunsFile): Promise<void> {
	const p = runsPath();
	await ensureParentDir(p);
	await writeFile(p, JSON.stringify(runs, null, 2), "utf8");
}

export async function patchClawScheduleRun(
	id: string,
	patch: ClawScheduleRunEntry,
): Promise<void> {
	const cur = await readClawScheduleRuns();
	cur.byId[id] = { ...patch };
	await writeClawScheduleRuns(cur);
}

export function normalizeSchedule(raw: unknown): ClawSchedule | null {
	if (!raw || typeof raw !== "object") return null;
	const o = raw as Record<string, unknown>;
	const id = typeof o.id === "string" ? o.id : "";
	if (!id) return null;
	const name = typeof o.name === "string" ? o.name : "";
	const description = typeof o.description === "string" ? o.description : "";
	const cron = typeof o.cron === "string" ? o.cron : "0 9 * * *";
	const agentName =
		o.agentName === null || o.agentName === undefined
			? null
			: typeof o.agentName === "string"
				? o.agentName || null
				: null;
	const prompt = typeof o.prompt === "string" ? o.prompt : "";
	const status: ClawSchedule["status"] = o.status === "disabled" ? "disabled" : "enabled";
	const createdAt = typeof o.createdAt === "string" ? o.createdAt : new Date().toISOString();

	let triggerMode: ClawSchedule["triggerMode"] = o.triggerMode === "once" ? "once" : "cron";
	let runOnceAt: string | null =
		typeof o.runOnceAt === "string" && o.runOnceAt.trim() ? o.runOnceAt.trim() : null;
	if (triggerMode === "once" && !runOnceAt) triggerMode = "cron";
	let outCron = cron;
	if (triggerMode === "once") outCron = "";

	return {
		id,
		name,
		description,
		cron: outCron,
		triggerMode,
		runOnceAt: triggerMode === "once" ? runOnceAt : null,
		agentName,
		prompt,
		status,
		lastRun: null,
		lastResult: null,
		createdAt,
	};
}

export async function readClawSchedulesDefinitions(): Promise<ClawSchedule[]> {
	await migrateLegacyClawScheduleFilesIfNeeded();
	const p = definitionsPath();
	try {
		const raw = await readFile(p, "utf8");
		const j = JSON.parse(raw) as Partial<ClawSchedulesDefinitionsFile>;
		if (j?.version !== CLAW_SCHEDULES_FILE_VERSION || !Array.isArray(j.schedules)) return [];
		return j.schedules.map(normalizeSchedule).filter((s): s is ClawSchedule => s !== null);
	} catch {
		return [];
	}
}

export async function writeClawSchedulesDefinitions(schedules: ClawSchedule[]): Promise<void> {
	const p = definitionsPath();
	await ensureParentDir(p);
	const body: ClawSchedulesDefinitionsFile = {
		version: CLAW_SCHEDULES_FILE_VERSION,
		schedules: schedules.map((s) => ({
			...s,
			lastRun: null,
			lastResult: null,
		})),
	};
	await writeFile(p, JSON.stringify(body, null, 2), "utf8");
}

/** Definitions merged with run file (for GET /api/claw/schedules). */
export async function readClawSchedulesMerged(): Promise<ClawSchedule[]> {
	const defs = await readClawSchedulesDefinitions();
	const runs = await readClawScheduleRuns();
	return defs.map((s) => {
		const r = runs.byId[s.id];
		if (!r) return { ...s, lastRun: null, lastResult: null };
		return {
			...s,
			lastRun: r.lastRun ?? null,
			lastResult: r.lastResult ?? null,
		};
	});
}

export function clawSchedulesDefinitionsPathForDiagnostics(): string {
	return definitionsPath();
}

export function clawSchedulesFilesExist(): { definitions: boolean; runs: boolean } {
	return {
		definitions: existsSync(definitionsPath()),
		runs: existsSync(runsPath()),
	};
}
