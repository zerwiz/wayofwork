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

CREATE TABLE IF NOT EXISTS pending_changes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  change_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  target_table TEXT NOT NULL,
  target_id TEXT,
  proposed_data TEXT NOT NULL,
  current_data TEXT,
  summary TEXT NOT NULL,
  suggested_by TEXT,
  suggested_by_user TEXT,
  assigned_to TEXT,
  approved_by TEXT,
  approved_at TEXT,
  rejected_reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

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

// Seed template price lists for default tenant
const existingPriceLists = db.query("SELECT COUNT(*) as count FROM price_lists WHERE tenant_id = ?").get(defaultTenantId) as any;
if (existingPriceLists.count === 0) {
  const templateLists = [
    {
      name: "Maskiner 2026",
      items: [
        { name: "Minigrävare <3 ton", unit: "tim", unit_price: 550, category: "Maskin" },
        { name: "Mellangrävare 3-10 ton", unit: "tim", unit_price: 700, category: "Maskin" },
        { name: "Storgrävare >11 ton", unit: "tim", unit_price: 950, category: "Maskin" },
        { name: "Hjulgrävare 15-16 ton", unit: "tim", unit_price: 750, category: "Maskin" },
        { name: "Bandgrävare 20+ ton", unit: "tim", unit_price: 1200, category: "Maskin" },
        { name: "Bulldozer", unit: "tim", unit_price: 1000, category: "Maskin" },
        { name: "Dumper", unit: "tim", unit_price: 800, category: "Maskin" },
        { name: "Hjullastare", unit: "tim", unit_price: 750, category: "Maskin" },
        { name: "Vält (packare)", unit: "tim", unit_price: 500, category: "Maskin" },
        { name: "Lastbil med kran", unit: "tim", unit_price: 700, category: "Maskin" },
        { name: "Betongpump", unit: "tim", unit_price: 1000, category: "Maskin" },
        { name: "Vibratorstav", unit: "tim", unit_price: 150, category: "Maskin" },
      ],
    },
    {
      name: "Personal 2026",
      items: [
        { name: "Snickare", unit: "tim", unit_price: 650, category: "Personal" },
        { name: "Betongarbetare", unit: "tim", unit_price: 550, category: "Personal" },
        { name: "Anläggningsarbetare", unit: "tim", unit_price: 550, category: "Personal" },
        { name: "Murare", unit: "tim", unit_price: 700, category: "Personal" },
        { name: "Plattsättare", unit: "tim", unit_price: 650, category: "Personal" },
        { name: "Målare", unit: "tim", unit_price: 550, category: "Personal" },
        { name: "Elektriker", unit: "tim", unit_price: 750, category: "Personal" },
        { name: "Rörmokare/VVS", unit: "tim", unit_price: 750, category: "Personal" },
        { name: "Golvläggare", unit: "tim", unit_price: 600, category: "Personal" },
        { name: "Maskinförare", unit: "tim", unit_price: 600, category: "Personal" },
        { name: "Ställningsbyggare", unit: "tim", unit_price: 550, category: "Personal" },
        { name: "Takläggare", unit: "tim", unit_price: 600, category: "Personal" },
        { name: "Plåtslagare", unit: "tim", unit_price: 650, category: "Personal" },
        { name: "Kranförare", unit: "tim", unit_price: 700, category: "Personal" },
        { name: "Arbetsledare", unit: "tim", unit_price: 800, category: "Personal" },
      ],
    },
    {
      name: "Material - Betong & Stål 2026",
      items: [
        { name: "Betong C25/30", unit: "m³", unit_price: 1400, category: "Betong" },
        { name: "Betong C30/37", unit: "m³", unit_price: 1600, category: "Betong" },
        { name: "Betong C35/45", unit: "m³", unit_price: 1900, category: "Betong" },
        { name: "Betongpump tillägg", unit: "m³", unit_price: 300, category: "Betong" },
        { name: "Armeringsnät 5200", unit: "m²", unit_price: 300, category: "Armering" },
        { name: "Armeringsnät 6150", unit: "m²", unit_price: 650, category: "Armering" },
        { name: "Armeringsstål B500B", unit: "ton", unit_price: 18000, category: "Armering" },
        { name: "Cement", unit: "ton", unit_price: 4000, category: "Betong" },
        { name: "Formvirke", unit: "m²", unit_price: 450, category: "Form" },
        { name: "Formplywood", unit: "m²", unit_price: 300, category: "Form" },
      ],
    },
    {
      name: "Material - Mark & Grund 2026",
      items: [
        { name: "Makadam 8-16 mm", unit: "ton", unit_price: 180, category: "Mark" },
        { name: "Makadam 16-32 mm", unit: "ton", unit_price: 160, category: "Mark" },
        { name: "Sand (fyllning)", unit: "ton", unit_price: 90, category: "Mark" },
        { name: "Matjord", unit: "ton", unit_price: 200, category: "Mark" },
        { name: "Geotextil", unit: "m²", unit_price: 10, category: "Mark" },
        { name: "Fiberduk", unit: "m²", unit_price: 15, category: "Mark" },
        { name: "Asfalt AG 11", unit: "ton", unit_price: 1200, category: "Mark" },
        { name: "Dräneringsrör", unit: "m", unit_price: 120, category: "Mark" },
        { name: "Kantstöd betong", unit: "st", unit_price: 150, category: "Mark" },
        { name: "Marksten 70 mm", unit: "m²", unit_price: 350, category: "Mark" },
        { name: "Plattor 400x400", unit: "m²", unit_price: 300, category: "Mark" },
      ],
    },
    {
      name: "Material - Husbyggnad 2026",
      items: [
        { name: "Regelvirke 45x95", unit: "m", unit_price: 25, category: "Virke" },
        { name: "Regelvirke 45x145", unit: "m", unit_price: 35, category: "Virke" },
        { name: "Gipsskiva 13 mm normal", unit: "m²", unit_price: 100, category: "Gips" },
        { name: "Gipsskiva 13 mm våtrum", unit: "m²", unit_price: 150, category: "Gips" },
        { name: "Gipsskiva brand", unit: "m²", unit_price: 130, category: "Gips" },
        { name: "Mineralullsskiva 100 mm", unit: "m²", unit_price: 180, category: "Isolering" },
        { name: "Cellplast S100", unit: "m²", unit_price: 250, category: "Isolering" },
        { name: "Takpanna betong", unit: "m²", unit_price: 400, category: "Tak" },
        { name: "Underlagspapp", unit: "rulle", unit_price: 800, category: "Tak" },
        { name: "Fönster 1000x1200 3-glas", unit: "st", unit_price: 8000, category: "Fönster" },
        { name: "Innerdörr släta", unit: "st", unit_price: 3500, category: "Dörr" },
        { name: "Ytterdörr säkerhet", unit: "st", unit_price: 12000, category: "Dörr" },
        { name: "Limträbalk 115x315", unit: "m", unit_price: 600, category: "Virke" },
        { name: "Råspont", unit: "m²", unit_price: 250, category: "Virke" },
      ],
    },
    {
      name: "Material - Ytskikt & Inredning 2026",
      items: [
        { name: "Parkett 3-stav ek", unit: "m²", unit_price: 500, category: "Golv" },
        { name: "Laminatgolv", unit: "m²", unit_price: 250, category: "Golv" },
        { name: "Klinker 30x30", unit: "m²", unit_price: 400, category: "Kakel" },
        { name: "Kakel 20x20", unit: "m²", unit_price: 350, category: "Kakel" },
        { name: "Målarfärg inomhus", unit: "l", unit_price: 250, category: "Bygg" },
        { name: "Målarfärg utomhus", unit: "l", unit_price: 300, category: "Bygg" },
        { name: "Spackel", unit: "säck", unit_price: 150, category: "Bygg" },
        { name: "Fogmassa silikon", unit: "st", unit_price: 80, category: "Bygg" },
        { name: "Köksskåp (per löpmeter)", unit: "m", unit_price: 6000, category: "Inredning" },
        { name: "Bänkskiva laminat", unit: "m", unit_price: 1500, category: "Inredning" },
        { name: "Badkar 1700 mm", unit: "st", unit_price: 5000, category: "Badrum" },
        { name: "WC-stol", unit: "st", unit_price: 3000, category: "Badrum" },
        { name: "Handfat", unit: "st", unit_price: 1500, category: "Badrum" },
        { name: "Blandare kök", unit: "st", unit_price: 2000, category: "VS" },
        { name: "Blandare badrum", unit: "st", unit_price: 1500, category: "VS" },
      ],
    },
  ];

  for (const list of templateLists) {
    const id = crypto.randomUUID();
    db.run(
      "INSERT INTO price_lists (id, tenant_id, name, items_json, active) VALUES (?, ?, ?, ?, 1)",
      [id, defaultTenantId, list.name, JSON.stringify(list.items)]
    );
  }
  console.log(`Created ${templateLists.length} template price lists for default tenant`);
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

db.run(`
  CREATE TABLE IF NOT EXISTS offers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    project_id TEXT,
    client_id TEXT,
    offer_number TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    items_json TEXT DEFAULT '[]',
    total_amount REAL DEFAULT 0,
    valid_until TEXT,
    notes TEXT,
    created_by TEXT,
    sent_at TEXT,
    accepted_at TEXT,
    rejected_reason TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    offer_id TEXT,
    project_id TEXT,
    client_id TEXT,
    invoice_number TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    items_json TEXT DEFAULT '[]',
    total_amount REAL DEFAULT 0,
    vat_amount REAL DEFAULT 0,
    grand_total REAL DEFAULT 0,
    due_date TEXT,
    notes TEXT,
    ocr_number TEXT,
    created_by TEXT,
    sent_at TEXT,
    paid_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS document_counters (
    tenant_id TEXT NOT NULL,
    prefix TEXT NOT NULL,
    year TEXT NOT NULL,
    counter INTEGER DEFAULT 1,
    PRIMARY KEY (tenant_id, prefix, year)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS server_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  )
`);

export interface LlmProvider {
  name: string;
  label: string;
  model: string;
  host: string;
  apiKey: string;
}

export interface LlmConfig {
  activeProvider: string;
  providers: LlmProvider[];
}

export function applyActiveProvider(cfg: LlmConfig) {
  const active = cfg.providers.find(p => p.name === cfg.activeProvider) || cfg.providers[0];
  if (!active) return;
  process.env.WOP_LLM_PROVIDER = active.name;
  if (active.host) process.env[`LLM_HOST`] = active.host;
  if (active.model) process.env[`LLM_MODEL`] = active.model;

  // Set the SDK-recognized API key env var for this provider
  const apiKeyEnvVars: Record<string, string> = {
    openai: "OPENAI_API_KEY",
    "azure-openai": "AZURE_OPENAI_API_KEY",
    deepseek: "DEEPSEEK_API_KEY",
    google: "GEMINI_API_KEY",
    "google-vertex": "GOOGLE_CLOUD_API_KEY",
    groq: "GROQ_API_KEY",
    cerebras: "CEREBRAS_API_KEY",
    xai: "XAI_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    "vercel-ai-gateway": "AI_GATEWAY_API_KEY",
    zai: "ZAI_API_KEY",
    mistral: "MISTRAL_API_KEY",
    minimax: "MINIMAX_API_KEY",
    "minimax-cn": "MINIMAX_CN_API_KEY",
    moonshotai: "MOONSHOT_API_KEY",
    "moonshotai-cn": "MOONSHOT_API_KEY",
    huggingface: "HF_TOKEN",
    fireworks: "FIREWORKS_API_KEY",
    together: "TOGETHER_API_KEY",
    opencode: "OPENCODE_API_KEY",
    "opencode-go": "OPENCODE_API_KEY",
    "kimi-coding": "KIMI_API_KEY",
    "cloudflare-workers-ai": "CLOUDFLARE_API_KEY",
    "cloudflare-ai-gateway": "CLOUDFLARE_API_KEY",
    xiaomi: "XIAOMI_API_KEY",
    "xiaomi-token-plan-cn": "XIAOMI_TOKEN_PLAN_CN_API_KEY",
    "xiaomi-token-plan-ams": "XIAOMI_TOKEN_PLAN_AMS_API_KEY",
    "xiaomi-token-plan-sgp": "XIAOMI_TOKEN_PLAN_SGP_API_KEY",
  };
  // anthropic uses special precedence
  if (active.name === "anthropic") {
    if (active.apiKey) process.env.ANTHROPIC_API_KEY = active.apiKey;
  } else if (active.name === "github-copilot") {
    // uses COPILOT_GITHUB_TOKEN, GH_TOKEN, or GITHUB_TOKEN
  } else if (active.name === "ollama") {
    // ollama doesnt need an API key
  } else if (active.name === "amazon-bedrock") {
    // uses AWS credentials, not an API key
  } else {
    const envVar = apiKeyEnvVars[active.name];
    if (envVar && active.apiKey) process.env[envVar] = active.apiKey;
  }
}

// Migrate old flat config to new providers array format
try {
  const llmRow = db.query("SELECT value FROM server_config WHERE key = 'llm_providers'").get() as { value?: string } | undefined;
  if (llmRow?.value) {
    const raw = JSON.parse(llmRow.value);
    if (raw.activeProvider === undefined && raw.providers === undefined) {
      // old flat format: { provider, ollamaModel, ollamaHost, openrouterModel, openrouterApiKey }
      const providers: LlmProvider[] = [];
      if (raw.ollamaModel || raw.ollamaHost) {
        providers.push({ name: "ollama", label: "Ollama (local)", model: raw.ollamaModel || "qwen3.5:9b", host: raw.ollamaHost || "http://127.0.0.1:11434", apiKey: "" });
      }
      if (raw.openrouterModel || raw.openrouterApiKey) {
        providers.push({ name: "openrouter", label: "OpenRouter", model: raw.openrouterModel || "anthropic/claude-3.5-sonnet", host: "https://openrouter.ai/api/v1", apiKey: raw.openrouterApiKey || "" });
      }
      if (providers.length === 0) {
        providers.push({ name: "ollama", label: "Ollama (local)", model: "qwen3.5:9b", host: "http://127.0.0.1:11434", apiKey: "" });
      }
      const migrated = JSON.stringify({ activeProvider: raw.provider || "ollama", providers });
      db.query("UPDATE server_config SET value = ? WHERE key = 'llm_providers'").run(migrated);
      raw.activeProvider = raw.provider || "ollama";
      raw.providers = providers;
    }
    applyActiveProvider(raw);
  }
} catch { /* non-fatal */ }

export { db };
