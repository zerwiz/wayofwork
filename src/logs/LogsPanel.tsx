/**
 * LogsPanel - Combines terminal rows with chat interface
 * Maintains PTY session state and row management
 */

import React, { useCallback, useReducer } from "react";
import { TerminalInput } from "./TerminalInput";
import { TerminalBuffer } from "./TerminalBuffer";

/**
 * Type definitions for terminal rows
 */
type TerminalRowProps = {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  inputContent: string;
  inputCursorPosition: { x: number; y: number };
  outputContent: string;
  isTerminal: boolean;
  isFocused?: boolean;
  prompt?: string;
};

/**
 * Type for terminal session state
 */
type TerminalState = { terminalRows: Record<string, TerminalRowProps> };

/**
 * LogsPanel Component Props
 */
type LogsPanelProps = {
  sessionId?: string;
  prompt?: string;
  onInput?: (sessionId: string, rowId: number, value: string, cursorPos: { x: number; y: number }) => void;
  onExecute?: (command: string) => void;
  onResize?: (rows: number, cols: number) => void;
};

/**
 * LogsPanel Component
 * Maintains terminal rows and chat in a single buffer
 */
export const LogsPanel = ({
  sessionId = "",
  prompt = "$ ",
  onInput,
  onExecute,
  onResize,
}: LogsPanelProps) => {
  useReducer((_: TerminalState, action: any) => {
    return {
      ..._,
      ...action.payload,
    };
  }, {
    terminalRows: {},
  });

  /**
   * Execute terminal command
   */
  const execute = useCallback((text: string) => {
    onExecute && onExecute(text);
  }, [onExecute]);

  /**
   * Handle window resize
   */
  const handleResize = useCallback(
    (rows: number, cols: number) => {
      onResize && onResize(rows, cols);
    },
    [onResize],
  );

  return (
    <div className="terminal-panel">
      <TerminalBuffer
        sessionId={sessionId}
        rows={[]}
        buffer={[]}
        onResize={handleResize}
      />
      <TerminalInput
        value={prompt}
        onExecute={execute}
        onInput={(value: string) => {
          console.log("Input:", value);
          onInput && onInput(sessionId, 0, value, { x: 0, y: 0 });
        }}
        onCancel={() => {
          console.log("Cancelled");
        }}
        disabled={false}
        prompt={prompt}
      />
    </div>
  );
};

/**
 * Export default LogsPanel
 */
export default LogsPanel;
