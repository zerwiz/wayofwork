import type { RefObject } from "react";

export function EditorFindBar({
	replaceMode,
	query,
	replaceWith,
	findInputRef,
	onQuery,
	onReplaceWith,
	onNext,
	onPrev,
	onReplaceOne,
	onReplaceAll,
	onClose,
}: {
	replaceMode: boolean;
	query: string;
	replaceWith: string;
	findInputRef?: RefObject<HTMLInputElement | null>;
	onQuery: (q: string) => void;
	onReplaceWith: (r: string) => void;
	onNext: () => void;
	onPrev: () => void;
	onReplaceOne: () => void;
	onReplaceAll: () => void;
	onClose: () => void;
}) {
	return (
		<div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-[#3c3c3c] bg-[#252526] px-2 py-1.5 font-mono text-[12px]">
			<span className="text-[#858585]">{replaceMode ? "Replace" : "Find"}</span>
			<input
				ref={findInputRef}
				type="text"
				value={query}
				onChange={(e) => onQuery(e.target.value)}
				placeholder="Find"
				className="min-w-[120px] flex-1 rounded border border-[#3c3c3c] bg-[#1e1e1e] px-2 py-0.5 text-[#cccccc] outline-none focus:border-[#ea580c]"
				aria-label="Find"
			/>
			{replaceMode ? (
				<input
					type="text"
					value={replaceWith}
					onChange={(e) => onReplaceWith(e.target.value)}
					placeholder="Replace"
					className="min-w-[120px] flex-1 rounded border border-[#3c3c3c] bg-[#1e1e1e] px-2 py-0.5 text-[#cccccc] outline-none focus:border-[#ea580c]"
					aria-label="Replace with"
				/>
			) : null}
			<button
				type="button"
				onClick={onPrev}
				className="rounded border border-[#454545] px-2 py-0.5 text-[#cccccc] hover:bg-[#3c3c3c]"
			>
				Prev
			</button>
			<button
				type="button"
				onClick={onNext}
				className="rounded border border-[#454545] px-2 py-0.5 text-[#cccccc] hover:bg-[#3c3c3c]"
			>
				Next
			</button>
			{replaceMode ? (
				<>
					<button
						type="button"
						onClick={onReplaceOne}
						className="rounded border border-[#454545] px-2 py-0.5 text-[#cccccc] hover:bg-[#3c3c3c]"
					>
						Replace
					</button>
					<button
						type="button"
						onClick={onReplaceAll}
						className="rounded border border-[#454545] px-2 py-0.5 text-[#cccccc] hover:bg-[#3c3c3c]"
					>
						All
					</button>
				</>
			) : null}
			<button
				type="button"
				onClick={onClose}
				className="ml-auto rounded px-2 py-0.5 text-[#858585] hover:bg-[#3c3c3c] hover:text-white"
			>
				Esc
			</button>
		</div>
	);
}
