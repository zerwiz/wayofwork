/**
 * WebSocket **`log`** row routing (Output vs Tool log) + static tool-trace catalog.
 *
 * **Agent log** (workspace tab) shows the **full** stream in order — union of Output-routed and Tool-log lines
 * for debugging orchestration + tools (e.g. chat turn then `git_push`) without switching tabs.
 *
 * **Pi-style names (interim Bun orchestrator):** Workspace listing is **`list_dir`**, not shell **`ls`**.
 * Headless **`pi --mode json`** emits **`source`** = each extension tool’s registered `name` (not enumerated here).
 *
 * When adding `broadcastToolLog(..., source, ...)`, extend **`OUTPUT_PANEL_SOURCES`** if the line is
 * session/workspace status (not a tool trace), or leave it uncategorized so it stays on **Tool log**.
 */

export type LogStreamRow = {
  source: string;
  msg: string;
};

/** `source` values shown in the **Output** panel (session / workspace / diagnostics / dispatch). */
export const OUTPUT_PANEL_SOURCES = [
  "wop-server",
  "chat",
  "session",
  "dispatch",
  "cd",
  "index",
  "analyze",
  "dispatch_agent",
] as const;

const OUTPUT_PANEL_SOURCE_SET = new Set<string>(OUTPUT_PANEL_SOURCES);

const READ_WORKSPACE_PREFIX = "workspace open_file";
const WRITE_WORKSPACE_PREFIX = "workspace save_code_workspace_file";

export function isOutputPanelLog(row: LogStreamRow): boolean {
  if (row.source === "read" && row.msg.startsWith(READ_WORKSPACE_PREFIX))
    return true;
  if (row.source === "write" && row.msg.startsWith(WRITE_WORKSPACE_PREFIX))
    return true;
  return OUTPUT_PANEL_SOURCE_SET.has(row.source);
}

export function isToolLogPanelLog(row: LogStreamRow): boolean {
  return !isOutputPanelLog(row);
}

/**
 * `executeOrchestratorTool` switch — single source of truth for allowed names + user-facing hints.
 * (Subset of Pi built-ins; see `ORCHESTRATOR_TOOLS_OPENAI` in `server/orchestrator-tools-exec.ts`.)
 */
export const ORCHESTRATOR_FUNCTION_TOOL_NAMES = [
  "read",
  "list_dir",
  "grep",
  "write",
  "bash",
  "team_list",
  "team_member_add",
  "team_member_remove",
  "team_member_replace",
  "git_status",
  "git_remote",
  "git_fetch",
  "git_pull",
  "git_push",
  "git_branches",
  "git_checkout",
  "git_merge",
  "git_add",
  "git_commit",
] as const;

/** `broadcastToolLog` sources from `server/teams-yaml-mutate.ts` (same strings as orchestrator team tools). */
export const TEAMS_YAML_BROADCAST_SOURCES = [
  "team_member_add",
  "team_member_remove",
  "team_member_replace",
] as const;

/** Fixed `source` strings from `/api/file`, Run script, and terminal WebSocket (overlaps orchestrator names). */
export const HOST_WORKSPACE_API_TOOL_SOURCES = [
  "read",
  "write",
  "bash",
  "mv",
  "mkdir",
] as const;

/** Sorted unique list of every **static** tool-trace `source` we ship (Pi JSON-mode adds more at runtime). */
export const KNOWN_STATIC_TOOL_TRACE_SOURCES: readonly string[] = Array.from(
  new Set<string>([
    ...ORCHESTRATOR_FUNCTION_TOOL_NAMES,
    ...HOST_WORKSPACE_API_TOOL_SOURCES,
    ...TEAMS_YAML_BROADCAST_SOURCES,
  ]),
).sort((a, b) => a.localeCompare(b));

export function formatUnknownOrchestratorToolMessage(toolName: string): string {
  const allowed = ORCHESTRATOR_FUNCTION_TOOL_NAMES.join(", ");
  return `Unknown tool "${toolName}". Allowed: ${allowed} (bash is omitted when WOP_ORCHESTRATOR_BASH=0/false/no/off; git_* requires WOP_ORCHESTRATOR_GIT_TOOLS).`;
}
