# WOW-011 [Time Verification & Scheduling Agent] Tidsverifiering, schemaläggning och morgonutskick via Telegram

## Problem Statement

Tidrapporter från arbetare måste verifieras mot planeringen i kanban-tavlan. Idag finns ingen automatisk kontroll — ledaren måste manuellt jämföra rapporterad tid med planerade timmar. Det finns inte heller något automatiskt morgonschema för arbetarna. Arbetare bör få ett Telegram-meddelande varje morgon med dagens arbetsuppgifter baserat på deras kanban-kort.

## Desired Outcome

En agent som dagligen:
1. Granskar alla tidrapporter från gårdagen mot kanban-planeringen
2. Skickar en sammanställning till admin/projektledare med avvikelser och förslag
3. Skapar ett förslag för dagens schema baserat på kanban-kortens status
4. Skickar Telegram till varje arbetare kl 06:30 med deras personliga att-göra-lista

Alla förslag går genom **human-in-the-loop** (WOW-010) — agenten skickar förslag, admin godkänner, först då skickas meddelanden eller scheman.

## Context & Background

### Current State
- Time entries via `kanban_log_time` sparas som `pending` för ledarens godkännande
- Kanban-kort har `assigned_to`, `estimated_hours`, deadline
- Telegram-bot finns men används endast för inkommande meddelanden (ingen outbound scheduling)
- Inget automatiskt morgonutskick

### Why This Matters
- Projektledaren lägger timmar per dag på manuell tidssammanställning
- Arbetare behöver veta vad de ska göra när de kommer till arbetsplatsen
- Avvikelser i tid upptäcks ofta för sent → budgetöverskridanden
- Telegram är redan etablerat som kanal

## Requirements

### Functional Requirements
- [ ] Agent läser tidrapporter: `GET /api/portal/time` eller `kanban_card_time_logs`
- [ ] Agent läser kanban-planering: `kanban_list_cards` med assignee och estimated_hours
- [ ] Agent jämför rapporterad tid mot planerad tid per kort
- [ ] Agent skapar avvikelserapport: "Kort X: planerat 8 h, rapporterat 10 h (+2 h)"
- [ ] Agent föreslår morgondagens schema: delar ut kort per arbetare baserat på deadline/status
- [ ] Schemaförslag går via godkännandekön (WOW-010) — admin klickar Godkänn
- [ ] Vid godkännande: Telegram skickas till varje arbetare kl 06:30 med dagens uppgifter
- [ ] Telegram-meddelande innehåller: kortnamn, projekt, prioritet, planerade timmar

### Out of Scope
- Realtids-ändringar av schema under dagen — framtida
- GPS-verifiering av närvaro — framtida
- Automatisk omfördelning vid sjukfrånvaro — framtida
- Löneunderlag — framtida

## Acceptance Criteria

### Automated Verification
- [ ] Build completes: `bun run build`

### Manual Verification
- [ ] Agent kan lista tidrapporter för alla arbetare
- [ ] Agent kan lista kanban-kort per arbetare med estimated_hours
- [ ] Agent identifierar avvikelser >20% mellan planerat och rapporterat
- [ ] Agent skapar schemaförslag som pending_change
- [ ] Admin godkänner → Telegram skickas till arbetarna
- [ ] Meddelandet innehåller rätt uppgifter per person

## Technical Notes

### Agent: `schemaplanerare` (Schedule Planner)

```
name: schemaplanerare
description: Swedish construction scheduler — verifies time, plans daily work, sends Telegram
skills: kanban-time, workers, client-communication, research
```

### Workflow

```
06:00 — Agent kör daglig rutin:
  1. Hämta alla tidrapporter från igår
  2. Hämta alla kanban-kort med assignees
  3. Jämför: planerat vs rapporterat per kort
  4. Skapa avvikelserapport → pending_change

  5. Hämta alla aktiva kort sorterade på deadline
  6. Fördela kort per arbetare för idag
  7. Skapa schemaförslag → pending_change

08:00 — Admin godkänner (eller justerar och godkänner):

  8. Telegram skickas till varje arbetare:
     "God morgon! Dina uppgifter idag:
      🟢 Projekt X — Montering fönster (planerat 6h)
      🟡 Projekt Y — Tätskikt badrum (planerat 4h)"
```

### Scheduled Execution

Använd befintlig `ClawScheduleExecutor` (`server/claw-schedule-executor.ts`):
- Schedule: dagligen 06:00
- Action: kör agenten `schemaplanerare`
- Output: pending_changes för admin

### Telegram Sending

Återanvänd `sendTelegramMessage` från `server/telegram-bot.ts`:
- Slå upp arbetarens Telegram-länk i `user_channel_links WHERE channel='telegram'`
- Skicka meddelande med dagens uppgifter
- Logga i `channel_message_logs`

### API Endpoints Needed

| Method | Path | Description |
|---|---|---|
| GET | `/api/schedule/daily-proposal` | Generate daily schedule proposal |
| POST | `/api/schedule/daily-proposal/approve` | Approve and send Telegram |
| GET | `/api/time/verification-report` | Get time verification report |
| POST | `/api/time/verification-report/submit` | Submit report as pending_change |

### DB Schema (if needed)

```sql
-- Scheduled messages log
CREATE TABLE IF NOT EXISTS scheduled_messages (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    channel TEXT NOT NULL,
    message_text TEXT NOT NULL,
    scheduled_for TEXT NOT NULL,
    sent_at TEXT,
    status TEXT DEFAULT 'pending',  -- pending, sent, failed
    created_at TEXT DEFAULT (datetime('now'))
)
```

### Meddelandemall (Telegram)

```
God morgon, [namn]! 🌅

Dina uppgifter idag [datum]:

🏗️ [Projekt]
  ▢ [Kortnamn] — [planerad tid]h (prioritet: [hög/medel])
  ▢ [Kortnamn] — [planerad tid]h

⏱️ Planerad tid totalt: [X]h
📋 Svara på detta meddelande för frågor
```

### Affected Components
- `.wo/agents/schemaplanerare.md` — new agent
- `.wo/skills/scheduling/SKILL.md` — new skill for scheduling methodology
- `server/claw-schedule-executor.ts` — daily 06:00 trigger
- `server/telegram-bot.ts` — outbound scheduled messages
- `server/db.ts` — scheduled_messages table
- `server/pending-changes-api.ts` or equivalent (WOW-010)
- AdminDashboard — time verification UI

---

## Meta

**Created**: 2026-05-22
**Priority**: High
**Estimated Effort**: XL
**Status**: Planned — depends on WOW-010 (human-in-the-loop)
