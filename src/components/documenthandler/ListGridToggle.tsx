import { LayoutGrid, List } from "lucide-react";

interface ListGridToggleProps {
	activeView: "icon" | "list";
	setViewMode: (mode: "icon" | "list") => void;
	appearanceDark?: boolean;
}

export function ListGridToggle({
	activeView,
	setViewMode,
	appearanceDark = true,
}: ListGridToggleProps) {
	const isIconView = activeView === "icon";

	const btnInactive = appearanceDark
		? "text-[#858585] hover:bg-[#3c3c3c]"
		: "text-[#616161] hover:bg-[#e5e5e5]";
	const btnActive = appearanceDark
		? "bg-[#ea580c]/20 text-[#fb923c]"
		: "bg-[#ea580c]/12 text-[#c2410c]";
	const btnBg = appearanceDark ? "bg-[#252526]" : "bg-white";
	const btnBorder = appearanceDark ? "border-[#3c3c3c]" : "border-[#d4d4d4]";

	return (
		<div
			className={`view-toggle-buttons flex rounded-lg border p-0.5 ${btnBg} ${btnBorder}`}
		>
			<button
				type="button"
				onClick={() => setViewMode("icon")}
				className={`rounded p-1.5 ${isIconView ? btnActive : btnInactive}`}
				aria-label="Switch to icon view"
			>
				<LayoutGrid size={14} />
			</button>
			<button
				type="button"
				onClick={() => setViewMode("list")}
				className={`rounded p-1.5 ${!isIconView ? btnActive : btnInactive}`}
				aria-label="Switch to list view"
			>
				<List size={14} />
			</button>
		</div>
	);
}

export default ListGridToggle;