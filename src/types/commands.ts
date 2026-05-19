export interface Command {
  id: string;
  label: string;
  keybinding?: string;
  handler: () => void;
}

export interface SettingsMenuHandlers {
  onOpenSettings: () => void;
  onOpenKeybindings: () => void;
}

export interface FileMenuHandlers {
  onOpenFile: () => void;
  onOpenFolder: () => void;
  onNewTextFile: () => void;
  onSave: () => void;
  onRevertFile: () => void;
  onPreferencesOpen: () => void;
  onExit: () => void;
}

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
  onStartDebugging: () => void;
  onToggleBp: () => void;
  onNewBpInline: () => void;
  onNewBpConditional: () => void;
  onNewBpLogpoint: () => void;
  onNewBpFunction: () => void;
  onEnableAllBps: () => void;
  onDisableAllBps: () => void;
  onRemoveAllBps: () => void;
  onInstallDebuggers: () => void;
  effSelectedPath: string | null;
  onRunWithoutDebugging: () => void;
  onRunSelectedText: () => void;
  onConfigureTasks: () => void;
  onConfigureDefaultBuildTask: () => void;
}
