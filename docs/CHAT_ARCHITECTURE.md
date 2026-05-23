# Way of Work: Chat Architecture & Agent Lifecycle

This document provides a comprehensive overview of how chat sessions are initialized, how agents load their personality/context, and how messages are processed by the Way of Work backend.

## 1. Session Initialization
Chat sessions are scoped to a specific UI **Surface** (e.g., `simple`, `claw`, `docs`, `kanban`).

1.  **Frontend Request:** When you open a page, `useWayOfWorkSession(surfaceId)` triggers a WebSocket connection to `/ws`. The `surfaceId` is passed as a query parameter (e.g., `/ws?surface=claw`).
2.  **Server Handshake:** `server/ws-handler.ts` receives the request.
    *   It identifies the `tenant_id` via authentication.
    *   It looks up the `agentName` based on the surface ID (e.g., `surface="simple"` → `agentName="orchestrator"`).
3.  **Context Loading:** The server calls `getAgentBodyByName` to fetch the agent's definition and `resolveAgentSkillsFromName` to load its operational capabilities. These are cached in the WebSocket data (`ws.data`).

## 2. Agent Identity and Memory (Where files come from)
Way of Work maintains a clear distinction between your project code and the agent's operating context.

*   **Host Workspace (`.claw/workspace/`):** This is the **authoritative source** for agent identity.
    *   `SOUL.md`: Defines the agent's personality, tone, and behavioral boundaries.
    *   `AGENTS.md`: Defines agent teams and dispatching hierarchies.
    *   `MEMORY.md`: Stores short-term, session-independent operator context.
    *   `TOOLS.md`: Logs tool usage and adaptations.
*   **Initialization:** When an agent turn starts, the orchestrator reads these files from the host repository path, *not* from your active project workspace. This ensures the agent behaves consistently regardless of which project you are currently working on.

## 3. The Message Lifecycle (The Tool Loop)
When you send a message in chat, the following background process occurs on the server:

1.  **The Orchestrator (`server/chat-orchestrator-tools.ts`):** All chat traffic is routed through the Orchestrator. It acts as the traffic controller.
2.  **Dispatching:** If your message requires specific skills (e.g., "Analyze the construction schedule"), the Orchestrator uses the `dispatch_agent` tool to route your message to the appropriate specialized agent (e.g., `schemaplanerare`).
3.  **Tool Execution Loop:**
    *   The agent generates a plan or a tool call (e.g., `read_file`, `bash`, `web_fetch`).
    *   The backend **Exec Tool Loop** pauses the agent, executes the requested tool in a secure, isolated sandbox, and captures the output.
    *   The output is fed back to the agent as a tool-result.
4.  **Streaming:** The final generated text (or tool status updates) is streamed back to your frontend via the WebSocket connection in real-time.

## 4. Background Persistence & Logging
The system ensures all interactions are audit-compliant and persistent.

*   **JSONL Session Logging:** Every chat turn, tool call, and tool result is appended to a JSONL log file (`server/wo-session-jsonl.ts`). These logs are saved per session (e.g., `wo-chat-<surface>-<sessionKey>.jsonl`), enabling history retrieval and audit tracking.
*   **Database:** High-level state changes (like scheduled task updates or project metadata changes) are committed immediately to the tenant-specific SQLite database.
*   **Asynchronous Tasks:** Background tasks (like weather alerts or cron-based dispatches) run in the server process independently. When they trigger, they initiate a "headless" turn, loading the agent context, executing the task, and notifying you via the `notifyUser` system.

## Summary Checklist
| Component | Responsibility |
| :--- | :--- |
| **`useWayOfWorkSession`** | Frontend hook; manages WebSocket state + UI surface identification. |
| **`ws-handler.ts`** | Backend socket manager; maps surface → agent; manages tenant state. |
| **`.claw/workspace/`** | Host-side identity files (SOUL.md, MEMORY.md, etc.). |
| **`chat-orchestrator-tools.ts`** | The "Brain"; routes requests and runs the Tool Execution Loop. |
| **`wo-session-jsonl.ts`** | Persistence layer; logs every chat turn and tool call for history. |
