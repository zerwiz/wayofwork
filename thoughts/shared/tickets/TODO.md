# Way of Work — Master TODO

**PRODUCTION READY NO MOCK DATA**

## 🤖 AI Assistant Instructions (Gemini/Pi)
When working on tickets below, you **MUST** activate the relevant custom skill to ensure compliance with the production architecture:
- Backend/DB tickets: `/skill wow_backend_dev` and `/skill wow_access_control`
- Frontend/UI tickets: `/skill wow_frontend_dev` and `/skill wow_ui_surfaces`
- Agent/Workflow tickets: `/skill wow_agent_dev` and `/skill wow_human_in_the_loop`
- Channel/Messaging tickets: `/skill wow_communications`

**CRITICAL RULE:** Whenever you complete a ticket or a significant phase of a ticket, you **MUST ALWAYS** update `CHANGELOG.md` with a summary of the changes made before finishing your turn.

> **Note:** Individual ticket files (`thoughts/shared/tickets/WOW-*.md`) are design/spec documents. Their checklists were not retroactively updated after implementation. TODO.md is the authoritative live status tracker.

## ✅ Done

### Core Infrastructure
- **WOW-005**: Plan mode kept (cancelled).
- **WOW-006**: `server/index.ts` refactored from 1846 → 236 lines. All route groups extracted.
- **WOW-012**: Isolated Chat per Surface — WebSocket isolation, JSONL per surface, auto-select agent (Claw→claw, Docs→docs, Kanban→kanban, Simple→Orchestrator), double-bubble fix, symlink + docs agent.
- **WOW-013**: Orchestrator & GitHub — Save Version / Version History, daily backup (30-day prune), workspace-storage skill, channel handler routes through Orchestrator with `dispatch_agent`, surface-specific agents.
- **WOW-026**: Chat Architecture Documentation & Session Isolation (Verified agent assignments, updated documentation, enforced strict session isolation per UI surface).

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

## 🔴 Remaining (Confirmed Incomplete)

### WOW-001 — Fix routing/imports (P3+P5)
- [ ] **P5: Dead code & routing cleanup** — decide fate of excluded menu files, add missing server endpoints (`PUT /api/portal/me`, `POST /api/portal/change-pin`), fix `/api/admin/stats` role gating for ADMIN, decide fate of "technical" uiMode, clean up Dashboard.tsx, audit orphaned server routes.
- [ ] **Acceptance**: build passes (zero tsc errors), all client routes render correct components, start.sh launches without errors, login flow lands on correct page per role.

### WOW-002 — Local Hosting for Remote Access (🟡 IN PROGRESS)
- [ ] Verify Tunnel Gate (`WOP_TUNNEL_GATE_HOST_MARKERS`)
- [ ] Configure Basic Auth (tunnel-gate.v1.json)
- [ ] LAN Access Verification (`guessLanIPv4`)
- [ ] Port Management (Vite + Bun consistent)
- [ ] Electron Integration
- [ ] Manual testing: access from mobile on same Wi-Fi, access from external network via ngrok

### WOW-004 — Production Readiness (Partial)
- [x] Launch-blocking items (done per CHANGELOG)
- [ ] **Real data migration from test data** — still pending
- [x] API completion for client portal

### WOW-014 — Bilingual Support (SV/EN) (Partial)
- [x] Phase 1: i18n infrastructure (locales JSON, useTranslation hook, user language setting, server detection)
- [/] Phase 2: UI translation (ActivityBar, SimpleNavRail localized; more pages remain)
- [ ] Phase 3: Agent language awareness (greeting, responses follow user language)
- [ ] Phase 4: Swedish legal content handling (always in Swedish regardless of UI language)

### WOW-016 — [CRITICAL] Access Control (Phases 1-2 Frontend) (Partial)
- [ ] Phase 1 Frontend: BoardMembers component, project list role-gating, task list role-gating
- [ ] Phase 2 Frontend: Client Dashboard economics tabs accessible only to admin roles
- [ ] Database Schema: verify indexes, fix any drift

### Other
- [ ] **kanbanService.ts**: Complete TODO stubs (`deleteBoard`, `createColumn`, `deleteColumn`)
- [ ] **Multi-Tenancy Audit**: Verify Tenant A → Tenant B data isolation in all endpoints
- [ ] **Agent Integration Test**: Verify Wo Agent works with real DB endpoints
- [ ] **WOW-008**: Agent wiring verification — confirm `projektledare` reads price lists end-to-end
- [ ] **WOW-009**: Verify offer/invoice send via TG/WA works end-to-end
- [ ] **WOW-022**: General Updates and Fixes (Claw Workspace Onboarding)
- [ ] **WOW-023**: Docs Page (Investigate the need for a dedicated `DocsApp` for documents, distinct from general file viewing)
- [ ] **WOW-024**: Private & Shared Access Control for Kanban, Docs, and Files (Schema implemented, RBAC utility implemented, API integration pending, UI pending)
- [ ] **WOW-025**: Wo Agent Management and "My AI Team" Restoration
- [ ] **WOW-027**: Systematic Rebrand: wayofpi → wayofwork, Technical → Simple/Claw (Cosmetic rebranding in progress, "Technical" components tracking, structural migration deferred)
- [🟡 IN PROGRESS] **WOW-028**: Mobile-First UI/UX Design and Implementation (Detailed plan drafted)
- [ ] **WOW-029**: Refactor AdminDashboard.tsx into Smaller Components
- [ ] **WOW-029**: Refactor AdminDashboard.tsx into Smaller Components
- [ ] **CRITICAL: Build Errors**: Application currently fails to compile due to TypeScript errors in `src/components/MenuBar.tsx` and `src/components/menubar/ViewMenu.tsx`. These are being addressed via manual structural and import fixes for JSX and helper functions.
- [ ] **CRITICAL: API Errors**: Investigate and fix:
    - `GET /api/admin/users` returning 404 Not Found.
    - `GET /api/portal/tasks` returning 500 Internal Server Error.
    - `GET /api/admin/llm-providers` returning 500 Internal Server Error.
    - WebSocket connection failure for `kanban` surface.

### Refactoring & Maintenance
- [ ] **WOW-028**: Modularize `src/components/MenuBar.tsx` into smaller sub-components.
- [ ] **WOW-029**: Modularize `src/components/work/kanban/WorkBoard.tsx` into smaller sub-components.
- [ ] **WOW-029**: Refactor AdminDashboard.tsx into Smaller Components.

## Priority Order

1. **WOW-004** — Real data migration (launch blocker)
2. **WOW-014 Phases 3 & 4** — Agent language awareness + Swedish legal content (Sweden launch)
3. **WOW-002** — Remote hosting (ngrok/cloudflared) for mobile access
4. **WOW-001 P5** — Routing cleanup & polish
5. **WOW-016 Frontend** — Phase 1-2 frontend access control wiring
6. **Multi-Tenancy Audit** — Verify isolation
7. **Agent Integration Test** — End-to-end agent verification
8. **kanbanService.ts stubs** — Minor cleanup

---

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

**Generated**: 2026-05-23  
**Last edited**: 2026-05-23 (comprehensive audit: reconciled 21 ticket files vs TODO.md)
