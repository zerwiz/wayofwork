# Way of Pi Server Scripts Documentation

This document provides a comprehensive overview of all server-side scripts in the `apps/wayofwork-ui/server` directory. These scripts form the backend API and runtime for the Way of Pi Technical IDE, handling chat orchestration, authentication, file system operations, LLM interactions, ngrok tunneling, and more.

---

## Core Infrastructure

### `index.ts`
**Main server entry point and API router.**

This is the primary server file that orchestrates all functionality. It:
- Initializes the Bun HTTP server on the configured port (default 3333 for the API, 3334 for the standalone IDE)
- Sets up WebSocket support for real-time streaming chat responses
- Routes all HTTP requests through the `handleApi()` function
- Manages authentication via JWT tokens or HTTP Basic Auth for public tunnels
- Serves static files from the Vite build output
- Initializes workspace state, agents catalog, and session prompts at boot
- Manages pending chat queues and chat usage metering
- Exposes API endpoints: `/api/manifest`, `/api/models`, `/api/tools`, `/api/agents`, `/api/tickets`, `/api/claw/*`
- Implements WebSocket handlers for chat streaming, terminal sessions, and file operations
- Handles workspace folder switching and multi-tenant support
- Provides health checks and status endpoints for diagnostics

### `db.ts`
**SQLite database initialization and schema management.**

Creates and initializes the `wayofpi.sqlite` database with the following tables:
- **tenants** — Multi-tenant workspace isolation (id, name, slug, created_at)
- **users** — User accounts with password hashing (username, role, tenant_id)
- **projects** — Development projects with status tracking
- **tasks** — Kanban task management (status: todo/inprogress/done, priority, deadline)
- **time_entries** — Time tracking for billable work (hours, project/task association)
- **tickets** — ÄTA ticket system (draft/review/approve/reject workflow)
- **time_blocks** — Check-in/check-out sessions with hourly rates
- **time_sessions** — Aggregated session data with location info
- **price_lists** — Itemized pricing for materials and services

Seeds a default admin account (admin/admin) on first run. Uses Bun's native SQLite for zero-config persistence.

### `paths.ts`
**Path resolution utilities.**

Provides utilities for:
- Resolving workspace root paths from `WOP_WORKSPACE` or `process.cwd()`
- Converting relative paths to absolute paths safely
- Validating paths stay within workspace roots (prevents path traversal)
- Detecting and skipping forbidden directory segments (`.git`, `node_modules`, `..`)
- Identifying editable file extensions for editor integration
- Providing constants like `MAX_FILE_BYTES` (2 MiB) for safe file operations

### `package-scripts.ts`
**Package script loader.**

Reads `package.json` scripts from the workspace root and exposes them through the API. This allows users to run npm/bun scripts (e.g., `build`, `lint`, `test`) directly from the chat or UI without needing to know the exact command syntax.

---

## Chat & LLM Orchestration

### `chat.ts`
**Core chat message processing and LLM streaming.**

Handles chat turn processing including:
- Converting chat messages to OpenAI Chat Completions format
- Streaming completions from Ollama (`/v1/chat/completions`) or OpenRouter (`/api/v1/chat/completions`)
- Parsing Server-Sent Events (SSE) streams from LLM providers
- Extracting reasoning/thinking text from model responses (OpenAI `reasoning`, `reasoning_content`)
- Streaming token usage tracking (`prompt_tokens`, `completion_tokens`)
- Handling abort signals for interrupting ongoing chats
- Formatting vendor-specific HTTP errors (Ollama, OpenRouter)
- Supporting tool calls in assistant messages (`tool_calls` array)

### `chat-usage.ts`
**Token usage metering and context window tracking.**

Parses LLM response streams to extract token usage data. Features include:
- Normalizing OpenAI-style `usage` objects (handles `prompt_tokens`, `completion_tokens`, `input_tokens`, `output_tokens`)
- Estimating context window size from model ID (heuristics: 128k for Ollama/gpt-4o, 200k for Claude 3.5, 8k for Llama 3.1/70b)
- Providing fallback token counts when providers omit stream usage
- Approximating usage from message content when exact counts unavailable (~4 characters per token)
- Returning `StreamTokenUsage` type with `promptTokens` and `completionTokens`

### `chat-context-budget.ts`
**Chat context budget enforcement.**

Monitors and enforces context window limits for chat sessions to prevent overflow errors. Features:
- Enforcing `WOP_CHAT_MAX_MESSAGES` (default 120) and `WOP_CHAT_MAX_INPUT_CHARS` (default 120,000)
- Dropping oldest full user/assistant turns while preserving system prompts and current turn
- Logging dropped messages and approximate character counts
- Providing disable option via `WOP_CHAT_CONTEXT_BUDGET=0` or `false`
- Aligning with Pi TUI behavior but without mid-turn cuts at user boundaries

### `chat-orchestrator-tools.ts`
**LLM tool call orchestration.**

Enables LLMs (especially o-series and gpt-4o) to call tools iteratively. Manages:
- Tool call definitions with `name`, `description`, `parameters` JSON Schema
- `tool_call_id` tracking for sequential tool execution
- Executing tools after each round of tool calls
- Handling tool outputs and injecting them into the conversation
- Providing nudges when models stop after prose without making tool calls
- Detecting tool execution errors and requiring user acknowledgment for critical failures
- Managing max tool loop steps (default 18) to prevent infinite loops

### `chat-slash-commands.ts`
**Slash command handlers for AI chat.**

Processes `/` slash commands in chat messages to trigger actions:
- `/help` — List available commands
- `/models` — List Ollama models (or note OpenRouter model)
- `/model <id>` — Set session model (validated against Ollama tags)
- `/plan` / `/build` — Switch session system prompt mode
- `/plan-interview` — Show structured headings for planning sessions
- `/agent` / `/system <name>` — List or activate workspace agents
- `/clear` — Clear the chat tab transcript
- `/reload` — Explain reload behavior (web chat doesn't hot-reload)

### `session-prompts.ts`
**Session-specific system prompt injection.**

Provides system prompts tailored to each chat session, including:
- Plan mode prompts when using `plans/PLAN-*.md`
- Build mode prompts using `WOP_SYSTEM_PROMPT` or `agent/*.md` files
- Headless Pi notes when not spawning the full TUI
- Named agent persona merging from agent metadata
- Git/GitHub integration notes when configured
- Orchestrator tool notes when enabled
- Web shell-specific instructions for chat-only mode

### `llm-models.ts`
**LLM model validation and discovery.**

Validates Ollama model IDs against available models from `/api/tags`. Provides:
- Fetching model tags from Ollama host
- Checking if requested models are available (exact match, `base:tag`, or stem match)
- Validating model ID format (alphanumeric, dots, slashes, hyphens, underscores)
- Supporting both Ollama and OpenRouter model ID validation

### `sdk-runtime.ts`
**Pi SDK runtime wrapper.**

Wraps the `@earendil-works/pi-coding-agent` SDK for headless API access. Instead of spawning `pi --mode json`, this module:
- Imports the SDK directly with typed events
- Creates reusable `AgentSession` instances via `createAgentSession()`
- Subscribes to events (`message_update`, `tool_execution_start/end`, `agent_end`)
- Sends user prompts via `session.prompt()`
- Dispatching callbacks matching subprocess behavior (`onDelta`, `onReasoningDelta`, `onLog`)
- Providing abort signal support for interruption

---

## Authentication & Security

### `auth.ts`
**JWT token creation and verification.**

Implements JWT-based authentication using:
- HS256 algorithm with secret from `WOP_AUTH_SECRET` environment variable
- 24-hour token expiration
- Payload containing `userId` and `tenantId`
- Secure token verification that returns null on failure
- Used for API access control and user identification

### `tunnel-gate.ts`
**Public tunnel (ngrok) authentication gate.**

Adds HTTP Basic Auth to public ngrok tunnels to protect remote access. Features include:
- SCrypt password hashing with random salt (32 bytes)
- Configuration file at `~/.wayofpi/tunnel-gate.v1.json`
- Detection of tunnel hostnames (contains "ngrok" or custom `WOP_TUNNEL_GATE_HOST_MARKERS`)
- Secure password verification using timing-safe comparison
- Per-request auth check for outgoing requests from the same process
- Dev status JSON endpoint for configuration state
- Save/clear actions via POST `/api/tunnel-gate`
- Unauthorized responses with proper `WWW-Authenticate` headers

---

## Database & Data Persistence

### `wayofpi.sqlite`
**SQLite database file.**

The primary data store for all persistent data:
- Tenant isolation for multi-user deployments
- User credentials with bcrypt password hashing
- Project/task tracking for Kanban boards
- Time entries for billing and productivity tracking
- ÄTA tickets with review/approve workflow
- Price lists for materials and services

Created and initialized by `db.ts` on first run.

---

## NGrok & Tunnel Management

### `ngrok-tunnel-manager.ts`
**NGrok tunnel process management.**

Manages the ngrok CLI process spawned by Way of Pi. Features:
- Detecting ngrok CLI on PATH or bundled npm package
- Spawning ngrok with `--web-addr` and `--url/--hostname` arguments
- Tracking tunnel status and polling for public URL via inspector
- Managing tunnel lifecycle: `startNgrokTunnelDev()`, `stopNgrokTunnelDev()`
- Checking TCP port availability with `probeTcpListening()`
- Handling tunnel configuration via authtoken management
- Detecting version and reporting in diagnostics

### `ngrok-binary.ts`
**NGrok executable resolution.**

Resolves the ngrok binary from:
1. `WOP_NGROK_BINARY` environment variable (file path)
2. System PATH (`/usr/local/bin/ngrok`, `/usr/bin/ngrok`)
3. Bundled package (`node_modules/ngrok/bin/ngrok`)

Returns the executable path and source for diagnostics.

### `ngrok-inspector.ts`
**NGrok web inspector client.**

Fetches public URL from ngrok inspector base URL. Uses:
- Default inspector URL: `http://127.0.0.1:4040`
- Override via `WOP_NGROK_WEB_ADDR` environment variable
- Polling `/api/tunnels` endpoint for tunnel availability
- Returning HTTPS URL when available, HTTP as fallback

### `tcp-probe.ts`
**TCP port availability checking.**

Checks if a TCP port is listening on `127.0.0.1`. Used to verify backend readiness (Vite dev server) before spawning ngrok. Returns a promise resolving to `true` if something is listening, `false` otherwise.

---

## Orchestrator & Tool Execution

### `orchestrator-tools-exec.ts`
**Orchestrator tool execution engine.**

Executes LLM tools called by the orchestrator:
- **read** — File read with optional line offset/limit
- **listdir** — Directory listing with filtering by max entries
- **write** — File write with overwrite control
- **grep** — File search with pattern matching (limited output)
- **bash** — Command execution with timeout (Bash timeout configurable)
- **git** — Git operations (clone, fetch, checkout, commit, push, pull, status)
- **teams** — Agent message passing via teams.yaml
- Input validation, output size limits, and error handling

### `orchestrator-git-tools.ts`
**Git operation wrappers for orchestrator.**

Provides Git tool definitions for LLM tool calling. Handles:
- Git clone with repo URL and branch options
- Git fetch/pull from remote branches
- Git checkout to specific branches or commits
- Git commit with message and file selection
- Git push to remote repositories
- Error handling for authentication, missing repos, etc.

### `orchestrator-dispatch-intent.ts`
**Intent-based orchestrator dispatch.**

Routes LLM intents to appropriate tools or handlers based on the orchestrator's tool calls. Analyzes user intent and tool availability to determine the best action.

### `teams-yaml-mutate.ts`
**Agent team YAML mutation utilities.**

Handles mutation and persistence of agent team configurations stored in `.pi/agents/teams.yaml`. Provides:
- `toolTeamList` — List all teams and roster members
- `toolTeamMemberAdd` — Add agent to team
- `toolTeamMemberRemove` — Remove agent from team
- `toolTeamMemberReplace` — Replace agent in team
- Broadcasting catalog changes for UI refresh

---

## File System & Workspace Operations

### `tree.ts`
**Workspace file tree builder.**

Recursively builds file tree for display in the UI. Features:
- Traversing workspace directories up to depth 20
- Labeling files/directories with Git status (`M`, `??`, `A`, `D`, etc.)
- Propagating Git status markers to parent directories
- Supporting multi-root workspaces with labeled folders
- Filtering forbidden segments (`.git`, `node_modules`, etc.)
- Returning tree structure suitable for UI display

### `git.ts`
**Git status and snapshot utilities.**

Provides Git operations:
- `gitStatusMap` — Returns map of relative paths to Git status
- `gitWorktreeSnapshot` — Detects Git repo, top-level, and current branch
- `gitStageAbsolutePath` — Stages a file/directory (`git add`)
- `gitStageAllFromAbsolutePath` — Stages all changes (`git add -A`)
- Handling multi-worktree repositories

### `workspace-state.ts`
**Workspace state management.**

Manages workspace folder state including:
- Listing workspace roots by tenant (single or multi-root)
- Opening folders via `openFolder()` API
- Adding/removing folders from workspace
- Switching workspace via `setWorkspaceFoldersAbs()`
- Loading folders from `.vscode/code-workspace.json`
- Saving workspace layout to file
- Validation to prevent path traversal

### `workspace-file-mime.ts`
**File MIME type detection.**

Determines MIME types for file downloads. Returns appropriate Content-Type headers for various file formats (text/plain, application/json, text/html, etc.).

### `native-file-dialog.ts`
**Native file picker integration.**

Provides dialogs for opening and saving files natively in the host OS:
- Linux: Uses `zenity` or `kdialog` for file/folder selection
- macOS: Uses `osascript` to invoke Finder dialogs
- Windows: Uses PowerShell with Windows Forms dialogs
- Returns file path, cancelled state, or error message

### `workspace-index.ts`
**Workspace index management.**

Maintains indexes of workspace files and metadata for quick lookups. Supports file presence checks and basic metadata queries.

### `workspace-problems.ts`
**Workspace diagnostic errors tracking.**

Tracks and reports problems/errors detected in the workspace:
- Running ESLint or `tsc --noEmit` for static analysis
- Parsing diagnostic output to extract file, line, column, message
- Limiting to 800 problems to prevent UI overload
- Showing errors/warnings/info with severity indicators
- Timeout after 120 seconds to prevent hangs

---

## UI & Interface Catalogs

### `ui-views-catalog.ts`
**Simple UI view definitions.**

Defines available UI views (tabs, files, technical activities) for the Simple UI. Supports:
- Default entries: Chat, Team, Models, Projects, Settings tabs
- Technical activities: Explorer, Extensions, Planning
- Custom user-defined views in `.wayofpi/ui-views.json`
- Validation against allowed tab types and targets
- Opening documentation and extension files

### `web-manifest.ts`
**Static web manifest generation.**

Collects static information about extensions and shims from the filesystem. Does not require Pi runtime. Returns manifest with:
- Settings extensions from `.pi/settings.json`
- Shim files from `.pi/extensions/*.ts`
- Tools and slash commands (empty until runtime introspection ships)
- Static source indicator (filesystem-only)

---

## Tickets API

### `tickets-api.ts`
**ÄTA ticket management API.**

Full CRUD for tickets and related resources:
- Create/edit/delete tickets (title, description, category, priority)
- Ticket status transitions: draft → in-progress → complete
- Review workflow: approve, reject (with reason), lock
- Invoice time entries to tickets
- Manage time blocks (check-in/check-out)
- Price lists and rate management
- Project-level ticket summaries
- Cost tracking (estimate, actual, spent)
- Materials and photo attachments

---

## Claw Automation

### `claw-scheduler.ts`
**Claw mission scheduler.**

Manages scheduled mission runs for Claw automation workflows. Features:
- Reading schedules from `.claw/schedule/claw-schedules.v1.json`
- Cron-based triggers (`0 9 * * *` for 9 AM daily) or one-time runs
- Executing missions via `executeClawAutomation()`
- Tracking last run time and result
- Timer ticks every 45 seconds to check for due missions

### `claw-schedules-store.ts`
**Claw schedule persistence.**

Persists and retrieves Claw schedule configurations:
- Definitions in `.claw/schedule/claw-schedules.v1.json`
- Run history in `.claw/schedule/claw-schedule-runs.v1.json`
- Merging definitions with run data for API responses
- Legacy file migration from workspace `.wayofpi/`
- Normalization of schedule objects

### `claw-telegram-status.ts`
**Claw Telegram integration status.**

Monitors and reports Telegram bot status for Claw messaging features. Checks connection health and reports to diagnostics.

### `claw-automation-status.ts`
**Claw automation health check.**

Provides endpoint for checking automation system status:
- Headless Pi availability for schedule/webhook turns
- Scheduler environment flag and running state
- Webhook secret configuration and inbound enablement
- Schedule definitions path and disk presence

### `claw-mission-events.ts`
**Claw mission event tracking.**

Tracks and logs events from running Claw missions:
- Append-only log of mission results (schedule/webhook)
- Maximum 80 events retained
- Migration from legacy `.wayofpi/` location
- Event kind: schedule or webhook
- Timestamp, success/failure, and error message

### `claw-webhook-store.ts`
**Claw webhook configuration.**

Manages webhook URLs and configurations for Claw integration points:
- Secret file at `.claw/.wayofpi/claw-webhook.v1.json`
- Secret rotation with secure random generation
- Bearer token verification with timing-safe comparison
- Inbound endpoint enable/disable via environment

### `claw-workspace-root.ts`
**Claw workspace root detection.**

Determines the root directory for Claw-hosted workspaces (`.claw/` directory). Supports:
- `WOP_CLAW_HOST_ROOT` environment override
- `WOP_PLAYGROUND_ROOT` for alternative layouts
- Legacy flat path fallback for `.claw/<agent>.md`
- Resolution of `.claw/…` paths under host checkout

---

## Utilities & Diagnostics

### `diagnostics.ts`
**System diagnostic reporting.**

Provides diagnostic information about the server environment:
- Node/Bun version and platform
- Memory usage and uptime
- Ollama models installed
- Pi binary and SDK availability
- Environment variable summary
- LLM provider configuration
- Terminal enablement
- OpenRouter API key presence
- Doctor checks with status (ok, warn, error)
- Upstream snapshot for playground detection

### `tcp-probe.ts`
**TCP port availability checking.**

(See NGrok & Tunnel Management section above.)

### `terminal-ws.ts`
**Terminal WebSocket handling.**

Manages terminal WebSocket connections for interactive shell sessions:
- Spawning PTY sessions via `Bun.spawn` with `terminal` option
- Fallback to piped `child_process` for Windows
- Sending input to shell via stdin
- Resizing terminal for PTY sessions
- Broadcasting output with ANSI escape handling
- Disposing sessions with graceful shutdown

### `share-url-hints.ts`
**URL sharing hint generation.**

Generates hints for sharing URLs when posting or collaborating. Provides context-aware suggestions for external sharing scenarios.

### `workspace-index.ts`
**Workspace index management.**

(See File System & Workspace Operations section above.)

### `workspace-state.ts`
**Workspace state management.**

(See File System & Workspace Operations section above.)

### `workspace-problems.ts`
**Workspace diagnostic errors tracking.**

(See File System & Workspace Operations section above.)

### `native-file-dialog.ts`
**Native file picker integration.**

(See File System & Workspace Operations section above.)

### `terminal-ws.ts`
**Terminal WebSocket handling.**

(See Utilities & Diagnostics section above.)

### `agent-runtime.ts`
**Wo agent runtime.**
Routes all chat turns through `@wayofmono/wo-agent` SDK. Manages the chat engine modes (`sdk`, `bundled`).

### `github-connection.ts`
**GitHub connection management.**
Manages workspace-local GitHub Personal Access Token (PAT) store securely within `.wayofpi/github-credentials.json`.

### `pi-ollama-env.ts`
**Ollama environment configuration.**
Provides dynamic configuration and variable resolution for Ollama integration.

### `plans-catalog.ts`
**Plans catalog management.**
Lists and manages plan documents (e.g., `plans/PLAN-*.md`) allowing selection for planning and execution.

### `wop-session-jsonl.ts`
**Way of Pi session logger.**
Logs web chat turns into Pi-shaped JSONL files under the workspace `agent/sessions/` directory.

### `tool-log-broadcast.ts`
**Tool log broadcasting.**
Fans out tool log events to all connected chat WebSockets so the UI can stream real-time tool execution logs.

---

## Main Entry Point

### `index.ts` (Main Entry Point)

The `index.ts` file is the single entry point that:
1. **Starts the Bun HTTP server** on configurable port (3333 or 3334)
2. **Sets up WebSocket handlers** for streaming chat responses
3. **Routes all API requests** through `handleApi()`
4. **Serves static files** from Vite build output
5. **Manages chat queues** for pending messages
6. **Handles authentication** for all protected routes
7. **Provides health checks** and status endpoints
8. **Supports multi-tenant workspaces** with isolation
9. **Integrates all subsystems**: chat, tools, ngrok, tickets, claw automation

---

## Summary

The server directory contains approximately **48 files** organized into functional groups:

- **Core infrastructure (1-3 files)** — index, db, paths, package-scripts
- **Chat and LLM orchestration (9 files)** — chat, chat-*, session-prompts, llm-models, pi-sdk-runtime
- **Authentication and security (2 files)** — auth, tunnel-gate
- **NGrok and tunnel management (5 files)** — ngrok-*, tcp-probe
- **Orchestrator and tool execution (5 files)** — orchestrator-*, tool-*, teams-yaml-mutate
- **File system and workspace (11 files)** — tree, git, workspace-*, native-file-dialog, mime
- **UI and interface catalogs (3 files)** — ui-views-catalog, web-manifest
- **Claw automation (8 files)** — claw-*
- **Utilities and diagnostics (4 files)** — diagnostics, terminal-ws, share-url-hints, tool-log-broadcast
- **Tickets API (1 file)** — tickets-api
- **Database file (1 file)** — wayofpi.sqlite

All scripts are written in TypeScript and optimized for Bun runtime. They leverage Bun's native SQLite support, native file system, and subprocess management for efficient operation.

---

## Related Documentation

- [Project Structure](../docs/STRUCTURE.md) — Overall Way of Pi layout
- [CHANGELOG](../CHANGELOG.md) — Recent updates and changes
- [AGENTS.md](../AGENTS.md) — Agent communication protocol

---

All scripts are written in TypeScript and optimized for Bun runtime. They leverage Bun's native SQLite support, native file system, and subprocess management for efficient operation.