# WOW-006 Refactor server/index.ts into smaller modules

## Problem Statement
`server/index.ts` has grown to over 3400 lines. It handles everything from WebSocket connections to a massive `if/else` chain for every single API route (`/api/portal/*`, `/api/admin/*`, `/api/projects`, etc.). This makes it hard to maintain, test, and collaborate on. We should no longer add routes directly to `server/index.ts`.

## Desired Outcome
A modular server architecture where routes and WebSocket handlers are broken out into separate files organized by domain. `server/index.ts` should only contain the server initialization and a clean router delegator.

## Plan & Approach

### Phase 1: Router Abstraction
1. Create a lightweight routing utility (e.g., `server/router.ts`) to replace the giant `if/else` block. It should support HTTP method and path matching (e.g., `router.get('/api/projects', handler)` or URL pattern matching).

### Phase 2: Domain Extraction (API Routes)
Gradually break out the endpoints into a new `server/routes/` or `server/api/` directory:
- **Portal & Worker:** Extract `/api/portal/me`, `/api/portal/tasks`, `/api/portal/time`, `/api/portal/files` into `server/routes/portal.ts`.
- **Project Management:** Extract `/api/projects`, `/api/notes`, `/api/calendar/events` into `server/routes/projects.ts` & `server/routes/calendar.ts`.
- **Admin:** Extract `/api/admin/*` into `server/routes/admin.ts`.
- **Client:** Extract `/api/client/*` into `server/routes/client.ts`.
- **System/Claw/Dev:** Extract claw automation, index syncing, and dev tunnel logic into `server/routes/system.ts`.

### Phase 3: WebSocket & Helper Extraction
- Move the WebSocket `open`, `close`, and `message` handlers out of the giant `Bun.serve` block and into `server/ws-handler.ts`.
- Extract helper functions like `json()`, `logLine()`, and token usage emitters to a `server/utils.ts` or similar shared file.

### Phase 4: Enforce the Pattern
- Ensure no new routes are added to `server/index.ts`.
- All new features must be created in their own module and imported into the main router.

## Acceptance Criteria
- `server/index.ts` is significantly reduced in size (target < 500 lines).
- All API routes use the new routing pattern and are separated by domain.
- `bun run build` and tests pass with no regressions in functionality.

---

**Priority**: Medium
**Estimated Effort**: M to L
