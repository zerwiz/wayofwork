# Way of Work

A work planning and organizational tool for teams. Track tasks, manage projects, communicate with your team, and keep work moving — all in one place.

Built with Bun and React. Chat-powered via the Wo Agent runtime.

## Features

- **Simple mode** — Chat with an AI orchestrator, edit files, run scripts
- **Claw mode** — Autonomous agent shell for scheduled tasks and automation
- **Docs mode** — Browse and manage project documentation
- **Workboard** — Track time, tasks, and team activity
- **Kanban** — Full project board with drag-and-drop columns
- **Worker portal** — Role-based views for team members
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
server/     — Bun backend (API, WebSocket, chat, SQLite)
src/        — React frontend
electron/   — Desktop shell
shared/     — Types shared between server and frontend
```

## Dependencies

- **Runtime**: [Bun](https://bun.sh)
- **Frontend**: React 19 + Vite + Tailwind CSS
- **Chat engine**: Wo Agent (`@wayofmono/wo-agent`)
- **Database**: SQLite
