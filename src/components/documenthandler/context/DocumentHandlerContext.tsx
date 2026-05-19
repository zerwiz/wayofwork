import { createContext, useContext, useState, useCallback } from 'react';
import { ChatMessage, Agent, FileEntry, PreviewState } from '../types/documenthandler.types';

export interface DocumentHandlerContextState {
  // Chat state
  chatVisible: boolean;
  toggleChat: () => void;
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  input: string;
  setInput: (text: string) => void;
  onSend: (message: string) => Promise<void>;
  
  // Agent selection (optional)
  currentAgent: Agent | null;
  onAgentSelect?: (agent: Agent) => void;
  
  // File explorer state
  explorerVisible: boolean;
  toggleExplorer: () => void;
  files: FileEntry[];
  selectedFile: FileEntry | null;
  onSelectFile: (file: FileEntry) => void;
  
  // View state
  viewMode: 'icon' | 'list';
  setViewMode: (mode: 'icon' | 'list') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: 'name' | 'date' | 'size';
  setSortBy: (sort: 'name' | 'date' | 'size') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  
  // Preview state
  previewVisible: boolean;
  selectedFileForPreview: FileEntry | null;
  togglePreview: () => void;
  currentZoom: number;
  setCurrentZoom: (zoom: number) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  setTotalPages: (pages: number) => void;
  onPrint: () => Promise<void>;
  onFullscreen: () => void;
}

export const DocumentHandlerContext = createContext<
  DocumentHandlerContextState | undefined
>(undefined);

export const DocumentHandlerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize with default agent
  const defaultAgent: Agent = {
    id: '1',
    name: 'General Assistant',
    description: 'General purpose AI assistant'
  };

  // Chat state
  const [chatVisible, setChatVisible] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(defaultAgent);

  // File explorer state
  const [explorerVisible, setExplorerVisible] = useState(true);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  
  // View state
  const [viewMode, setViewMode] = useState<'icon' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Preview state
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<FileEntry | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Chat actions
  const toggleChat = useCallback(() => setChatVisible(!chatVisible), [chatVisible]);
  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);
  
  // File explorer actions
  const toggleExplorer = useCallback(() => setExplorerVisible(!explorerVisible), [explorerVisible]);
  const onSelectFile = useCallback((file: FileEntry) => {
    setSelectedFile(file);
    setSelectedFileForPreview(file); // Also set for preview
  }, []);
  
  // Preview actions
  const togglePreview = useCallback(() => setPreviewVisible(!previewVisible), [previewVisible]);
  
  // Print and fullscreen placeholders
  const onPrint = useCallback(async () => {
    // Implement print functionality
    window.print();
  }, []);
  
  const onFullscreen = useCallback(() => {
    // Implement fullscreen functionality
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen();
    }
  }, []);

  const value: DocumentHandlerContextState = {
    // Chat state
    chatVisible,
    toggleChat,
    messages,
    addMessage,
    input,
    setInput,
    onSend: async () => {}, // Placeholder - to be implemented
    currentAgent,
    onAgentSelect: setCurrentAgent,
    
    // File explorer state
    explorerVisible,
    toggleExplorer,
    files,
    selectedFile,
    onSelectFile,
    
    // View state
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    
    // Preview state
    previewVisible,
    selectedFileForPreview,
    togglePreview,
    currentZoom,
    setCurrentZoom,
    currentPage,
    setCurrentPage,
    totalPages,
    setTotalPages,
    onPrint,
    onFullscreen
  };

  return (
    <DocumentHandlerContext.Provider value={value}>
      {children}
    </DocumentHandlerContext.Provider>
  );
};

export const useDocumentHandler = () => {
  const context = useContext(DocumentHandlerContext);
  if (!context) {
    throw new Error('useDocumentHandler must be used within DocumentHandlerContext');
  }
  return context;
};