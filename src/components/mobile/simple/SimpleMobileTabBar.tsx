import type { ReactNode } from "react";
import { Brain, Cpu, FileText, Folder, HelpCircle, MessageCircle, Settings, Users, Map as RoadIcon } from "lucide-react";
import type { SimpleTabId } from "../../simple/SimpleNavRail";
import { useTranslation } from "../../../contexts/LanguageContext";

function Tab({
	active,
	dark,
	label,
	onClick,
	children,
}: {
	active: boolean;
	dark: boolean;
	label: string;
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			title={label}
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

export function SimpleMobileTabBar({
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
	const bar = appearanceDark ? "border-[#3c3c3c] bg-[#252526]" : "border-[#e5e5e5] bg-white";

	return (
		<nav
			className={`flex shrink-0 items-stretch gap-0.5 overflow-x-auto border-t px-1 py-1.5 ${bar}`}
			style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}
			aria-label="Simple mode sections"
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
			<Tab active={activeTab === "chat"} dark={appearanceDark} label={t("simple_nav.chat")} onClick={() => onTab("chat")}>
				<MessageCircle size={18} aria-hidden />
			</Tab>
			<Tab active={activeTab === "team"} dark={appearanceDark} label={t("simple_nav.team")} onClick={() => onTab("team")}>
				<Users size={18} aria-hidden />
			</Tab>
			<Tab active={activeTab === "models"} dark={appearanceDark} label={t("simple_nav.models")} onClick={() => onTab("models")}>
				<Brain size={18} aria-hidden />
			</Tab>
			<Tab active={activeTab === "projects"} dark={appearanceDark} label={t("simple_nav.projects")} onClick={() => onTab("projects")}>
				<Folder size={18} aria-hidden />
			</Tab>
			<Tab active={activeTab === "documenthandler"} dark={appearanceDark} label={t("simple_nav.documents")} onClick={() => onTab("documenthandler")}>
				<FileText size={18} aria-hidden />
			</Tab>
			<Tab active={activeTab === "taplanner"} dark={appearanceDark} label={t("simple_nav.taplanner")} onClick={() => onTab("taplanner")}>
				<RoadIcon size={18} aria-hidden />
			</Tab>
			{onHelp ? (
				<button
					type="button"
					title={t("simple_nav.help")}
					onClick={onHelp}
					className={`flex min-h-11 min-w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] font-semibold ${
						appearanceDark
							? "text-[#858585] hover:bg-[#2a2a2a] hover:text-[#cccccc]"
							: "text-[#737373] hover:bg-[#f0f0f0] hover:text-[#333333]"
					}`}
				>
					<HelpCircle size={18} aria-hidden />
					<span>{t("simple_nav.help")}</span>
				</button>
			) : null}
			<Tab active={activeTab === "settings"} dark={appearanceDark} label={t("simple_nav.settings")} onClick={() => onTab("settings")}>
				<Settings size={18} aria-hidden />
			</Tab>
		</nav>
	);
}
