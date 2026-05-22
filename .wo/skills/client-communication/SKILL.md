---
name: client-communication
description: Sending offers and invoices to clients via WhatsApp, Telegram, and email
---

## Communication channels

### WhatsApp

**Requirement**: A WhatsApp Business Account with a configured bot in the Admin Console.

**How it works**:
1. The agent finds the client's WhatsApp link via `user_channel_links WHERE channel = 'whatsapp'`
2. Sends a message using the WhatsApp Cloud API:
   - Text: Short summary with offer/invoice number and amount
   - Can include a document link (the generated HTML/PDF)
3. Message is logged to `channel_message_logs`

**API endpoint**: `POST /api/offers/:id/send?channel=whatsapp`
**API endpoint**: `POST /api/invoices/:id/send?channel=whatsapp`

**WhatsApp message format**:
```
🏗️ New Offer: ANB-2026-001
Project: [Project Name]
Total: SEK 125 000 (incl. VAT)
Valid until: 2026-06-30

View document: [link]
Reply to this chat for questions.
```

### Telegram

**Requirement**: A Telegram bot configured in the Admin Console. Client must have linked their Telegram account.

**How it works**:
1. The agent finds the client's Telegram link via `user_channel_links WHERE channel = 'telegram'`
2. Sends a message using the Telegram Bot API (`sendTelegramMessage`)
3. Message is logged to `channel_message_logs`

**API endpoint**: `POST /api/offers/:id/send?channel=telegram`
**API endpoint**: `POST /api/invoices/:id/send?channel=telegram`

**Telegram message format**:
```
📄 Ny offert: ANB-2026-001
Projekt: [Project Name]
Totalt: 125 000 SEK (inkl. moms)
Giltig till: 2026-06-30

Visa dokument: [link]
```

### Email

**Requirement**: SMTP server configured via env vars (`WOP_SMTP_HOST`, `WOP_SMTP_PORT`, `WOP_SMTP_USER`, `WOP_SMTP_PASS`, `WOP_SMTP_FROM`).

**How it works**:
1. The agent finds the client's email from `users.email`
2. Sends a professionally formatted HTML email with:
   - Subject: "New Offer: ANB-2026-001 — [Project Name]" or "Invoice: INV-2026-001 — [Project Name]"
   - Body: Summary with key details and document link
   - The document is attached as HTML or included as a link

**API endpoint**: `POST /api/offers/:id/send?channel=email`
**API endpoint**: `POST /api/invoices/:id/send?channel=email`

**Env vars needed**:
- `WOP_SMTP_HOST` — SMTP server hostname
- `WOP_SMTP_PORT` — SMTP port (default 587)
- `WOP_SMTP_USER` — SMTP username
- `WOP_SMTP_PASS` — SMTP password
- `WOP_SMTP_FROM` — From address (e.g. "invoice@company.se")
- `WOP_SMTP_FROM_NAME` — From name (e.g. "Bygg AB Fakturering")

## Multi-channel delivery

An offer or invoice can be sent through multiple channels simultaneously:
```
POST /api/offers/:id/send?channels=whatsapp,telegram,email
```

The system tracks delivery status per channel.

## Channel prerequisites

| Channel | Required setup | Client needs |
|---|---|---|
| WhatsApp | WhatsApp Business Account + bot configured | Linked WhatsApp in user profile |
| Telegram | Telegram bot token in env | Linked Telegram in user profile |
| Email | SMTP credentials in env | Email address in user profile |

## Swedish terms

- Skicka offert — Send offer
- Skicka faktura — Send invoice
- Bekräftelse — Confirmation
- Betalningspåminnelse — Payment reminder
- Slutfaktura — Final invoice
- Delbetalning — Partial payment
- Moms — VAT
- Fakturameddelande — Invoice notification
