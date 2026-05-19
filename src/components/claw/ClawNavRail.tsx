import { Briefcase, CalendarDays, Cog, Cpu, Files, HelpCircle, MessageCircle, Puzzle, Radio, Radar, Users } from "lucide-react";
import { listClawUiModules, type ClawTabId } from "../../claw/clawUiModules";
import type { ClawHelpSectionId } from "./ClawHelpModal";

export type { ClawBuiltinTabId, ClawTabId } from "../../claw/clawUiModules";

export function ClawNavRail({
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
	const rail = appearanceDark
		? "border-[#252526] bg-[#1a1a1a]"
		: "border-[#e5e5e5] bg-white shadow-sm";
	const logoText = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";

	const extraModules = listClawUiModules();

	const NavItem = ({
		icon: Icon,
		label,
		id,
		title,
	}: {
		icon: typeof MessageCircle;
		label: string;
		id: ClawTabId;
		title?: string;
	}) => {
		const isActive = activeTab === id;
		return (
			<button
				type="button"
				title={title ?? label}
				onClick={() => onTab(id)}
				className={`relative flex w-16 flex-col items-center justify-center gap-1.5 rounded-xl py-3 transition-all ${
					isActive
						? appearanceDark
							? "bg-[#ea580c]/20 text-[#fb923c] shadow-sm"
							: "bg-[#ea580c]/12 text-[#c2410c]"
						: appearanceDark
							? "text-[#585858] hover:bg-[#2a2a2a] hover:text-[#cccccc]"
							: "text-[#888888] hover:bg-[#f0f0f0] hover:text-[#333333]"
				}`}
			>
				<Icon
					size={20}
					className={isActive ? (appearanceDark ? "text-[#fb923c]" : "text-[#ea580c]") : ""}
				/>
				<span className="text-[10px] font-semibold tracking-tight leading-none">{label}</span>
				{isActive ? (
					<span
						className={`absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full ${
							appearanceDark ? "bg-[#fb923c]" : "bg-[#ea580c]"
						}`}
					/>
				) : null}
			</button>
		);
	};

	return (
		<nav className={`z-10 flex w-[72px] shrink-0 flex-col items-center gap-1.5 border-r px-1.5 py-5 ${rail}`}>
			<div className="mb-6 flex flex-col items-center gap-1 relative">
				<div
					className={`flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm ${
						appearanceDark
							? "border-[#ea580c]/30 bg-[#ea580c]/10"
							: "border-[#ea580c]/25 bg-[#ea580c]/8"
					}`}
				>
					<Cpu size={22} className="text-[#fb923c]" />
				</div>
				<span className={`text-[9px] font-black tracking-widest uppercase ${logoText}`}>Claw</span>
			</div>

			<NavItem icon={Radar} label="Mission" id="mission" />
			<NavItem icon={MessageCircle} label="Chat" id="chat" />
			<NavItem icon={Users} label="Team" id="team" />
			<NavItem icon={CalendarDays} label="Schedule" id="schedule" />
			<NavItem icon={Radio} label="Channels" id="channels" />
			<NavItem icon={Files} label="Files" id="files" />

			{extraModules.map((m) => (
				<NavItem
					key={m.id}
					icon={m.icon ?? Puzzle}
					label={m.label}
					title={m.title}
					id={m.id}
				/>
			))}

		<div className="mt-auto flex flex-col items-center gap-1.5">
			{onHelp ? (
				<button
					type="button"
					onClick={() => onHelp()}
					title="Help & how to use"
					className={`relative flex w-16 flex-col items-center justify-center gap-1.5 rounded-xl py-3 transition-all ${
						appearanceDark
							? "text-[#585858] hover:bg-[#2a2a2a] hover:text-[#cccccc]"
							: "text-[#888888] hover:bg-[#f0f0f0] hover:text-[#333333]"
					}`}
				>
					<HelpCircle size={20} />
					<span className="text-[10px] font-semibold tracking-tight leading-none">Help</span>
				</button>
			) : null}
			<NavItem icon={Cog} label="Settings" id="settings" />
		</div>
	</nav>
	);
}
