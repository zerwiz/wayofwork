import { ChevronDown, ChevronRight, Clock, Columns2, Folder, PanelTop } from "lucide-react";
import { useState } from "react";
import type { SimpleChatWorkspaceLayout } from "../../utils/simpleWorkspaceLayoutStorage";
import type { LogRow } from "../../hooks/useWayOfPiSession";
import type { TreeNode } from "../../types/tree";
import { SimpleFileTree } from "./SimpleFileTree";

/** Simple shell right column: file tree (explorer) and activity timeline. */
export function SimpleRightPanel({
	nodes,
	selectedPath,
	onSelectFile,
	loading,
	error,
	logs,
	streaming,
	appearanceDark,
	chatWorkspaceLayout,
	onToggleChatWorkspaceLayout,
	onExplorerGitMutated,
	onMoveFileToDirectory,
	allowWorkspaceRootDrop,
	presentation = "sidebar",
}: {
	nodes: TreeNode[];
	selectedPath: string | null;
	onSelectFile: (path: string) => void;
	loading: boolean;
	error: string | null;
	logs: LogRow[];
	streaming: boolean;
	appearanceDark: boolean;
	/** Chat tab: editor above chat vs chat left / editor right. */
	chatWorkspaceLayout?: SimpleChatWorkspaceLayout;
	onToggleChatWorkspaceLayout?: () => void;
	/** After Git stage from file tree — refresh workspace tree. */
	onExplorerGitMutated?: () => void;
	onMoveFileToDirectory?: (fromPath: string, toDirPath: string) => Promise<void>;
	allowWorkspaceRootDrop?: boolean;
	/** `sheet` = full-width (e.g. Simple mobile bottom sheet). */
	presentation?: "sidebar" | "sheet";
}) {
	const [happeningOpen, setHappeningOpen] = useState(true);
	const timeline =
		logs.length > 0
			? logs.slice(-20).map((log, i, arr) => ({
					time: log.time || "—",
					text: `${log.source}: ${log.msg}`,
					active: streaming && i === arr.length - 1,
				}))
			: [{ time: "—", text: "Connect to the server to see live activity here.", active: false }];

	const aside = appearanceDark
		? "border-[#3c3c3c] bg-[#252526]"
		: "border-[#e5e5e5] bg-white shadow-sm";
	const title = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";
	const sectionBorder = appearanceDark ? "border-[#3c3c3c]" : "border-[#e5e5e5]";
	const muted = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const timelineBorder = appearanceDark ? "border-[#1e1e1e]" : "border-white";
	const dotIdle = appearanceDark
		? "bg-[#6f6f6f] group-hover:bg-[#858585]"
		: "bg-[#c8c8c8] group-hover:bg-[#a0a0a0]";
	const timeC = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const textActive = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";
	const textIdle = appearanceDark
		? "text-[#858585] group-hover:text-[#cccccc]"
		: "text-[#616161] group-hover:text-[#333333]";

	const widthClass =
		presentation === "sheet" ? "w-full min-w-0 max-w-none shrink-0 border-t" : "w-80 shrink-0 border-l";

	return (
		<aside className={`z-10 flex flex-col shadow-sm ${widthClass} ${aside}`}>
			<div className={`flex min-h-0 flex-1 flex-col border-b ${sectionBorder}`}>
				<div className="flex shrink-0 items-center justify-between gap-2 p-5 pb-4">
					<h2 className={`flex min-w-0 items-center gap-2 text-[13px] font-extrabold uppercase tracking-wider ${title}`}>
						<Folder size={16} className="shrink-0 text-[#fb923c]" />
						<span className="truncate">Project Files</span>
					</h2>
					{onToggleChatWorkspaceLayout != null && chatWorkspaceLayout != null ? (
						<button
							type="button"
							title={
								chatWorkspaceLayout === "side_by_side"
									? "Layout: chat left, editor right — click for editor above chat"
									: "Layout: editor above chat — click for chat left, editor right"
							}
							onClick={onToggleChatWorkspaceLayout}
							className={`shrink-0 rounded-md border p-1.5 transition-colors ${
								chatWorkspaceLayout === "side_by_side"
									? appearanceDark
										? "border-[#ea580c]/50 bg-[#ea580c]/15 text-[#fb923c]"
										: "border-[#ea580c]/40 bg-[#ea580c]/10 text-[#ea580c]"
									: appearanceDark
										? "border-[#3c3c3c] text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]"
										: "border-[#d4d4d4] text-[#616161] hover:bg-[#e5e5e5]"
							}`}
							aria-pressed={chatWorkspaceLayout === "side_by_side"}
						>
							{chatWorkspaceLayout === "side_by_side" ? <Columns2 size={16} aria-hidden /> : <PanelTop size={16} aria-hidden />}
						</button>
					) : null}
				</div>
				<div className="flex min-h-0 flex-1 flex-col px-5 pb-5">
					{loading ? (
						<p className={`text-sm ${muted}`}>Loading tree…</p>
					) : error ? (
						<p className="text-sm text-red-500">{error}</p>
					) : nodes.length === 0 ? (
						<p className={`text-sm ${muted}`}>No files in workspace yet.</p>
					) : (
						<SimpleFileTree
							nodes={nodes}
							selectedPath={selectedPath}
							onSelectFile={onSelectFile}
							appearanceDark={appearanceDark}
							onExplorerGitMutated={onExplorerGitMutated}
							onMoveFileToDirectory={onMoveFileToDirectory}
							allowWorkspaceRootDrop={allowWorkspaceRootDrop}
						/>
					)}
				</div>
			</div>

			<div
				className={`flex flex-col border-t ${sectionBorder} ${
					happeningOpen
						? `min-h-0 flex-1 ${appearanceDark ? "bg-[#1e1e1e]" : "bg-[#f3f3f3]"}`
						: `shrink-0 ${appearanceDark ? "bg-[#1e1e1e]" : "bg-[#f3f3f3]"}`
				}`}
			>
				<button
					type="button"
					onClick={() => setHappeningOpen((o) => !o)}
					className={`flex w-full items-center justify-between gap-2 px-5 py-3 text-left transition-colors ${
						appearanceDark ? "hover:bg-[#2a2d2e]" : "hover:bg-[#e8e8e8]"
					}`}
					aria-expanded={happeningOpen}
				>
					<h2 className={`flex min-w-0 flex-1 items-center gap-2 text-[13px] font-extrabold uppercase tracking-wider ${title}`}>
						<Clock size={16} className="shrink-0 text-[#fb923c]" />
						What&apos;s Happening
					</h2>
					{happeningOpen ? (
						<ChevronDown size={18} className={`shrink-0 ${muted}`} aria-hidden />
					) : (
						<ChevronRight size={18} className={`shrink-0 ${muted}`} aria-hidden />
					)}
				</button>
				{happeningOpen ? (
					<div className="mx-5 mb-4 min-h-0 flex-1 space-y-6 overflow-y-auto pb-4 pt-1">
						{timeline.map((event, idx) => (
							<div key={`${event.time}-${idx}`} className="group flex gap-3">
								<div className="flex w-5 shrink-0 justify-center pt-1">
									<div
										className={`h-5 w-5 shrink-0 rounded-full border-[3px] transition-all ${timelineBorder} ${
											event.active ? "bg-[#ea580c] shadow-[0_0_0_4px_rgba(0,122,204,0.25)]" : dotIdle
										}`}
										aria-hidden
									/>
								</div>
								<div className="min-w-0 flex-1 flex flex-col">
									<span className={`mb-0.5 text-xs font-bold ${timeC}`}>{event.time}</span>
									<span
										className={`break-words text-[14px] leading-snug ${event.active ? `font-bold ${textActive}` : `font-medium ${textIdle}`}`}
									>
										{event.text}
									</span>
								</div>
							</div>
						))}
					</div>
				) : null}
			</div>
		</aside>
	);
}
