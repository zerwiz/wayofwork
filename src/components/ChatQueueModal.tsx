import { ListOrdered, Play, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ChatQueueItem } from "../utils/chatQueueTranscript";

/** Inspect / edit / delete / prioritize pending user messages (server queue while a reply streams). */
export function ChatQueueModal({
	open,
	onClose,
	items,
	connected,
	streaming,
	onEdit,
	onDelete,
	onForce,
	appearanceDark = true,
}: {
	open: boolean;
	onClose: () => void;
	items: ChatQueueItem[];
	connected: boolean;
	/** Assistant reply in flight — “force” moves a message to the head of the queue. */
	streaming: boolean;
	onEdit: (id: string, text: string) => void;
	onDelete: (id: string) => void;
	onForce: (id: string) => void;
	appearanceDark?: boolean;
}) {
	const [drafts, setDrafts] = useState<Record<string, string>>({});

	useEffect(() => {
		if (!open) return;
		const next: Record<string, string> = {};
		for (const q of items) next[q.id] = q.text;
		setDrafts(next);
	}, [open, items]);

	if (!open) return null;

	const overlay = appearanceDark ? "bg-black/55" : "bg-black/35";
	const panel = appearanceDark
		? "border-[#3c3c3c] bg-[#252526] text-[#cccccc] shadow-2xl"
		: "border-[#e5e5e5] bg-white text-[#333333] shadow-2xl";
	const muted = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const card = appearanceDark ? "border-[#3c3c3c] bg-[#1e1e1e]" : "border-[#e5e5e5] bg-[#fafafa]";
	const ta = appearanceDark
		? "border-[#3c3c3c] bg-[#1e1e1e] text-[#cccccc] placeholder:text-[#858585]"
		: "border-[#d4d4d4] bg-white text-[#333333] placeholder:text-[#858585]";

	return (
		<div
			className={`fixed inset-0 z-[200] flex items-center justify-center p-4 ${overlay}`}
			role="dialog"
			aria-modal
			aria-labelledby="wop-chat-queue-title"
			onClick={onClose}
		>
			<div
				className={`relative flex max-h-[min(85vh,640px)] w-full max-w-lg flex-col rounded-xl border ${panel}`}
				onClick={(e) => e.stopPropagation()}
			>
				<div
					className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${appearanceDark ? "border-[#3c3c3c]/80" : "border-[#e5e5e5]"}`}
				>
					<div className="flex min-w-0 items-center gap-2">
						<ListOrdered className="shrink-0 text-[#ea580c]" size={20} />
						<h2 id="wop-chat-queue-title" className="truncate text-sm font-bold tracking-tight">
							Queued messages
						</h2>
					</div>
					<button
						type="button"
						onClick={onClose}
						className={`rounded-lg p-1.5 ${appearanceDark ? "text-[#858585] hover:bg-[#3c3c3c] hover:text-white" : "text-[#616161] hover:bg-[#ececec]"}`}
						aria-label="Close"
					>
						<X size={18} />
					</button>
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
					{!connected ? (
						<p className={`text-sm ${muted}`}>Connect to the server to manage the queue.</p>
					) : items.length === 0 ? (
						<p className={`text-sm ${muted}`}>Nothing is queued right now.</p>
					) : (
						<ol className="flex flex-col gap-3">
							{items.map((q, i) => (
								<li key={q.id} className={`rounded-lg border p-3 ${card}`}>
									<div className={`mb-2 flex items-center justify-between gap-2 text-[11px] font-mono font-semibold uppercase tracking-wide ${muted}`}>
										<span>
											#{i + 1}
											{i === 0 && streaming ? " — runs next" : ""}
										</span>
										<span className="truncate font-normal opacity-80" title={q.id}>
											{q.id.slice(0, 8)}…
										</span>
									</div>
									<textarea
										value={drafts[q.id] ?? q.text}
										onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
										rows={4}
										className={`mb-3 w-full resize-y rounded-md border px-2 py-1.5 font-mono text-[13px] leading-snug outline-none ring-0 focus:border-[#ea580c] ${ta}`}
										disabled={!connected}
									/>
									<div className="flex flex-wrap items-center gap-2">
										<button
											type="button"
											disabled={
												!connected ||
												(drafts[q.id] ?? q.text).trim() === "" ||
												(drafts[q.id] ?? q.text).trim() === q.text.trim()
											}
											onClick={() => onEdit(q.id, (drafts[q.id] ?? q.text).trim())}
											className="rounded-md bg-[#ea580c] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#c2410c] disabled:cursor-not-allowed disabled:opacity-40"
										>
											Save edit
										</button>
										<button
											type="button"
											disabled={!connected}
											onClick={() => onDelete(q.id)}
											className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-bold ${
												appearanceDark
													? "border-red-500/40 text-red-300 hover:bg-red-500/15"
													: "border-red-300 text-red-700 hover:bg-red-50"
											} disabled:opacity-40`}
										>
											<Trash2 size={14} /> Remove
										</button>
										<button
											type="button"
											disabled={!connected || (streaming && i === 0)}
											title={
												streaming
													? i === 0
														? "Already next in line"
														: "Move to front — runs after the current reply"
													: "Send this message now (starts the next turn)"
											}
											onClick={() => onForce(q.id)}
											className={`ml-auto flex items-center gap-1 rounded-md border border-[#ea580c]/50 bg-[#ea580c]/15 px-3 py-1.5 text-xs font-bold text-[#fdba74] hover:bg-[#ea580c]/25 disabled:opacity-40`}
										>
											<Play size={14} />
											{streaming ? "Run next" : "Send now"}
										</button>
									</div>
								</li>
							))}
						</ol>
					)}
				</div>

				<div
					className={`border-t px-4 py-2.5 text-[11px] leading-snug ${muted} ${appearanceDark ? "border-[#3c3c3c]/80" : "border-[#e5e5e5]"}`}
				>
					While a reply is streaming, new messages queue here. <strong className="text-[#ea580c]">Run next</strong> moves a
					message to the head of the line. <strong className="text-[#ea580c]">Send now</strong> starts it immediately when
					the assistant is idle.
				</div>
			</div>
		</div>
	);
}
