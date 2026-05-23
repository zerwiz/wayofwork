# Way of Work — Master TODO

**PRODUCTION READY NO MOCK DATA**

## 🤖 AI Assistant Instructions (Gemini/Pi)
When working on tickets below, you **MUST** activate the relevant custom skill to ensure compliance with the production architecture:
- Backend/DB tickets: `/skill wow_backend_dev` and `/skill wow_access_control`
- Frontend/UI tickets: `/skill wow_frontend_dev` and `/skill wow_ui_surfaces`
- Agent/Workflow tickets: `/skill wow_agent_dev` and `/skill wow_human_in_the_loop`
- Channel/Messaging tickets: `/skill wow_communications`

**CRITICAL RULE:** Whenever you complete a ticket or a significant phase of a ticket, you **MUST ALWAYS** update `CHANGELOG.md` with a summary of the changes made before finishing your turn.

## ✅ Done
- **Human-in-the-Loop (WOW-010)**: Implemented "Godkännandekö" with visual Diff Table and registered `suggest_change` tool for AI agents.
- **Time Verification Agent (WOW-011)**: Fully implemented variance analysis and morning/evening dispatch schedules.
- **Per-User Channels (WOW-007)**: Account linking and user-context message routing functional for Telegram/WhatsApp.
- **Economics Shield (WOW-004/016)**: Enforced across all APIs (Project, Portal, Client) to protect financial data from non-admins.
- **Modular Server (WOW-006 Phase 3-4)**: Extracted 2000+ lines from `server/index.ts` into modular handlers and `ws-handler.ts`.
- **Global Rebrand: Ollama → Wo AI**: Renamed internal functions, environment variables (WOP_AI_HOST/MODEL), and UI labels across `SimpleModelsView`, `HowToUseModal`, `HostDoctorModal`, and `MenuBar` for a unified "Way of Work AI" identity.
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
- **WOW-012 (UX)**: Consolidated Claw toolbar. Merged session strip into top bar, integrated chat tabs, and added "New"/"Workspace" buttons.
- **Help Center**: Updated `HowToUseModal.tsx` and settings views with rebranded "Way of Work" terminology and `.wo/` paths.
- **WOW-008**: Price list CRUD UI in Admin Console (Prislistor-tab).
- **WOW-008**: Skills `project-pricing`, `time-calculation` created.
- **WOW-009**: Offers & Invoices backend API (543 lines) + agents/skills created.
- **WOW-014**: Created — bilingual SV/EN support ticket.
- **WOW-015**: Created — communication architecture ticket (Telegram, WhatsApp, Email).
- [x] **WOW-016**: Created — CRITICAL access control, user isolation, daily workflow.
- **Agent-Skill mapping**: Documented in WOW-016. Missing skills identified for claw, docs, kanban.
- **Workspace structure**: `workspace/agent/sessions/`, `workspace/plans/` created. `.wo/README.md` added.
- **`.gitignore`**: Fixed to track repo-root `.wo/` but ignore workspace symlink + secrets. Removed `.wo/` blanket ignore.
- **WOW-003**: Multi-Tenancy AI Models — per-tenant LLM config via `tenant_configs` table, critical bug fix in tickets-api.ts, `resolveWoAiModelDefault` checks `tenant_configs` first.

## Remaining Tickets

**PRODUCTION READY NO MOCK DATA**

### WOW-001 — Fix routing/imports (P3+P5)
- [ ] Runtime paths audit
- [ ] Dead code & routing cleanup

### WOW-002 — Local Hosting for Remote Access
- [ ] Enable ngrok/cloudflared integration
- [ ] Document access setup

### WOW-004 — Production Readiness (DONE)
- [x] Launch-blocking items
- [ ] Real data migration from test data
- [x] API completion for client portal

### WOW-006 — Refactor server/index.ts
- [x] Phase 3: WebSocket handler (`server/ws-handler.ts`) extracted.
- [x] Phase 4: Route groups extracted: admin, claw, system, dev, channels.
- [x] Phase 5: Final cleanup. Target: `server/index.ts` < 500 lines. **Done — 236 lines.**

### WOW-007 — Per-User Channels & WhatsApp Time (DONE)
- [x] Phase 0: Admin channel management UI
- [x] Phase 1: User-channel link table (DB table exists, API implemented)
- [x] Phase 2: Route channel messages to user context
- [x] Phase 3: WhatsApp time workbot (NLP time parsing)
- [x] Phase 4: WhatsApp kanban notifications

### WOW-008 — Pricing Engine (agent verification)
- [x] Verify `projektledare` agent can read price lists and use skills
- [x] Wire agent → pricing API integration
  - Agent READ access to price lists implemented
  - Cost estimation workflows functional
  - Production-ready pricing tools for estimators

### WOW-009 — Offer & Invoice Agent (frontend UI)
- [x] Admin Console tab for offers/invoices
- [x] Document generation/send workflows in UI

### WOW-010 — Human-in-the-Loop (DONE)
- [x] `pending_changes` table exists, API endpoints implemented (POST create, GET list/detail, POST approve/reject)
- [x] Backend logic for applying approved changes to `price_lists`, `offers`, `tasks`, and `projects`
- [x] **⏳ Admin Console "Godkännandekö" tab with diff-view** (Implemented)
- [x] AI can only create pending_changes (not write directly) — enforced in agent prompts
- [x] All agents: price lists, planning, schedules use approval queue

### WOW-011 — Time Verification & Scheduling Agent (DONE)
- [x] Agent reads time reports + kanban plan
- [x] Variance reports and schedule proposals
- [x] Telegram morning dispatch (06:30)

### WOW-012 — Isolated Chat per Surface
- [x] symlink + docs agent (done)
- [x] WebSocket state isolation per surface
- [x] JSONL per surface: `wo-chat-<surface>-<sessionKey>.jsonl`
- [x] Auto-select agent: Claw→claw, Docs→docs, Kanban→kanban, Simple→Orchestrator
- [x] Generic auto-select in `SimpleChatView` (implemented in server websocket.open)
- [x] Agent cleanup on surface navigation (handled by session isolation)
- [x] Fix double-bubble at thinking (assistant_turn_start / assistant_delta merge)

### WOW-013 — Orchestrator & GitHub for Construction
- [x] Phase 1: GitHub simplification (Save Version / Version History buttons)
- [x] Phase 2: Automated daily backup (`backup/YYYY-MM-DD` branches, 30-day prune)
- [x] Phase 3: Agent skill `workspace-storage` for doc save/restore/history
- [x] Phase 4: Orchestrator rework — channel handler routes through orchestrator with `dispatch_agent` tool
- [x] Phase 5: Surface-specific agents (Claw→claw, Docs→docs, Kanban→kanban, Simple→Orchestrator)

### WOW-014 — Bilingual Support (SV/EN)
- [x] Phase 1: i18n infrastructure (locales JSON, useTranslation hook, user language setting)
- [/] Phase 2: UI translation (In progress: ActivityBar, SimpleNavRail localized)
- [ ] Phase 3: Agent language awareness (greeting, responses follow user language)
- [ ] Phase 4: Swedish legal content handling (always in Swedish regardless of UI language)

### WOW-015 — Communication Architecture
- [x] Phase 1: Unified inbound router (`server/channel-router.ts`)
- [x] Phase 2: Telegram webhook (replace polling, multi-bot, media handling)
- [x] Phase 3: WhatsApp inbound (webhook, wire up whatsapp-time-bot)
- [x] Phase 4: Email (SMTP + inbound forwarding)
- [x] Phase 5: Outbound notification tools (telegram_send, whatsapp_send)
- [x] Phase 6: Complete message audit trail

### WOW-016 — [CRITICAL] Access Control, User Isolation & Daily Workflow
- [x] Phase 1: Project membership system (`project_members` table)
- [x] Phase 2: Role-based data isolation (economics shield, worker isolation)
- [x] Phase 3: Per-user channel session persistence
- [x] Phase 4: Multi-bot support (Telegram + WhatsApp per tenant)
- [x] Phase 5: Time tracking privacy & bot isolation
- [x] Phase 6: Information access audit (`audit_logs` table)
- [x] Phase 7: Agent↔Skill mapping & Orchestrator dispatch
- [x] Phase 8: Daily planning workflow (morning dispatch → evening reports)
- [x] Phase 9: User information tracking

### WOW-017 — TA-Planner System Implementation
- [x] Database Schema: `ta_plans` table added
- [x] Backend API: `server/routes/ta-planner.ts` (CRUD + Trafikverket proxy)
- [x] Frontend UI: `src/pages/TAPlannerPage.tsx` (Planning Wizard)
- [x] Validation Engine: `src/utils/ta-validation.ts`
- [x] Sketch Library: TDOK 2024:0043 integration

### WOW-018 — Agent Ecosystem Expansion
- [x] Create specialized agents: `skyddsombud`, `maskinchef`, `kalkylator`
- [x] Create cross-cutting skills: `incident-reporting`, `logistics`, `cost-estimation`
- [x] Enhance Orchestrator with multi-agent handoff logic
- [x] Update Orchestrator dispatch mapping

### WOW-019 — Notification System (🟢 DONE - 2026-05-23)
- [x] Backend: notification API endpoints (GET /api/notifications, PATCH /read, DELETE)
- [x] Backend: `notifyUser()` persists to DB + sends to Telegram/WhatsApp
- [x] Frontend: NotificationToast component (bottom-right toast, 5s auto-dismiss)
- [x] Frontend: NotificationInbox in Settings (list, filter, mark read, delete)
- [x] Frontend: MenuBar badge wired to `unreadCount` from NotificationContext
- [x] Frontend: NotificationContext syncs with server API (30s poll)
- [x] Integration: Pending Changes approve/reject → notify submitter
- [x] Integration: Security audit events → notify user
- [x] Integration: Kanban card updates → notify assignee (was already wired)
- [x] Integration: Weather alerts (open-meteo, hourly check, >5mm rain or >15m/s wind)
- [x] Integration: ID06 expiry check (14-day warning, per project member)
- [x] Construction triggers service (`server/construction-triggers.ts`)

### WOW-020 — Bug Report & Feature Request System (🟢 NEW - 2026-05-22)
- [ ] Create bug report form component (modal)
- [ ] Create SUPER ADMIN dashboard (read-only from public reports)
- [ ] Implement status tracking workflow (pending → in-review → fixed → closed)
- [ ] Database schema (`bug_reports` table)
- [ ] API endpoints for submissions and admin actions
- [ ] System info capture (browser, OS, etc.)
- [ ] Screenshot/video attachment support
- [ ] Duplicate tracking

### Other
- [ ] **kanbanService.ts**: Complete TODO stubs (`deleteBoard`, `createColumn`, `deleteColumn`)
- [ ] **Multi-Tenancy Audit**: Verify Tenant A → Tenant B isolation
- [ ] **Agent Integration Test**: Verify Wo Agent works with real DB endpoints
- [x] **Fix agent skill assignments**: claw (add skills), docs (add swedish-building-laws), kanban (add workers), fakturering (remove overloaded), projektledare (refactor)
- [x] **Create orchestrator agent**: `.wo/agents/orchestrator.md` with `dispatch-agent` skill
- [x] **Create dispatch-agent skill**: `.wo/skills/dispatch-agent/SKILL.md`

## Priority Order

1. **WOW-016** — Access Control, User Isolation & Daily Workflow (CRITICAL, blocks all user-facing features)
2. **WOW-004** — Production Readiness (launch blocker)
3. **WOW-006** — Server refactoring (maintainability)
4. **WOW-010 (UI)** — Admin Console "Godkännandekö" tab (CRITICAL for agent compliance)
5. **WOW-017** — TA-Planner System Implementation (High)
6. **WOW-015** — Communication Architecture (core infra)
7. **WOW-007** — Per-User Channels (core infra)
8. **WOW-009** — Offers & Invoices (frontend UI)
9. **WOW-011** — Time Verification (blocked on WOW-010 UI)
10. **WOW-018** — Agent Ecosystem Expansion (Medium, enhances multi-agent capability)
11. **WOW-014** — Bilingual Support (prepare for Sweden launch)
12. **WOW-020** — Bug Report System (NEW - user feedback)
13. **WOW-013** — Orchestrator & GitHub for Construction (needs WOW-012)
14. **WOW-001/002/008** — Polish & infrastructure
15. **WOW-019** — Notification System (Moved to end per user request)

## ✅ Implementation Notes for New Tickets

### WOW-019 (Notification System)
- Store in localStorage (client-side) + optional WebSocket push
- Toast notifications on approve/reject changes
- Badge count in Navigation (unread messages)
- Integration with WOW-010 approval queue

### WOW-020 (Bug Report System)
- Public-facing form (any user can submit)
- SUPER ADMINS-only dashboard for review
- Status tracking with workflow states
- No end-user notifications on submission (internal only)
- System info auto-captured (browser, OS, etc.)

---

**Generated**: 2026-05-22  
**Last edited**: 2026-05-22 (added WOW-019, WOW-020)
