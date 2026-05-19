/**
 * Month grid + per-day schedule summary for Claw Schedules.
 * Uses the browser's local timezone and a live clock so "today" stays correct.
 */
import { useId, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ClawSchedule } from "../../hooks/useClawSchedules";
import { useLocalTodayStart } from "../../hooks/useLocalToday";
import {
	isValidLocalDate,
	sameLocalDay,
	startOfLocalDay,
	weekdayLabelsShortSundayFirst,
} from "../../utils/localCalendarDate";
import { scheduleAppliesToLocalDay, scheduleFireTimesOnLocalDay } from "../../utils/clawScheduleDayMatch";

function monthMatrix(year: number, month: number): { date: Date; inMonth: boolean }[] {
	const first = new Date(year, month, 1);
	const startPad = first.getDay();
	const daysIn = new Date(year, month + 1, 0).getDate();
	const cells: { date: Date; inMonth: boolean }[] = [];

	for (let i = 0; i < startPad; i++) {
		const d = new Date(year, month, 1 - (startPad - i));
		cells.push({ date: d, inMonth: false });
	}
	for (let dom = 1; dom <= daysIn; dom++) {
		cells.push({ date: new Date(year, month, dom), inMonth: true });
	}
	while (cells.length % 7 !== 0) {
		const last = cells[cells.length - 1]!.date;
		const next = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
		cells.push({ date: next, inMonth: false });
	}
	while (cells.length < 42) {
		const last = cells[cells.length - 1]!.date;
		cells.push({
			date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1),
			inMonth: false,
		});
	}
	return cells;
}

function civilDayKey(d: Date): string {
	return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function ClawScheduleMonthCalendar({
	dark,
	schedules,
	selectedDate,
	onSelectDate,
}: {
	dark: boolean;
	schedules: ClawSchedule[];
	selectedDate: Date;
	onSelectDate: (d: Date) => void;
}) {
	const titleId = useId();
	const gridLabelId = useId();
	const todayStart = useLocalTodayStart();
	const safeSelectedDate = isValidLocalDate(selectedDate) ? selectedDate : todayStart;

	const [viewYear, setViewYear] = useState(() => safeSelectedDate.getFullYear());
	const [viewMonth, setViewMonth] = useState(() => safeSelectedDate.getMonth());

	const matrix = useMemo(
		() => monthMatrix(viewYear, viewMonth),
		[viewYear, viewMonth],
	);

	const hitsByCivilDay = useMemo(() => {
		const m = new Map<string, ClawSchedule[]>();
		for (const { date } of matrix) {
			const key = civilDayKey(date);
			m.set(
				key,
				schedules.filter((s) => scheduleAppliesToLocalDay(s, date)),
			);
		}
		return m;
	}, [matrix, schedules]);

	const weekLabels = useMemo(() => weekdayLabelsShortSundayFirst(), []);

	const monthTitle = new Date(viewYear, viewMonth, 1).toLocaleString(undefined, {
		month: "long",
		year: "numeric",
	});

	function goPrev() {
		const d = new Date(viewYear, viewMonth - 1, 1);
		setViewYear(d.getFullYear());
		setViewMonth(d.getMonth());
	}
	function goNext() {
		const d = new Date(viewYear, viewMonth + 1, 1);
		setViewYear(d.getFullYear());
		setViewMonth(d.getMonth());
	}
	function goToday() {
		const n = new Date();
		setViewYear(n.getFullYear());
		setViewMonth(n.getMonth());
		onSelectDate(startOfLocalDay(n));
	}

	const selectedDay = startOfLocalDay(safeSelectedDate);
	const daySchedules = schedules.filter((s) => scheduleAppliesToLocalDay(s, selectedDay));

	const border = dark ? "border-[#2a2a2a]" : "border-[#e5e5e5]";
	const cardBg = dark ? "bg-[#1e1e1e]" : "bg-white";
	const muted = dark ? "text-[#858585]" : "text-[#888888]";
	const text = dark ? "text-[#cccccc]" : "text-[#333333]";
	const accent = dark ? "text-[#fb923c]" : "text-[#ea580c]";
	const accentRing = dark ? "ring-[#fb923c]/50" : "ring-[#ea580c]/40";
	const ghostBtn = `rounded-lg p-1.5 transition-colors ${
		dark
			? "text-[#858585] hover:bg-[#2a2a2a] hover:text-[#cccccc]"
			: "text-[#888888] hover:bg-[#f5f5f5] hover:text-[#333333]"
	}`;

	return (
		<section
			className={`flex w-full min-w-0 flex-col gap-3 rounded-xl border ${border} ${cardBg} p-3 shadow-sm`}
			aria-labelledby={titleId}
			aria-describedby={gridLabelId}
		>
			<div className="flex items-center justify-between gap-2">
				<span id={titleId} className={`min-w-0 truncate text-[12px] font-bold ${text}`}>
					{monthTitle}
				</span>
				<div className="flex shrink-0 items-center gap-0.5">
					<button
						type="button"
						className={ghostBtn}
						onClick={goPrev}
						aria-label={`Previous month, currently showing ${monthTitle}`}
					>
						<ChevronLeft size={16} aria-hidden />
					</button>
					<button
						type="button"
						className={ghostBtn}
						onClick={goNext}
						aria-label={`Next month, currently showing ${monthTitle}`}
					>
						<ChevronRight size={16} aria-hidden />
					</button>
				</div>
			</div>
			<button
				type="button"
				onClick={goToday}
				aria-label={`Jump to today, ${todayStart.toLocaleDateString(undefined, { dateStyle: "full" })}`}
				className={`self-start rounded-md px-2 py-1 text-[10px] font-semibold ${
					dark ? "bg-[#2a2a2a] text-[#fb923c] hover:bg-[#333333]" : "bg-[#f0f0f0] text-[#ea580c] hover:bg-[#e5e5e5]"
				}`}
			>
				Today
			</button>

			<p id={gridLabelId} className="sr-only">
				{monthTitle}. Week starts Sunday. Select a day to see schedules for that date.
			</p>

			<div
				className={`grid grid-cols-7 gap-0.5 text-center text-[9px] font-semibold uppercase tracking-wide ${muted}`}
				aria-hidden
			>
				{weekLabels.map((w, i) => (
					<div key={i} className="py-1">
						{w}
					</div>
				))}
			</div>

			<div className="grid grid-cols-7 gap-1">
				{matrix.map(({ date, inMonth }) => {
					const hits = hitsByCivilDay.get(civilDayKey(date)) ?? [];
					const enabledHits = hits.filter((s) => s.status === "enabled");
					const isSel = sameLocalDay(date, safeSelectedDate);
					const isToday = sameLocalDay(date, todayStart);
					const longLabel = date.toLocaleDateString(undefined, { dateStyle: "full" });
					const ariaLabel =
						hits.length === 0
							? `${longLabel}. No schedules.`
							: `${longLabel}. ${hits.length} schedule${hits.length === 1 ? "" : "s"}.`;

					return (
						<button
							key={`${viewYear}-${viewMonth}-${civilDayKey(date)}`}
							type="button"
							onClick={() => onSelectDate(startOfLocalDay(date))}
							aria-label={ariaLabel}
							aria-pressed={isSel}
							aria-current={isToday ? "date" : undefined}
							className={`relative flex min-h-[44px] flex-col items-center rounded-lg border px-0.5 py-1 text-[11px] transition-colors ${
								inMonth
									? dark
										? "border-transparent bg-[#252526] hover:border-[#fb923c]/30"
										: "border-transparent bg-[#fafafa] hover:border-[#ea580c]/30"
									: dark
										? "border-transparent bg-transparent opacity-40 hover:bg-[#252526]/50"
										: "border-transparent bg-transparent opacity-50 hover:bg-[#fafafa]"
							} ${isSel ? `ring-2 ${accentRing}` : ""} ${
								isToday && !isSel
									? dark
										? "ring-1 ring-[#fb923c]/40"
										: "ring-1 ring-[#ea580c]/40"
									: ""
							}`}
						>
							<span className={`font-semibold ${inMonth ? text : muted}`}>{date.getDate()}</span>
							{hits.length > 0 ? (
								<span
									className={`mt-auto text-[8px] font-bold leading-none ${
										enabledHits.length > 0 ? accent : muted
									}`}
									aria-hidden
								>
									{hits.length > 9 ? "9+" : hits.length}
								</span>
							) : (
								<span className="mt-auto h-2" aria-hidden />
							)}
						</button>
					);
				})}
			</div>

			<div className={`border-t pt-3 ${border}`} aria-live="polite">
				<p className={`text-[10px] font-bold uppercase tracking-wider ${muted}`}>
					{selectedDay.toLocaleDateString(undefined, {
						weekday: "short",
						month: "short",
						day: "numeric",
						year: "numeric",
					})}
				</p>
				{daySchedules.length === 0 ? (
					<p className={`mt-2 text-[11px] ${muted}`}>No schedules fire on this day.</p>
				) : (
					<ul className="mt-2 max-h-[220px] space-y-2 overflow-y-auto pr-0.5">
						{daySchedules.map((s) => {
							const times = scheduleFireTimesOnLocalDay(s, selectedDay, 8);
							const timeLabel =
								times.length === 0
									? "—"
									: times.length >= 8
										? `${times.slice(0, 3).join(", ")}…`
										: times.join(", ");
							return (
								<li
									key={s.id}
									className={`rounded-lg border px-2.5 py-2 text-[11px] ${
										dark ? "border-[#2a2a2a] bg-[#161616]" : "border-[#f0f0f0] bg-[#fafafa]"
									}`}
								>
									<div className="flex items-start justify-between gap-2">
										<span className={`min-w-0 flex-1 truncate font-semibold ${text}`}>{s.name}</span>
										<span
											className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase ${
												s.status === "enabled"
													? dark
														? "bg-[#4ec9b0]/15 text-[#4ec9b0]"
														: "bg-[#4ec9b0]/20 text-[#0a7a68]"
													: dark
														? "bg-[#3c3c3c] text-[#858585]"
														: "bg-[#e5e5e5] text-[#888888]"
											}`}
										>
											{s.status === "enabled" ? "On" : "Off"}
										</span>
									</div>
									<p className={`mt-0.5 font-mono text-[9px] ${muted}`}>{timeLabel}</p>
								</li>
							);
						})}
					</ul>
				)}
			</div>
		</section>
	);
}
