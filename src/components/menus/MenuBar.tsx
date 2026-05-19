// components/menus/MenuBar.tsx

import { useState, useCallback, useMemo } from "react";
import type { TechnicalActivity } from "@/hooks/useTechnicalWorkspaceState";
import type { GoToSymbolHandler } from "@/hooks/useNavigationState";
import type { HelpMenuHandlers } from "@/hooks/useHelpMenuState";
import type { TerminalMenuHandlers } from "@/hooks/useTerminalMenuState";
import type { RunMenuHandlers } from "@/hooks/useRunMenuState";
import type { EditMenuHandlers } from "@/hooks/useEditMenuState";
import type { SelectionMenuHandlers } from "@/hooks/useSelectionMenuState";

export interface MenubarProps {
  activity: TechnicalActivity;
  leftSidebarVisible: boolean;
  onToggleLeftSidebar: () => void;
  goMenuHandlers: GoToSymbolHandler;
  helpMenuHandlers: HelpMenuHandlers;
  terminalMenuHandlers: TerminalMenuHandlers;
  runMenuHandlers: RunMenuHandlers;
  editMenuHandlers: EditMenuHandlers;
  selectionMenuHandlers: SelectionMenuHandlers;
  children?: React.ReactNode;
}

export const Menubar = ({
  activity,
  leftSidebarVisible,
  onToggleLeftSidebar,
  goMenuHandlers,
  helpMenuHandlers,
  terminalMenuHandlers,
  runMenuHandlers,
  editMenuHandlers,
  selectionMenuHandlers,
  children,
}: MenubarProps) => {
  const [menuBarTick, setMenuBarTick] = useState(0);

  const menuItems = useMemo(() => {
    return [
      {
        label: "File",
        id: "file",
        run: () => {},
      },
      {
        label: "Edit",
        id: "edit",
        run: () => {},
      },
      {
        label: "View",
        id: "view",
        run: () => {},
      },
      {
        label: "Go",
        id: "go",
        run: () => {},
      },
      {
        label: "Terminal",
        id: "terminal",
        run: () => {},
      },
      {
        label: "Run",
        id: "run",
        run: () => {},
      },
      {
        label: "Help",
        id: "help",
        run: () => {},
      },
    ];
  }, []);

  const renderMenuItems = useCallback(
    (item: { label: string; id: string; run: () => void }) => (
      <li key={item.id} className="menu-item">
        <button onClick={item.run}>{item.label}</button>
        {/* Dropdown submenu would go here */}
      </li>
    ),
    []
  );

  if (!children) {
    return null;
  }

  return (
    <nav className="menubar">
      <ul>
        {menuItems.map(renderMenuItems)}
      </ul>
      <div className="menubar-content">{children}</div>
    </nav>
  );
};
