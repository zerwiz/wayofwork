export interface TerminalCommand {
  id: string;
  command: string;
  description: string;
  category: string;
}

export interface HermesConfig {
  id: string;
  name: string;
}

export interface HermesState {
  commands: TerminalCommand[];
  loading: boolean;
  error: string | null;
}
