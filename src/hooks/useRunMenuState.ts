export interface RunMenuHandlers {
  canStartDebugging: boolean;
  canToggleBreakpoint: boolean;
  hasBreakpoints: boolean;
  debugSessionActive: boolean;
  terminalServerEnabled: boolean;
  onStepOver: () => void;
  onStepInto: () => void;
  onStepOut: () => void;
  onContinue: () => void;
  onToggleBreakpoint: () => void;
  onNewBreakpointInline: () => void;
  onNewBreakpointConditional: () => void;
  onNewBreakpointLogpoint: () => void;
  onNewBreakpointTriggered: () => void;
  onNewBreakpointFunction: () => void;
  onEnableAllBreakpoints: () => void;
  onDisableAllBreakpoints: () => void;
  onRemoveAllBreakpoints: () => void;
  onInstallAdditionalDebuggers: () => void;
  effSelectedPath: string | null;
  onRunWithoutDebugging: () => void;
  onRunSelectedText: () => void;
  onConfigureTasks: () => void;
  onConfigureDefaultBuildTask: () => void;
}

export function useRunMenuState() {
  return {
    showRunMenu: false,
    setShowRunMenu: (_v: boolean) => {},
  };
}
