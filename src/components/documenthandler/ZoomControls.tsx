import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface ZoomControlsProps {
	zoom: number;
	setZoom: (level: number) => void;
	appearanceDark?: boolean;
}

export function ZoomControls({
	zoom,
	setZoom,
	appearanceDark = true,
}: ZoomControlsProps) {
	const subC = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const btnBg = appearanceDark ? "bg-[#252526]" : "bg-white";
	const btnBorder = appearanceDark ? "border-[#3c3c3c]" : "border-[#d4d4d4]";
	const title = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";
	const btnHover = appearanceDark
		? "hover:bg-[#3c3c3c]"
		: "hover:bg-[#e5e5e5]";

	const handleZoomIn = () => setZoom(Math.min(zoom + 25, 500));
	const handleZoomOut = () => setZoom(Math.max(zoom - 25, 25));
	const handleZoomReset = () => setZoom(100);

	return (
		<div className="zoom-controls flex items-center gap-1">
			<button
				type="button"
				onClick={handleZoomOut}
				className={`flex items-center gap-1 rounded border p-1.5 ${btnBg} ${btnBorder} ${subC} ${btnHover}`}
				aria-label="Zoom out"
			>
				<ZoomOut size={14} />
			</button>

			<span className={`min-w-12 text-center text-sm font-medium ${title}`}>
				{zoom}%
			</span>

			<button
				type="button"
				onClick={handleZoomIn}
				className={`flex items-center gap-1 rounded border p-1.5 ${btnBg} ${btnBorder} ${subC} ${btnHover}`}
				aria-label="Zoom in"
			>
				<ZoomIn size={14} />
			</button>

			<button
				type="button"
				onClick={handleZoomReset}
				className={`flex items-center gap-1 rounded border px-2 py-1.5 text-xs ${btnBg} ${btnBorder} ${subC} ${btnHover}`}
				aria-label="Reset zoom"
			>
				<RotateCcw size={12} />
				Reset
			</button>
		</div>
	);
}

export default ZoomControls;