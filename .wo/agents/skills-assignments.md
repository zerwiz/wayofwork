# Agent Skill Assignments
# Define which skills each agent uses

## skyddsombud-safety-agent
skills:
  - incident-reporting
  - safety
  - research
  - web-fetch (weather, regulations)
  - telegram_send

## maskinchef-machinery-agent
skills:
  - cost-estimation (equipment costs)
  - procurement (rental equipment)
  - research (certification verification)
  - procurement (machine pricing)

## kalkylator-calculation-agent
skills:
  - cost-estimation
  - project-pricing
  - time-calculation
  - research (market prices)

## supply-agent
skills:
  - procurement
  - research (prices, suppliers)

## project-pricing (existing)
skills:
  - project-pricing
  - cost-estimation
  - procurement

## time-verification (WOW-011)
skills:
  - time-calculation
  - kanban-board
  - scheduling
  - research (weather via web-fetch)

## dispatch-agent (new)
skills:
  - dispatch-agent

## AtD (Work Ticket)
skills:
  - swedish-building-laws
  - project-pricing
  - research (ATU certifications)

## ata (Elsäkerhetsverket)
skills:
  - research (certification info)
  - swedish-building-laws
