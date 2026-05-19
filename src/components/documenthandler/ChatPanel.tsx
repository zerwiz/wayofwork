import { Send, Square } from "lucide-react";
import { useState, type FormEvent, type KeyboardEvent } from "react";
import type { ChatRow } from "../../hooks/useWayOfPiSession";
import ChatMessages from "./ChatMessages";

interface ChatPanelProps {
	visible: boolean;
	onToggle: () => void;
	appearanceDark?: boolean;
	rows: ChatRow[];
	streaming: boolean;
	connected?: boolean;
	onSend: (text: string) => void;
	onStop: () => void;
}

export function ChatPanel({
	visible,
	onToggle,
	appearanceDark = true,
	rows,
	streaming,
	connected = true,
	onSend,
	onStop,
}: ChatPanelProps) {
	const [input, setInput] = useState("");

	const subC = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const titleC = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";
	const composerBg = appearanceDark
		? "border-[#3c3c3c] bg-[#252526]"
		: "border-[#e5e5e5] bg-white";
	const composerOuter = appearanceDark ? "bg-[#1e1e1e]" : "bg-[#f3f3f3]";
	const borderHero = appearanceDark ? "border-[#3c3c3c]" : "border-[#e5e5e5]";
	const transcriptPad = "p-4";
	const transcriptGap = "gap-6 pb-4";
	const transcriptMax = "max-w-full";
	const composerPad = "p-4";
	const toolBarPt = "pt-4";
	const inputBg = appearanceDark
		? "bg-[#1e1e1e] border-[#3c3c3c] text-[#cccccc] placeholder-[#858585]"
		: "bg-white border-[#d4d4d4] text-[#333333]";
	const sendBtnActive = appearanceDark
		? "bg-[#ea580c] text-white hover:bg-[#c2410c]"
		: "bg-[#ea580c] text-white hover:bg-[#c2410c]";
	const sendBtnDisabled = appearanceDark
		? "bg-[#3c3c3c] text-[#666666]"
		: "bg-[#e5e5e5] text-[#999999]";
	const canSend = !!input.trim() && connected && !streaming;

	const handleSend = () => {
		if (!canSend) return;
		onSend(input);
		setInput("");
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	if (!visible) return null;

	return (
		<div className={`chat-panel flex h-full flex-col overflow-hidden ${composerOuter}`}>
			<div
				className={`flex shrink-0 items-center justify-between border-b px-4 py-3 ${composerBg}`}
			>
				<button
					type="button"
					onClick={onToggle}
					className={`rounded px-2 py-1 text-sm ${subC} hover:bg-[#3c3c3c]`}
				>
					&#9776;
				</button>

				<span className={`text-sm ${titleC}`}>
					{connected ? "Connected" : "Disconnected - Start the server"}
				</span>
			</div>

			<div className={`min-h-0 flex-1 overflow-y-auto ${transcriptPad}`}>
				<div className={`flex flex-col ${transcriptGap} ${transcriptMax} mx-auto`}>
					{!connected ? (
						<div className={`p-4 text-center text-sm ${subC}`}>
							<div className="mb-2">⚠️</div>
							<div>Chat requires the server to be running.</div>
							<div className="mt-1 text-xs">
								Start the server with: <code className="px-1 py-0.5 rounded bg-[#3c3c3c]">bun run dev</code>
							</div>
						</div>
					) : rows.length === 0 ? (
						<div className={`p-4 text-center text-sm ${subC}`}>
							Start a conversation...
						</div>
					) : (
						rows.map((row) => (
							<div
								key={row.id}
								className={`flex flex-col gap-2 rounded-lg p-4 ${
									row.role === "user"
										? appearanceDark
											? "bg-[#2d4c2d]"
											: "bg-[#e8f5e8]"
										: appearanceDark
											? "bg-[#252526]"
											: "bg-[#f5f5f5]"
								}`}
							>
							<div className={`text-xs font-semibold ${subC}`}>
								{row.role === "user" ? "You" : row.assistantPersona ?? "Assistant"}
							</div>
								<div className={`prose prose-sm max-w-none whitespace-pre-wrap ${
									row.role === "user" ? "text-[#e5e5e5]" : titleC
								}`}
								>
									{row.content}
								</div>
							</div>
						))
					)}
				</div>
			</div>

			<div
				className={`shrink-0 ${composerPad} ${composerBg} border-t ${borderHero}`}
			>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						handleSend();
					}}
					className={`mx-auto flex w-full flex-col gap-3 ${transcriptMax} border-t ${toolBarPt}`}
				>
					<textarea
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Type a message..."
						rows={4}
						className={`w-full min-h-[96px] max-h-80 resize-none rounded-lg border px-4 py-3 ${inputBg}`}
						disabled={streaming || !connected}
					/>

					<div className="flex items-center justify-between">
						<span className={`text-xs ${subC}`}>
							{streaming ? "Generating..." : connected ? "Ready" : "Disconnected"}
						</span>

						{streaming ? (
							<button
								type="button"
								onClick={onStop}
								className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold bg-red-600 text-white hover:bg-red-700`}
							>
								<Square size={16} />
								Stop
							</button>
						) : (
							<button
								type="submit"
								disabled={!canSend}
								className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold ${
									canSend ? sendBtnActive : sendBtnDisabled
								}`}
							>
								<Send size={16} />
								Send
							</button>
						)}
					</div>
				</form>
			</div>
		</div>
	);
}

export default ChatPanel;