// components/menus/RunMenu.tsx
// Phase 7: Terminal/Run components extraction
// Handles Run/Debug menu actions

import React, { useMemo, useCallback } from "react";
import type { RunMenuHandlers } from "../../types/commands";

/**
 * RunMenu Component
 *
 * Handles all Run/Debug menu actions:
 * - Start/Stop/Restart debugging
 * - Run without debugging
 * - Step over/into/out/continue
 * - Toggle breakpoints
 * - Add/remove breakpoints
 * - Install debuggers
 *
 * @param handlers - Run menu handlers from useRunMenuDebugState()
 */
export const RunMenu: React.FC<{ handlers: RunMenuHandlers }> = ({
  handlers,
}) => {
  // Debug session controls
  const debugActions = useMemo(() => ({
    canStart: handlers.canStartDebugging,
    canToggleBp: handlers.canToggleBreakpoint,
    hasBreakpoints: handlers.hasBreakpoints,
    isDebugging: handlers.debugSessionActive,
    terminalEnabled: handlers.terminalServerEnabled,
    onStepOver: handlers.onStepOver,
    onStepInto: handlers.onStepInto,
    onStepOut: handlers.onStepOut,
    onContinue: handlers.onContinue,
    onToggleBp: handlers.onToggleBp,
    onNewBpInline: handlers.onNewBpInline,
    onNewBpConditional: handlers.onNewBpConditional,
    onNewBpLogpoint: handlers.onNewBpLogpoint,
    onNewBpTriggered: (handlers as any).onNewBpTriggered || (() => {}),
    onNewBpFunction: handlers.onNewBpFunction,
    onEnableAllBps: handlers.onEnableAllBps,
    onDisableAllBps: handlers.onDisableAllBps,
    onRemoveAllBps: handlers.onRemoveAllBps,
    onInstallDebuggers: handlers.onInstallDebuggers,
  }), [handlers]);

  // Run actions
  const runActions = useMemo(() => ({
    canRunFile: !!handlers.effSelectedPath,
    canRunSelectedText: true,
    canConfigureTasks: true,
    onRunFile: handlers.onRunWithoutDebugging,
    onRunSelected: handlers.onRunSelectedText,
    onConfigureTasks: handlers.onConfigureTasks,
    onConfigureBuildTask: handlers.onConfigureDefaultBuildTask,
  }), [handlers]);

  // Render debug controls
  const renderDebugControls = () => (
    <div className="run-menu-section" role="menu" aria-label="Debug Controls">
      <button
        onClick={handlers.onStartDebugging}
        disabled={!debugActions.canStart}
        className={`run-btn ${debugActions.isDebugging ? "active" : ""}`}
      >
        {debugActions.isDebugging ? "Stop Debugging" : "Start Debugging"}
      </button>

      {debugActions.isDebugging && (
        <>
          <button onClick={handlers.onStepOver} className="run-btn">
            Step Over
          </button>
          <button onClick={handlers.onStepInto} className="run-btn">
            Step Into
          </button>
          <button onClick={handlers.onStepOut} className="run-btn">
            Step Out
          </button>
          <button onClick={handlers.onContinue} className="run-btn">
            Continue
          </button>
        </>
      )}

      <div className="breakpoint-section">
        <button
          onClick={handlers.onToggleBp}
          disabled={!debugActions.canToggleBp}
          className="run-btn bp-btn"
          title="Toggle breakpoint at cursor"
        >
          Toggle Breakpoint
        </button>

        <button
          onClick={handlers.onNewBpInline}
          disabled={!debugActions.canToggleBp}
          className="run-btn bp-btn"
        >
          + Inline
        </button>

        <button
          onClick={handlers.onNewBpConditional}
          disabled={!debugActions.canToggleBp}
          className="run-btn bp-btn"
        >
          + Conditional
        </button>

        <button
          onClick={handlers.onNewBpLogpoint}
          disabled={!debugActions.canToggleBp}
          className="run-btn bp-btn"
        >
          + Logpoint
        </button>

        <button
          onClick={handlers.onNewBpFunction}
          disabled={!debugActions.canToggleBp}
          className="run-btn bp-btn"
        >
          + Function
        </button>

        <button
          onClick={handlers.onEnableAllBps}
          disabled={!debugActions.hasBreakpoints}
          className="run-btn"
        >
          Enable All
        </button>

        <button
          onClick={handlers.onDisableAllBps}
          disabled={!debugActions.hasBreakpoints}
          className="run-btn"
        >
          Disable All
        </button>

        <button
          onClick={handlers.onRemoveAllBps}
          disabled={!debugActions.hasBreakpoints}
          className="run-btn"
        >
          Remove All
        </button>
      </div>
    </div>
  );

  // Render run actions
  const renderRunActions = () => (
    <div className="run-menu-section" role="menu" aria-label="Run Actions">
      {runActions.canRunFile && (
        <button onClick={runActions.onRunFile} className="run-btn">
          Run Active File
        </button>
      )}

      <button onClick={runActions.onRunSelected} className="run-btn">
        Run Selected Text
      </button>

      <button onClick={runActions.onConfigureTasks} className="run-btn">
        Configure Tasks
      </button>

      <button onClick={runActions.onConfigureBuildTask} className="run-btn">
        Configure Build Task
      </button>

      <button onClick={handlers.onInstallDebuggers} className="run-btn modal-trigger">
        Install Debuggers
      </button>
    </div>
  );

  return (
    <div
      className="run-menu"
      data-component="run-menu"
      data-testid="run-menu"
      aria-label="Run and Debug Menu"
    >
      {renderDebugControls()}
      {renderRunActions()}
    </div>
  );
};

export default RunMenu;
