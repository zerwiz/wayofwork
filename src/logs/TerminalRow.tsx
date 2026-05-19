/**
 * TerminalRow - Represents a row in the terminal
 * Handles output display and input state
 */

import React, { forwardRef, useState, useImperativeHandle, useRef } from 'react';
import TerminalInput from './TerminalInput';

/**
 * TerminalRow Component Props
 */
type TerminalRowProps = {
  sessionId: string;
  rowId: number;
  role: 'user' | 'assistant';
  inputContent?: string;
  inputCursorPosition?: { x: number; y: number };
  outputContent?: string;
  isFocused?: boolean;
  isTerminal?: boolean;
  prompt?: string;
  onInput?: (sessionId: string, rowId: number, value: string, cursorPos: { x: number; y: number }) => void;
  onExecute?: (sessionId: string, rowId: number, value: string) => void;
  onSelectRow?: (e: React.MouseEvent, sessionId: string, rowId: number) => void;
};

/**
 * TerminalRow Component
 */
export const TerminalRow = forwardRef((props: TerminalRowProps, ref) => {
  const {
    sessionId = 'default',
    rowId = 0,
    role = 'user',
    inputContent = '',
    inputCursorPosition = { x: 0, y: 0 },
    outputContent = '',
    isFocused = false,
    isTerminal = false,
    prompt = '$ ',
    onInput = () => {},
    onExecute = () => {},
    onSelectRow = () => {},
  } = props;

  const [value, setValue] = useState(inputContent);
  const internalRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      internalRef.current?.focus();
    },
  }));

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
            onInput={(newValue: string) => {
              setValue(newValue);
              onInput(sessionId, rowId, newValue, inputCursorPosition);
            }}
            onExecute={(text: string) => {
              onExecute(sessionId, rowId, text);
            }}
            onCancel={() => {
              console.log('Cancelled');
            }}
            disabled={!isTerminal}
            prompt={prompt}
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
      ref={internalRef}
      onClick={(e) => onSelectRow(e, sessionId, rowId)}
      className={`terminal-row ${role === 'user' && isFocused ? 'focused' : ''}`}
      data-session-id={sessionId}
      data-row-id={rowId}
      tabIndex={0}
    >
      {renderContent()}
    </div>
  );
});

export default TerminalRow;
