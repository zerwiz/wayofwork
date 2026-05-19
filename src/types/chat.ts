export interface ChatRow {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  agentId?: string;
  agentName?: string;
  timestamp?: number;
  turnId?: string;
}

export interface LogRow {
  id: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  timestamp: number;
  source?: string;
}

export interface ChatSessionTab {
  id: string;
  label: string;
  agentId?: string;
  agentName?: string;
}
