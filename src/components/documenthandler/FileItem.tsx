import { FileText, Image, Code, File } from "lucide-react";
import { FileEntry } from "./types/documenthandler.types";

interface FileItemProps {
	file: FileEntry;
	selected: boolean;
	onClick: (file: FileEntry) => void;
	appearanceDark?: boolean;
}

export function FileItem({
	file,
	selected,
	onClick,
	appearanceDark = true,
}: FileItemProps) {
	const title = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";
	const subC = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const itemBg = appearanceDark ? "hover:bg-[#2d2d2d]" : "hover:bg-[#f5f5f5]";
	const selectedBg = appearanceDark ? "bg-[#ea580c]/20" : "bg-[#ea580c]/12";
	const iconColor = appearanceDark ? "text-[#858585]" : "text-[#616161]";

	const getIcon = (ext: string) => {
		const imageExts = ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"];
		const codeExts = ["ts", "tsx", "js", "jsx", "html", "css", "scss", "json", "md", "tex"];
		const pdfExts = ["pdf"];

		if (imageExts.includes(ext.toLowerCase())) {
			return <Image size={16} className={iconColor} />;
		}
		if (pdfExts.includes(ext.toLowerCase())) {
			return <File size={16} className="text-[#ea580c]" />;
		}
		if (codeExts.includes(ext.toLowerCase())) {
			return <Code size={16} className={iconColor} />;
		}
		return <FileText size={16} className={iconColor} />;
	};

	const ext = file.extension.startsWith(".")
		? file.extension.substring(1)
		: file.extension;

	const formatSize = (bytes: number): string => {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	};

	return (
		<button
			type="button"
			onClick={() => onClick(file)}
			className={`file-item flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
				selected ? selectedBg : ""
			} ${!selected ? itemBg : ""}`}
		>
			{getIcon(ext)}

			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<div className={`truncate text-sm font-medium ${title}`}>{file.name}</div>
				<div className={`flex items-center gap-2 text-xs ${subC}`}>
					<span>{formatSize(file.size)}</span>
					<span>
						{new Date(file.modified).toLocaleDateString()}
					</span>
				</div>
			</div>
		</button>
	);
}

export default FileItem;