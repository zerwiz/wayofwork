# Way of Work

A work planning and organizational tool for construction teams. Track tasks, manage projects, communicate via Telegram/WhatsApp, and keep work moving — all in one place.

Built with Bun and React. Chat-powered via the Wo Agent runtime (`@wayofmono/wo-agent`). SQLite database. No Pi dependencies — pure Wo.

## Features

- **Simple mode** — Chat with an AI orchestrator, manage projects and tasks
- **Claw mode** — Autonomous agent shell for scheduled tasks and automation
- **Docs mode** — Browse and manage project documentation
- **Workboard** — Track time, tasks, and team activity
- **Kanban** — Full project board with drag-and-drop columns
- **Worker portal** — Role-based views for construction workers
- **Telegram/WhatsApp bots** — Channel communication for workers on site
- **Swedish/English** — Bilingual support with Swedish legal content (AB 04, ABT 06, etc.)
- **Desktop app** — Electron shell for native experience

## Quick start

```bash
cp .env.example .env
bun install
bun run dev
```

Vite dev server at `http://localhost:5173`, Bun API at `:3333`.

## Commands

| Command | Description |
|---|---|
| `bun run dev` | Start dev server (API + Vite) |
| `bun run build` | Type-check + build |
| `bun run start` | Production server |
| `bun run electron:dev` | Dev with Electron window |

## Architecture

```
server/       — Bun backend (API, WebSocket, chat, SQLite)
src/          — React 19 frontend with Tailwind CSS
shared/       — Types shared between server and frontend
.wo/          — Agent & skill definitions (canonical source)
  agents/       — Agent .md files with YAML frontmatter
  skills/       — Skill .SKILL.md files
workspace/    — Company-global files (documents, drawings, invoices)
  .wo → ../.wo  — Symlink to agents & skills
  .index/       — Workspace file index (auto-generated)
  agent/sessions/ — Chat transcripts (JSONL)
  plans/         — Planning documents
electron/     — Desktop shell
```

## Agents & Skills

The platform uses AI agents with domain-specific skills:

| Agent | Surface | Skills |
|---|---|---|
| **claw** | Claw + Telegram | client-communication, kanban-time, workers, time-calculation |
| **kanban** | Kanban | kanban-time, workers |
| **docs** | Docs | document-generation, swedish-building-laws |
| **fakturering** | Sub-agent | document-generation, client-communication, project-pricing |
| **forskare** | Sub-agent | research, project-pricing |
| **projektledare** | Sub-agent | ata, safety, swedish-building-laws, project-pricing, time-calculation, research |
| **schemaplanerare** | Sub-agent | scheduling, kanban-time, workers, client-communication |
| **ata** | Sub-agent | ata, research, swedish-building-laws |

See `.wo/README.md` for full documentation.

## Dependencies

- **Runtime**: [Bun](https://bun.sh)
- **Frontend**: React 19 + Vite + Tailwind CSS
- **Chat engine**: Wo Agent (`@wayofmono/wo-agent`)
- **Database**: SQLite (`bun:sqlite`)
