# Way of Work — Master TODO

## ✅ Done
- **TypeScript build**: All errors fixed — green build.
- **Rebranding**: "Way of Pi" → "Way of Work" across source files.
- **Auth**: Real JWT auth with PIN + password login. Role in JWT payload.
- **Demo users**: Seeded Admin/Demo/Client/Super (PIN 1234).
- **Wo Agent**: `@wayofmono/wo-agent` v1.0.2 installed from npm.
- **Security**: JWT secret required in production (`WOP_AUTH_SECRET`). No dev-mode bypass.
- **DB**: Renamed from `wayofpi.sqlite` → `wayofwork.sqlite`.
- **start.sh**: Cleaned up, no dev-mode flags.
- **.env.example**: Rebranded, production-ready defaults.
- **Plan mode**: Kept (WOW-005 cancelled).
- **WOW-012**: Workspace `.wo/` symlink created → agents & skills found by server.
- **WOW-012**: Docs agent created (`.wo/agents/docs.md`).
- **WOW-008**: Price list CRUD UI in Admin Console (Prislistor-tab).
- **WOW-008**: Skills `project-pricing`, `time-calculation` created.
- **WOW-009**: Offers & Invoices backend API (543 lines) + agents/skills created.

## In Progress / Partial
- **WOW-006**: `server/utils.ts`, `server/router.ts`, `server/routes/auth.ts`, `server/routes/portal.ts` extracted. `server/index.ts` ~3380 lines (from 3462).
- **WOW-001 P3+P5**: Runtime paths audit + dead code/routing cleanup (unchecked).
- **WOW-008**: Pricing engine — agent wiring verification pending.
- **WOW-009**: Offers & Invoices — needs frontend UI (Admin Console tab for offers/invoices).
- **WOW-012**: Chat per surface — symlink + docs agent done. Rest pending (see below).

## Remaining Tickets

### WOW-001 — Fix routing/imports (P3+P5)
- [ ] Runtime paths audit
- [ ] Dead code & routing cleanup

### WOW-002 — Local Hosting for Remote Access
- [ ] Enable ngrok/cloudflared integration
- [ ] Document access setup

### WOW-003 — Multi-Tenancy AI Models
- [ ] Consistent multi-tenant isolation across all API endpoints
- [ ] Per-tenant AI model configuration

### WOW-004 — Production Readiness (CRITICAL)
- [ ] Launch-blocking items
- [ ] Real data migration from test data
- [ ] API completion for client portal

### WOW-006 — Refactor server/index.ts
- [ ] Phase 3-4: WebSocket handler (`server/ws-handler.ts`)
- [ ] Extract remaining route groups: admin, claw, projects, config/system
- [ ] Target: `server/index.ts` < 500 lines

### WOW-007 — Per-User Channels & WhatsApp Time
- [ ] Phase 0: Admin channel management UI
- [ ] Phase 1: User-channel link table (DB table exists, API pending)
- [ ] Phase 2: Route channel messages to user context
- [ ] Phase 3: WhatsApp time workbot (NLP time parsing)
- [ ] Phase 4: WhatsApp kanban notifications

### WOW-008 — Pricing Engine (agent verification)
- [ ] Verify `projektledare` agent can read price lists and use skills
- [ ] Wire agent → pricing API integration

### WOW-009 — Offer & Invoice Agent (frontend UI)
- [ ] Admin Console tab for offers/invoices
- [ ] Document generation/send workflows in UI

### WOW-010 — Human-in-the-Loop (CRITICAL — blocks WOW-011)
- [ ] `pending_changes` table exists, API endpoints pending
- [ ] Admin Console "Godkännandekö" tab with diff-view
- [ ] AI can only create pending_changes (not write directly)
- [ ] All agents: price lists, planning, schedules use approval queue

### WOW-011 — Time Verification & Scheduling Agent (blocked on WOW-010)
- [ ] Agent reads time reports + kanban plan
- [ ] Variance reports and schedule proposals
- [ ] Telegram morning dispatch (06:30)

### WOW-012 — Isolated Chat per Surface
- [ ] ✅ symlink + docs agent (done)
- [ ] WebSocket state isolation per surface (surface → egen session)
- [ ] JSONL per surface: `wayofpi-chat-<surface>-<sessionKey>.jsonl`
- [ ] Auto-select agent: Claw→claw, Docs→docs, Kanban→kanban, Simple→null
- [ ] Generic auto-select in `SimpleChatView` (remove hardcoded `clawChrome`)
- [ ] Agent cleanup on surface navigation
- [ ] Fix double-bubble at thinking (assistant_turn_start / assistant_delta merge)

### Other
- [ ] **kanbanService.ts**: Complete TODO stubs (`deleteBoard`, `createColumn`, `deleteColumn`)
- [ ] **Multi-Tenancy Audit**: Verify Tenant A → Tenant B isolation
- [ ] **Agent Integration Test**: Verify Wo Agent works with real DB endpoints

## Priority Order

1. **WOW-010** — Human-in-the-Loop (critical, blocks AI writes)
2. **WOW-004** — Production Readiness (launch blocker)
3. **WOW-012** — Isolated Chat per Surface (UX critical)
4. **WOW-006** — Server refactoring (maintainability)
5. **WOW-007** — Per-User Channels (core infra)
6. **WOW-009** — Offers & Invoices (frontend UI)
7. **WOW-011** — Time Verification (blocked on WOW-010)
8. **WOW-008** — Pricing Engine (agent wiring)
9. **WOW-002/003/001** — Polish & infrastructure
