---
name: scheduling
description: Swedish construction scheduling — daily planning, time verification, worker dispatch
---

## Daily scheduling methodology

### Time verification

Compare reported time vs planned time per card:

| Metric | Formula | Threshold |
|---|---|---|
| Avvikelse | \|rapporterad - planerad\| / planerad | >20% = flagga |
| Effektivitet | planerad / rapporterad | <0.8 = för långsam, >1.2 = snabbare än plan |
| Total tid | summa per arbetare / dag | >10h = övertid, <4h = för lite |

### Daily schedule generation

Prioriteringsordning för kort:
1. **Deadline idag** (kritiska)
2. **Deadline imorgon** (hög prioritet)
3. **Hög prioritet** (p3/p4)
4. **Äldsta kortet** (först in, först ut)
5. **Uppskattad tid** — fyll arbetsdagen (normalt 8h per arbetare)

### Telegram morning dispatch

- Tid: 06:30 (eller 30 min före arbetets start)
- Innehåll: kort per arbetare med planerad tid
- Uppföljning: arbetare kan svara på meddelandet

### Swedish terms
- Dagsplanering — Daily planning
- Tidrapport — Time report
- Avvikelse — Deviation
- Effektivitet — Efficiency
- Bemanning — Staffing/crew allocation
- Resursplanering — Resource planning
- Produktionstakt — Production rate
- Morgonmöte — Morning meeting (daily standup)
