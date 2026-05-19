/**
 * useWorkspaceTree Hook
 *
 * @description Manages workspace file tree state including folder structure,
 *              git operations (stage/unstage/hang), and refresh mechanisms
 * @returns Object containing root nodes, folders, git status, and refresh functions
 *
 * @example
 * ```tsx
 * const { root, nodes, folders, git, switchAllowed, error, loading, refresh } = useWorkspaceTree();
 * if (git.hang) await switchWorkspace();
 * ```
 */

import { useState, useCallback, useEffect } from "react";

export interface WorkspaceTreeNode {
  name: string;
  path: string;
  type: "file" | "dir";
  gitStatus?: string;
  children?: WorkspaceTreeNode[];
}

export interface GitStatus {
  hang: boolean;
  staged: string[];
  modified: string[];
  added: string[];
  deleted: string[];
  roots: { label: string; path: string; isRepo: boolean; topLevel: string | null; branch: string | null; error: string | null }[];
}

export type WorkspaceFolderInfo = { path: string; label: string };

export interface UseWorkspaceTreeReturn {
  root: string;
  nodes: WorkspaceTreeNode[];
  folders: WorkspaceFolderInfo[];
  git: GitStatus;
  switchAllowed: boolean;
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  refreshQuiet: () => Promise<void>;
  setNodes: (nodes: WorkspaceTreeNode[]) => void;
  setFolders: (folders: WorkspaceFolderInfo[]) => void;
  setGitStatus: (git: Partial<GitStatus>) => void;
  setSwitchAllowed: (allowed: boolean) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  setRoot: (root: string) => void;
}

// Storage keys for persistence
const STORAGE_KEYS = {
  ROOT: "wop-workspace-tree-root",
  NODES: "wop-workspace-tree-nodes",
  FOLDERS: "wop-workspace-tree-folders",
  GIT_STATUS: "wop-workspace-tree-git-status",
  SWITCH_ALLOWED: "wop-workspace-tree-switch-allowed",
  ERROR: "wop-workspace-tree-error",
  LOADING: "wop-workspace-tree-loading",
};

// Default workspace tree structure
const DEFAULT_NODES: WorkspaceTreeNode[] = [
  {
    name: "root",
    path: "",
    type: "dir",
    children: [],
  },
];

const DEFAULT_GIT_STATUS: GitStatus = {
  hang: false,
  staged: [],
  modified: [],
  added: [],
  deleted: [],
  roots: [],
};

export function useWorkspaceTree(): UseWorkspaceTreeReturn {
  const [root, setRootState] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ROOT);
      return stored || "";
    } catch {
      return "";
    }
  });

  const [nodes, setNodesState] = useState<WorkspaceTreeNode[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.NODES);
      if (stored) {
        const parsed = JSON.parse(stored) as WorkspaceTreeNode[];
        return parsed.length > 0 ? parsed : DEFAULT_NODES;
      }
    } catch {
      // Storage not available or parse error
    }
    return DEFAULT_NODES;
  });

  const [folders, setFoldersState] = useState<WorkspaceFolderInfo[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.FOLDERS);
      if (stored) {
        return JSON.parse(stored) as WorkspaceFolderInfo[];
      }
    } catch {
      // Storage not available or parse error
    }
    return [];
  });

  const [git, setGitState] = useState<GitStatus>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.GIT_STATUS);
      if (stored) {
        return JSON.parse(stored) as GitStatus;
      }
    } catch {
      // Storage not available or parse error
    }
    return DEFAULT_GIT_STATUS;
  });

  const [switchAllowed, setSwitchAllowedState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SWITCH_ALLOWED);
      if (stored !== null) {
        return JSON.parse(stored);
      }
    } catch {
      // Storage not available or parse error
    }
    return true;
  });

  const [error, setErrorState] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ERROR);
      if (stored) {
        return stored as string;
      }
    } catch {
      // Storage not available or parse error
    }
    return null;
  });

  const [loading, setLoadingState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LOADING);
      if (stored !== null) {
        return JSON.parse(stored);
      }
    } catch {
      // Storage not available or parse error
    }
    return false;
  });

  const setNodes = useCallback((newNodes: WorkspaceTreeNode[]) => {
    setNodesState((prev) => newNodes);
    try {
      localStorage.setItem(STORAGE_KEYS.NODES, JSON.stringify(newNodes));
    } catch {
      // Storage might not be available
    }
  }, []);

  const setFolders = useCallback((newFolders: WorkspaceFolderInfo[]) => {
    setFoldersState(newFolders);
    try {
      localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(newFolders));
    } catch {
      // Storage might not be available
    }
  }, []);

  const setGitStatus = useCallback(
    (newGitStatus: Partial<GitStatus>) => {
      setGitState((prev) => {
        const updated = { ...prev, ...newGitStatus };
        try {
          localStorage.setItem(
            STORAGE_KEYS.GIT_STATUS,
            JSON.stringify(updated),
          );
        } catch {
          // Storage might not be available
        }
        return updated;
      });
    },
    [],
  );

  const setSwitchAllowed = useCallback(
    (allowed: boolean) => {
      setSwitchAllowedState(allowed);
      try {
        localStorage.setItem(STORAGE_KEYS.SWITCH_ALLOWED, JSON.stringify(allowed));
      } catch {
        // Storage might not be available
      }
    },
    [],
  );

  const setError = useCallback((newError: string | null) => {
    setErrorState(newError);
    try {
      localStorage.setItem(STORAGE_KEYS.ERROR, newError || "");
    } catch {
      // Storage might not be available
    }
  }, []);

  const setLoading = useCallback((newLoading: boolean) => {
    setLoadingState(newLoading);
    try {
      localStorage.setItem(STORAGE_KEYS.LOADING, JSON.stringify(newLoading));
    } catch {
      // Storage might not be available
    }
  }, []);

  const setRoot = useCallback((newRoot: string) => {
    setRootState(newRoot);
    try {
      localStorage.setItem(STORAGE_KEYS.ROOT, newRoot);
    } catch {
      // Storage might not be available
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoadingState(true);
    setErrorState(null);

    try {
      const res = await fetch("/api/tree", {
        headers: {
          Accept: "application/json",
          ...getAuthHeaders(),
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to fetch tree: ${res.status} ${text}`);
      }

      const data = await res.json() as {
        rootDisplay: string;
        nodes: WorkspaceTreeNode[];
        git?: GitStatus;
      };

      if (data.rootDisplay) setRoot(data.rootDisplay);
      if (data.nodes) setNodes(data.nodes);
      if (data.git) setGitState(data.git);

      // Refresh folders from nodes
      const currentFolders: WorkspaceFolderInfo[] = [];
      const collectFolders = (node: WorkspaceTreeNode) => {
        if (node.type === "dir" && node.path) {
          currentFolders.push({ path: node.path, label: node.name });
        }
        if (node.children) {
          node.children.forEach(collectFolders);
        }
      };
      (data.nodes || []).forEach(collectFolders);
      setFolders(currentFolders);

      // Clear switch lock
      setSwitchAllowed(true);

    } catch (error) {
      setErrorState(
        error instanceof Error ? error.message : "Failed to refresh workspace tree",
      );
    } finally {
      setLoadingState(false);
    }
  }, [setLoadingState, setErrorState, setNodes, setRoot, setFolders, setSwitchAllowed]);

  const refreshQuiet = useCallback(async () => {
    try {
      const res = await fetch("/api/tree", {
        headers: {
          Accept: "application/json",
          ...getAuthHeaders(),
        },
      });

      if (res.ok) {
        const data = await res.json() as {
          rootDisplay: string;
          nodes: WorkspaceTreeNode[];
          git?: GitStatus;
        };
        if (data.nodes) setNodes(data.nodes);
        if (data.git) setGitState(data.git);
      }
    } catch (error) {
      console.warn("Workspace tree quiet refresh failed:", error);
    }
  }, [setNodes]);

  function getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem("wop_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Initial refresh if empty
  useEffect(() => {
    if (nodes.length <= 1 && nodes[0]?.name === "root") {
      void refresh();
    }
  }, [refresh]);

  // Listen for storage changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEYS.ROOT) {
        setRootState(event.newValue || "");
      } else if (event.key === STORAGE_KEYS.NODES) {
        try {
          const stored = event.newValue;
          if (stored) {
            const parsed = JSON.parse(stored) as WorkspaceTreeNode[];
            setNodesState(parsed.length > 0 ? parsed : DEFAULT_NODES);
          }
        } catch {
          // Ignore invalid JSON
        }
      } else if (event.key === STORAGE_KEYS.FOLDERS) {
        try {
          const stored = event.newValue;
          if (stored) {
            setFoldersState(JSON.parse(stored) as WorkspaceFolderInfo[]);
          }
        } catch {
          // Ignore invalid JSON
        }
      } else if (event.key === STORAGE_KEYS.GIT_STATUS) {
        try {
          const stored = event.newValue;
          if (stored) {
            const parsed = JSON.parse(stored) as GitStatus;
            setGitState(parsed);
          }
        } catch {
          // Ignore invalid JSON
        }
      } else if (event.key === STORAGE_KEYS.SWITCH_ALLOWED) {
        try {
          const stored = event.newValue;
          if (stored !== null) {
            setSwitchAllowedState(JSON.parse(stored));
          }
        } catch {
          // Ignore invalid JSON
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return {
    root,
    nodes,
    folders,
    git,
    switchAllowed,
    error,
    loading,
    refresh,
    refreshQuiet,
    setNodes,
    setFolders,
    setGitStatus,
    setSwitchAllowed,
    setError,
    setLoading,
    setRoot,
  };
}
