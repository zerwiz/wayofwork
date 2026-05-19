import { useCallback, useMemo, useState } from "react";
import { Menu } from "@earendil-works/pi-tui/menu";
import { useUiMode } from "../../hooks/useUiMode";
import { useSimplePreferences } from "../../hooks/useSimplePreferences";
import { useWorkspaceTree } from "../../hooks/useWorkspaceTree";
import { useAgents } from "../../hooks/useAgents";
import { useUiViewsCatalog } from "../../hooks/useUiViewsCatalog";
import { useRunMenuDebugState } from "../../hooks/useRunMenuDebugState";
import { useWayOfPiSession } from "../../hooks/useWayOfPiSession";
import { useServerConfig } from "../../hooks/useServerConfig";
import { useShellMobile } from "../../hooks/useShellMobile";
import { useMaxWidthMediaQuery } from "../../hooks/useMaxWidthMediaQuery";
import { WOP_PUBLIC_REPO_URL, WOP_FEEDBACK_CONTACT_URL, WOP_SUPPORT_HOME_URL, TASKS_JSON_REL, LAUNCH_JSON_REL } from "../../constants";
import type { SettingsMenuHandlers, FileMenuHandlers } from "../../types/commands";
import { readAutoSaveInitial, readRecentWorkspaceFolders } from "../../utils/workspace";

export function FileMenu() {
  const { mode: uiMode, setMode: setUiMode } = useUiMode();
  const { isDark: simpleIsDark } = useSimplePreferences();
  const { root, nodes, folders, git, switchAllowed, refresh } = useWorkspaceTree();
  const agentsApi = useAgents();
  const uiViewsCatalog = useUiViewsCatalog();
  const { config, refresh: refreshServerConfig } = useServerConfig();
  const { shellMobile, setShellMobile } = useShellMobile();
  const { isAtMaxWidth: narrowViewport767 } = useMaxWidthMediaQuery(767);

  const [recentFolders] = useState(() => readRecentWorkspaceFolders());

  const handleOpenFile = useCallback(() => {
    console.log("File: Open File - needs implementation");
  }, []);

  const handleOpenFolder = useCallback(() => {
    console.log("File: Open Folder - needs implementation");
  }, []);

  const handleSave = useCallback(async () => {
    console.log("File: Save - needs implementation");
  }, []);

  const handleRevert = useCallback(() => {
    console.log("File: Revert - needs implementation");
  }, []);

  const handlePreferences = useCallback(() => {
    console.log("File: Preferences - needs implementation");
  }, []);

  const handlers: FileMenuHandlers = useMemo(() => ({
    onOpenFile: handleOpenFile,
    onOpenFolder: handleOpenFolder,
    onNewTextFile: () => console.log("File: New Text File"),
    onSave: handleSave,
    onRevertFile: handleRevert,
    onPreferencesOpen: handlePreferences,
    onExit: () => window.close(),
  }), [handleOpenFile, handleOpenFolder, handleSave, handleRevert, handlePreferences]);

  return (
    <Menu id="file-menu" label="File">
      <Menu.Submenu id="open" label="Open...">
        <Menu.Item id="open-file" run={handlers.onOpenFile} label="File..." />
        <Menu.Item id="open-folder" run={handlers.onOpenFolder} label="Folder..." />
      </Menu.Submenu>

      <Menu.Submenu id="new" label="New...">
        <Menu.Item id="new-text-file" run={handlers.onNewTextFile} label="Text File" />
        <Menu.Item id="new-agent" run={() => console.log("New Agent")} label="Agent" />
      </Menu.Submenu>

      <Menu.Submenu id="save" label="Save...">
        <Menu.Item id="save" run={handlers.onSave} label="Save" />
        <Menu.Item id="save-as" run={() => console.log("Save As")} label="Save As..." />
        <Menu.Item id="save-all" run={() => console.log("Save All")} label="Save All" />
      </Menu.Submenu>

      <Menu.Item id="revert" run={handlers.onRevertFile} label="Revert" />
      <Menu.Item id="exit" run={handlers.onExit} label="Exit" />
      <Menu.Separator />
      <Menu.Item id="preferences" run={handlers.onPreferencesOpen} label="Preferences..." />
    </Menu>
  );
}

declare module "@earendil-works/pi-tui/menu" {
  interface MenuHandlers {
    onOpenFile: () => void;
    onOpenFolder: () => void;
    onNewTextFile: () => void;
    onSave: () => void;
    onRevertFile: () => void;
    onPreferencesOpen: () => void;
    onExit: () => void;
  }
}
