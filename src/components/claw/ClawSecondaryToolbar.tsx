import { PanelLeft, FileText, Cpu } from "lucide-react";

/** Shared toolbar for Claw views: sidebar toggle + status (matches Simple mode feel). */
export function ClawSecondaryToolbar({
	sidebarOpen,
	onToggleSidebar,
	connected,
	appearanceDark,
	activeTab,
}: {
	sidebarOpen: boolean;
	onToggleSidebar: () => void;
	connected: boolean;
	appearanceDark: boolean;
	activeTab: string;
}) {
	const bar = appearanceDark
		? "border-b border-[#252526] bg-[#252526]"
		: "border-b border-[#e5e5e5] bg-[#ececec]";
	const btn = appearanceDark
		? "text-[#cccccc] hover:bg-[#3c3c3c] hover:text-white"
		: "text-[#616161] hover:bg-[#e5e5e5] hover:text-[#333333]";
	const label = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";

	return (
		<div className={`flex h-9 shrink-0 items-center justify-between px-2 ${bar}`}>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onToggleSidebar}
					className={`rounded p-1.5 transition-colors ${btn}`}
					title={sidebarOpen ? "Hide primary sidebar" : "Show primary sidebar"}
				>
					<PanelLeft size={18} />
				</button>
				
				<div className="flex items-center gap-1.5 ml-1">
					<Cpu size={14} className="text-[#fb923c] opacity-80" />
					<span className={`text-[10px] font-bold uppercase tracking-wider ${label}`}>
						{activeTab}
					</span>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<div
					className={`h-2 w-2 rounded-full ${connected ? "bg-[#4ec9b0]" : "bg-[#cca700]"}`}
					title={connected ? "Connected" : "Connecting…"}
				/>
				<span className={`hidden text-[10px] font-medium sm:inline ${label}`}>
					{connected ? "Online" : "Connecting…"}
				</span>
			</div>
			
			<div className="w-8" /> {/* Spacer to balance */}
		</div>
	);
}
