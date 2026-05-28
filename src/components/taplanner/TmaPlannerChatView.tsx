import { useWayOfWorkSession } from "../../hooks/useWayOfWorkSession";
import { SimpleChatView } from "../simple/SimpleChatView";
import { useSimplePreferences } from "../../hooks/useSimplePreferences";
import { useAgents } from "../../hooks/useAgents";
import { useState } from "react";

export function TmaPlannerChatView() {
    const { isDark } = useSimplePreferences();
    const session = useWayOfWorkSession("taplanner");
    const agentsApi = useAgents();
    const [chatStreamUiEnabled, setChatStreamUiEnabled] = useState(true);

    return (
        <SimpleChatView
            rows={session.rows}
            streaming={session.streaming}
            chatStreamUiEnabled={chatStreamUiEnabled}
            onChatStreamUiEnabledChange={setChatStreamUiEnabled}
            chatQueuePending={session.chatQueueItems.length}
            chatQueueItems={session.chatQueueItems}
            onChatQueueEdit={session.editChatQueueItem}
            onChatQueueDelete={session.deleteChatQueueItem}
            onChatQueueForce={session.forceChatQueueItem}
            connected={session.connected}
            error={session.error ? String(session.error) : null}
            modelLabel={session.model}
            onSend={(text) => session.sendChat(session.agentId || 'tma-planner', text)}
            onStop={session.stop}
            onClearError={session.clearError}
            appearanceDark={isDark}
            agents={agentsApi.data?.agents ?? []}
            agentTeams={agentsApi.data?.teams ?? {}}
            agentsLoading={agentsApi.loading}
            chatAgentName={session.chatAgentName}
            dispatchTurnAgent={null}
            onChatAgentChange={session.setChatAgent}
            chatMode={session.chatMode}
            onChatModeChange={session.setChatMode}
            contextFillPct={session.tokenMeter.contextPct ?? null}
            contextTitle={session.tokenMeter.contextTitle ?? ""}
            sessionLeadFallbackLabel="TA"
            hideHeader={true}
        />
    );
}
