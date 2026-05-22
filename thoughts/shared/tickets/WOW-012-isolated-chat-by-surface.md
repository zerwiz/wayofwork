# WOW-012 [Isolated Chat per Surface] Varje vy (claw, kanban, docs) har sin egen chatt-instans

## Problem Statement

Idag delar alla surfaces (Claw, Kanban, Docs, Simple, Work, Admin) samma chatt-instans. När man växlar mellan olika vyer ser man samma chatthistorik och samma generiska Orchestrator-hälsning, trots att varje vy är tänkt för olika användningsfall och har olika agents kopplade till sig.

Dessutom hittar servern **inga agents** eftersom `WOP_WORKSPACE` pekar på `workspace/` (tom katalog) medan agents och skills ligger i repo-roten `.wo/agents/` och `.wo/skills/`. Serverns agent-scanner letar under `join(WOP_WORKSPACE, ".wo", "agents")` dvs `workspace/.wo/agents/` — som inte finns. Därför används alltid Orchestrator-fallback oavsett vald vy.

## Desired Outcome

Varje surface (Claw, Kanban, Docs, Simple, etc.) ska ha sin egen isolerade chatt-instans med:
- Egen chatthistorik (separata JSONL-filer på disk)
- Egen aktiv session/kontext och egna chatt-flikar
- **Rätt agent autovald per surface** — Claw → `claw.md`, Docs → `docs.md`, Kanban → `kanban.md`, etc.
- Agents och skills från `.wo/` måste vara tillgängliga för servern
- Fix av dubbel-bubblan vid thinking

## Context & Background

### Current State — Chatt-arkitektur

Chatten använder en WebSocket (`/ws`) med per-anslutning state (`ChatWsData`). Alla surfaces delar samma anslutning i frontend via en global React context (`useRefactor()` → `session` objekt från `useWayOfPiSession()`).

**Surfaces som finns** (routes i `src/App.tsx`):

| Route | Komponent | Yta | Chat-komponent |
|---|---|---|---|
| `/simple` | `SimplePage` | Simple | `SimpleChatView` |
| `/claw` | `ClawPage` | Claw | `ChatPanel` / `ClawChatView` |
| `/docs` | `DocsPage` | Docs | `SimpleChatView` |
| `/kanban` | `KanbanPage` | Kanban | `KanbanChatPanel` |
| `/workboard` | `WorkPage` | Work | (ingen chatt) |
| `/admin` | `AdminDashboard` | Admin | (ingen chatt) |

**Viktigt:** `ReferenceApp.tsx` (separat från `App.tsx`) anropar `useWayOfPiSession(chatSurfaceId, ...)` med surface-ID, men den används inte vid runtime. Den aktiva appen är `App.tsx` som anropar `useWayOfPiSession()` **utan surfaceId**.

### Current State — Agent Discovery

Serverns agent-scanning (`server/agents.ts:128-144`):
```typescript
const roots = [
  join(workspaceRoot, ".wo", "agents"),
  join(workspaceRoot, "agents"),
  join(workspaceRoot, ".claude", "agents"),
  ...
];
```

`workspaceRoot` kommer från `getPrimaryWorkspacePath()` som läser `WOP_WORKSPACE` (`.env`).
- `WOP_WORKSPACE=/home/zerwiz/CodeP/wayofwork/workspace`
- Agents finns i `/home/zerwiz/CodeP/wayofwork/.wo/agents/`
- === **Servern hittar inga agents** ===

### Current State — Agentval i frontend

Agentväljaren i `ChatPanel.tsx` (lines 1162-1188) är en `<select>` med:
- **Default (tomt):** `""` = Orchestrator (session lead)
- **Picker:** agents från `useAgents()` som hämtar från localStorage (`wop-agents-api`)
- **Roster-only:** namn från `teams.yaml` utan matchande `.md`

Frontend kan tekniskt välja agent manuellt, men eftersom servern inte hittar någon `.md`-fil får man alltid "Hi! I'm ready to help..." från Orchestrator oavsett val.

### Current State — Agenterna som finns

**7 agents** i `.wo/agents/` (repo root — alla oåtkomliga för servern):

| Fil | Name | Skills |
|---|---|---|
| `claw.md` | claw | — |
| `kanban.md` | kanban | kanban-time |
| `fakturering.md` | fakturering | document-generation, client-communication, project-pricing, swedish-building-laws, research |
| `forskare.md` | forskare | research, project-pricing |
| `projektledare.md` | projektledare | kanban-time, ata, workers, safety, swedish-building-laws, project-pricing, time-calculation, research |
| `schemaplanerare.md` | schemaplanerare | scheduling, kanban-time, workers, client-communication |
| `ata.md` | ata | ata, research |

**11 skills** i `.wo/skills/`: `ata/`, `client-communication/`, `document-generation/`, `kanban-time/`, `project-pricing/`, `research/`, `safety/`, `scheduling/`, `swedish-building-laws/`, `time-calculation/`, `workers/`

**Ingen docs-agent finns än.**

### Chat UI-relaterade filer

**Huvudkomponenter:**
- `src/components/ChatPanel.tsx` — Huvud-chatt (1267 rader, tabs, meddelanden, agentväljare, mode)
- `src/components/simple/SimpleChatView.tsx` — Enkel chatt (953 rader)
- `src/components/claw/ClawChatView.tsx` — Claw-specifik chatt
- `src/components/kanban/KanbanChatPanel.tsx` — Kanban-chatt
- `src/components/technical/TechnicalChatPanel.tsx` — Teknisk chatt
- `src/components/docs/PMChatPanel.tsx` — Docs PM-chatt
- `src/components/documenthandler/Chat.tsx`, `ChatMessages.tsx`, `ChatPanel.tsx`, `ChatExplorer.tsx` — Dokumenthanterar-chatt
- `src/components/AgentTeamPulseGrid.tsx` — Agent puls
- `src/components/ContextUsageRing.tsx` — Context-användning

**Hooks & state:**
- `src/hooks/useWayOfPiSession.ts` — WebSocket-anslutning, session management, tabs
- `src/hooks/useAgents.ts` — Agentlista via localStorage
- `src/types/chat.ts` — ChatRow, LogRow, ChatSessionTab

**Server (chat logic):**
- `server/index.ts` — WebSocket upgrade, `ChatWsData`, message handler, `runChatTurn()`, `processActivateSession()`
- `server/chat.ts` — `ChatMessage`, `streamChatCompletion()`
- `server/wop-session-jsonl.ts` — JSONL persistence
- `server/session-prompts.ts` — System prompt composition
- `server/agents.ts` — Agent scanning, parsing, skill resolution
- `server/chat-slash-commands.ts` — Slash command evaluation
- `server/chat-orchestrator-tools.ts` — Tool calling
- `server/chat-usage.ts` — Token counting
- `server/chat-context-budget.ts` — Context window management

**Hjälpfiler:**
- `src/utils/workspaceChatAgentPicker.ts` — Agent picker helpers
- `src/utils/workspaceAgentDisplay.ts` — Agent display names
- `src/utils/agentPermissionsStorage.ts` — Agent permissions
- `src/utils/chatQueueTranscript.ts` — Chat queue transcript
- `src/utils/chatSlashAutocomplete.ts` — Slash command autocomplete
- `src/utils/chatComposerInjectBus.ts` — Composer injection
- `src/lib/chatAttachment.ts` — Attachment handling
- `src/lib/parseMessageSegments.ts` — Message parsing

### Bug: Extra chatbubbla vid thinking (olöst)

När chatten startar och AI:n börjar tänka (thinking/reasoning) skapas **två bubbler samtidigt**:
1. **Övre bubblan** – visar thinking/texten
2. **Nedre bubblan** – tom/empty

När AI-svaret sedan kommer efter thinking, slås de ihop till en bubbla. Felet sitter troligen i hur `assistant_turn_start`, `assistant_reasoning_delta` och `assistant_delta` hanteras i `useWayOfPiSession.ts` (processMessage ca rad 223–313) — att en extra tom bubble skapas vid `assistant_turn_start` och ytterligare en vid första `assistant_delta`.

### Why This Matters

- Användare ser samma generiska hälsning oavsett vy → tror chatten är trasig
- Olika surfaces har olika användningsfall (Claw = kod, Docs = dokumentation, Kanban = planering) — att dela historik förvirrar LLM:en
- Agents och skills är helt oanvändbara pga WOP_WORKSPACE-pekning
- Dubbel-bubblan är visuellt störande

## Requirements

### Functional Requirements
- [ ] Varje surface har egen WebSocket-isolation (egen session/state)
- [ ] Varje surface har egna chatt-flikar som inte syns i andra surfaces
- [ ] JSONL-filer sparas per surface: `wayofpi-chat-<surface>-<sessionKey>.jsonl`
- [ ] **Rätt agent autovald per surface** – Claw → claw, Docs → docs (ny), Kanban → kanban, Simple → null (Orchestrator)
- [ ] Agents från `.wo/agents/` måste vara tillgängliga för servern (fixa WOP_WORKSPACE eller agent scan roots)
- [ ] Skills från `.wo/skills/` måste fungera
- [ ] Skapa docs-agent (`docs.md`) för dokumentationsarbete
- [ ] Dubbel-bubblan vid thinking är fixad – exakt en bubble per assistant-turn

### Out of Scope
- Fullständig ombyggnad av WebSocket-arkitekturen
- Ändring av befintlig JSONL-struktur för historiska sessions

## Acceptance Criteria

### Automated Verification
- [ ] Build completes: `bun run build`

### Manual Verification
- [ ] Öppna Claw-vyn — chatten ska automatiskt använda `claw`-agenten
- [ ] Öppna Docs-vyn — chatten ska automatiskt använda `docs`-agenten
- [ ] Öppna Kanban-vyn — chatten ska automatiskt använda `kanban`-agenten
- [ ] Byt vy mitt i en konversation — chatten i föregående vy ska sparas
- [ ] Verifiera att agenternas skills laddas (t.ex. `kanban-time` för kanban-agenten)
- [ ] Verifiera att thinking inte skapar dubbla bubbler

## Technical Notes

### Ändringar som är gjorda (2026-05-22)
- ✅ `workspace/.wo` → `../.wo` — symlink så agents & skills hittas av servern
- ✅ `.wo/agents/docs.md` — ny docs-agent skapad

### Affected Components (återstående arbete)
- `server/index.ts` – WebSocket state isolation per surface
- `server/wop-session-jsonl.ts` – surface-prefixed JSONL filnamn
- `server/session-prompts.ts` – surface-beroende agent auto-select
- `server/chat-slash-commands.ts` – `/clear` etc per surface
- `src/hooks/useWayOfPiSession.ts` – session isolation per surface, fix extra bubble bug
- `src/components/ChatPanel.tsx` – surface-aware tab rendering och auto agent-select
- `src/components/simple/SimpleChatView.tsx` – generisk auto-select istället för hårdkodad `clawChrome`
- `src/App.tsx` – routing för surface-aware session

### Agent Auto-Select Strategy — Current & Desired State

**Nuvarande implementation — fragmenterad och hårdkodad:**

| Surface | Auto-select | Var | Mekanism |
|---|---|---|---|
| **Claw** | ✅ `claw` | `ReferenceApp.tsx` (linje 2250–2302) + `ClawChatView`/`SimpleChatView` | Navigation effect + `sessionLeadFallbackLabel="Claw"` med hårdkodad `clawChrome`-check |
| **Kanban** | ✅ `kanban` | `KanbanChatPanel.tsx` (linje 24–29) | `useEffect` med `agentSetRef` guard, anropar `setChatAgent("kanban")` |
| **Docs** | ❌ Ingen | — | `DocsApp.tsx` skickar **inga** `sessionLeadFallbackLabel`-props, anropar aldrig `setChatAgent` |
| **Simple** | ✅ Ingen (Orchestrator) | `ReferenceApp.tsx` | Sätts explicit till `null` vid navigering |

**Problem:**
1. **Hårdkodad agent-selection** — `SimpleChatView.tsx` (rad 156–161) har `const clawChrome = sessionLeadFallback === "Claw"` som bara fungerar för Claw. Andra surfaces kan inte dra nytta av samma mekanism utan kodändring.
2. **Delad session** — Alla surfaces anropar `session.setChatAgent()` globalt. När Kanban sätter agent till `kanban` påverkas Simple och Docs. `KanbanChatPanel` har en egen `useWayOfPiSession()`-instans men delar ändå samma WebSocket/session som resten.
3. **No cleanup** — Ingen surface återställer agenten när man navigerar bort (förutom `ReferenceApp.tsx` som stödjer `simple`, `technical` och `claw` — men inte `docs` eller `kanban`).

**Önskad implementation:**

Varje surface ska automatiskt välja rätt agent med en enhetlig mekanism:

- **Surface → Agent-mappning** (i en central config, t.ex. i `src/App.tsx` eller en ny `surface-agents.ts`):
  ```
  simple → null (Orchestrator)
  claw   → "claw"
  docs   → "docs"
  kanban → "kanban"
  work   → null
  admin  → null
  ```

- **Vid navigering** (i router/navigation effect): anropa `session.setChatAgent(mapping[surface])` när användaren byter vy.

- **Vid surface-init** (i page component): anropa `session.setChatAgent(agentName)` med `useRef` guard (som Kanban) om agenten inte redan är satt för den surfacen.

- **SimpleChatView generisk**: Byt ut `clawChrome` mot en generisk `autoSelectAgent` prop eller härled agent-namnet från `sessionLeadFallbackLabel.toLowerCase()`:
  ```tsx
  // Istället för hårdkodad clawChrome:
  const autoAgent = sessionLeadFallbackLabel?.trim().toLowerCase() || null;
  const useAutoAgent = autoAgent && agentAvailable(autoAgent);
  const sessionPick = useAutoAgent && !sessionPickRaw ? autoAgent : sessionPickRaw;
  ```

### Arkitektur: workspace vs system

```
/home/zerwiz/CodeP/wayofwork/                   ← System (app-kod, server, repo)
  ├── server/                                   ← Bun-server, API, WebSocket
  ├── src/                                      ← React-frontend
  ├── .wo/
  │   ├── agents/                               ← Agent .md-filer (kanonisk källa)
  │   ├── skills/                               ← Skill .md-filer
  │   ├── agent/auth.json                       ← Pi auth
  │   ├── agent/sessions/                       ← Pi sessions
  │   ├── sessions/                             ← Pi workspace sessions
  │   ├── extensions/                           ← Pi extensions
  │   ├── prompts/                              ← Pi prompts
  │   └── scripts/                              ← Pi scripts
  ├── .claw/                                    ← CLAW per-user workspace (privat per person)
  │   ├── workspace/
  │   │   ├── SOUL.md                           ← Claw identity
  │   │   ├── AGENTS.md                         ← Claw agent config
  │   │   ├── USER.md                           ← User profile
  │   │   ├── MEMORY.md                         ← Memory store
  │   │   ├── HEARTBEAT.md                      ← Heartbeat log
  │   │   ├── TOOLS.md                          ← Tool definitions
  │   │   ├── SECURITY.md                       ← Security rules
  │   │   └── memory/YYYY-MM-DD.md              ← Daily session logs
  │   ├── telegram.json                         ← Telegram config
  │   ├── whatsapp.json                         ← WhatsApp config
  │   ├── schedule/
  │   │   ├── claw-schedules.v1.json            ← Schedule definitions
  │   │   └── claw-schedule-runs.v1.json        ← Schedule run history
  │   └── mission-events/
  │       └── claw-mission-events.v1.json       ← Automation run events
  ├── data/                                     ← SQLite databaser
  │   └── wayofwork.sqlite                      ← All affärsdata (tenants, users, projects, etc)
  └── workspace/                                ← Företags-globala filer (användardata)
      ├── .wo → ../.wo                          ← SYMLINK — agents & skills tillgängliga
      ├── .wayofpi/                             ← System-metadata (skapas automatiskt)
      │   ├── index/                            ← Workspace-index (regenererbart)
      │   │   ├── state.json
      │   │   ├── manifest.json
      │   │   ├── options.json
      │   │   ├── grep-paths.txt
      │   │   ├── docs.json
      │   │   └── docs/*.txt
      │   ├── ui-views.json                     ← UI-katalog (skapas automatiskt)
      │   ├── github-credentials.json           ← GitHub PAT (känsligt)
      │   └── claw-webhook.v1.json              ← Claw webhook secret (känsligt)
      ├── agent/
      │   ├── settings.json                     ← Pi agent settings
      │   └── sessions/                         ← Chat-transkript (JSONL)
      │       └── wayofpi-chat-*.jsonl
      ├── plans/                                ← Planeringsdokument
      │   └── PLAN-*.md
      ├── agents/                               ← Scan-root agents
      ├── .claude/agents/                       ← Scan-root (Claude)
      ├── .pi/
      │   ├── agents/*.md / teams.yaml          ← Scan-root (Pi)
      │   ├── settings.json                     ← Pi settings
      │   └── extensions/*.ts                   ← Pi extensions
      ├── .cursor/agents/                       ← Scan-root (Cursor)
      ├── skills/                               ← Scan-root skills
      ├── .pi/skills/                           ← Scan-root (Pi)
      ├── .claude/skills/                       ← Scan-root (Claude)
      ├── .cursor/skills/                       ← Scan-root (Cursor)
      └── [dokument, ritningar, fakturor, etc]  ← Företagets filer
```

**Varför:** Serverns agent-scanner letar under `WOP_WORKSPACE/.wo/agents/` (= `workspace/.wo/agents/`). Agents och skills måste finnas i workspace för att servern ska hitta dem. `.wo/` i repo-roten är den kanoniska källan, workspace har en symlink. Claw har sitt eget privata workspace under `.claw/` (per person), medan `workspace/` är för företagsglobala filer.

**Framtida Docker-setup:** Workspace monteras som en volym med `.wo/` kopierad eller monterad inuti.

### Fix som är gjord (2026-05-22)
1. **Skapat symlink** `workspace/.wo` → `../.wo` — agents och skills blir tillgängliga för servern
2. **Skapat docs-agent** `.wo/agents/docs.md` — ny agent för dokumentationsarbete

---

## Meta

**Created**: 2026-05-22
**Updated**: 2026-05-22
**Priority**: High
**Estimated Effort**: L
