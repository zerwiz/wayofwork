import { useCallback } from "react";
import { useRefactor } from "../context/RefactorContext";
import { apiPostJson, apiPutJson } from "../api/client";
import { ancestorDirPaths } from "../utils/posixPath";
import { createPlanArtifactInWorkspace } from "../utils/planModeWorkspace";
import { mergeSnippetIntoLaunchJson, type LaunchSnippetId } from "../utils/launchJsonMutate";

export function useWorkspaceActions() {
  const {
    explorerContextDir,
    tree: { refresh },
    setTreeExpand,
    setSelectedPath,
    uiMode,
    setSimpleTab,
    setClawTab,
    modals: { setNewPlanFileModalOpen }
  } = useRefactor();

  const sanitizeNewEntryName = (raw: string): string | null => {
    const t = raw.trim().replace(/\\/g, "/").replace(/^\/+/, "");
    if (!t || t === "." || t.includes("..")) return null;
    return t;
  };

  const handleNewFile = useCallback(async () => {
    const name = window.prompt("New file name (under the selected folder)", "untitled.txt");
    if (name == null) return;
    const safe = sanitizeNewEntryName(name);
    if (!safe) {
      window.alert("Invalid name: no .. or empty segments; avoid leading slashes.");
      return;
    }
    const rel = explorerContextDir ? `${explorerContextDir}/${safe}` : safe;
    try {
      await apiPostJson<{ ok: boolean }>("/api/fs/entry", { path: rel, kind: "file" });
      setTreeExpand({ rev: Date.now(), paths: ancestorDirPaths(rel) });
      await refresh();
      setSelectedPath(rel);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    }
  }, [explorerContextDir, refresh, setTreeExpand, setSelectedPath]);

  const handleNewFolder = useCallback(async () => {
    const name = window.prompt("New folder name (under the selected folder)", "new-folder");
    if (name == null) return;
    const safe = sanitizeNewEntryName(name);
    if (!safe) {
      window.alert("Invalid name: no .. or empty segments; avoid leading slashes.");
      return;
    }
    const rel = explorerContextDir ? `${explorerContextDir}/${safe}` : safe;
    try {
      await apiPostJson<{ ok: boolean }>("/api/fs/entry", { path: rel, kind: "dir" });
      setTreeExpand({ rev: Date.now(), paths: ancestorDirPaths(rel) });
      await refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    }
  }, [explorerContextDir, refresh, setTreeExpand]);

  const handleExplorerMoveFile = useCallback(async (fromPath: string, toDirPath: string) => {
    try {
      await apiPostJson<{ ok: boolean }>("/api/fs/move", { from: fromPath, toDir: toDirPath });
      await refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    }
  }, [refresh]);

  const handleExplorerRenameNode = useCallback(async (oldPath: string) => {
    const name = window.prompt("New name", oldPath.split("/").pop());
    if (!name) return;
    const safe = sanitizeNewEntryName(name);
    if (!safe) return;
    const parts = oldPath.split("/");
    parts.pop();
    const newPath = parts.length > 0 ? `${parts.join("/")}/${safe}` : safe;
    try {
      await apiPostJson<{ ok: boolean }>("/api/fs/move", { from: oldPath, to: newPath });
      await refresh();
      setSelectedPath(newPath);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    }
  }, [refresh, setSelectedPath]);

  const handleExplorerDeleteNode = useCallback(async (path: string) => {
    if (!window.confirm(`Delete ${path}?`)) return;
    try {
      await apiPostJson<{ ok: boolean }>("/api/fs/delete", { path });
      await refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    }
  }, [refresh]);

  const handleNewPlanFile = useCallback(() => {
    setNewPlanFileModalOpen(true);
  }, [setNewPlanFileModalOpen]);

  const handleNewPlanFileCreate = useCallback(
    (title: string, slugSuggestion: string) => {
      createPlanArtifactInWorkspace({ title, slugSuggestion })
        .then(async (rel) => {
          setNewPlanFileModalOpen(false);
          setTreeExpand({ rev: Date.now(), paths: ancestorDirPaths(rel.path) });
          await refresh();
          setSelectedPath(rel.path);
          if (uiMode === "simple") {
            setSimpleTab("chat");
          } else if (uiMode === "claw") {
            setClawTab("files");
          }
        })
        .catch((e) => {
          window.alert(e instanceof Error ? e.message : String(e));
        });
    },
    [uiMode, refresh, setSimpleTab, setClawTab, setNewPlanFileModalOpen, setTreeExpand, setSelectedPath],
  );

  const performCreateNewWorkspaceFile = useCallback(async (path: string, initialContent?: string) => {
    try {
      await apiPutJson("/api/file", { path, content: initialContent ?? "" });
      setTreeExpand({ rev: Date.now(), paths: ancestorDirPaths(path) });
      await refresh();
      setSelectedPath(path);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    }
  }, [refresh, setSelectedPath, setTreeExpand]);

  const appendLaunchConfigurationSnippet = useCallback(async (id: LaunchSnippetId) => {
    try {
      const res = await apiGet<{ content: string }>("/api/file?path=.vscode/launch.json");
      const next = mergeSnippetIntoLaunchJson(res.content, id);
      await apiPutJson("/api/file", { path: ".vscode/launch.json", content: next });
      await refresh();
      setSelectedPath(".vscode/launch.json");
    } catch (e) {
      // If file doesn't exist, create it with a skeleton
      try {
         const skeleton = JSON.stringify({ version: "0.2.0", configurations: [] }, null, 2);
         const next = mergeSnippetIntoLaunchJson(skeleton, id);
         await apiPutJson("/api/file", { path: ".vscode/launch.json", content: next });
         await refresh();
         setSelectedPath(".vscode/launch.json");
      } catch (e2) {
         window.alert(e2 instanceof Error ? e2.message : String(e2));
      }
    }
  }, [refresh, setSelectedPath]);

  return {
    handleNewFile,
    handleNewFolder,
    handleExplorerMoveFile,
    handleExplorerRenameNode,
    handleExplorerDeleteNode,
    handleNewPlanFile,
    handleNewPlanFileCreate,
    performCreateNewWorkspaceFile,
    appendLaunchConfigurationSnippet
  };
}

// Internal helper for appendLaunchConfigurationSnippet
import { apiGet } from "../api/client";
