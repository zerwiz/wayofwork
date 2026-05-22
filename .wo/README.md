# `.wo/` — Agents & Skills

Canonical source for Way of Work agent definitions and skill files. The workspace directory (`workspace/.wo`) is a symlink to this directory, making agents and skills discoverable by the server.

## Structure

```
.wo/
  ├── agents/          → Agent .md files with YAML frontmatter
  │   ├── ata.md          Swedish ÄTA expert
  │   ├── claw.md         General assistant (web chat, Telegram)
  │   ├── docs.md         Documentation specialist
  │   ├── fakturering.md  Invoice & offer expert
  │   ├── forskare.md     Construction research agent
  │   ├── kanban.md       Kanban board assistant
  │   ├── projektledare.md Project manager
  │   └── schemaplanerare.md Scheduler
  ├── skills/          → Skill directories with SKILL.md
  │   ├── ata/             ÄTA change order management
  │   ├── client-communication/ WhatsApp, Telegram, Email
  │   ├── document-generation/ Offers, invoices, documents
  │   ├── kanban-time/     Kanban boards + time tracking
  │   ├── project-pricing/ Construction pricing frameworks
  │   ├── research/        Web research for certifications/prices
  │   ├── safety/          Workplace safety (AFS regulations)
  │   ├── scheduling/      Daily planning, time verification
  │   ├── swedish-building-laws/ PBL, BBR, AB 04, ABT 06, AMA
  │   ├── time-calculation/ Construction time estimation
  │   └── workers/         Worker & crew management
  └── README.md        ← This file
```

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
