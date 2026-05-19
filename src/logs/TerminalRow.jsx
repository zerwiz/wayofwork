/**
 * TerminalRow - Represents a row in the terminal
 * Handles output display and input state
 */

import React, { useMemo, forwardRef, useState } from 'react';

/**
 * TerminalRow Component
 * Displays terminal output and input
 */
export const TerminalRow = forwardRef(({
  sessionId,
  rowId,
  role,
  inputContent = '',
  inputCursorPosition = { x: 0, y: 0 },
  outputContent = '',
  isFocused = false,
  isTerminal = false,
  prompt = '$ ',
  onInput,
  onExecute,
  onSelectRow,
}) => {
  const [value, setValue] = useState(inputContent);
  const ref = useRef(null);

  /**
   * Render terminal row content
   */
  const renderContent = () => {
    return (
      <div className="terminal-row">
        <div className="terminal-prompt">{prompt}</div>
        {role === 'user' && (
          <TerminalInput
            value={value}
            cursorPosition={inputCursorPosition}
            onInput={(newValue) => {
              setValue(newValue);
              onInput(sessionId, rowId, newValue, inputCursorPosition);
            }}
            onExecute={(text) => {
              onExecute(sessionId, rowId, text);
            }}
            disabled={!isTerminal}
          />
        )}
        {role === 'assistant' && (
          <div className="terminal-output">
            {outputContent}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={ref}
      onClick={(e) => onSelectRow(e, sessionId, rowId)}
      className={`terminal-row ${role === 'user' && isFocused ? 'focused' : ''}`}
      data-session-id={sessionId}
      data-row-id={rowId}
    >
      {renderContent()}
    </div>
  );
};

export default TerminalRow;