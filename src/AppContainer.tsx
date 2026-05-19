/**
 * AppContainer - Container for terminal sessions
 * Maintains PTY session connections
 */

import React, { useState, useEffect } from "react";
import { LogsPanel } from "./logs/index";
// SessionManagerClient type not available
/**
 * Props for AppContainer
 */
type AppContainerProps = {
  sessionManager: any;
  prompt?: string;
  sessionId?: string;
};

/**
 * AppContainer Component
 */
const AppContainer: React.FC<AppContainerProps> = ({
  sessionManager,
  prompt = "$ ",
  sessionId = crypto.randomUUID(),
}) => {
  /**
   * Create new terminal session
   */
  const createSession = () => {
    const session = sessionManager.createSession("bash");
    console.log(`Created new session: ${session}`);
    return session;
  };

  /**
   * Handle user typing
   */
  const handleUserInput = (input: string) => {
    if (input.trim()) {
      // Send to PTY master
      (sessionManager as any).handleConnection(sessionId, input).catch(() => {
        console.error("Error sending input to PTY");
      });
    }
  };

  /**
   * Handle command execution
   */
  const handleCommandExecute = (command: string) => {
    // Execute command in terminal
    console.log(`Executing: ${command}`);
  };

  /**
   * Handle window resize
   */
  const handleResize = (rows: number, cols: number) => {
    console.log(`Window resized to ${rows}x${cols}`);
  };

  /**
   * Render app
   */
  return (
    <div className="terminal-container">
      <LogsPanel
        sessionId={sessionId}
        prompt={prompt}
        onInput={(sid: string, _rowId: number, value: string, _cursorPos: { x: number; y: number }) => handleUserInput(value)}
        onExecute={handleCommandExecute}
        onResize={handleResize}
      />
    </div>
  );
};

export default AppContainer;