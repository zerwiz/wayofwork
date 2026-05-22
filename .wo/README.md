# `.wo/` — Agents & Skills

Canonical source for Way of Work agent definitions and skill files. The workspace directory (`workspace/.wo`) is a symlink to this directory, making agents and skills discoverable by the server.

## Structure

```
.wo/
  agents/          Agent .md files with YAML frontmatter
  skills/          Skill directories with SKILL.md
  README.md        This file
```

## Agents

| File | Description |
|---|---|
| `agents/ata.md` | Swedish ÄTA expert — change orders |
| `agents/claw.md` | General assistant — web chat, Telegram, tasks |
| `agents/docs.md` | Documentation specialist |
| `agents/fakturering.md` | Invoice & offer expert |
| `agents/forskare.md` | Construction research agent |
| `agents/kanban.md` | Kanban board assistant |
| `agents/projektledare.md` | Project manager |
| `agents/schemaplanerare.md` | Scheduler |

## Skills

| Directory | Description |
|---|---|
| `skills/ata/` | ÄTA change order management |
| `skills/client-communication/` | WhatsApp, Telegram, Email |
| `skills/document-generation/` | Offers, invoices, documents |
| `skills/kanban-time/` | Kanban boards + time tracking |
| `skills/project-pricing/` | Construction pricing frameworks |
| `skills/research/` | Web research for certifications/prices |
| `skills/safety/` | Workplace safety (AFS regulations) |
| `skills/scheduling/` | Daily planning, time verification |
| `skills/swedish-building-laws/` | PBL, BBR, AB 04, ABT 06, AMA |
| `skills/time-calculation/` | Construction time estimation |
| `skills/workers/` | Worker & crew management |

## Adding an Agent

Create `agents/<name>.md` with YAML frontmatter:

```yaml
---
name: <name>
description: <short description>
skills: <comma-separated skill names>
---
```

The server scans `.wo/agents/` at startup. Skills referenced in frontmatter must exist in `.wo/skills/<name>/SKILL.md`.

## Adding a Skill

Create `skills/<name>/SKILL.md` with YAML frontmatter:

```yaml
---
name: <name>
description: <short description>
---
```

Skills provide tool descriptions, workflow guidance, and domain knowledge that agents reference during chat.

## Workspace Symlink

`workspace/.wo` → `../.wo` (created automatically). The server's agent scanner looks under `WOP_WORKSPACE/.wo/agents/` which resolves through the symlink to this directory.
