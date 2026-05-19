import { useId, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import {
	isValidLocalDate,
	sameLocalDay,
	startOfLocalDay,
	weekdayLabelsShortSundayFirst,
} from "../../utils/localCalendarDate";

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

export function WorkTimeCalendar({
	dark,
	logs,
	selectedDate,
	onSelectDate,
}: {
	dark: boolean;
	logs: Array<{ id: string; date: string; hours: number; description: string; cardTitle: string; workerName: string }>;
	selectedDate: Date;
	onSelectDate: (d: Date) => void;
}) {
	const titleId = useId();
	const gridLabelId = useId();
	const todayStart = startOfLocalDay(new Date());
	const safeSelectedDate = isValidLocalDate(selectedDate) ? selectedDate : todayStart;

	const [viewYear, setViewYear] = useState(() => safeSelectedDate.getFullYear());
	const [viewMonth, setViewMonth] = useState(() => safeSelectedDate.getMonth());

	const matrix = useMemo(
		() => monthMatrix(viewYear, viewMonth),
		[viewYear, viewMonth],
	);

	const logsByDay = useMemo(() => {
		const m = new Map<string, typeof logs>();
		logs.forEach(log => {
			const d = new Date(log.date);
			const key = civilDayKey(d);
			if (!m.has(key)) m.set(key, []);
			m.get(key)!.push(log);
		});
		return m;
	}, [logs]);

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

	const selectedDayKey = civilDayKey(safeSelectedDate);
	const dayLogs = logsByDay.get(selectedDayKey) || [];

	const border = dark ? "border-[#3c3c3c]" : "border-[#e5e5e5]";
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
		<div className="flex flex-col lg:flex-row gap-6">
			<section
				className={`flex-1 flex flex-col gap-3 rounded-xl border ${border} ${cardBg} p-4 shadow-sm`}
			>
				<div className="flex items-center justify-between gap-2 mb-2">
					<div className="flex items-center gap-4">
						<span id={titleId} className={`text-sm font-bold ${text}`}>
							{monthTitle}
						</span>
						<button
							type="button"
							onClick={goToday}
							className={`rounded-md px-2 py-1 text-[10px] font-semibold ${
								dark ? "bg-[#2a2a2a] text-[#fb923c] hover:bg-[#333333]" : "bg-[#f0f0f0] text-[#ea580c] hover:bg-[#e5e5e5]"
							}`}
						>
							Today
						</button>
					</div>
					<div className="flex shrink-0 items-center gap-1">
						<button type="button" className={ghostBtn} onClick={goPrev}>
							<ChevronLeft size={18} />
						</button>
						<button type="button" className={ghostBtn} onClick={goNext}>
							<ChevronRight size={18} />
						</button>
					</div>
				</div>

				<div
					className={`grid grid-cols-7 gap-0.5 text-center text-[10px] font-bold uppercase tracking-widest ${muted} mb-2`}
				>
					{weekLabels.map((w, i) => (
						<div key={i} className="py-1">
							{w}
						</div>
					))}
				</div>

				<div className="grid grid-cols-7 gap-2 flex-1">
					{matrix.map(({ date, inMonth }) => {
						const dayLogs = logsByDay.get(civilDayKey(date)) ?? [];
						const totalHours = dayLogs.reduce((s, l) => s + l.hours, 0);
						const isSel = sameLocalDay(date, safeSelectedDate);
						const isToday = sameLocalDay(date, todayStart);

						return (
							<button
								key={civilDayKey(date)}
								type="button"
								onClick={() => onSelectDate(startOfLocalDay(date))}
								className={`relative flex min-h-[64px] flex-col items-center rounded-xl border p-2 transition-all ${
									inMonth
										? dark
											? "border-transparent bg-[#252526] hover:bg-[#2d2d2d]"
											: "border-transparent bg-[#fafafa] hover:bg-[#f0f0f0]"
										: dark
											? "border-transparent bg-transparent opacity-30"
											: "border-transparent bg-transparent opacity-40"
								} ${isSel ? `ring-2 ${accentRing} bg-orange-500/5` : ""} ${
									isToday && !isSel
										? dark
											? "ring-1 ring-[#fb923c]/40"
											: "ring-1 ring-[#ea580c]/40"
										: ""
								}`}
							>
								<span className={`text-xs font-bold ${inMonth ? text : muted}`}>{date.getDate()}</span>
								{totalHours > 0 && (
									<div className="mt-auto flex flex-col items-center">
										<span className="text-[10px] font-black text-[#ea580c] leading-none">{totalHours}h</span>
										<div className="mt-1 flex gap-0.5">
											{dayLogs.map((_, idx) => (
												<div key={idx} className="h-1 w-1 rounded-full bg-[#ea580c]/60" />
											))}
										</div>
									</div>
								)}
							</button>
						);
					})}
				</div>
			</section>

			{/* Side List for Selected Day */}
			<section className={`w-full lg:w-80 shrink-0 rounded-xl border ${border} ${cardBg} p-4 shadow-sm`}>
				<h3 className={`text-[10px] font-bold uppercase tracking-widest ${muted} mb-4`}>
					Activity for {safeSelectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
				</h3>

				<div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
					{dayLogs.length === 0 ? (
						<p className={`text-xs italic ${muted} text-center py-8`}>No logs for this day.</p>
					) : (
						dayLogs.map((log) => (
							<div key={log.id} className="rounded-lg border border-[#3c3c3c] bg-[#161616]/40 p-3">
								<div className="flex justify-between items-start mb-1">
									<span className={`text-[10px] font-bold text-[#ea580c] uppercase`}>{log.hours} Hours</span>
									<span className={`text-[9px] font-mono ${muted}`}>{log.workerName}</span>
								</div>
								<p className={`text-xs font-semibold ${text} mb-1 truncate`}>{log.cardTitle}</p>
								<p className={`text-[11px] leading-snug italic ${muted}`}>"{log.description}"</p>
							</div>
						))
					)}
				</div>
			</section>
		</div>
	);
}
