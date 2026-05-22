import { db } from "./db";
import type { Offer, Invoice, OfferItem } from "../shared/offer-types";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function uuid() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function today() {
  return now().slice(0, 10);
}

interface AuthInfo {
  userId: string;
  tenantId: string;
  role: string;
}

async function readBody<T>(req: Request, method: string): Promise<T | undefined> {
  if (method !== "POST" && method !== "PUT") return undefined;
  return await req.json().catch(() => undefined) as T | undefined;
}

function parseItems(itemsJson: string | OfferItem[] | undefined): OfferItem[] {
  if (!itemsJson) return [];
  if (Array.isArray(itemsJson)) return itemsJson;
  try { return JSON.parse(itemsJson); } catch { return []; }
}

function calcTotal(items: OfferItem[]): number {
  return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
}

// Get or create next document number for a tenant/year/prefix
function nextDocumentNumber(tenantId: string, prefix: string): string {
  const year = new Date().getFullYear().toString();
  const row = db.query("SELECT counter FROM document_counters WHERE tenant_id = ? AND prefix = ? AND year = ?")
    .get(tenantId, prefix, year) as { counter: number } | undefined;
  if (!row) {
    db.run("INSERT INTO document_counters (tenant_id, prefix, year, counter) VALUES (?, ?, ?, 1)", [tenantId, prefix, year]);
    return `${prefix}-${year}-001`;
  }
  const next = row.counter + 1;
  db.run("UPDATE document_counters SET counter = ? WHERE tenant_id = ? AND prefix = ? AND year = ?", [next, tenantId, prefix, year]);
  return `${prefix}-${year}-${String(row.counter).padStart(3, "0")}`;
}

const TELEGRAM_API = "https://api.telegram.org";

async function sendTelegram(botToken: string, chatId: number, text: string): Promise<boolean> {
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
    return res.ok;
  } catch { return false; }
}

async function sendWhatsapp(to: string, text: string): Promise<boolean> {
  const phoneNumberId = process.env.WOP_WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WOP_WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) return false;
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      }),
    });
    return res.ok;
  } catch { return false; }
}

function generateOfferHtml(offer: Offer, items: OfferItem[]): string {
  const total = calcTotal(items);
  const vat = Math.round(total * 0.25 * 100) / 100;
  const grandTotal = total + vat;

  return `<!DOCTYPE html>
<html lang="sv">
<head><meta charset="UTF-8"><title>Offert ${offer.offer_number}</title>
<style>
  @page { margin: 20mm; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
  .header { border-bottom: 3px solid #ea580c; padding-bottom: 15px; margin-bottom: 20px; }
  .header h1 { font-size: 24px; color: #ea580c; margin: 0; }
  .header .number { font-size: 14px; color: #666; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
  .info-grid .box { background: #f5f5f5; padding: 10px; border-radius: 4px; }
  .info-grid .box .label { font-size: 10px; color: #999; text-transform: uppercase; }
  .info-grid .box .value { font-size: 13px; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #ea580c; color: white; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
  td { padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 12px; }
  td.amount { text-align: right; font-family: monospace; }
  .summary { margin-left: auto; width: 300px; }
  .summary-row { display: flex; justify-content: space-between; padding: 4px 0; }
  .summary-row.total { font-weight: bold; font-size: 16px; border-top: 2px solid #333; padding-top: 8px; margin-top: 4px; }
  .footer { margin-top: 40px; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
  .status-badge { display: inline-block; padding: 3px 8px; border-radius: 3px; font-size: 11px; font-weight: 600; }
  .status-draft { background: #eee; color: #666; }
  .status-sent { background: #dbeafe; color: #1d4ed8; }
  .status-accepted { background: #d1fae5; color: #059669; }
  .status-rejected { background: #fee2e2; color: #dc2626; }
  @media print { body { padding: 0; } .no-print { display: none; } }
</style></head>
<body>
  <div class="header">
    <h1>OFFERT / QUOTATION</h1>
    <div class="number">Nr: ${offer.offer_number}</div>
  </div>

  <div class="info-grid">
    <div class="box">
      <div class="label">Offertdatum</div>
      <div class="value">${offer.created_at?.slice(0, 10) || today()}</div>
    </div>
    <div class="box">
      <div class="label">Giltig till</div>
      <div class="value">${offer.valid_until || "30 dagar"}</div>
    </div>
    <div class="box" style="grid-column: 1 / -1;">
      <div class="label">Projekt</div>
      <div class="value">${offer.title}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr><th>Beskrivning</th><th style="width:60px">Antal</th><th style="width:60px">Enhet</th><th style="width:100px">� pris</th><th style="width:100px">Belopp</th></tr>
    </thead>
    <tbody>
      ${items.map(item => {
        const lineTotal = item.quantity * item.unit_price;
        return `<tr>
          <td>${item.name}${item.description ? `<br><small style="color:#999">${item.description}</small>` : ""}</td>
          <td>${item.quantity}</td>
          <td>${item.unit}</td>
          <td class="amount">${item.unit_price.toLocaleString("sv-SE")} kr</td>
          <td class="amount">${lineTotal.toLocaleString("sv-SE")} kr</td>
        </tr>`;
      }).join("")}
    </tbody>
  </table>

  <div class="summary">
    <div class="summary-row"><span>Nettobelopp</span><span>${total.toLocaleString("sv-SE")} kr</span></div>
    <div class="summary-row"><span>Moms 25%</span><span>${vat.toLocaleString("sv-SE")} kr</span></div>
    <div class="summary-row total"><span>Totalt att betala</span><span>${grandTotal.toLocaleString("sv-SE")} kr</span></div>
  </div>

  <div class="footer">
    <p><strong>Betalningsvillkor:</strong> 30 dagar netto. Dröjsmålsränta enligt räntelagen.</p>
    <p><strong>Godkännande:</strong> Denna offert är bindande i 30 dagar från offertdatum. Vid acceptans hänvisas till AB 04/ABT 06.</p>
    ${offer.notes ? `<p><strong>Anteckningar:</strong> ${offer.notes}</p>` : ""}
  </div>
</body></html>`;
}

function generateInvoiceHtml(invoice: Invoice, items: OfferItem[]): string {
  const total = calcTotal(items);
  const vat = invoice.vat_amount || Math.round(total * 0.25 * 100) / 100;
  const grandTotal = invoice.grand_total || total + vat;

  return `<!DOCTYPE html>
<html lang="sv">
<head><meta charset="UTF-8"><title>Faktura ${invoice.invoice_number}</title>
<style>
  @page { margin: 20mm; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
  .header { border-bottom: 3px solid #059669; padding-bottom: 15px; margin-bottom: 20px; }
  .header h1 { font-size: 24px; color: #059669; margin: 0; }
  .header .number { font-size: 14px; color: #666; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
  .info-grid .box { background: #f5f5f5; padding: 10px; border-radius: 4px; }
  .info-grid .box .label { font-size: 10px; color: #999; text-transform: uppercase; }
  .info-grid .box .value { font-size: 13px; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #059669; color: white; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
  td { padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 12px; }
  td.amount { text-align: right; font-family: monospace; }
  .summary { margin-left: auto; width: 300px; }
  .summary-row { display: flex; justify-content: space-between; padding: 4px 0; }
  .summary-row.total { font-weight: bold; font-size: 16px; border-top: 2px solid #333; padding-top: 8px; margin-top: 4px; }
  .footer { margin-top: 40px; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
  @media print { body { padding: 0; } }
</style></head>
<body>
  <div class="header">
    <h1>FAKTURA / INVOICE</h1>
    <div class="number">Nr: ${invoice.invoice_number}</div>
  </div>

  <div class="info-grid">
    <div class="box">
      <div class="label">Fakturadatum</div>
      <div class="value">${invoice.created_at?.slice(0, 10) || today()}</div>
    </div>
    <div class="box">
      <div class="label">Förfallodatum</div>
      <div class="value">${invoice.due_date || "30 dagar"}</div>
    </div>
    ${invoice.ocr_number ? `<div class="box"><div class="label">OCR-nummer</div><div class="value">${invoice.ocr_number}</div></div>` : ""}
    ${invoice.offer_id ? `<div class="box"><div class="label">Offertreferens</div><div class="value">${invoice.offer_id}</div></div>` : ""}
    <div class="box" style="grid-column: 1 / -1;">
      <div class="label">Projekt</div>
      <div class="value">${invoice.title}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr><th>Beskrivning</th><th style="width:60px">Antal</th><th style="width:60px">Enhet</th><th style="width:100px">� pris</th><th style="width:100px">Belopp</th></tr>
    </thead>
    <tbody>
      ${items.map(item => {
        const lineTotal = item.quantity * item.unit_price;
        return `<tr>
          <td>${item.name}${item.description ? `<br><small style="color:#999">${item.description}</small>` : ""}</td>
          <td>${item.quantity}</td>
          <td>${item.unit}</td>
          <td class="amount">${item.unit_price.toLocaleString("sv-SE")} kr</td>
          <td class="amount">${lineTotal.toLocaleString("sv-SE")} kr</td>
        </tr>`;
      }).join("")}
    </tbody>
  </table>

  <div class="summary">
    <div class="summary-row"><span>Nettobelopp</span><span>${total.toLocaleString("sv-SE")} kr</span></div>
    <div class="summary-row"><span>Moms 25%</span><span>${vat.toLocaleString("sv-SE")} kr</span></div>
    <div class="summary-row total"><span>Totalt att betala</span><span>${grandTotal.toLocaleString("sv-SE")} kr</span></div>
  </div>

  <div class="footer">
    <p><strong>Betalningsvillkor:</strong> 30 dagar netto fr�n fakturadatum. Dröjsmålsränta enligt räntelagen.</p>
    <p><strong>Bankgiro:</strong> [Bankgiro] &nbsp;|&nbsp; <strong>Organisationsnummer:</strong> [Org.nr]</p>
    ${invoice.notes ? `<p><strong>Anteckningar:</strong> ${invoice.notes}</p>` : ""}
  </div>
</body></html>`;
}

export async function handleOfferInvoiceApi(p: string, method: string, auth: AuthInfo | null, req: Request): Promise<Response | null> {
  const { userId, tenantId, role } = auth ?? { userId: "", tenantId: "", role: "" };

  if (!auth) return json({ error: "Unauthorized" }, 401);

  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  const isLeader = role === "LEADER" || isAdmin;
  const canWrite = role !== "CLIENT";

  // === OFFERS ===

  // GET /api/offers
  if (p === "/api/offers" && method === "GET") {
    const offers = db.query(
      "SELECT * FROM offers WHERE tenant_id = ? ORDER BY created_at DESC"
    ).all(tenantId);
    return json(offers);
  }

  // POST /api/offers
  if (p === "/api/offers" && method === "POST") {
    if (!canWrite) return json({ error: "Forbidden" }, 403);
    const body = await readBody<{ title: string; project_id?: string; client_id?: string; items_json?: string; valid_until?: string; notes?: string }>(req, method);
    if (!body?.title) return json({ error: "Title is required" }, 400);
    const id = uuid();
    const offerNumber = nextDocumentNumber(tenantId, "ANB");
    const items = parseItems(body.items_json);
    const totalAmount = calcTotal(items);
    db.run(
      "INSERT INTO offers (id, tenant_id, project_id, client_id, offer_number, title, items_json, total_amount, valid_until, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [id, tenantId, body.project_id || null, body.client_id || null, offerNumber, body.title, JSON.stringify(items), totalAmount, body.valid_until || null, body.notes || null, userId]
    );
    const offer = db.query("SELECT * FROM offers WHERE id = ?").get(id);
    return json(offer, 201);
  }

  // GET /api/offers/:id
  const offerGetMatch = p.match(/^\/api\/offers\/([^/]+)$/);
  if (offerGetMatch && method === "GET") {
    const offer = db.query("SELECT * FROM offers WHERE id = ? AND tenant_id = ?").get(offerGetMatch[1], tenantId);
    if (!offer) return json({ error: "Not found" }, 404);
    return json(offer);
  }

  // PUT /api/offers/:id
  if (offerGetMatch && method === "PUT") {
    if (!canWrite) return json({ error: "Forbidden" }, 403);
    const existing = db.query("SELECT * FROM offers WHERE id = ? AND tenant_id = ?").get(offerGetMatch[1], tenantId) as Offer | undefined;
    if (!existing) return json({ error: "Not found" }, 404);
    if (existing.status !== "draft") return json({ error: "Cannot edit a non-draft offer" }, 400);
    const body = await readBody<Partial<Offer>>(req, method);
    const items = body?.items_json ? parseItems(body.items_json) : parseItems(existing.items_json);
    const totalAmount = calcTotal(items);
    db.run(
      "UPDATE offers SET title = ?, project_id = ?, client_id = ?, items_json = ?, total_amount = ?, valid_until = ?, notes = ?, updated_at = ? WHERE id = ? AND tenant_id = ?",
      [body?.title ?? existing.title, body?.project_id ?? existing.project_id, body?.client_id ?? existing.client_id, JSON.stringify(items), totalAmount, body?.valid_until ?? existing.valid_until, body?.notes ?? existing.notes, now(), offerGetMatch[1], tenantId]
    );
    return json({ ok: true });
  }

  // DELETE /api/offers/:id
  if (offerGetMatch && method === "DELETE") {
    if (!isAdmin) return json({ error: "Forbidden" }, 403);
    const existing = db.query("SELECT * FROM offers WHERE id = ? AND tenant_id = ?").get(offerGetMatch[1], tenantId) as Offer | undefined;
    if (!existing) return json({ error: "Not found" }, 404);
    db.run("DELETE FROM offers WHERE id = ? AND tenant_id = ?", [offerGetMatch[1], tenantId]);
    return json({ ok: true });
  }

  // POST /api/offers/:id/send
  if (offerGetMatch && method === "POST" && p.endsWith("/send")) {
    // Extract the offer ID from the path
    const offerId = offerGetMatch[1];
    const offer = db.query("SELECT * FROM offers WHERE id = ? AND tenant_id = ?").get(offerId, tenantId) as Offer | undefined;
    if (!offer) return json({ error: "Not found" }, 404);

    const url = new URL(req.url);
    const channels = url.searchParams.get("channels") || url.searchParams.get("channel") || "telegram";

    const items = parseItems(offer.items_json);
    const total = calcTotal(items);
    const message = `📄 *Ny offert: ${offer.offer_number}*\n${offer.title}\n\nTotalt: ${total.toLocaleString("sv-SE")} kr exkl. moms\nGiltig till: ${offer.valid_until || "30 dagar"}\n\nDokument: [Se i portalen]`;

    const results: Record<string, boolean> = {};

    if (channels.includes("telegram")) {
      // Find client's telegram link
      const clientId = offer.client_id;
      if (clientId) {
        const link = db.query(
          "SELECT * FROM user_channel_links WHERE tenant_id = ? AND user_id = ? AND channel = 'telegram' AND active = 1"
        ).get(tenantId, clientId) as any;
        if (link) {
          // Find a telegram bot token
          const bot = db.query("SELECT * FROM bot_telegram_accounts WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1")
            .get(tenantId) as any;
          const botToken = bot?.bot_token_encrypted || process.env.WOP_TELEGRAM_BOT_TOKEN;
          if (botToken) {
            results.telegram = await sendTelegram(botToken, parseInt(link.channel_user_id), message);
          }
        }
      }
    }

    if (channels.includes("whatsapp")) {
      const clientId = offer.client_id;
      if (clientId) {
        const link = db.query(
          "SELECT * FROM user_channel_links WHERE tenant_id = ? AND user_id = ? AND channel = 'whatsapp' AND active = 1"
        ).get(tenantId, clientId) as any;
        if (link) {
          results.whatsapp = await sendWhatsapp(link.channel_user_id, message.replace(/\*/g, ""));
        }
      }
    }

    // Log the send
    db.run(
      "UPDATE offers SET status = 'sent', sent_at = ?, updated_at = ? WHERE id = ?",
      [now(), now(), offerId]
    );

    return json({ ok: true, channels: results });
  }

  // GET /api/offers/:id/document
  if (offerGetMatch && method === "GET" && p.includes("/document")) {
    const offerId = offerGetMatch[1];
    const offer = db.query("SELECT * FROM offers WHERE id = ? AND tenant_id = ?").get(offerId, tenantId) as Offer | undefined;
    if (!offer) return json({ error: "Not found" }, 404);
    const items = parseItems(offer.items_json);
    const html = generateOfferHtml(offer, items);
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // === INVOICES ===

  // GET /api/invoices
  if (p === "/api/invoices" && method === "GET") {
    const invoices = db.query(
      "SELECT * FROM invoices WHERE tenant_id = ? ORDER BY created_at DESC"
    ).all(tenantId);
    return json(invoices);
  }

  // POST /api/invoices
  if (p === "/api/invoices" && method === "POST") {
    if (!canWrite) return json({ error: "Forbidden" }, 403);
    const body = await readBody<{ title: string; offer_id?: string; project_id?: string; client_id?: string; items_json?: string; due_date?: string; notes?: string }>(req, method);
    if (!body?.title) return json({ error: "Title is required" }, 400);

    const id = uuid();
    const invoiceNumber = nextDocumentNumber(tenantId, "INV");
    const items = parseItems(body.items_json);
    const totalAmount = calcTotal(items);
    const vatAmount = Math.round(totalAmount * 0.25 * 100) / 100;
    const grandTotal = totalAmount + vatAmount;
    const ocrNumber = `${tenantId.slice(-6)}${Date.now().toString().slice(-6)}`;

    db.run(
      "INSERT INTO invoices (id, tenant_id, offer_id, project_id, client_id, invoice_number, title, items_json, total_amount, vat_amount, grand_total, due_date, notes, ocr_number, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [id, tenantId, body.offer_id || null, body.project_id || null, body.client_id || null, invoiceNumber, body.title, JSON.stringify(items), totalAmount, vatAmount, grandTotal, body.due_date || null, body.notes || null, ocrNumber, userId]
    );

    const invoice = db.query("SELECT * FROM invoices WHERE id = ?").get(id);

    // If created from an offer, mark offer as invoiced
    if (body.offer_id) {
      db.run("UPDATE offers SET status = 'invoiced', updated_at = ? WHERE id = ? AND tenant_id = ?", [now(), body.offer_id, tenantId]);
    }

    return json(invoice, 201);
  }

  // GET /api/invoices/:id
  const invGetMatch = p.match(/^\/api\/invoices\/([^/]+)$/);
  if (invGetMatch && method === "GET") {
    const invoice = db.query("SELECT * FROM invoices WHERE id = ? AND tenant_id = ?").get(invGetMatch[1], tenantId);
    if (!invoice) return json({ error: "Not found" }, 404);
    return json(invoice);
  }

  // PUT /api/invoices/:id
  if (invGetMatch && method === "PUT") {
    if (!canWrite) return json({ error: "Forbidden" }, 403);
    const existing = db.query("SELECT * FROM invoices WHERE id = ? AND tenant_id = ?").get(invGetMatch[1], tenantId) as Invoice | undefined;
    if (!existing) return json({ error: "Not found" }, 404);
    if (existing.status !== "draft") return json({ error: "Cannot edit a non-draft invoice" }, 400);
    const body = await readBody<Partial<Invoice>>(req, method);
    const items = body?.items_json ? parseItems(body.items_json) : parseItems(existing.items_json);
    const totalAmount = calcTotal(items);
    const vatAmount = Math.round(totalAmount * 0.25 * 100) / 100;
    const grandTotal = totalAmount + vatAmount;
    db.run(
      "UPDATE invoices SET title = ?, project_id = ?, client_id = ?, items_json = ?, total_amount = ?, vat_amount = ?, grand_total = ?, due_date = ?, notes = ?, updated_at = ? WHERE id = ? AND tenant_id = ?",
      [body?.title ?? existing.title, body?.project_id ?? existing.project_id, body?.client_id ?? existing.client_id, JSON.stringify(items), totalAmount, vatAmount, grandTotal, body?.due_date ?? existing.due_date, body?.notes ?? existing.notes, now(), invGetMatch[1], tenantId]
    );
    return json({ ok: true });
  }

  // DELETE /api/invoices/:id
  if (invGetMatch && method === "DELETE") {
    if (!isAdmin) return json({ error: "Forbidden" }, 403);
    db.run("DELETE FROM invoices WHERE id = ? AND tenant_id = ?", [invGetMatch[1], tenantId]);
    return json({ ok: true });
  }

  // POST /api/invoices/:id/send
  if (invGetMatch && method === "POST" && p.endsWith("/send")) {
    const invoiceId = invGetMatch[1];
    const invoice = db.query("SELECT * FROM invoices WHERE id = ? AND tenant_id = ?").get(invoiceId, tenantId) as Invoice | undefined;
    if (!invoice) return json({ error: "Not found" }, 404);

    const url = new URL(req.url);
    const channels = url.searchParams.get("channels") || url.searchParams.get("channel") || "telegram";

    const items = parseItems(invoice.items_json);
    const total = invoice.grand_total || calcTotal(items);
    const message = `🧾 *Ny faktura: ${invoice.invoice_number}*\n${invoice.title}\n\nTotalt: ${total.toLocaleString("sv-SE")} kr inkl. moms\nFörfallodatum: ${invoice.due_date || "30 dagar"}\nOCR: ${invoice.ocr_number || "-"}\n\nDokument: [Se i portalen]`;

    const results: Record<string, boolean> = {};

    if (channels.includes("telegram")) {
      const clientId = invoice.client_id;
      if (clientId) {
        const link = db.query(
          "SELECT * FROM user_channel_links WHERE tenant_id = ? AND user_id = ? AND channel = 'telegram' AND active = 1"
        ).get(tenantId, clientId) as any;
        if (link) {
          const bot = db.query("SELECT * FROM bot_telegram_accounts WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1")
            .get(tenantId) as any;
          const botToken = bot?.bot_token_encrypted || process.env.WOP_TELEGRAM_BOT_TOKEN;
          if (botToken) {
            results.telegram = await sendTelegram(botToken, parseInt(link.channel_user_id), message);
          }
        }
      }
    }

    if (channels.includes("whatsapp")) {
      const clientId = invoice.client_id;
      if (clientId) {
        const link = db.query(
          "SELECT * FROM user_channel_links WHERE tenant_id = ? AND user_id = ? AND channel = 'whatsapp' AND active = 1"
        ).get(tenantId, clientId) as any;
        if (link) {
          results.whatsapp = await sendWhatsapp(link.channel_user_id, message.replace(/\*/g, ""));
        }
      }
    }

    db.run(
      "UPDATE invoices SET status = 'sent', sent_at = ?, updated_at = ? WHERE id = ?",
      [now(), now(), invoiceId]
    );

    return json({ ok: true, channels: results });
  }

  // GET /api/invoices/:id/document
  if (invGetMatch && method === "GET" && p.includes("/document")) {
    const invoiceId = invGetMatch[1];
    const invoice = db.query("SELECT * FROM invoices WHERE id = ? AND tenant_id = ?").get(invoiceId, tenantId) as Invoice | undefined;
    if (!invoice) return json({ error: "Not found" }, 404);
    const items = parseItems(invoice.items_json);
    const html = generateInvoiceHtml(invoice, items);
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return null;
}
