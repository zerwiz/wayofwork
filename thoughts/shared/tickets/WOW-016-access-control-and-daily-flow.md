# WOW-016 [CRITICAL] Access Control, User Isolation & Daily Workflow

## Problem Statement

The platform has NO meaningful access control beyond tenant-level RBAC. Any user in a tenant can see any project, any kanban board, any task — including economics data. Workers can see other workers' time, project budgets, and financial information that should be admin-only.

There is no `project_members` table. Board members are stubbed (`kanbanService.getBoardMembers()` returns `[]`). Channel bots (Telegram, WhatsApp) have no session persistence per user and no user-level data isolation. The daily planning workflow (admin plans → system dispatches → workers respond → admin reviews) is entirely manual.

**Gaps discovered during audit:**

| Area | Current State | Severity |
|---|---|---|
| Project/board membership | No `project_members` table. Any tenant user sees all projects. | CRITICAL |
| Economics isolation | Workers can query project budgets via API. No column-level access control. | CRITICAL |
| Per-user data isolation | Workers can see other workers' tasks, time entries, assignments. | CRITICAL |
| Channel session persistence | Each Telegram message is stateless. No per-user session history. | HIGH |
| Multi-bot support | Single Telegram bot, hardcoded tenant `'default'`. | HIGH |
| Time tracking privacy | Bot can see ALL time entries, could leak between users. | HIGH |
| Information access audit | No tracking of what data each user requests. | MEDIUM |
| Daily planning flow | No automated morning dispatch, no schedule generation. | MEDIUM |
| Worker notification | Workers have to manually check. No proactive channel messages. | MEDIUM |
| Schema drift | `db.ts` and `schema.sql` diverged. Missing columns referenced in code. | HIGH |

## Desired Outcome

A secure, role-isolated platform where:

1. **Project/Board membership** — Admins explicitly add/remove users to/from projects (boards). Users only see projects they're members of.
2. **Economics isolation** — `WORKER` and `LEADER` roles NEVER see financial data (budgets, price lists, costs, offers, invoices, totals). Only `ADMIN` and `SUPER_ADMIN` can access economics.
3. **Per-user data isolation** — Workers see only their own tasks, their own time entries, their own assignments. Leaders see team tasks but not economics. Admins see everything.
4. **Channel session persistence** — Each channel user (Telegram ID, WhatsApp number) has their own isolated session history. Sessions persist across messages.
5. **Multi-bot support** — Platform supports multiple Telegram bots and multiple WhatsApp Business accounts per tenant.
6. **Time tracking privacy** — Channel bot knows WHICH user is reporting time and NEVER reveals other users' time data.
7. **Information access audit** — ALL queries to sensitive data are logged with user ID, timestamp, and what was accessed.
8. **Daily planning workflow** — Works exactly as described:
   - Admin creates project (kanban board)
   - Admin assigns users to cards
   - System sends daily morning messages with tasks
   - Workers report progress/time via channels
   - System updates their info
   - Admin sees overview
   - System helps admin plan next day
9. **Agent↔Skill mapping** — Every agent has exactly the skills it needs. Orchestrator dispatches the right agent for the right task.

## Requirements

### Phase 1: Project Membership System (`project_members` table)

The single most critical missing piece. Without this, NO access control is possible.

- [ ] Create `project_members` table:
  ```sql
  CREATE TABLE project_members (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,       -- FK to projects
    user_id TEXT NOT NULL,          -- FK to users
    tenant_id TEXT NOT NULL,        -- FK to tenants
    role_in_project TEXT DEFAULT 'worker',  -- 'admin', 'leader', 'worker', 'viewer'
    added_by TEXT,                  -- FK to users (who added them)
    added_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE(project_id, user_id)
  );
  ```
- [ ] Create API endpoints:
  - `POST /api/projects/:id/members` — Add member (ADMIN only)
  - `DELETE /api/projects/:id/members/:userId` — Remove member (ADMIN only)
  - `GET /api/projects/:id/members` — List members (ADMIN, LEADER)
  - `GET /api/projects/mine` — List projects where current user is a member
- [ ] Migrate all existing project queries to filter by membership:
  - `GET /api/projects` → if WORKER, only return projects where user is member
  - `GET /api/portal/tasks` → if WORKER, only return tasks in member projects
  - `GET /api/projects/:id` → verify membership (or ADMIN bypass)
- [ ] Frontend: Wire up `BoardMembers.tsx` to real API (currently returns `[]`)
- [ ] Frontend: "My Projects" view for workers that only shows their assigned boards
- [ ] Seed migration: Add all existing users as members of all existing projects in their tenant (backwards compat)

### Phase 2: Role-Based Data Isolation

#### Economics Shield

- [ ] Audit ALL API endpoints for economics data exposure:
  - `GET /api/projects/:id` — Strip `budget_allocated` for non-ADMIN
  - `GET /api/portal/tasks` — Strip `estimated_hours * hourly_rate` calculations
  - `GET /api/price-lists` — BLOCK for non-ADMIN (403)
  - `GET /api/offers` — BLOCK for non-ADMIN
  - `GET /api/invoices` — BLOCK for non-ADMIN
  - `GET /api/admin/stats` — BLOCK for non-ADMIN
- [ ] Create `isEconomicsRoute(path)` helper that returns 403 for WORKER/LEADER
- [ ] Create `stripEconomicsData(obj)` helper that removes budget/cost/price fields
- [ ] Add `SUPER_ADMIN` bypass for cross-tenant economics access
- [ ] Agent level: Add economics isolation to ALL agent system prompts
- [ ] Agent level: When agent queries data for a WORKER user, NEVER include project budget, price lists, costs

#### Worker Data Isolation

- [ ] `GET /api/portal/tasks` — WORKER sees ONLY tasks WHERE `assigned_to = auth.userId`
- [ ] `GET /api/time_entries` — WORKER sees ONLY their own entries
- [ ] `GET /api/time_blocks` — WORKER sees ONLY their own blocks
- [ ] `GET /api/projects` — WORKER sees ONLY projects where they are a member (via Phase 1)
- [ ] `GET /api/portal/time` — WORKER sees ONLY their own time
- [ ] All list endpoints: Add `auth.role === 'WORKER' ? user_id = auth.userId` filter

#### Leader Scope

- [ ] `LEADER` sees: All tasks/projects in their tenant (but NO economics)
- [ ] `LEADER` sees: All workers' time entries for their projects
- [ ] `LEADER` can: Assign tasks, update status, review time
- [ ] `LEADER` cannot: Access price lists, offers, invoices, budgets

### Phase 3: Per-User Channel Session Persistence

Currently, Telegram bot processes each message independently with no session continuity. This means:
- No conversation context ("What were we talking about?")
- No user state ("Have I already asked for your project number?")
- No ability to maintain multi-turn workflows

- [ ] Create channel session store keyed by `{channel}-{channelUserId}`:
  ```
  agent/sessions/channel/telegram/<telegramUserId>.jsonl
  agent/sessions/channel/whatsapp/<phoneNumber>.jsonl
  ```
- [ ] Each channel session is fully isolated — NO shared state between users
- [ ] Session loaded on each inbound message, appended after each turn
- [ ] Session includes `channel`, `channelUserId`, `platformUserId` in metadata
- [ ] Session retention: 7 days since last activity, configurable
- [ ] Session context window: trim to last 20 messages (configurable)
- [ ] Bot response includes session context — "Last time you asked about X..."

#### Implementation in channel-router.ts

```
function handleInboundChannelMessage(channel, channelUserId, text):
  1. Resolve platform user via user_channel_links
  2. Load session: agent/sessions/channel/{channel}/{channelUserId}.jsonl
  3. If no session → new session with system prompt
  4. Append user message to session
  5. Run AI turn with session context
  6. Append assistant response to session
  7. Send response back through channel
  8. Log to channel_message_logs
```

### Phase 4: Multi-Bot Support

- [ ] `bot_telegram_accounts` table already exists. Add API:
  - `GET /api/admin/channels/telegram/bots` — List bots
  - `POST /api/admin/channels/telegram/bots` — Register bot (token, label)
  - `DELETE /api/admin/channels/telegram/bots/:id` — Remove bot
- [ ] Update `telegram-bot.ts`:
  - Poll ALL active bots (not just `WOP_TELEGRAM_BOT_TOKEN`)
  - Each bot runs independently with its own `lastUpdateId`
  - Bot registration uses the bot's actual tenant from `bot_telegram_accounts`
- [ ] Remove hardcoded `tenant_id = 'default'` in bot registration
- [ ] Webhook mode: Each bot gets its own webhook URL: `/api/channels/telegram/webhook/:botId`
- [ ] Admin Console: "Channel Bots" tab showing all bots with status (online/offline)
- [ ] WhatsApp: Support multiple business accounts from `bot_whatsapp_accounts`

### Phase 5: Time Tracking Privacy & Bot Isolation

- [ ] Time bot (`whatsapp-time-bot.ts`) receives message → resolves user → logs time for THAT USER ONLY
- [ ] Time bot NEVER queries or displays other users' time data
- [ ] When worker asks "How many hours did I work this week?" → only returns THEIR hours
- [ ] When worker asks "How many hours did [other worker] work?" → BLOCKED ("You can only view your own time")
- [ ] Leader can query their team's time: "Show me the team's hours this week" → returns aggregated per worker
- [ ] Admin can query ALL time, including cost calculations
- [ ] Channel bot system prompt includes: `YOU MUST NEVER reveal other users' time, task, or personal data. Only answer for the authenticated user.`

### Phase 6: Information Access Audit

- [ ] Create actual `audit_logs` table (exists in schema.sql but NOT in db.ts):
  ```sql
  CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,       -- 'query', 'create', 'update', 'delete', 'view'
    resource_type TEXT NOT NULL, -- 'project', 'task', 'time_entry', 'price_list', 'offer', etc.
    resource_id TEXT,
    summary TEXT,               -- Human-readable: "Worker X viewed project Y budget"
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  ```
- [ ] Log ALL economics queries: who accessed price lists, budgets, offers, invoices
- [ ] Log ALL worker→other-worker data queries (attempted access violations)
- [ ] Log ALL admin data views (for accountability)
- [ ] Admin Console: "Audit Log" tab with filtering by user, action, date range
- [ ] Audit log retention: 90 days (configurable)

### Phase 7: Agent↔Skill Mapping & Orchestrator Dispatch

#### Current Agent-Skill Mapping (after fixes)

| Agent | Surface | Skills | Purpose |
|---|---|---|---|
| **orchestrator** | Simple + Channels | `dispatch-agent` | Routes messages to correct agent. NEVER answers directly. |
| **claw** | Claw (web + Telegram) | `client-communication`, `kanban-time`, `workers`, `time-calculation` | General assistant, handles channel conversations |
| **docs** | Docs | `document-generation`, `swedish-building-laws` | Documentation generation |
| **kanban** | Kanban | `kanban-time`, `workers` | Board management |
| **fakturering** | — (sub-agent) | `document-generation`, `client-communication`, `project-pricing` | Offers & invoices. Sub-agent of Orchestrator. |
| **forskare** | — (sub-agent) | `research`, `project-pricing` | Web research for prices/certifications. Sub-agent. |
| **projektledare** | — (sub-agent) | `kanban-time`, `ata`, `workers`, `safety`, `swedish-building-laws`, `project-pricing`, `time-calculation` | Full project management. Heavy agent, on-demand only. |
| **schemaplanerare** | — (sub-agent) | `scheduling`, `kanban-time`, `workers`, `client-communication` | Daily planning + morning dispatch. Sub-agent. |
| **ata** | — (sub-agent) | `ata`, `research`, `swedish-building-laws` | ÄTA change orders. Sub-agent. |

#### Orchestrator Dispatch Rules

```
Orchestrator receives message
  → Determine intent:
    → "create offer/invoice" → dispatch fakturering
    → "research price/certification" → dispatch forskare
    → "ÄTA/ticket" → dispatch ata
    → "planning/schedule" → dispatch schemaplanerare
    → "project management" → dispatch projektledare
    → "document/report" → dispatch docs
    → "board/card/time" → relay to kanban agent
    → "general chat/Telegram" → relay to claw agent
    → "unclear" → ask clarifying question
  → Orchestrator NEVER fabricates data or answers queries directly
  → Orchestrator ONLY routes and summarizes sub-agent responses
```

#### New Skill: `dispatch-agent`

- [ ] Create `.wo/skills/dispatch-agent/SKILL.md`:
  - Describes how Orchestrator determines intent
  - Lists all available agents with their skills and purposes
  - Rules: never answer directly, always dispatch
- [ ] This skill is ONLY assigned to Orchestrator agent

#### Fix Existing Agent Skills

- [ ] **claw**: Add skills `client-communication`, `kanban-time`, `workers`, `time-calculation`
- [ ] **kanban**: Add skill `workers` (needs to list/assign workers)
- [ ] **docs**: Add skill `swedish-building-laws` (needs legal context for documents)
- [ ] **fakturering**: REMOVE `research`, `swedish-building-laws` (overloaded). Keep: `document-generation`, `client-communication`, `project-pricing`
- [ ] **forskare**: Keep as-is: `research`, `project-pricing`
- [ ] **projektledare**: REMOVE `kanban-time`, `workers` (dependencies, not direct executor). Keep: `ata`, `safety`, `swedish-building-laws`, `project-pricing`, `time-calculation`, `research`
- [ ] **schemaplanerare**: Keep as-is: `scheduling`, `kanban-time`, `workers`, `client-communication`
- [ ] **ata**: Add `swedish-building-laws` (legal context for ÄTA). Keep: `ata`, `research`
- [ ] **Create orchestrator agent**: `.wo/agents/orchestrator.md` with skill `dispatch-agent`

### Phase 8: Daily Planning Workflow

This is the end-to-end workflow the system must support:

#### Morning (06:30 automated)

1. `schemaplanerare` agent runs daily trigger:
   - Queries all active projects (kanban boards) for today
   - For each project, gets incomplete cards sorted by priority/deadline
   - For each worker, compiles their assigned cards for today
   - Sends individual channel messages to EACH worker:
     ```
     God morgon [Name]! Här är dagens uppgifter:

     Projekt: [Project Name]
     🟢 [Priority] [Card Title] — [Estimated hours]h
     🟡 [Priority] [Card Title] — [Estimated hours]h

     Svara med dina tidsrapporter under dagen.
     ```
   - Sends summary to admin/leader:
     ```
     Dagens planering — [Project Name]:
     👷 [Worker 1]: 3 cards, 7.5h
     👷 [Worker 2]: 2 cards, 6h
     ...
     ```

#### During Day (real-time)

2. Worker responds on Telegram/WhatsApp:
   - "Done with [card name]" → bot updates status to `complete`
   - "4.5h on [card name]" → bot logs time entry
   - "Blocked on [card name] because..." → bot flags card
   - All updates go through `POST /api/pending-changes` for admin approval

#### End of Day (18:00 automated)

3. `schemaplanerare` runs evening trigger:
   - Compares planned vs actual hours per worker per card
   - Generates variance report for admin:
     ```
     Dagens avvikelser:
     ❌ [Worker] — [Card]: planerat 4h, rapporterat 6h (+50%)
     ✅ [Worker] — [Card]: planerat 3h, rapporterat 2.5h (-17%)
     ```
   - Proposes next day's schedule based on remaining work

#### Admin Review

4. Admin reviews variance report + proposed schedule
5. Admin approves/modifies via Admin Console or chat
6. Approved schedule becomes next day's plan
7. Next morning 06:30: cycle repeats

### Phase 9: User Information Tracking

- [ ] Track per-request what data each user accesses:
  - Which projects did they view?
  - Which tasks did they read?
  - Which time entries did they query?
  - What search terms did they use?
- [ ] Store in `audit_logs` with `resource_type`, `resource_id`, `summary`
- [ ] Admin Console: "User Activity" view showing per-user query history
- [ ] Flag anomalous access patterns (worker querying 50 projects in 1 minute)

### Frontend Changes

- [ ] **BoardMembers.tsx**: Wire to real `POST /api/projects/:id/members` API
- [ ] **Project list**: For WORKER role, show only "My Projects" (filtered by membership)
- [ ] **Task list**: For WORKER role, show only assigned tasks
- [ ] **Economics tabs**: Hide "Prislistor", "Offert", "Faktura" from non-ADMIN users
- [ ] **Time entries**: For WORKER, show only own entries
- [ ] **Admin Dashboard**: Show ECONOMICS only for ADMIN users
- [ ] **Worker Portal**: No economics data AT ALL — only tasks, time, schedule
- [ ] **Channel Bots Admin UI**: Manage Telegram/WhatsApp bots per tenant

### Database Schema Changes

- [ ] Add `project_members` table (see Phase 1)
- [ ] Create actual `audit_logs` table (exists in schema.sql, missing in db.ts)
- [ ] Fix schema drift: add missing columns to `tasks` in db.ts (`kanban_card_id`, `kanban_board_id`, `actual_hours`)
- [ ] Add `budget_allocated` and `budget_spent` to `projects` in db.ts (exist in schema.sql)
- [ ] Add index on `tasks(assigned_to)` for worker queries
- [ ] Add index on `project_members(project_id, user_id)` for membership lookups

## Acceptance Criteria

### Automated Verification
- [ ] Build completes: `bun run build`

### Security Verification
- [ ] WORKER calls `GET /api/price-lists` → 403 Forbidden
- [ ] WORKER calls `GET /api/offers` → 403 Forbidden
- [ ] WORKER calls `GET /api/projects` → ONLY member projects returned
- [ ] WORKER calls `GET /api/portal/tasks` → ONLY assigned tasks returned
- [ ] WORKER views another worker's time via bot → "Cannot view other users' data"
- [ ] LEADER calls `GET /api/price-lists` → 403 Forbidden
- [ ] LEADER can view all team tasks (no economics)
- [ ] ADMIN can view everything including economics
- [ ] Unlinked Telegram user messages bot → "Link your account" message
- [ ] Linked Telegram user → session persists across messages

### Workflow Verification
- [ ] Admin creates project + adds members → members see project
- [ ] Admin assigns worker to card → worker sees card in their view
- [ ] Morning dispatch sends personalized messages to each worker
- [ ] Worker "4.5h on [card]" via Telegram → time entry created
- [ ] Worker "Done with [card]" → status changes, admin notified
- [ ] Evening variance report generated
- [ ] Admin approves next day's schedule
- [ ] Next morning dispatch uses approved schedule

## Architectural Notes

### Agent→Skill→Surface Mapping (Definitive)

```
                    ┌──────────────────────────────────────────────────┐
                    │                 ORCHESTRATOR                      │
                    │         Skills: dispatch-agent                    │
                    │  Receives ALL inbound channel messages            │
                    │  Routes to correct sub-agent by intent            │
                    └──────┬───────┬───────┬───────┬───────┬───────┬───┘
                           │       │       │       │       │       │
         ┌─────────────────┘       │       │       │       │       └──────────────┐
         ▼                          ▼       ▼       ▼       ▼                      ▼
   ┌──────────┐   ┌──────────┐  ┌──────┐ ┌────┐ ┌──────────┐ ┌──────────┐  ┌────────────┐
   │   CLAW   │   │   DOCS   │  │KANBAN│ │ATA │ │FAKTUR-   │ │FORSKARE  │  │SCHEMA-     │
   │  Surface │   │  Surface │  │Surf. │ │Sub │ │ERING Sub │ │Sub       │  │PLANERARE   │
   │          │   │          │  │      │ │    │ │          │ │          │  │Sub         │
   │Skills:   │   │Skills:   │  │Skills│ │Skills│Skills:  │ │Skills:   │  │Skills:     │
   │• client- │   │• doc-gen │  │• kan-│ │• ata│• doc-gen │ │• research │  │• scheduling│
   │  comm    │   │• swedish │  │  ban-│ │• res│• client  │ │• project- │  │• kanban-   │
   │• kanban- │   │  building│  │  time│ │• swe│  -comm   │ │  pricing  │  │  time      │
   │  time    │   │  laws    │  │• wor-│ │  bld│• project-│ │           │  │• workers   │
   │• workers │   │          │  │  kers│ │  laws│  pricing │ │           │  │• client-   │
   │• time-   │   │          │  │      │ │     │          │ │           │  │  comm      │
   │  calc    │   │          │  │      │ │     │          │ │           │  │            │
   └──────────┘   └──────────┘  └──────┘ └────┘ └──────────┘ └──────────┘  └────────────┘
```

### Data Flow: Worker Messages via Channel

```
Worker (Telegram user 12345)
  → Telegram Bot API (webhook)
  → POST /api/channels/telegram/webhook
  → channel-router.ts:
    1. Resolve user: user_channel_links WHERE channel='telegram' AND channel_user_id='12345'
    2. Load session: agent/sessions/channel/telegram/12345.jsonl
    3. Check role: WORKER → apply WORKER data isolation
    4. Route to Orchestrator
    5. Orchestrator determines intent:
       - Time report → dispatch claw with time-logging context
       - Task update → dispatch claw with kanban context
       - Schedule query → dispatch schemaplanerare
    6. Sub-agent executes with tenant + userId + role context
    7. Sub-agent filters ALL queries by:
       - assigned_to = userId (tasks)
       - user_id = userId (time entries)
       - project membership (projects)
    8. Response assembled, sent back through Telegram
    9. Session appended, audit logged
```

### Economics Isolation Strategy

```
Route level:
  if (auth.role === 'WORKER' || auth.role === 'LEADER') {
    if (isEconomicsRoute(path)) return 403;
  }

Data level:
  function stripEconomicsForRole(data, role) {
    if (role === 'WORKER' || role === 'LEADER') {
      delete data.budget_allocated;
      delete data.budget_spent;
      delete data.total_amount;
      delete data.vat_amount;
      delete data.grand_total;
      delete data.unit_price;
      // etc.
    }
    return data;
  }

Agent level:
  System prompt includes: "The user's role is {role}. If role is WORKER or LEADER,
  you MUST NOT access price lists, offers, invoices, budgets, or any financial data.
  You MUST NOT reveal other workers' time, tasks, or personal data."
```

### Session Isolation Per Channel User

```
Session key format: channel-{channel}-{channelUserId}
Example: channel-telegram-123456789

Session file location:
  workspace/agent/sessions/channel/telegram/123456789.jsonl

Session lifecycle:
  1. First message → create session with system prompt
  2. Each message → append to session, run AI with full context
  3. Session trim → keep last 20 messages (configurable)
  4. Inactivity → session expires after 7 days (configurable)

User isolation:
  Session files are namespaced by channelUserId.
  User A (ID: 123) CANNOT access User B's (ID: 456) session.
  The resolve step in channel-router ensures correct ownership.
```

### Breaking Changes

- Existing users who are NOT members of any project will see empty project lists after Phase 1
- Need migration: on deploy, add all existing users as members of all projects in their tenant
- API responses for WORKER role will have stripped economics data
- Some existing agent prompts need updating for economics isolation
- `kanbanService.getBoardMembers()` will start returning real data instead of `[]`

### Migration Strategy

1. Add `project_members` table
2. Run migration: `INSERT INTO project_members SELECT ... FROM projects, users WHERE same tenant`
3. Deploy new API filters (workers see only member projects)
4. Deploy economics isolation (workers get 403 on economics endpoints)
5. Update agent system prompts
6. Deploy channel session persistence
7. Deploy multi-bot support
8. Deploy daily planning automation

### Files to Create/Modify

| File | Action | Purpose |
|---|---|---|
| `server/db.ts` | Modify | Add `project_members`, `audit_logs`, fix schema drift |
| `server/index.ts` | Modify | Add project member endpoints, add role-based filtering |
| `server/routes/portal.ts` | Modify | Worker data isolation filters |
| `server/routes/admin.ts` | Modify | Audit log views, bot management, project members |
| `server/channel-router.ts` | Create (WOW-015) | Unified message router with session + isolation |
| `server/telegram-bot.ts` | Modify | Multi-bot, webhook, session support |
| `server/whatsapp-time-bot.ts` | Modify | Wire into channel-router, privacy isolation |
| `server/audit-logger.ts` | Create | Audit log helper |
| `server/economics-guard.ts` | Create | Economics isolation middleware/helper |
| `server/wop-session-jsonl.ts` | Modify | Channel session key prefix support |
| `server/session-prompts.ts` | Modify | Per-role system prompts |
| `.wo/agents/orchestrator.md` | Create | Orchestrator agent with dispatch-agent skill |
| `.wo/agents/claw.md` | Modify | Add skills: client-communication, kanban-time, workers, time-calculation |
| `.wo/agents/kanban.md` | Modify | Add skill: workers |
| `.wo/agents/docs.md` | Modify | Add skill: swedish-building-laws |
| `.wo/agents/fakturering.md` | Modify | Remove overloaded skills (research, swedish-building-laws) |
| `.wo/agents/projektledare.md` | Modify | Refactor skills (remove kanban-time, workers) |
| `.wo/agents/ata.md` | Modify | Add skill: swedish-building-laws |
| `.wo/skills/dispatch-agent/SKILL.md` | Create | Orchestrator dispatch skill |
| `src/services/kanbanService.ts` | Modify | Wire BoardMembers to real API |
| `src/pages/AdminDashboard.tsx` | Modify | Audit log view, bot management |
| `src/components/kanban/BoardMembers.tsx` | Modify | Connect to real backend |
| `src/components/...` | Modify | Hide economics from non-ADMIN |

## Depends On

- **WOW-010**: Human-in-the-Loop (pending_changes API needed for daily planning workflow)
- **WOW-012**: Isolated Chat per Surface (session isolation pattern)
- **WOW-013**: Orchestrator dispatch_agent tool (needed for agent routing)
- **WOW-015**: Communication Architecture (channel-router, Telegram webhook, WhatsApp inbound)

## Priority

**CRITICAL** — This is the #1 priority. The platform cannot launch without this. Workers must NEVER see economics data. Projects must be isolatable per user.

---

## Meta

**Created**: 2026-05-22
**Priority**: CRITICAL — supersedes WOW-007, part of WOW-010/011/015
**Estimated Effort**: XXL (3-4 weeks)
