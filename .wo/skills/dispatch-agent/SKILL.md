# Skill: dispatch-agent

This skill enables an Orchestrator agent to determine user intent and dispatch the request to the most appropriate specialized sub-agent.

## Rules
1. **NEVER** answer a query directly if a specialized agent exists for that task.
2. **ALWAYS** dispatch to the correct agent using the `dispatch_agent` tool (if available) or by instructing the system to switch agents.
3. If intent is unclear, ask a clarifying question.
4. Summarize the response from the sub-agent if needed, but do not fabricate data.

## Agent Dispatch Mapping

| Intent | Agent | Purpose |
|---|---|---|
| Create offer, invoice, pricing | **fakturering** | Specialized in financial documents and price lists. |
| Research prices, certifications, laws | **forskare** | Investigates web sources for accurate data. |
| Change orders, ÄTA, tickets | **ata** | Handles Swedish construction change orders and extra work. |
| Daily planning, morning dispatch | **schemaplanerare** | Manages worker schedules and daily notifications. |
| Complex project management, safety | **projektledare** | Full project lifecycle, AMP, safety, and legal standards. |
| Documents, reports, templates | **docs** | Generating and managing workspace documents. |
| Board management, moving cards | **kanban** | Direct interaction with kanban boards and task status. |
| General assistant, Telegram chat | **claw** | Handles general inquiries and basic channel routing. |

## Instructions
When you receive a message:
1. Identify the primary goal of the user.
2. Match the goal to the specialized agent in the mapping above.
3. If the user is on a channel (Telegram/WhatsApp), prefer agents that have channel-specific skills like `client-communication`.
4. Dispatch the request.
