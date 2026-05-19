/**
 * Claw UI — Schedules tab (Phase D).
 *
 * Definitions sync to **`<host>/.claw/schedule/claw-schedules.v1.json`**; the Bun server
 * runs enabled entries when **`WOP_CLAW_SCHEDULER=1`** and **`WOP_CHAT_ENGINE`** enables Pi.
 */
import { useState, useCallback, useMemo } from "react";
import {
	BookOpen,
	CalendarDays,
	CheckCircle2,
	ChevronUp,
	Clock,
	Edit2,
	Info,
	Plus,
	Trash2,
} from "lucide-react";
import {
	useClawSchedules,
	type ClawSchedule,
	type ScheduleStatus,
	type ScheduleTriggerMode,
} from "../../hooks/useClawSchedules";
import { useAgents, type AgentMeta } from "../../hooks/useAgents";
import { useClawAutomationStatus } from "../../hooks/useClawAutomationStatus";
import type { ServerConfig } from "../../hooks/useServerConfig";
import { ClawScheduleMonthCalendar } from "./ClawScheduleMonthCalendar";
import {
	formatYMDLocal,
	localYmdAndHmToISO,
	pad2,
	startOfLocalDay,
} from "../../utils/localCalendarDate";
import { scheduleAppliesToLocalDay } from "../../utils/clawScheduleDayMatch";
import type { ClawHelpSectionId } from "./ClawHelpModal";

// ──────────────────────────────────────────────
// Cron helpers
// ──────────────────────────────────────────────

const CRON_PRESETS: { label: string; value: string }[] = [
	{ label: "Every 30 minutes", value: "*/30 * * * *" },
	{ label: "Every hour", value: "0 * * * *" },
	{ label: "Every 2 hours", value: "0 */2 * * *" },
	{ label: "Weekday mornings (9 AM)", value: "0 9 * * 1-5" },
	{ label: "Daily at 9 AM", value: "0 9 * * *" },
	{ label: "Daily at 8 PM (digest)", value: "0 20 * * *" },
	{ label: "Every Monday at 9 AM", value: "0 9 * * 1" },
	{ label: "First day of month", value: "0 9 1 * *" },
	{ label: "Custom…", value: "custom" },
];

function humanCron(cron: string): string {
	if (!cron.trim()) return "—";
	const found = CRON_PRESETS.find((p) => p.value === cron && p.value !== "custom");
	return found?.label ?? cron;
}

function formatRunOnceLabel(iso: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "Invalid date";
	return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function relativeTime(iso: string | null): string {
	if (!iso) return "Never";
	const delta = Date.now() - new Date(iso).getTime();
	const mins = Math.floor(delta / 60000);
	if (mins < 1) return "Just now";
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	return `${Math.floor(hrs / 24)}d ago`;
}

// ──────────────────────────────────────────────
// Small design tokens (matching ClawMissionView)
// ──────────────────────────────────────────────

function Card({
	children,
	className = "",
	dark,
}: {
	children: React.ReactNode;
	className?: string;
	dark: boolean;
}) {
	return (
		<div
			className={`rounded-xl border ${
				dark ? "border-[#2a2a2a] bg-[#1e1e1e]" : "border-[#e5e5e5] bg-white shadow-sm"
			} ${className}`}
		>
			{children}
		</div>
	);
}

function Badge({
	status,
	dark,
}: {
	status: ScheduleStatus;
	dark: boolean;
}) {
	const isOn = status === "enabled";
	return (
		<span
			className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
				isOn
					? dark
						? "bg-[#4ec9b0]/15 text-[#4ec9b0]"
						: "bg-[#4ec9b0]/20 text-[#0a7a68]"
					: dark
						? "bg-[#3c3c3c] text-[#858585]"
						: "bg-[#f0f0f0] text-[#888888]"
			}`}
		>
			<span
				className={`h-1.5 w-1.5 rounded-full ${isOn ? "bg-[#4ec9b0]" : dark ? "bg-[#585858]" : "bg-[#aaaaaa]"}`}
			/>
			{isOn ? "Enabled" : "Disabled"}
		</span>
	);
}

// ──────────────────────────────────────────────
// Form state
// ──────────────────────────────────────────────

interface FormState {
	name: string;
	description: string;
	triggerMode: ScheduleTriggerMode;
	/** Local `YYYY-MM-DD` when `triggerMode` is `once`. */
	runOnceDate: string;
	/** Local `HH:mm` when `triggerMode` is `once`. */
	runOnceTime: string;
	selectedPreset: string;
	customCron: string;
	agentName: string;
	prompt: string;
	status: ScheduleStatus;
}

const EMPTY_FORM: FormState = {
	name: "",
	description: "",
	triggerMode: "cron",
	runOnceDate: "",
	runOnceTime: "09:00",
	selectedPreset: "0 9 * * 1-5",
	customCron: "",
	agentName: "",
	prompt: "",
	status: "enabled",
};

function effectiveCron(form: FormState): string {
	return form.selectedPreset === "custom" ? form.customCron : form.selectedPreset;
}

// ──────────────────────────────────────────────
// Schedule card
// ──────────────────────────────────────────────

function ScheduleCard({
	schedule,
	dark,
	onToggle,
	onEdit,
	onDelete,
}: {
	schedule: ClawSchedule;
	dark: boolean;
	onToggle: () => void;
	onEdit: () => void;
	onDelete: () => void;
}) {
	const muted = dark ? "text-[#858585]" : "text-[#888888]";
	const text = dark ? "text-[#cccccc]" : "text-[#444444]";
	const border = dark ? "border-[#2a2a2a]" : "border-[#f0f0f0]";

	return (
		<Card dark={dark}>
			<div className="flex items-start justify-between gap-3 px-4 pt-3 pb-2">
				{/* Left: name + meta */}
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<span className={`text-[13px] font-semibold ${text}`}>{schedule.name}</span>
						<Badge status={schedule.status} dark={dark} />
					</div>
					{schedule.description ? (
						<p className={`mt-0.5 text-[11px] ${muted}`}>{schedule.description}</p>
					) : null}
				</div>
				{/* Right: action buttons */}
				<div className="flex shrink-0 items-center gap-1">
					<button
						type="button"
						onClick={onToggle}
						title={schedule.status === "enabled" ? "Disable" : "Enable"}
						className={`rounded px-2 py-1.5 text-[10px] font-medium transition-colors ${
							dark
								? "text-[#858585] hover:bg-[#2a2a2a] hover:text-[#cccccc]"
								: "text-[#888888] hover:bg-[#f5f5f5] hover:text-[#333333]"
						}`}
					>
						{schedule.status === "enabled" ? "Disable" : "Enable"}
					</button>
					<button
						type="button"
						onClick={onEdit}
						title="Edit"
						className={`rounded p-1.5 transition-colors ${
							dark
								? "text-[#585858] hover:bg-[#2a2a2a] hover:text-[#cccccc]"
								: "text-[#aaaaaa] hover:bg-[#f5f5f5] hover:text-[#555555]"
						}`}
					>
						<Edit2 size={12} />
					</button>
					<button
						type="button"
						onClick={onDelete}
						title="Delete"
						className={`rounded p-1.5 transition-colors ${
							dark
								? "text-[#585858] hover:bg-[#f14c4c]/15 hover:text-[#f14c4c]"
								: "text-[#aaaaaa] hover:bg-[#fee2e2] hover:text-[#dc2626]"
						}`}
					>
						<Trash2 size={12} />
					</button>
				</div>
			</div>

			{/* Schedule meta row */}
			<div className={`flex flex-wrap gap-x-4 gap-y-1 border-t px-4 py-2.5 ${border}`}>
				<MetaItem icon={Clock} dark={dark}>
					{schedule.triggerMode === "once" && schedule.runOnceAt ? (
						<span className={`text-[10px] ${muted}`}>
							<span className="font-semibold">One time</span>
							<span className="ml-1">· {formatRunOnceLabel(schedule.runOnceAt)}</span>
						</span>
					) : (
						<>
							<span className={`font-mono text-[10px] ${muted}`}>{schedule.cron}</span>
							<span className={`ml-1 text-[10px] ${muted}`}>· {humanCron(schedule.cron)}</span>
						</>
					)}
				</MetaItem>
				{schedule.agentName ? (
					<MetaItem icon={CalendarDays} dark={dark}>
						<span className={`text-[11px] ${muted}`}>
							Agent: <span className={`font-mono text-[10px] ${dark ? "text-[#cccccc]" : "text-[#444444]"}`}>{schedule.agentName}</span>
						</span>
					</MetaItem>
				) : null}
				<MetaItem icon={Clock} dark={dark}>
					<span className={`text-[10px] ${muted}`}>Last run: {relativeTime(schedule.lastRun)}</span>
				</MetaItem>
			</div>

			{/* Prompt preview */}
			{schedule.prompt ? (
				<div className={`border-t px-4 py-2.5 ${border}`}>
					<p className={`truncate font-mono text-[10px] italic ${muted}`}>"{schedule.prompt}"</p>
				</div>
			) : null}
		</Card>
	);
}

function MetaItem({
	icon: Icon,
	dark,
	children,
}: {
	icon: typeof Clock;
	dark: boolean;
	children: React.ReactNode;
}) {
	return (
		<span className="flex items-center gap-1">
			<Icon size={10} className={dark ? "text-[#585858]" : "text-[#aaaaaa]"} />
			{children}
		</span>
	);
}

// ──────────────────────────────────────────────
// Schedule form (inline)
// ──────────────────────────────────────────────

function truncateAgentDescription(s: string, max = 56): string {
	const t = s.trim();
	if (t.length <= max) return t;
	return `${t.slice(0, max - 1)}…`;
}

function ScheduleForm({
	dark,
	initial,
	agents,
	agentsLoading,
	agentsError,
	onSave,
	onCancel,
}: {
	dark: boolean;
	initial: FormState;
	agents: AgentMeta[];
	agentsLoading: boolean;
	agentsError: string | null;
	onSave: (form: FormState) => void;
	onCancel: () => void;
}) {
	const [form, setForm] = useState<FormState>(initial);
	const update = useCallback(
		<K extends keyof FormState>(key: K, val: FormState[K]) =>
			setForm((prev) => ({ ...prev, [key]: val })),
		[],
	);
	const catalogNames = useMemo(() => new Set(agents.map((a) => a.name)), [agents]);

	const border = dark ? "border-[#2a2a2a]" : "border-[#e5e5e5]";
	const inputC = `w-full rounded-lg border px-3 py-2 text-[12px] outline-none transition-colors ${
		dark
			? "border-[#3c3c3c] bg-[#252526] text-[#cccccc] placeholder-[#585858] focus:border-[#fb923c]/60"
			: "border-[#d5d5d5] bg-white text-[#333333] placeholder-[#aaaaaa] focus:border-[#ea580c]/60"
	}`;
	const labelC = `mb-1 block text-[10px] font-semibold uppercase tracking-wider ${
		dark ? "text-[#858585]" : "text-[#888888]"
	}`;
	const accentBtn = `flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors ${
		dark
			? "bg-[#ea580c]/20 text-[#fb923c] hover:bg-[#ea580c]/30"
			: "bg-[#ea580c]/12 text-[#ea580c] hover:bg-[#ea580c]/20"
	}`;
	const ghostBtn = `rounded-lg px-3 py-2 text-[12px] font-medium transition-colors ${
		dark
			? "text-[#858585] hover:bg-[#2a2a2a] hover:text-[#cccccc]"
			: "text-[#888888] hover:bg-[#f5f5f5] hover:text-[#333333]"
	}`;
	const muted = dark ? "text-[#858585]" : "text-[#888888]";

	const isValid =
		Boolean(form.name.trim() && form.prompt.trim()) &&
		(form.triggerMode === "once"
			? Boolean(form.runOnceDate.trim())
			: Boolean(effectiveCron(form).trim()));

	const orphanAgentName =
		form.agentName.trim() && !catalogNames.has(form.agentName.trim())
			? form.agentName.trim()
			: null;

	return (
		<Card dark={dark}>
			<div className={`flex items-center justify-between border-b px-4 py-3 ${border}`}>
				<span className={`text-[11px] font-bold uppercase tracking-wider ${dark ? "text-[#858585]" : "text-[#888888]"}`}>
					{initial.name ? "Edit schedule" : "New schedule"}
				</span>
			</div>
			<div className="grid gap-4 p-4 sm:grid-cols-2">
				{/* Name */}
				<div className="sm:col-span-2">
					<label className={labelC}>Name *</label>
					<input
						className={inputC}
						placeholder="e.g. Daily standup digest"
						value={form.name}
						onChange={(e) => update("name", e.target.value)}
					/>
				</div>

				{/* Recurring vs one-time — ties to calendar day selection in the schedules view */}
				<div className="sm:col-span-2">
					<label className={labelC}>When to run *</label>
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							onClick={() => update("triggerMode", "cron")}
							className={`rounded-lg border px-3 py-2 text-[11px] font-semibold transition-colors ${
								form.triggerMode === "cron"
									? dark
										? "border-[#fb923c]/50 bg-[#ea580c]/15 text-[#fb923c]"
										: "border-[#ea580c]/50 bg-[#ea580c]/10 text-[#ea580c]"
									: dark
										? "border-[#3c3c3c] text-[#858585] hover:border-[#585858]"
										: "border-[#d5d5d5] text-[#888888] hover:border-[#aaaaaa]"
							}`}
						>
							Recurring (cron)
						</button>
						<button
							type="button"
							onClick={() => update("triggerMode", "once")}
							className={`rounded-lg border px-3 py-2 text-[11px] font-semibold transition-colors ${
								form.triggerMode === "once"
									? dark
										? "border-[#fb923c]/50 bg-[#ea580c]/15 text-[#fb923c]"
										: "border-[#ea580c]/50 bg-[#ea580c]/10 text-[#ea580c]"
									: dark
										? "border-[#3c3c3c] text-[#858585] hover:border-[#585858]"
										: "border-[#d5d5d5] text-[#888888] hover:border-[#aaaaaa]"
							}`}
						>
							One time (date and time)
						</button>
					</div>
					<p className={`mt-1.5 text-[10px] leading-snug ${muted}`}>
						{form.triggerMode === "once"
							? "Pick the local calendar day and time for a single run. The month grid highlights that day."
							: "Cron schedules appear on every calendar day they fire. Use presets or a custom expression."}
					</p>
				</div>

				{form.triggerMode === "cron" ? (
					<>
						<div>
							<label className={labelC}>Frequency *</label>
							<select
								className={`${inputC} cursor-pointer`}
								value={form.selectedPreset}
								onChange={(e) => update("selectedPreset", e.target.value)}
							>
								{CRON_PRESETS.map((p) => (
									<option key={p.value} value={p.value}>
										{p.label}
									</option>
								))}
							</select>
							{form.selectedPreset === "custom" && (
								<input
									className={`${inputC} mt-2 font-mono`}
									placeholder="Cron expression, e.g. 0 9 * * 1-5"
									value={form.customCron}
									onChange={(e) => update("customCron", e.target.value)}
								/>
							)}
						</div>
						<div>
							<label className={labelC} htmlFor="claw-schedule-agent">
								Agent (optional)
							</label>
							<select
								id="claw-schedule-agent"
								className={`${inputC} cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`}
								value={form.agentName}
								disabled={agentsLoading && agents.length === 0}
								onChange={(e) => update("agentName", e.target.value)}
							>
								<option value="">
									{agentsLoading && agents.length === 0
										? "Loading agents…"
										: "Default (workspace session agent)"}
								</option>
								{orphanAgentName ? (
									<option value={orphanAgentName}>
										{orphanAgentName} (not in current catalog)
									</option>
								) : null}
								{agents.map((a) => (
									<option key={a.name} value={a.name}>
										{a.name}
										{a.description ? ` — ${truncateAgentDescription(a.description)}` : ""}
									</option>
								))}
							</select>
							{agentsError ? (
								<p className={`mt-1 text-[10px] ${dark ? "text-[#f14c4c]/90" : "text-[#dc2626]"}`}>
									Agents list unavailable ({agentsError}). You can still use the default agent.
								</p>
							) : null}
						</div>
					</>
				) : (
					<>
						<div>
							<label className={labelC} htmlFor="claw-schedule-once-date">
								Date *
							</label>
							<input
								id="claw-schedule-once-date"
								type="date"
								className={`${inputC} cursor-pointer`}
								value={form.runOnceDate}
								onChange={(e) => update("runOnceDate", e.target.value)}
							/>
						</div>
						<div>
							<label className={labelC} htmlFor="claw-schedule-once-time">
								Time *
							</label>
							<input
								id="claw-schedule-once-time"
								type="time"
								className={`${inputC} cursor-pointer`}
								value={form.runOnceTime}
								onChange={(e) => update("runOnceTime", e.target.value)}
							/>
						</div>
						<div className="sm:col-span-2">
							<label className={labelC} htmlFor="claw-schedule-agent-once">
								Agent (optional)
							</label>
							<select
								id="claw-schedule-agent-once"
								className={`${inputC} cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`}
								value={form.agentName}
								disabled={agentsLoading && agents.length === 0}
								onChange={(e) => update("agentName", e.target.value)}
							>
								<option value="">
									{agentsLoading && agents.length === 0
										? "Loading agents…"
										: "Default (workspace session agent)"}
								</option>
								{orphanAgentName ? (
									<option value={orphanAgentName}>
										{orphanAgentName} (not in current catalog)
									</option>
								) : null}
								{agents.map((a) => (
									<option key={a.name} value={a.name}>
										{a.name}
										{a.description ? ` — ${truncateAgentDescription(a.description)}` : ""}
									</option>
								))}
							</select>
							{agentsError ? (
								<p className={`mt-1 text-[10px] ${dark ? "text-[#f14c4c]/90" : "text-[#dc2626]"}`}>
									Agents list unavailable ({agentsError}). You can still use the default agent.
								</p>
							) : null}
						</div>
					</>
				)}

				{/* Description */}
				<div className="sm:col-span-2">
					<label className={labelC}>Description</label>
					<input
						className={inputC}
						placeholder="What does this schedule do?"
						value={form.description}
						onChange={(e) => update("description", e.target.value)}
					/>
				</div>

				{/* Prompt */}
				<div className="sm:col-span-2">
					<label className={labelC}>Prompt / Task instruction *</label>
					<textarea
						className={`${inputC} min-h-[80px] resize-y`}
						placeholder="The instruction Pi will receive at each scheduled run…"
						value={form.prompt}
						onChange={(e) => update("prompt", e.target.value)}
					/>
				</div>

				{/* Status toggle */}
				<div className="flex items-center gap-3">
					<label className={labelC}>Start enabled</label>
					<button
						type="button"
						onClick={() => update("status", form.status === "enabled" ? "disabled" : "enabled")}
						className={`relative h-5 w-9 rounded-full transition-colors ${
							form.status === "enabled"
								? dark
									? "bg-[#4ec9b0]/60"
									: "bg-[#4ec9b0]/80"
								: dark
									? "bg-[#3c3c3c]"
									: "bg-[#d5d5d5]"
						}`}
					>
						<span
							className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
								form.status === "enabled" ? "left-4" : "left-0.5"
							}`}
						/>
					</button>
				</div>
			</div>

			{/* Actions */}
			<div className={`flex items-center justify-end gap-2 border-t px-4 py-3 ${border}`}>
				<button type="button" className={ghostBtn} onClick={onCancel}>
					Cancel
				</button>
				<button
					type="button"
					className={accentBtn}
					disabled={!isValid}
					onClick={() => isValid && onSave(form)}
				>
					<Plus size={13} />
					{initial.name ? "Save changes" : "Add schedule"}
				</button>
			</div>
		</Card>
	);
}

// ──────────────────────────────────────────────
// Calendar column: all tasks list (left of month grid)
// ──────────────────────────────────────────────

function ScheduleCalendarSideList({
	schedules,
	dark,
	selectedDay,
	onSelectSchedule,
}: {
	schedules: ClawSchedule[];
	dark: boolean;
	selectedDay: Date;
	onSelectSchedule: (s: ClawSchedule) => void;
}) {
	const border = dark ? "border-[#2a2a2a]" : "border-[#e5e5e5]";
	const cardBg = dark ? "bg-[#1e1e1e]" : "bg-white";
	const muted = dark ? "text-[#858585]" : "text-[#888888]";
	const text = dark ? "text-[#cccccc]" : "text-[#333333]";

	const sorted = useMemo(
		() => [...schedules].sort((a, b) => a.name.localeCompare(b.name)),
		[schedules],
	);

	function triggerLine(s: ClawSchedule): string {
		if (s.triggerMode === "once" && s.runOnceAt) {
			return `Once · ${formatRunOnceLabel(s.runOnceAt)}`;
		}
		return humanCron(s.cron);
	}

	return (
		<section
			className={`flex max-h-[min(40vh,320px)] min-h-0 w-full flex-col rounded-xl border shadow-sm sm:max-h-none lg:max-h-none ${border} ${cardBg}`}
			aria-label="All scheduled tasks"
		>
			<div className={`shrink-0 border-b px-3 py-2.5 ${border}`}>
				<p className={`text-[10px] font-bold uppercase tracking-wider ${muted}`}>All tasks</p>
				<p className={`mt-0.5 text-[11px] ${text}`}>
					{schedules.length === 0 ? "None yet" : `${schedules.length} schedule${schedules.length === 1 ? "" : "s"}`}
				</p>
			</div>
			<ul className="min-h-0 flex-1 list-none overflow-y-auto p-1.5">
				{sorted.length === 0 ? (
					<li className={`px-2 py-4 text-center text-[11px] ${muted}`}>Add a schedule in the main column.</li>
				) : (
					sorted.map((s) => {
						const appliesSelectedDay = scheduleAppliesToLocalDay(s, selectedDay);
						return (
							<li key={s.id} className="mb-1 last:mb-0">
								<button
									type="button"
									onClick={() => onSelectSchedule(s)}
									className={`w-full rounded-lg border px-2.5 py-2 text-left transition-colors ${
										appliesSelectedDay
											? dark
												? "border-[#2a2a2a] border-l-[3px] border-l-[#fb923c] bg-[#252526]"
												: "border-[#f0f0f0] border-l-[3px] border-l-[#ea580c] bg-[#fafafa]"
											: dark
												? "border-transparent hover:bg-[#252526]"
												: "border-transparent hover:bg-[#fafafa]"
									}`}
								>
									<div className="flex items-start justify-between gap-2">
										<span className={`min-w-0 flex-1 truncate text-[11px] font-semibold ${text}`}>{s.name}</span>
										<span
											className={`shrink-0 rounded px-1 py-0.5 text-[8px] font-bold uppercase ${
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
									<p className={`mt-0.5 line-clamp-2 text-[9px] leading-snug ${muted}`}>{triggerLine(s)}</p>
									{s.prompt ? (
										<p className={`mt-1 line-clamp-2 text-[9px] italic ${dark ? "text-[#585858]" : "text-[#aaaaaa]"}`}>
											{s.prompt}
										</p>
									) : null}
								</button>
							</li>
						);
					})
				)}
			</ul>
		</section>
	);
}

// ──────────────────────────────────────────────
// Main view
// ──────────────────────────────────────────────

function ScheduleExecutionNotice({
	dark,
	serverConfig,
}: {
	dark: boolean;
	serverConfig: ServerConfig;
}) {
	const { status: auto, loaded } = useClawAutomationStatus(30_000);
	const piReady = serverConfig.piDrivesChat === true;
	const schedulerOn = auto?.schedulerEnvEnabled === true;

	const base = "flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[11px] leading-relaxed";

	if (!loaded) {
		return (
			<div
				className={`${base} ${
					dark ? "border-[#2a2a2a] bg-[#1a1a1a] text-[#858585]" : "border-[#e5e5e5] bg-[#f9fafb] text-[#6b7280]"
				}`}
			>
				<Clock size={13} className="mt-0.5 shrink-0 opacity-70" aria-hidden />
				<span>Checking whether the server can run schedules on a timer…</span>
			</div>
		);
	}

	if (piReady && schedulerOn) {
		return (
			<div
				className={`${base} ${
					dark
						? "border-emerald-500/30 bg-emerald-500/10 text-[#a7f3d0]"
						: "border-emerald-600/25 bg-emerald-50 text-[#065f46]"
				}`}
			>
				<CheckCircle2
					size={13}
					className={`mt-0.5 shrink-0 ${dark ? "text-emerald-400" : "text-emerald-600"}`}
					aria-hidden
				/>
				<span>
					<strong className={dark ? "text-emerald-200" : "text-emerald-800"}>Automatic runs are on.</strong>{" "}
					Enabled schedules are evaluated about every 45 seconds and executed as headless Pi turns. Outputs go to
					host <span className="font-mono text-[10px]">.claw/workspace/memory/</span>; a short log is appended to{" "}
					<span className="font-mono text-[10px]">.claw/mission-events/claw-mission-events.v1.json</span>.
				</span>
			</div>
		);
	}

	if (!piReady) {
		return null;
	}

	return (
		<div
			className={`${base} ${
				dark ? "border-sky-500/25 bg-sky-950/40 text-[#94a3b8]" : "border-sky-200 bg-sky-50 text-[#0c4a6e]"
			}`}
		>
			<Info size={13} className={`mt-0.5 shrink-0 ${dark ? "text-sky-300" : "text-sky-600"}`} aria-hidden />
			<span>
				<strong className={dark ? "text-sky-100" : "text-sky-900"}>Pi is ready.</strong> Set{" "}
				<span className="font-mono text-[10px]">WOP_CLAW_SCHEDULER=1</span> on the Way of Pi Bun server and restart so
				the timer starts. Schedules are stored under host{" "}
				<span className="font-mono text-[10px]">.claw/schedule/</span>.
			</span>
		</div>
	);
}

export function ClawSchedulesView({
	dark,
	onOpenClawHelp,
	serverConfig,
}: {
	dark: boolean;
	/** Opens Claw Help (Schedules section has Phase D roadmap). */
	onOpenClawHelp?: (section?: ClawHelpSectionId | null) => void;
	/** From **`GET /api/config`** — drives execution-status copy (Pi + scheduler). */
	serverConfig?: ServerConfig | null;
}) {
	const { schedules, hydrated, syncError, addSchedule, updateSchedule, deleteSchedule, toggleSchedule } =
		useClawSchedules();
	const { data: agentsData, loading: agentsLoading, error: agentsError } = useAgents();
	const agentsSorted = useMemo(() => {
		const list = agentsData?.agents ?? [];
		return [...list].sort((a, b) => a.name.localeCompare(b.name));
	}, [agentsData?.agents]);

	const [showForm, setShowForm] = useState(false);
	const [editId, setEditId] = useState<string | null>(null);
	const [formKey, setFormKey] = useState(0);
	const [calendarSelectedDay, setCalendarSelectedDay] = useState(() => startOfLocalDay(new Date()));

	const bg = dark ? "bg-[#161616]" : "bg-[#f5f5f5]";
	const text = dark ? "text-[#cccccc]" : "text-[#333333]";
	const muted = dark ? "text-[#858585]" : "text-[#888888]";
	const accentBtn = `flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors ${
		dark
			? "bg-[#ea580c]/20 text-[#fb923c] hover:bg-[#ea580c]/30"
			: "bg-[#ea580c]/12 text-[#ea580c] hover:bg-[#ea580c]/20"
	}`;

	const editingSchedule = editId ? schedules.find((s) => s.id === editId) ?? null : null;

	function formInitial(): FormState {
		if (editingSchedule) {
			const preset = CRON_PRESETS.find(
				(p) => p.value === editingSchedule.cron && p.value !== "custom",
			);
			const base = {
				name: editingSchedule.name,
				description: editingSchedule.description,
				selectedPreset: preset ? editingSchedule.cron : "custom",
				customCron: preset ? "" : editingSchedule.cron,
				agentName: editingSchedule.agentName ?? "",
				prompt: editingSchedule.prompt,
				status: editingSchedule.status,
			};
			if (editingSchedule.triggerMode === "once" && editingSchedule.runOnceAt) {
				const d = new Date(editingSchedule.runOnceAt);
				const valid = !Number.isNaN(d.getTime());
				return {
					...base,
					triggerMode: "once",
					runOnceDate: valid ? formatYMDLocal(d) : "",
					runOnceTime: valid ? `${pad2(d.getHours())}:${pad2(d.getMinutes())}` : "09:00",
				};
			}
			return {
				...base,
				triggerMode: "cron",
				runOnceDate: "",
				runOnceTime: "09:00",
			};
		}
		return {
			...EMPTY_FORM,
			runOnceDate: formatYMDLocal(calendarSelectedDay),
		};
	}

	function handleSave(form: FormState) {
		const cron = effectiveCron(form);
		let triggerMode: ScheduleTriggerMode;
		let runOnceAt: string | null;
		if (form.triggerMode === "once") {
			if (!form.runOnceDate.trim()) return;
			runOnceAt = localYmdAndHmToISO(form.runOnceDate.trim(), form.runOnceTime || "09:00");
			triggerMode = "once";
		} else {
			triggerMode = "cron";
			runOnceAt = null;
		}
		const storageCron = triggerMode === "once" ? "" : cron;

		if (editId) {
			updateSchedule(editId, {
				name: form.name.trim(),
				description: form.description.trim(),
				cron: storageCron,
				triggerMode,
				runOnceAt,
				agentName: form.agentName.trim() || null,
				prompt: form.prompt.trim(),
				status: form.status,
			});
			setEditId(null);
		} else {
			addSchedule({
				name: form.name.trim(),
				description: form.description.trim(),
				cron: storageCron,
				triggerMode,
				runOnceAt,
				agentName: form.agentName.trim() || null,
				prompt: form.prompt.trim(),
				status: form.status,
			});
		}
		setShowForm(false);
		setFormKey((k) => k + 1);
	}

	function handleEdit(s: ClawSchedule) {
		setEditId(s.id);
		setShowForm(true);
	}

	function handleSelectFromSideList(s: ClawSchedule) {
		if (s.triggerMode === "once" && s.runOnceAt) {
			const d = new Date(s.runOnceAt);
			if (!Number.isNaN(d.getTime())) setCalendarSelectedDay(startOfLocalDay(d));
		}
		handleEdit(s);
	}

	function handleCancel() {
		setShowForm(false);
		setEditId(null);
		setFormKey((k) => k + 1);
	}

	function handleNewClick() {
		setEditId(null);
		setFormKey((k) => k + 1);
		setShowForm((v) => !v);
	}

	const enabledCount = schedules.filter((s) => s.status === "enabled").length;

	return (
		<div className={`flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden p-4 ${bg} ${text}`}>
			<div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 lg:flex-row lg:items-stretch">
				{/* ── Main column (list + form) ── */}
				<div
					className={`flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto pr-0 lg:pr-2 ${text}`}
				>
					{/* ── Header ── */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2.5">
							<CalendarDays size={18} className={dark ? "text-[#fb923c]" : "text-[#ea580c]"} />
							<h1 className={`text-[16px] font-bold ${text}`}>Schedules</h1>
							{schedules.length > 0 && (
								<span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
									dark ? "bg-[#2a2a2a] text-[#858585]" : "bg-[#e5e5e5] text-[#888888]"
								}`}>
									{enabledCount} / {schedules.length} enabled
								</span>
							)}
						</div>
						<button
							type="button"
							className={accentBtn}
							onClick={handleNewClick}
						>
							{showForm && !editId ? (
								<>
									<ChevronUp size={13} /> Hide form
								</>
							) : (
								<>
									<Plus size={13} /> New schedule
								</>
							)}
						</button>
					</div>

					{serverConfig ? (
						<ScheduleExecutionNotice dark={dark} serverConfig={serverConfig} />
					) : (
						<div className={`rounded-xl border px-4 py-3 text-[11px] ${dark ? "border-[#2a2a2a] text-[#858585]" : "border-[#e5e5e5] text-[#6b7280]"}`}>
							Loading server status…
						</div>
					)}
					{syncError ? (
						<p
							className={`font-mono text-[10px] leading-snug ${dark ? "text-red-400" : "text-red-600"}`}
							title={syncError}
						>
							{syncError.length > 200 ? `${syncError.slice(0, 197)}…` : syncError}
						</p>
					) : null}

					{/* ── Form ── */}
					{showForm && (
						<ScheduleForm
							key={formKey}
							dark={dark}
							initial={formInitial()}
							agents={agentsSorted}
							agentsLoading={agentsLoading}
							agentsError={agentsError}
							onSave={handleSave}
							onCancel={handleCancel}
						/>
					)}

					{/* ── Schedule list ── */}
					{!hydrated ? (
						<div
							className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 ${
								dark ? "border-[#2a2a2a] text-[#858585]" : "border-[#d5d5d5] text-[#6b7280]"
							}`}
						>
							<Clock size={32} className="opacity-40" aria-hidden />
							<p className="text-[13px] font-medium">Loading schedules…</p>
							<p className={`max-w-sm text-center text-[11px] ${muted}`}>Syncing with the server under .claw/schedule/</p>
						</div>
					) : schedules.length === 0 ? (
						<div
							className={`flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-16 ${
								dark ? "border-[#2a2a2a]" : "border-[#d5d5d5]"
							}`}
						>
							<CalendarDays
								size={36}
								className={`${dark ? "text-[#3c3c3c]" : "text-[#d5d5d5]"}`}
							/>
							<div className="text-center">
								<p className={`text-[13px] font-medium ${muted}`}>No schedules yet</p>
								<p className={`mt-1 text-[11px] ${dark ? "text-[#585858]" : "text-[#aaaaaa]"}`}>
									Add a schedule to run Pi turns automatically on a timer.
								</p>
							</div>
							<button
								type="button"
								className={accentBtn}
								onClick={() => {
									setEditId(null);
									setShowForm(true);
								}}
							>
								<Plus size={13} /> Add your first schedule
							</button>
						</div>
					) : (
						<div className="flex flex-col gap-3">
							{schedules.map((s) => (
								<ScheduleCard
									key={s.id}
									schedule={s}
									dark={dark}
									onToggle={() => toggleSchedule(s.id)}
									onEdit={() => handleEdit(s)}
									onDelete={() => deleteSchedule(s.id)}
								/>
							))}
						</div>
					)}

					{onOpenClawHelp ? (
						<button
							type="button"
							onClick={() => onOpenClawHelp("schedules")}
							className={`flex w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-2.5 text-[11px] font-medium transition-colors ${
								dark
									? "border-[#2a2a2a] text-[#fb923c] hover:bg-[#ea580c]/10"
									: "border-[#d5d5d5] text-[#ea580c] hover:bg-[#ea580c]/8"
							}`}
						>
							<BookOpen size={14} className="shrink-0" />
							<span>Schedules help & cron tips — open Help</span>
						</button>
					) : null}

					<div className="h-6 shrink-0 lg:hidden" />
				</div>

				{/* ── All tasks list + month calendar (wide: list left of calendar) ── */}
				<aside className="flex w-full shrink-0 flex-col gap-3 lg:sticky lg:top-0 lg:max-h-[calc(100vh-6rem)] lg:w-[min(100%,680px)] lg:flex-row lg:items-stretch lg:self-start lg:overflow-hidden">
					<div className="flex min-h-[min(40vh,280px)] min-w-0 shrink-0 flex-col lg:min-h-0 lg:w-[min(100%,260px)] lg:max-w-[280px]">
						<ScheduleCalendarSideList
							dark={dark}
							schedules={schedules}
							selectedDay={calendarSelectedDay}
							onSelectSchedule={handleSelectFromSideList}
						/>
					</div>
					<div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
						<ClawScheduleMonthCalendar
							dark={dark}
							schedules={schedules}
							selectedDate={calendarSelectedDay}
							onSelectDate={setCalendarSelectedDay}
						/>
					</div>
				</aside>
			</div>
		</div>
	);
}
