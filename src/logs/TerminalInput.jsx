/**
 * TerminalInput - Real inline terminal editing
 * Uses textarea/contentEditable with cursor tracking
 */

import React, { useState, useRef, useEffect } from 'react';

/**
 * TerminalInput Component
 * Tracks cursor position and handles keyboard events
 */
export const TerminalInput = ({
  value = '',
  cursorPosition = { x: 0, y: 0 },
  onInput,
  onExecute,
  onCancel,
  disabled = false,
  prompt = '$ ',
}) => {
  const textareaRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [promptLength, setPromptLength] = useState(prompt?.length || 0);

  useEffect(() => {
    setPromptLength(prompt?.length || 0);
    if (textareaRef.current) {
      textareaRef.current.value = value;
      
      // Move cursor to prompt length (position after prompt)
      textareaRef.current.setSelectionRange(promptLength, promptLength);
      
      // Ensure cursor is at correct position after text changes
      const newValue = value;
      const newCursorPos = Math.max(0, Math.min(newValue.length, promptLength));
      textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
    }
  }, [value]);

  /**
   * Handle keyboard events
   */
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      
      if (onExecute) {
        onExecute(newValue);
        // Clear input and update buffer
        handleExecuteAndClear();
      }
      
      if (event.ctrlKey && event.key === 'c') {
        // Ctrl+C - Cancel command
        onCancel();
      }
      
      if (event.ctrlKey && event.key === 'z') {
        // Ctrl+Z - Suspend (send ^Z)
        session.ptySlave.write('\x1a');
        
        onCancel();
      }
      
      if (event.ctrlKey && event.shiftKey) {
        event.preventDefault();
        onCancel();
      }
      
      return;
    }
    
    // Arrow key handling
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveCursor(-1);
      return;
    }
    
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveCursor(1);
      return;
    }
    
    if (event.key === 'Home') {
      event.preventDefault();
      moveCursor(-(value.length - promptLength));
      return;
    }
    
    if (event.key === 'End') {
      event.preventDefault();
      moveCursor(value.length - promptLength);
      return;
    }
    
    // Backspace
    if (event.key === 'Backspace') {
      event.preventDefault();
      deleteCursor(-1);
      return;
    }
    
    // Delete key
    if (event.key === 'Delete') {
      event.preventDefault();
      deleteCursor(0); // Delete character after cursor
      return;
    }
    
    // Tab key
    if (event.key === 'Tab') {
      event.preventDefault();
      // Tab completion logic
    }
    
    // Ctrl+Left/Right - Word boundaries
    if (event.ctrlKey) {
      if (event.key === 'Left') {
        event.preventDefault();
        moveCursorToPreviousWord();
      }
      
      if (event.key === 'Right') {
        event.preventDefault();
        moveCursorToNextWord();
      }
    }
  };

  /**
   * Handle input changes for text input
   */
  const handleInputChange = (event) => {
    const newValue = event.target.value;
    const newPos = getCursorPosition(event);
    
    onInput(newValue, newPos);
    setNewValue(value);
    setNewCursorPos(cursor);
  };

  /**
   * Get cursor position from textarea
   */
  const getCursorPosition = (event) => {
    const textarea = textareaRef.current;
    if (!textarea) return { x: 0, y: 0 };
    
    const value = textarea.value;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    
    // Calculate row and column
    const rows = value.split('\n');
    let y = 0;
    let x = 0;
    
    for (let i = 0; i < rows.length; i++) {
      const rowLength = rows[i].length;
      
      if (i < y) {
        x = 0;
        y++;
      } else if (i > y) {
        x = 0;
        y++;
      } else if (rowLength === x) {
        x = 0;
        y++;
      } else if (selectionStart === rowLength + x) {
        x = 0;
        y++;
      } else {
        x = selectionStart - (value.substr(0, selectionStart).lastIndexOf('\n'));
      }
    }
    
    return { x, y };
  };

  /**
   * Move cursor by offset
   */
  const moveCursor = (offset) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const value = textarea.value;
    const cursorPos = Math.max(promptLength + offset, 0);
    const newPosition = Math.min(cursorPos, value.length);
    textarea.setSelectionRange(newPosition, newPosition);
  };

  /**
   * Delete character before cursor
   */
  const deleteCursor = (offset) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const value = textarea.value;
    const cursorPos = textarea.selectionStart;
    const newValue = value.slice(0, cursorPos + offset) + value.slice(cursorPos + offset + 1);
    textarea.value = newValue;
    textarea.setSelectionRange(cursorPos + offset, cursorPos + offset);
  };

  /**
   * Move to beginning
   */
  const moveCursorToPreviousWord = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const value = textarea.value;
    const cursorPos = textarea.selectionStart;
    const wordStart = value.lastIndexOf(' ', cursorPos);
    moveCursor(cursorPos - wordStart - 1);
  };

  /**
   * Move to next word
   */
  const moveCursorToNextWord = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const value = textarea.value;
    const cursorPos = textarea.selectionStart;
    const wordEnd = value.indexOf(' ', cursorPos);
    moveCursor(wordEnd !== -1 ? wordEnd + 1 : cursorPos);
  };

  return (
    <div className="terminal-prompt">
      <span>{prompt}</span>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
        className="terminal-input"
        style={{
          width: '100%',
          fontFamily: 'monospace',
          cursor: 'text',
        }}
      />
    </div>
  );
};

export default TerminalInput;