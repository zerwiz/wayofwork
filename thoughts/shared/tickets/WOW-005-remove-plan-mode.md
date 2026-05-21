# WOW-005 Remove Plan Mode

## Problem Statement
The "plan mode" feature is no longer needed and adds unnecessary complexity to the application logic and user interface. 

## Desired Outcome
Complete removal of "plan mode" across both the frontend and backend of the application.

## Requirements
- Remove `"plan"` from `ChatSessionMode` types.
- Remove UI mode selections or slash commands that activate plan mode (e.g., `/plan`).
- Remove logic in `server/index.ts` and `server/session-prompts.ts` that handles `chatMode === "plan"`.
- Remove references to `planner.md` or planner agent bodies in the backend (`applyLeadFromCache`, etc.).

## Technical Notes
- Search for `"plan"` and `chatMode` in the `server/` and `src/` directories.
- Affected files likely include `server/index.ts`, `server/session-prompts.ts`, and frontend command palettes or chat inputs.

---

**Priority**: Medium
**Estimated Effort**: S
