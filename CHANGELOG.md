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
- Cleaned up backup/copy files (P5)
