import { UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

// Per the window.prompt: letters, numbers, -, _, .
const AGENT_ID_REGEX = /^[a-zA-Z0-9-._]+$/;

/**
 * In-app dialog for creating a new agent definition file.
 * Uses React state instead of window.prompt so it works in Electron's sandboxed renderer.
 */
export function NewAgentModal({
	open,
	onDismiss,
	onCreate,
	appearanceDark = true,
}: {
	open: boolean;
	onDismiss: () => void;
	onCreate: (agentId: string) => void;
	/** Match Simple / Claw appearance and shared modal styling (`llmFixModalAppearanceDark` in App). */
	appearanceDark?: boolean;
}) {
	const [agentId, setAgentId] = useState("my-agent");
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!open) return;
		// Reset to default when opening
		setAgentId("my-agent");
		const id = requestAnimationFrame(() => {
			inputRef.current?.focus();
			inputRef.current?.select();
		});
		return () => cancelAnimationFrame(id);
	}, [open]);

	const isValid = useMemo(() => AGENT_ID_REGEX.test(agentId), [agentId]);
	const previewPath = useMemo(() => `.pi/agents/${agentId}.md`, [agentId]);

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
	const createBtnBase = "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[13px] font-semibold text-white";
	const createBtn = `${createBtnBase} ${isValid ? "bg-[#7c3aed] hover:bg-[#6d28d9]" : "cursor-not-allowed bg-[#5a5a5a]"}`;

	if (!open) return null;

	const submit = () => {
		if (!isValid) return;
		const id = agentId.trim();
		if (id) {
			onCreate(id);
		}
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
				aria-labelledby="new-agent-modal-title"
				aria-modal="true"
				onMouseDown={(e) => e.stopPropagation()}
			>
				<div className={`flex items-center justify-between px-4 py-3 ${headerBorder}`}>
					<h2 id="new-agent-modal-title" className="flex items-center gap-2 text-[15px] font-semibold">
						<UserPlus size={16} className="text-[#c586c0]" />
						New agent
					</h2>
					<button type="button" onClick={onDismiss} className={closeBtn} aria-label="Close">
						<X size={20} />
					</button>
				</div>

				<div className="flex flex-col gap-3 px-4 py-4">
					<div className="flex flex-col gap-1">
						<label
							htmlFor="agent-id-input"
							className={`text-[11px] font-semibold uppercase tracking-wide ${labelMuted}`}
						>
							New agent ID
						</label>
						<input
							id="agent-id-input"
							ref={inputRef}
							type="text"
							value={agentId}
							placeholder="my-new-agent"
							onChange={(e) => setAgentId(e.target.value)}
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
						<p className={`mt-1 font-mono text-[11px] ${labelMuted}`}>
							Filename and YAML name; letters, numbers, -, _, .
						</p>
					</div>

					<p className={`font-mono text-[11px] ${muted}`}>
						Will create: <span className="text-[#c586c0]">{previewPath}</span>
					</p>

					<div className="flex justify-end gap-2 pt-1">
						<button type="button" onClick={onDismiss} className={cancelBtn}>
							Cancel
						</button>
						<button type="button" onClick={submit} disabled={!isValid} className={createBtn}>
							<UserPlus size={13} />
							Create
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
