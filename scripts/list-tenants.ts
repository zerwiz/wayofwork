import { Database } from "bun:sqlite";
const db = new Database("data/wayofwork.sqlite");
const tenants = db.query("SELECT * FROM tenants").all();
console.log(JSON.stringify(tenants));
