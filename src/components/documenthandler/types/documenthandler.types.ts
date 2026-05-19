// TypeScript interfaces for the documenthandler component

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  agent?: string;
}

export interface Agent {
  id: string;
  name: string;
  description?: string;
}

export interface FileEntry {
  id: string;
  name: string;
  path: string;
  extension: string;
  size: number;
  modified: Date;
  isDirectory: boolean;
  previewUrl?: string;
}

export interface PreviewState {
  visible: boolean;
  file: FileEntry | null;
  zoom: number; // percentage
  currentPage: number;
  totalPages: number;
}