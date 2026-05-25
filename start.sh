#!/usr/bin/env bash
set -euo pipefail

# Load environment variables from .env if the file exists
if [ -f ./.env ]; then
  set -a
  source ./.env
  set +a
fi

ROOT="$(cd "$(dirname "$0")" && pwd)"
PORT="${WOP_SERVER_PORT:-3333}"
HEALTH="http://127.0.0.1:${PORT}/api/health"
LOG_FILE="${ROOT}/server.log"

# Initialize log file
echo "--- Starting Way of Work Server at $(date) ---" > "$LOG_FILE"

# Redirect all subsequent output to both stdout and the log file
exec > >(tee -a "$LOG_FILE") 2>&1

echo "============================================"
echo "  Way of Work Server"
echo "============================================"
echo ""
echo "  Web interface:    http://127.0.0.1:${PORT}"
echo "  API health:       ${HEALTH}"
echo "  API docs:         http://127.0.0.1:${PORT}/api/manifest"
echo "  Logs:             ${LOG_FILE}"
echo ""
echo "  Set WOP_AUTH_SECRET in .env for production JWT signing."
echo ""
if [ -n "${WOP_NGROK_DOMAIN:-}" ]; then
  echo "  Ngrok tunnel active. If Basic Auth is enabled, check ~/.wo/tunnel-gate.v1.json"
  echo "  for username and password, or configure via Admin Console."
  echo ""
fi
echo "============================================"
echo ""

echo "==> Building app (tsc -b && vite build)..."
bun run build

echo "==> Starting Bun server..."
# Run in foreground so Ctrl+C stops it directly
exec bun run server/index.ts
