# Way of Work: Multi-User Architecture

Way of Work is designed from the ground up as a multi-user, multi-tenant platform. While users share the same infrastructure and core agent engine, their data, conversations, and operations remain strictly isolated.

## 1. Data Isolation (The Tenant Boundary)
The system employs a strict **multi-tenant architecture**. Every core database record (Projects, Tasks, Time Entries, Pending Changes) includes a `tenant_id` field.

*   **Boundary Enforcement:** All database queries are automatically filtered by the current user's `tenant_id`. 
*   **Security:** Users from Tenant A are cryptographically and logically separated from Tenant B. There is no shared access to data, ensuring compliance and privacy.

## 2. Session Isolation (The WebSocket Boundary)
When you interact with the UI (Claw, Simple, Kanban), your browser establishes a secure, authenticated WebSocket connection to the Way of Work backend.

*   **Private Sessions:** Each WebSocket connection is independent. The server maintains separate `ws.data` context objects for every active user session, storing individual chat histories, streaming states, and temporary workspace contexts.
*   **No Leakage:** User A's chat messages or agent operations cannot be seen or manipulated by User B, as their sessions are scoped entirely to their respective connections.

## 3. Concurrent Agent Orchestration
You do not have a single "Claw" or "Agent" that handles all requests. Instead, the system uses an **Orchestrator** model to manage concurrency.

*   **The Orchestrator:** Acts as a high-speed traffic controller. When a message arrives, the Orchestrator identifies the tenant, the specific user, and the required agent capabilities.
*   **Isolated Turns:** Agent actions ("turns") are processed in isolated execution contexts. Even if ten users send messages at the exact same millisecond, the Orchestrator queues and dispatches these turns independently.
*   **Headless Execution:** For automated tasks (e.g., scheduled backups or morning dispatches), the system initiates "headless" turns. It loads the specific tenant context, performs the scheduled task, logs the result to that tenant's database, and gracefully terminates the turn.

## Summary for Operators
*   **Surface Flexibility:** The UI mode you choose (Claw, Simple, Kanban) is just a "surface." It is a window through which you interact with your isolated workspace.
*   **Consistent Experience:** While the platform is shared, your team's *operational reality*—your schedules, your agents, and your data—remains private and consistent only to your team, regardless of concurrent activity on the same infrastructure.
