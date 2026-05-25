import { Database } from "bun:sqlite";
const db = new Database("data/wayofwork.sqlite");
const tenants = db.query("SELECT id FROM tenants LIMIT 2").all();
console.log(JSON.stringify(tenants));
