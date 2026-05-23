import { db } from "./server/db";
import { randomUUID } from "node:crypto";

const id = `bot_${randomUUID().slice(0, 8)}`;
const token = "8942619757:AAGl-beRddiUe7WDeu0jFo0g1ojDwbbJmvQ";

db.query(
  `INSERT INTO bot_telegram_accounts (id, tenant_id, bot_token_encrypted, bot_username, label, active)
   VALUES (?, ?, ?, ?, ?, ?)`
).run(id, "default", token, "Wayofworkbot", "Orchestrator", 1);

console.log("Bot inserted with ID:", id);
