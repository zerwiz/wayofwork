/**
 * Claw Phase F — append-only automation log for Mission view (schedule/webhook runs).
 * Stored under host **`.claw/mission-events/`** on the Way of Pi checkout (not **`WOP_WORKSPACE`**).
 *
 * Legacy: **`WOP_WORKSPACE/.wayofpi/claw-mission-events.v1.json`** — migrated on first read when
 * the new file is missing but the legacy file exists.
 */
import { existsSync } from "node:fs";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { getClawDotDirAbs } from "./claw-workspace-root";
import { getPrimaryWorkspacePath } from "../server/workspace-state";

const MAX_EVENTS = 80;

export type ClawMissionEventKind = "schedule" | "webhook";

export interface ClawMissionEvent {
	at: string;
	kind: ClawMissionEventKind;
	name: string;
	ok: boolean;
	error?: string | null;
}

interface MissionEventsFile {
	version: 1;
	events: ClawMissionEvent[];
}

function eventsFilePath(): string {
	return join(getClawDotDirAbs(), "mission-events", "claw-mission-events.v1.json");
}

function legacyEventsFilePath(): string {
	return join(getPrimaryWorkspacePath(), ".wayofpi", "claw-mission-events.v1.json");
}

async function migrateLegacyMissionEventsIfNeeded(): Promise<void> {
	const next = eventsFilePath();
	if (existsSync(next)) return;
	const leg = legacyEventsFilePath();
	if (!existsSync(leg)) return;
	try {
		await mkdir(dirname(next), { recursive: true });
		await writeFile(next, await readFile(leg, "utf8"), "utf8");
	} catch {
		/* next read may retry */
	}
}

async function readAll(): Promise<ClawMissionEvent[]> {
	await migrateLegacyMissionEventsIfNeeded();
	try {
		const raw = await readFile(eventsFilePath(), "utf8");
		const j = JSON.parse(raw) as Partial<MissionEventsFile>;
		if (j?.version !== 1 || !Array.isArray(j.events)) return [];
		return j.events.filter(
			(e): e is ClawMissionEvent =>
				!!e &&
				typeof e === "object" &&
				typeof (e as ClawMissionEvent).at === "string" &&
				((e as ClawMissionEvent).kind === "schedule" || (e as ClawMissionEvent).kind === "webhook"),
		);
	} catch {
		return [];
	}
}

async function writeAll(events: ClawMissionEvent[]): Promise<void> {
	const p = eventsFilePath();
	await mkdir(dirname(p), { recursive: true });
	const body: MissionEventsFile = { version: 1, events: events.slice(-MAX_EVENTS) };
	await writeFile(p, JSON.stringify(body, null, 2), "utf8");
}

export async function appendClawMissionEvent(ev: ClawMissionEvent): Promise<void> {
	const cur = await readAll();
	cur.push(ev);
	await writeAll(cur);
}

export async function readClawMissionEvents(limit = 40): Promise<ClawMissionEvent[]> {
	const all = await readAll();
	return all.slice(-limit).reverse();
}
