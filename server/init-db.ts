import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";

const DB_DIR = join(import.meta.dir, "..", "..", "wayofwork-server", "db");
const DB_PATH = join(DB_DIR, "wayofpi.sqlite");
const SCHEMA_PATH = join(import.meta.dir, "schema.sql");

// Ensure directory exists
if (!existsSync(DB_DIR)) {
  await Bun.write(join(DB_DIR, ".keep"), "");
}

// Open or create DB
const db = new Database(DB_PATH);

// Read and execute schema
const schema = await Bun.file(SCHEMA_PATH).text();
const statements = schema.split(";").filter(s => s.trim().length > 0);

for (const stmt of statements) {
  try {
    db.run(stmt);
  } catch (e) {
    console.error("Error executing:", stmt.substring(0, 50), e.message);
  }
}

console.log("Database initialized at", DB_PATH);
console.log("Tables created successfully");

// Verify tables
const tables = db.query("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log("Tables:", tables.map(t => t.name).join(", "));
