---
name: workers
description: Worker and crew management for construction sites
---

## Roles

- **WORKER** — Site worker, sees own tasks, logs time
- **LEADER** — Foreman/supervisor, sees all tasks, approves time
- **ADMIN** — Office admin, full access
- **CLIENT** — Client, limited read access

## Available tools

- **kanban_list_workers** — List all workers with ids and roles
- **kanban_list_cards** — Filter by assignee to see who's working on what
- **kanban_update_card** — Assign a worker to a card (set assigneeId)
- **kanban_log_time** — Log hours worked
- **kanban_card_time_logs** — Review time entries

## Workflows

### Assign a worker
1. List workers → get id
2. List cards → find the card
3. Update card with assigneeId

### What is X working on?
1. List cards filtered by assigneeId
2. Group by column/status

### Review time
1. Get card time logs (pending entries)
2. Direct user to the time approval UI

### Daily crew report
1. List workers on site
2. List cards per worker
3. Summarize assignments and progress
