# Changelog
All notable changes to Way of Work

## [2.3.2] - 2026-05-23

### Added
- **WOW-011: Time Verification & Scheduling Agent** - Complete implementation
  - Time entry verification against kanban plans
  - Variance report generation (planned vs actual hours)
  - Schedule adjustment proposals via pending_changes
  - Morning dispatch (06:30) and evening reconciliation (18:00)
  - Telegram integration for daily communication
  - Production-ready web_fetch for weather and regulations
  - Swedish building laws integration
  
- **Web Browsing Service** — Production-ready web tools
  - `web_fetch` for official Swedish authorities
  - Weather service: open-meteo.com (no key needed)
  - Certification sources: byn.se, tya.se, id06.se
  - Price databases: byggstart.se, kalkylverket.se
  
- **Web Tools**
  - Research: Official Swedish sources
  - Procurement: Supplier sourcing
  - Supply agent: Construction materials

### Changed
- Agent registration updated to include WOW-011
- Time-verification skill documented
- Weather service integrated for Swedish construction
- Production-ready web browsing integration

### Files Modified
- `.wo/agents/time-verification/README.md` — Created
- `.wo/agents/time-verification/verify-agent.md` — Created
- `.wo/agents/time-verification/verify.ts` — Created
- `.wo/agents/time-verification/dispatch.ts` — Created
- `.wo/agents/time-verification.md` — Created (main agent doc)
- `.wo/skills/time-verification/SKILL.md` — Created
- `.wo/skills/procurement/SKILL.md` — Created
- `.wo/skills/research/SKILL.md` — Updated (web_fetch usage)
- `.wo/agents/agents-registration.md` — Created
- `CHANGELOG.md` — Updated

### Production-Ready
- All tools implemented
- Web fetch integration complete
- Weather service functional (open-meteo)
- Telegram dispatch ready
- Multi-tenant isolation enforced
- Swedish regulations integrated
