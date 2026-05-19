import { DocumentHandlerProvider } from "../components/documenthandler/context/DocumentHandlerContext";
import { DocsApp } from "../components/docs/DocsApp";
import { useRefactor } from "../context/RefactorContext";

export function DocsPage() {
  const {
    uiMode,
    setUiMode,
    tree: { nodes, loading, error, refresh },
    selectedPath,
    setSelectedPath,
    session
  } = useRefactor();

  return (
    <DocumentHandlerProvider>
      <DocsApp
        uiMode={uiMode}
        setUiMode={setUiMode}
        nodes={nodes}
        treeLoading={loading}
        treeError={error}
        refreshTree={refresh}
        selectedPath={selectedPath}
        setSelectedPath={setSelectedPath}
        rows={session.rows}
        streaming={session.streaming}
        connected={session.connected}
        sendChat={(text) => void session.sendChat(session.chatAgentName ?? '', text, undefined, selectedPath)}
        stop={session.stop}
        error={session.error}
        modelLabel={session.model || ''}
        clearError={session.clearError}
        onReopenLlmFixModal={() => {}} 
        chatAgentName={session.chatAgentName}
        dispatchTurnAgent={session.dispatchTurnAgent as any}
        onChatAgentChange={session.setChatAgent}
        chatMode={session.chatMode}
        onChatModeChange={session.setChatMode}
        chatStreamUiEnabled={true} 
        onChatStreamUiEnabledChange={() => {}} 
        chatQueuePending={session.chatQueuePending ? 1 : 0}
        chatQueueItems={session.chatQueueItems}
        editChatQueueItem={session.editChatQueueItem}
        deleteChatQueueItem={session.deleteChatQueueItem}
        forceChatQueueItem={session.forceChatQueueItem}
        contextFillPct={session.chatPulseMeters.contextFillPct ?? null}
        contextTitle={session.tokenMeter.contextTitle ?? ''}
        />
    </DocumentHandlerProvider>
  );
}
