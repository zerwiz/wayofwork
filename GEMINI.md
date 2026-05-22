# Way of Work - AI Assistant Guidelines

> ⚠️ **CRITICAL: PRODUCTION READY SYSTEM** ⚠️
> This is a production system. **EVERYTHING MUST WORK AND ALIGN.**
> Before adding anything or generating code, you MUST research how the system currently works.

## Mandatory Project Workflow

To maintain order and traceability in this project, you **MUST** follow this workflow for every task:

1. **Read the Plan:** Always read `thoughts/shared/tickets/TODO.md` to understand the current priorities.
2. **Read the Ticket:** If working on a specific feature (e.g., WOW-016), read its detailed ticket file in `thoughts/shared/tickets/WOW-*.md` before writing code.
3. **Execute:** Write the code using the appropriate custom skills (see below).
4. **Update the Ticket:** When a phase or feature is complete, update the checkbox in both the specific `WOW-*.md` ticket and the master `TODO.md`.
5. **Update the Changelog:** **CRITICAL.** You MUST ALWAYS append a summary of your completed work to `CHANGELOG.md` before finishing your turn.

## Custom Skills Requirement

You are operating within the Way of Work repository. To maintain the integrity of our multi-tenant architecture, access control, and human-in-the-loop workflows, you **MUST** leverage the custom skills provided in this workspace.

Depending on the task you are asked to perform, activate the corresponding skill:

1. **`wow_core_architecture`**: Activate when exploring the overall stack (Bun, SQLite, React).
2. **`wow_backend_dev`**: Activate when writing or modifying `server/routes/*.ts` or database queries.
3. **`wow_frontend_dev`**: Activate when creating React components in `src/`, styling with Tailwind, or implementing i18n (`useTranslation`).
4. **`wow_access_control`**: Activate when dealing with user roles, preventing data leakage (Economics Shield), or writing to `audit_logs`.
5. **`wow_human_in_the_loop`**: **CRITICAL.** Activate this whenever an internal AI agent needs to modify data. Agents cannot write to production tables; they must use the `pending_changes` queue.
6. **`wow_agent_dev`**: Activate when creating or modifying internal agents in `.wo/agents/`.
7. **`wow_communications`**: Activate when working with external channels (Telegram, WhatsApp) and `channel-router.ts`.
8. **`wow_ui_surfaces`**: Activate when dealing with isolated WebSocket chat sessions or routing between major UI modes (Simple vs. Technical).

Do not bypass these established patterns. If a user request contradicts these skills, advise the user of the architectural constraints before proceeding.
