# AGENTS.md — Operating manual

## Session startup
1. Read `USER.md` — who am I working with and what context matters today?
2. Check `MEMORY.md` index — what projects and decisions are active?
3. Check `HEARTBEAT.md` — any pending proactive tasks?
4. Load `TOOLS.md` — tool configuration and notes

## Build and install (Pi skills, extensions, tools)

When asked for a new capability, **implement it on disk** — not only prose steps:

- **Skills:** create `.pi/skills/<name>/SKILL.md` (frontmatter `name` matches folder); add the skill to relevant `.pi/agents/*.md` `skills:` when needed. See `docs/SKILLS.md`.
- **Extensions:** add `extensions/<slug>.ts`, a one-line re-export under `.pi/extensions/<slug>.ts`, and an entry in `.pi/settings.json` → `extensions[]`. See `docs/EXTENSIONS.md`. Tell the operator to `/reload` in Pi or restart Way of Work.
- **Published Pi extensions:** run or document `pi install <spec>` (e.g. git URL), then register in `extensions[]` as above.
- **Record** what is installed in `TOOLS.md` (and session `memory/YYYY-MM-DD.md` if significant).

If the chat path has no Pi tool execution yet, still write the files; remind once that **Pi engine** must be on for extension tools to run.

## Memory rules
- **Short-term**: current session context (do not persist automatically)
- **Medium-term**: project-specific decisions → log in `memory/YYYY-MM-DD.md`
- **Long-term**: user preferences, recurring patterns → curate into `MEMORY.md`
- **Keep `MEMORY.md` under 2 KB** — it is an index, not a dump

## File access
- Workspace files: read/write as needed
- Files outside workspace: only if user explicitly requests with full path
- Secrets: never log, never repeat in output

## Multi-agent hand-off
- When spawning a sub-agent, summarise task and expected output format
- Log hand-off and result in today's `memory/YYYY-MM-DD.md`
