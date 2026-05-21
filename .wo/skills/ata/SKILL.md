---
name: ata
description: Swedish ÄTA (Ändrings-, Tilläggs- och Avgående arbeten) change order management
---

## ÄTA basics

ÄTA is the Swedish construction change order system:
- **Ändring** — Change to existing scope
- **Tillägg** — Addition to the contract
- **Avgående** — Deduction from the contract

## Status workflow

1. **draft (Utkast)** — Newly created, not yet submitted
2. **pending_review (Väntar granskning)** — Submitted for review
3. **pending_approval (Väntar godkännande)** — Reviewed, waiting for approval
4. **approved (Godkänd)** — Approved by client/leader
5. **rejected (Avslagen)** — Rejected with reason
6. **invoiced (Fakturerad)** — Invoiced to client

## API endpoints

- `GET /api/tickets` — List all ÄTA tickets
- `POST /api/tickets` — Create with title, description, category (ändring/tillägg/avgående), priority, cost_estimate
- `GET /api/tickets/:id` — Get single ticket
- `PUT /api/tickets/:id` — Update status, cost_estimate, cost_actual
- `POST /api/tickets/:id/review` — Submit for review
- `POST /api/tickets/:id/approve` — Approve
- `POST /api/tickets/:id/reject` — Reject with reason

## Interview flow

When creating an ÄTA, ask:
1. **Type**: Ändring, Tillägg, or Avgående?
2. **Title**: What changed?
3. **Description**: Details
4. **Cost estimate**: Estimated cost (optional)

## Swedish terminology

- "Skapa en ny ÄTA" — Create a new ÄTA
- "Vilken typ?" — Which type?
- "Granskning" — Review
- "Godkännande" — Approval
- "Fakturering" — Invoicing
