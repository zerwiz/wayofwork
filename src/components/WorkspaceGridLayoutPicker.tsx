import { LayoutGrid } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type WorkspaceGridPickerConfig = {
	cols: number;
	rows: number;
	maxCols: number;
	maxRows: number;
	onSelect: (cols: number, rows: number) => void;
};

/**
 * Zed/IDE-style grid size: hover highlights a rectangle from top-left; click applies columns × rows.
 */
export function WorkspaceGridLayoutPicker({
	cols,
	rows,
	maxCols,
	maxRows,
	onSelect,
	rootClassName,
}: WorkspaceGridPickerConfig & { rootClassName?: string }) {
	const [open, setOpen] = useState(false);
	const [hover, setHover] = useState<{ ci: number; ri: number } | null>(null);
	const rootRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const close = (e: MouseEvent) => {
			if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
		};
		document.addEventListener("mousedown", close);
		return () => document.removeEventListener("mousedown", close);
	}, [open]);

	useEffect(() => {
		if (!open) setHover(null);
	}, [open]);

	return (
		<div ref={rootRef} className={rootClassName ?? "relative flex h-9 shrink-0 items-center px-0.5"}>
			<button
				type="button"
				title={`Editor grid: ${cols}×${rows} — click to change (max ${maxCols}×${maxRows})`}
				aria-label="Editor grid layout"
				aria-expanded={open}
				onClick={() => setOpen((v) => !v)}
				className="flex h-8 w-8 items-center justify-center rounded border border-transparent text-[#858585] hover:border-[#3c3c3c] hover:bg-[#3c3c3c] hover:text-[#cccccc]"
			>
				<LayoutGrid size={16} strokeWidth={2} />
			</button>
			{open ? (
				<div
					className="absolute left-0 top-full z-[8000] mt-0.5 min-w-[200px] rounded border border-[#454545] bg-[#252526] p-2 shadow-xl"
					role="dialog"
					aria-label="Choose workspace grid size"
				>
					<p className="mb-2 px-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#858585]">
						Columns × rows
					</p>
					<div className="flex flex-col gap-0.5">
						{Array.from({ length: maxRows }, (_, ri) => (
							<div key={ri} className="flex gap-0.5">
								{Array.from({ length: maxCols }, (_, ci) => {
									const inCurrent = ci < cols && ri < rows;
									const inHover =
										hover != null && ci <= hover.ci && ri <= hover.ri;
									const isPick = ci === hover?.ci && ri === hover?.ri;
									return (
										<button
											key={`${ci}-${ri}`}
											type="button"
											title={`${ci + 1}×${ri + 1}`}
											className={`h-4 w-4 rounded-sm border transition-colors ${
												inHover
													? "border-[#ea580c] bg-[#ea580c]/45"
													: inCurrent
														? "border-[#ea580c]/70 bg-[#ea580c]/20"
														: "border-[#3c3c3c] bg-[#1e1e1e] hover:border-[#555]"
											} ${isPick ? "ring-1 ring-[#ea580c]" : ""}`}
											onMouseEnter={() => setHover({ ci, ri })}
											onClick={() => {
												onSelect(ci + 1, ri + 1);
												setOpen(false);
												setHover(null);
											}}
										/>
									);
								})}
							</div>
						))}
					</div>
					<p className="mt-2 px-0.5 font-mono text-[10px] text-[#6b6b6b]">
						Current: {cols}×{rows}
					</p>
				</div>
			) : null}
		</div>
	);
}
