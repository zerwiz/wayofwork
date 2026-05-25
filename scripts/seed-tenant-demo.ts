import { Database } from "bun:sqlite";
const db = new Database("data/wayofwork.sqlite");
db.query("INSERT INTO projects (id, tenant_id, name) VALUES (?, ?, ?)").run("proj_demo_1", "tenant_demo", "Demo Project");
console.log("Inserted Demo Project");
