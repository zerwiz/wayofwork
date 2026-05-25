import { Brain, Cpu, Folder, HelpCircle, MessageCircle, Settings, Users, FileText, Map as RoadIcon } from "lucide-react";
import { useTranslation } from "../../contexts/LanguageContext";

export type SimpleTabId = "chat" | "team" | "models" | "projects" | "documenthandler" | "taplanner" | "settings";

/**
 * Simple shell primary nav. Stub / depth by target (see each view file header):
 * - **chat** — `SimpleChatView`: wired to session WebSocket.
 * - **team** — `SimpleTeamView`: agent catalog + persona merge wired; not Pi `dispatch_agent` orchestration.
 * - **models** — `SimpleModelsView`: provider + model list wired; session model selection wired.
 * - **projects** — `SimpleProjectsView`: workspace summary + refresh only (no multi-root UI / runner).
 * - **settings** — `SimpleSettingsView`: theme + approvals + link to technical mode.
 */

export function SimpleNavRail({
	activeTab,
	onTab,
	onHelp,
	appearanceDark,
}: {
	activeTab: SimpleTabId;
	onTab: (id: SimpleTabId) => void;
	onHelp?: () => void;
	appearanceDark: boolean;
}) {
	const { t } = useTranslation();

	const NavItem = ({
		icon: Icon,
		label,
		id,
	}: {
		icon: typeof MessageCircle;
		label: string;
		id: SimpleTabId;
	}) => (
		<button
			type="button"
			onClick={() => onTab(id)}
			className={`flex w-16 flex-col items-center justify-center rounded-2xl py-3 transition-colors ${
				activeTab === id
					? appearanceDark
						? "bg-[#ea580c]/20 text-[#fb923c] shadow-sm"
						: "bg-[#ea580c]/12 text-[#c2410c] shadow-sm"
					: appearanceDark
						? "text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]"
						: "text-[#616161] hover:bg-[#e5e5e5] hover:text-[#333333]"
			}`}
		>
			<Icon
				size={24}
				className={
					activeTab === id
						? appearanceDark
							? "text-[#fb923c]"
							: "text-[#ea580c]"
						: appearanceDark
							? "text-[#858585]"
							: "text-[#858585]"
				}
			/>
			<span className="mt-1.5 text-[11px] font-semibold tracking-tight">{label}</span>
		</button>
	);

	const rail = appearanceDark
		? "border-[#252526] bg-[#333333]"
		: "border-[#e5e5e5] bg-white shadow-sm";
	const logoText = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";

	return (
		<nav className={`z-10 flex w-24 shrink-0 flex-col items-center gap-2 border-r py-6 ${rail}`}>
			<div className="mb-8 flex flex-col items-center">
				<div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-[#ea580c]/35 bg-[#ea580c]/15 shadow-sm">
					<Cpu className="text-[#fb923c]" size={28} />
				</div>
				<span className={`hidden text-xs font-extrabold tracking-tight md:inline ${logoText}`}>WAY OF WORK</span>
			</div>

			<NavItem icon={MessageCircle} label={t("simple_nav.chat")} id="chat" />
			<NavItem icon={Users} label={t("simple_nav.team")} id="team" />
			<NavItem icon={Brain} label={t("simple_nav.models")} id="models" />
			<NavItem icon={Folder} label={t("simple_nav.projects")} id="projects" />
			<NavItem icon={FileText} label={t("simple_nav.documents")} id="documenthandler" />
			<NavItem icon={RoadIcon} label={t("simple_nav.taplanner")} id="taplanner" />

		<div className="mt-auto flex flex-col items-center gap-2">

			{onHelp ? (
				<button
					type="button"
					onClick={onHelp}
					title={t("simple_nav.help")}
					className={`flex w-16 flex-col items-center justify-center rounded-2xl py-3 transition-colors ${
						appearanceDark
							? "text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]"
							: "text-[#616161] hover:bg-[#e5e5e5] hover:text-[#333333]"
					}`}
				>
					<HelpCircle size={24} className={appearanceDark ? "text-[#858585]" : "text-[#858585]"} />
					<span className="mt-1.5 text-[11px] font-semibold tracking-tight">{t("simple_nav.help")}</span>
				</button>
			) : null}
			<NavItem icon={Settings} label={t("simple_nav.settings")} id="settings" />
		</div>
	</nav>
	);
}
