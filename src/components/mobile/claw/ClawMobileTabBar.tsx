import type { ReactNode } from "react";
import { CalendarDays, Cog, Cpu, Files, HelpCircle, MessageCircle, Puzzle, Radio, Radar, Users } from "lucide-react";
import { listClawUiModules, type ClawTabId } from "../../../claw/clawUiModules";
import type { ClawHelpSectionId } from "../../claw/ClawHelpModal";

function TabButton({
	active,
	dark,
	label,
	onClick,
	children,
	title,
}: {
	active: boolean;
	dark: boolean;
	label: string;
	onClick: () => void;
	children: ReactNode;
	title?: string;
}) {
	return (
		<button
			type="button"
			title={title ?? label}
			onClick={onClick}
			className={`flex min-h-11 min-w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] font-semibold leading-none transition-colors ${
				active
					? dark
						? "bg-[#ea580c]/25 text-[#fb923c]"
						: "bg-[#ea580c]/15 text-[#c2410c]"
					: dark
						? "text-[#858585] hover:bg-[#2a2a2a] hover:text-[#cccccc]"
						: "text-[#737373] hover:bg-[#f0f0f0] hover:text-[#333333]"
			}`}
		>
			{children}
			<span className="max-w-[4.5rem] truncate">{label}</span>
		</button>
	);
}

export function ClawMobileTabBar({
	activeTab,
	onTab,
	onHelp,
	appearanceDark,
}: {
	activeTab: ClawTabId;
	onTab: (id: ClawTabId) => void;
	onHelp?: (defaultSection?: ClawHelpSectionId | null) => void;
	appearanceDark: boolean;
}) {
	const extra = listClawUiModules();
	const bar = appearanceDark ? "border-[#3c3c3c] bg-[#1a1a1a]" : "border-[#e5e5e5] bg-white";

	return (
		<nav
			className={`flex shrink-0 items-stretch gap-0.5 overflow-x-auto border-t px-1 py-1.5 ${bar}`}
			style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}
			aria-label="Claw sections"
		>
			<div className="flex shrink-0 items-center pr-1">
				<div
					className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
						appearanceDark
							? "border-[#ea580c]/30 bg-[#ea580c]/10"
							: "border-[#ea580c]/25 bg-[#ea580c]/8"
					}`}
				>
					<Cpu size={18} className="text-[#fb923c]" aria-hidden />
				</div>
			</div>
			<TabButton active={activeTab === "mission"} dark={appearanceDark} label="Mission" onClick={() => onTab("mission")}>
				<Radar size={18} aria-hidden />
			</TabButton>
			<TabButton active={activeTab === "chat"} dark={appearanceDark} label="Chat" onClick={() => onTab("chat")}>
				<MessageCircle size={18} aria-hidden />
			</TabButton>
			<TabButton active={activeTab === "team"} dark={appearanceDark} label="Team" onClick={() => onTab("team")}>
				<Users size={18} aria-hidden />
			</TabButton>
			<TabButton active={activeTab === "schedule"} dark={appearanceDark} label="Schedule" onClick={() => onTab("schedule")}>
				<CalendarDays size={18} aria-hidden />
			</TabButton>
			<TabButton active={activeTab === "channels"} dark={appearanceDark} label="Channels" onClick={() => onTab("channels")}>
				<Radio size={18} aria-hidden />
			</TabButton>
			<TabButton active={activeTab === "files"} dark={appearanceDark} label="Files" onClick={() => onTab("files")}>
				<Files size={18} aria-hidden />
			</TabButton>
			{extra.map((m) => {
				const ModIcon = m.icon ?? Puzzle;
				return (
					<TabButton
						key={m.id}
						active={activeTab === m.id}
						dark={appearanceDark}
						label={m.label}
						title={m.title}
						onClick={() => onTab(m.id)}
					>
						<ModIcon size={18} aria-hidden />
					</TabButton>
				);
			})}
			{onHelp ? (
				<button
					type="button"
					title="Help"
					onClick={() => onHelp()}
					className={`flex min-h-11 min-w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] font-semibold ${
						appearanceDark
							? "text-[#858585] hover:bg-[#2a2a2a] hover:text-[#cccccc]"
							: "text-[#737373] hover:bg-[#f0f0f0] hover:text-[#333333]"
					}`}
				>
					<HelpCircle size={18} aria-hidden />
					<span>Help</span>
				</button>
			) : null}
			<TabButton active={activeTab === "settings"} dark={appearanceDark} label="Settings" onClick={() => onTab("settings")}>
				<Cog size={18} aria-hidden />
			</TabButton>
		</nav>
	);
}
