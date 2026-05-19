import { useCallback } from "react";
import { useRefactor } from "../context/RefactorContext";
import { posixDirname } from "../utils/posixPath";

export function useNavigationHandlers() {
  const {
    uiMode,
    workspaceGrid,
    setExplorerContextDir,
    setSelectedPath,
    setSimpleTab,
    setClawTab,
    setWorkspaceOpenSignal,
    setTechnicalActivity,
    setLeftSidebarVisible,
    historyStack, setHistoryStack,
    historyIdx, setHistoryIdx,
    agents: { data: agentsData }
  } = useRefactor();

  const focusWorkspaceFileFromMenu = useCallback(
    (rel: string) => {
      setExplorerContextDir(posixDirname(rel));
      if (uiMode === "simple") {
        setSelectedPath(rel);
        setSimpleTab("chat");
      } else if (uiMode === "claw") {
        setSelectedPath(rel);
        setClawTab("files");
      } else {
        const isWsMulti = workspaceGrid.cols > 1 || workspaceGrid.rows > 1;
        if (isWsMulti) {
          setWorkspaceOpenSignal((s) => ({ path: rel, rev: (s?.rev ?? 0) + 1 }));
        } else {
          setSelectedPath(rel);
        }
        setTechnicalActivity("explorer");
        setLeftSidebarVisible(true);
      }
    },
    [uiMode, workspaceGrid.cols, workspaceGrid.rows, setExplorerContextDir, setSelectedPath, setSimpleTab, setClawTab, setWorkspaceOpenSignal, setTechnicalActivity, setLeftSidebarVisible],
  );

  const goHistoryBack = useCallback(() => {
    if (historyIdx <= 0) return;
    const nextIdx = historyIdx - 1;
    setHistoryIdx(nextIdx);
    const rel = historyStack[nextIdx];
    focusWorkspaceFileFromMenu(rel);
  }, [historyIdx, historyStack, focusWorkspaceFileFromMenu, setHistoryIdx]);

  const goHistoryForward = useCallback(() => {
    if (historyIdx >= historyStack.length - 1) return;
    const nextIdx = historyIdx + 1;
    setHistoryIdx(nextIdx);
    const rel = historyStack[nextIdx];
    focusWorkspaceFileFromMenu(rel);
  }, [historyIdx, historyStack, focusWorkspaceFileFromMenu, setHistoryIdx]);

  const openTeamsYamlFromMenu = useCallback(() => {
    const rel = agentsData?.teamsPath ?? ".pi/agents/teams.yaml";
    focusWorkspaceFileFromMenu(rel);
  }, [agentsData?.teamsPath, focusWorkspaceFileFromMenu]);

  return {
    focusWorkspaceFileFromMenu,
    goHistoryBack,
    goHistoryForward,
    openTeamsYamlFromMenu
  };
}
