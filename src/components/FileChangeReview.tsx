import { ChevronDown, ChevronUp, Eye, EyeOff, Save } from "lucide-react";
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	computeFileChangeHunks,
	computeUnifiedDiffRows,
	revertHunkInModified,
	type UnifiedDiffRow,
} from "../utils/fileDiffHunks";

export type FileChangeReviewProps = {
	/** Last saved / disk baseline. */
	original: string;
	/** Current editor buffer. */
	modified: string;
	onChange: (next: string) => void;
	onSave: () => void | Promise<void>;
	onClose: () => void;
	compact?: boolean;
};

export const FileChangeReview = forwardRef<HTMLDivElement, FileChangeReviewProps>(function FileChangeReview(
	{ original, modified, onChange, onSave, onClose, compact },
	ref,
) {
	const hunks = useMemo(() => computeFileChangeHunks(original, modified), [original, modified]);
	const rows = useMemo(() => computeUnifiedDiffRows(original, modified), [original, modified]);
	const [currentHunk, setCurrentHunk] = useState(0);
	const hunkCount = hunks.length;
	const scrollAreaRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setCurrentHunk((i) => {
			if (hunkCount === 0) return 0;
			return Math.min(Math.max(0, i), hunkCount - 1);
		});
	}, [hunkCount, modified]);

	useEffect(() => {
		if (hunkCount === 0) return;
		const el = scrollAreaRef.current?.querySelector(`[data-wop-hunk-anchor="${currentHunk}"]`);
		el?.scrollIntoView({ block: "center", behavior: "smooth" });
	}, [currentHunk, hunkCount, rows]);

	const onUndoHunk = useCallback(() => {
		if (hunkCount === 0 || currentHunk < 0 || currentHunk >= hunks.length) return;
		const h = hunks[currentHunk];
		onChange(revertHunkInModified(modified, h));
	}, [currentHunk, hunks, hunkCount, modified, onChange]);

	const onKeepHunk = useCallback(() => {
		if (hunkCount === 0) return;
		setCurrentHunk((i) => Math.min(i + 1, hunkCount - 1));
	}, [hunkCount]);

	const onPrevHunk = useCallback(() => {
		setCurrentHunk((i) => Math.max(0, i - 1));
	}, []);

	const onNextHunk = useCallback(() => {
		setCurrentHunk((i) => Math.min(hunkCount - 1, i + 1));
	}, [hunkCount]);

	const onDiscardAll = useCallback(() => {
		onChange(original);
		onClose();
	}, [original, onChange, onClose]);

	const onKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				onClose();
				return;
			}
			if (hunkCount === 0) return;
			if (e.key === "ArrowUp" && (e.altKey || e.metaKey)) {
				e.preventDefault();
				onPrevHunk();
			} else if (e.key === "ArrowDown" && (e.altKey || e.metaKey)) {
				e.preventDefault();
				onNextHunk();
			} else if (e.key.toLowerCase() === "z" && e.altKey && !e.ctrlKey && !e.metaKey) {
				e.preventDefault();
				onUndoHunk();
			} else if (e.key.toLowerCase() === "k" && e.altKey && !e.ctrlKey && !e.metaKey) {
				e.preventDefault();
				onKeepHunk();
			}
		},
		[hunkCount, onClose, onKeepHunk, onNextHunk, onPrevHunk, onUndoHunk],
	);

	const textSize = compact ? "text-[13px] leading-snug" : "text-[14px] leading-relaxed";

	const rowHunkIndex = (r: UnifiedDiffRow): number | null => {
		if (r.kind === "context") return null;
		return r.hunkIndex;
	};

	return (
		<div
			ref={ref}
			className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-[#1e1e1e] outline-none"
			role="region"
			aria-label="Review unsaved changes"
			tabIndex={-1}
			onKeyDown={onKeyDown}
		>
			<div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[#3c3c3c] bg-[#2d2d2d] px-2 py-1.5">
				<span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#858585]">
					Review changes
				</span>
				<button
					type="button"
					onClick={() => void onSave()}
					className="flex items-center gap-1 rounded border border-[#ea580c]/60 bg-[#ea580c]/20 px-2 py-1 font-mono text-[11px] text-[#fed7aa] hover:bg-[#ea580c]/35"
				>
					<Save size={12} />
					Save file
				</button>
				<button
					type="button"
					onClick={onDiscardAll}
					className="rounded border border-[#f14c4c]/40 px-2 py-1 font-mono text-[11px] text-[#f14c4c] hover:bg-[#f14c4c]/15"
				>
					Discard all
				</button>
				<button
					type="button"
					onClick={onClose}
					className="ml-auto flex items-center gap-1 rounded px-2 py-1 font-mono text-[11px] text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]"
				>
					<EyeOff size={12} />
					Back to edit
				</button>
			</div>

			<div ref={scrollAreaRef} className="relative min-h-0 flex-1 overflow-auto">
				{hunkCount > 0 ? (
					<div
						className="pointer-events-auto absolute right-3 top-3 z-10 flex flex-col gap-1 rounded border border-[#454545] bg-[#2d2d2d] p-2 shadow-lg"
						role="toolbar"
						aria-label="Change navigation"
					>
						<div className="flex items-center justify-center gap-1 font-mono text-[11px] text-[#cccccc]">
							<button
								type="button"
								title="Previous change (Alt+↑)"
								className="rounded p-0.5 hover:bg-[#3c3c3c]"
								onClick={onPrevHunk}
								disabled={currentHunk <= 0}
							>
								<ChevronUp size={14} />
							</button>
							<span className="min-w-[4.5rem] text-center tabular-nums">
								{currentHunk + 1} / {hunkCount}
							</span>
							<button
								type="button"
								title="Next change (Alt+↓)"
								className="rounded p-0.5 hover:bg-[#3c3c3c]"
								onClick={onNextHunk}
								disabled={currentHunk >= hunkCount - 1}
							>
								<ChevronDown size={14} />
							</button>
						</div>
						<button
							type="button"
							title="Revert this change to last saved (Alt+Z)"
							className="rounded bg-[#3c3c3c] px-2 py-1 font-mono text-[11px] text-[#cccccc] hover:bg-[#505050]"
							onClick={onUndoHunk}
						>
							Undo change
						</button>
						<button
							type="button"
							title="Skip to next change (Alt+K)"
							className="rounded bg-[#9a3412]/80 px-2 py-1 font-mono text-[11px] text-[#fed7aa] hover:bg-[#9a3412]"
							onClick={onKeepHunk}
						>
							Keep & next
						</button>
					</div>
				) : null}

				<div className={`font-mono ${textSize}`}>
					{rows.length === 0 ? (
						<div className="p-4 text-[#858585]">No line differences to show.</div>
					) : (
						rows.map((row, i) => {
							const hIdx = rowHunkIndex(row);
							const active = hIdx !== null && hIdx === currentHunk;
							const prev = i > 0 ? rows[i - 1] : null;
							const prevH =
								prev && prev.kind !== "context"
									? prev.hunkIndex
									: null;
							const h = row.kind !== "context" ? row.hunkIndex : null;
							const firstOfHunk =
								h !== null &&
								(prev === null ||
									prev.kind === "context" ||
									prevH !== h);
							let bg = "";
							let border = "";
							if (row.kind === "removed") {
								bg = "bg-[#3e1a1a]/90";
								border = active ? "border-l-2 border-l-[#f14c4c]" : "";
							} else if (row.kind === "added") {
								bg = "bg-[#1a3e2a]/90";
								border = active ? "border-l-2 border-l-[#89d185]" : "";
							} else if (active) {
								border = "border-l-2 border-l-[#ea580c]";
							}
							const gutter =
								row.kind === "context"
									? `${row.oldNum} ${row.newNum}`
									: row.kind === "removed"
										? `${row.oldNum} `
										: ` ${row.newNum}`;
							return (
								<div
									key={i}
									data-wop-hunk-anchor={firstOfHunk && h !== null ? h : undefined}
									className={`flex min-h-[1.35rem] border-b border-[#2d2d2d]/50 ${bg} ${border}`}
								>
									<span className="w-24 shrink-0 select-none border-r border-[#3c3c3c]/60 pr-2 text-right text-[11px] text-[#858585]">
										{gutter}
									</span>
									<span className="w-6 shrink-0 text-center text-[#858585]">
										{row.kind === "removed" ? (
											<span className="text-[#f14c4c]">−</span>
										) : row.kind === "added" ? (
											<span className="text-[#89d185]">+</span>
										) : (
											" "
										)}
									</span>
									<pre className="min-w-0 flex-1 whitespace-pre-wrap break-all px-2 text-[#d4d4d4]">
										{row.line || " "}
									</pre>
								</div>
							);
						})
					)}
				</div>
			</div>

			<div className="shrink-0 border-t border-[#3c3c3c] bg-[#252526] px-3 py-1.5 font-mono text-[10px] text-[#858585]">
				<span className="inline-flex items-center gap-1">
					<Eye size={11} />
					Alt+↑↓ change · Alt+Z undo hunk · Alt+K next · Esc close
				</span>
			</div>
		</div>
	);
});
