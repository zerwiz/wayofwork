---
name: document-generation
description: Swedish offer and invoice document generation — templates, PDF, HTML, numbering
---

## Document types

### Offer (Anbud)

An offer document contains:
- **Offer number** — Auto-generated (`ANB-YYYY-NNN`)
- **Date** — Issue date
- **Valid until** — Offer validity period (typically 30–90 days)
- **Client info** — Company name, org number, contact, address
- **Project info** — Project name, location, description
- **Items** — Line items with description, quantity, unit, unit price, total
- **Summary** — Net total, VAT (25%), grand total
- **Terms** — Payment terms, delivery terms, validity, reference to AB 04/ABT 06

### Invoice (Faktura)

An invoice document contains:
- **Invoice number** — Auto-generated (`INV-YYYY-NNN`)
- **Reference to offer** — If created from an offer
- **OCR number** — Payment reference
- **Due date** — Typically 30 days from invoice date
- **Client info, project info, items** — Same structure as offer
- **VAT breakdown** — 25% on most construction services
- **Bank details** — Account number, clearing number
- **Payment terms** — Dröjsmålsränta (late payment interest) per räntelagen

## Document generation

### API endpoints

- `GET /api/offers/:id/document` — Returns HTML document for an offer
- `GET /api/invoices/:id/document` — Returns HTML document for an invoice
- Documents are generated as styled HTML with print CSS for PDF export
- Client can use browser print (Ctrl+P) → "Save as PDF" for PDF export

### Numbering format

- Offers: `ANB-{YYYY}-{NNN}` (e.g. `ANB-2026-001`)
- Invoices: `INV-{YYYY}-{NNN}` (e.g. `INV-2026-001`)
- Numbers auto-increment per tenant per year

### Status workflow

```
Offer: draft → sent → accepted → rejected → invoiced
Invoice: draft → sent → paid → overdue → cancelled
```

## Swedish document standards

- **AB 04 §6** — Anbudets bindningstid (offer validity period)
- **Räntelagen (1975:635)** — Late payment interest
- **Bokföringslagen (1999:1078)** — Archiving requirements (7 years)
- **Skatteverket** — VAT rules for construction services (25%, omvänd skattskyldighet)
- **Fakturalagen (2013:586)** — Invoice content requirements:
  - Invoice number, date, due date
  - Seller VAT number
  - Buyer VAT number
  - Quantity and type of goods/services
  - Net amount, VAT rate, VAT amount, total
  - Reference to underlying agreement/offer

## Swedish terms

- Anbud — Offer / quotation
- Faktura — Invoice
- Offert — Quotation (sometimes synonymous with anbud)
- Orderbekräftelse — Order confirmation
- Prislista — Price list
- Dröjsmålsränta — Late payment interest
- Betalningsvillkor — Payment terms
- Förfallodatum — Due date
- OCR-nummer — Payment reference number
- Omvänd skattskyldighet — Reverse VAT charge
- Byggnadsentreprenad — Construction contract
- Delbetalning — Partial payment
- Slutfaktura — Final invoice
