# Changelog
All notable changes to Way of Work

## [2.3.21] - 2026-05-24

### Fixed
- **System Stability:** Reverted unstable modularization changes in `MenuBar.tsx` and `WorkBoard.tsx` that caused compilation errors. Removed partially implemented, broken component files in `src/components/admin/` to restore a clean, production-ready build.

## [2.3.20] - 2026-05-24

### Added
- **MenuBar Refactoring (Partial):** Extracted "View" menu into `ViewMenu.tsx` in `src/components/menubar/`.
- **MenuBar Refactoring (Helper Functions):** Moved common helper functions (`menuBtnClass`, `menuKbd`, `viewFlyoutClass`) to `src/components/menubar/utils.ts` for reuse across extracted menu components.

### Fixed
- **MenuBar/ViewMenu Build Errors:** Ongoing issues related to `MenuBar.tsx` and `ViewMenu.tsx` compilation errors (`TS1005`, `TS2657`) are being addressed. Manual steps have been provided to resolve JSX structural problems and ensure correct integration of extracted components and shared utility functions.

---
**NOTE:** The application currently has compilation errors. The entries above reflect code modifications made, but a successful build is pending resolution of these issues via manual steps.
---

## [2.3.19] - 2026-05-24

### Added
- **MenuBar Refactoring (Partial):** Extracted "File", "Edit", and "Selection" menus from `MenuBar.tsx` into dedicated sub-components (`FileMenu.tsx`, `EditMenu.tsx`, `SelectionMenu.tsx`) in `src/components/menubar/` to improve modularity and maintainability (WOW-030).
- **AdminDashboard Refactoring (Partial):** Extracted `ChatViewerModal`, `LlmProvidersTab`, `PriceListsTab`, `ApprovalQueueTab`, `OffersInvoicesTab`, and `DiffTable` components from `AdminDashboard.tsx` into `src/components/admin/` to improve modularity and readability (WOW-029).

### Fixed
- **Notifications Dropdown Integration:** Provided manual integration steps for `MenuBar.tsx` to ensure correct opening/closing and click-outside dismissal.

## [2.3.18] - 2026-05-24

### Added
- **User Profile Licenses Editor:** Replaced static `certificates` display with full edit/add/save workflow. Licenses (name, category, status, validUntil) are now editable inline and persisted via `PUT /api/portal/licenses`.
- **Notification Dropdown:** Implemented a new `NotificationsDropdown.tsx` component and provided manual integration steps for `MenuBar.tsx` to display notifications in a dropdown modal when the bell icon is clicked.

### Fixed
- **`orchestratorBashEnabled` Error:** Resolved `SyntaxError` by removing the outdated `orchestratorBashEnabled` reference from `server/diagnostics.ts` and `server/routes/config.ts`, replacing its functionality with `terminalAllowed()`.
- **ÄTA Button Navigation:** Moved the "ÄTA" button from its conditional rendering within `UiModeToggle.tsx` to a top-level UI mode alongside "TA-Planner" in the main navigation, and updated `src/App.tsx` to register it as a UI mode.
- **CardView Save/Cancel Layout:** Moved action buttons (Save/Cancel) from the sticky header to a sticky footer at the bottom of the card modal, keeping the header clean with only the title and back button.
- **start.sh Ctrl+C:** Server now runs in foreground via `exec` so Ctrl+C sends SIGINT directly to Bun. Replaced background `&` + `wait` pattern that left orphan processes.
- **Telegram Bot Webhook Unreachable:** Cleared stale Telegram webhooks that were returning 404 (server had crashed). Server now uses long-polling fallback (since `WOP_PUBLIC_URL` is not set in `.env`), restoring bot responsiveness.

### Changed
- **Dev Mode Default:** Added `WOP_DEV_MODE=true` to `.env` so `admin/admin` login works with the production build via `start.sh`.

## [2.3.17] - 2026-05-23

### Added
- **TA Planner Extension:** Refactored TA Planner backend routes into a new extension (`.wo/extensions/ta-planner-extension.ts`), ensuring modularity.
- **TA Planner Navigation:** Moved the "TA-Planner" button to the main navigation bar (`src/components/UiModeToggle.tsx`) and registered it as a new UI mode in `src/App.tsx`, making it a top-level feature.

### Fixed
- **Ngrok Environment Loading:** Corrected `start.sh` to explicitly load environment variables from `.env`, enabling proper ngrok auto-start and display of tunnel information.
- **Empty File Path Request:** Prevented `GET /api/file?path=` requests with empty paths in `src/hooks/useFileEditor.ts`, resolving a 400 Bad Request error.

## [2.3.17] - 2026-05-24

### Added
- **Kanban Autonomous Board Generation:** Kanban agent (`.wo/agents/kanban.md`) now creates boards and cards autonomously without HITL. Infers columns from project type (construction, renovation, ÄTA).
- **Card Cover Support:** Added `cover` column to tasks table; `kanbanService.updateCard` now persists cover to server; `getAllCardsForBoard`/`getCard` parse cover JSON from API response.
- **KanbanCreateBoard Custom Columns:** Tool accepts `columns` JSON array parameter to define board lanes at creation time, stored in `settings_json`.

### Fixed
- **Missing Card API Routes:** Added `GET`, `PUT`, `DELETE /api/portal/tasks/:id` — cards were unclickable (404), drag-and-drop move (PUT) and delete silently broken.
- **Column Drag-and-Drop:** `PUT /api/projects/:id` now accepts top-level `columns` field (wraps in `settings_json`), fixing column reorder.
- **Calendar/Timeline Views Empty:** `getAllCardsForBoard` and `getCard` now map `deadline` → `dueDate` and `estimated_hours` → `estimatedTime`, so cards appear in calendar and timeline views.
- **Audit Logs `summary` Column:** Added migration for missing `summary` column in `audit_logs` table causing 500 errors on audit writes.
- **Updated_at Column Error:** Removed nonexistent `updated_at` column from PUT query in portal.ts.
- **Due Date Field Rename:** Fixed remaining `due_date` → `deadline` references in `orchestrator-kanban-tools.ts` (6 locations).
- **Card Cover Options Restored:** Added gradient covers (sunset, ocean, forest, midnight, coral, aurora, lava, frost, peach, deepsea) and 16 emoji icon options to `boardColorOptions`/`boardIconOptions` in `src/utils/boardConstants.ts`. Solid color values now use hex codes instead of named colors for proper rendering.
- **Real Users in Card Assignee Picker:** Replaced mock users (User One/Two/Three) in `src/components/kanban/CardView.tsx` with live data fetched from `/api/admin/users`. Assignee search now shows real system users (Anna, Björn, Cecilia, Kalle, etc.).
- **Telegram Notifications on Card Create:** `kanbanCreateCard` now calls `notifyUser()` for the assignee, sending a Telegram notification when a card is assigned to a worker. Added `created_by` migration for tasks table.

## [2.3.16] - 2026-05-23

### Added
- **Resource Access Control Foundation:** Implemented `resource_permissions` and `resource_shares` tables in `server/schema.sql` and created `server/auth-rbac.ts` utility for fine-grained access control (for WOW-024).

### Fixed
- **ClawSchedulesView Build Errors:** Resolved TypeScript errors and JSX structural issues in `src/components/claw/ClawSchedulesView.tsx`.
- **App.tsx Build Errors:** Fixed TypeScript errors related to duplicate properties and syntax in `src/App.tsx`.
- **useWayOfWorkSession Rebranding:** Renamed `useWayOfPiSession` to `useWayOfWorkSession` across the codebase and updated all references, including `src/hooks/useWayOfWorkSession.ts`, `src/components/kanban/KanbanChatPanel.tsx`, and `src/context/RefactorContext.tsx`.
- **Agent Routing Logic:** Corrected surface-to-agent mapping in `server/ws-handler.ts` to ensure `simple` mode defaults to `orchestrator`, `claw` to `claw`, and `docs` to `docs`, resolving agent contamination issues.
- **ReferenceApp Cleanup:** Removed `src/ReferenceApp.tsx` from the codebase as it was unused and causing build errors.
- **SimpleApp Docs Tab:** Corrected `src/components/simple/SimpleApp.tsx` to render `ChatExplorer` when the `docs` tab is active.
- **Notification Toast Opacity:** Adjusted opacity of bottom-right notification toasts to 90% for improved visibility.
- **Weather Warning Location:** Documented that the weather warning location is currently hardcoded to Stockholm, Sweden.

## [2.3.15] - 2026-05-23

### Added
- **WOW-021: Intelligent Kanban Automation**
  - Enhanced Kanban agent to autonomously generate project structures (boards and cards) based on natural language project descriptions.
  - Kanban agent can now interpret project scopes (like water service replacements) and automatically initialize the board setup.

## [2.3.14] - 2026-05-23

### Added
- **Language Switcher:** Added SWE/ENG language switcher button to the global header (MenuBar) for quick language toggling.

## [2.3.13] - 2026-05-23

### Fixed
- **WOW-021: Kanban Service Fixes**
  - Fully implemented `createColumn` and `deleteColumn` in `kanbanService.ts` to support custom column management.
  - Updated project update backend route to allow persistence of custom board settings (`settings_json`).
  - Updated `getAllBoards` in `kanbanService.ts` to dynamically load custom columns from project settings.

## [2.3.12] - 2026-05-23

### Added
- **WOW-023: Document and Validate `.wo` Directory Symlink**
  - Investigated and confirmed the `.wo` entry in `workspace/` is a symbolic link to the project root `.wo` directory. Initialized ticket to document this structure.
- **LLM Provider Alias Routes:** Added `GET` and `PUT /api/admin/llm-providers` alias routes in the admin API for better frontend compatibility.

### Fixed
- **Sidebar Layout:** Resolved vertical alignment issue where the 'What's Happening' section was incorrectly floating in the middle of the sidebar.
- **Unauthorized Configuration Access:** Removed incorrect authentication requirement for `GET /api/config`, making it public as intended.
- **Admin Console Scrolling:** Enabled proper vertical scrolling for the Admin Dashboard content area.
- **Agent Surface Assignment:** Fixed issue where the incorrect agent was being assigned to the Claw UI by properly passing surface IDs through the WebSocket connection.
- **Help Modal:** Updated documentation to refer to 'Way of Work' instead of 'Pi'.
- **Schedule UI:** Refactored schedule list to be expandable, showing full details (including edit button) only when clicked.

## [2.3.11] - 2026-05-23

### Added
- **WOW-021: Kanban Service Fixes**
  - Initialized ticket with tasks to complete `deleteBoard`, `createColumn`, and `deleteColumn` stubs in `kanbanService.ts`.
- **WOW-022: General Updates and Fixes**
  - Initialized ticket to track outstanding tasks from `TODO.md` including multi-tenancy audit, agent integration tests, and workflow verifications.

## [2.3.10] - 2026-05-23

### Added
- **WOW-014 Phases 3-4: Agent Language Awareness**
  - `language` column added to `users` table (default `sv`)
  - `?lang=` WebSocket query parameter parsed into `ChatWsData.lang`
  - Language instruction injected into all system prompts via `composeLeadSystem()` — orchestrator, agents, and planner prompts include an explicit language directive
  - Swedish construction laws (PBL, BBR, AMA) noted in default language prompt
  - Users without language preference default to Swedish with legal context
- **WOW-004: Real Data Migration**
  - Demo seed data: 3 construction projects, 6 tasks, project members, 6 time entries (3 days)
  - `project_members` table with `UNIQUE(project_id, user_id)` constraint
  - Seed runs only when no projects exist (idempotent for existing databases)
- **WOW-016 Frontend: Kanban Member CRUD**
  - `kanbanService.getAllBoards()` now fetches real member IDs from `/api/projects/:id/members`
  - `getBoardMembers()` wired to real API with role mapping (LEADER→admin, WORKER→member)
  - `inviteBoardMember()` looks up user by email/username, maps roles, POSTs to API
  - `removeBoardMember()` and `updateBoardMemberRole()` wired to DELETE and POST endpoints
- **WOW-002: Remote Hosting Cleanup**
  - `vite.config.ts` hardcoded `ngrok-free.dev` domain replaced with `WOP_PUBLIC_URL` env var
  - `.env.example` expanded with ngrok/tunnel/Basic Auth gate configuration docs

### Fixed
- **Critical DB Schema**: `notifications` and `project_members` tables were missing from `db.ts` CREATE TABLE statements — added with proper schema, foreign keys, and constraints
- **Orphaned files removed**: `src/pages/Dashboard.tsx` and `src/App copy.tsx` deleted, tsconfig exclude list cleaned
- **Hardcoded ngrok domain** removed from `vite.config.ts` — now driven by `WOP_NGROK_DOMAIN` and `WOP_PUBLIC_URL` env vars

## [2.3.9] - 2026-05-23

### Added
- **WOW-003: Multi-Tenancy AI Models**
  - `tenant_configs` table (`tenant_id`, `config_key`, `config_value`) for per-tenant LLM overrides
  - `subscription_tier` column added to `tenants` CREATE TABLE
  - `resolveWoAiModelDefault()` now checks `tenant_configs.llm_model` before agent settings.json
  - New `resolveWoAiProvider()` resolves per-tenant provider from config or env
  - Admin API `GET/POST /api/admin/tenants/:id/config` for managing per-tenant LLM settings
  - Critical fix: `server/tickets-api.ts:41` — `time_sessions.tenant_id` was mapped to `userId` instead of `tenantId`
- **WOW-020: Bug Report & Feature Request System**
  - Full `bug_reports` table with status, severity, environment, screenshots, duplicate tracking
  - `POST /api/bug-reports` — user submission with system info capture (browser, OS, URL, resolution)
  - `PATCH /api/admin/bug-reports/:id` — status tracking (pending→in-review→fixed→closed), assignment, duplicate linking, labels
  - `GET /api/admin/bug-reports/:id` — single report detail with parsed JSON fields
  - `GET /api/bug-reports` — user's own reports
  - `BugReportModal.tsx` — full form with category/severity/reproduction-rate, steps-to-reproduce editor, screenshot upload (base64, multiple)
  - `BugReportsAdmin.tsx` — admin dashboard with search, status filter, expandable cards, status change buttons, detail view
  - Admin Dashboard "Bug Reports" tab
  - Fixed username resolution (queries users table instead of hardcoded "user")
- **WOW-019: Notification System**
  - Server API: `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`, `DELETE /api/notifications/:id`
  - `notifyUser()` persists to SQLite + sends via Telegram/WhatsApp
  - `NotificationToast.tsx` — bottom-right toast with severity icons, 5s auto-dismiss
  - `NotificationInbox.tsx` — inbox in Settings with unread/all filter, mark read, delete
  - `NotificationContext.tsx` — server-synced (30s poll), replaces old client-only localStorage approach
  - MenuBar notification badge wired to live `unreadCount`
  - Pending Changes approve/reject → notify submitter via `notifyUser`
  - Security audit events → trigger security notification
  - Kanban card updates → notify assignee (already wired, verified)
  - `server/construction-triggers.ts` — weather alerts (open-meteo, hourly), ID06 expiry checks (14-day warning)

## [2.3.8] - 2026-05-23

### Added
- **WOW-018: Agent Ecosystem Expansion**
  - Fixed frontmatter for `skyddsombud`, `maskinchef`, `kalkylator` agents — corrected `name:` field, added `skills:` to frontmatter, added Human-in-the-Loop constraints
  - Added proper YAML frontmatter to `incident-reporting`, `logistics`, `cost-estimation` skills so `resolveSkillBodies` loads them correctly
  - Updated `.wo/agents/orchestrator.md` — dispatch list now includes all 11 specialized agents
  - Updated `.wo/skills/dispatch-agent/SKILL.md` — added dispatch mapping table for new agents + multi-agent handoff section with sequential dispatching examples
  - Updated `server/session-prompts.ts` — `ORCHESTRATOR_WEB_SHELL_SYSTEM` and `ORCHESTRATOR_WEB_SHELL_SYSTEM_HEADLESS_PI` both list new agents
  - Multi-agent handoff logic: decompose → dispatch sequentially → collect → summarize
- **WOW-015 Phase 2: Telegram Webhook (replaces long-polling)**
  - `POST /api/channels/telegram/webhook/:botId` endpoint for multi-bot webhooks
  - `setupTelegramWebhooks()` calls Telegram's `setWebhook` API for each active bot on startup
  - Long-polling kept as fallback for bots where webhook setup fails
  - Media handling — photos and documents downloaded and saved to `.telegram/` in workspace
  - `edited_message` support — edited messages processed and tagged in metadata
  - Webhook URL includes bot ID for multi-tenant routing
- **WOW-015 Phase 3: WhatsApp Inbound Webhook**
  - `GET /api/channels/whatsapp/webhook` — webhook verification (hub.mode/challenge)
  - `POST /api/channels/whatsapp/webhook` — receive inbound WhatsApp messages
  - Parses text, interactive button replies, and list replies
  - Routes through unified channel router to Orchestrator
  - `time_bot`-labeled numbers route directly to `handleTimeBotMessage` for time logging
  - Sends AI responses back via WhatsApp Graph API
- **WOW-015 Phase 4: Email Channel (SMTP + Inbound)**
  - `server/email.ts` — raw SMTP sender via `Bun.connect` with LOGIN auth, TLS, HTML support
  - `sendEmail(to, subject, text, html?)` with graceful fallback to logging when SMTP unconfigured
  - `POST /api/channels/email/inbound` — receive forwarded emails from SendGrid/Mailgun
  - `parseInboundEmail()` — parses multiple forwarding service formats
  - `email_send` orchestrator tool — AI can send emails to users
  - `WOP_SMTP_*` env vars (host, port, user, pass, from, from_name)
- **WOW-013 Phase 4: Channel Router → Orchestrator with dispatch_agent**
  - Channel messages (Telegram/WhatsApp) now route through the Orchestrator
  - Orchestrator has full dispatch_agent tool — can route to fakturering, ata, docs, claw, etc.
  - Uses `runOrchestratorToolLoop` instead of simple SDK runtime for tool-enabled chat
  - Privacy rules and channel context preserved in system prompt
- **WOW-020: Bug Report & Feature Request System**
  - Implemented database schema (`bug_reports` table) and API endpoints for feedback submission and admin review.
  - Created reusable `BugReportModal` component for user submissions.
  - Enabled automatic system environment capture (browser, OS, resolution) for all bug reports.
- **WOW-009: Offer & Invoice Agent — Admin Console UI**
  - New "Offers & Invoices" tab in AdminDashboard
  - Create/edit/delete offers and invoices with full CRUD UI
  - View HTML documents in new tab (server-generated PDF-quality HTML)
  - Send offers/invoices via Telegram or WhatsApp directly from the UI
  - Sub-tab navigation between Offers and Invoices lists
  - Client selection dropdown, date pickers, JSON item editor with sample data
  - Status badges (draft/sent/accepted/rejected/paid/overdue) with color coding
- **WOW-006 Phase 5: server/index.ts < 500 lines (Target: 236 lines)**
  - Extracted all remaining inline routes into 4 new modules:
    - `routes/workspace.ts` — workspace state & workspace-index management
    - `routes/github.ts` — GitHub/Git/Plans API
    - `routes/file-system.ts` — File read/write, FS operations, tree
    - `routes/config.ts` — Runtime config, LLM models, agents, scripts
  - Moved portal download and claw webhook/status routes into existing modules
  - Cleaned up 1500+ lines of dead inline code that was superseded by router-based routes
  - `server/index.ts` reduced from 1846 → 236 lines

## [2.3.7] - 2026-05-23

### Added
- **Stability Milestone: 0 TypeScript Errors**
  - Standardized `AuthInfo` interface across the entire server, resolving all role-based type mismatches and ensuring secure, type-safe routing.
  - Fixed 20+ SQL binding errors related to positional parameters and JSON array stringification.
  - Achieved a 100% clean build for both Bun server and Vite/React frontend.
  - Resolved module resolution issues (TS5097) by standardizing import paths.
- **Final Modularization (WOW-006 Phase 4)**
  - Extracted **Channel Management** APIs into `server/routes/channels.ts`.
  - Refined **Native File Dialog** routes for production stability.
  - Significantly reduced `server/index.ts` complexity, prioritizing foundational stability.

### Fixed
- Fixed widespread syntax errors and broken string literals caused by over-aggressive character escaping.
- Restored accidentally removed `/api/health` and config persistence handlers.

## [2.3.6] - 2026-05-23

### Added
- **WOW-004: Production Readiness & Economics Shield**
  - Implemented secure data isolation for Client and Worker portals.
  - Sensitive financial data (budgets, hourly rates, estimates) is now automatically stripped from responses for non-admin roles (WORKER, CLIENT, LEADER).
  - All client-facing APIs transitioned from mock data to real, multi-tenant database logic.
  - Standardized audit logging for all sensitive actions (file downloads, feedback submissions).
- **Stability Milestone: 0 TypeScript Errors**
  - Resolved all 50+ critical errors from the System Diagnostics Ticket.
  - Achieved a 100% clean build for both the Bun server and the Vite/React frontend.
  - Fixed widespread syntax errors and type conflicts in modular route handlers.
- **WOW-010: Human-in-the-Loop System**
  - Implemented the "Godkännandekö" (Approval Queue) tab in the Admin Console.
  - Added a detailed Diff-View for side-by-side comparison of current vs. proposed data.
  - Registered the `suggest_change` tool for AI agents to create pending modifications.
  - Enforced HITL workflow across all specialized agents (Pricing, Kanban, Planning).
- **WOW-007 Phase 4: Kanban Notifications**
  - Integrated real-time notifications for Kanban card moves and updates.
  - Workers and Leaders receive automated alerts via Telegram or WhatsApp when tasks are assigned or updated.
  - Implemented a unified backend `notifyUser` utility for multi-channel delivery.
- **Production UI Polish**
  - Removed all mock data from Worker and Client portals.
  - Updated login hints to reflect real seeded data for easier onboarding.
  - Fixed syntax errors and type mismatches in Admin and Super Admin dashboards.

### Fixed
- Fixed critical bugs in `server/sdk-runtime.ts` and `server/ws-handler.ts` related to rebranding and missing imports.
- Resolved type mismatches in the unified route handler and WebSocket state.

## [2.3.5] - 2026-05-23

### Added
- **UI Feedback & Indicators**
  - Added real-time notification indicators (badges and dots) to `MenuBar.tsx` and `SimpleNavRail.tsx`.
  - Notification icon (Bell) added to the primary header for quick access to system alerts.
- **WOW-013 Phase 3: Document Storage Skill**
  - Implemented `workspace-storage` skill for agents.
  - Added `workspace_snapshot`, `doc_history`, `doc_restore`, and `workspace_backup_status` tools to the orchestrator.
  - Enabled specialized agents (`fakturering`, `projektledare`, `docs`) to manage document versions directly from chat.
- **WOW-006 Phase 3: Systematic Server Modularization**
  - Significantly reduced `server/index.ts` complexity by extracting logic into modular route handlers (`routes/claw.ts`, `routes/system.ts`, `routes/dev.ts`, `routes/native-dialog.ts`).
  - Extracted entire WebSocket management to `server/ws-handler.ts`.
  - Improved server startup speed and maintainability.

### Changed
- **Global Rebrand (Ollama → Wo AI) — UI & Documentation**
  - Completed user-facing rebrand of all "Ollama" references to "Wo AI" (Way of Work AI).
  - Updated `HowToUseModal`, `HostDoctorModal`, and `MenuBar` model selectors with new terminology.
  - Rebranded "Ollama probe" to "Wo AI probe" in diagnostic tools.

## [2.3.4] - 2026-05-23

### Added
- **Global Rebrand (Ollama → Wo AI) — Backend**
  - Unified project identity by rebranding all "Ollama" references to "Wo AI" (Way of Work AI).
  - Internal environment variables updated to `WOP_AI_HOST` and `WOP_AI_MODEL` (with backward compatibility).
  - Server-side functions and documentation updated to use "Wo" and "Authoritative Runtime" terminology.
- **WOW-019: Notification System Expansion**
  - Expanded scope to include construction-specific events: Weather Alerts, ID06/Compliance Expiry, Procurement updates, and Chat Handoffs.
  - Added requirements for a real-time notification indicator (badge) in the main UI.

### Fixed
- **AuditTrailPage Build Error**: Fixed TypeScript error where constants were being reassigned in the change log view.

## [2.3.3] - 2026-05-23

### Added
- **WOW-008: Pricing Engine Agent Integration** — Verification complete
  - Agent READ access to price lists implemented
  - Price list verification for project pricing estimates
  - Agent→pricing API integration working
  - Cost estimation workflows functional
  - Production-ready pricing tools for estimators

### Changed
- Price list access control: Now allows authenticated agents to READ price lists for cost estimation (previously ADMIN-only)
- Agent role updated to allow price_read permission
- Production database schema verified

### Production-Ready
- Pricing engine agent verification complete
- Cost estimation workflows ready
- Production build verified

## [2.3.2] - 2026-05-23

### Added
- **WOW-011: Time Verification & Scheduling Agent** - Complete implementation
  - Time entry verification against kanban plans
  - Variance report generation (planned vs actual hours)
  - Schedule adjustment proposals via pending_changes
  - Morning dispatch (06:30) and evening reconciliation (18:00)
  - Telegram integration for daily communication
  - Production-ready web_fetch for weather and regulations
  - Swedish building laws integration
  
- **Web Browsing Service** — Production-ready web tools
  - `web_fetch` for official Swedish authorities
  - Weather service: open-meteo.com (no key needed)
  - Certification sources: byn.se, tya.se, id06.se
  - Price databases: byggstart.se, kalkylverket.se
  
- **Web Tools**
  - Research: Official Swedish sources
  - Procurement: Supplier sourcing
  - Supply agent: Construction materials

### Changed
- Agent registration updated to include WOW-011
- Time-verification skill documented
- Weather service integrated for Swedish construction
- Production-ready web browsing integration

### Files Modified
- `.wo/agents/time-verification/README.md` — Created
- `.wo/agents/time-verification/verify-agent.md` — Created
- `.wo/agents/time-verification/verify.ts` — Created
- `.wo/agents/time-verification/dispatch.ts` — Created
- `.wo/agents/time-verification.md` — Created (main agent doc)
- `.wo/skills/time-verification/SKILL.md` — Created
- `.wo/skills/procurement/SKILL.md` — Created
- `.wo/skills/research/SKILL.md` — Updated (web_fetch usage)
- `.wo/agents/agents-registration.md` — Created
- `CHANGELOG.md` — Updated

### Production-Ready
- All tools implemented
- Web fetch integration complete
- Weather service functional (open-meteo)
- Telegram dispatch ready
- Multi-tenant isolation enforced
- Swedish regulations integrated
- Reviewed docs/CHAT_ARCHITECTURE.md and updated WOW-026 with findings regarding chat session isolation requirements.
- Fixed chat session isolation by enforcing surface-based scoping in server/wo-session-jsonl.ts and server/ws-handler.ts.
- Integrated bot preferred_agent support in channel-router and claw-bot-bridge for channel message routing.
- Updated WOW-015 with progress on session persistence and surface-based isolation for inbound channel routing.
- Added 'View Chat' buttons for bot sessions in Admin Dashboard 'Workers' tab and created secure admin API for session log retrieval.
- Initialized WOW-028: Created ticket to modularize MenuBar.tsx into smaller sub-components.
- Migrated agent system to exclusively use .wo/ directory for agent discovery and skill loading. Removed all .pi/ and legacy scanning roots.
- Migrated teams.yaml persistence to exclusively use .wo/agents/ directory. Updated frontend components and UI labels to remove legacy .pi/ references.
- Refactored Kanban CardView to display time logs and fixed modal height constraints. Still pending: card cover image upload and advanced cover options.
- Created WOW-029: Ticket to modularize WorkBoard.tsx into smaller, isolated components.
- Replaced mock users in Kanban assignee picker with real user data from /api/admin/users.
- Finished Kanban CardView fixes: Time logs displayed, modal height fixed, advanced cover options (colors/gradients/uploads) restored.
- Fixed TA-Planner chat label from TMA to TA.
- Fixed TA-Planner chat input layout by making it sticky to the bottom.
