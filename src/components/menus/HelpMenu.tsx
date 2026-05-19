import { useMemo } from "react";

// Simple stub to avoid TypeScript errors — will be fleshed out in Phase 7
interface HelpMenuHandlers {
  onShowAllCommands: () => void;
  onHowToUse: () => void;
  onOpenHostDoctor: () => void;
  onEditorPlayground: () => void;
  onAccessibilityFeatures: () => void;
  onGiveFeedback: () => void;
  onSupportUs: () => void;
  onViewLicense: () => void;
  canToggleDeveloperTools: boolean;
  onToggleDeveloperTools: () => void;
  canOpenProcessExplorer: boolean;
  onOpenProcessExplorer: () => void;
  canDownloadUpdate: boolean;
  onDownloadUpdate: () => void;
}

export default function HelpMenu() {
  const handlers = useMemo<HelpMenuHandlers>(() => ({
    onShowAllCommands: () => console.log("Show all commands"),
    onHowToUse: () => console.log("Show how-to-use guide"),
    onOpenHostDoctor: () => console.log("Open host doctor"),
    onEditorPlayground: () => console.log("Open editor playground"),
    onAccessibilityFeatures: () => console.log("Show accessibility features"),
    onGiveFeedback: () => console.log("Give feedback"),
    onSupportUs: () => console.log("Support us"),
    onViewLicense: () => console.log("View license"),
    canToggleDeveloperTools: false,
    onToggleDeveloperTools: () => console.log("Toggle developer tools"),
    canOpenProcessExplorer: false,
    onOpenProcessExplorer: () => console.log("Open process explorer"),
    canDownloadUpdate: true,
    onDownloadUpdate: () => console.log("Download update"),
  }), []);

  return <div className="help-menu" data-testid="help-menu" />;
}
