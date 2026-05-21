# Changelog

## 0.22.0 — 2026-05-19 — Standalone extraction & build fixes

- Extracted `wayofwork` from the Way of Pi monorepo as a standalone project
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
