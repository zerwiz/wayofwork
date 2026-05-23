import { db } from "./server/db";
import { randomUUID } from "node:crypto";

const id = `bot_${randomUUID().slice(0, 8)}`;
const token = "8849660440:AAFK4YZERPi6ZpRaQ09cG_FA7Vr-0pOycws";

// Vi sätter label till 'time_bot' så att channel-router.ts kopplar den till rätt funktionalitet
db.query(
  `INSERT INTO bot_telegram_accounts (id, tenant_id, bot_token_encrypted, bot_username, label, active)
   VALUES (?, ?, ?, ?, ?, ?)`
).run(id, "default", token, "WayofworkworkerBot", "time_bot", 1);

console.log("Worker Bot inserted with ID:", id);
