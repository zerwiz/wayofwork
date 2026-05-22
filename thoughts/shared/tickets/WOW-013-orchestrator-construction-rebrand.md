# Orchestrator Rebrand: Construction Work Portal

## Current state

### Skills: parsed but dead

`server/agents.ts` parses a `skills:` field from agent `.md` frontmatter:

```yaml
---
name: inspector
description: Site inspector agent
skills: "safety,quality,photos"
---
```

The parsed value lands in `AgentMeta.skills` (`agents.ts:13,61`) but is **never read again**. When
the agent body is composed into the LLM system prompt (`session-prompts.ts:134-158`), only
`agent.body` (content after frontmatter) is used.

**Result:** the `skills` string is silently discarded. No skill files are loaded, no skill
instructions are injected, and no tool filtering occurs.

### Tool surface is 100 % software engineering

The orchestrator exposes two tool registries:

| Registry | Tools |
|---|---|
| `ORCHESTRATOR_TOOLS_OPENAI` | read, list_dir, grep, write, bash, team_list, team_member_add/remove/replace |
| `ORCHESTRATOR_GIT_TOOLS_OPENAI` | git_status, git_remote, git_fetch, git_pull, git_push, git_branches, git_checkout, git_merge, git_add, git_commit |

Every git tool describes GitHub workflows (branches, PRs, merge, push). The system prompt
(`session-prompts.ts`) talks about "repo", "commit", "PR", "feature branch".

### No skill-loading pipeline exists

There is no infrastructure to:
- Resolve a skill name (e.g. `"safety"`) to a skill definition file
- Inject skill instructions into the agent system prompt
- Selectively enable/disable tools per-agent based on skills

---

## Target: Construction Work Portal

### Core domains

| Domain | What it means for AI tools |
|---|---|
| **Documents** | Blueprints (PDF), specs, RFIs, submittals, CORs, change orders |
| **Photos & media** | Site photos, drone images, inspection videos |
| **Tasks & inspections** | Punch lists, safety inspections, daily logs |
| **Team coordination** | Contractors, subs, foremen, office staff |
| **Scheduling** | Milestones, deliveries, weather delays |
| **Quality & safety** | Incident reports, safety meetings, QC checklists |

### What to keep from current tools

| Tool | Keep? | Reason |
|---|---|---|
| read / list_dir / grep / write | **Yes** | File/document access is universal |
| bash | **Maybe** | Only if WOP_ALLOW_TERMINAL is on — useful for |
| team_list / team_member_* | **Yes** | Rename to "crew" vocabulary |
| git_status / git_fetch / git_pull / … | **Repurpose** | GitHub tracks document versions, not code |
| git_push / git_checkout / git_merge / git_add / git_commit | **Rename** | Document check-in/check-out / versioning |

---

## Skills to build

### 1. Kanban board skills — full CRUD for boards, columns, and cards

The kanban system maps to the existing project/task API layer:

| Kanban concept | Backend entity | API |
|---|---|---|
| Board | Project | `GET/POST /api/projects`, `PUT/DELETE /api/projects/:id` |
| Card | Task (`portal/tasks`) | `GET/POST /api/portal/tasks`, `PUT/DELETE /api/portal/tasks/:id` |
| Column | Task status | `todo`, `in_progress`, `complete` (or custom) |
| Time log | Time entry | `POST /api/portal/time`, `GET /api/portal/time` |
| Card assignment | `assigned_to` on task | via `PUT /api/portal/tasks/:id` |
| Checklists, comments | On `BoardCard` type | frontend-only for now, but API-ready |

**Skill file: `skills/kanban-time.md`**

Should teach the AI to perform **full CRUD** on everything:

**Boards:**
- `list_boards` — List all boards (projects) with columns and card counts
- `create_board` — Create a new board with name, description, and optional template
- `update_board` — Rename board, change description, toggle starred
- `delete_board` — Delete a board and all its cards
- `board_templates` — List available board templates by category (construction, ata, general)

**Columns:**
- `list_columns` — List columns (statuses) for a board
- `create_column` — Add a new column (custom status) to a board
- `rename_column` — Rename a column
- `delete_column` — Remove a column (cards move to default)

**Cards:**
- `list_cards` — List cards in a board, optionally filtered by column/assignee/priority
- `create_card` — Create a card with title, description, column, priority, assignee, due date
- `get_card` — Get full card details (checklists, comments, attachments, time logs)
- `update_card` — Edit title, description, priority, assignee, due date
- `move_card` — Move card to another column (change status)
- `delete_card` — Delete a card

**Time tracking:**
- `log_time` — Log hours worked on a card (date, hours, description)
- `card_time_logs` — View all time logged against a card
- `board_time_report` — Generate time report for a board (by worker, by column, date range)

**Comments & checklists:**
- `add_comment` — Add a comment to a card
- `add_checklist_item` — Add a checklist item to a card
- `toggle_checklist_item` — Mark checklist item done/undone

**Example AI conversations:**
> User: "Create a new board for next week's foundation work"
> Agent: [calls `create_board` with name "Vecka 21 — Grundläggning"]

> User: "Move the foundation pour card to In Progress and assign it to Erik"
> Agent: [calls `move_card` to "in_progress" column, then `update_card` to set assignee]

> User: "What's everyone working on this week?"
> Agent: [calls `list_cards` for each board, groups by assignee]

> User: "Log 6 hours for the rebar inspection card, yesterday"
> Agent: [calls `log_time` with hours=6, date=yesterday, card=rebar-inspection-id]

> User: "Show me all cards in Kvalitet column that are overdue"
> Agent: [calls `list_cards` filtered by column="kvalitet", then filters overdue client-side]

### 2. Swedish ÄTA skills

Swedish **ÄTA** = *Ändrings-, Tilläggs- och Avgående arbeten* (Changes, Additions, and Deductions) — the formal change order system in Swedish construction contracts.

The system already has:
- `AtaPage.tsx` — full UI with Swedish labels (Ändring, Tillägg, Avgående)
- `tickets-api.ts` — draft → review → approve → reject → invoiced workflow
- `boardTemplates.ts` — "ÄTA Workflow" and "ÄTA Change Order Log" kanban templates
- `Navigation.tsx` — ÄTA nav item with role-based visibility

**Skill file: `skills/ata.md`**

Should teach the AI to:
- Create ÄTA tickets (ändring/tillägg/avgående) via `POST /api/tickets`
- Guide users through the ÄTA status workflow (draft → pending_review → pending_approval → approved → rejected → invoiced)
- Track cost estimates and actuals per ÄTA
- Link ÄTA tickets to projects
- Generate ÄTA reports

**Example AI conversation:**
> User: "Create a new ÄTA for the extra foundation work"
> Agent: "Vilken typ? Ändring, Tillägg, eller Avgående?"
> User: "Tillägg"
> Agent: [calls `ticket_create` with category "tillägg"]

### 3. Worker management skills

Managing construction workers, crews, subcontractors, and their assignments.

The system already has:
- User roles: `worker`, `leader`, `admin`, `super_admin`
- Time tracking with per-worker hour logging
- Task assignment with `assigned_to` field
- Team/crew management via `teams-yaml-mutate.ts`

**Skill file: `skills/workers.md`**

Should teach the AI to:
- List workers on site and their current assignments
- Assign workers to tasks (wrap task update APIs)
- Track worker hours and overtime
- Manage crew rosters (add/remove workers from crews)
- Handle worker check-in/check-out for daily logs

---

## Proposed changes

### Phase 1 — Wire skills into agent runtime

**What:** When an agent with `skills: "safety,quality"` is activated, load
`workspace/skills/safety.md` and `workspace/skills/quality.md` and append their instructions to
the system prompt.

**Files to touch:**
- `server/agents.ts` — add `resolveSkillBodies(skills: string): Promise<string[]>` that scans
  `skills/`, `.pi/skills/`, `.claude/skills/`, `.cursor/skills/` (same dir pattern as agents)
  for matching `.md` files and returns their bodies (after frontmatter).
- `server/session-prompts.ts` — in `composeLeadSystem()`, when `agentBody` is set, also append
  resolved skill bodies. This makes skills operational immediately.

**Skill file format** (same Pi-style frontmatter as agents):
```markdown
---
name: safety
description: OSHA / site safety procedures
---

## Safety inspection checklist
- Hard hats required in all active work zones
- Daily tailgate meetings before first shift
- Fall protection above 6 ft
```

### Phase 2 — Rebrand orchestrator for construction

**What:** Replace code-centric git tools with document-versioning equivalents. Rewrite system
prompts to speak construction vocabulary.

**Files to touch:**
- `server/orchestrator-git-tools.ts` → **rename or rewrite** as `server/orchestrator-doc-tools.ts`
  - `git_status` → `doc_status` (which documents are tracked, current version)
  - `git_fetch` → `doc_sync` (pull latest documents from GitHub)
  - `git_pull` → `doc_checkout` (check out latest version of a document)
  - `git_push` → `doc_checkin` (check in a new version of a document)
  - `git_branches` → `doc_versions` (version history of a document)
  - `git_checkout` → `doc_revert` or `doc_switch_version`
  - `git_add` → `doc_stage`
  - `git_commit` → `doc_commit`
  - Keep `git_remote` as-is (shows configured remotes)
  - Drop `git_merge` (not relevant for construction docs)
- `server/orchestrator-tools-exec.ts` — update the `switch` dispatch, tool descriptions, and
  `ORCHESTRATOR_TOOLS_OPENAI` / `orchestratorToolsForLlm()` to register new names.
- `server/session-prompts.ts` — rewrite `ORCHESTRATOR_WEB_SHELL_SYSTEM` and friend prompts to
  use construction vocabulary ("site", "crew", "blueprint", "inspection", "daily log").

**Example new tool:**
```typescript
{
  name: "doc_checkin",
  description:
    "Check in a new version of a construction document (blueprint, spec, RFI, submittal) " +
    "to GitHub for version tracking. Pass **path** (workspace-relative), **message** " +
    "(what changed), and optional **docType** (blueprint|spec|rfi|submittal|photo). " +
    "GitHub PAT from Settings is used for auth.",
}
```

### Phase 3 — Add construction-specific tools

**New tools to add:**
- `inspection_create` / `inspection_list` — create/list inspection checklist items
- `photo_log` — log a site photo with caption, location, timestamp
- `daily_log` — record daily site activity (crew count, weather, work completed)
- `crew_list` — list team members / subcontractors on site
- `ticket_create` / `ticket_list` — create/list RFIs, CORs, punch list items (wraps existing
  `tickets-api.ts` route)

### Phase 4 — Add skill files

Create `workspace/skills/` with markdown files:

| File | Purpose |
|---|---|
| `kanban-time.md` | Kanban board for time tracking, daily planning, time entry logging |
| `ata.md` | Swedish ÄTA (ändrings-/tilläggs-/avgående arbeten) change order workflow |
| `workers.md` | Worker management, crew rosters, assignments, hour tracking |
| `safety.md` | Arbetsmiljöverket (AFS) regulations, skyddsrond inspection checklists, Swedish workplace safety |
| `quality.md` | QC checklists, testing requirements, inspection protocols |
| `photos.md` | Site photo naming conventions, metadata, drone imagery |
| `documents.md` | Document control (blueprints, specs, RFIs, submittals) |
| `scheduling.md` | Milestone tracking, delivery scheduling, delay documentation

Skill files live in `.wo/skills/<name>.md` (primary) or fallback to `skills/`, `.pi/skills/`, etc. Same Pi-style frontmatter as agents:

```markdown
---
name: kanban-time
description: Kanban board management and time tracking for construction work
---

## Kanban tools
- Create and manage boards per project/work package  
- Full card CRUD with column/priority/assignee/due date  
- Time logging against cards with leader approval flow  
- Worker listing for assignment  
```

---



## How skills load (current trace)

```
user picks agent in UI
  → POST /api/chat sets currentAgentName
  → composeLeadSystem() called (session-prompts.ts)
    → agent body (post-frontmatter) is the prompt
    → skills field: NEVER ACCESSED
  → LLM sees only the agent body
```

## How skills should load (proposed)

```
user picks agent in UI
  → POST /api/chat sets currentAgentName + agent.skills
  → composeLeadSystem() called
    → agent body is the prompt base
    → for each skill in agent.skills.split(","):
        resolveSkillBodies() scans skills/ dirs
        appends skill body as additional system context
  → LLM sees agent body + skill instructions
```

---

## File-by-file plan

### agents.ts

Add:
```typescript
const SKILL_SCAN_ROOTS = ["skills", ".pi/skills", ".claude/skills", ".cursor/skills"];

export async function resolveSkillBodies(skillsCsv: string, workspaceRoot: string): Promise<string[]> {
  // ... scan SKILL_SCAN_ROOTS for each skill name, collect .md bodies
}
```

### session-prompts.ts

In `composeLeadSystem()`, after the agent block:
```typescript
const skillBodies = agentBody ? await resolveSkillBodies(agent.skills, workspaceRoot) : [];
if (skillBodies.length) parts.push(skillBodies.join("\n\n---\n\n"));
```

### orchestrator-git-tools.ts → orchestrator-doc-tools.ts

Rename and rewrite tool descriptions for construction document versioning.

### orchestrator-tools-exec.ts

- Rename git tool dispatch cases to new names
- Rewrite `ORCHESTRATOR_TOOLS_OPENAI` descriptions
- Update `orchestratorToolsForLlm()`

### session-prompts.ts

Rewrite `ORCHESTRATOR_WEB_SHELL_SYSTEM` and related prompts for construction vocabulary.
