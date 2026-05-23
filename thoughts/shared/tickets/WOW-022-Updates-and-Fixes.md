# [WOW-022] General Updates and Fixes

## Problem Statement
Several outstanding tasks and verification items remain from the `TODO.md` backlog that are critical for overall system stability and production readiness.

## Desired Outcome
Complete pending audits, verifications, and agent integrations to ensure the system behaves as expected in production scenarios.

## Context & Background
### Current State
A set of miscellaneous tasks is listed in `TODO.md`, spanning multi-tenancy audits, agent integration tests, and workflow verification.

## Requirements
### Functional Requirements
- [ ] **Multi-Tenancy Audit**: Verify Tenant A → Tenant B data isolation in key endpoints (projects, tickets, price lists).
- [ ] **Agent Integration Test**: Create a test script to verify Wo Agent tools access real DB endpoints.
- [ ] **WOW-008 Verification**: Manually trigger `projektledare` agent to read price lists and estimate project cost.
- [ ] **WOW-009 Verification**: End-to-end test of offer/invoice sending via TG/WA (use mock channel/log).
- [ ] **Claw Workspace Onboarding**: Implement logic to detect if the Claw workspace (SOUL.md, AGENTS.md, etc.) is missing. If missing, automatically trigger the onboarding modal to prompt the user to initialize the workspace.

## Acceptance Criteria
### Manual Verification
- [ ] Multi-tenancy isolation confirmed via cross-tenant API requests (should return 403 or empty data).
- [ ] Agent integration tests pass using a test script.
- [ ] `projektledare` reads price lists successfully.
- [ ] Offer/invoice sending triggered and logged successfully.

## Technical Notes
### Test Plan
1. **Multi-tenancy**: Use two different `WOP_AUTH_SECRET` or login tokens for Tenant A and Tenant B, attempt to access Tenant A's projects with Tenant B's token.
2. **Agent Integration**: Run a script that invokes `orchestrator-tools` for a known task, checking for valid JSON DB output.
3. **Agent Price List**: Chat with `projektledare` agent to fetch prices for a specific material and create an estimate.
4. **Offer/Invoice**: Use `kanban` or `fakturering` agent to create and "send" an offer, verify the `audit_logs` entry.
---

## Meta

**Created**: 2026-05-23
**Priority**: Medium
**Estimated Effort**: M
