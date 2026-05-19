import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export interface CommandItem {
	id: string;
	label: string;
	detail?: string;
	keywords?: string[];
	run: () => void;
}

export function CommandPalette({
	open,
	onClose,
	items,
}: {
	open: boolean;
	onClose: () => void;
	items: CommandItem[];
}) {
	const [q, setQ] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const [highlight, setHighlight] = useState(0);

	const filtered = useMemo(() => {
		const t = q.trim().toLowerCase();
		if (!t) return items.slice(0, 50);
		return items
			.filter((it) => {
				const hay = `${it.label} ${it.detail ?? ""} ${(it.keywords ?? []).join(" ")}`.toLowerCase();
				return hay.includes(t);
			})
			.slice(0, 50);
	}, [items, q]);

	useEffect(() => {
		if (open) {
			setQ("");
			setHighlight(0);
			queueMicrotask(() => inputRef.current?.focus());
		}
	}, [open]);

	useEffect(() => {
		if (highlight >= filtered.length) setHighlight(0);
	}, [filtered.length, highlight]);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				onClose();
			}
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setHighlight((i) => Math.min(i + 1, filtered.length - 1));
			}
			if (e.key === "ArrowUp") {
				e.preventDefault();
				setHighlight((i) => Math.max(i - 1, 0));
			}
			if (e.key === "Enter" && filtered[highlight]) {
				e.preventDefault();
				filtered[highlight]!.run();
				onClose();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, filtered, highlight, onClose]);

	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-[200] flex items-start justify-center bg-black/55 pt-[12vh] backdrop-blur-[1px]"
			role="presentation"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				className="flex w-[min(560px,92vw)] flex-col overflow-hidden rounded border border-[#3c3c3c] bg-[#252526] shadow-2xl"
				role="dialog"
				aria-label="Command palette"
			>
				<div className="flex items-center gap-2 border-b border-[#3c3c3c] px-3 py-2">
					<Search size={16} className="shrink-0 text-[#858585]" />
					<input
						ref={inputRef}
						value={q}
						onChange={(e) => setQ(e.target.value)}
						placeholder="Type a command or search…"
						className="min-w-0 flex-1 bg-transparent py-1 text-[14px] text-[#cccccc] outline-none placeholder:text-[#858585]"
					/>
					<span
					className="shrink-0 cursor-pointer font-mono text-[10px] text-[#858585] hover:text-[#cccccc]"
					onClick={onClose}
				>
					Esc
				</span>
				</div>
				<ul className="max-h-[min(360px,50vh)] overflow-y-auto py-1">
					{filtered.length === 0 ? (
						<li className="px-4 py-3 font-mono text-[12px] text-[#858585]">No matches.</li>
					) : (
						filtered.map((it, idx) => (
							<li key={it.id}>
								<button
									type="button"
									onClick={() => {
										it.run();
										onClose();
									}}
									className={`flex w-full flex-col items-start gap-0.5 px-4 py-2 text-left text-[13px] ${
										idx === highlight ? "bg-[#ea580c]/25 text-white" : "text-[#cccccc] hover:bg-[#2d2d2d]"
									}`}
								>
									<span>{it.label}</span>
									{it.detail ? (
										<span className="font-mono text-[11px] text-[#858585]">{it.detail}</span>
									) : null}
								</button>
							</li>
						))
					)}
				</ul>
			</div>
		</div>
	);
}
