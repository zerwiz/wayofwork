/**
 * Claw schedule management — definitions sync to **`<host>/.claw/schedule/claw-schedules.v1.json`**
 * via **`PUT /api/claw/schedules`**; last-run metadata is server-owned. Cron execution runs when
 * **`WOP_CLAW_SCHEDULER=1`** (see **`docs/WOP_CLAW_MODE_PLAN.md`** Phase D).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type {
	ClawSchedule,
	ScheduleLastResult,
	ScheduleStatus,
	ScheduleTriggerMode,
} from "../../shared/claw-schedules-types";
import { apiGet, apiPutJson } from "../api/client";
import {
	ensureDevWayOfPiApiFresh,
	healthSupportsClawHostTree,
	staleWayOfPiApiMessage,
} from "../utils/wayofpiDevApiWarmup";
import { WAYOFPI_CLAW_SCHEDULES_SYNCED_EVENT } from "./useClawAutomationStatus";

export type { ClawSchedule, ScheduleLastResult, ScheduleStatus, ScheduleTriggerMode };

const STORAGE_KEY = "wayofpi.claw.schedules";

function normalizeSchedule(raw: unknown): ClawSchedule | null {
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
	const status: ScheduleStatus = o.status === "disabled" ? "disabled" : "enabled";
	const lastRun = typeof o.lastRun === "string" || o.lastRun === null ? (o.lastRun as string | null) : null;
	const lastResult =
		o.lastResult === "success" || o.lastResult === "error" || o.lastResult === null
			? (o.lastResult as ScheduleLastResult)
			: null;
	const createdAt = typeof o.createdAt === "string" ? o.createdAt : new Date().toISOString();

	let triggerMode: ScheduleTriggerMode = o.triggerMode === "once" ? "once" : "cron";
	let runOnceAt: string | null =
		typeof o.runOnceAt === "string" && o.runOnceAt.trim() ? o.runOnceAt.trim() : null;

	if (triggerMode === "once" && !runOnceAt) {
		triggerMode = "cron";
	}

	let outCron = cron;
	if (triggerMode === "once") {
		outCron = "";
	}

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
		lastRun,
		lastResult,
		createdAt,
	};
}

function loadSchedules(): ClawSchedule[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const arr = JSON.parse(raw) as unknown[];
		if (!Array.isArray(arr)) return [];
		return arr.map(normalizeSchedule).filter((s): s is ClawSchedule => s !== null);
	} catch {
		/* ignore */
	}
	return [];
}

function saveSchedulesLocal(schedules: ClawSchedule[]): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
	} catch {
		/* ignore */
	}
}

function makeId(): string {
	return `sched-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

type SchedulesApiGet = { version?: number; schedules?: ClawSchedule[] };
type SchedulesApiPut = { ok?: boolean; schedules?: ClawSchedule[] };

async function fetchSchedulesFromApi(): Promise<SchedulesApiGet> {
	const caps = await ensureDevWayOfPiApiFresh();
	if (caps !== null && !healthSupportsClawHostTree(caps)) {
		throw new Error(staleWayOfPiApiMessage());
	}
	try {
		return await apiGet<SchedulesApiGet>("/api/claw/schedules");
	} catch (e1) {
		const m1 = e1 instanceof Error ? e1.message : String(e1);
		if (!/^404\b/.test(m1)) throw e1;
		const cfg = await apiGet<{ clawSchedules?: SchedulesApiGet }>("/api/config?schedules=1");
		const emb = cfg.clawSchedules;
		if (emb?.version === 1 && Array.isArray(emb.schedules)) return emb;
		throw new Error(
			`${m1} Schedules need GET /api/claw/schedules or GET /api/config?schedules=1 with clawSchedules. ${staleWayOfPiApiMessage()}`,
		);
	}
}

export function useClawSchedules() {
	const [schedules, setSchedules] = useState<ClawSchedule[]>(() => loadSchedules());
	const [hydrated, setHydrated] = useState(false);
	const [syncError, setSyncError] = useState<string | null>(null);
	const skipNextPersist = useRef(true);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				setSyncError(null);
				const r = await fetchSchedulesFromApi();
				if (cancelled) return;
				const fromServer = Array.isArray(r.schedules) ? r.schedules : [];
				if (fromServer.length === 0) {
					const local = loadSchedules();
					if (local.length) {
						const migrated = await apiPutJson<SchedulesApiPut>("/api/claw/schedules", {
							schedules: local,
						});
						setSchedules(Array.isArray(migrated.schedules) ? migrated.schedules : local);
						saveSchedulesLocal(Array.isArray(migrated.schedules) ? migrated.schedules : local);
					} else {
						setSchedules([]);
					}
				} else {
					setSchedules(fromServer);
					saveSchedulesLocal(fromServer);
				}
			} catch (e) {
				if (!cancelled) {
					setSyncError(e instanceof Error ? e.message : String(e));
					setSchedules(loadSchedules());
				}
			} finally {
				if (!cancelled) {
					skipNextPersist.current = true;
					setHydrated(true);
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (!hydrated) return;
		if (skipNextPersist.current) {
			skipNextPersist.current = false;
			return;
		}
		saveSchedulesLocal(schedules);
		const t = window.setTimeout(() => {
			void (async () => {
				try {
					const out = await apiPutJson<SchedulesApiPut>("/api/claw/schedules", { schedules });
					if (Array.isArray(out.schedules)) {
						setSchedules(out.schedules);
						setSyncError(null);
						window.dispatchEvent(new CustomEvent(WAYOFPI_CLAW_SCHEDULES_SYNCED_EVENT));
					}
				} catch (e) {
					setSyncError(
						e instanceof Error
							? e.message
							: "Could not save schedules to the server. Changes stay in this browser until the API works.",
					);
				}
			})();
		}, 500);
		return () => window.clearTimeout(t);
	}, [schedules, hydrated]);

	const addSchedule = useCallback(
		(partial: Omit<ClawSchedule, "id" | "createdAt" | "lastRun" | "lastResult">) => {
			setSchedules((prev) => [
				...prev,
				{
					...partial,
					id: makeId(),
					createdAt: new Date().toISOString(),
					lastRun: null,
					lastResult: null,
				},
			]);
		},
		[],
	);

	const updateSchedule = useCallback(
		(id: string, patch: Partial<Omit<ClawSchedule, "id" | "createdAt">>) => {
			setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
		},
		[],
	);

	const deleteSchedule = useCallback((id: string) => {
		setSchedules((prev) => prev.filter((s) => s.id !== id));
	}, []);

	const toggleSchedule = useCallback((id: string) => {
		setSchedules((prev) =>
			prev.map((s) =>
				s.id === id
					? { ...s, status: s.status === "enabled" ? "disabled" : "enabled" }
					: s,
			),
		);
	}, []);

	const refreshFromServer = useCallback(async () => {
		try {
			const r = await fetchSchedulesFromApi();
			const next = Array.isArray(r.schedules) ? r.schedules : [];
			setSchedules(next);
			saveSchedulesLocal(next);
			setSyncError(null);
		} catch {
			/* keep showing last good list */
		}
	}, []);

	useEffect(() => {
		const id = window.setInterval(() => void refreshFromServer(), 60_000);
		return () => window.clearInterval(id);
	}, [refreshFromServer]);

	return {
		schedules,
		hydrated,
		syncError,
		addSchedule,
		updateSchedule,
		deleteSchedule,
		toggleSchedule,
		refreshFromServer,
	};
}
