/**
 * Claw chat — vertical list of all chat sessions (always visible beside the transcript).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, Pencil, X } from "lucide-react";
import type { ChatSessionTab } from "../../hooks/useWayOfPiSession";

export function ClawSessionSidebar({
	tabs,
	activeTabId,
	onSelect,
	onClose,
	onRename,
	dark,
	streaming,
	presentation = "rail",
}: {
	tabs: ChatSessionTab[];
	activeTabId: string;
	onSelect: (id: string) => void;
	onClose: (id: string) => void;
	onRename: (id: string, label: string) => void;
	dark: boolean;
	/** When true on the active tab, close/clear is blocked until the reply finishes. */
	streaming?: boolean;
	/** `sheet` = full width (bottom sheet); `rail` = fixed narrow column beside chat. */
	presentation?: "rail" | "sheet";
}) {
	const [editingId, setEditingId] = useState<string | null>(null);
	const [draft, setDraft] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	/** Escape sets this so the following `blur` does not persist the draft. */
	const skipBlurCommitRef = useRef(false);

	const beginEdit = useCallback((tab: ChatSessionTab) => {
		skipBlurCommitRef.current = false;
		setEditingId(tab.id);
		setDraft(tab.label);
	}, []);

	const commitEdit = useCallback(() => {
		if (editingId != null) {
			onRename(editingId, draft);
		}
		setEditingId(null);
	}, [draft, editingId, onRename]);

	const cancelEdit = useCallback(() => {
		skipBlurCommitRef.current = true;
		setEditingId(null);
	}, []);

	useEffect(() => {
		if (editingId == null) return;
		const el = inputRef.current;
		if (!el) return;
		el.focus();
		el.select();
	}, [editingId]);

	const inputClass = dark
		? "min-w-0 flex-1 rounded border border-[#3c3c3c] bg-[#1e1e1e] px-2 py-1 text-[12px] font-medium text-[#cccccc] outline-none focus:border-[#ea580c]/60"
		: "min-w-0 flex-1 rounded border border-[#d4d4d4] bg-white px-2 py-1 text-[12px] font-medium text-[#333333] outline-none focus:border-[#ea580c]/60";

	const pencilBtn = dark
		? "mr-0.5 shrink-0 rounded p-1 text-[#585858] opacity-0 transition-opacity hover:bg-[#3c3c3c] hover:text-[#cccccc] group-hover:opacity-100 group-focus-within:opacity-100"
		: "mr-0.5 shrink-0 rounded p-1 text-[#aaaaaa] opacity-0 transition-opacity hover:bg-[#e5e5e5] hover:text-[#555555] group-hover:opacity-100 group-focus-within:opacity-100";

	const border = dark ? "border-[#252526]" : "border-[#e5e5e5]";
	const headerBg = dark ? "bg-[#1a1a1a]" : "bg-[#f0f0f0]";
	const listBg = dark ? "bg-[#161616]" : "bg-[#fafafa]";
	const itemActive = dark
		? "border-l-2 border-l-[#ea580c] bg-[#252526] text-[#cccccc]"
		: "border-l-2 border-l-[#ea580c] bg-white text-[#333333] shadow-sm";
	const itemIdle = dark
		? "border-l-2 border-l-transparent text-[#858585] hover:bg-[#1e1e1e] hover:text-[#cccccc]"
		: "border-l-2 border-l-transparent text-[#666666] hover:bg-[#f0f0f0] hover:text-[#333333]";
	const closeBtn = dark
		? "rounded p-0.5 text-[#585858] hover:bg-[#3c3c3c] hover:text-[#cccccc]"
		: "rounded p-0.5 text-[#aaaaaa] hover:bg-[#e5e5e5] hover:text-[#555555]";

	const widthClass =
		presentation === "sheet"
			? "flex w-full min-w-0 max-w-none shrink-0 flex-col"
			: `flex w-[min(260px,34vw)] min-w-[200px] max-w-[300px] shrink-0 flex-col border-l ${border}`;

	return (
		<aside className={`${widthClass} ${listBg}`} aria-label="Chat sessions">
			<div
				className={`flex shrink-0 items-center justify-between border-b px-3 py-2 ${border} ${headerBg}`}
			>
				<span
					className={`text-[10px] font-bold uppercase tracking-widest ${dark ? "text-[#858585]" : "text-[#888888]"}`}
				>
					Chats
				</span>
				<span className={`font-mono text-[10px] ${dark ? "text-[#585858]" : "text-[#aaaaaa]"}`}>
					{tabs.length}
				</span>
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
				<ul className="flex flex-col gap-0.5 p-1.5">
					{tabs.map((tab) => {
						const isActive = tab.id === activeTabId;
						const isEditing = editingId === tab.id;
						const closeDisabled = Boolean(streaming) && isActive;
						const soleTab = tabs.length <= 1;
						return (
							<li key={tab.id}>
								<div
									className={`group flex items-stretch rounded-md border border-transparent ${
										isActive ? itemActive : itemIdle
									}`}
								>
									{isEditing ? (
										<div className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2">
											<MessageSquare size={14} className="shrink-0 opacity-70" aria-hidden />
											<input
												ref={inputRef}
												type="text"
												className={inputClass}
												value={draft}
												aria-label="Chat name"
												onChange={(e) => setDraft(e.target.value)}
												onKeyDown={(e) => {
													if (e.key === "Enter") {
														e.preventDefault();
														skipBlurCommitRef.current = false;
														commitEdit();
													} else if (e.key === "Escape") {
														e.preventDefault();
														cancelEdit();
													}
												}}
												onBlur={() => {
													if (skipBlurCommitRef.current) {
														skipBlurCommitRef.current = false;
														return;
													}
													commitEdit();
												}}
											/>
										</div>
									) : (
										<>
											<button
												type="button"
												onClick={() => onSelect(tab.id)}
												onDoubleClick={(e) => {
													e.preventDefault();
													beginEdit(tab);
												}}
												className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2.5 text-left text-[12px] font-medium"
												title={`${tab.label} — double-click to rename`}
											>
												<MessageSquare size={14} className="shrink-0 opacity-70" aria-hidden />
												<span className="min-w-0 flex-1 truncate leading-snug">{tab.label}</span>
											</button>
											<button
												type="button"
												className={pencilBtn}
												title="Rename chat"
												aria-label={`Rename chat “${tab.label}”`}
												onClick={(e) => {
													e.preventDefault();
													e.stopPropagation();
													beginEdit(tab);
												}}
											>
												<Pencil size={12} aria-hidden />
											</button>
										</>
									)}
									<button
										type="button"
										disabled={closeDisabled}
										onClick={(e) => {
											e.stopPropagation();
											if (closeDisabled) return;
											if (editingId === tab.id) {
												cancelEdit();
											}
											onClose(tab.id);
										}}
										className={`my-1 mr-1 shrink-0 self-center ${closeBtn} disabled:cursor-not-allowed disabled:opacity-40`}
										title={
											closeDisabled
												? "Wait for the current reply to finish"
												: soleTab
													? "Clear this chat (starts a fresh session)"
													: "Close this chat"
										}
										aria-label={
											soleTab
												? `Clear chat “${tab.label}” and start fresh`
												: `Close session “${tab.label}”`
										}
									>
										<X size={12} />
									</button>
								</div>
							</li>
						);
					})}
				</ul>
			</div>
		</aside>
	);
}
