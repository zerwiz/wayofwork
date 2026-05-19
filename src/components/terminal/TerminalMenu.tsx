// components/terminal/TerminalMenu.tsx
import React from "react";
import { Menu } from "@earendil-works/pi-tui/menu";

/**
 * TerminalMenu Component
 *
 * Phase 7: Extract terminal/Run menu handlers into dedicated components
 * This component handles all Terminal menu actions (New Terminal, Split, Run Tasks, etc.)
 *
 * Props:
 * - terminalMenuHandlers: TerminalMenuHandlers from useTerminalMenuState hook
 *
 * Usage: Mounted in Technical mode shell or Simple/Claw mode with terminal enabled
 */

export interface TerminalMenuProps {
  handlers: {
    terminalServerEnabled: boolean;
    onNewTerminal: () => void;
    onSplitTerminal: () => void;
    onRunTask: () => void;
    onRunBuildTask: () => void;
    onRunActiveFile: () => void;
    onRunSelectedText: () => void;
    onConfigureTasks: () => void;
    onConfigureDefaultBuildTask: () => void;
  };
}

export const TerminalMenu: React.FC<TerminalMenuProps> = ({ handlers }) => {
  // Menu structure for Terminal dropdown
  const menuItems = [
    {
      section: "Terminal",
      items: [
        {
          action: "new",
          label: "New Terminal",
          enabled: handlers.terminalServerEnabled,
          onClick: handlers.onNewTerminal,
        },
        {
          action: "split",
          label: "Split Terminal",
          enabled: handlers.terminalServerEnabled,
          onClick: handlers.onSplitTerminal,
        },
        { type: "divider" },
        {
          action: "run-task",
          label: "Run Task...",
          onClick: handlers.onRunTask,
        },
        {
          action: "run-build",
          label: "Run Build Task...",
          onClick: handlers.onRunBuildTask,
        },
        { type: "divider" },
        {
          action: "run-active-file",
          label: "Run Active File",
          enabled: !!handlers.onRunActiveFile,
          onClick: handlers.onRunActiveFile,
        },
        {
          action: "run-selected",
          label: "Run Selected Text",
          enabled: !!handlers.onRunSelectedText,
          onClick: handlers.onRunSelectedText,
        },
        { type: "divider" },
        {
          action: "configure-tasks",
          label: "Configure Tasks...",
          onClick: handlers.onConfigureTasks,
        },
        {
          action: "default-build-task",
          label: "Configure Default Build Task",
          onClick: handlers.onConfigureDefaultBuildTask,
        },
      ],
    },
  ];

  return (
    <Menu id="terminal-menu" label="Terminal">
      {menuItems[0].items.map((item, idx) => (
        <Menu.Item
          key={idx}
          id={`terminal-${item.action}`}
          label={item.label}
          disabled={!item.enabled}
          run={item.onClick}
        />
      ))}
    </Menu>
  );
};

export default TerminalMenu;
