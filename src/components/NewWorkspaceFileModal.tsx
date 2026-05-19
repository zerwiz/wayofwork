import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * In-app path entry for new workspace files. Electron’s sandboxed renderer often does not show
 * `window.prompt`, so the dock “New file” flow must not rely on it.
 */
export function NewWorkspaceFileModal({
	open,
	defaultPath,
	initialContent,
	onDismiss,
	onCreate,
	appearanceDark = true,
}: {
	open: boolean;
	defaultPath: string;
	/** Written after create when user picked a template (Markdown, JSON, …). */
	initialContent?: string;
	onDismiss: () => void;
	onCreate: (relativePath: string, initialContent?: string) => void;
	/** Match Simple / Claw appearance and shared modal styling (`llmFixModalAppearanceDark` in App). */
	appearanceDark?: boolean;
}) {
	const [value, setValue] = useState(defaultPath);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!open) return;
		setValue(defaultPath);
		const id = requestAnimationFrame(() => {
			const el = inputRef.current;
			if (!el) return;
			el.focus();
			el.select();
		});
		return () => cancelAnimationFrame(id);
	}, [open, defaultPath]);

	const panel = appearanceDark
		? "border-[#454545] bg-[#252526] text-[#cccccc]"
		: "border-[#e5e5e5] bg-white text-[#333333]";
	const headerRow = appearanceDark
		? "flex items-center justify-between border-b border-[#3c3c3c] px-4 py-3"
		: "flex items-center justify-between border-b border-[#e5e5e5] px-4 py-3";
	const muted = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const codeInline = appearanceDark ? "text-[#c586c0]" : "text-[#7c3aed]";
	const inputClass = appearanceDark
		? "w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 font-mono text-[13px] text-[#cccccc] outline-none focus:border-[#0e639c]"
		: "w-full rounded border border-[#d1d5db] bg-white px-3 py-2 font-mono text-[13px] text-[#111827] outline-none focus:border-[#7c3aed]/60";
	const closeBtn = appearanceDark
		? "rounded p-1 text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]"
		: "rounded p-1 text-[#616161] hover:bg-[#e5e5e5] hover:text-[#333333]";
	const cancelBtn = appearanceDark
		? "rounded border border-[#3c3c3c] bg-[#3c3c3c] px-3 py-1.5 text-[13px] text-[#cccccc] hover:bg-[#4a4a4a]"
		: "rounded border border-[#e5e5e5] bg-[#f3f3f3] px-3 py-1.5 text-[13px] text-[#333333] hover:bg-[#e5e5e5]";
	const createBtn = appearanceDark
		? "rounded bg-[#0e639c] px-3 py-1.5 text-[13px] text-white hover:bg-[#1177bb]"
		: "rounded bg-[#7c3aed] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[#6d28d9]";

	if (!open) return null;

	const submit = () => {
		const t = value.trim();
		if (!t) return;
		onCreate(t, initialContent);
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
				aria-labelledby="new-ws-file-title"
				aria-modal="true"
				onMouseDown={(e) => e.stopPropagation()}
			>
				<div className={headerRow}>
					<h2 id="new-ws-file-title" className="text-[15px] font-semibold">
						New file
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
					<p className={`text-[12px] leading-relaxed ${muted}`}>
						Path relative to the workspace (same as the file tree). You can include folders, e.g.{" "}
						<code className={codeInline}>docs/notes.md</code>.
					</p>
					<input
						ref={inputRef}
						type="text"
						value={value}
						onChange={(e) => setValue(e.target.value)}
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
							className={createBtn}
						>
							Create
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
