import { useState, useCallback, useRef, useEffect } from "react";
import { chatErrorSuggestsModelFix } from "../utils/chatErrorModelHint";
import type { ClawHelpSectionId } from "../components/claw/ClawHelpModal";

export function useModalState(sessionError: string | null) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [newPlanFileModalOpen, setNewPlanFileModalOpen] = useState(false);
  const [hostDoctorOpen, setHostDoctorOpen] = useState(false);
  const [indexingDocsOpen, setIndexingDocsOpen] = useState(false);
  const [honchoSettingsOpen, setHonchoSettingsOpen] = useState(false);
  const [agentPermissionsOpen, setAgentPermissionsOpen] = useState(false);
  const [launchConfigAddOpen, setLaunchConfigAddOpen] = useState(false);
  const [installDebuggersModalOpen, setInstallDebuggersModalOpen] = useState(false);
  const [mitLicenseModalOpen, setMitLicenseModalOpen] = useState(false);
  const [restartServerModalOpen, setRestartServerModalOpen] = useState(false);
  const [howToUseModalOpen, setHowToUseModalOpen] = useState(false);
  const [clawHelpOpen, setClawHelpOpen] = useState(false);
  const [clawHelpDefaultSection, setClawHelpDefaultSection] = useState<ClawHelpSectionId | null>(null);
  const [newWorkspaceFileDraft, setNewWorkspaceFileDraft] = useState<{
    defaultPath: string;
    initialContent?: string;
  } | null>(null);
  const [llmFixModalDismissed, setLlmFixModalDismissed] = useState(false);

  const prevChatErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sessionError) {
      prevChatErrorRef.current = null;
      setLlmFixModalDismissed(false);
      return;
    }
    if (prevChatErrorRef.current !== sessionError) {
      prevChatErrorRef.current = sessionError;
      setLlmFixModalDismissed(false);
    }
  }, [sessionError]);

  const showLlmFixModal =
    !!sessionError &&
    chatErrorSuggestsModelFix(sessionError) &&
    !llmFixModalDismissed;

  return {
    commandPaletteOpen, setCommandPaletteOpen,
    newPlanFileModalOpen, setNewPlanFileModalOpen,
    hostDoctorOpen, setHostDoctorOpen,
    indexingDocsOpen, setIndexingDocsOpen,
    honchoSettingsOpen, setHonchoSettingsOpen,
    agentPermissionsOpen, setAgentPermissionsOpen,
    launchConfigAddOpen, setLaunchConfigAddOpen,
    installDebuggersModalOpen, setInstallDebuggersModalOpen,
    mitLicenseModalOpen, setMitLicenseModalOpen,
    restartServerModalOpen, setRestartServerModalOpen,
    howToUseModalOpen, setHowToUseModalOpen,
    clawHelpOpen, setClawHelpOpen,
    clawHelpDefaultSection, setClawHelpDefaultSection,
    newWorkspaceFileDraft, setNewWorkspaceFileDraft,
    llmFixModalDismissed, setLlmFixModalDismissed,
    showLlmFixModal
  };
}
