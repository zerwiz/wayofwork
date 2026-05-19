import { CommandPalette, type CommandItem } from "./CommandPalette";
import { LlmFixModal } from "./LlmFixModal";
import { HostDoctorModal } from "./HostDoctorModal";
import { IndexingDocsModal } from "./IndexingDocsModal";
import { HonchoSettingsModal } from "./HonchoSettingsModal";
import { AgentPermissionsModal } from "./AgentPermissionsModal";
import { MitLicenseModal } from "./MitLicenseModal";
import { RestartServerModal } from "./RestartServerModal";
import { HowToUseModal } from "./HowToUseModal";
import { LaunchConfigAddModal } from "./LaunchConfigAddModal";
import { InstallDebuggersModal } from "./InstallDebuggersModal";
import { NewPlanFileModal } from "./NewPlanFileModal";
import { NewWorkspaceFileModal } from "./NewWorkspaceFileModal";
import { ClawHelpModal, type ClawHelpSectionId } from "./claw/ClawHelpModal";
import type { LaunchSnippetId } from "../utils/launchJsonMutate";

const WOP_PUBLIC_REPO_URL = "https://github.com/zerwiz/wayofpi";

interface ModalsRendererProps {
  commandPaletteOpen: boolean;
  onCloseCommandPalette: () => void;
  commandPaletteItems: CommandItem[];
  showLlmFixModal: boolean;
  onDismissLlmFixModal: () => void;
  onClearLlmError: () => void;
  llmErrorMessage: string;
  llmFixModalAppearanceDark: boolean;
  uiMode: string;
  onOpenSimpleAiBrains: () => void;
  onOpenProviderCatalog: () => void;
  hostDoctorOpen: boolean;
  onCloseHostDoctor: () => void;
  onWorkspaceFileSaved: () => void;
  indexingDocsOpen: boolean;
  onCloseIndexingDocs: () => void;
  honchoSettingsOpen: boolean;
  onCloseHonchoSettings: () => void;
  integrationDocUrl: string;
  agentPermissionsOpen: boolean;
  onCloseAgentPermissions: () => void;
  mitLicenseModalOpen: boolean;
  onDismissMitLicense: () => void;
  restartServerModalOpen: boolean;
  onCloseRestartServer: () => void;
  onReconnectServer: () => void;
  howToUseModalOpen: boolean;
  onDismissHowToUse: () => void;
  repoBlobBase: string;
  launchConfigAddOpen: boolean;
  onDismissLaunchConfigAdd: () => void;
  onPickLaunchConfig: (id: LaunchSnippetId) => void;
  installDebuggersModalOpen: boolean;
  onDismissInstallDebuggers: () => void;
  newPlanFileModalOpen: boolean;
  onDismissNewPlanFile: () => void;
  onCreateNewPlanFile: (title: string, slugSuggestion: string) => void;
  newWorkspaceFileDraft: { defaultPath: string; initialContent?: string } | null;
  onDismissNewWorkspaceFileModal: () => void;
  onCreateWorkspaceFile: (path: string, initialContent?: string) => void;
  clawHelpOpen: boolean;
  onDismissClawHelp: () => void;
  clawHelpDefaultSection: ClawHelpSectionId | null;
  clawConnected: boolean;
  clawStreaming: boolean;
  onGoToTelegramChannels: () => void;
  onFocusClawChatTab: () => void;
}

export function ModalsRenderer({
  commandPaletteOpen, onCloseCommandPalette, commandPaletteItems,
  showLlmFixModal, onDismissLlmFixModal, onClearLlmError, llmErrorMessage,
  llmFixModalAppearanceDark, uiMode, onOpenSimpleAiBrains, onOpenProviderCatalog,
  hostDoctorOpen, onCloseHostDoctor, onWorkspaceFileSaved,
  indexingDocsOpen, onCloseIndexingDocs,
  honchoSettingsOpen, onCloseHonchoSettings, integrationDocUrl,
  agentPermissionsOpen, onCloseAgentPermissions,
  mitLicenseModalOpen, onDismissMitLicense,
  restartServerModalOpen, onCloseRestartServer, onReconnectServer,
  howToUseModalOpen, onDismissHowToUse, repoBlobBase,
  launchConfigAddOpen, onDismissLaunchConfigAdd, onPickLaunchConfig,
  installDebuggersModalOpen, onDismissInstallDebuggers,
  newPlanFileModalOpen, onDismissNewPlanFile, onCreateNewPlanFile,
  newWorkspaceFileDraft, onDismissNewWorkspaceFileModal, onCreateWorkspaceFile,
  clawHelpOpen, onDismissClawHelp, clawHelpDefaultSection,
  clawConnected, clawStreaming, onGoToTelegramChannels, onFocusClawChatTab,
}: ModalsRendererProps) {
  return (
    <>
      <CommandPalette
        open={commandPaletteOpen}
        onClose={onCloseCommandPalette}
        items={commandPaletteItems}
      />
      <LlmFixModal
        open={showLlmFixModal}
        onClose={onDismissLlmFixModal}
        onClearError={onClearLlmError}
        errorMessage={llmErrorMessage}
        appearanceDark={llmFixModalAppearanceDark}
        uiMode={uiMode}
        onOpenSimpleAiBrains={onOpenSimpleAiBrains}
        onOpenProviderCatalog={onOpenProviderCatalog}
      />
      <HostDoctorModal
        open={hostDoctorOpen}
        onClose={onCloseHostDoctor}
        appearanceDark={llmFixModalAppearanceDark}
        onWorkspaceFileSaved={onWorkspaceFileSaved}
      />
      <IndexingDocsModal
        open={indexingDocsOpen}
        onClose={onCloseIndexingDocs}
        appearanceDark={llmFixModalAppearanceDark}
      />
      <HonchoSettingsModal
        open={honchoSettingsOpen}
        onClose={onCloseHonchoSettings}
        appearanceDark={llmFixModalAppearanceDark}
        integrationDocUrl={integrationDocUrl}
      />
      <AgentPermissionsModal
        open={agentPermissionsOpen}
        onClose={onCloseAgentPermissions}
        appearanceDark={llmFixModalAppearanceDark}
      />
      <MitLicenseModal
        open={mitLicenseModalOpen}
        onDismiss={onDismissMitLicense}
        repoLicenseUrl={`${WOP_PUBLIC_REPO_URL}/blob/main/LICENSE`}
      />
      <RestartServerModal
        open={restartServerModalOpen}
        onClose={onCloseRestartServer}
        appearanceDark={llmFixModalAppearanceDark}
        onReconnectIfStillUp={onReconnectServer}
      />
      <HowToUseModal
        open={howToUseModalOpen}
        onDismiss={onDismissHowToUse}
        repoBlobBase={repoBlobBase}
      />
      <LaunchConfigAddModal
        open={launchConfigAddOpen}
        onDismiss={onDismissLaunchConfigAdd}
        onPick={onPickLaunchConfig}
      />
      <InstallDebuggersModal
        open={installDebuggersModalOpen}
        onDismiss={onDismissInstallDebuggers}
      />
      <NewPlanFileModal
        open={newPlanFileModalOpen}
        onDismiss={onDismissNewPlanFile}
        onCreate={onCreateNewPlanFile}
      />
      <NewWorkspaceFileModal
        open={newWorkspaceFileDraft != null}
        defaultPath={newWorkspaceFileDraft?.defaultPath ?? ""}
        initialContent={newWorkspaceFileDraft?.initialContent}
        onDismiss={onDismissNewWorkspaceFileModal}
        onCreate={onCreateWorkspaceFile}
      />
      <ClawHelpModal
        open={clawHelpOpen}
        onDismiss={onDismissClawHelp}
        defaultSection={clawHelpDefaultSection}
        connected={clawConnected}
        streaming={clawStreaming}
        onGoToTelegramChannels={onGoToTelegramChannels}
        onFocusClawChatTab={onFocusClawChatTab}
      />
    </>
  );
}
