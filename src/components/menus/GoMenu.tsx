// components/menus/GoMenu.tsx

import { useMemo } from "react";

/**
 * GoMenu Component - Phase 7
 *
 * Handles navigation commands (Go To File, Line, Definition, etc.)
 * Extracted from monolithic App.tsx to reduce file size
 */

export interface GoMenuHandlers {
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
  canLastEditLocation: boolean;
  onLastEditLocation: () => void;
  canSwitchEditorPrevious: boolean;
  canSwitchEditorNext: boolean;
  onSwitchEditorPrevious: () => void;
  onSwitchEditorNext: () => void;
  onGoToFile: () => void;
  onGoToSymbolInWorkspace: () => void;
  canGoToLine: boolean;
  onGoToLineColumn: () => void;
  canGoToBracket: boolean;
  onGoToBracket: () => void;
  canLanguageFeatures: boolean;
  onGoToSymbolInEditor: () => void;
  onGoToDefinition: () => void;
  onGoToDeclaration: () => void;
  onGoToTypeDefinition: () => void;
  onGoToImplementations: () => void;
  onGoToReferences: () => void;
  canAddSymbolToChat: boolean;
  onAddSymbolToCurrentChat: () => void;
  onAddSymbolToNewChat: () => void;
  canNavigateProblems: boolean;
  onNextProblem: () => void;
  onPreviousProblem: () => void;
  canNavigateChanges: boolean;
  onNextChange: () => void;
  onPreviousChange: () => void;
}

const GoMenu: React.FC<{ handlers: GoMenuHandlers }> = ({ handlers }) => {
  // Menu structure placeholder
  const menuSections = useMemo(() => [
    {
      id: "navigation",
      label: "Navigation",
      actions: [
        { id: "back", label: "Back", enabled: handlers.canGoBack, handler: handlers.onBack },
        { id: "forward", label: "Forward", enabled: handlers.canGoForward, handler: handlers.onForward },
      ],
    },
    {
      id: "editor-switching",
      label: "Editor Switching",
      actions: [
        { id: "previous", label: "Previous Editor", enabled: handlers.canSwitchEditorPrevious, handler: handlers.onSwitchEditorPrevious },
        { id: "next", label: "Next Editor", enabled: handlers.canSwitchEditorNext, handler: handlers.onSwitchEditorNext },
      ],
    },
    {
      id: "go-to",
      label: "Go To...",
      actions: [
        { id: "file", label: "File...", handler: handlers.onGoToFile },
        { id: "symbol", label: "Symbol...", handler: handlers.onGoToSymbolInWorkspace },
        { id: "line", label: "Line...", enabled: handlers.canGoToLine, handler: handlers.onGoToLineColumn },
        { id: "definition", label: "Definition", enabled: handlers.canLanguageFeatures, handler: handlers.onGoToDefinition },
        { id: "implementation", label: "Implementation", enabled: handlers.canLanguageFeatures, handler: handlers.onGoToImplementations },
        { id: "references", label: "References", enabled: handlers.canLanguageFeatures, handler: handlers.onGoToReferences },
      ],
    },
    {
      id: "problems",
      label: "Problems",
      actions: [
        { id: "next", label: "Next Problem", enabled: handlers.canNavigateProblems, handler: handlers.onNextProblem },
        { id: "previous", label: "Previous Problem", enabled: handlers.canNavigateProblems, handler: handlers.onPreviousProblem },
      ],
    },
  ], [
    handlers.canGoBack,
    handlers.canGoForward,
    handlers.onBack,
    handlers.onForward,
    handlers.canSwitchEditorPrevious,
    handlers.canSwitchEditorNext,
    handlers.onSwitchEditorPrevious,
    handlers.onSwitchEditorNext,
    handlers.onGoToFile,
    handlers.onGoToSymbolInWorkspace,
    handlers.canGoToLine,
    handlers.onGoToLineColumn,
    handlers.canLanguageFeatures,
    handlers.onGoToDefinition,
    handlers.onGoToImplementations,
    handlers.onGoToReferences,
    handlers.canNavigateProblems,
    handlers.onNextProblem,
    handlers.onPreviousProblem,
  ]);

  return (
    <div
      data-component="go-menu"
      aria-label="Go Menu"
      className="go-menu"
      role="menu"
    >
      {menuSections.map((section) => (
        <div key={section.id} className="go-menu-section">
          <h3 className="go-menu-section-title">{section.label}</h3>
          {section.actions.map((action) => (
            <button
              key={action.id}
              onClick={() => { if (typeof action.handler === 'function') action.handler(); }}
              disabled={!action.enabled}
              className={`go-menu-item ${action.enabled ? "" : "disabled"}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};

export default GoMenu;
