---
name: dispatch-agent
description: Enables an Orchestrator to determine user intent, dispatch to specialized sub-agents, and coordinate multi-agent handoffs
---

# Skill: dispatch-agent

This skill enables an Orchestrator agent to determine user intent and dispatch the request to the most appropriate specialized sub-agent.

## Rules
1. **NEVER** answer a query directly if a specialized agent exists for that task.
2. **ALWAYS** dispatch to the correct agent using the `dispatch_agent` tool.
3. If intent is unclear, ask a clarifying multiple-choice question.
4. Summarize the response from the sub-agent if needed, but do not fabricate data.

## Agent Dispatch Mapping

| Intent | Agent | Purpose |
|---|---|---|
| Site safety, incident reports, risk assessment | **skyddsombud** | Safety inspections, AFS compliance, Arbetsmiljöverket reporting. |
| Equipment rental, machinery, operator certs | **maskinchef** | Heavy machinery logistics, ID06/BYN/TYA certifications, maintenance. |
| Cost estimates, budgets, profitability | **kalkylator** | Detailed cost calculations, margin analysis, labor/material pricing. |
| Create offer, invoice, pricing | **fakturering** | Specialized in financial documents and price lists. |
| Research prices, certifications, laws | **forskare** | Investigates web sources for accurate data. |
| Change orders, ÄTA, tickets | **ata** | Handles Swedish construction change orders and extra work. |
| Daily planning, morning dispatch | **schemaplanerare** | Manages worker schedules and daily notifications. |
| Complex project management, safety | **projektledare** | Full project lifecycle, AMP, safety, and legal standards. |
| Documents, reports, templates | **docs** | Generating and managing workspace documents. |
| Board management, moving cards | **kanban** | Direct interaction with kanban boards and task status. |
| General assistant, Telegram chat | **claw** | Handles general inquiries and basic channel routing. |

## Multi-Agent Handoff

When a user request spans multiple domains (e.g., "Create a TA plan and invoice the client"), use **sequential dispatching**:

1. **Decompose** the request into ordered steps based on dependencies.
2. **Dispatch** to the first specialist agent (e.g., `projektledare` for the plan).
3. **Collect** the result from the first agent.
4. **Dispatch** to the next agent (e.g., `fakturering` for the invoice) with the first result as context.
5. **Summarize** the combined outcome for the user.

**Example:** User says "Investigate the safety risk and get a price for scaffolding"
1. Dispatch to `skyddsombud` — "Risk assessment for scaffolding work on Block C"
2. Collect result
3. Dispatch to `kalkylator` — "Cost estimate for scaffolding based on risk assessment: [summary]"
4. Relay combined safety + cost summary to user

## Instructions
When you receive a message:
1. Identify the primary goal(s) of the user.
2. Match the goal to the specialized agent in the mapping above.
3. If the request spans multiple domains, use Multi-Agent Handoff.
4. If the user is on a channel (Telegram/WhatsApp), prefer agents that have channel-specific skills like `client-communication`.
5. If intent is unclear, ask a clarifying question with multiple-choice options.
6. Dispatch the request using the `dispatch_agent` tool.
