---
name: research
description: Swedish construction research — certifications, prices, regulations, authorities
---

## Research domains

### Authorised URLs for web research

Use the `web_fetch` tool to investigate these sources. All are official Swedish authorities and industry bodies.

#### Myndigheter (Authorities)
- `https://www.av.se` — Arbetsmiljöverket: regler för ställning, asbest, kvarts, arbetsmiljö
- `https://www.elsakerhetsverket.se` — Elsäkerhetsverket: verifiera el-auktorisation
- `https://www.transportstyrelsen.se` — Transportstyrelsen: körkort, YKB, yrkeskompetensbevis
- `https://www.trafikverket.se` — Trafikverket: APV, kompetensportalen

#### Arbete på Väg (APV)
- `https://bransch.trafikverket.se/apv` — Krav för APV nivå 1, 2 och 3
- `https://www.trafikverket.se/tjanster/kompetensportalen/` — Verifiera APV-kompetens
- `https://foretagsservice.stockholm/tillstand-regler-och-tillsyn/markupplatelse/grava-i-gatumark/` — Gräv i Stockholm Stad
- `https://foretagsservice.stockholm/evenemang-utbildningar/utbildningar/arbete-pa-vag/` — APV-kurs Stockholm Stad

#### Yrkesnämnder (Yrkesbevis)
- `https://www.byn.se` — BYN: yrkesbevis för bygg & maskin
- `https://www.tya.se` — TYA: verifiera maskin- och truckintyg
- `https://www.maleryrkesnamnd.se` — MYN: måleribranschen
- `https://www.pvf.se` — PVF: plåt & ventilation
- `https://www.tsy.se` — TSY: trädgårdsnäringen

#### Säkerhet & Branschcertifikat
- `https://id06.se` — ID06: kortbeställning och kompetensdatabas
- `https://www.ssg.se` — SSG: entreprenadsäkerhet
- `https://www.brandskyddsforeningen.se` — Brandskyddsföreningen: heta arbeten
- `https://sakervatten.se` — Säker Vatten: VVS-certifiering
- `https://www.gvk.se` — GVK: säkra våtrum
- `https://www.byggforetagen.se` — Byggföretagen: safe construction training
- `https://www.energiforetagen.se` — Energiföretagen: ESA/EBR
- `https://www.globalwindsafety.org` — GWO: global wind safety

#### Entreprenadjuridik
- `https://www.byggandetskontraktskommitte.se` — BKK: AB 04, ABT 06, AB-U
- `https://byggforetagen.se/radgivning/entreprenadjuridik/` — Byggföretagen entreprenadjuridik

#### Övriga
- `https://www.incert.se` — Incert: kylteknik/F-gas
- `https://www.stoldskyddsforeningen.se` — SSF: stöldskydd/larm
- `https://sakerskog.se` — Säker Skog: motorsåg/röjsåg

### Price research
- `https://www.byggstart.se` — Construction price database
- `https://www.hemsmart.se` — Renovation and construction costs
- `https://kalkylverket.se` — Cost calculators and price lists
- `https://markochanlaggning.se` — Ground and foundation material prices
- `https://renta.se` — Machine rental prices
- Official supplier websites for material prices

### Certification verification workflow

1. Ask which certification to verify
2. Use `web_fetch` on the relevant authority URL
3. Search for verification page / lookup tool
4. Guide user through the verification steps

## Updating price lists

Use the `/api/price-lists` API to update prices after research:

- `GET /api/price-lists` — List all active price lists
- `PUT /api/price-lists/:id` — Update a price list with new items_json
  - Body: `{ "items_json": "[{name, unit, unit_price, category}]", "name": "..." }`
- `POST /api/price-lists` — Create new price list
  - Body: `{ "name": "...", "items_json": "[...]" }`

### Price update workflow

1. Research current market prices via web_fetch
2. Compare with existing price lists (GET /api/price-lists)
3. Present findings to user with suggested updates
4. Update price lists after user confirmation

## Swedish certification levels

### APV (Arbete på Väg)
- **Nivå 1** — Grundläggande: för alla som vistas på vägarbetsplats
- **Nivå 2** — Fördjupad: för arbetsledare och skyddsombud
- **Nivå 3** — Ledande: för projekt- och entreprenadledning

### Heta Arbeten
- Certification from Brandskyddsföreningen
- Required for: svetsning, vinkelslip, takarbeten med öppen låga
- Valid for 5 years

### Säker Vatten
- Required for all VVS-installations in wet rooms
- Certification must be renewed every 3 years
- Regler: Säkra Vatteninstallationer (branschregler)

### GVK (Våtrum)
- Required for tile installation in wet rooms
- Certification for both installers and inspectors
- Follows BBV (Byggkeramikrådets Branschregler för Våtrum)

### ID06
- Electronic ID card for construction sites
- Required by most large construction companies
- Links to: tax status, union membership, certifications
- Used for: gate access, time tracking, personnel register

## Swedish terms for research
- Yrkesbevis — Professional certificate
- Auktorisation — Authorization/license
- Behörighet — Qualification/competency
- Utbildning — Training/education
- Certifikat — Certificate
- Kompetensportal — Competence portal
- F-skatt — Tax registration for businesses
- Kollektivavtal — Collective bargaining agreement
- Branschregler — Industry regulations
- Godkänd — Approved
- Verifiera — Verify
- Förnya — Renew
