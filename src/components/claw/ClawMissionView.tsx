import {
	Activity,
	AlertTriangle,
	BookOpen,
	Bot,
	CalendarDays,
	CheckCircle2,
	Cpu,
	ExternalLink,
	FileText,
	MessageCircle,
	Play,
	Radio,
	RefreshCw,
	Shield,
	Terminal,
	Users,
	Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { AgentMeta } from "../../hooks/useAgents";
import { useClawAutomationStatus } from "../../hooks/useClawAutomationStatus";
import { useClawMissionEvents } from "../../hooks/useClawMissionEvents";
import type { LogRow } from "../../hooks/useWayOfPiSession";
import type { ServerConfig } from "../../hooks/useServerConfig";
import type { ClawHelpSectionId } from "./ClawHelpModal";
import type { UseClawWorkspaceResult } from "../../hooks/useClawWorkspace";
import { ClawWorkspaceCard } from "./ClawWorkspaceCard";

const CLAW_ACTIVITY_LIMIT_KEY = "wayofpi.claw.activityLimit";
const ACTIVITY_LIMIT_OPTIONS = [10, 20, 50, 100] as const;

function readStoredActivityLimit(): (typeof ACTIVITY_LIMIT_OPTIONS)[number] {
	try {
		const raw = localStorage.getItem(CLAW_ACTIVITY_LIMIT_KEY);
		const n = raw ? Number.parseInt(raw, 10) : NaN;
		if ((ACTIVITY_LIMIT_OPTIONS as readonly number[]).includes(n)) {
			return n as (typeof ACTIVITY_LIMIT_OPTIONS)[number];
		}
	} catch {
		/* ignore */
	}
	return 20;
}

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

function CardHeader({
	icon: Icon,
	title,
	dark,
	action,
}: {
	icon: typeof Activity;
	title: string;
	dark: boolean;
	action?: React.ReactNode;
}) {
	return (
		<div
			className={`flex items-center justify-between border-b px-4 py-3 ${
				dark ? "border-[#2a2a2a]" : "border-[#f0f0f0]"
			}`}
		>
			<div className="flex items-center gap-2">
				<Icon
					size={14}
					className={dark ? "text-[#fb923c]" : "text-[#ea580c]"}
				/>
				<span
					className={`text-[11px] font-bold uppercase tracking-wider ${
						dark ? "text-[#858585]" : "text-[#888888]"
					}`}
				>
					{title}
				</span>
			</div>
			{action}
		</div>
	);
}

function StatusDot({ ok, dark }: { ok: boolean; dark: boolean }) {
	return (
		<span
			className={`inline-flex h-2 w-2 shrink-0 rounded-full ${
				ok ? "bg-[#4ec9b0]" : dark ? "bg-[#f14c4c]" : "bg-[#cd3131]"
			}`}
		/>
	);
}

function EngineChip({ config, dark }: { config: ServerConfig | null; dark: boolean }) {
	if (!config) return <span className={`text-[11px] ${dark ? "text-[#858585]" : "text-[#888888]"}`}>…</span>;
	const ispi = config.piDrivesChat;
	const piRequested = config.piChatEngineRequested === true;
	const strictPi = (config.chatEngine || "").toLowerCase() === "pi";
	const piMissingStrict = piRequested && config.piBinaryResolved !== true && strictPi;
	const piSoftNoCli = piRequested && config.piBinaryResolved !== true && !strictPi;
	const piRequestedButNotDriving = piRequested && config.piBinaryResolved === true && !ispi;
	const bunProductionOk = !piRequested && !ispi;
	const chipOk = ispi || bunProductionOk || piSoftNoCli;
	return (
		<span
			className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
				chipOk
					? dark
						? "bg-[#4ec9b0]/15 text-[#4ec9b0]"
						: "bg-[#4ec9b0]/20 text-[#0a7a68]"
					: dark
						? "bg-[#fb923c]/15 text-[#fb923c]"
						: "bg-[#ea580c]/12 text-[#c2410c]"
			}`}
			title={
				piMissingStrict
					? "WOP_CHAT_ENGINE=pi requires the Pi CLI — set WOP_PI_BINARY or fix PATH (Host Doctor)."
					: piSoftNoCli
						? "Built-in assistant — chat is running on this setup."
						: piRequestedButNotDriving
							? "Pi CLI resolves but chat is not in Pi JSON mode — check orchestration override and restart."
							: bunProductionOk
								? "Bun-only engine (bundled/bun). Pi is off until you change WOP_CHAT_ENGINE."
								: undefined
			}
		>
			<span
				className={`h-1.5 w-1.5 rounded-full ${chipOk ? "bg-[#4ec9b0]" : "bg-[#fb923c]"}`}
			/>
			{ispi
				? "Pi engine"
				: piMissingStrict
					? "Pi required (no CLI)"
					: piRequestedButNotDriving
						? "Pi idle (Bun chat)"
						: piSoftNoCli
							? `Bun · ${config.provider ?? "ollama"}`
							: config.chatEngine === "auto"
								? "auto (Bun)"
								: `Bun · ${config.provider ?? "ollama"}`}
		</span>
	);
}

/** Mission control dashboard for Claw UI. */
export function ClawMissionView({
	config,
	connected,
	streaming,
	agents,
	agentsLoading,
	logs,
	workspacePath,
	onStartChat,
	onNewPlan,
	onOpenHostDoctor,
	onSwitchToTeam,
	onSwitchToSchedule,
	onSwitchToChannels,
	onOpenFile,
	onOpenClawHelp,
	dark,
	clawWorkspace,
}: {
	config: ServerConfig | null;
	connected: boolean;
	streaming: boolean;
	agents: AgentMeta[];
	agentsLoading: boolean;
	logs: LogRow[];
	workspacePath: string;
	onStartChat: () => void;
	onNewPlan: () => void;
	onOpenHostDoctor: () => void;
	onSwitchToTeam: () => void;
	onSwitchToSchedule?: () => void;
	onSwitchToChannels?: () => void;
	/** Navigate to a workspace file (switches to Files tab and opens it). */
	onOpenFile: (path: string) => void;
	/** Opens Claw Help; omit section for Overview (product roadmap). */
	onOpenClawHelp?: (section?: ClawHelpSectionId | null) => void;
	dark: boolean;
	clawWorkspace: UseClawWorkspaceResult;
}) {
	const bg = dark ? "bg-[#161616]" : "bg-[#f5f5f5]";
	const text = dark ? "text-[#cccccc]" : "text-[#333333]";
	const muted = dark ? "text-[#858585]" : "text-[#888888]";
	const sep = dark ? "border-[#252526]" : "border-[#e5e5e5]";

	const [activityLimit, setActivityLimit] = useState(readStoredActivityLimit);
	const recentLogs = useMemo(
		() => logs.slice(-activityLimit).reverse(),
		[logs, activityLimit],
	);

	const { status: clawAuto, error: clawAutoError, loaded: clawAutoLoaded } = useClawAutomationStatus();
	const { events: missionEvents } = useClawMissionEvents();

	const engineStatusLine = useMemo(() => {
		if (!config) {
			return {
				icon: AlertTriangle,
				value: "Loading server config…",
				ok: false,
				planned: true,
			};
		}
		if (config.piDrivesChat) {
			return {
				icon: CheckCircle2,
				value: "Full Pi assistant is on — same stack as the Pi terminal app",
				ok: true,
				planned: false,
			};
		}
		if (config.piChatEngineRequested && !config.piBinaryResolved) {
			const strictPi = (config.chatEngine || "").toLowerCase() === "pi";
			if (strictPi) {
				return {
					icon: AlertTriangle,
					value: "Pi-only mode is on, but the Pi program was not found",
					ok: false,
					planned: false,
					detail:
						"Install the Pi coding agent, or ask a technical person to fix it. Host Doctor shows paths. Restart the app after changes.",
				};
			}
			return {
				icon: CheckCircle2,
				value: "Built-in assistant is on",
				ok: true,
				planned: false,
			};
		}
		if (config.piChatEngineRequested && config.piBinaryResolved) {
			return {
				icon: AlertTriangle,
				value: "Pi is installed, but chat is still using the built-in path",
				ok: false,
				planned: false,
				detail:
					"Technical → Extensions → turn on “Pi drives chat”, or restart the app. Host Doctor can help.",
			};
		}
		return {
			icon: AlertTriangle,
			value: "Built-in-only mode — advanced Pi features are off",
			ok: false,
			planned: false,
			detail:
				"A technical person can switch the chat engine in the app settings or .env file, then restart the server.",
		};
	}, [config]);

	const statusStripClass = useMemo(() => {
		if (!connected) {
			return dark
				? "border-[#f14c4c]/30 bg-[#f14c4c]/08"
				: "border-[#fecaca] bg-[#fef2f2]";
		}
		const engineBad = !engineStatusLine.ok && !engineStatusLine.planned;
		if (engineBad) {
			return dark
				? "border-[#ea580c]/20 bg-[#ea580c]/5"
				: "border-[#ea580c]/15 bg-[#ea580c]/5";
		}
		return dark
			? "border-[#2a7a68]/22 bg-[#4ec9b0]/07"
			: "border-[#bbf7d0] bg-[#f0fdf4]";
	}, [connected, dark, engineStatusLine.ok, engineStatusLine.planned]);

	const orchestratorStatusLine = useMemo(() => {
		if (!config) {
			return {
				icon: AlertTriangle,
				value: "Loading server config…",
				ok: false,
				planned: true,
				detail: undefined as string | undefined,
			};
		}
		if (config.piDrivesChat) {
			return {
				icon: CheckCircle2,
				value: "Tools run inside Pi",
				ok: true,
				planned: false,
				detail: undefined as string | undefined,
			};
		}
		if (config.orchestratorTools) {
			return {
				icon: CheckCircle2,
				value: "On — assistant can read, search, and edit files during chat",
				ok: true,
				planned: false,
				detail: undefined as string | undefined,
			};
		}
		return {
			icon: CheckCircle2,
			value: "Off — assistant does not get file helpers during chat",
			ok: true,
			planned: false,
			detail: "Turn on in Technical → Extensions if you want read/search/write in chat.",
		};
	}, [config]);

	const schedulesChannelsLine = useMemo(() => {
		const embedded =
			(config?.clawAutomation as any)?.version === 1 ? config?.clawAutomation as any : null;
		const auto = embedded ?? clawAuto;
		const automationDataLoaded = clawAutoLoaded || embedded != null;
		/** Same gate as Chat + Claw executor: trust Engine (`piDrivesChat`) so Mission rows cannot disagree. */
		const piReadyForAutomations =
			config?.piDrivesChat === true || auto?.piAutomationReady === true;

		if (!automationDataLoaded && !auto) {
			return { icon: AlertTriangle, value: "Loading schedule info…", ok: false, planned: true };
		}
		if (clawAutoError && !auto) {
			const short =
				clawAutoError.length > 140 ? `${clawAutoError.slice(0, 137)}…` : clawAutoError;
			return { icon: AlertTriangle, value: short, ok: false, planned: true };
		}
		if (!auto) {
			return {
				icon: AlertTriangle,
				value: "Could not load schedule info — chat still works",
				ok: false,
				planned: true,
			};
		}

		const logNote =
			missionEvents.length > 0 ? ` · ${missionEvents.length} recent events in the log` : "";

		/** Stale **`GET /api/config`** embed can lag; **`/api/claw/automation`** updates right after a save. */
		const schedulesOnDiskMerged =
			embedded?.schedulesOnDisk === true || clawAuto?.schedulesOnDisk === true;

		if (!piReadyForAutomations) {
			const disk = schedulesOnDiskMerged ? "schedules saved" : "no schedules saved yet";
			return {
				icon: CheckCircle2,
				value: `Claw is ready (${disk})${logNote}`,
				ok: true,
				planned: false,
			};
		}

		const sch = auto.schedulerRunning
			? "Timer is running"
			: auto.schedulerEnvEnabled
				? "Timer is on"
				: "Timer is off (optional)";
		const wh = auto.webhookInboundEnabled
			? "Outside messages: on"
			: auto.webhookSecretConfigured
				? "Outside messages: partly set up"
				: "Outside messages: off (optional)";
		return {
			icon: CheckCircle2,
			value: `Claw: ${sch} · ${wh}${logNote}`,
			ok: true,
			planned: false,
		};
	}, [
		clawAuto,
		clawAutoError,
		clawAutoLoaded,
		config?.clawAutomation,
		config?.piDrivesChat,
		missionEvents.length,
	]);

	const activitySelectClass = `cursor-pointer rounded border px-1.5 py-0.5 text-[10px] font-medium outline-none ${
		dark
			? "border-[#3c3c3c] bg-[#252526] text-[#cccccc] hover:border-[#505050]"
			: "border-[#d5d5d5] bg-white text-[#333333] hover:border-[#c0c0c0]"
	}`;

	return (
		<div className={`flex min-h-0 min-w-0 w-full flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto p-4 ${bg} ${text}`}>
			{/* ── Status strip ── */}
			<div className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${statusStripClass}`}>
				<div className="flex items-center gap-2">
					<StatusDot ok={connected} dark={dark} />
					<span className={`text-[12px] font-medium ${connected ? (dark ? "text-[#4ec9b0]" : "text-[#0a7a68]") : (dark ? "text-[#f14c4c]" : "text-[#cd3131]")}`}>
						{connected ? "Connected" : "Disconnected"}
					</span>
				</div>
				<span className={`text-[11px] ${sep} border-l pl-3 ${muted}`}>Engine:</span>
				<EngineChip config={config} dark={dark} />
				<span className={`hidden truncate text-[11px] sm:block ${sep} border-l pl-3 ${muted}`}>
					<span className="mr-1 font-mono text-[10px]">ws:</span>
					{workspacePath === "—" ? <span className={muted}>No folder open</span> : workspacePath}
				</span>
				{streaming ? (
					<span
						className={`ml-auto flex items-center gap-1 text-[11px] font-semibold ${
							dark ? "text-[#fb923c]" : "text-[#ea580c]"
						}`}
					>
						<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
						Running…
					</span>
				) : null}
			</div>

			{/* ── Main grid ── */}
			<div className="grid min-h-0 gap-4 lg:grid-cols-3">
				{/* Left column: Quick actions + Agents */}
				<div className="flex min-w-0 flex-col gap-4">
					{/* Quick actions */}
					<Card dark={dark}>
						<CardHeader icon={Zap} title="Quick actions" dark={dark} />
						<div className="flex flex-col gap-1.5 p-3">
							<QuickBtn
								icon={MessageCircle}
								label="Open Chat"
								desc="Start or continue conversation"
								dark={dark}
								onClick={onStartChat}
								accent
							/>
							<QuickBtn
								icon={FileText}
								label="New Plan"
								desc="plans/PLAN-….md"
								dark={dark}
								onClick={onNewPlan}
							/>
							<QuickBtn
								icon={Users}
								label="My Team"
								desc="View and manage agents"
								dark={dark}
								onClick={onSwitchToTeam}
							/>
						<QuickBtn
							icon={Terminal}
							label="Host Doctor"
							desc="Workspace and env diagnostics"
							dark={dark}
							onClick={onOpenHostDoctor}
						/>
						<QuickBtn
							icon={CalendarDays}
							label="Schedules"
							desc="Timer-driven Pi turns (server runner when enabled)"
							dark={dark}
							onClick={onSwitchToSchedule ?? (() => {})}
						/>
						<QuickBtn
							icon={Radio}
							label="Channels"
							desc="Telegram + inbound webhook (Phase E)"
							dark={dark}
							onClick={onSwitchToChannels ?? (() => {})}
						/>
						{onOpenClawHelp ? (
							<QuickBtn
								icon={BookOpen}
								label="Claw roadmap & help"
								desc="Build order, phases — opens Help"
								dark={dark}
								onClick={() => onOpenClawHelp()}
							/>
						) : null}
						</div>
					</Card>

					{/* Claw status legend */}
					<Card dark={dark}>
						<CardHeader icon={Shield} title="Claw status" dark={dark} />
						<div className="flex flex-col gap-2.5 p-4">
							<StatusRow
								icon={engineStatusLine.icon}
								label="Engine"
								value={engineStatusLine.value}
								ok={engineStatusLine.ok}
								planned={engineStatusLine.planned}
								detail={engineStatusLine.detail}
								dark={dark}
							/>
							<StatusRow
								icon={orchestratorStatusLine.icon}
								label="Chat file helpers"
								value={orchestratorStatusLine.value}
								ok={orchestratorStatusLine.ok}
								planned={orchestratorStatusLine.planned}
								detail={orchestratorStatusLine.detail}
								dark={dark}
							/>
							<StatusRow
								icon={schedulesChannelsLine.icon}
								label="Schedules / channels"
								value={schedulesChannelsLine.value}
								ok={schedulesChannelsLine.ok}
								planned={schedulesChannelsLine.planned}
								dark={dark}
							/>
							<button
								type="button"
								onClick={onOpenHostDoctor}
								className={`mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-medium transition-colors ${
									dark
										? "border-[#2a2a2a] text-[#858585] hover:border-[#3c3c3c] hover:text-[#cccccc]"
										: "border-[#e5e5e5] text-[#888888] hover:border-[#d5d5d5] hover:text-[#333333]"
								}`}
							>
								<ExternalLink size={11} />
								Full diagnostics
							</button>
						</div>
					</Card>

				{/* Claw workspace */}
				<ClawWorkspaceCard
					ws={clawWorkspace}
					workspacePath={workspacePath}
					dark={dark}
					onOpenFile={onOpenFile}
					onOpenChannels={onSwitchToChannels}
					hostClawDirAbs={config?.clawWorkspaceDirAbs}
				/>
				</div>

				{/* Center: Activity feed */}
				<div className="lg:col-span-2 flex min-w-0 flex-col gap-4">
					<Card dark={dark} className="flex min-h-0 flex-col">
						<CardHeader
							icon={Activity}
							title="Activity"
							dark={dark}
							action={
								<div className={`flex flex-wrap items-center justify-end gap-1.5 text-[10px] ${muted}`}>
									<span className="whitespace-nowrap">Last</span>
									<select
										id="claw-activity-limit"
										aria-label="How many recent activity events to show"
										className={activitySelectClass}
										value={activityLimit}
										onChange={(e) => {
											const n = Number.parseInt(e.target.value, 10) as (typeof ACTIVITY_LIMIT_OPTIONS)[number];
											setActivityLimit(n);
											try {
												localStorage.setItem(CLAW_ACTIVITY_LIMIT_KEY, String(n));
											} catch {
												/* ignore */
											}
										}}
									>
										{ACTIVITY_LIMIT_OPTIONS.map((n) => (
											<option key={n} value={n}>
												{n}
											</option>
										))}
									</select>
									<span className="whitespace-nowrap">events</span>
									{logs.length > activityLimit ? (
										<span className={`whitespace-nowrap ${dark ? "text-[#585858]" : "text-[#aaaaaa]"}`}>
											({logs.length} total)
										</span>
									) : null}
								</div>
							}
						/>
						<div className="min-h-[200px] overflow-y-auto">
							{recentLogs.length === 0 ? (
								<div className={`flex flex-col items-center justify-center gap-3 py-12 ${muted}`}>
									<Radio size={28} className="opacity-30" />
									<span className="text-[12px]">No activity yet — start a chat or run an agent.</span>
								</div>
							) : (
								<ul className="divide-y divide-transparent p-1">
									{recentLogs.map((log, i) => (
										<ActivityRow key={i} log={log} dark={dark} />
									))}
								</ul>
							)}
						</div>
					</Card>

					<Card dark={dark} className="flex max-h-[220px] min-h-0 flex-col">
						<CardHeader icon={Play} title="Automation log" dark={dark} />
						<div className={`min-h-0 overflow-y-auto px-3 py-2 text-[11px] ${muted}`}>
							{missionEvents.length === 0 ? (
								<span>
									Schedule and webhook runs append here (and to host{" "}
									<span className="font-mono text-[10px]">.claw/workspace/memory/</span>) once Pi executes
									them.
								</span>
							) : null}
							{missionEvents.length > 0 ? (
								<ul className="flex flex-col gap-2">
									{missionEvents.slice(0, 12).map((ev, i) => (
										<li
											key={`${ev.at}-${i}`}
											className={`rounded border px-2 py-1.5 ${
												dark ? "border-[#2a2a2a] bg-[#252526]" : "border-[#f0f0f0] bg-[#fafafa]"
											}`}
										>
											<div className="flex items-center justify-between gap-2">
												<span className={`font-mono text-[10px] ${muted}`}>
													{ev.at.replace("T", " ").slice(0, 19)}
												</span>
												<span
													className={
														ev.ok
															? dark
																? "text-[#4ec9b0]"
																: "text-[#0a7a68]"
															: dark
																? "text-[#fb923c]"
																: "text-[#c2410c]"
													}
												>
													{ev.ok ? "ok" : "error"}
												</span>
											</div>
											<div className={`mt-0.5 font-medium ${text}`}>{ev.name}</div>
											{ev.error ? (
												<div className={`mt-1 line-clamp-2 text-[10px] ${muted}`}>{ev.error}</div>
											) : null}
										</li>
									))}
								</ul>
							) : null}
						</div>
					</Card>

					{/* Agent roster summary */}
					<Card dark={dark}>
						<CardHeader
							icon={Bot}
							title="Agent roster"
							dark={dark}
							action={
								<button
									type="button"
									onClick={onSwitchToTeam}
									className={`flex items-center gap-1 text-[10px] font-medium ${
										dark ? "text-[#fb923c] hover:text-[#fed7aa]" : "text-[#ea580c] hover:text-[#9a3412]"
									}`}
								>
									Manage <ExternalLink size={9} />
								</button>
							}
						/>
						{agentsLoading ? (
							<div className={`flex items-center justify-center py-6 ${muted}`}>
								<RefreshCw size={14} className="animate-spin mr-2" />
								<span className="text-[12px]">Loading agents…</span>
							</div>
						) : agents.length === 0 ? (
							<div className={`py-6 text-center text-[12px] ${muted}`}>
								No agents found in <span className="font-mono text-[11px]">.pi/agents/</span>
							</div>
						) : (
							<div className="flex flex-wrap gap-2 p-3">
								{agents.slice(0, 12).map((a) => (
									<AgentPill key={a.name} agent={a} dark={dark} />
								))}
								{agents.length > 12 ? (
									<button
										type="button"
										onClick={onSwitchToTeam}
										className={`rounded-full border px-3 py-1 text-[11px] font-medium ${
											dark
												? "border-[#3c3c3c] text-[#858585] hover:text-[#cccccc]"
												: "border-[#e5e5e5] text-[#888888] hover:text-[#333333]"
										}`}
									>
										+{agents.length - 12} more
									</button>
								) : null}
							</div>
						)}
					</Card>
				</div>
			</div>
		</div>
	);
}

function QuickBtn({
	icon: Icon,
	label,
	desc,
	dark,
	onClick,
	accent = false,
}: {
	icon: typeof MessageCircle;
	label: string;
	desc: string;
	dark: boolean;
	onClick: () => void;
	accent?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
				accent
					? dark
						? "bg-[#ea580c]/15 text-[#fb923c] hover:bg-[#ea580c]/25"
						: "bg-[#ea580c]/10 text-[#ea580c] hover:bg-[#ea580c]/18"
					: dark
						? "text-[#cccccc] hover:bg-[#252526]"
						: "text-[#333333] hover:bg-[#f5f5f5]"
			}`}
		>
			<Icon size={16} className="shrink-0" />
			<div className="min-w-0">
				<div className="text-[12px] font-semibold leading-none">{label}</div>
				<div className={`mt-0.5 truncate text-[10px] ${dark ? "text-[#585858]" : "text-[#aaaaaa]"}`}>
					{desc}
				</div>
			</div>
		</button>
	);
}

function StatusRow({
	icon: Icon,
	label,
	value,
	ok,
	planned = false,
	detail,
	dark,
}: {
	icon: typeof CheckCircle2;
	label: string;
	value: string;
	ok: boolean;
	planned?: boolean;
	/** Second line — env / remediation (Mission engine row). */
	detail?: string;
	dark: boolean;
}) {
	return (
		<div className="flex items-start gap-2.5">
			<Icon
				size={13}
				className={`mt-0.5 shrink-0 ${
					planned
						? dark
							? "text-[#585858]"
							: "text-[#aaaaaa]"
						: ok
							? "text-[#4ec9b0]"
							: dark
								? "text-[#fb923c]"
								: "text-[#ea580c]"
				}`}
			/>
			<div className="min-w-0 flex-1">
				<span className={`text-[11px] font-semibold ${dark ? "text-[#858585]" : "text-[#888888]"}`}>
					{label}:{" "}
				</span>
				<span className={`text-[11px] ${dark ? "text-[#cccccc]" : "text-[#444444]"}`}>{value}</span>
				{detail ? (
					<p
						className={`mt-1.5 text-[10px] leading-snug ${dark ? "text-[#a3a3a3]" : "text-[#6b7280]"}`}
					>
						{detail}
					</p>
				) : null}
			</div>
		</div>
	);
}

function ActivityRow({ log, dark }: { log: LogRow; dark: boolean }) {
	const msg = log.msg ?? "";
	const isTool =
		log.source === "tool" ||
		msg.startsWith("▶") ||
		msg.startsWith("✓") ||
		msg.startsWith("✗") ||
		msg.toLowerCase().includes("tool");
	const isSystem = log.level === "info" && !isTool;

	const Icon = isTool ? Cpu : isSystem ? Play : MessageCircle;
	const iconColor = isTool
		? dark
			? "text-[#fb923c]"
			: "text-[#ea580c]"
		: dark
			? "text-[#858585]"
			: "text-[#aaaaaa]";

	return (
		<li
			className={`flex items-start gap-2 rounded-lg px-3 py-2 transition-colors ${
				dark ? "hover:bg-[#252526]" : "hover:bg-[#f5f5f5]"
			}`}
		>
			<Icon size={12} className={`mt-0.5 shrink-0 ${iconColor}`} />
			<span
				className={`min-w-0 break-all font-mono text-[11px] leading-relaxed ${
					isTool
						? dark
							? "text-[#d4d4d4]"
							: "text-[#333333]"
						: dark
							? "text-[#858585]"
							: "text-[#888888]"
				}`}
			>
				{log.msg}
			</span>
		</li>
	);
}

function AgentPill({ agent, dark }: { agent: AgentMeta; dark: boolean }) {
	const initials = agent.name
		.split("-")
		.map((w) => w[0]?.toUpperCase() ?? "")
		.join("")
		.slice(0, 2);

	return (
		<div
			title={agent.description || agent.name}
			className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] ${
				dark
					? "border-[#2a2a2a] bg-[#252526] text-[#cccccc]"
					: "border-[#e5e5e5] bg-[#fafafa] text-[#444444]"
			}`}
		>
			<span
				className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
					dark ? "bg-[#ea580c]/20 text-[#fb923c]" : "bg-[#ea580c]/12 text-[#ea580c]"
				}`}
			>
				{initials}
			</span>
			<span className="max-w-[80px] truncate font-medium">{agent.name}</span>
		</div>
	);
}
