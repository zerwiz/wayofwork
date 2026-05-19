import React from "react";
import { ChatMessage } from "./types/documenthandler.types";

interface ChatMessagesProps {
	messages: ChatMessage[];
	appearanceDark?: boolean;
}

export function ChatMessages({ messages, appearanceDark = true }: ChatMessagesProps) {
	const titleC = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";
	const subC = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const msgUserBg = appearanceDark ? "bg-[#2d4c2d]" : "bg-[#e8f5e8]";
	const msgAssistantBg = appearanceDark ? "bg-[#252526]" : "bg-[#f5f5f5]";
	const msgUserText = appearanceDark ? "text-[#e5e5e5]" : "text-[#222222]";
	const msgAssistantText = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";
	const agentLabelBg = appearanceDark ? "bg-[#164e63]" : "bg-[#cce0ff]";
	const agentLabelText = appearanceDark ? "text-[#0ea5e9]" : "text-[#0066ff]";

	return (
		<div className="chat-messages flex flex-col gap-6">
			{messages.map((message) => (
				<div
					key={message.id}
					className={`flex flex-col gap-2 rounded-lg p-4 ${
						message.role === "user" ? msgUserBg : msgAssistantBg
					}`}
				>
					<div
						className={`text-xs font-semibold ${subC}`}
					>
						{message.role === "user" ? "You" : message.agent ?? "Assistant"}
					</div>
					<div
						className={`prose prose-sm max-w-none whitespace-pre-wrap ${
							message.role === "user" ? msgUserText : msgAssistantText
						}`}
					>
						{message.content}
					</div>
					<div className={`flex items-center gap-2 text-xs ${subC}`}>
						{message.role === "assistant" && message.agent && (
							<span
								className={`rounded px-2 py-0.5 text-xs ${agentLabelBg} ${agentLabelText}`}
							>
								{message.agent}
							</span>
						)}
						<span className="timestamp">
							{new Date(message.timestamp).toLocaleTimeString()}
						</span>
					</div>
				</div>
			))}
		</div>
	);
}

export default ChatMessages;