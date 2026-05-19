import { FileText, Image, Code, File } from "lucide-react";
import { FileEntry } from "./types/documenthandler.types";

interface FileIconsProps {
	files: FileEntry[];
	selectedFile: FileEntry | null;
	onSelectFile: (file: FileEntry) => void;
	appearanceDark?: boolean;
}

export function FileIcons({
	files,
	selectedFile,
	onSelectFile,
	appearanceDark = true,
}: FileIconsProps) {
	const title = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";
	const itemBg = appearanceDark ? "hover:bg-[#2d2d2d]" : "hover:bg-[#f5f5f5]";
	const selectedBg = appearanceDark ? "bg-[#ea580c]/20" : "bg-[#ea580c]/12";
	const iconColor = appearanceDark ? "text-[#858585]" : "text-[#616161]";

	const getIcon = (ext: string) => {
		const imageExts = ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"];
		const codeExts = ["ts", "tsx", "js", "jsx", "html", "css", "scss", "json", "md", "tex"];
		const pdfExts = ["pdf"];

		if (imageExts.includes(ext.toLowerCase())) {
			return <Image size={32} className={iconColor} />;
		}
		if (pdfExts.includes(ext.toLowerCase())) {
			return <File size={32} className="text-[#ea580c]" />;
		}
		if (codeExts.includes(ext.toLowerCase())) {
			return <Code size={32} className={iconColor} />;
		}
		return <FileText size={32} className={iconColor} />;
	};

	return (
		<div className="file-icons-grid grid grid-cols-4 gap-2">
			{files.map((file) => {
				const ext = file.extension.startsWith(".")
					? file.extension.substring(1)
					: file.extension;
				const isSelected = selectedFile?.id === file.id;

				return (
					<button
						type="button"
						key={file.id}
						onClick={() => onSelectFile(file)}
						className={`file-icon-item flex flex-col items-center gap-2 rounded-lg p-4 transition-colors ${
							isSelected ? selectedBg : itemBg
						}`}
					>
						{getIcon(ext)}
						<span
							className={`text-center text-xs ${title}`}
							title={file.name}
						>
							{file.name.length > 15
								? file.name.substring(0, 12) + "..."
								: file.name}
						</span>
					</button>
				);
			})}
		</div>
	);
}

export default FileIcons;