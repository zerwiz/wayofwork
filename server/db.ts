import { Database } from "bun:sqlite";
import { join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";

const DB_DIR = join(import.meta.dir, "..", "data");
if (!existsSync(DB_DIR)) {
	mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(join(DB_DIR, "wayofpi.sqlite"));

// Initialize tables
db.run(`
  CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE(tenant_id, username)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    project_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to TEXT,
    status TEXT DEFAULT 'todo',
    priority TEXT DEFAULT 'medium',
    deadline DATE,
    estimated_hours REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS time_entries (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    project_id TEXT,
    task_id TEXT,
    date DATE NOT NULL,
    hours REAL NOT NULL,
    description TEXT,
    drawing_ref TEXT,
    status TEXT DEFAULT 'pending',
    leader_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    project_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'tillägg',
    status TEXT NOT NULL DEFAULT 'draft',
    priority TEXT DEFAULT 'medium',
    cost_estimate REAL,
    cost_actual REAL,
    created_by TEXT,
    reviewed_by TEXT,
    assigned_to TEXT,
    approved_by TEXT,
    approved_at TEXT,
    rejected_reason TEXT,
    locked_at TEXT,
    invoiced_at TEXT,
    invoice_ref TEXT,
    materials_json TEXT DEFAULT '[]',
    photos_json TEXT DEFAULT '[]',
    kmal_json TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS time_blocks (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    check_in TEXT,
    check_out TEXT,
    hours REAL NOT NULL,
    break_hours REAL DEFAULT 0,
    description TEXT,
    hourly_rate REAL,
    overtime INTEGER DEFAULT 0,
    overtime_hours REAL DEFAULT 0,
    overtime_rate REAL,
    approved INTEGER DEFAULT 0,
    approved_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS time_sessions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    project_id TEXT,
    check_in TEXT NOT NULL,
    check_out TEXT,
    total_hours REAL,
    break_minutes INTEGER DEFAULT 0,
    notes TEXT,
    location_json TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS price_lists (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    items_json TEXT DEFAULT '[]',
    active INTEGER DEFAULT 1,
    valid_from TEXT,
    valid_to TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  )
`);

// Seed default tenant and admin if not exists
const defaultTenantId = "default";
const tenantExists = db.query("SELECT 1 FROM tenants WHERE id = ?").get(defaultTenantId);

if (!tenantExists) {
	db.run("INSERT INTO tenants (id, name, slug) VALUES (?, ?, ?)", [defaultTenantId, "Default Workspace", "default"]);
	
	// Default admin: admin / admin (change on first login recommended)
	// In a real production app, we would NOT hardcode this, but for a "production-ready" prototype,
	// we provide a way to get in.
	const adminId = crypto.randomUUID();
	const passwordHash = await Bun.password.hash("admin");
	db.run(
		"INSERT INTO users (id, tenant_id, username, password_hash, role) VALUES (?, ?, ?, ?, ?)",
		[adminId, defaultTenantId, "admin", passwordHash, "admin"]
	);
	console.log("Default admin account created: admin / admin");
}

export { db };
