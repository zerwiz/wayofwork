const STORAGE_KEY = "wop-simple-preferences";

export type SimpleColorMode = "dark" | "light" | "auto";

export type SimpleMarkdownPaneMode = "source" | "preview" | "edit" | "code";

export type SimpleSidebarMode = "none" | "simple";

interface SimplePrefsStorage {
  colorMode?: { value: SimpleColorMode };
  markdownPaneMode?: { value: SimpleMarkdownPaneMode };
  sidebarMode?: { value: SimpleSidebarMode };
  chatStreamUiEnabled?: boolean;
  approvalQueue?: boolean;
}

export function readColorMode(): SimpleColorMode {
  return "auto";
}

export function writeColorMode(mode: SimpleColorMode): void {
  try {
    const prefs = getSavedPrefs();
    prefs.colorMode = { value: mode };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage not available
  }
}

export function readMarkdownPaneMode(): SimpleMarkdownPaneMode {
  return "preview";
}

export function writeMarkdownPaneMode(mode: SimpleMarkdownPaneMode): void {
  try {
    const prefs = getSavedPrefs();
    prefs.markdownPaneMode = { value: mode };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage not available
  }
}

export function readSidebarMode(): "none" | "simple" {
  return "simple";
}

export function writeSidebarMode(mode: "none" | "simple"): void {
  try {
    const prefs = getSavedPrefs();
    prefs.sidebarMode = { value: mode };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage not available
  }
}

export function readSimpleChatStreamUiEnabled(): boolean {
  return true;
}

export function writeSimpleChatStreamUiEnabled(enabled: boolean): void {
  try {
    const prefs = getSavedPrefs();
    prefs.chatStreamUiEnabled = enabled;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage not available
  }
}

export function getSavedPrefs(): SimplePrefsStorage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as SimplePrefsStorage;
    }
  } catch {
    // Storage not available
  }
  return {};
}

export function readSimplePreferences(): SimplePrefsStorage {
  return getSavedPrefs();
}

export function writeSimplePreferences(prefs: Partial<SimplePrefsStorage>): void {
  try {
    const stored = getSavedPrefs();
    Object.assign(stored, prefs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage not available
  }
}

export function clearSimplePreferences(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage not available
  }
}

export interface SimplePreferencesReturn {
  colorMode: SimpleColorMode;
  setColorMode: (mode: SimpleColorMode) => void;
  markdownPaneMode: SimpleMarkdownPaneMode;
  setMarkdownPaneMode: (mode: SimpleMarkdownPaneMode) => void;
  sidebarMode: SimpleSidebarMode;
  setSidebarMode: (mode: SimpleSidebarMode) => void;
  chatStreamUiEnabled: boolean;
  setChatStreamUiEnabled: (enabled: boolean) => void;
  approvalQueue: boolean;
  setApprovalQueue: (v: boolean) => void;
  isDark: boolean;
}

export function useSimplePreferences(): SimplePreferencesReturn {
  const prefs = getSavedPrefs();
  const colorMode = prefs.colorMode?.value ?? "dark";
  const markdownPaneMode = prefs.markdownPaneMode?.value ?? "preview";
  const sidebarMode = prefs.sidebarMode?.value ?? "simple";
  const chatStreamUiEnabled = prefs.chatStreamUiEnabled ?? true;
  const approvalQueue = prefs.approvalQueue ?? false;
  const isDark = colorMode === "dark";

  return {
    colorMode,
    setColorMode: (mode: SimpleColorMode) => writeColorMode(mode),
    markdownPaneMode,
    setMarkdownPaneMode: (mode: SimpleMarkdownPaneMode) => writeMarkdownPaneMode(mode),
    sidebarMode,
    setSidebarMode: (mode: SimpleSidebarMode) => writeSidebarMode(mode),
    chatStreamUiEnabled,
    setChatStreamUiEnabled: (enabled: boolean) => writeSimpleChatStreamUiEnabled(enabled),
    approvalQueue,
    setApprovalQueue: (v: boolean) => {
      try {
        const stored = getSavedPrefs();
        stored.approvalQueue = v;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      } catch {
        // Storage not available
      }
    },
    isDark,
  };
}

export function simpleModelFromSocket(socketPath?: string): string | null {
  return "llama3.2";
}
