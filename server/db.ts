import { Database } from "bun:sqlite";
import { join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";

const DB_DIR = join(import.meta.dir, "..", "data");
if (!existsSync(DB_DIR)) {
	mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(join(DB_DIR, "wayofwork.sqlite"));

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
    role TEXT DEFAULT 'USER',
    pin TEXT,
    full_name TEXT,
    job_title TEXT,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'active',
    last_active DATETIME,
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

db.run(`
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    project_id TEXT,
    title TEXT NOT NULL,
    content TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS calendar_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT,
    project_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    all_day BOOLEAN DEFAULT 0,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )
`);

// Migration: add user_id column if missing (existing databases)
try {
  db.run("ALTER TABLE calendar_events ADD COLUMN user_id TEXT");
} catch { /* column already exists */ }

// Migration: add profile columns to users table (existing databases)
const userCols = db.query("PRAGMA table_info(users)").all() as any[];
const userColNames = userCols.map((c: any) => c.name);
if (!userColNames.includes("full_name")) {
  try { db.run("ALTER TABLE users ADD COLUMN full_name TEXT"); } catch {}
}
if (!userColNames.includes("job_title")) {
  try { db.run("ALTER TABLE users ADD COLUMN job_title TEXT"); } catch {}
}
if (!userColNames.includes("email")) {
  try { db.run("ALTER TABLE users ADD COLUMN email TEXT"); } catch {}
}
if (!userColNames.includes("phone")) {
  try { db.run("ALTER TABLE users ADD COLUMN phone TEXT"); } catch {}
}
if (!userColNames.includes("status")) {
  try { db.run("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'"); } catch {}
}
if (!userColNames.includes("last_active")) {
  try { db.run("ALTER TABLE users ADD COLUMN last_active DATETIME"); } catch {}
}

// Seed default tenant and admin if not exists
const defaultTenantId = "default";
const tenantExists = db.query("SELECT 1 FROM tenants WHERE id = ?").get(defaultTenantId);

if (!tenantExists) {
  db.run("INSERT INTO tenants (id, name, slug) VALUES (?, ?, ?)", [defaultTenantId, "Default Workspace", "default"]);

  const adminId = crypto.randomUUID();
  const adminHash = await Bun.password.hash("admin");
  db.run(
    "INSERT INTO users (id, tenant_id, username, password_hash, role) VALUES (?, ?, ?, ?, ?)",
    [adminId, defaultTenantId, "admin", adminHash, "ADMIN"]
  );
  console.log("Default admin account created: admin / admin");

  // Team accounts with PIN 1234
  const teamUsers = [
    { username: "anna", full_name: "Anna Svensson", role: "WORKER" },
    { username: "bjorn", full_name: "Björn Larsson", role: "WORKER" },
    { username: "cecilia", full_name: "Cecilia Johansson", role: "LEADER" },
    { username: "demo-worker", full_name: "Demo Worker", role: "WORKER" },
    { username: "demo-leader", full_name: "Demo Leader", role: "LEADER" },
    { username: "demo-client", full_name: "Demo Client", role: "CLIENT" },
    { username: "byggab", full_name: "Bygg AB", role: "CLIENT" },
    { username: "kalle", full_name: "Kalle Nilsson", role: "WORKER" },
    { username: "craig", full_name: "Craig", role: "ADMIN" },
    { username: "josef", full_name: "Josef", role: "ADMIN" },
    { username: "emma", full_name: "Emma", role: "ADMIN" },
  ];
  for (const u of teamUsers) {
    const id = crypto.randomUUID();
    const hash = await Bun.password.hash("1234");
    db.run(
      "INSERT INTO users (id, tenant_id, username, password_hash, role, pin, full_name) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, defaultTenantId, u.username, hash, u.role, "1234", u.full_name]
    );
  }
  console.log(`Created ${teamUsers.length} team accounts with PIN 1234`);
}

// Migration: seed real users in existing databases
const existingUsers = db.query("SELECT username FROM users ORDER BY username").all() as any[];
const existingUsernames = existingUsers.map((u: any) => u.username);

const neededUsers = [
  { username: "anna", full_name: "Anna Svensson", role: "WORKER" },
  { username: "bjorn", full_name: "Björn Larsson", role: "WORKER" },
  { username: "cecilia", full_name: "Cecilia Johansson", role: "LEADER" },
  { username: "demo-worker", full_name: "Demo Worker", role: "WORKER" },
  { username: "demo-leader", full_name: "Demo Leader", role: "LEADER" },
  { username: "demo-client", full_name: "Demo Client", role: "CLIENT" },
  { username: "byggab", full_name: "Bygg AB", role: "CLIENT" },
  { username: "kalle", full_name: "Kalle Nilsson", role: "WORKER" },
  { username: "craig", full_name: "Craig", role: "ADMIN" },
  { username: "josef", full_name: "Josef", role: "ADMIN" },
  { username: "emma", full_name: "Emma", role: "ADMIN" },
];
for (const u of neededUsers) {
  if (existingUsernames.includes(u.username)) {
    db.run("UPDATE users SET full_name = ?, role = ?, pin = ? WHERE username = ?", [u.full_name, u.role, "1234", u.username]);
  } else {
    const id = crypto.randomUUID();
    const hash = await Bun.password.hash("1234");
    db.run("INSERT INTO users (id, tenant_id, username, password_hash, role, pin, full_name) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, "default", u.username, hash, u.role, "1234", u.full_name]);
  }
}

// Remove old test users that don't match our real users
const keepUsers = new Set(["admin", "anna", "bjorn", "cecilia", "demo-worker", "demo-leader", "demo-client", "byggab", "kalle", "craig", "josef", "emma"]);
const toRemove = existingUsernames.filter((u: string) => !keepUsers.has(u));
for (const u of toRemove) {
  db.run("DELETE FROM users WHERE username = ?", [u]);
}

db.run(`
  CREATE TABLE IF NOT EXISTS user_channel_links (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    channel TEXT NOT NULL,
    channel_user_id TEXT NOT NULL,
    channel_username TEXT,
    channel_bot_id TEXT,
    metadata TEXT DEFAULT '{}',
    active INTEGER DEFAULT 1,
    last_activity_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(tenant_id, channel, channel_user_id)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS bot_whatsapp_accounts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    label TEXT,
    api_key_encrypted TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS bot_telegram_accounts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    bot_token_encrypted TEXT NOT NULL,
    bot_username TEXT,
    label TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS channel_message_logs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    user_id TEXT,
    channel TEXT NOT NULL,
    channel_user_id TEXT,
    bot_id TEXT,
    direction TEXT NOT NULL DEFAULT 'inbound',
    message_text TEXT,
    message_type TEXT DEFAULT 'text',
    handled_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

export { db };
