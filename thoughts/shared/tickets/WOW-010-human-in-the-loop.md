# WOW-010 [Human-in-the-Loop] Godkännandekö för AI-förslag — människan måste verifiera innan data blir aktiv

## Problem Statement

AI-agenter kan föreslå prisuppdateringar, planändringar, schemaläggning och meddelanden, men de kan göra fel. Systemet har idag ingen spärr — om en agent anropar `PUT /api/price-lists` går ändringen live direkt. Kunden måste ha kontroll och ta ansvar för sitt eget system.

Alla dataändringar från AI måste gå genom en **godkännandekö** där en admin (människa) klickar "Godkänn" eller "Avvisa" innan ändringen blir aktiv.

## Desired Outcome

Ett generiskt `pending_changes`-system där AI endast skapar **förslag/utkast**. En admin i Admin Console ser kön, granskar diffen och godkänner eller avvisar. Först vid godkännande skrivs datan till live-tabellerna. Samma mekanism återanvänds för prislistor, planering, scheman, meddelanden — allt.

## Context & Background

### Current State
- `PUT /api/price-lists/:id` skriver direkt till DB — AI kan omedelbart ändra levande priser
- Inget `pending_changes`-koncept finns
- Agenter (`forskare`, `projektledare`) instrueras att "fråga användaren först" men har ingen teknisk spärr
- ÄTA-systemet har en liknande workflow (draft → review → approve) men det är per-ärende, inte generiskt

### Why This Matters
- AI kan hallucinera priser eller missförstå kontext
- Kunden måste juridiskt kunna stå för sina prislistor och anbud
- Revision: vem ändrade vad och när godkändes det?
- Samma mekanism behövs för planering, tid, meddelanden, scheman

## Requirements

### Functional Requirements
- [ ] `pending_changes` DB-tabell: tenant_id, change_type, status (pending/approved/rejected), proposed_data (JSON), current_data (JSON), summary, suggested_by, approved_by, approved_at
- [ ] `POST /api/pending-changes` — AI skapar ett förslag (status: pending)
- [ ] `GET /api/admin/pending-changes` — Admin ser alla pending-förslag
- [ ] `POST /api/admin/pending-changes/:id/approve` — Admin godkänner → datan skrivs till live-tabell
- [ ] `POST /api/admin/pending-changes/:id/reject` — Admin avvisar med orsak
- [ ] Admin Console-flik "Godkännandekö" med diff-visning (före/efter)
- [ ] Price list-API ändras: AI kan bara skapa pending_changes, inte direktuppdatera
- [ ] Planering, scheman, batch-meddelanden använder samma mekanism

### Out of Scope
- Automatiskt godkännande baserat på regler — framtida
- Rollbaserade godkännanderegler (vem får godkänna vad) — framtida
- Eskalering vid försenat godkännande — framtida

## Acceptance Criteria

### Automated Verification
- [ ] Build completes: `bun run build`

### Manual Verification
- [ ] AI föreslår prisändring → syns i admin-kön som "pending"
- [ ] Admin ser diff: "Grävmaskin: 700 → 750 kr/h"
- [ ] Admin klickar Godkänn → prislistan uppdateras
- [ ] Admin klickar Avvisa → ingen ändring, status blir "rejected"
- [ ] Alla agenter (`forskare`, `projektledare`, `fakturering`) instrueras att endast skapa förslag
- [ ] Befintlig `PUT /api/price-lists/:id` kräver admin-roll (ej agent)

## Technical Notes

### Architecture

```
AI Agent → POST /api/pending-changes → pending_changes (status=pending)
                                              ↓
                                    Admin Console ← GET /api/admin/pending-changes
                                              ↓
                                    Admin klickar "Godkänn"
                                              ↓
                                    POST /api/admin/pending-changes/:id/approve
                                              ↓
                                    proposed_data skrivs till live-tabell
                                              ↓
                                    pending_changes.status = 'approved'
```

### Database

```sql
CREATE TABLE IF NOT EXISTS pending_changes (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    change_type TEXT NOT NULL,        -- 'price_update', 'plan_change', 'schedule', 'message'
    status TEXT DEFAULT 'pending',    -- 'pending', 'approved', 'rejected'
    target_table TEXT NOT NULL,       -- 'price_lists', 'offers', 'tasks', etc.
    target_id TEXT,                   -- ID of the record to update (null for creates)
    proposed_data TEXT NOT NULL,      -- JSON: the new data
    current_data TEXT,                -- JSON: snapshot of current data (for diff)
    summary TEXT NOT NULL,            -- Human-readable: "Update excavator price 700→750 kr/h"
    suggested_by TEXT,                -- Agent name: "forskare"
    suggested_by_user TEXT,           -- User ID of the human who asked (if any)
    approved_by TEXT,                 -- Admin user ID
    approved_at TEXT,
    rejected_reason TEXT,
    created_at TEXT DEFAULT (datetime('now'))
)
```

### API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/pending-changes` | Any (agent) | Create a pending change suggestion |
| GET | `/api/admin/pending-changes` | ADMIN | List all pending changes |
| GET | `/api/admin/pending-changes/:id` | ADMIN | Get single change with diff |
| POST | `/api/admin/pending-changes/:id/approve` | ADMIN | Approve → write to live table |
| POST | `/api/admin/pending-changes/:id/reject` | ADMIN | Reject with reason |

### Approval Hook

When approve is called, the server:
1. Reads `proposed_data` and `target_table`/`target_id`
2. Executes the actual UPDATE/INSERT on the target table
3. Marks `pending_changes.status = 'approved'`
4. Logs the audit trail

### Agent Instructions

All agents updated to never call `PUT /api/price-lists` directly. Instead:
- `POST /api/pending-changes` med `change_type: "price_update"`
- Berätta för användaren: "Förslag skickat till admin för godkännande"

### UI Component: ApprovalQueue

New tab in AdminDashboard: "Godkännandekö" showing:
- Table of pending changes: summary, type, suggested_by, created_at
- Expandable row showing diff (proposed vs current)
- Godkänn / Avvisa buttons
- Badge count on tab

### Affected Components
- `server/db.ts` — new `pending_changes` table
- `server/routes/admin.ts` — GET/POST approve/reject endpoints
- `server/index.ts` or new `server/pending-changes-api.ts` — POST create
- `src/pages/AdminDashboard.tsx` — new ApprovalQueue tab
- `.wo/agents/forskare.md` — agent instructions (only suggest, never write)
- `.wo/agents/projektledare.md` — agent instructions
- `.wo/agents/fakturering.md` — agent instructions
- All existing API routes that agents call — add role check (ADMIN-only for direct writes)

---

## Meta

**Created**: 2026-05-22
**Priority**: Critical
**Estimated Effort**: XL
**Status**: Planned
