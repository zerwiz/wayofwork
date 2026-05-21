# AGENTS.md — Way of Work (Way of Work)

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
- Three runtime modes: headless Pi (`pi --mode json`), Bun orchestrator tools, or basic chat completion
- Workspace agents: `agents/*.md`, `.pi/agents/*.md`, `.claude/agents/*.md`, `.cursor/agents/*.md` with YAML frontmatter
- Chat transcripts persist as JSONL under workspace `agent/sessions/`

## TypeScript
Project references: `tsconfig.app.json` (src/ + shared/) and `tsconfig.node.json` (vite.config.ts). Several files excluded from compilation (see `exclude` in tsconfig.app.json). `tsc -b` does full project build.

## Database
Auto-creates `data/wayofpi.sqlite`. Tables: tenants, users, projects, tasks, time_entries, tickets, time_blocks, time_sessions, price_lists. Multi-tenant isolation.

## No lint, no tests, no CI
No ESLint/Prettier config found. No test framework or test files. No CI workflows. No pre-commit hooks.

## Environment key vars (`.env`)
`WOP_SERVER_PORT`, `WOP_LLM_PROVIDER`, `OLLAMA_HOST`, `OLLAMA_MODEL`, `WOP_WORKSPACE`, `WOP_ALLOW_TERMINAL`, `WOP_ALLOW_SERVER_RESTART`, `WOP_PI_BINARY`, `WOP_ORCHESTRATOR_TOOLS`, `WOP_NGROK_BINARY`

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
