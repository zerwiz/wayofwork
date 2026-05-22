# AGENTS.md — Way of Work (Way of Work)

> ⚠️ **CRITICAL: PRODUCTION READY SYSTEM** ⚠️
> This is a production system. **EVERYTHING MUST WORK AND ALIGN.**
> Before adding anything or generating code, you MUST research how the system currently works.
> Adhere strictly to the established patterns, multi-tenant isolation, human-in-the-loop constraints, and UI/backend alignments detailed below and in the `.gemini/skills/` directory. No changes should be made without verifying compatibility with the existing architecture.

## Quick start
```bash
cp .env.example .env   # edit OLLAMA_HOST, OLLAMA_MODEL etc.
bun install
bun run dev            # server (:3333) + Vite UI (:5173)
```

## Key commands
| `just dev` / `bun run dev` | Server + Vite (concurrent) |
|---|---|
| `just dev:server` | Bun API only |
| `just dev:ui` | Vite only |
| `just build` / `bun run build` | `tsc -b && vite build` |
| `bun run start` | Production server |
| `bun run electron:dev` | Server + Vite + Electron |

## Architecture
- **server/** — Bun raw-HTTP server (no framework), SQLite via `bun:sqlite`, WebSocket chat, LLM orchestration
- **src/** — React 19 app with react-router-dom, Tailwind CSS
- **shared/** — Types shared between server and frontend
- **electron/** — Desktop shell (electron-main.mjs + preload.cjs)

Server entry: `server/index.ts`. Frontend entry: `src/main.tsx`.

## Dev auth
`WOP_DEV_MODE=true` (set by `bun run dev`) bypasses JWT auth — fakes SUPER_ADMIN. Default admin login: `admin` / `admin`.

## Path alias
`@/` → `src/` (vite.config.ts + tsconfig.app.json). Vite proxies `/api` and `/ws` to `:3333`.

## Chat system
- Slash commands: `/help`, `/models`, `/model <id>`, `/plan`, `/build`, `/clear`, `/agent`, `/system <name>`, `/reload`
- LLM provider: ollama (default) or openrouter (`WOP_LLM_PROVIDER=openrouter`)
- Runtime engine: `@wayofmono/wo-agent` SDK (replaces legacy Pi runtime)
- Chat transcripts persist as JSONL under workspace `agent/sessions/`, isolated per UI surface (e.g., `wo-chat-docs-*.jsonl`).

## Agent Architecture (WOW-016)

Way of Work uses a **multi-agent dispatch system** anchored by an **Orchestrator**. 

### 1. Agent Definitions
Agents are defined as Markdown files with YAML frontmatter in `.wo/agents/`.
Example frontmatter:
```yaml
---
name: projektledare
description: Swedish construction project manager
skills: ata, safety, swedish-building-laws, project-pricing
---
```

### 2. The Orchestrator & Dispatch
The **Orchestrator** (`.wo/agents/orchestrator.md`) is the primary entry point for the Simple UI and inbound communication channels (Telegram, WhatsApp).
- The Orchestrator uses the `dispatch-agent` skill.
- It **never** answers complex queries directly.
- It analyzes user intent and routes the request to a specialized sub-agent (e.g., `fakturering`, `ata`, `forskare`).

### 3. Skills
Skills are defined in `.wo/skills/<skill-name>/SKILL.md`. They provide specific instructions and capabilities to agents.
- **Example:** The `client-communication` skill allows the `fakturering` agent to format and send offers via WhatsApp.

### 4. Human-in-the-Loop (WOW-010)
**Agents must NEVER write directly to production databases** (like projects, tasks, or price lists).
- Agents are instructed to use the `POST /api/pending-changes` endpoint.
- They submit a proposal (`proposed_data`, `summary`, `target_table`).
- An administrator must review and approve these changes in the UI before they are applied.

### 5. Surface Agents
In specific UI views, the chat automatically connects to a designated expert:
- Kanban View → `kanban` agent (Board management)
- Docs View → `docs` agent (Document generation)
- Claw View → `claw` agent (General assistant)

## Developer AI Assistants (Gemini & Pi)

To ensure this codebase remains stable and adheres to the strict architectural guidelines (WOW-010, WOW-012, WOW-015, WOW-016), custom **AI developer skills** have been provided in `.gemini/skills/` and `.pi/skills/`.

If you are an AI assistant (Gemini CLI, Pi, Claude Code, etc.) reading this, you **MUST** utilize the following skills when working on the respective domains:

- **`wow_core_architecture`**: System foundations, Bun, `bun:sqlite` (no ORMs).
- **`wow_backend_dev`**: API routing, multi-tenant SQL queries, and error handling.
- **`wow_frontend_dev`**: React 19, Tailwind CSS, i18n (`useTranslation`), and UI modularity.
- **`wow_access_control`**: Economics Shield, worker isolation, and `auditLog` requirements.
- **`wow_human_in_the_loop`**: CRITICAL rules for agent data mutation (`pending_changes`).
- **`wow_agent_dev`**: Creating internal `.wo/agents/` and skills.
- **`wow_communications`**: Inbound/outbound channel routing (Telegram/WhatsApp).
- **`wow_ui_surfaces`**: WebSocket isolation and double-bubble UI prevention.

## TypeScript
Project references: `tsconfig.app.json` (src/ + shared/) and `tsconfig.node.json` (vite.config.ts). Several files excluded from compilation (see `exclude` in tsconfig.app.json). `tsc -b` does full project build.

## Database
Auto-creates `data/wayofwork.sqlite`. Tables: tenants, users, projects, tasks, time_entries, tickets, time_blocks, time_sessions, price_lists. Multi-tenant isolation.

## No lint, no tests, no CI
No ESLint/Prettier config found. No test framework or test files. No CI workflows. No pre-commit hooks.

## Environment key vars (`.env`)
`WOP_SERVER_PORT`, `WOP_LLM_PROVIDER`, `OLLAMA_HOST`, `OLLAMA_MODEL`, `WOP_WORKSPACE`, `WOP_ALLOW_TERMINAL`, `WOP_ALLOW_SERVER_RESTART`, `WOP_ORCHESTRATOR_TOOLS`, `WOP_NGROK_BINARY`

## Justfile aliases
```bash
just dev        # bun run dev
just build      # bun run build
just dev:server # bun run dev:server
just dev:ui     # bun run dev:ui
just electron:dev
just start
just install    # bun install
just commit <msg>
```
