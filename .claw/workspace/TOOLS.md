# TOOLS.md — Tool notes

> Document tool-specific configuration and gotchas here.
> The agent reads this to understand how to use available tools correctly.
> The agent **builds and installs** skills and extensions here — after adding files, update this section so the next session knows what is wired.

## Workspace tools
- **read / write / grep**: standard Pi workspace tools (always available)
- **bash**: use for running scripts, tests, builds, and `pi install …` when setting up extensions

## Telegram bridge (pi-telegram)
Install: `pi install git:github.com/badlogic/pi-telegram`

Setup (once per Pi installation):
```
/telegram-setup       → paste bot token from @BotFather
```

Per-session:
```
/telegram-connect     → start polling (session-local)
/telegram-disconnect  → stop polling
/telegram-status      → show pairing and status
```

Security:
- Token stored in `~/.pi/agent/telegram.json` — never commit
- First /start DM becomes the only allowed user
- See docs/WOP_TELEGRAM_PLAN.md for full plan

## Extensions active in this workspace
- (list any `.pi/extensions/*.ts` or installed packages relevant here)
