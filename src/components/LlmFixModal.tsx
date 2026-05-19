import { X } from "lucide-react";
import { createPortal } from "react-dom";
// uiMode typed as string

/** Shown when chat fails for model/provider reasons so users can jump to the right UI. */
export function LlmFixModal({
	open,
	onClose,
	errorMessage,
	appearanceDark,
	uiMode,
	onOpenSimpleAiBrains,
	onOpenProviderCatalog,
	onClearError,
}: {
	open: boolean;
	onClose: () => void;
	errorMessage: string;
	appearanceDark: boolean;
	uiMode: string;
	onOpenSimpleAiBrains: () => void;
	onOpenProviderCatalog: () => void;
	onClearError: () => void;
}) {
	if (!open) return null;

	const panel = appearanceDark
		? "border-[#3c3c3c] bg-[#252526] text-[#cccccc]"
		: "border-[#e5e5e5] bg-white text-[#333333]";
	const muted = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const borderB = appearanceDark ? "border-[#3c3c3c]" : "border-[#e5e5e5]";
	const primaryBtn = appearanceDark
		? "bg-[#0e639c] text-white hover:bg-[#1177bb]"
		: "bg-[#007acc] text-white hover:bg-[#0062a3]";
	const ghostBtn = appearanceDark
		? "border border-[#3c3c3c] bg-[#3c3c3c] text-[#cccccc] hover:bg-[#4a4a4a]"
		: "border border-[#e5e5e5] bg-[#f3f3f3] text-[#333333] hover:bg-[#e5e5e5]";

	const clearAndClose = () => {
		onClearError();
		onClose();
	};

	const portalTarget = typeof document !== "undefined" ? document.body : null;
	if (!portalTarget) return null;

	return createPortal(
		<div
			className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/60 p-4"
			role="presentation"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				className={`flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border shadow-2xl ${panel}`}
				role="dialog"
				aria-labelledby="llm-fix-title"
				aria-describedby="llm-fix-desc"
				onMouseDown={(e) => e.stopPropagation()}
			>
				<div className={`flex items-center justify-between border-b px-4 py-3 ${borderB}`}>
					<h2 id="llm-fix-title" className="text-lg font-bold">
						Fix model or provider
					</h2>
					<button
						type="button"
						onClick={onClose}
						className={`rounded p-1 ${appearanceDark ? "text-[#858585] hover:bg-[#3c3c3c]" : "text-[#616161] hover:bg-[#e5e5e5]"}`}
						aria-label="Close"
					>
						<X size={20} />
					</button>
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto p-4">
					<p id="llm-fix-desc" className={`mb-3 text-sm leading-relaxed ${muted}`}>
						The server reported a problem talking to the language model. Adjust the{" "}
						<strong className={appearanceDark ? "text-[#d4d4d4]" : "text-[#111]"}>session model</strong>, host
						environment (<span className="font-mono text-xs">WOP_LLM_PROVIDER</span>,{" "}
						<span className="font-mono text-xs">OLLAMA_*</span>,{" "}
						<span className="font-mono text-xs">OPENROUTER_*</span>), or workspace provider JSON.
					</p>
					<pre
						className={`mb-4 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border p-3 font-mono text-[12px] leading-relaxed ${
							appearanceDark ? "border-[#f14c4c]/35 bg-[#1e1e1e] text-[#f14c4c]" : "border-red-200 bg-red-50 text-red-900"
						}`}
					>
						{errorMessage}
					</pre>
					<ul className={`mb-4 list-inside list-disc space-y-1.5 text-sm ${muted}`}>
						<li>
							<span className="font-mono text-[11px]">Ollama</span>: correct model tag, running daemon,{" "}
							<span className="font-mono text-[11px]">ollama pull …</span> if missing.
						</li>
						<li>
							<span className="font-mono text-[11px]">OpenRouter</span>:{" "}
							<span className="font-mono text-[11px]">OPENROUTER_API_KEY</span> on the host; valid model id.
						</li>
						<li>
							Switching <span className="font-mono text-[11px]">ollama</span> vs{" "}
							<span className="font-mono text-[11px]">openrouter</span> requires restarting the Way of Pi server with
							updated env.
						</li>
					</ul>
					<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
						{uiMode === "simple" ? (
							<button type="button" className={`rounded-lg px-4 py-2.5 text-sm font-medium ${primaryBtn}`} onClick={onOpenSimpleAiBrains}>
								Open AI Brains &amp; models
							</button>
						) : (
							<>
								<button
									type="button"
									className={`rounded-lg px-4 py-2.5 text-sm font-medium ${primaryBtn}`}
									onClick={onOpenProviderCatalog}
								>
									Open agent/models.json
								</button>
								<button
									type="button"
									className={`rounded-lg px-4 py-2.5 text-sm font-medium ${ghostBtn}`}
									onClick={onOpenSimpleAiBrains}
								>
									Simple UI · AI Brains
								</button>
							</>
						)}
					</div>
					{uiMode === "technical" ? (
						<p className={`mt-3 text-xs ${muted}`}>
							Status bar (bottom): model menu lists the active id; workspace provider files match Pi{" "}
							<span className="font-mono text-[10px]">/models</span>.
						</p>
					) : uiMode === "claw" ? (
						<p className={`mt-3 text-xs ${muted}`}>
							In Claw, open <strong className={appearanceDark ? "text-[#d4d4d4]" : "text-[#111]"}>Settings</strong> for
							models and workspace provider files, or use the model strip; they mirror the active session id and Pi{" "}
							<span className="font-mono text-[10px]">/models</span> where applicable.
						</p>
					) : null}
				</div>
				<div className={`flex flex-wrap justify-end gap-2 border-t px-4 py-3 ${borderB}`}>
					<button type="button" className={`rounded-lg px-3 py-2 text-sm ${ghostBtn}`} onClick={onClose}>
						Close
					</button>
					<button type="button" className={`rounded-lg px-3 py-2 text-sm ${primaryBtn}`} onClick={clearAndClose}>
						Clear error
					</button>
				</div>
			</div>
		</div>,
		portalTarget,
	);
}
