# WOW-015 [Communication Architecture] Telegram, WhatsApp and Email channel architecture

## Problem Statement

The platform has three communication channels (Telegram, WhatsApp, Email) in varying states of completion:
- **Telegram**: Working inbound/outbound via long-polling, but single-bot, no session persistence, no media handling
- **WhatsApp**: Outbound only (offer/invoice sending via Graph API). No inbound handler. The `whatsapp-time-bot.ts` module is dead code.
- **Email**: Not implemented at all. `users.email` exists in schema but is unused.

There is no unified architecture for how channel messages flow into the AI system, how user identity is resolved, how conversation history is maintained, or how the Orchestrator coordinates sub-agents for channel traffic.

Orchestrator should handle all inbound channel traffic (Telegram, WhatsApp, future Email) and dispatch to appropriate sub-agents.

## Desired Outcome

A unified communication architecture where:
1. **Telegram** works via webhook (not polling), supports multiple bots, has session persistence
2. **WhatsApp** has fully working inbound via webhook, uses the existing `whatsapp-time-bot.ts` for time logging
3. **Email** basic SMTP sending + inbound via webhook (IMAP/POP3 or forwarding)
4. **Orchestrator** is the central message router — all inbound channel messages go through Orchestrator which dispatches to sub-agents
5. **Session persistence** per channel user — conversation history is maintained across turns
6. **Message audit trail** — all messages (all channels, both directions) logged to `channel_message_logs`
7. **Media handling** — images, documents in Telegram/WhatsApp at minimum stored and referenced

## Context & Background

### Current Architecture

```
Telegram (long-poll every 2s)
  → telegram-bot.ts → handleMessage()
    → user_channel_links lookup
    → processBotMessage() (claw-bot-bridge)
      → runSdkChatTurn() (sdk-runtime via @wayofmono/wo-agent)
        → AI response
    → sendTelegramMessage() (outbound)

WhatsApp (no inbound — dead code)
  → whatsapp-time-bot.ts exists but is NEVER called

WhatsApp outbound only (offers-api.ts)
  → POST https://graph.facebook.com/v21.0/{phoneNumberId}/messages

Inbound Webhook (POST /api/claw/inbound)
  → executeClawAutomation()
    → runSdkChatTurn() (sdk-runtime via @wayofmono/wo-agent)

Email: NOTHING
```

### Key Files

| File | Role |
|---|---|
| `server/telegram-bot.ts` | Telegram long-poll handler, message send |
| `server/claw-bot-bridge.ts` | Shared bridge — `processBotMessage()` for Telegram + designed for WhatsApp |
| `server/sdk-runtime.ts` | `runSdkChatTurn()` — AI execution via @wayofmono/wo-agent SDK |
| `server/whatsapp-time-bot.ts` | NLP time parser — DEAD CODE (never called) |
| `server/offers-api.ts` | Outbound offer/invoice via Telegram + WhatsApp Graph API |
| `server/claw-webhook-store.ts` | Inbound webhook secret management |
| `server/claw-automation-status.ts` | Automation readiness diagnostics |

### Current Gaps

| Gap | Impact |
|---|---|
| WhatsApp inbound completely missing | Workers cannot message "4h on project X" |
| No session persistence per channel user | Each turn is isolated — no conversation context |
| Telegram long-polling only | 2s latency, no real-time |
| Telegram single bot only | Only WOP_TELEGRAM_BOT_TOKEN works |
| whatsapp-time-bot.ts is dead code | Time logging via WhatsApp exists but is unusable |
| No email infrastructure | No offer/invoice sending via email |
| No media handling | Images/docs ignored on all channels |
| Inbound webhook uses SDK runtime | executeClawAutomation uses runSdkChatTurn, consistent with chat |
| No outbound notification tools for LLM | Agent cannot proactively message workers |

## Requirements

### Phase 1: Unified Inbound Router

- [x] Create `server/channel-router.ts` — single entry point for ALL inbound channel messages
- [x] Router flow:
  ```
  [Telegram webhook / WhatsApp webhook / Email inbound]
    → channel-router.ts
      → 1. Resolve user identity (user_channel_links)
      → 2. Load or create conversation session (Enforced isolation via surface-based scoping)
      → 3. Route to Orchestrator (or specific agent based on context)
      → 4. Capture AI response
      → 5. Send outbound via appropriate channel
      → 6. Log to channel_message_logs
  ```
- [x] Orchestrator is the default handler for all inbound channel messages
- [x] Orchestrator can dispatch to sub-agents (fakturering for offers, schemaplanerare for scheduling, etc.)
- [x] Conversation session persisted as JSONL per channel user: `agent/sessions/channel/<channel>/<userId>.jsonl`
- [x] Session loaded on each message, appended after each turn (Strictly scoped)

### Phase 2: Telegram Webhook

- [ ] Replace long-polling with Telegram webhook (`setWebhook` API call)
- [ ] Endpoint: `POST /api/channels/telegram/webhook`
- [ ] Support multiple bot tokens (from `bot_telegram_accounts` table)
- [ ] Handle `edited_message` updates
- [ ] Handle media messages (photo, document) — save to workspace, pass reference to AI
- [ ] Fall back to long-polling if webhook setup fails

### Phase 3: WhatsApp Inbound

- [ ] Create `POST /api/channels/whatsapp/webhook` for WhatsApp Cloud API callbacks
- [ ] Verify webhook token on setup (`hub.mode`, `hub.verify_token`, `hub.challenge`)
- [ ] Parse inbound messages (text, interactive, document, image)
- [ ] Route through channel-router.ts
- [ ] Wire in `whatsapp-time-bot.ts` — when message is from a time-bot number, parse for time entry
- [ ] Support multiple WhatsApp business accounts (from `bot_whatsapp_accounts` table)

### Phase 4: Email (SMTP + Inbound)

- [ ] Add `WOP_SMTP_*` env vars (host, port, user, pass, from)
- [ ] Create `server/email.ts` — `sendEmail(to, subject, html)` using `nodemailer` or raw SMTP
- [ ] Outbound: send offers/invoices via email
- [ ] Inbound: `POST /api/channels/email/inbound` — receive forwarded emails (SendGrid, Mailgun, etc.)
- [ ] Parse email body (plain text + HTML → text), attachments saved to workspace

### Phase 5: Outbound Notification Tools

- [ ] Create orchestrator tools:
  - `telegram_send <userId> <message>` — send Telegram message to linked user
  - `whatsapp_send <userId> <message>` — send WhatsApp message to linked user
  - `email_send <userId> <subject> <body>` — send email to linked user
- [ ] Tools resolve user's channel link automatically
- [ ] Message template support for common notifications (task assigned, schedule, time confirmation)

### Phase 6: Audit Trail Completion

- [ ] All inbound messages logged: channel, user, text, media references, agent that handled it
- [ ] All outbound messages logged: channel, user, text, delivery status, channel message ID
- [ ] Admin Console "Message Logs" view with filtering by channel, user, date
- [ ] Message log retention policy (30 days by default, configurable)

### Out of Scope
- Voice/video call handling
- End-to-end encryption
- Multi-language message routing
- Real-time typing indicators across channels
- Email IMAP/POP3 polling (webhook forwarding only)

## Acceptance Criteria

### Automated Verification
- [ ] Build completes: `bun run build`

### Manual Verification
- [ ] Telegram message → resolved to user → AI response sent back
- [ ] WhatsApp message → resolved to user → AI response sent back
- [ ] WhatsApp "4h on project X" creates time entry via time-bot
- [ ] Email sent to configured SMTP → received
- [ ] Conversation history persists across multiple channel messages
- [ ] Admin sees all message logs with filtering
- [ ] Orchestrator dispatches to fakturering for offer-related channel queries
- [ ] Telegram webhook works (replaces polling)
- [ ] Multiple Telegram bots can be registered and receive messages

## Technical Notes

### Unified Router Design

```
channel-router.ts:
  async function handleInboundChannelMessage(opts: {
    channel: 'telegram' | 'whatsapp' | 'email',
    channelUserId: string,
    botId: string,
    messageText: string,
    media?: { type: string, url: string, mime: string }[],
  }): Promise<void> {
    // 1. Resolve user
    const link = await db.query("SELECT * FROM user_channel_links WHERE ...").get();
    if (!link) return sendPairingPrompt(channel, channelUserId);

    // 2. Load or create session
    const sessionKey = `channel-${channel}-${channelUserId}`;
    let messages = await loadSessionMessages(sessionKey);

    // 3. Route to Orchestrator (or sub-agent)
    // Orchestrator has dispatch_agent tool for sub-tasks

    // 4. Run AI turn
    const response = await runOrchestratorTurn(messages, link.tenantId, link.userId);

    // 5. Send outbound
    await sendChannelMessage(channel, channelUserId, response);

    // 6. Log
    await logChannelMessage(channel, channelUserId, messageText, response);
  }
```

### Orchestrator Channel Flow

```
Worker sends: "How many hours did I work this week?"

channel-router → Orchestrator
  Orchestrator: "Let me check your time entries."
  → dispatch_agent("schemaplanerare", "Get weekly time summary for user X")
  → schemaplanerare queries time_entries
  → Returns: "You worked 32h this week"
  → Orchestrator: "You worked 32 hours this week. Planned was 40h."
```

### Session Persistence

Session files per channel user:
```
agent/sessions/channel/telegram/123456789.jsonl
agent/sessions/channel/whatsapp/46701234567.jsonl
agent/sessions/channel/email/user@example.com.jsonl
```

Each file is a standard JSONL transcript with `session` header + `message` lines. Same format as web chat JSONL.

### Affected Components
- `server/channel-router.ts` — **New file**: unified inbound message router
- `server/telegram-bot.ts` — refactor to webhook + multi-bot
- `server/whatsapp-time-bot.ts` — wire into channel-router
- `server/whatsapp-inbound.ts` — **New file**: WhatsApp webhook handler
- `server/email.ts` — **New file**: SMTP sending + inbound forwarding
- `server/offers-api.ts` — add email as delivery channel
- `server/orchestrator-tools-exec.ts` — add telegram_send, whatsapp_send, email_send tools
- `server/claw-bot-bridge.ts` — refactor into channel-router or deprecate
- `server/wo-session-jsonl.ts` — add channel session key prefix support (rename from `wop-session-jsonl.ts`, replace `wayofpi-chat-` prefix with `wo-chat-`)
- `server/session-prompts.ts` — Orchestrator channel handler prompt
- `server/index.ts` — new webhook endpoints
- `server/routes/admin.ts` — enhanced message log views
- `src/pages/AdminDashboard.tsx` — message log UI
- `.env.example` — add SMTP + WhatsApp env vars

---

## Meta

**Created**: 2026-05-22
**Priority**: High
**Estimated Effort**: XL
**Depends on**: WOW-010 (human-in-the-loop for AI actions), WOW-013 (Orchestrator dispatch)
