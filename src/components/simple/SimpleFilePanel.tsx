import { FileCode2, Save, X } from "lucide-react";
import type { FormEvent } from "react";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import type { FilePersistEncoding } from "../../hooks/useFileEditor";
import type { SimpleMarkdownPaneMode } from "../../hooks/useSimplePreferences";
import type { WorkspaceEditorRef } from "../../types/workspaceEditor";
import {
	computeWorkspaceFilePreview,
	filePreviewSupportsSourceToggle,
} from "../../utils/workspaceFilePreview";
import { MarkdownPreviewPane } from "../MarkdownPreviewPane";
import { MermaidPreviewPane } from "../MermaidPreviewPane";
import { WorkspaceSvgPreview } from "../WorkspaceSvgPreview";
import {
	WOP_WORKSPACE_EDITOR_GUTTER_DARK,
	WOP_WORKSPACE_EDITOR_GUTTER_LIGHT,
	WOP_WORKSPACE_EDITOR_TEXTAREA_DARK,
	WOP_WORKSPACE_EDITOR_TEXTAREA_LIGHT,
} from "../../constants/workspaceEditorChrome";
import { WorkspaceTextBuffer } from "../WorkspaceTextBuffer";

export const SimpleFilePanel = forwardRef<
	WorkspaceEditorRef,
	{
		path: string;
		content: string;
		onChange: (next: string) => void;
		persistEncoding: FilePersistEncoding;
		/** From `GET /api/file` when `encoding` is `base64` (raster/binary). */
		fileMimeType?: string | null;
		loading: boolean;
		error: string | null;
		dirty: boolean;
		onSave: () => void | Promise<void>;
		/** Revert buffer to last saved snapshot (same as technical workspace). */
		onDiscardUnsaved?: () => void;
		onClose: () => void;
		onCursor?: (line: number, col: number) => void;
		appearanceDark: boolean;
		onUndoRedoStackChange?: () => void;
		onSelectionPrefsChange?: () => void;
		onFindInFiles?: () => void;
		onReplaceInFiles?: () => void;
		/** `besideChat` = chat left / editor right column (no stacked header height cap). */
		columnLayout?: "stacked" | "besideChat";
		markdownPaneMode?: SimpleMarkdownPaneMode;
		onMarkdownPaneModeChange?: (m: SimpleMarkdownPaneMode) => void;
	}
>(function SimpleFilePanel(
	{
		path,
		content,
		onChange,
		persistEncoding,
		fileMimeType = null,
		loading,
		error,
		dirty,
		onSave,
		onDiscardUnsaved,
		onClose,
		onCursor,
		appearanceDark,
		onUndoRedoStackChange,
		onSelectionPrefsChange,
		onFindInFiles,
		onReplaceInFiles,
		columnLayout = "stacked",
		markdownPaneMode = "source",
		onMarkdownPaneModeChange,
	},
	ref,
) {
	const fileName = path.split("/").pop() ?? path;
	const isMarkdown = path.toLowerCase().endsWith(".md");
	const mdView = isMarkdown ? markdownPaneMode : "source";

	const filePreview = useMemo(() => {
		if (loading) return null;
		return computeWorkspaceFilePreview(path, persistEncoding, fileMimeType, content);
	}, [loading, path, persistEncoding, fileMimeType, content]);

	const [visualMediaMode, setVisualMediaMode] = useState<"preview" | "source">("preview");
	useEffect(() => {
		setVisualMediaMode("preview");
	}, [path]);

	const mediaDual =
		Boolean(filePreview && filePreviewSupportsSourceToggle(filePreview) && !loading && !error);
	const showMediaSource = mediaDual && visualMediaMode === "source";

	const shell = appearanceDark
		? "border-[#3c3c3c] bg-[#252526]"
		: "border-[#e5e5e5] bg-white shadow-sm";
	const header = appearanceDark ? "border-[#3c3c3c] bg-[#1e1e1e]/90" : "border-[#e5e5e5] bg-[#ececec]";
	const title = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";
	const pathMuted = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const btnGhost =
		appearanceDark
			? "rounded-lg px-3 py-1.5 text-xs font-semibold text-[#cccccc] hover:bg-[#3c3c3c]"
			: "rounded-lg px-3 py-1.5 text-xs font-semibold text-[#616161] hover:bg-[#e5e5e5]";
	const segWrap = appearanceDark ? "rounded-lg border border-[#3c3c3c] p-0.5" : "rounded-lg border border-[#e5e5e5] p-0.5";
	const segOn = appearanceDark ? "bg-[#3c3c3c] text-[#f5f5f5]" : "bg-[#e5e5e5] text-[#111827]";
	const segOff =
		appearanceDark ? "text-[#a3a3a3] hover:bg-[#2d2d2d]" : "text-[#6b7280] hover:bg-[#f3f4f6]";
	const btnPrimary =
		appearanceDark
			? "inline-flex items-center gap-1.5 rounded-lg border border-[#0e639c] bg-[#0e639c] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1177bb] disabled:opacity-40"
			: "inline-flex items-center gap-1.5 rounded-lg border border-[#007acc] bg-[#007acc] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#0062a3] disabled:opacity-40";
	const btnUndo =
		appearanceDark
			? "inline-flex items-center gap-1.5 rounded-lg border border-[#3c3c3c] bg-[#2d2d2d] px-3 py-1.5 text-xs font-semibold text-[#cccccc] hover:bg-[#3c3c3c]"
			: "inline-flex items-center gap-1.5 rounded-lg border border-[#e5e5e5] bg-[#f3f3f3] px-3 py-1.5 text-xs font-semibold text-[#333333] hover:bg-[#e5e5e5]";
	const bodyBg = appearanceDark ? "bg-[#1e1e1e]" : "bg-[#f3f3f3]";
	const textArea = appearanceDark
		? "text-[13px] leading-relaxed text-[#cccccc] selection:bg-[#9a3412]"
		: "text-[13px] leading-relaxed text-[#333333] selection:bg-[#fed7aa]/40";

	const submitSave = (e: FormEvent) => {
		e.preventDefault();
		if (!dirty || loading) return;
		void onSave();
	};

	const panelRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (!dirty) return;
		const root = panelRef.current;
		if (!root) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== "Enter" || (!e.ctrlKey && !e.metaKey)) return;
			const t = e.target;
			if (!(t instanceof HTMLTextAreaElement) || !root.contains(t)) return;
			e.preventDefault();
			if (!loading) void onSave();
		};
		document.addEventListener("keydown", onKey, true);
		return () => document.removeEventListener("keydown", onKey, true);
	}, [dirty, loading, onSave]);

	const outer =
		columnLayout === "besideChat"
			? `flex min-h-0 flex-1 flex-col overflow-hidden ${shell}`
			: `flex max-h-[min(42vh,360px)] min-h-[160px] shrink-0 flex-col overflow-hidden border-b ${shell}`;

	const fileIconClass = appearanceDark ? "text-[#fb923c]" : "text-[#ea580c]";

	return (
		<div ref={panelRef} className={outer}>
			<div className={`flex shrink-0 items-center gap-3 border-b px-4 py-3 ${header}`}>
				<div className="flex min-w-0 flex-1 items-center gap-3">
					<div
						className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
							appearanceDark ? "border-[#3c3c3c] bg-[#252526]" : "border-[#e5e5e5] bg-white"
						}`}
					>
						<FileCode2 size={20} className={fileIconClass} />
					</div>
					<div className="min-w-0 flex-1">
						<div className={`truncate text-sm font-bold ${title}`}>{fileName}</div>
						<div className={`truncate font-mono text-[11px] ${pathMuted}`} title={path}>
							{path}
						</div>
					</div>
				</div>
				<div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
					{isMarkdown && onMarkdownPaneModeChange ? (
						<div className={`inline-flex ${segWrap}`} role="group" aria-label="Markdown view">
							<button
								type="button"
								className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${mdView === "source" ? segOn : segOff}`}
								onClick={() => onMarkdownPaneModeChange("source")}
							>
								Source
							</button>
							<button
								type="button"
								className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${mdView === "preview" ? segOn : segOff}`}
								onClick={() => onMarkdownPaneModeChange("preview")}
							>
								Preview
							</button>
						</div>
					) : null}
					{mediaDual ? (
						<div className={`inline-flex ${segWrap}`} role="group" aria-label="Image or diagram view">
							<button
								type="button"
								className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${visualMediaMode === "preview" ? segOn : segOff}`}
								onClick={() => setVisualMediaMode("preview")}
							>
								Preview
							</button>
							<button
								type="button"
								className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${visualMediaMode === "source" ? segOn : segOff}`}
								onClick={() => setVisualMediaMode("source")}
							>
								Source
							</button>
						</div>
					) : null}
					{dirty ? (
						<div className="flex flex-wrap items-center justify-end gap-2">
							{onDiscardUnsaved ? (
								<button
									type="button"
									onClick={onDiscardUnsaved}
									className={btnUndo}
									title="Revert editor to last saved version"
								>
									Undo changes
								</button>
							) : null}
							<form onSubmit={submitSave} className="inline-flex">
								<button type="submit" disabled={loading} className={btnPrimary} title="Save file (Ctrl+Enter)">
									<Save size={14} aria-hidden />
									Keep file
									<span className="ml-1.5 hidden font-normal opacity-90 sm:inline">Ctrl+Enter</span>
								</button>
							</form>
						</div>
					) : null}
					<button type="button" onClick={onClose} className={`inline-flex items-center gap-1 ${btnGhost}`}>
						<X size={14} />
						Close
					</button>
				</div>
			</div>

			<div className={`flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-2 ${bodyBg}`}>
				{persistEncoding === "base64" && (!filePreview || showMediaSource) ? (
					<div
						className={`shrink-0 border-b px-2 py-1 font-mono text-[10px] ${appearanceDark ? "border-[#3c3c3c] text-[#858585]" : "border-[#e5e5e5] text-[#616161]"}`}
					>
						Byte editor — Save writes exact file bytes.
					</div>
				) : null}
				{isMarkdown && mdView === "preview" && !error ? (
					loading ? (
						<div className={`flex min-h-0 flex-1 items-start p-4 text-sm ${pathMuted}`}>Loading…</div>
					) : (
						<MarkdownPreviewPane markdown={content} appearanceDark={appearanceDark} />
					)
				) : showMediaSource ? (
					<WorkspaceTextBuffer
						ref={ref}
						path={path}
						content={content}
						onChange={onChange}
						loading={loading}
						error={error}
						onCursor={onCursor}
						wordWrap
						disableSyntaxHighlight={persistEncoding === "base64"}
						scrollClassName="font-mono"
						lineGutterClassName={
							appearanceDark ? WOP_WORKSPACE_EDITOR_GUTTER_DARK : WOP_WORKSPACE_EDITOR_GUTTER_LIGHT
						}
						textareaClassName={
							appearanceDark ? WOP_WORKSPACE_EDITOR_TEXTAREA_DARK : WOP_WORKSPACE_EDITOR_TEXTAREA_LIGHT
						}
						findBarClassName={`shrink-0 border-t ${appearanceDark ? "border-[#3c3c3c]" : "border-[#e5e5e5]"}`}
						statusLoadingClassName={`p-4 text-sm ${pathMuted}`}
						statusErrorClassName="p-4 text-sm text-red-500"
						onUndoRedoStackChange={onUndoRedoStackChange}
						onSelectionPrefsChange={onSelectionPrefsChange}
						onFindInFiles={onFindInFiles}
						onReplaceInFiles={onReplaceInFiles}
					/>
				) : filePreview?.kind === "image" ? (
					<div className={`flex min-h-0 flex-1 overflow-auto ${bodyBg}`}>
						<img
							src={filePreview.src}
							alt=""
							className="mx-auto block h-auto max-w-full object-contain [image-rendering:auto]"
							loading="lazy"
							decoding="async"
						/>
					</div>
				) : filePreview?.kind === "svg" ? (
					<div className={`flex min-h-0 flex-1 overflow-auto ${bodyBg}`}>
						<WorkspaceSvgPreview
							xml={filePreview.xml}
							imgClassName="mx-auto block h-auto max-w-full object-contain [image-rendering:auto]"
						/>
					</div>
				) : filePreview?.kind === "mermaid" ? (
					<MermaidPreviewPane source={filePreview.source} appearanceDark={appearanceDark} />
				) : filePreview?.kind === "binary" ? (
					<div className={`flex flex-1 overflow-auto p-3 font-mono text-[13px] ${textArea}`}>
						<div className={`max-w-xl ${pathMuted}`}>
							<p className={`mb-2 font-semibold ${title}`}>Binary file</p>
							<p>
								Type <span className="text-[#ea580c]">{filePreview.mimeType}</span>. Not shown as text — open
								externally or on disk.
							</p>
						</div>
					</div>
				) : (
					<WorkspaceTextBuffer
						ref={ref}
						path={path}
						content={content}
						onChange={onChange}
						loading={loading}
						error={error}
						onCursor={onCursor}
						wordWrap
						disableSyntaxHighlight={persistEncoding === "base64"}
						scrollClassName="font-mono"
						lineGutterClassName={
							appearanceDark ? WOP_WORKSPACE_EDITOR_GUTTER_DARK : WOP_WORKSPACE_EDITOR_GUTTER_LIGHT
						}
						textareaClassName={
							appearanceDark ? WOP_WORKSPACE_EDITOR_TEXTAREA_DARK : WOP_WORKSPACE_EDITOR_TEXTAREA_LIGHT
						}
						findBarClassName={`shrink-0 border-t ${appearanceDark ? "border-[#3c3c3c]" : "border-[#e5e5e5]"}`}
						statusLoadingClassName={`p-4 text-sm ${pathMuted}`}
						statusErrorClassName="p-4 text-sm text-red-500"
						onUndoRedoStackChange={onUndoRedoStackChange}
						onSelectionPrefsChange={onSelectionPrefsChange}
						onFindInFiles={onFindInFiles}
						onReplaceInFiles={onReplaceInFiles}
					/>
				)}
			</div>
		</div>
	);
});
