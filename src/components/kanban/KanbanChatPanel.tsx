import { useEffect, useRef, useState } from "react";
import { Send, Square, MessageSquare, X } from "lucide-react";
import { useWayOfWorkSession } from "../../hooks/useWayOfWorkSession";

interface KanbanChatPanelProps {
  open: boolean;
  onToggle: () => void;
}

export default function KanbanChatPanel({ open, onToggle }: KanbanChatPanelProps) {
  const {
    rows,
    streaming,
    connected,
    sendChat,
    stop,
    setChatAgent,
  } = useWayOfWorkSession("kanban");

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const agentSetRef = useRef(false);

  useEffect(() => {
    if (connected && !agentSetRef.current) {
      setChatAgent("kanban");
      agentSetRef.current = true;
    }
  }, [connected, setChatAgent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [rows]);

  const handleSend = () => {
    if (!input.trim() || !connected || streaming) return;
    sendChat("kanban", input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!open) return null;

  return (
    <div className="flex h-full w-80 flex-shrink-0 flex-col border-r border-[#333333] bg-[#1e1e1e]">
      <div className="flex items-center justify-between border-b border-[#333333] bg-[#252526] px-3 py-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-semibold text-[#cccccc]">Kanban Chat</span>
        </div>
        <button
          onClick={onToggle}
          className="rounded p-1 text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]"
          title="Close chat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {rows.length === 0 ? (
          <div className="mt-8 text-center text-sm text-[#6e6e6e]">
            <p>Ask about boards, cards,</p>
            <p>time tracking, or workers.</p>
            <p className="mt-4 text-xs text-[#858585]">
              {connected ? "Connected" : "Connecting..."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((row) => (
              <div
                key={row.id}
                className={`rounded-lg p-3 ${
                  row.role === "user"
                    ? "bg-[#2d4c2d] ml-4"
                    : "bg-[#252526] mr-4"
                }`}
              >
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#858585]">
                  {row.role === "user" ? "You" : row.assistantPersona ?? "Kanban"}
                </div>
                {row.reasoning?.trim() ? (
                  <div className="mb-2 rounded border border-[#6366f1]/30 bg-[#1e1b4b]/35 p-2">
                    <div className="mb-0.5 text-[9px] uppercase tracking-wide text-[#a5b4fc]">Thinking</div>
                    <div className="whitespace-pre-wrap text-[11px] leading-relaxed text-[#c7d2fe]">{row.reasoning}</div>
                  </div>
                ) : null}
                <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#cccccc]">
                  {row.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-[#333333] bg-[#252526] p-3">
        {!connected ? (
          <div className="text-center text-xs text-[#858585]">
            Connecting to server...
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about boards, cards..."
              rows={2}
              className="w-full resize-none rounded-lg border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-[13px] text-[#cccccc] placeholder-[#858585] focus:outline-none focus:border-orange-500"
              disabled={streaming}
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#858585]">
                {streaming ? "Generating..." : "Ready"}
              </span>
              {streaming ? (
                <button
                  onClick={stop}
                  className="flex items-center gap-1 rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                >
                  <Square className="h-3 w-3" /> Stop
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="flex items-center gap-1 rounded bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 disabled:bg-[#3c3c3c] disabled:text-[#666666]"
                >
                  <Send className="h-3 w-3" /> Send
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
