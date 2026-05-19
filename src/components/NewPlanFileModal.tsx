import { FilePlus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { planRelativePathForDate, sanitizePlanSlug } from "../utils/planModeArtifacts";

/**
 * In-app dialog for creating a new plan document.
 * Uses React state instead of window.prompt so it works in Electron's sandboxed renderer.
 */
export function NewPlanFileModal({
	open,
	onDismiss,
	onCreate,
	appearanceDark = true,
}: {
	open: boolean;
	onDismiss: () => void;
	onCreate: (title: string, slugSuggestion: string) => void;
	/** Match Simple / Claw appearance and shared modal styling (`llmFixModalAppearanceDark` in App). */
	appearanceDark?: boolean;
}) {
	const [title, setTitle] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!open) return;
		setTitle("");
		const id = requestAnimationFrame(() => inputRef.current?.focus());
		return () => cancelAnimationFrame(id);
	}, [open]);

	const slug = useMemo(() => sanitizePlanSlug(title || "plan"), [title]);
	const previewPath = useMemo(() => planRelativePathForDate(new Date(), slug), [slug]);

	const panel = appearanceDark
		? "border-[#454545] bg-[#252526] text-[#cccccc]"
		: "border-[#e5e5e5] bg-white text-[#333333]";
	const headerBorder = appearanceDark ? "border-b border-[#3c3c3c]" : "border-b border-[#e5e5e5]";
	const muted = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const labelMuted = appearanceDark ? "text-[#858585]" : "text-[#6b7280]";
	const inputClass = appearanceDark
		? "w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-[13px] text-[#cccccc] outline-none focus:border-[#c586c0]/70 placeholder:text-[#555]"
		: "w-full rounded border border-[#d1d5db] bg-white px-3 py-2 text-[13px] text-[#111827] outline-none focus:border-[#7c3aed]/60 placeholder:text-[#9ca3af]";
	const closeBtn = appearanceDark
		? "rounded p-1 text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]"
		: "rounded p-1 text-[#616161] hover:bg-[#e5e5e5] hover:text-[#333333]";
	const cancelBtn = appearanceDark
		? "rounded border border-[#3c3c3c] bg-[#3c3c3c] px-3 py-1.5 text-[13px] text-[#cccccc] hover:bg-[#4a4a4a]"
		: "rounded border border-[#e5e5e5] bg-[#f3f3f3] px-3 py-1.5 text-[13px] text-[#333333] hover:bg-[#e5e5e5]";

	if (!open) return null;

	const submit = () => {
		const t = title.trim();
		onCreate(t || "Plan", t || "plan");
	};

	return (
		<div
			className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/60 p-4"
			role="presentation"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onDismiss();
			}}
		>
			<div
				className={`flex w-full max-w-md flex-col overflow-hidden rounded-xl border shadow-2xl ${panel}`}
				role="dialog"
				aria-labelledby="new-plan-file-title"
				aria-modal="true"
				onMouseDown={(e) => e.stopPropagation()}
			>
				<div className={`flex items-center justify-between px-4 py-3 ${headerBorder}`}>
					<h2 id="new-plan-file-title" className="flex items-center gap-2 text-[15px] font-semibold">
						<FilePlus size={16} className="text-[#c586c0]" />
						New plan document
					</h2>
					<button
						type="button"
						onClick={onDismiss}
						className={closeBtn}
						aria-label="Close"
					>
						<X size={20} />
					</button>
				</div>

				<div className="flex flex-col gap-3 px-4 py-4">
					<div className="flex flex-col gap-1">
						<label
							htmlFor="plan-title-input"
							className={`text-[11px] font-semibold uppercase tracking-wide ${labelMuted}`}
						>
							Title
						</label>
						<input
							id="plan-title-input"
							ref={inputRef}
							type="text"
							value={title}
							placeholder="e.g. Auth refactor"
							onChange={(e) => setTitle(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									submit();
								}
								if (e.key === "Escape") {
									e.preventDefault();
									onDismiss();
								}
							}}
							className={inputClass}
							autoComplete="off"
							spellCheck={false}
						/>
					</div>

					<p className={`font-mono text-[11px] ${muted}`}>
						Will create:{" "}
						<span className="text-[#c586c0]">{previewPath}</span>
					</p>

					<div className="flex justify-end gap-2 pt-1">
						<button
							type="button"
							onClick={onDismiss}
							className={cancelBtn}
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={submit}
							className="inline-flex items-center gap-1.5 rounded bg-[#7c3aed] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[#6d28d9]"
						>
							<FilePlus size={13} />
							Create
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
