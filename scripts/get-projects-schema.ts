import { Database } from "bun:sqlite";
const db = new Database("data/wayofwork.sqlite");
console.log(db.query("PRAGMA table_info(projects)").all());
