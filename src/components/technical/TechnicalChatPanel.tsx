import type { ChatSessionMode } from "../../hooks/useWayOfPiSession";
import type { AgentMeta, AgentTeamMap } from "../../hooks/useAgents";
import type { ChatPulseMeters, ChatRow, ChatTab } from "../../hooks/useWayOfPiSession";
// UiMode typed as string
import type { ChatDockRegion } from "../../utils/technicalLayoutStorage";
import { ChatPanel } from "../ChatPanel";

interface TechnicalChatPanelProps {
  uiMode: string;
  rows: ChatRow[];
  chatTabs: ChatTab[];
  activeChatTabId: string;
  onSelectChatTab: (id: string) => void;
  onCloseChatTab: (id: string) => void;
  streaming: boolean;
  connected: boolean;
  error: string | null;
  onSend: (text: string) => void;
  onStop: () => void;
  onClearError: () => void;
  reopenLlmFixModal: () => void;
  onNewSession?: () => void;
  chatMode?: ChatSessionMode;
  onChatModeChange?: (mode: ChatSessionMode) => void;
  agents?: AgentMeta[];
  agentsLoading?: boolean;
  agentTeams?: AgentTeamMap;
  onOpenAgentTeamInPane?: () => void;
  openTeamPulseSignal?: number;
  onEditTeam?: () => void;
  chatAgentName?: string | null;
  dispatchTurnAgent?: string | null;
  onChatAgentChange?: (name: string | null) => void;
  chatQueuePending?: number;
  chatQueueItems?: any[];
  editChatQueueItem?: (id: string, text: string) => void;
  deleteChatQueueItem?: (id: string) => void;
  forceChatQueueItem?: (id: string) => void;
  chatPulseMeters?: ChatPulseMeters | null;
  contextTitle?: string;
  sessionTokenSummary?: {
    tokensDown: string;
    tokensUp: string;
    tokensTitle?: string;
  };
  onOpenPlanFileForReview?: (path: string) => void;
  planHandoffWorkspaceKey?: string;
  technicalDock?: {
    region: ChatDockRegion;
    sizePx: number;
    onSetRegion: (r: ChatDockRegion) => void;
    onHidePanel: () => void;
  };
}

export function TechnicalChatPanel(props: TechnicalChatPanelProps) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border border-[#3c3c3c] bg-[#1e1e1e]">
      <ChatPanel
        uiMode={props.uiMode}
        rows={props.rows}
        chatTabs={props.chatTabs}
        activeChatTabId={props.activeChatTabId}
        onSelectChatTab={props.onSelectChatTab}
        onCloseChatTab={props.onCloseChatTab}
        streaming={props.streaming}
        connected={props.connected}
        error={props.error}
        onSend={props.onSend}
        onStop={props.onStop}
        onClearError={props.onClearError}
        onReopenLlmFixModal={props.reopenLlmFixModal}
        onNewSession={props.onNewSession}
        chatMode={props.chatMode}
        onChatModeChange={props.onChatModeChange}
        agents={props.agents}
        agentsLoading={props.agentsLoading}
        agentTeams={props.agentTeams}
        onOpenAgentTeamInPane={props.onOpenAgentTeamInPane}
        openTeamPulseSignal={props.openTeamPulseSignal}
        onEditTeam={props.onEditTeam}
        chatAgentName={props.chatAgentName}
        dispatchTurnAgent={props.dispatchTurnAgent}
        onChatAgentChange={props.onChatAgentChange}
        chatQueuePending={props.chatQueuePending}
        chatQueueItems={props.chatQueueItems}
        editChatQueueItem={props.editChatQueueItem}
        deleteChatQueueItem={props.deleteChatQueueItem}
        forceChatQueueItem={props.forceChatQueueItem}
        chatPulseMeters={props.chatPulseMeters}
        contextTitle={props.contextTitle}
        sessionTokenSummary={props.sessionTokenSummary}
        dockPanelFrame
        onOpenPlanFileForReview={props.onOpenPlanFileForReview}
        planHandoffWorkspaceKey={props.planHandoffWorkspaceKey}
        technicalDock={props.technicalDock}
      />
    </div>
  );
}
