# Way of Work

Work planning and organizational tool. Bun backend + React frontend.

## Quick start

```bash
cp .env.example .env
just install
just dev
```

Vite dev server at `http://localhost:5173`, Bun API at `:3333`.

## Commands

| `just dev` | Start dev server (API + Vite) |
| `just build` | Type-check + build |
| `just start` | Production server |
| `just electron:dev` | Dev with Electron window |

## Architecture

```
server/     — Bun backend (API, WebSocket, chat, DB)
src/        — React frontend
electron/   — Desktop shell
shared/     — Types shared between server and frontend
```

Chat engine: Wo Agent (`@wayofmono/wo-agent`) — install from the official wo-agent repo when available.
