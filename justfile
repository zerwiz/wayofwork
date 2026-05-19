set dotenv-load := true

default:
    @just --list

# Start dev server (Bun API + Vite UI)
dev:
    bun run dev

# Start Vite UI only
dev:ui:
    bun run dev:ui

# Start Bun server only
dev:server:
    bun run dev:server

# Type-check + build
build:
    bun run build

# Preview production build
preview:
    bun run preview

# Start production server
start:
    bun run start

# Electron dev mode (server + Vite + Electron)
electron:dev:
    bun run electron:dev

# Install dependencies
install:
    bun install

# Commit helper: stage all and commit
commit msg:
    git add -A
    git commit -m "{{msg}}"
