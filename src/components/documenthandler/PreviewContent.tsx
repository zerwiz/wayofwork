import { FileText } from "lucide-react";
import { FileEntry } from "./types/documenthandler.types";
import { MarkdownPreviewPane } from "../MarkdownPreviewPane";

interface PreviewContentProps {
	file: FileEntry | null;
	content?: string | null;
	zoom: number;
	currentPage: number;
	appearanceDark?: boolean;
}

export function PreviewContent({
	file,
	content,
	zoom,
	currentPage,
	appearanceDark = true,
}: PreviewContentProps) {
	const title = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";
	const subC = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const bg = appearanceDark ? "bg-[#1e1e1e]" : "bg-white";
	const borderColor = appearanceDark ? "border-[#3c3c3c]" : "border-[#e5e5e5]";

	if (!file)
		return (
			<div className={`preview-placeholder p-8 text-center ${subC}`}>
				No file selected
			</div>
		);

	const ext = (file.extension || "").toLowerCase();

	const fileUrl = `/api/file?path=${encodeURIComponent(file.path)}`;

	if (ext === "pdf") {
		return (
			<div className="pdf-preview h-full w-full">
				<iframe
					title="PDF preview"
					src={`${fileUrl}#zoom=${zoom}&page=${currentPage}`}
					className="h-full w-full border-0"
				/>
			</div>
		);
	}

	if (ext === "md" && typeof content === "string") {
		return (
			<div className={`markdown-viewer h-full overflow-auto ${bg}`}>
				<MarkdownPreviewPane 
					markdown={content || ""} 
					appearanceDark={appearanceDark} 
				/>
			</div>
		);
	}

	if (["txt", "tex", "json", "css", "html", "js", "ts", "tsx", "md"].includes(ext)) {
		const textContent = typeof content === "string" ? content : "Loading content...";
		return (
			<div
				className={`text-preview max-h-full overflow-auto p-4 ${bg}`}
				style={{ zoom: `${zoom}%` }}
			>
				<pre className={`whitespace-pre-wrap text-sm font-mono ${title}`}>
					{textContent}
				</pre>
			</div>
		);
	}

	if (["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"].includes(ext)) {
		return (
			<div
				className="image-preview flex h-full items-center justify-center p-4"
				style={{ zoom: `${zoom}%` }}
			>
				<img
					src={fileUrl}
					alt={file.name}
					className="max-h-full max-w-full rounded-lg shadow-sm"
				/>
			</div>
		);
	}

	if (["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext)) {
		return (
			<div
				className={`generic-preview flex h-full flex-col items-center justify-center rounded-lg p-12 text-center ${bg}`}
			>
				<div className={`mb-4 flex h-20 w-16 items-center justify-center rounded-lg border-2 ${borderColor}`}>
					<FileText size={40} className="text-[#3b82f6]" />
				</div>
				<h3 className={`text-xl font-bold ${title}`}>{file.name}</h3>
				<p className={`mt-2 ${subC}`}>
					This is a Microsoft Office document. Inline preview is limited.
				</p>
				<a 
					href={fileUrl} 
					download={file.name}
					className="mt-6 rounded-lg bg-[#ea580c] px-6 py-2 font-semibold text-white transition-colors hover:bg-[#c2410c]"
				>
					Download File
				</a>
			</div>
		);
	}

	return (
		<div
			className={`generic-preview rounded-lg border p-6 ${bg} ${borderColor}`}
		>
			<div className={`file-info flex flex-col gap-2 ${title}`}>
				<h3 className="text-lg font-semibold">{file.name}</h3>
				<p className={subC}>
					Type: {file.extension.toUpperCase()}
				</p>
				<p className={subC}>
					Size: {(file.size / 1024).toFixed(1)} KB
				</p>
				<p className={subC}>
					Modified: {new Date(file.modified).toLocaleString()}
				</p>
			</div>
		</div>
	);
}

export default PreviewContent;