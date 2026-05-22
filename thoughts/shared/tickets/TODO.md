# Way of Work — Master TODO

## ✅ Done
- **TypeScript build**: All errors fixed — green build.
- **Rebranding**: "Way of Pi" → "Way of Work" across source files, tickets, agent definitions.
- **Pi Purge**: Removed all `.wayofpi/` directories (repo root + workspace), renamed to `.index/`. Removed `.pi/` scan roots. Updated all server code references to `.wayofpi/` → `.index/`, `.github-credentials.json`, `.ui-views.json`, `.claw-webhook.json`. Hardcoded Pi path in `workspace-state.ts` fixed. `init-db.ts` DB path fixed.
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
- **WOW-014**: Created — bilingual SV/EN support ticket.
- **WOW-015**: Created — communication architecture ticket (Telegram, WhatsApp, Email).
- **WOW-016**: Created — CRITICAL access control, user isolation, daily workflow.
- **Agent-Skill mapping**: Documented in WOW-016. Missing skills identified for claw, docs, kanban.
- **Workspace structure**: `workspace/agent/sessions/`, `workspace/plans/` created. `.wo/README.md` added.
- **`.gitignore`**: Fixed to track repo-root `.wo/` but ignore workspace symlink + secrets. Removed `.wo/` blanket ignore.

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
- [ ] WebSocket state isolation per surface
- [ ] JSONL per surface: `wo-chat-<surface>-<sessionKey>.jsonl`
- [ ] Auto-select agent: Claw→claw, Docs→docs, Kanban→kanban, Simple→null
- [ ] Generic auto-select in `SimpleChatView` (remove hardcoded `clawChrome`)
- [ ] Agent cleanup on surface navigation
- [ ] Fix double-bubble at thinking (assistant_turn_start / assistant_delta merge)

### WOW-013 — Orchestrator & GitHub for Construction
- [ ] Phase 1: GitHub simplification (Save Version / Version History buttons)
- [ ] Phase 2: Automated daily backup (`backup/YYYY-MM-DD` branches, 30-day prune)
- [ ] Phase 3: Agent skill `workspace-storage` for doc save/restore/history
- [ ] Phase 4: Orchestrator rework (Simple mode agent + channel handler + `dispatch_agent`)
- [ ] Phase 5: Surface-specific agents (Claw→claw, Docs→docs, Kanban→kanban, Simple→Orchestrator)

### WOW-014 — Bilingual Support (SV/EN)
- [ ] Phase 1: i18n infrastructure (locales JSON, useTranslation hook, user language setting)
- [ ] Phase 2: UI translation (Admin Console labels, chat UI, forms, empty states)
- [ ] Phase 3: Agent language awareness (greeting, responses follow user language)
- [ ] Phase 4: Swedish legal content handling (always in Swedish regardless of UI language)

### WOW-015 — Communication Architecture
- [ ] Phase 1: Unified inbound router (`server/channel-router.ts`)
- [ ] Phase 2: Telegram webhook (replace polling, multi-bot, media handling)
- [ ] Phase 3: WhatsApp inbound (webhook, wire up whatsapp-time-bot)
- [ ] Phase 4: Email (SMTP + inbound forwarding)
- [ ] Phase 5: Outbound notification tools (telegram_send, whatsapp_send, email_send)
- [ ] Phase 6: Complete message audit trail

### WOW-016 — [CRITICAL] Access Control, User Isolation & Daily Workflow
- [ ] Phase 1: Project membership system (`project_members` table)
- [ ] Phase 2: Role-based data isolation (economics shield, worker isolation)
- [ ] Phase 3: Per-user channel session persistence
- [ ] Phase 4: Multi-bot support (Telegram + WhatsApp per tenant)
- [ ] Phase 5: Time tracking privacy & bot isolation
- [ ] Phase 6: Information access audit (`audit_logs` table)
- [ ] Phase 7: Agent↔Skill mapping & Orchestrator dispatch
- [ ] Phase 8: Daily planning workflow (morning dispatch → evening reports)
- [ ] Phase 9: User information tracking

### Other
- [ ] **kanbanService.ts**: Complete TODO stubs (`deleteBoard`, `createColumn`, `deleteColumn`)
- [ ] **Multi-Tenancy Audit**: Verify Tenant A → Tenant B isolation
- [ ] **Agent Integration Test**: Verify Wo Agent works with real DB endpoints
- [ ] **Fix agent skill assignments**: claw (add skills), docs (add swedish-building-laws), kanban (add workers), fakturering (remove overloaded), projektledare (refactor)
- [ ] **Create orchestrator agent**: `.wo/agents/orchestrator.md` with `dispatch-agent` skill
- [ ] **Create dispatch-agent skill**: `.wo/skills/dispatch-agent/SKILL.md`

## Priority Order

1. **WOW-016** — Access Control, User Isolation & Daily Workflow (CRITICAL, blocks all user-facing features)
2. **WOW-010** — Human-in-the-Loop (critical, blocks AI writes)
3. **WOW-012** — Isolated Chat per Surface (UX critical, blocks WOW-013)
4. **WOW-013** — Orchestrator & GitHub for Construction (needs WOW-012 for surface agents)
5. **WOW-015** — Communication Architecture (core infra, needs WOW-013 for dispatch)
6. **WOW-014** — Bilingual Support (prepare for Sweden launch)
7. **WOW-004** — Production Readiness (launch blocker)
8. **WOW-007** — Per-User Channels (core infra, relates to WOW-015)
9. **WOW-009** — Offers & Invoices (frontend UI)
10. **WOW-011** — Time Verification (blocked on WOW-010)
11. **WOW-006** — Server refactoring (maintainability)
12. **WOW-008** — Pricing Engine (agent wiring)
13. **WOW-002/003/001** — Polish & infrastructure
