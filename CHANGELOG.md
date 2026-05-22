# Changelog

## 0.25.0 — 2026-05-22 — Ticket System, Agent Discovery, i18n Planning & Pi Purge

- **Agent Discovery Fix**:
  - Created symlink `workspace/.wo` → `../.wo` so server finds agents and skills under `WOP_WORKSPACE`
  - Created `docs.md` agent for documentation work
  - 8 agents now available: claw, kanban, docs, fakturering, forskare, projektledare, schemaplanerare, ata
- **Ticket System Overhaul**:
  - Translated all tickets to English (WOW-008 through WOW-012)
  - Created WOW-012: Isolated Chat per Surface (architecture + workspace layout)
  - Created WOW-013: Orchestrator & GitHub for Construction (Git version control, sub-agent dispatch)
  - Created WOW-014: Bilingual Support (Swedish/English i18n, legal content handling)
  - Created WOW-015: Communication Architecture (Telegram, WhatsApp, Email unified routing)
  - Updated TODO.md with full ticket registry and priority order
- **Price List Seed Fix**:
  - Fixed seed logic in `server/db.ts` — now checks by template name instead of `COUNT(*) = 0`
  - 6 template price lists (Maskiner 2026, Personal 2026, etc.) seed alongside existing lists
- **Pi Purge** (WO-only architecture):
  - Purged all Pi references from tickets, AGENTS.md, CHANGELOG.md, agent definitions
  - Updated naming: `wayofpi-chat-` → `wo-chat-`, `useWayOfPiSession` → `useWoSession`, `.wayofpi/` → `.wo/`
  - Removed Pi scan roots (`.pi/agents/`, `.pi/skills/`) — only `.wo/`, `.claude/`, `.cursor/`
  - AGENTS.md: removed `WOP_PI_BINARY` env var, removed headless Pi runtime mode
  - All tickets now reference `@wayofmono/wo-agent` SDK only
- **Workspace Architecture**:
  - Documented full workspace directory tree: `.wo/` (agents/skills), `.claw/` (personal), `workspace/` (company global)
  - Claw has private workspace under `.claw/` with SOUL.md, AGENTS.md, schedules, mission-events
  - Workspace holds company files, chat transcripts, plans, index, and GitHub credentials

## 0.24.0 — 2026-05-22 — Claw UI Consolidation & Toolbar Refactoring

- **Claw UI Consolidation**:
  - Merged redundant session-level strip into the top-level `ClawSecondaryToolbar`.
  - Moved "New Session" and "Workspace" buttons to the global top bar to eliminate "double chat" headers.
  - Removed desktop session strip for a cleaner, single-header layout.
- **Enhanced Navigation**:
  - Integrated chat session tabs directly into the `ClawSecondaryToolbar` for tabbed session switching.
  - Implemented responsive button labels that hide on narrow screens to prioritize tab space.
- **State Architecture**:
  - Lifted `showFilePanel` state to `ClawApp` to enable cross-component control of the workspace side panel.
  - Wired `streaming` and `connected` states to toolbar buttons for proper lifecycle feedback and disabling.
- **Build & Stability**:
  - Resolved TypeScript errors in `ClawChatView.tsx` following state refactoring.
  - Fixed "New" button functionality by correctly passing session management callbacks.

## 0.22.0 — 2026-05-19 — Standalone extraction & build fixes

- Extracted `wayofwork` from the Way of Pi monorepo as a standalone project; all Pi references purged from tickets, AGENTS.md, and agent definitions
- Added `start.sh` / `stop.sh` scripts, `.env.example`, worker portal files, and clean configs
- Created `plans/agent-role.md` and `plans/fix-system-after-extraction.md`
- Fixed 39 TypeScript build errors (P2):
  - Installed missing `class-variance-authority` dependency
  - Removed orphaned `workerportal.tsx` (case conflict with `WorkerPortal.tsx`)
  - Made `BoardCard.labels` and `CardChecklist.createdAt` optional in kanban types
  - Added missing `setSimpleProviderNonce` to context destructuring in `SimplePage.tsx`
  - Added `role` field to `User` interface in `AuthContext.tsx`
- Audited runtime paths (P3):
  - Updated diagnostics.ts SDK probes from `@earendil-works/pi-coding-agent` → `@wayofmono/wo-agent`
  - Updated agent-runtime.ts and sdk-runtime.ts comments
  - Fixed MenuBar.tsx link and HermesFileBrowser.tsx mock data
- Database cleanup (P4):
  - Fixed `init-db.ts` path from stale `wayofwork-server/db/` → `data/`
  - Fixed `schema.sql` header path
  - Deleted stale `wayofpi.sqlite` and `db_data/` for fresh start
- Cleaned up backup/copy files (P5)

## 0.23.0 — 2026-05-19 — Agent Integration & Real Data Transition

- **Wo Agent Integration**:
  - Installed `@wayofmono/wo-agent` and `@wayofmono/wo-agent-core`
  - Resolved `sdk-runtime.ts` type errors and enabled direct SDK chat integration
- **Multi-Tenant Foundation**:
  - Unified RBAC role casing to uppercase (`ADMIN`, `LEADER`, `WORKER`, `CLIENT`)
  - Added `DEMO` role to RBAC system
  - Removed dev-mode auth bypasses to enforce real JWT authentication
- **Database Expansion**:
  - Added `notes` and `calendar_events` tables to schema and initialization
- **Backend API Implementation**:
  - Completed full CRUD endpoints for `Projects`, `Tasks`, `Notes`, `Calendar Events`, and `Users` in `server/index.ts`.
  - Added multi-tenant scoping to all data-modifying endpoints.
  - Implemented file metadata updates and download audit logging.
- **Frontend Service Refactoring**:
  - Transitioned all frontend services (`kanban`, `tasks`, `projects`, `drive`, `notes`, `calendar`) to use real `/api` endpoints.
  - Restored full service interfaces to support CRUD operations and match UI requirements.
  - Converted services from synchronous (mock) to asynchronous (real data).
- **UI & Build Fixes**:
  - Resolved ~60 TypeScript build errors related to async service transitions.
  - Updated `BoardSettingsModal`, `PushTaskListToKanbanModal`, `WorkBoard`, and `CardView` to properly `await` backend responses.
  - Fixed broken import paths in `src/components/work/kanban` subdirectory.
