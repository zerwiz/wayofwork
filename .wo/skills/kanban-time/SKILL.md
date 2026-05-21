---
name: kanban-time
description: Kanban board management and time tracking for construction work
---

## Kanban boards

You have full CRUD tools for kanban boards (which map to projects/phases/work packages):

- **kanban_list_boards** — see all boards with their current status
- **kanban_create_board** — create a new board for a construction phase or work package
- **kanban_update_board** — rename, update description, or archive a board
- **kanban_delete_board** — permanently remove a board and unlink its cards
- **kanban_board_templates** — list available templates (construction, ÄTA, punch list)

## Cards on a board

Cards represent individual tasks/work items. Full CRUD + move:

- **kanban_list_cards** — list cards with optional filters (board, column, assignee)
- **kanban_create_card** — create a card with title, description, column, priority, assignee, due date
- **kanban_get_card** — view full card details
- **kanban_update_card** — change any field on a card
- **kanban_delete_card** — delete a card
- **kanban_move_card** — move a card to another column (change status)

## Time tracking

- **kanban_log_time** — log hours worked against a card (date, hours, description). Entries start as "pending" for leader approval
- **kanban_card_time_logs** — view all time logged against a card

## Workers

- **kanban_list_workers** — list all users in the workspace with their ids and roles, for assigning cards

## Workflow tips

- When a user says "create a board", ask what phase/project it's for, then call kanban_create_board
- When they say "move X to In Progress", use kanban_move_card
- For time logging (e.g. "log 6 hours on the rebar card"), ask for date if not provided, then call kanban_log_time
- Always verify by listing cards after changes
