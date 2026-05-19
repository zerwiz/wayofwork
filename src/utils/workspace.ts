export function getWorkspaceLabel(path: string): string {
  return path.split("/").pop() || path;
}

export function readAutoSaveInitial(): boolean {
  return true;
}

export function readRecentWorkspaceFolders(): string[] {
  try {
    const stored = localStorage.getItem("wop-recent-workspace-folders");
    if (stored) {
      return JSON.parse(stored) as string[];
    }
  } catch {
    // Storage not available
  }
  return [];
}
