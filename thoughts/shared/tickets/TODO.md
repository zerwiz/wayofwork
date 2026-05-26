# Way of Work — Master TODO

**PRODUCTION READY NO MOCK DATA**

## 🤖 AI Assistant Instructions (Gemini/Pi)
When working on tickets below, you **MUST** activate the relevant custom skill to ensure compliance with the production architecture:
- Backend/DB tickets: `/skill wow_backend_dev` and `/skill wow_access_control`
- Frontend/UI tickets: `/skill wow_frontend_dev` and `/skill wow_ui_surfaces`
- Agent/Workflow tickets: `/skill wow_agent_dev` and `/skill wow_human_in_the_loop`
- Channel/Messaging tickets: `/skill wow_communications`

**CRITICAL RULE:** Whenever you complete a ticket or a significant phase of a ticket, you **MUST ALWAYS**:
1. Update the relevant checkboxes in this TODO.md (mark `[x]` for done items)
2. Update `CHANGELOG.md` with a summary of the changes
Both must be done before finishing your turn — never leave stale checkboxes.

> **Note:** Individual ticket files (`thoughts/shared/tickets/WOW-*.md`) are design/spec documents. Their checklists were not retroactively updated after implementation. TODO.md is the authoritative live status tracker.

## ✅ Done

### Core Infrastructure
- **WOW-006**: `server/index.ts` refactored from 1846 → 236 lines. All route groups extracted.
- **WOW-012**: Isolated Chat per Surface — WebSocket isolation, JSONL per surface, auto-select agent (Claw→claw, Docs→docs, Kanban→kanban, Simple→Orchestrator), double-bubble fix, symlink + docs agent.
- **WOW-013**: Orchestrator & GitHub — Save Version / Version History, daily backup (30-day prune), workspace-storage skill, channel handler routes through Orchestrator with `dispatch_agent`, surface-specific agents.
- **WOW-023**: Docs Page (Investigated the need for a dedicated `DocsApp` for documents and verified symlink).
- **WOW-025**: Wo Agent Management and "My AI Team" Restoration.
- **WOW-26**: Chat Architecture Documentation & Session Isolation (Verified agent assignments, updated documentation, enforced strict session isolation per UI surface).

### Authentication & Security
- **Auth**: Real JWT auth with PIN + password login. Role in JWT payload. `WOP_AUTH_SECRET` required in production.
- **WOW-016 (Phases 3,5,6,7,8,9)**: Per-user channel session persistence, time tracking privacy, audit logs (`audit_logs` table), agent↔skill mapping & Orchestrator dispatch, daily planning workflow, user information tracking.
- **WOW-010**: Human-in-the-Loop — `pending_changes` table, API (create/list/detail/approve/reject), Admin Console "Godkännandekö" tab with diff-view.

### Communication Channels
- **WOW-015**: Telegram webhook (multi-bot, media, polling fallback), WhatsApp inbound (verify + receive + time-bot wiring), Email (SMTP + inbound forwarding), outbound tools (telegram_send, whatsapp_send, email_send), message audit trail.
- **WOW-007**: Per-User Channels — account linking (user_channel_links), user-context message routing, WhatsApp time workbot, Kanban notifications.

### Agents & Skills
- **WOW-011**: Time Verification & Scheduling Agent — variance analysis, morning dispatch (06:30), evening reconciliation.
- **WOW-018**: Agent Ecosystem — skyddsombud, maskinchef, kalkylator agents; incident-reporting, logistics, cost-estimation skills; multi-agent handoff in dispatch-agent skill.
- **WOW-008**: Pricing Engine — Prislistor-tab in Admin Console, project-pricing + time-calculation skills, agent READ access to price lists.
- **WOW-009**: Offer & Invoice Agent — full backend API (543 lines), Admin Console UI tab, document generation, send via TG/WA.
- Agent-Skill mapping documented, orchestrator agent created, dispatch-agent skill created.

### Multi-Tenancy & AI
- **WOW-003**: Multi-Tenancy AI Models — `tenant_configs` table for per-tenant LLM overrides, `resolveWoAiModelDefault` checks tenant config, admin API for managing per-tenant LLM settings, critical bug fix (tickets-api.ts tenant_id).
- **Global Rebrand**: Ollama → Wo AI (env vars, UI labels, functions). Way of Pi → Way of Work. Pi Purge (`.wayofpi/` → `.index/`).

### TA-Planner
- [x] **WOW-017**: TA-Planner — `ta_plans` table, CRUD API + Trafikverket proxy, UI Planning Wizard, Validation Engine (`ta-validation.ts`), TDOK 2024:0043 Sketch Library.
- [x] **WOW-017 Refactor:** TA Planning system refactored into `.wo/extensions/ta-planner-extension.ts`.
- [x] **WOW-017**: TA Planner Chat Layout: Chat input not sticky to the bottom and TA label correction.

### Bug Report System
- **WOW-020**: Bug Report & Feature Request System — `bug_reports` table, 4 API endpoints (submit, admin list, admin detail, admin PATCH, user list), status workflow (pending→in-review→fixed→closed), screenshot upload, system info capture, BugReportModal, BugReportsAdmin dashboard, Admin Dashboard tab.
- **WOW-021**: Kanban Service Fixes — Implemented backend support and service methods for custom column management.

### Platform
- **TypeScript build**: All errors fixed — green build.
- **Auth**: Real JWT auth with PIN + password login.
- **Demo users**: Seeded Admin/Demo/Client/Super (PIN 1234).
- **Wo Agent**: `@wayofmono/wo-agent` installed.
- **DB**: `wayofwork.sqlite`, auto-create tables.
- **start.sh / .env.example**: Production-ready.
- **Help Center**: Updated HowToUseModal and settings with rebranded terminology.
- **i18n**: `LanguageContext.tsx` server-synced, 200+ keys across 13 namespaces, WebSocket lang pass-through.

## 🔴 Remaining (Confirmed Incomplete)

### Core Infrastructure & Tech Debt
- [ ] **WOW-005**: Remove Plan Mode (~24 files, ~800 lines, moderate effort)
  - **Server (7 files)**: Remove `"plan"` from `ChatSessionMode` type, remove `/plan` and `/plan-interview` slash commands, remove `readPlannerAgentBodySync()` in `agents.ts`, simplify `applyLeadFromCache` in `ws-handler.ts` (only lines 80-83 are plan-specific), remove `PLAN_SESSION_SYSTEM_FALLBACK`/`WEB_SHELL_PLAN_MODE_NOTE` prompts and `mode === "plan"` branch from `session-prompts.ts`, remove `GET /api/plans` route (or keep as standalone plan-file listing)
  - **Frontend (17 files)**: Remove `"plan"` from UI `ChatSessionMode` type, remove `SimplePlanWorkspacePane.tsx`, remove `PlanReview.tsx` (already broken — calls nonexistent `/api/plans/current`), remove plan toggle buttons from SimpleChatView/ChatPanel/MenuBar/StatusBar/TechnicalSidePanels, remove plan utility files or keep if plan-document creation is independent, remove plan-related command palette entries
  - **Note**: `server/plans-catalog.ts` and `GET /api/plans` can survive independently if plan-file creation (`plans/PLAN-*.md`) is kept
- [x] **WOW-006**: Refactor `server/index.ts` into smaller modules — all done per [2.3.8] Phase 5
  - `server/index.ts` reduced from 1846 → 236 lines
  - 18 route modules extracted (admin, client, portal, dev, native-dialog, claw, github, file-system, workspace, config, system, channels, projects, ta-planner, bug-reports, notifications, calendar, auth)
- [x] **WOW-013**: Orchestrator & GitHub (Phase 2 — UI for backup/versioning) (Remaining: automated backup cron/UI)
  - [x] Create `.wo/skills/workspace-storage/SKILL.md` → done per ✅ Done summary
  - [x] Wire skill into agents: `fakturering`, `projektledare`, `docs` → done
  - [x] Agents can save documents after creating/modifying them → `workspace_snapshot`, `doc_history`, `doc_restore`, `workspace_backup_status` tools
  - [x] Channel handler routes through Orchestrator with `dispatch_agent` → done
  - [x] Surface-specific agents → done
  - [ ] Only admins can do git commands
  - [x] Rename "GitHub" to "Version Storage" or "Backup" in UI
  - [x] Add "Save Version" button in Docs view
  - [x] Add "Version History" view
  - [x] Add "Restore Version"
  - [x] Configure default git user name/email
  - [x] GitHub connection UI in Admin Console
  - [ ] Daily cron/schedule at 23:00 that creates branch, adds changes, commits, pushes
  - [ ] Keep last 30 daily backups (auto-prune older remote branches)
  - [ ] Backup only workspace files
  - [ ] Admin toggle: enable/disable automatic backups
  - [ ] Backup status indicator in Admin Console
- [ ] **WOW-027**: Systematic Rebrand: wayofpi → wayofwork, Technical → Simple/Claw
  - [x] **Phase 1 — Technical→Simple/Claw component migration** (9 components in `src/components/technical/`):
    - [x] **Audit**: Only 1 file imports from `technical/` — `SimpleSettingsView.tsx` imports `TerminalSettingsSection`
    - [x] **Verification**: `simple/` and `claw/` UIs don't use technical components — they use `IdeLayout` instead
    - [x] Move `TerminalSettingsSection.tsx` → `simple/` (only consumer is SimpleSettingsView)
    - [x] CommandPalette.tsx (cleared)
    - [x] DebugPanel.tsx (cleared)
    - [x] PlanReview.tsx (cleared)
    - [x] TechnicalChatPanel.tsx (cleared)
    - [x] TechnicalEditorColumn.tsx (cleared)
    - [x] TechnicalPrimarySidebar.tsx (cleared)
    - [x] TechnicalSidePanels.tsx (cleared)
    - [x] TechnicalWorkspaceGrid.tsx (cleared)
    - [x] Remove `"technical"` from `UiMode` type in `useWayOfWorkSession.ts:20`
    - [x] Remove legacy "Technical" nav entry in `Navigation.tsx:27-28`
    - [x] Remove fallback `setUiMode("technical")` calls in `SimplePage.tsx` and `ClawPage.tsx`
  - **Phase 2 — wayofpi→wayofwork localStorage migration** (25+ keys, low risk):
    - [ ] Migrate all `wayofpi.*` localStorage keys → `wow.*` (e.g., `wayofpi.technical.leftSidebarVisible` → `wow.technical.leftSidebarVisible`)
    - [ ] Add one-time migration logic to read old key, write new key, delete old key
    - Files affected: `SimpleApp.tsx`, `ClawApp.tsx`, `ClawMissionView.tsx`, `useShellMobile.ts`, `workspaceGridStorage.ts`, `editorPreferences.ts`, `agentPermissionsStorage.ts`, `workspaceRecent.ts`, `panelDockLayout.ts`, `chromePreferences.ts`, `simpleWorkspaceLayoutStorage.ts`, `planHandoffPersistence.ts`, `terminalUiPreferences.ts`, `showModelThinkingPreference.ts`, `technicalLayoutStorage.ts`, `useClawSchedules.ts`
  - **Phase 3 — "Pi" UI label cleanup** (~50+ strings across 10+ files):
    - [ ] Replace "Pi" product references in Claw UI: `ClawChannelsView.tsx` (~15 strings), `ClawSchedulesView.tsx` (~5 strings), `ClawHelpModal.tsx` (~3 strings)
    - [ ] Replace "Pi" references in Technical UI: `TechnicalSidePanels.tsx` (~20 strings), `MenuBar.tsx` (~10 strings), `ChatPanel.tsx` (~2 strings)
    - [ ] Replace "Pi" in help modals: `HowToUseModal.tsx` (~10 strings), `HonchoSettingsModal.tsx` (~5 strings), `HostDoctorModal.tsx` (~3 strings), `LlmFixModal.tsx` (~2 strings)
    - [ ] Replace "Pi" in misc: `ProviderConfigEditor.tsx` (~3 strings), `StatusBar.tsx` (~2 strings), `useCommandItems.ts` (~2 strings), `AgentPermissionsModal.tsx` (~2 strings), `AgentTeamPulseGrid.tsx` (~3 strings), `ToolPanelBody.tsx` (~1 string)
  - **Phase 4 — Legacy path cleanup**:
    - [ ] Rename favicon: `public/wayofpi-icon.svg` → `public/icon.svg`, `public/wayofpi-icon.png` → `public/icon.png`, update `index.html` references
    - [ ] Update `server/README.md` (~18 references to wayofpi.sqlite, .wayofpi/, etc.)
    - [ ] Update `shared/claw-schedules-store.ts` and `shared/claw-mission-events.ts` legacy `.wayofpi/` migration paths (keep migration logic, update comments)
    - [ ] Update `server/schema.sql` comment reference

### Bug Fixes & Agent Enhancements
- [ ] **WOW-001** — Fix routing/imports (P3+P5)
  - [x] Decide fate of menu files excluded from tsconfig → `FileMenu.tsx`, `EditMenu.tsx`, `SelectionMenu.tsx` no longer exist (cleaned up)
  - [x] `PUT /api/portal/me` — ✅ implemented (language persistence)
  - [x] `POST /api/portal/change-pin` — ✅ exists in `routes/portal.ts:87`
  - [x] `GET /api/admin/stats` role gating — ✅ `adminGuard` allows SUPER_ADMIN + ADMIN
  - [x] `"technical"` uiMode — removed from App.tsx routing
  - [x] `Dashboard.tsx` — no longer exists in src/pages/
  - [x] **Acceptance**: build passes (zero tsc errors), start.sh launches, login flow works
  - [ ] Audit server routes with no frontend consumer: keep, wire, or remove
- [x] **WOW-018**: Agent Ecosystem Expansion — all implemented per [2.3.8]
  - [x] New Specialized Agents: `skyddsombud`, `maskinchef`, `kalkylator` — .md files with YAML frontmatter exist
  - [x] New Cross-Cutting Skills: `incident-reporting`, `logistics`, `cost-estimation` — SKILL.md files exist
  - [x] Orchestrator Enhancements: Multi-Agent Handoff, Ambiguity Resolution — dispatch-agent skill updated
  - [x] Integration: TA-Planner Integration — listed in orchestrator dispatch
- [ ] **WOW-022**: General Updates and Fixes (Test remaining)
  - [x] **WOW-008 Verification**: PR confirmed in ✅ Done — `projektledare` agent reads price lists
  - [x] **WOW-009 Verification**: PR confirmed in ✅ Done — Offers/Invoices UI tab + send via TG/WA
  - [x] **CRITICAL Build Errors**: Fixed (CardView.tsx, WorkBoard.tsx)
  - [x] **CRITICAL API Errors**: Fixed and verified (4 endpoints)
  - [ ] **Agent Integration Test**: Create a test script to verify Wo Agent tools access real DB endpoints

### Multi-Tenancy & Access Control
- [x] **WOW-003**: Multi-Tenancy AI Models (Remaining: tenant management UI)
  - [x] **Tenant isolation**: All queries inject `auth.tenantId` — per [2.3.6] Economics Shield
  - [x] **Role Enforcement**: `SUPER_ADMIN` cross-tenant, `ADMIN` scoped — per ✅ Done summary
  - [x] **Settings Storage**: `tenant_configs` table created, `resolveWoAiModelDefault` checks tenant config
  - [x] **Agent Integration**: `server/agent-runtime.ts` pulls from tenant config — per ✅ Done
  - [x] **Admin API**: `GET/POST /api/admin/tenants/:id/config` for per-tenant LLM settings
  - [x] **Endpoint Audit:** Verify every endpoint in server/ routes uses `auth.tenantId`
  - [x] **Filesystem Partitioning:** Store files in tenant-specific subdirectories
  - [ ] **Tenant Management UI:** UI for managing tenants (create, disable, settings)
- [ ] **WOW-016** — [CRITICAL] Access Control (Phases 1-2 Frontend remaining)
  - [x] Phase 1: Project Membership System — `project_members` table created in db.ts, API exists, seed migration done
  - [x] Phase 2: Role-Based Data Isolation — Economics Shield implemented per [2.3.6]
  - [x] Webhook mode: Each bot gets its own webhook URL → `/api/channels/telegram/webhook/:botId`
  - [x] Database Schema: `project_members` + `audit_logs` tables created, task schema fixes done
  - [ ] Admin Console: "Audit Log" tab with filtering (needs frontend UI)
  - [ ] Audit log retention: 90 days (configurable)
  - [ ] Verify indexes, add `budget_allocated`/`budget_spent` to `projects`
- [x] **WOW-024**: Private & Shared Access Control for Kanban, Docs, and Files
  - [x] **Data Model Change**: Introduce a `visibility` attribute to Kanban boards, `tasks`, `documents`, and `workspace_files`.
  - [x] **Sharing Mechanism**: Implement a `shares` table (or similar) to track explicit read/write access permissions per user/team.
  - [x] **Access Control Layer**: Update backend route handlers (workspace files, kanban service, docs API) to evaluate these new visibility rules alongside the existing `tenant_id` check.
  - [x] **UI Integration**: Add UI controls for "Make Private" / "Share" on Kanban boards and file/document panels.
  - [x] **UI Integration**: Update dashboards to distinguish between private and shared content.
  - [x] Map required UI changes for sharing permissions.

### Communication Channels
- [x] **WOW-015**: Communication Architecture (21/22 items implemented)
  - [x] Replace long-polling with Telegram webhook → `server/telegram-bot.ts`
  - [x] Support multiple bot tokens → webhook URL includes `:botId`
  - [x] Handle `edited_message` updates
  - [x] Handle media messages → photo/document download in telegram-bot.ts
  - [x] Fall back to long-polling if webhook setup fails
  - [x] Create `POST /api/channels/whatsapp/webhook` → `routes/channels.ts`
  - [x] Verify webhook token on setup → GET handler with hub.challenge
  - [x] Parse inbound messages
  - [x] Wire in `whatsapp-time-bot.ts` → `server/whatsapp-time-bot.ts` exists
  - [x] Support multiple WhatsApp business accounts
  - [x] Add `WOP_SMTP_*` env vars → in .env.example
  - [x] Create `server/email.ts` → 319 lines, SMTP + inbound parsing
  - [x] Outbound: send offers/invoices via email → `sendEmail()`
  - [x] Inbound: `POST /api/channels/email/inbound` → routes/channels.ts
  - [x] Parse email body, attachments saved to workspace → `parseInboundEmail()`
  - [x] `telegram_send <userId> <message>` → orchestrator-channel-tools.ts
  - [x] `whatsapp_send <userId> <message>` → orchestrator-channel-tools.ts
  - [x] `email_send <userId> <subject> <body>` → orchestrator-channel-tools.ts
  - [x] All inbound messages logged → `channel_message_logs` table
  - [x] All outbound messages logged → INSERT in routes + email
  - [x] Admin Console "Message Logs" view with filtering → AdminDashboard Channels tab
  - [ ] Message log retention policy — no auto-cleanup implemented
- [x] **WOW-019**: Notification System (10/11 items implemented)
  - [x] localStorage storage → `NotificationContext.tsx`
  - [x] Toast notifications on creation → `NotificationToast.tsx`
  - [x] **Badge count in Navigation** → MenuBar wired to live `unreadCount`
  - [x] Inbox view in Settings → `NotificationInbox.tsx`
  - [x] Filter by type/severity
  - [x] Mark as read functionality → `PATCH /api/notifications/:id/read`
  - [x] Admin API endpoint → `GET/PATCH/DELETE /api/notifications`
  - [x] Integration with pending-changes → notify on approve/reject
  - [x] **Integration with Audit Logger** → security audit events trigger notification
  - [ ] **Integration with Git Backend** — pending WOW-013
  - [x] **Integration with Weather Service** → `construction-triggers.ts` (open-meteo)
  - [x] **Integration with ID06/Supply Agents** → `construction-triggers.ts` (14-day expiry check)

### Data & UI Completion
- [x] **WOW-002** — Local Hosting for Remote Access (✅ DONE)
  - [x] Ngrok tunnel verified working — auto-starts with `WOP_NGROK_DOMAIN`
  - [x] Port Management (Vite + Bun consistent via WOP_SERVER_PORT)
  - [x] Manual testing: access from external network via ngrok confirmed working
  - [x] **WOP_PUBLIC_URL** — hardcoded ngrok domain in vite.config.ts replaced with env var
  - [x] `.env.example` expanded with ngrok/tunnel/Basic Auth config docs
  - [ ] **Low priority**: Tunnel Gate UI, Basic Auth, LAN verification, Electron integration
- [x] **WOW-004** — Production Readiness (Real data migration, API completion)
  - [x] **Real data migration** — Seeded 3 construction projects, 7 tasks, project members, 6 time entries with realistic data (idempotent)
  - [x] **User Management**: `GET /api/admin/users` works (14 users), `POST /api/admin/users` works
  - [x] **Added missing DB tables**: `project_members`, `notifications` created in db.ts
  - [x] **Tenant isolation**: All queries inject `auth.tenantId`
  - [ ] **Backend API Completion**:
    - [x] Complete CRUD for Projects: `POST /api/projects`, `PUT /api/projects/:id`, `DELETE /api/projects/:id`.
    - [x] Complete CRUD for Tasks: `POST /api/portal/tasks`, `PUT /api/portal/tasks/:id`, `DELETE /api/portal/tasks/:id`.
    - [x] Complete CRUD for Notes: `POST /api/notes`, `PUT /api/notes/:id`, `DELETE /api/notes/:id`.
    - [x] Complete CRUD for Calendar: `POST /api/calendar/events`, `PUT /api/calendar/events/:id`, `DELETE /api/calendar/events/:id`.
  - [ ] **Frontend Services Completion**:
    - [x] Tasks Service: Restore full interface (delete, update, filter).
    - [x] Drive Service: Implement `getFile`, `uploadFile`, `deleteFile`.
    - [x] Notes/Calendar: Align fully with UI needs (CRUD).
  - [x] **Filesystem & Multi-Tenancy Hardening**:
    - [x] Ensure all `POST/PUT` operations automatically inject `auth.tenantId`.
    - [x] Verify filesystem operations in `server/index.ts` are scoped to tenant subdirectories.
- [x] **WOW-014 Phases 2-4** — Bilingual Support (SV/EN) — Core i18n engine + server sync + WebSocket lang
  - [x] **LanguageContext server sync**: `LanguageProvider` loads from `GET /api/portal/me`, persists via `PUT /api/portal/me`
  - [x] **Server language column**: `ALTER TABLE users ADD COLUMN language` in db.ts
  - [x] **Locale files expanded**: 49 → 200+ keys across 13 namespaces
  - [x] **WebSocket lang pass-through**: Both WS hooks append `&lang=` param
  - [x] **Wired t() calls**: AdminDashboard (all tabs), LoginPage, WorkerPortal
  - [x] **Build passes**: `tsc -b` zero errors
- [ ] **WOW-008**: Pricing Engine (Remaining: item table editor, price list integration, templates)
  - [x] `projektledare` agent can read price lists and use them for cost calculations
  - [x] `projektledare` agent references both `project-pricing` and `time-calculation` skills
  - [x] Time calculation skill includes standard Swedish time-per-unit tables
  - [x] Agent READ access to price lists → per ✅ Done
  - [x] Replace JSON textarea in `OffersInvoicesTab` with a proper item table editor
  - [ ] Price list integration: allow picking items from existing price lists
  - [ ] Template offers: save/load common offer templates
- [ ] **WOW-009**: Offer & Invoice Agent (Remaining: item table editor, price list integration, OCR, templates)
  - [x] Create offers with line items
  - [x] Auto-generated offer numbers (`ANB-YYYY-NNN`) per tenant
  - [x] Offer status workflow: draft → sent → accepted → rejected → invoiced
  - [x] Generate HTML document for offer (printable to PDF)
  - [x] Send offer to client via Telegram/WhatsApp
  - [x] Create invoice from accepted offer
  - [x] Auto-generated invoice numbers (`INV-YYYY-NNN`) per tenant
  - [x] Invoice status workflow: draft → sent → paid → overdue → cancelled
  - [x] Generate HTML document for invoice (printable to PDF)
  - [x] Send invoice via Telegram/WhatsApp
  - [x] VAT calculation (25%) on invoices
  - [ ] OCR number auto-generation for invoices
  - [x] Replace JSON textarea in `OffersInvoicesTab` with a proper item table editor
  - [ ] Price list integration: allow picking items from existing price lists
  - [ ] Template offers: save/load common offer templates
- [x] **WOW-014** — Bilingual Support (SV/EN) (Phases 2-4 Done)
  - [x] Create i18n key-value store (JSON files in `shared/locales/` or similar) → `src/i18n/sv.json`, `src/i18n/en.json`
  - [x] Add `useTranslation()` hook for React components → `LanguageContext.tsx`
  - [x] Store language preference in user profile → `users.language` column + `PUT /api/portal/me`
  - [x] Add language selection to user settings → via `LanguageContext.setLanguage()`
  - [x] Server-side language detection from user profile → `GET /api/portal/me` returns `language`
  - [x] Translate all Admin Console tab labels → Done via `t("admin.*")` calls
  - [x] Agent system prompt includes user's language preference → `?lang=` param in WS URL
  - [x] Chat greeting is in user's language → via WS lang pass-through
  - [x] Agent responses in user's language by default → via session-prompts.ts lang injection
- [ ] **WOW-014 Remaining** (Polish)
  - [x] Translate chat UI labels (ChatPanel, message bubbles, etc.)
  - Translate form labels, validation messages, error messages
  - Translate empty states
  - Settings/profile UI in both languages
  - Wire `t()` in remaining sub-components (Kanban, Claw, TA-Planner, Docs)
  - Swedish legal skill content is always appended in Swedish regardless of language
  - Agent `.md` files have language-appropriate prompts
  - `swedish-building-laws` skill: always included in Swedish
  - `ata` skill: always in Swedish
  - `project-pricing` skill: Swedish references always included + translated overview
  - AB 04 / ABT 06 references: only in Swedish
  - Currency formatting: SEK by default, user-selectable
- [ ] **WOW-017**: TA-Planner System Implementation (Visual Integration, Detail View)
  - **Visual Integration:** Implement map-based planning (Leaflet/OpenStreetMap), drag-and-drop signage/cones, and automated screenshot capture of the plan canvas.
  - **Detail View**: Enable opening plans to view the generated map overlay.
- [ ] **WOW-028**: Mobile-First UI/UX Design and Implementation (🟡 IN PROGRESS)
  - **UI/UX Design**: Responsive Design, Touch Optimization, Information Hierarchy, Navigation.
  - **Functional Requirements**: Core Features, Performance, Cross-Platform Compatibility.
  - **Technical Requirements**: Component Adaptation, State Management, Testing.
  - **General Mobile-First Design Considerations**: Global Navigation Strategy, Touch Gesture Support, Input Field Optimizations, Performance Considerations, Accessibility (A11y).

### Refactoring & Maintenance
- [ ] **WOW-029**: Refactor AdminDashboard.tsx into Smaller Components
  - `AdminStatsCards.tsx` (remaining)
  - `AdminUsersTab.tsx` (remaining)
  - `AdminProjectsTab.tsx` (remaining)
  - `AdminChannelsTab.tsx` (remaining)
  - Prop Drilling Minimization
  - Maintain Existing Functionality
  - Performance (Non-Regression)
  - Readability
  - Maintainability
  - Type Safety
- [ ] **WOW-030**: Refactor MenuBar.tsx into Smaller Sub-Components
  - `GoMenuContent.tsx` (remaining)
  - `RunMenuContent.tsx` (remaining)
  - `TerminalMenuContent.tsx` (remaining)
  - `HelpMenuContent.tsx` (remaining)
  - `AgentsMenuContent.tsx` (remaining)
  - `SettingsMenuContent.tsx` (remaining)
  - `NotificationsArea.tsx` (existing `NotificationsDropdown` component)
  - `LlmSelector.tsx` (remaining)
  - `LanguageSwitcher.tsx` (remaining)
  - Maintain Existing Functionality
  - Performance (Non-Regression)
  - Readability
  - Maintainability
  - Type Safety
- [ ] **WOW-031**: Modularize `src/components/work/kanban/WorkBoard.tsx`
  - Analyze `WorkBoard.tsx` to identify logical sub-components: `BoardHeader`, `KanbanBoard`, `TimelineView`, `CalendarView`, `BoardSidebar`, `CardModal`.
  - Create a dedicated directory `src/components/work/kanban/` for sub-components if needed.
  - Extract logic and state into smaller components, keeping `WorkBoard.tsx` as a lean shell.
  - Ensure all functionality is preserved.

### Other Critical Issues
- [x] **CRITICAL: Build Errors**: Fixed. CardView.tsx had misplaced JSX block, duplicate ref, missing function declaration. WorkBoard.tsx was missing BoardControls import. Build now passes with zero errors.
- [x] **CRITICAL: API Errors**: Fixed and verified.
    - `GET /api/admin/users` — returns 14 users (was 404, route was never registered during broken build)
    - `GET /api/portal/tasks` — returns tasks (was 500, missing `notifications`/`project_members` tables in db.ts)
    - `GET /api/admin/llm-providers` — returns config (was 500, same root cause)
    - WebSocket `kanban` surface — agent file exists, surface-to-agent mapping correct

## Priority Order

1. ✅ **WOW-004** — Real data migration (completed)
2. ✅ **WOW-002** — Remote hosting (ngrok verified working)
3. ✅ **WOW-014 Phases 2-4** — i18n core, server sync, WS lang, AdminDashboard/Login/Portal wired (completed)
4. **WOW-014 Remaining** — Wire `t()` into Kanban/Claw/TA-Planner/Docs sub-components, translate form/validation/error/empty-state messages, Swedish legal content strategy
5. **WOW-001 P5** — Routing cleanup & polish
6. **WOW-016 Frontend** — Phase 1-2 frontend access control wiring
7. **Multi-Tenancy Audit** — Verify isolation
8. **kanbanService.ts stubs** — Minor cleanup

---

## ✅ Implementation Notes for New Tickets

### WOW-019 (Notification System)
- Store in localStorage (client-side) + optional WebSocket push
- Toast notifications on approve/reject changes
- Badge count in Navigation (unread messages)
- Integration with WOW-010 approval queue

---

**Generated**: 2026-05-25
**Last edited**: 2026-05-25 (comprehensive audit: reconciled 21 ticket files vs TODO.md)
