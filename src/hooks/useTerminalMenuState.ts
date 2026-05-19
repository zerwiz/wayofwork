export interface TerminalMenuHandlers {
  onNewTerminal: () => void;
  onSplitTerminal: () => void;
  onRunTask: () => void;
  onRunBuildTask: () => void;
  onRunActiveFile: () => void;
  onRunSelectedText: () => void;
  onConfigureTasks: () => void;
  onConfigureDefaultBuildTask: () => void;
  terminalServerEnabled: boolean;
}

export function useTerminalMenuState() {
  return {
    showTerminal: false,
    setShowTerminal: (_v: boolean) => {},
  };
}
