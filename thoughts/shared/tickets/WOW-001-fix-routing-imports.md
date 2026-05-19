# WOW-001 Fix routing & imports after port

## Problem Statement

The app was ported from another system and never fully reconciled. Client-side routes, server API routes, and file imports are misaligned — 41 tsc errors block the build, orphaned files exist, and several frontend pages call server endpoints that don't exist (or vice versa).

## Desired Outcome

Clean `bun run build`, all routes wired correctly, orphaned files removed or integrated, and the routing map accurately reflecting what the app actually needs.

## Context & Background

### Current routing map

**Client-side routes** (`src/App.tsx` + `src/main.tsx`):
| Path | Component | File |
|---|---|---|
| `/welcome` | WelcomePage | `src/pages/WelcomePage.tsx` |
| `/login` | LoginPage | `src/pages/LoginPage.tsx` |
| `/` | redirect → `/docs` or `/welcome` | — |
| `/simple` | SimplePage | `src/pages/SimplePage.tsx` |
| `/kanban` | KanbanPage | `src/pages/Kanban.tsx` |
| `/workboard` | WorkPage | `src/pages/WorkPage.tsx` |
| `/ata` | ClawPage | `src/pages/ClawPage.tsx` |
| `/docs` | DocsPage | `src/pages/DocsPage.tsx` |
| `/portal` | WorkerPortal | `src/pages/WorkerPortal.tsx` |
| `/admin` | AdminDashboard | `src/pages/AdminDashboard.tsx` |
| `/super-admin` | SuperAdminDashboard | `src/pages/SuperAdminDashboard.tsx` |
| `/client` | ClientDashboard | `src/pages/ClientDashboard.tsx` |
| `/profile` | UserProfile | `src/pages/UserProfile.tsx` |

UI modes (`"simple"`, `"work"`, `"claw"`, `"docs"`, `"kanban"`) sync to routes via `uiModeRouteMap`/`routeUiModeMap`. Mode `"technical"` has **no route** — setting it navigates to `/simple`.

### Known mismatches (ported-system debris)

1. **Broken tsc build** (41 errors)
   - `src/pages/workerportal.tsx` wrong import depth (`./src/components` → `../components`)
   - `WorkerPortal.tsx` vs `workerportal.tsx` case conflict (both exist)
   - 5 UI components import missing dep `class-variance-authority`
   - `server/sdk-runtime.ts` imports missing dep `@wayofmono/wo-agent`
   - `mockKanbanService.ts` missing required fields (`createdAt`, `labels`)
   - `SimplePage.tsx` undefined ref `setSimpleProviderNonce`
   - `CardView.tsx` `user.role` not on `User` type

2. **Orphaned/unreachable files**
   - `src/pages/Dashboard.tsx` — exists but not exported or routed
   - `src/pages/workerportal.tsx` — case-duplicate of `WorkerPortal.tsx`, not exported

3. **Frontend calls server endpoints that don't exist**
   - `UserProfile.tsx` calls `PUT /api/portal/me` and `POST /api/portal/change-pin` — neither exists on server (both are `// TODO`)
   - `WorkerPortal.tsx` data layer is mostly demo — real `GET /api/portal/me`, tasks, files calls are commented out

4. **Server routes with no frontend consumer**
   - `/api/time-sessions/*` (check-in, check-out, active, report)
   - `/api/tickets/*` + `/api/price-lists/*` + `/api/reports/*` + `/api/invoices/*`
   - `/api/workspace-index/*` (sync, clear, docs, options)
   - `/api/dev/ngrok-tunnel`, `/api/dev/tunnel-gate`, `/api/dev/share-url-hints`
   - `/api/diagnostics`, `/api/upstream`, `/api/package-scripts`, `/api/run-script`, `/api/plans`
   - `/api/github/*`, `/api/ui/views`, `/api/ui/views/seed`

5. **Route gating mismatch**
   - `/admin` page calls `GET /api/admin/stats` which requires `SUPER_ADMIN` — regular admins get 403

6. **Electron routing**
   - Dev: loads Vite URL (`http://127.0.0.1:5173`), Vite proxies `/api` and `/ws` to Bun on `:3333`
   - Prod: loads Bun URL (`http://127.0.0.1:3333/`), Bun serves `dist/` + API
   - Bun autostart checks `GET /api/health` for capabilities freshness

### Why This Matters
The app cannot build or start. Unclear which server routes are dead code vs. future features, and which frontend pages are placeholders vs. real.

## Requirements

### Functional
- [ ] `bun run build` passes with zero tsc errors
- [ ] All client-side routes render the correct component
- [ ] `./start.sh` launches Electron without build errors
- [ ] Login flow lands on correct page per role (worker→/portal, client→/client, admin→/ata)

### Integration
- [ ] For each page that makes API calls, the server endpoint exists and accepts the right role
- [ ] Dead server routes with no frontend consumer are either wired up or removed
- [ ] Orphaned page files (`Dashboard.tsx`, `workerportal.tsx`) are either removed or properly added to routing

### Out of Scope
- Adding new features
- Rewriting the server routing architecture

## Tasks

### Layer 1 — Fix build (41 tsc errors)
- [ ] Deduplicate `WorkerPortal.tsx` / `workerportal.tsx` — keep one, fix case in index.ts
- [ ] Fix `workerportal.tsx` import paths (`./src/components` → `../components`)
- [ ] Install `class-variance-authority` or rewrite affected components (Badge, Input, Label, Textarea, PlanReview)
- [ ] Install `@wayofmono/wo-agent` or gate `server/sdk-runtime.ts` behind a feature flag
- [ ] Fix `mockKanbanService.ts` — add missing `createdAt` and `labels` fields
- [ ] Fix `SimplePage.tsx` — rename `setSimpleProviderNonce` or correct the ref
- [ ] Fix `CardView.tsx` — add `role` to `User` type or fix the access

### Layer 2 — Reconcile routes
- [ ] Add missing server endpoints: `PUT /api/portal/me`, `POST /api/portal/change-pin`
- [ ] Wire `WorkerPortal.tsx` real API calls (uncomment `GET /api/portal/me`, tasks, files)
- [ ] Fix `/admin` → `GET /api/admin/stats` gating (allow ADMIN role too)
- [ ] Decide fate of `"technical"` uiMode — either remove it or give it a route
- [ ] Clean up `Dashboard.tsx` and `workerportal.tsx` — remove or add to routing

### Layer 3 — Clean up dead server routes or connect them
- [ ] Audit each server route with no frontend consumer: keep (future feature), wire to UI, or remove

## Technical Notes

### Affected Components
- `src/pages/workerportal.tsx` — fix imports, resolve case conflict
- `src/pages/WorkerPortal.tsx` — activate real API calls
- `src/pages/index.ts` — fix exports
- `src/pages/Dashboard.tsx` — remove or wire in
- `src/components/ui/Badge.tsx`, `Input.tsx`, `Label.tsx`, `Textarea.tsx`, `PlanReview.tsx` — install `class-variance-authority` or rewrite
- `src/components/kanban/CardView.tsx` — fix `user.role`
- `src/pages/SimplePage.tsx` — fix `setSimpleProviderNonce`
- `src/services/mockKanbanService.ts` — add missing fields
- `src/types/kanban.ts` — add `role` to User if needed
- `server/sdk-runtime.ts` — resolve `@wayofmono/wo-agent`
- `server/index.ts` — add `PUT /api/portal/me` + `POST /api/portal/change-pin`, relax `/admin/stats` role gate

---

## Meta

**Created**: 2026-05-19
**Priority**: High
**Estimated Effort**: L
