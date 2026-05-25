import { db } from "../server/db";
try {
  db.run("ALTER TABLE bot_telegram_accounts ADD COLUMN preferred_agent TEXT");
  console.log("Column preferred_agent added to bot_telegram_accounts");
} catch (e) {
  console.log("Column preferred_agent might already exist for bot_telegram_accounts");
}
try {
  db.run("ALTER TABLE bot_whatsapp_accounts ADD COLUMN preferred_agent TEXT");
  console.log("Column preferred_agent added to bot_whatsapp_accounts");
} catch (e) {
  console.log("Column preferred_agent might already exist for bot_whatsapp_accounts");
}
