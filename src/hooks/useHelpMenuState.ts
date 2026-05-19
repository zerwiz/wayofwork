export interface HelpMenuHandlers {
  onOpenHelp: () => void;
  onOpenDocumentation: () => void;
  onReportIssue: () => void;
  onAbout: () => void;
}

export function useHelpMenuState() {
  return {
    showHelp: false,
    setShowHelp: (_v: boolean) => {},
  };
}
