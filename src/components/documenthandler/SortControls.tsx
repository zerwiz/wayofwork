import { SortAsc, SortDesc } from "lucide-react";

interface SortControlsProps {
	sortBy: "name" | "date" | "size";
	setSortBy: (sort: "name" | "date" | "size") => void;
	sortOrder: "asc" | "desc";
	setSortOrder: (order: "asc" | "desc") => void;
	appearanceDark?: boolean;
}

export function SortControls({
	sortBy,
	setSortBy,
	sortOrder,
	setSortOrder,
	appearanceDark = true,
}: SortControlsProps) {
	const selectBg = appearanceDark
		? "bg-[#252526] border-[#3c3c3c] text-[#cccccc]"
		: "bg-white border-[#d4d4d4] text-[#333333]";
	const subC = appearanceDark ? "text-[#858585]" : "text-[#616161]";

	return (
		<div className="sort-controls flex items-center gap-1">
			<select
				value={sortBy}
				onChange={(e) => setSortBy(e.target.value as "name" | "date" | "size")}
				className={`rounded border px-2 py-1 text-xs ${selectBg}`}
				aria-label="Sort by"
			>
				<option value="name">Name</option>
				<option value="date">Date</option>
				<option value="size">Size</option>
			</select>

			<button
				type="button"
				onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
				className={`rounded p-1 ${selectBg}`}
				aria-label={`Sort ${sortOrder === "asc" ? "descending" : "ascending"}`}
			>
				{sortOrder === "asc" ? (
					<SortAsc size={14} className={subC} />
				) : (
					<SortDesc size={14} className={subC} />
				)}
			</button>
		</div>
	);
}

export default SortControls;