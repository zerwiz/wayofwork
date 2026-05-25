import { Database } from "bun:sqlite";
const db = new Database("data/wayofwork.sqlite");
const projects = db.query("SELECT id, tenant_id FROM projects").all();
console.log(JSON.stringify(projects));
