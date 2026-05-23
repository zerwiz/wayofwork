# Claw: The Operator Shell for Way of Work

Claw is the **mission-control operator shell** of the Way of Work system. While *Simple* mode provides a clean chat window and *Technical* mode offers IDE-style development, Claw is specifically designed for running **autonomous, persistent, and scheduled agent tasks**.

## Core Purpose
Claw acts as the "home base" for Way of Work agents. It is optimized for operational tasks rather than immediate interactive coding or simple chat.

### Key Features
*   **Mission Control:** A dashboard for tracking autonomous operations, agent state, and live activity.
*   **Persistent & Scheduled Tasks:** Manages automated workflows, recurring cron-based tasks, and long-running autonomous operations.
*   **Agent Identity:** Claw manages the agent's persistent "soul" and memory through a host-scoped configuration folder.
*   **Channel Integrations:** Bridges the agent into external channels (like Telegram and WhatsApp) for remote dispatch and monitoring.

## System Architecture & Path Handling
Claw distinguishes between your project source code and the agent's operating context:

*   **Project Workspace (`WOP_WORKSPACE`):** Your active project source code.
*   **Host Workspace (`.claw/workspace/`):** Claw configuration files that persist regardless of your active project. This folder holds the agent's core identity and memory, including:
    *   `SOUL.md`: Defines agent personality and behavioral boundaries.
    *   `AGENTS.md`: Defines available agents and their team structure.
    *   `MEMORY.md`: Short-term operator index for session context.
    *   `TOOLS.md`: Log of agent tool usage and adaptations.

## Integration with Other Modes
Claw shares the **same underlying engine** as Simple and Technical modes. All skills, tools, and extensions are compatible across these surfaces. The primary difference is the operator-focused chrome and the persistent context provided by Claw.

## Claw Schedules (`.claw/schedule/`)
The `.claw/schedule/claw-schedules.v1.json` file acts as a registry for automated, persistent agent tasks. 

### Structure
Each entry in the `schedules` array defines a task for the Way of Work engine:
*   **`cron`**: Standard cron syntax determining when the task runs.
*   **`triggerMode`**: Specifies if the task is triggered by `cron` or a one-time `once` event.
*   **`agentName`**: The designated agent responsible for executing the task prompt.
*   **`prompt`**: The full instructions given to the agent upon trigger.
*   **`status`**: Controls whether the automation is `enabled` or `disabled`.

### Execution
When the server starts (with `WOP_CLAW_SCHEDULER=1`), it polls these definitions. Upon trigger, the server initiates a headless agent turn using the defined `prompt`, allowing for seamless automated workflows (e.g., daily backups, report generation, team dispatches) without requiring manual interaction.

## Extending Claw
You can extend Claw's capabilities just as you do in other modes:
*   **Skills:** Use markdown-based playbooks for repeatable agent tasks.
*   **Extensions:** Register custom tools and slash commands via TypeScript extensions loaded from the `.pi/extensions/` path.
*   **UI Modules:** Add custom rail tabs or full-width operator panels by registering modules at app startup.
