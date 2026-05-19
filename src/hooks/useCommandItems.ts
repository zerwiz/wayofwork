import { useMemo, useCallback } from "react";
import { useRefactor } from "../context/RefactorContext";
import type { CommandItem } from "../components/CommandPalette";
import { flattenTreeFiles } from "../utils/flattenTree";
import { PI_MODEL_CONFIG_ENTRIES } from "../constants/piModelConfigPaths";
import { apiGet } from "../api/client";
import { buildImplementPlanPrompt, buildReviewPlanPrompt } from "../utils/planModeComposerTemplates";
import { useWorkspaceActions } from "./useWorkspaceActions";
import { useEditorCommandHandlers } from "./useEditorCommandHandlers";
import { useNavigationHandlers } from "./useNavigationHandlers";

export function useCommandItems() {
  const {
    tree: { nodes, refresh },
    uiMode, setUiMode,
    setSimpleTab,
    selectedPath, setSelectedPath,
    modals,
    session,
    editor,
    copyWorkspacePath
  } = useRefactor();

  const { handleNewPlanFile } = useWorkspaceActions();
  const { saveAndRefresh, reloadFocusedOrMain } = useEditorCommandHandlers();
  const { focusWorkspaceFileFromMenu } = useNavigationHandlers();

  // This is a stub for the complex logic in App.tsx
  const injectIntoChatComposer = useCallback((text: string) => {
    // TODO: implement actual injection if possible via context
    console.log("Injecting into chat:", text);
  }, []);

  const openPlanFileForReview = useCallback((p: string) => {
     setSelectedPath(p);
     if (uiMode === "simple") setSimpleTab("chat");
  }, [setSelectedPath, uiMode, setSimpleTab]);

  const openPiModelConfigInSimpleBrains = useCallback((p: string) => {
      setSelectedPath(p);
      if (uiMode === "simple") setSimpleTab("models");
  }, [setSelectedPath, uiMode, setSimpleTab]);

  const openHostDoctor = useCallback(() => {
      modals.setHostDoctorOpen(true);
  }, [modals]);

  const simpleCommandItems: CommandItem[] = useMemo(() => {
    const files = flattenTreeFiles(nodes).slice(0, 120);
    return [
      {
        id: "s-palette",
        label: "Command palette",
        keywords: ["commands"],
        run: () => modals.setCommandPaletteOpen(true),
      },
      {
        id: "s-host-doctor",
        label: "Help: Host doctor",
        detail: "GET /api/diagnostics — checks + copy JSON",
        keywords: ["doctor", "diagnostics", "health", "env", "ollama"],
        run: openHostDoctor,
      },
      {
        id: "s-how-to-use",
        label: uiMode === "claw" ? "Help: Claw guide & roadmap" : "Help: How to use Way of Work",
        detail:
          uiMode === "claw"
            ? "Claw Help — operator shell, phases, schedules, channels"
            : "Getting started modal + doc links",
        keywords: ["help", "start", "guide", "tutorial", "claw", "roadmap"],
        run: () => {
          if (uiMode === "claw") {
            modals.setClawHelpDefaultSection(null);
            modals.setClawHelpOpen(true);
          } else {
            modals.setHowToUseModalOpen(true);
          }
        },
      },
      { id: "s-chat", label: "Simple: Chat", run: () => setSimpleTab("chat") },
      { id: "s-team", label: "Simple: My Team", run: () => setSimpleTab("team") },
      { id: "s-models", label: "Simple: AI Brains", run: () => setSimpleTab("models") },
      { id: "s-projects", label: "Simple: Projects", run: () => setSimpleTab("projects") },
      { id: "s-settings", label: "Simple: Settings", run: () => setSimpleTab("settings") },
      { id: "s-tech", label: "Layout: Technical UI", run: () => {
         window.open("http://localhost:5174", "_blank");
      }},
      {
        id: "s-claw",
        label: "Layout: Claw UI",
        detail: "Roadmap shell — docs/WOP_CLAW_MODE_PLAN.md, docs/WOP_CLAW_UI_PLAN.md",
        run: () => setUiMode("claw"),
      },
      {
        id: "s-save",
        label: "File: Save",
        detail: "Ctrl+S",
        run: () => void saveAndRefresh(),
      },
      { id: "s-revert", label: "File: Revert from disk", run: () => void reloadFocusedOrMain() },
      { id: "s-refresh", label: "Workspace: Refresh tree", run: () => void refresh() },
      { id: "s-copy", label: "Workspace: Copy path", run: copyWorkspacePath as any },
      {
        id: "s-chat-plan",
        label: "Agent: Plan mode (Pi planner prompt)",
        keywords: ["cursor", "planning"],
        run: () => session.setChatMode("plan"),
      },
      {
        id: "s-chat-build",
        label: "Agent: Build mode",
        keywords: ["cursor", "coding"],
        run: () => session.setChatMode("build"),
      },
      {
        id: "s-new-plan",
        label: "File: New plan markdown (plans/PLAN-…)",
        keywords: ["plan", "planner", "spec"],
        run: () => void handleNewPlanFile(),
      },
      {
        id: "s-chat-build-from-plan",
        label: "Chat: Insert Build handoff from latest plan",
        keywords: ["plan", "implement"],
        run: () => {
          setSimpleTab("chat");
          void apiGet<{ latest: { path: string } | null }>("/api/plans")
            .then((d) => {
              const p = d.latest?.path;
              if (!p) {
                injectIntoChatComposer("No `plans/PLAN-*.md` file found yet.");
                return;
              }
              injectIntoChatComposer(buildImplementPlanPrompt(p));
            })
            .catch(() => injectIntoChatComposer("Could not load `/api/plans`."));
        },
      },
      {
        id: "s-chat-review-plan",
        label: "Chat: Insert review prompt for latest plan",
        keywords: ["plan", "review"],
        run: () => {
          setSimpleTab("chat");
          void apiGet<{ latest: { path: string } | null }>("/api/plans")
            .then((d) => {
              const p = d.latest?.path;
              if (!p) {
                injectIntoChatComposer("No `plans/PLAN-*.md` file found yet.");
                return;
              }
              openPlanFileForReview(p);
              injectIntoChatComposer(buildReviewPlanPrompt(p));
            })
            .catch(() => injectIntoChatComposer("Could not load `/api/plans`."));
        },
      },
      ...PI_MODEL_CONFIG_ENTRIES.map(
        (e) =>
          ({
            id: `s-pi-model-file-${e.id}`,
            label: `Pi: ${e.label} (${e.path})`,
            keywords: ["models", "provider", "brains", e.id],
            run: () => openPiModelConfigInSimpleBrains(e.path),
          }) satisfies CommandItem,
      ),
      ...files.map((f) => ({
        id: `s-file-${f.path}`,
        label: `Open: ${f.path}`,
        keywords: [f.name ?? '', f.path ?? ''].filter(Boolean),
        run: () => {
          setSelectedPath(f.path);
          setSimpleTab("chat");
        },
      })),
    ];
  }, [
    nodes, modals, openHostDoctor, uiMode, setSimpleTab, setUiMode, saveAndRefresh, reloadFocusedOrMain, refresh, copyWorkspacePath, session, handleNewPlanFile, injectIntoChatComposer, openPlanFileForReview, openPiModelConfigInSimpleBrains, setSelectedPath
  ]);

  return { simpleCommandItems };
}
