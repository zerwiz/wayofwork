import React from "react";

/**
 * EditMenu Component
 *
 * Phase 7: Extract menu handlers into dedicated components
 * This component handles all Edit menu actions (Undo, Redo, Cut, Copy, Paste, Find, etc.)
 *
 * Props:
 * - handlers: EditMenuHandlers from App.tsx
 * - activeDockTab: current tab in the dock
 * - fileReady: whether a file is loaded and ready for editing
 */

export interface EditMenuProps {
  handlers: {
    onUndo: () => void;
    onRedo: () => void;
    onCut: () => void;
    onCopy: () => void;
    onPaste: () => Promise<void>;
    onFind: () => void;
    onReplace: () => void;
    onFindInFiles: () => void;
    onReplaceInFiles: () => void;
    onToggleLineComment: () => void;
    onToggleBlockComment: () => void;
    onEmmetExpand: () => void;
    canUndo: boolean;
    canRedo: boolean;
    canEdit: boolean;
  };
  activeDockTab: { type: string } | undefined;
  fileReady: boolean;
}

export const EditMenu: React.FC<EditMenuProps> = ({
  handlers,
  activeDockTab,
  fileReady,
}) => {
  // Menu structure with proper typing
  const menuItems = [
    {
      section: "Edit",
      items: [
        { action: "undo", enabled: handlers.canUndo, label: "Undo" },
        { action: "redo", enabled: handlers.canRedo, label: "Redo" },
        { type: "divider" },
        { action: "cut", enabled: handlers.canEdit, label: "Cut" },
        { action: "copy", enabled: handlers.canEdit, label: "Copy" },
        { action: "paste", enabled: handlers.canEdit, label: "Paste" },
        { type: "divider" },
        { action: "select", enabled: handlers.canEdit, label: "Select All" },
        { action: "expand", enabled: handlers.canEdit, label: "Expand Selection" },
        { action: "shrink", enabled: handlers.canEdit, label: "Shrink Selection" },
        { type: "divider" },
        { action: "lineUp", enabled: handlers.canEdit, label: "Move Line Up" },
        { action: "lineDown", enabled: handlers.canEdit, label: "Move Line Down" },
        { action: "duplicate", enabled: handlers.canEdit, label: "Duplicate" },
        { type: "divider" },
        { action: "find", enabled: handlers.canEdit, label: "Find" },
        { action: "replace", enabled: handlers.canEdit, label: "Replace" },
        { action: "findInFiles", enabled: handlers.canEdit, label: "Find in Files" },
        { action: "replaceInFiles", enabled: handlers.canEdit, label: "Replace in Files" },
        { type: "divider" },
        { action: "lineComment", enabled: handlers.canEdit, label: "Toggle Line Comment" },
        { action: "blockComment", enabled: handlers.canEdit, label: "Toggle Block Comment" },
        { action: "emmetExpand", enabled: handlers.canEdit, label: "Expand Emmet" },
      ],
    },
  ];

  // Placeholder render - in production this would connect to actual menu system
  return (
    <div
      data-component="edit-menu"
      aria-label="Edit Menu"
      className="wop-menu"
      role="menu"
    >
      {/* Menu content will be connected via props in Phase 8 */}
    </div>
  );
};

export default EditMenu;
