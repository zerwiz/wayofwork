/**
 * Local-time helpers: does a 5-field cron expression fire at least once
 * on a given calendar day? Used by the Claw Schedules month calendar.
 *
 * Supported: star, ?, n, a-b, lists, steps (e.g. star-slash-n), a-b-slash-n — Vixie-style m/h/dom/month/dow.
 * dow uses 0–6 (Sun–Sat), same as JS Date#getDay(). Month 1–12, dom 1–31.
 */
import { cronMatchesInstant } from "../../shared/claw-schedule-cron";

function pad2(n: number): string {
	return n < 10 ? `0${n}` : String(n);
}

export function scheduleRunsOnLocalDay(cronExpr: string, day: Date): boolean {
	try {
		if (typeof cronExpr !== "string" || !cronExpr.trim()) return false;
		if (!(day instanceof Date) || Number.isNaN(day.getTime())) return false;
		const y = day.getFullYear();
		const mo = day.getMonth();
		const d = day.getDate();
		for (let mins = 0; mins < 1440; mins++) {
			const dt = new Date(y, mo, d, Math.floor(mins / 60), mins % 60, 0, 0);
			if (cronMatchesInstant(cronExpr, dt)) return true;
		}
		return false;
	} catch {
		return false;
	}
}

/** Sorted unique HH:MM (local) when the cron fires on this calendar day, capped. */
export function fireTimesOnLocalDay(cronExpr: string, day: Date, cap = 12): string[] {
	try {
		if (typeof cronExpr !== "string" || !cronExpr.trim()) return [];
		if (!(day instanceof Date) || Number.isNaN(day.getTime())) return [];
		const y = day.getFullYear();
		const mo = day.getMonth();
		const d = day.getDate();
		const seen = new Set<string>();
		const out: string[] = [];
		for (let mins = 0; mins < 1440; mins++) {
			const dt = new Date(y, mo, d, Math.floor(mins / 60), mins % 60, 0, 0);
			if (!cronMatchesInstant(cronExpr, dt)) continue;
			const label = `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
			if (seen.has(label)) continue;
			seen.add(label);
			out.push(label);
			if (out.length >= cap) break;
		}
		return out.sort();
	} catch {
		return [];
	}
}
