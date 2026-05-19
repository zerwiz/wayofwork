/**
 * MobileChatExplorer Component
 *
 * @description Mobile-optimized container for chat and file explorer UI
 *              Combines chat interface and file explorer in a single-column layout
 *              Designed for screens < 768px with touch-friendly interactions
 *
 * @example
 * ```tsx
 * <MobileChatExplorer
 *   chatVisible={true}
 *   onToggleChat={() => setChatVisible(!chatVisible)}
 *   explorerVisible={true}
 *   onToggleExplorer={() => setExplorerVisible(!explorerVisible)}
 *   files={fileList}
 *   selectedFile={selectedFile}
 *   onSelectFile={handleFileSelect}
 *   previewVisible={previewVisible}
 *   onTogglePreview={() => setPreviewVisible(!previewVisible)}
 *   previewFile={previewFile}
 *   messages={messages}
 *   input={input}
 *   setInput={setInput}
 *   onSend={sendMessage}
 *   onViewMode={viewMode}
 *   onViewModeToggle={setViewMode}
 * />
 * ```
 */

import React, { useState, useCallback, useMemo } from "react";

// Props interface for MobileChatExplorer component
export interface MobileChatExplorerProps {
  chatVisible: boolean;
  onToggleChat: () => void;
  explorerVisible: boolean;
  onToggleExplorer: () => void;
  files: Array<{
    path: string;
    name: string;
    size: string;
    date: string;
    type: string;
  }>;
  selectedFile: { path: string; name: string } | null;
  onSelectFile: (file: { path: string; name: string }) => void;
  previewVisible: boolean;
  onTogglePreview: () => void;
  previewFile: { path: string; name: string } | null;
  messages: Array<{ id: string; role: "user" | "assistant"; content: string }>;
  input: string;
  setInput: (text: string) => void;
  onSend: (message: string) => Promise<void>;
  viewMode: "icon" | "list";
  onViewModeToggle: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onAgentSelect?: (agent: string) => void;
  currentAgent?: string | null;
}

export default function MobileChatExplorer({
  chatVisible,
  onToggleChat,
  explorerVisible,
  onToggleExplorer,
  files,
  selectedFile,
  onSelectFile,
  previewVisible,
  onTogglePreview,
  previewFile,
  messages,
  input,
  setInput,
  onSend,
  viewMode,
  onViewModeToggle,
  searchQuery,
  setSearchQuery,
  onAgentSelect,
  currentAgent,
}: MobileChatExplorerProps) {
  // Mobile-specific layout handling
  const mobileLayout = useMemo(() => ({
    chatPanel: {
      width: "100%",
      minHeight: "300px",
      flex: "1",
    },
    explorerPanel: {
      width: "100%",
      minHeight: "300px",
      flex: "1",
    },
  }), []);

  // Handle file selection
  const handleFileSelect = useCallback((file: { path: string; name: string }) => {
    onSelectFile(file);
  }, [onSelectFile]);

  // Handle message send
  const handleSend = useCallback(async () => {
    if (input.trim()) {
      await onSend(input);
      setInput("");
    }
  }, [input, onSend, setInput]);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  // Render chat messages
  const renderedMessages = useMemo(
    () =>
      messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${
            msg.role === "user" ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`max-w-[80%] rounded-lg p-3 ${
              msg.role === "user"
                ? "bg-blue-500 text-white"
                : "bg-gray-700 text-gray-100"
            }`}
          >
            {msg.content}
          </div>
        </div>
      )),
    [messages],
  );

  // Render file list items
  const renderedFiles = useMemo(
    () =>
      files.map((file) => (
        <div
          key={file.path}
          className={`p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-700 ${
            selectedFile?.path === file.path ? "bg-gray-600" : ""
          }`}
          onClick={() => handleFileSelect(file)}
        >
          <div className="font-medium text-gray-100">{file.name}</div>
          <div className="text-sm text-gray-400">
            {file.size} • {file.date}
          </div>
        </div>
      )),
    [files, selectedFile, handleFileSelect],
  );

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <button
          className="p-2 rounded-lg bg-gray-700 text-gray-100"
          onClick={onToggleExplorer}
        >
          Files
        </button>
        <button
          className="p-2 rounded-lg bg-gray-700 text-gray-100"
          onClick={onToggleChat}
        >
          Chat
        </button>
      </div>

      {/* Explorer Panel */}
      {explorerVisible && (
        <div className="flex-1 overflow-auto p-3" style={mobileLayout.explorerPanel}>
          {renderedFiles}
        </div>
      )}

      {/* Chat Panel */}
      {chatVisible && (
        <div className="flex-1 overflow-auto p-3" style={mobileLayout.chatPanel}>
          {renderedMessages}
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 border-t border-gray-700">
        <textarea
          className="w-full p-3 rounded-lg bg-gray-700 text-gray-100 border border-gray-600"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
        />
        <button
          className="mt-2 w-full p-3 rounded-lg bg-blue-500 text-white font-medium"
          onClick={() => void handleSend()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
