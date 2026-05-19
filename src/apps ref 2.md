import React from "react";
import { useUiMode } from "./hooks/useUiMode";
import { useWorkspaceTree } from "./hooks/useWorkspaceTree";
import { useMaxWidthMediaQuery } from "./hooks/useMaxWidthMediaQuery";
import { useShellMobile } from "./components/mobile/useShellMobile";
import { useAgents } from "./hooks/useAgents";
import { useSimplePreferences } from "./hooks/useSimplePreferences";
import { useWorkspaceStaticAnalysis } from "./hooks/useWorkspaceStaticAnalysis";
import { useServerConfig } from "./hooks/useServerConfig";
import { useWayOfPiSession } from "./hooks/useWayOfPiSession";
import { SimpleApp } from "./components/simple/SimpleApp";
import { ClawApp } from "./components/claw/ClawApp";
import { StatusBar } from "./components/StatusBar";
import { MenuBar } from "./components/MenuBar";
import { WorkspaceStaticAnalysisProvider } from "./context/WorkspaceStaticAnalysisContext";

export function App() {
  const { mode, setMode } = useUiMode();
  const { shellMobile } = useShellMobile();
  const isMobile = useMaxWidthMediaQuery(768);
  const { root, folders, loading } = useWorkspaceTree();
  const { data: agentsData } = useAgents();
  const { colorMode } = useSimplePreferences();
  const { data: config } = useServerConfig();
  const workspaceStaticAnalysis = useWorkspaceStaticAnalysis(true);

  const session = useWayOfPiSession(mode);
  const modelLabel = config?.chatEngine || "No server";

  return (
    <React.StrictMode>
      <WorkspaceStaticAnalysisProvider value={workspaceStaticAnalysis}>
        <div className="min-h-screen bg-[#1e1e1e] text-[#cccccc] flex flex-col">
          <MenuBar
            uiMode={mode}
            onUiModeChange={setMode}
            modelLabel={modelLabel}
            config={config}
          />

          <main className="flex-1 overflow-hidden">
            {mode === "simple" && (
              <SimpleApp
                uiMode={mode}
                setUiMode={setMode}
                root={root}
                rootLabel={folders[0]?.name || "Workspace"}
                nodes={[]}
                treeLoading={loading}
                treeError={null}
                refreshTree={() => {}}
                refreshTreeQuiet={() => {}}
                modelLabel={modelLabel}
                config={config}
                effectiveModel={null}
                onSelectLlmModel={() => {}}
                selectedPath={null}
                setSelectedPath={() => {}}
                content=""
                setContent={() => {}}
                persistEncoding="utf8"
                fileMimeType={null}
                fileLoading={false}
                fileError={null}
                dirty={false}
                save={() => Promise.resolve(true)}
                discardUnsavedChanges={() => {}}
                line={1}
                col={1}
                onCursor={() => {}}
                rows={session.rows}
                logs={session.logs}
                streaming={session.streaming}
                chatStreamUiEnabled={true}
                onChatStreamUiEnabledChange={() => {}}
                chatQueuePending={0}
                chatQueueItems={session.chatQueueItems}
                editChatQueueItem={() => {}}
                deleteChatQueueItem={() => {}}
                forceChatQueueItem={() => {}}
                connected={session.connected}
                error={session.error}
                sendChat={() => Promise.resolve()}
                stop={() => {}}
                clearError={() => {}}
                onReopenLlmFixModal={() => {}}
                chatAgentName={session.chatAgentName}
                dispatchTurnAgent={() => {}}
                onChatAgentChange={() => {}}
                chatMode={session.chatMode}
                onChatModeChange={() => {}}
                activeTab={0}
                onTabChange={() => {}}
                providerConfigInitialPath={null}
                providerConfigInitialNonce={0}
                onConsumeProviderConfigFocus={() => {}}
                workspaceEditorRef={{ current: null }}
                onUndoRedoStackChange={() => {}}
                onSelectionPrefsChange={() => {}}
                onFindInFiles={() => {}}
                onReplaceInFiles={() => {}}
                teamsYamlWritePath={null}
                workspaceReady={!!root}
                onOpenTeamsYaml={() => {}}
                onCreateAgentDefinition={() => {}}
                onOpenFolder={() => {}}
                onOpenRecentFolder={() => {}}
                recentFolders={folders}
                onHelp={() => {}}
                onConfigRefresh={() => {}}
                onNewPlanFile={() => {}}
                newPlanFileDisabled={false}
                onOpenIndexingDocs={() => {}}
                contextPct={session.tokenMeter.contextPct ?? ""}
                contextFillPct={session.tokenMeter.contextFillPct}
                tokensDown={session.tokenMeter.tokensDown ?? ""}
                tokensUp={session.tokenMeter.tokensUp ?? ""}
                contextTitle={session.tokenMeter.contextTitle ?? ""}
                tokensTitle={session.tokenMeter.tokensTitle ?? ""}
                onMoveFileToDirectory={() => Promise.resolve()}
                layoutVariant="desktop"
              />
            )}

            {mode === "claw" && (
              <ClawApp
                uiMode={mode}
                setUiMode={setMode}
                root={root}
                rootLabel={folders[0]?.name || "Workspace"}
                nodes={[]}
                treeLoading={loading}
                treeError={null}
                refreshTree={() => {}}
                refreshTreeQuiet={() => {}}
                modelLabel={modelLabel}
                config={config}
                effectiveModel={null}
                onSelectLlmModel={() => {}}
                selectedPath={null}
                setSelectedPath={() => {}}
                content=""
                setContent={() => {}}
                persistEncoding="utf8"
                fileMimeType={null}
                fileLoading={false}
                fileError={null}
                dirty={false}
                save={() => Promise.resolve(true)}
                discardUnsavedChanges={() => {}}
                line={1}
                col={1}
                onCursor={() => {}}
                rows={session.rows}
                logs={session.logs}
                chatTabs={session.chatTabs}
                activeChatTabId={session.activeChatTabId}
                onSelectChatTab={() => {}}
                onCloseChatTab={() => {}}
                onRenameChatTab={() => {}}
                onNewSession={() => {}}
                streaming={session.streaming}
                chatStreamUiEnabled={true}
                onChatStreamUiEnabledChange={() => {}}
                chatQueuePending={0}
                chatQueueItems={session.chatQueueItems}
                editChatQueueItem={() => {}}
                deleteChatQueueItem={() => {}}
                forceChatQueueItem={() => {}}
                connected={session.connected}
                error={session.error}
                sendChat={() => Promise.resolve()}
                stop={() => {}}
                clearError={() => {}}
                onReopenLlmFixModal={() => {}}
                chatAgentName={session.chatAgentName}
                dispatchTurnAgent={() => {}}
                onChatAgentChange={() => {}}
                chatMode={session.chatMode}
                onChatModeChange={() => {}}
                chatSessionControls={undefined}
                workspaceReady={!!root}
                onOpenTeamsYaml={() => {}}
                onCreateAgentDefinition={() => {}}
                onOpenFolder={() => {}}
                onOpenRecentFolder={() => {}}
                recentFolders={folders}
                onHelp={() => {}}
                onConfigRefresh={() => {}}
                onNewPlanFile={() => {}}
                newPlanFileDisabled={false}
                onOpenHostDoctor={() => {}}
                contextPct={session.tokenMeter.contextPct ?? ""}
                contextFillPct={session.tokenMeter.contextFillPct}
                tokensDown={session.tokenMeter.tokensDown ?? ""}
                tokensUp={session.tokenMeter.tokensUp ?? ""}
                contextTitle={session.tokenMeter.contextTitle ?? ""}
                tokensTitle={session.tokenMeter.tokensTitle ?? ""}
                onMoveFileToDirectory={() => Promise.resolve()}
                layoutVariant="desktop"
              />
            )}

            {mode === "technical" && (
              <div className="flex-1 p-4 text-gray-300">
                <h1 className="text-xl font-bold">Technical Mode</h1>
                <p>Workspace: {root || "No workspace"}</p>
              </div>
            )}

            {mode === "documenthandler" && (
              <div className="flex-1 p-4 text-gray-300">
                <h1 className="text-xl font-bold">Document Handler</h1>
                <p>Workspace: {root || "No workspace"}</p>
              </div>
            )}
          </main>

          <StatusBar
            uiMode={mode}
            workspaceRoot={root || "No workspace"}
            connected={session.connected}
            line={1}
            col={1}
            language=""
            contextPct={session.tokenMeter.contextPct ?? ""}
            tokensDown={session.tokenMeter.tokensDown ?? ""}
            tokensUp={session.tokenMeter.tokensUp ?? ""}
            contextTitle={session.tokenMeter.contextTitle ?? ""}
            tokensTitle={session.tokenMeter.tokensTitle ?? ""}
            onCopyWorkspacePath={() => {}}
            chatMode={session.chatMode}
            chatAgentName={session.chatAgentName}
          />
        </div>
      </WorkspaceStaticAnalysisProvider>
    </React.StrictMode>
  );
}

export default App;