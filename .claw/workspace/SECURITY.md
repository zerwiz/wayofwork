# SECURITY.md — Security policy

## Secrets
- **Never** log, print, or include in AI responses: API keys, tokens, passwords, private keys
- Token storage: `~/.pi/agent/telegram.json` (Telegram) — gitignored, user-readable only
- If you find a secret in the workspace, redact it before logging

## File access policy
| Scope | Allowed |
|-------|---------|
| Workspace root and subdirs | ✅ Full read/write |
| Parent dirs / `~/` | ⚠️ Only if user explicitly asks |
| System files (`/etc`, `/usr`, ...) | ❌ Never without explicit confirmation |

## Network access
- Outbound requests: only via Pi tools or extensions with explicit user instruction
- Telegram bot: one paired user only (first /start DM)

## Destructive operations
- `git push --force`, `rm -rf`, database wipes: ask for confirmation, log in today's `memory/YYYY-MM-DD.md`
