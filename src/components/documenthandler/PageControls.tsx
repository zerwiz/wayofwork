import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react";

interface PageControlsProps {
	currentPage: number;
	totalPages: number;
	goToPage: (page: number) => void;
	appearanceDark?: boolean;
}

export function PageControls({
	currentPage,
	totalPages,
	goToPage,
	appearanceDark = true,
}: PageControlsProps) {
	const subC = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const title = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";
	const btnBg = appearanceDark ? "bg-[#252526]" : "bg-white";
	const btnBorder = appearanceDark ? "border-[#3c3c3c]" : "border-[#d4d4d4]";
	const disabledBtn = appearanceDark
		? "opacity-40 cursor-not-allowed"
		: "opacity-40 cursor-not-allowed";
	const btnHover = appearanceDark
		? "hover:bg-[#3c3c3c]"
		: "hover:bg-[#e5e5e5]";

	const handlePrevPage = () => {
		if (currentPage > 1) goToPage(currentPage - 1);
	};

	const handleNextPage = () => {
		if (currentPage < totalPages) goToPage(currentPage + 1);
	};

	return (
		<div className="page-controls flex items-center gap-1">
			<button
				type="button"
				onClick={() => goToPage(1)}
				disabled={currentPage === 1}
				className={`flex items-center rounded border p-1.5 ${btnBg} ${btnBorder} ${subC} ${currentPage === 1 ? disabledBtn : btnHover}`}
				aria-label="First page"
			>
				<ChevronFirst size={14} />
			</button>

			<button
				type="button"
				onClick={handlePrevPage}
				disabled={currentPage === 1}
				className={`flex items-center rounded border p-1.5 ${btnBg} ${btnBorder} ${subC} ${currentPage === 1 ? disabledBtn : btnHover}`}
				aria-label="Previous page"
			>
				<ChevronLeft size={14} />
			</button>

			<span className={`min-w-16 text-center text-sm ${title}`}>
				{currentPage} / {totalPages}
			</span>

			<button
				type="button"
				onClick={handleNextPage}
				disabled={currentPage === totalPages}
				className={`flex items-center rounded border p-1.5 ${btnBg} ${btnBorder} ${subC} ${currentPage === totalPages ? disabledBtn : btnHover}`}
				aria-label="Next page"
			>
				<ChevronRight size={14} />
			</button>

			<button
				type="button"
				onClick={() => goToPage(totalPages)}
				disabled={currentPage === totalPages}
				className={`flex items-center rounded border p-1.5 ${btnBg} ${btnBorder} ${subC} ${currentPage === totalPages ? disabledBtn : btnHover}`}
				aria-label="Last page"
			>
				<ChevronLast size={14} />
			</button>
		</div>
	);
}

export default PageControls;