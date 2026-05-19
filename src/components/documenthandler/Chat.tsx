import { Send, Square } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { ChatRow } from "../../hooks/useWayOfPiSession";
import "./Chat.css";

interface ChatProps {
	rows: ChatRow[];
	streaming: boolean;
	connected: boolean;
	onSend: (text: string) => void;
	onStop: () => void;
	appearanceDark?: boolean;
}

export function Chat({
	rows,
	streaming,
	connected,
	onSend,
	onStop,
	appearanceDark = true,
}: ChatProps) {
	const [input, setInput] = useState("");
	const [attachment, setAttachment] = useState<File | null>(null);

	const canSend = !!input.trim() && connected;

	const borderHero = appearanceDark ? "border-[#3c3c3c]" : "border-[#e5e5e5]";
	const titleC = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";
	const subC = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const composerBg = appearanceDark ? "border-[#3c3c3c] bg-[#252526]" : "border-[#e5e5e5] bg-white";
	const composerOuter = appearanceDark ? "bg-[#1e1e1e]" : "bg-[#f3f3f3]";
	const transcriptPad = "p-4 md:p-8";
	const transcriptGap = "gap-6 pb-4";
	const transcriptMax = "max-w-3xl";
	const composerPad = "p-4 md:p-6";
	const toolBarPt = "pt-4 md:pt-5";
	const toolLbl = `text-xs font-semibold uppercase tracking-wide ${subC}`;
	const inputBg = appearanceDark
		? "bg-[#1e1e1e] border-[#3c3c3c] text-[#cccccc] placeholder-[#858585]"
		: "bg-white border-[#d4d4d4] text-[#333333]";
	const sendBtnActive = appearanceDark
		? "bg-[#ea580c] text-white hover:bg-[#c2410c]"
		: "bg-[#ea580c] text-white hover:bg-[#c2410c]";
	const sendBtnDisabled = appearanceDark
		? "bg-[#3c3c3c] text-[#666666]"
		: "bg-[#e5e5e5] text-[#999999]";
	const msgUserBg = appearanceDark ? "bg-[#2d4c2d]" : "bg-[#e8f5e8]";
	const msgAssistantBg = appearanceDark ? "bg-[#252526]" : "bg-[#f5f5f5]";

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		if (!canSend) return;
		onSend(input);
		setInput("");
		setAttachment(null);
	};

	return (
		<div className={`flex h-full flex-col overflow-hidden ${composerOuter}`}>
			<div className={`min-h-0 flex-1 overflow-y-auto ${transcriptPad}`}>
				<div className={`flex flex-col ${transcriptGap} ${transcriptMax} mx-auto`}>
					{rows.map((row) => (
						<div
							key={row.id}
							className={`flex flex-col gap-2 rounded-lg p-4 ${
								row.fromUser ? msgUserBg : msgAssistantBg
							}`}
						>
							<div className={`text-xs font-semibold ${subC}`}>
								{row.fromUser ? "You" : row.agentName ?? "Assistant"}
							</div>
							<div className={`prose prose-sm max-w-none ${titleC}`}>
								{(row.segments ?? []).map((seg: any, i: number) => {
									if (seg.kind === "text") {
										return (
											<span key={i} className="whitespace-pre-wrap">
												{seg.text}
											</span>
										);
									}
									if (seg.kind === "tool_use") {
										return (
											<code
												key={i}
												className={`block rounded p-2 font-mono text-xs ${appearanceDark ? "bg-[#1e1e1e]" : "bg-[#eeeeee]"}`}
											>
												{seg.text}
											</code>
										);
									}
									if (seg.kind === "tool_result") {
										return (
											<pre
												key={i}
												className={`block max-h-48 overflow-auto rounded p-2 font-mono text-xs ${appearanceDark ? "bg-[#1e1e1e]" : "bg-[#eeeeee]"}`}
											>
												{seg.text}
											</pre>
										);
									}
									return null;
								})}
							</div>
						</div>
					))}
				</div>
			</div>

			<div className={`shrink-0 ${composerPad} ${composerBg} ${borderHero}`}>
				<form
					onSubmit={handleSubmit}
					className={`mx-auto flex w-full flex-col gap-3 ${transcriptMax} border-t ${toolBarPt}`}
				>
					<textarea
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder="Message…"
						rows={3}
						className={`w-full resize-none rounded-lg border px-4 py-3 ${inputBg}`}
					/>

					<div className="flex items-center justify-between">
						<span className={`text-xs ${subC}`}>
							{connected ? "Connected" : "Disconnected"}
						</span>

						<button
							type="submit"
							disabled={!canSend}
							className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold ${
								canSend ? sendBtnActive : sendBtnDisabled
							}`}
						>
							{streaming ? (
								<>
									<Square size={16} />
									Stop
								</>
							) : (
								<>
									<Send size={16} />
									Send
								</>
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}