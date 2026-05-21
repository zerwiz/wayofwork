# Production Readiness TODO

## ✅ Done
- **TypeScript build**: All errors fixed — green build.
- **Rebranding**: "Way of Pi" → "Way of Work" across source files.
- **Auth**: Real JWT auth with PIN + password login. Role in JWT payload.
- **Demo users**: Seeded Admin/Demo/Client/Super (PIN 1234).
- **Wo Agent**: `@wayofmono/wo-agent` v1.0.2 installed from npm — `createAgentSession` works.
- **Security**: JWT secret must be set in production (`WOP_AUTH_SECRET`). Dead `WOP_DEV_MODE` code removed.
- **DB**: Renamed from `wayofpi.sqlite` → `wayofwork.sqlite`.
- **start.sh**: Cleaned up — no more "dev mode — no auth" comment. Removed unused `WOP_DEV_MODE=true`.
- **.env.example**: Rebranded, production-ready defaults.
- **WOW-006 Phase 1-2**: `server/utils.ts`, `server/router.ts`, `server/routes/auth.ts`, `server/routes/portal.ts` extracted.
  - `server/index.ts`: 3462 → ~3380 lines (shrinking).
- **Plan mode**: Kept (WOW-005 cancelled).

## In Progress
- **WOW-006 Phase 3-4**: WebSocket handler + more route extraction (admin, claw, projects).

## Remaining
- [ ] **WOW-006**: Extract remaining route groups (admin, claw, projects, config/system).
- [ ] **WOW-006**: Extract WebSocket handler into `server/ws-handler.ts`.
- [ ] **kanbanService.ts**: Complete TODO stubs (`deleteBoard`, `createColumn`, `deleteColumn`).
- [ ] **Multi-Tenancy Audit**: Verify Tenant A → Tenant B isolation.
- [ ] **Agent Integration Test**: Verify Wo Agent works with real DB endpoints.
