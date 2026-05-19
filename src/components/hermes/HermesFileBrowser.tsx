// HermesFileBrowser.tsx
// Complete file browser component for the .hermes installation path

import React, { useMemo, useCallback, useState } from "react";

interface FileItem {
  name: string;
  type: "folder" | "file" | "executable" | "script" | "yaml" | "env" | "cache";
}

// Base path for Hermes installation at project root
const hermesPath = "/.hermes";

interface HermesFileBrowserProps {
  onSelectFile?: (file: FileItem) => void;
  onSelectFolder?: (folder: string) => void;
  onNavigateUp?: () => void;
}

export const HermesFileBrowser: React.FC<HermesFileBrowserProps> = ({
  onSelectFile,
  onSelectFolder,
  onNavigateUp,
}) => {
  // Define the complete file structure for the .hermes installation
  const fileStructure = useMemo(
    () => ({
      [".hermes"]: [
        { name: ".hermes", type: "folder" as const },
        { name: ".env", type: "env" as const },
        { name: "config.yaml", type: "yaml" as const },
        { name: "hermes", type: "executable" as const },
        { name: "node_modules", type: "folder" as const },
        { name: ".venv", type: "folder" as const },
        { name: "README.md", type: "file" as const },
        { name: "LICENSE", type: "file" as const },
        { name: "package.json", type: "file" as const },
        { name: "bun.lock", type: "file" as const },
        { name: "justfile", type: "file" as const },
        { name: "scripts", type: "folder" as const },
        { name: "theme-lib", type: "folder" as const },
        { name: "pi.config.json", type: "file" as const },
        { name: "pienv", type: "file" as const },
      ],
      [".hermes/.hermes"]: [
        { name: "config.yaml", type: "yaml" as const },
        { name: "profiles", type: "folder" as const },
        { name: "sessions", type: "folder" as const },
        { name: ".cache", type: "cache" as const },
        { name: ".gitignore", type: "file" as const },
      ],
      [".hermes/.venv/bin"]: [
        { name: "hermes", type: "executable" as const },
        { name: "activate", type: "script" as const },
        { name: "pip", type: "executable" as const },
        { name: "python", type: "executable" as const },
      ],
      [".hermes/node_modules"]: [
        { name: "pi-coding-agent", type: "folder" as const },
        { name: "pi-tui", type: "folder" as const },
        { name: "pi-ai", type: "folder" as const },
        { name: "typebox", type: "folder" as const },
      ],
    }),
    [],
  );

  // Current path tracking
  const [currentPath, setCurrentPath] = useState<Record<string, number>>({});
  const [currentDirectory, setCurrentDirectory] = useState<string>(hermesPath);

  // Get files for current directory
  const getFilesForDirectory = useCallback(
    (directory: string) => (fileStructure as any)[directory] || [],
    [fileStructure],
  );

  // Navigate into a folder
  const navigateIntoFolder = useCallback(
    (directory: string, fileName: string) => {
      const newDir = `${directory}/${fileName}`;
      setCurrentPath((prev) => ({
        ...prev,
        [newDir]: (prev[newDir] || 0) + 1,
      }));
      setCurrentDirectory(newDir);
    },
    [],
  );

  // Navigate up one level
  const navigateUp = useCallback(() => {
    const parts = currentDirectory.split("/").filter(Boolean);
    if (parts.length > 1) {
      const parentDir = parts.slice(0, -1).join("/") || "/";
      navigateIntoFolder(parentDir, "");
    }
  }, [currentDirectory, navigateIntoFolder]);

  // Get breadcrumb path
  const getBreadcrumbPath = useCallback(
    (path: string) => {
      const parts = path.split("/").filter(Boolean);
      return parts.map((part, index) => {
        const fullPath = parts.slice(0, index + 1).join("/") || path;
        const count = currentPath[fullPath] || 0;
        const isLast = index === parts.length - 1;
        return (
          <button
            key={part}
            className="breadcrumb-item"
            onClick={() => !isLast && navigateIntoFolder(path, part)}
            disabled={isLast}
            style={{
              padding: "4px 8px",
              borderRadius: "4px",
              backgroundColor: isLast ? "#1e1e1e" : "#2d2d2d",
              color: isLast ? "#4caf50" : "#888",
              cursor: isLast ? "default" : "pointer",
              border: "none",
              background: "transparent",
              marginLeft: "4px",
              fontSize: "12px",
              fontWeight: "500",
            }}
          >
            {part}
            {!isLast && (
              <span style={{ marginLeft: "4px", opacity: 0.5 }}>›</span>
            )}
          </button>
        );
      });
    },
    [currentPath, navigateIntoFolder],
  );

  // Format file icon based on type
  const getFileIcon = useCallback((type: string) => {
    const icons: Record<string, string> = {
      folder: "📁",
      file: "📄",
      executable: "🔧",
      script: "📜",
      yaml: "📋",
      env: "🔐",
      md: "📝",
      cache: "⚡",
      json: "📂",
    };
    return icons[type] || "📄";
  }, []);

  // Format file type display
  const getFileTypeDisplay = useCallback((name: string, type: string) => {
    if ([".hermes", ".env", ".cache"].includes(name)) return name;
    if (type === "yaml") return "config.yaml";
    if (type === "env") return ".env";
    if (type === "md") return "README.md";
    if (type === "json")
      return name === "package.json" ? "package.json" : "config";
    if (type === "file") return name;
    return name;
  }, []);

  // Count items in a directory
  const countItemsInDirectory = useCallback(
    (directory: string) => {
      const files = getFilesForDirectory(directory);
      const folders = files.filter((f: {type: string}) => f.type === "folder").length;
      const filesTotal = files.filter((f: {type: string}) => f.type !== "folder").length;
      return { folders, files: filesTotal };
    },
    [getFilesForDirectory],
  );

  // Format path for display
  const formatPathDisplay = useCallback((path: string) => {
    if (!path || path === "/") return hermesPath;
    const parts = path.split("/").filter(Boolean);
    return `/.hermes/${parts.slice(1).join("/")}`;
  }, []);

  return (
    <div
      className="hermes-file-browser"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#1e1e1e",
        color: "#ddd",
        fontFamily: "monospace",
        borderRadius: "6px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        className="file-browser-header"
        style={{
          padding: "8px 12px",
          background: "#2d2d2d",
          borderBottom: "1px solid #333",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: "bold",
            color: "#4caf50",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>📁</span>
          <span>Hermes Files</span>
        </span>
        <span style={{ fontSize: "10px", color: "#888" }}>File Browser</span>
      </div>

      {/* Breadcrumb Navigation */}
      <div
        className="breadcrumb-nav"
        style={{
          padding: "4px 12px",
          background: "#252525",
          borderBottom: "1px solid #333",
          flexShrink: 0,
          minWidth: 0,
        }}
      >
        <span style={{ fontSize: "10px", color: "#666", marginRight: "4px" }}>
          Path:
        </span>
        {getBreadcrumbPath(currentDirectory)}
        <button
          className="up-button"
          onClick={navigateUp}
          disabled={currentDirectory === hermesPath}
          style={{
            marginLeft: "8px",
            padding: "4px 10px",
            fontSize: "10px",
            color: currentDirectory === hermesPath ? "#555" : "#4caf50",
            backgroundColor:
              currentDirectory === hermesPath ? "#252525" : "#2d2d2d",
            border: "none",
            borderRadius: "4px",
            cursor: currentDirectory === hermesPath ? "default" : "pointer",
            background: "transparent",
            fontWeight: currentDirectory === hermesPath ? "normal" : "bold",
          }}
        >
          ↑ Up
        </button>
      </div>

      {/* File Tree */}
      <div
        className="file-browser-content"
        style={{ flex: 1, overflow: "auto", padding: "8px" }}
      >
        {Object.entries(fileStructure).map(([directory, files]) => {
          const items = countItemsInDirectory(directory);
          return (
            <div
              key={directory}
              className="file-directory-group"
              style={{ marginBottom: "4px" }}
            >
              <div
                className="directory-header"
                style={{
                  fontSize: "11px",
                  color: "#666",
                  marginBottom: "4px",
                  padding: "2px 4px",
                  borderRadius: "4px",
                  background: "#252525",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span style={{ fontSize: "12px" }}>
                  {getFileIcon("folder")}
                </span>
                <span>{formatPathDisplay(directory)}</span>
                <span
                  style={{ fontSize: "9px", color: "#555", marginLeft: "auto" }}
                >
                  ({items.folders} folders, {items.files} files)
                </span>
              </div>
              <div
                className="directory-contents"
                style={{ display: "flex", flexDirection: "column", gap: "2px" }}
              >
                {files.map((file) => (
                  <div
                    key={file.name}
                    className={`file-item ${file.type === "folder" ? "folder" : ""}`}
                    onClick={() => {
                      if (file.type === "folder") {
                        navigateIntoFolder(directory, file.name);
                      } else if (onSelectFile) {
                        onSelectFile(file);
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "6px 8px",
                      borderRadius: "4px",
                      cursor: file.type === "folder" ? "pointer" : "default",
                      gap: "8px",
                      color: "#ddd",
                      fontSize: "12px",
                      backgroundColor:
                        file.type === "folder" ? "#2d2d2d" : "#1e1e1e",
                      border: file.type === "folder" ? "none" : "none",
                      transition: "background-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (file.type === "folder") {
                        e.currentTarget.style.backgroundColor = "#3d3d3d";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (file.type === "folder") {
                        e.currentTarget.style.backgroundColor = "#2d2d2d";
                      }
                    }}
                  >
                    <span style={{ fontSize: "14px", flexShrink: 0 }}>
                      {getFileIcon(file.type)}
                    </span>
                    <span
                      className="file-name"
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {getFileTypeDisplay(file.name, file.type)}
                    </span>
                    <span
                      className="file-type-badge"
                      style={{
                        fontSize: "9px",
                        color: "#666",
                        padding: "2px 6px",
                        borderRadius: "12px",
                        background: "#2a2a2a",
                        marginLeft: "auto",
                        textTransform: "uppercase",
                      }}
                    >
                      {file.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer with quick info */}
      <div
        className="file-browser-footer"
        style={{
          padding: "8px 12px",
          background: "#2d2d2d",
          borderTop: "1px solid #333",
          fontSize: "10px",
          color: "#888",
          flexShrink: 0,
          minWidth: 0,
        }}
      >
        <span style={{ marginRight: "16px" }}>
          <span style={{ color: "#666" }}>Current:</span>{" "}
          <span style={{ color: "#4caf50" }}>
            {formatPathDisplay(currentDirectory)}
          </span>
        </span>
        <span style={{ marginRight: "16px" }}>
          <span style={{ color: "#666" }}>Total items:</span>{" "}
          <span style={{ color: "#888" }}>
            {Object.values(fileStructure).flat().length}
          </span>
        </span>
        <span>
          <span style={{ color: "#666" }}>Path depth:</span>{" "}
          <span style={{ color: "#888" }}>
            {currentDirectory.split("/").filter(Boolean).length}
          </span>
        </span>
      </div>
    </div>
  );
};

export default HermesFileBrowser;
