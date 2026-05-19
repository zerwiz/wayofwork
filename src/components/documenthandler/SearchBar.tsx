import { Search } from "lucide-react";
import { useDocumentHandler } from "./context/DocumentHandlerContext";

interface SearchBarProps {
	appearanceDark?: boolean;
}

export function SearchBar({ appearanceDark = true }: SearchBarProps) {
	const { searchQuery, setSearchQuery } = useDocumentHandler();

	const inputBg = appearanceDark
		? "bg-[#1e1e1e] border-[#3c3c3c] text-[#cccccc] placeholder-[#858585]"
		: "bg-white border-[#d4d4d4] text-[#333333]";
	const subC = appearanceDark ? "text-[#858585]" : "text-[#616161]";

	return (
		<div className="search-bar relative">
			<Search
				size={14}
				className={`absolute left-3 top-1/2 -translate-y-1/2 ${subC}`}
			/>
			<input
				type="text"
				value={searchQuery}
				onChange={(e) => setSearchQuery(e.target.value)}
				placeholder="Search..."
				className={`w-24 rounded-lg border py-1.5 pl-8 pr-2 text-xs ${inputBg}`}
				aria-label="Search files"
			/>
		</div>
	);
}

export default SearchBar;