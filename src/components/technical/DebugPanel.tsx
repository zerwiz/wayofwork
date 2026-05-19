import { useCallback } from "react";
import { useRunMenuDebugState } from "../../hooks/useRunMenuDebugState";
import type { ChatSessionMode } from "../../hooks/useWayOfPiSession";

export function DebugPanel({ mode }: { mode: ChatSessionMode }) {
  const { debugSessionActive, debugReplSession, beginDebugSession, endDebugSession } = useRunMenuDebugState();
  return (
    <div className="p-2 bg-[#252526] text-[#cccccc]">
      <p className="text-[#858585]">Debug: {mode}</p>
      {debugSessionActive && (
        <p className="text-[#c586c0]">Session active</p>
      )}
      <button
        className="mt-2 rounded border border-[#007acc] bg-[#007acc] text-white px-2 py-1 hover:bg-[#007acc]/30"
        onClick={() => beginDebugSession(false)}
      >
        Begin Debug
      </button>
      <button
        className="ml-2 rounded border border-[#3c3c3c] bg-[#1e1e1e] text-[#858585] hover:bg-[#2d2d2d]"
        onClick={endDebugSession}
        disabled={!debugSessionActive}
      >
        End Debug
      </button>
    </div>
  );
}