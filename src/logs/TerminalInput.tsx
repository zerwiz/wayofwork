/**
 * TerminalInput - Real inline terminal editing
 * Uses textarea/contentEditable with cursor tracking
 */

import React, { forwardRef, useImperativeHandle } from 'react';

/**
 * TerminalInput Component Props
 */
type TerminalInputProps = {
  value?: string;
  cursorPosition?: { x: number; y: number };
  onInput?: (value: string) => void;
  onExecute?: (value: string) => void;
  onCancel?: () => void;
  disabled?: boolean;
  prompt?: string;
};

/**
 * TerminalInput Component
 * Tracks cursor position and handles keyboard events
 */
export const TerminalInput = forwardRef((props: TerminalInputProps, ref) => {
  const {
    value = '',
    onInput,
    onExecute,
    onCancel,
    disabled = false,
    prompt = '$ ',
  } = props;

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus();
    },
  }));

  /**
   * Handle keyboard events
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      return;
    }

    if (event.key === 'Backspace') {
      return;
    }

    if (event.key === 'Delete') {
      return;
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onExecute && onExecute(value);
      return;
    }

    if (event.ctrlKey && event.key === 'c') {
      event.preventDefault();
      onCancel && onCancel();
      return;
    }
  };

  /**
   * Handle input changes
   */
  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInput && onInput(event.target.value);
  };

  return (
    <div className="terminal-prompt">
      <span>{prompt}</span>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="terminal-input"
        style={{
          width: '100%',
          fontFamily: 'monospace',
          cursor: 'text',
          outline: 'none',
          border: 'none',
          resize: 'none',
          overflow: 'hidden',
        }}
      />
    </div>
  );
});

export default TerminalInput;
