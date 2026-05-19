import { PanelLeft, PanelRight, FileText } from "lucide-react";

/** Below shared MenuBar: sidebar toggles + connection (Simple layout only). */
export function SimpleSecondaryToolbar({
	leftOpen,
	rightOpen,
	onToggleLeft,
	onToggleRight,
	connected,
	appearanceDark,
	onSwitchToDocs,
	indexingStatus,
}: {
	leftOpen: boolean;
	rightOpen: boolean;
	onToggleLeft: () => void;
	onToggleRight: () => void;
	connected: boolean;
	appearanceDark: boolean;
	onSwitchToDocs?: () => void;
	indexingStatus?: "idle" | "indexing" | "ready";
}) {
	const bar = appearanceDark
		? "border-b border-[#252526] bg-[#252526]"
		: "border-b border-[#e5e5e5] bg-[#ececec]";
	const btn = appearanceDark
		? "text-[#cccccc] hover:bg-[#3c3c3c] hover:text-white"
		: "text-[#616161] hover:bg-[#e5e5e5] hover:text-[#333333]";
	const activeR = appearanceDark ? "bg-[#ea580c]/25 text-[#fb923c]" : "bg-[#ea580c]/15 text-[#ea580c]";
	const label = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";

	const indexingColor = indexingStatus === "ready" ? "bg-[#89d185]" : indexingStatus === "indexing" ? "bg-[#fbbf24]" : "bg-[#cca700]";
	const indexingTitle = indexingStatus === "ready" ? "Workspace indexed" : indexingStatus === "indexing" ? "Indexing in progress..." : "Not indexed";

	return (
		<div className={`flex h-9 shrink-0 items-center justify-between px-2 ${bar}`}>
			<button
				type="button"
				onClick={onToggleLeft}
				className={`rounded p-1.5 transition-colors ${btn}`}
				title={leftOpen ? "Hide primary sidebar" : "Show primary sidebar"}
			>
				<PanelLeft size={18} />
			</button>
			<div className="flex items-center gap-2">
				<div
					className={`h-2 w-2 rounded-full ${connected ? "bg-[#89d185]" : "bg-[#cca700]"}`}
					title={connected ? "Connected" : "Connecting…"}
				/>
				<span className={`hidden text-xs font-medium sm:inline ${label}`}>
					{connected ? "Online" : "Connecting…"}
				</span>
				{onSwitchToDocs && (
					<button
						type="button"
						onClick={onSwitchToDocs}
						className={`rounded p-1.5 transition-colors ${btn}`}
						title="Switch to Docs mode"
					>
						<FileText size={18} className="text-[#fb923c]" />
					</button>
				)}
				<div
					className={`h-2 w-2 rounded-full ${indexingColor}`}
					title={indexingTitle}
				/>
			</div>
			<button
				type="button"
				onClick={onToggleRight}
				className={`rounded p-1.5 transition-colors ${rightOpen ? activeR : btn}`}
				title={rightOpen ? "Hide side panel" : "Show side panel"}
			>
				<PanelRight size={18} />
			</button>
		</div>
	);
}
