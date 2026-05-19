/**
 * Local calendar helpers (browser timezone). Used by Claw schedule calendar.
 */

export function isValidLocalDate(d: unknown): d is Date {
	return d instanceof Date && !Number.isNaN(d.getTime());
}

/** Start of the user's local civil day for a valid instant; invalid input falls back to "now". */
export function startOfLocalDay(d: Date): Date {
	if (!isValidLocalDate(d)) {
		const n = new Date();
		return new Date(n.getFullYear(), n.getMonth(), n.getDate());
	}
	return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function sameLocalDay(a: Date, b: Date): boolean {
	if (!isValidLocalDate(a) || !isValidLocalDate(b)) return false;
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

/** Milliseconds from `from` until the next local midnight (00:00:00.000). */
export function msUntilNextLocalMidnight(from: Date = new Date()): number {
	if (!isValidLocalDate(from)) return 60_000;
	const next = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1, 0, 0, 0, 0);
	const ms = next.getTime() - from.getTime();
	return Math.max(250, ms);
}

/**
 * Short weekday labels Sun–Sat in the user's locale.
 * Column order matches `Date#getDay()` (0 = Sunday).
 */
export function weekdayLabelsShortSundayFirst(locales?: string | string[]): string[] {
	const anchorSunday = new Date(2023, 0, 1);
	const fmt = new Intl.DateTimeFormat(locales, { weekday: "short" });
	return Array.from({ length: 7 }, (_, i) =>
		fmt.format(
			new Date(
				anchorSunday.getFullYear(),
				anchorSunday.getMonth(),
				anchorSunday.getDate() + i,
			),
		),
	);
}

export function pad2(n: number): string {
	return n < 10 ? `0${n}` : String(n);
}

/** Local civil date as `YYYY-MM-DD` (for `<input type="date">`). */
export function formatYMDLocal(d: Date): string {
	const y = d.getFullYear();
	const m = pad2(d.getMonth() + 1);
	const day = pad2(d.getDate());
	return `${y}-${m}-${day}`;
}

/** Parse `YYYY-MM-DD` to start of that local day, or null if invalid. */
export function parseYMDToStartOfLocalDay(ymd: string): Date | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
	if (!m) return null;
	const y = Number(m[1]);
	const mo = Number(m[2]);
	const d = Number(m[3]);
	if (!Number.isFinite(y) || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
	const dt = new Date(y, mo - 1, d);
	if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
	return startOfLocalDay(dt);
}

/**
 * Combine local date (`YYYY-MM-DD`) and time (`HH:mm`) into an ISO instant
 * (UTC string) for storage. Interpreted in the browser's local timezone.
 */
export function localYmdAndHmToISO(ymd: string, hm: string): string | null {
	const day = parseYMDToStartOfLocalDay(ymd);
	if (!day) return null;
	const tm = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
	if (!tm) return null;
	const hh = Number(tm[1]);
	const min = Number(tm[2]);
	if (!Number.isFinite(hh) || !Number.isFinite(min) || hh < 0 || hh > 23 || min < 0 || min > 59) {
		return null;
	}
	const dt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hh, min, 0, 0);
	if (Number.isNaN(dt.getTime())) return null;
	return dt.toISOString();
}
