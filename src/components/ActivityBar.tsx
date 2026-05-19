import { ClipboardList, Files, GitBranch, LayoutTemplate, Search, Settings } from "lucide-react";
import type { TechnicalActivity } from "../types/technicalShell";

const ITEMS: { id: TechnicalActivity; icon: typeof Files; label: string }[] = [
	{ id: "explorer", icon: Files, label: "Explorer" },
	{ id: "search", icon: Search, label: "Search" },
	{ id: "scm", icon: GitBranch, label: "Source control" },
	{ id: "extensions", icon: LayoutTemplate, label: "Run and extensions" },
	{ id: "planning", icon: ClipboardList, label: "Plan mode (Pi planner)" },
	{ id: "settings", icon: Settings, label: "Settings" },
];

export function ActivityBar({
	active,
	onSelect,
}: {
	active: TechnicalActivity;
	onSelect: (id: TechnicalActivity) => void;
}) {
	return (
		<div className="z-10 flex w-12 shrink-0 flex-col items-center gap-1 border-r border-[#252526] bg-[#333333] py-2">
			{ITEMS.map(({ id, icon: Icon, label }) => {
				const isActive = active === id;
				return (
					<button
						key={id}
						type="button"
						title={label}
						aria-label={label}
						aria-pressed={isActive}
						onClick={() => onSelect(id)}
						className={`relative flex h-11 w-11 items-center justify-center rounded-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#ea580c] ${
							isActive ? "text-white" : "text-[#858585] hover:text-white"
						}`}
					>
						{isActive ? (
							<span className="absolute bottom-1 left-0 top-1 w-0.5 rounded-r bg-[#ea580c]" aria-hidden />
						) : null}
						<Icon size={24} strokeWidth={1.5} className="relative z-[1]" />
					</button>
				);
			})}
		</div>
	);
}
