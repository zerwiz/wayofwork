-- Way of Work: Multi-Tenant SQLite Schema (Phase 1)
-- Run with: bun sqlite3 data/wayofpi.sqlite < schema.sql

-- Enable WAL mode for concurrent reads
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;

-- ============================================
-- 1. TENANTS (Isolation Boundary)
-- ============================================
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,               -- e.g., "tenant_abc123"
    name TEXT NOT NULL,                   -- "Acme Construction"
    slug TEXT UNIQUE NOT NULL,             -- "acme" (for subdomains/paths)
    created_at TEXT DEFAULT (datetime('now')),
    settings_json TEXT DEFAULT '{}',         -- branding, limits, features
    subscription_tier TEXT DEFAULT 'free', -- 'free', 'pro', 'enterprise'
    active BOOLEAN DEFAULT 1
);

-- ============================================
-- 2. USERS (RBAC: 4-Tier System)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,                 -- UUID or "user_xxx"
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,        -- Bun.password.hash() output
    pin TEXT,                             -- 4-digit PIN for workers (hashed)
    role TEXT NOT NULL DEFAULT 'WORKER', -- 'SUPER_ADMIN', 'ADMIN', 'LEADER', 'WORKER', 'CLIENT'
    email TEXT,
    phone TEXT,                          -- For WhatsApp integration
    full_name TEXT,
    job_title TEXT,                      -- "Foreman", "Electrician"
    created_at TEXT DEFAULT (datetime('now')),
    last_login TEXT,
    active BOOLEAN DEFAULT 1,
    UNIQUE(tenant_id, username),           -- Tenant-scoped unique
    UNIQUE(tenant_id, email)               -- Tenant-scoped unique
);

-- Index for fast tenant+role lookups
CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON users(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- ============================================
-- 3. PROJECTS (Work Leader's Projects)
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,                 -- "proj_xxx"
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                   -- "Building A Foundation"
    description TEXT,
    prd_doc_path TEXT,                   -- Path to PRD.md in workspace
    api_spec_path TEXT,                 -- Path to API_SPECS.md
    planned_start_date TEXT,
    planned_end_date TEXT,
    budget_allocated REAL DEFAULT 0,       -- In dollars/euros
    budget_spent REAL DEFAULT 0,           -- Updated via time entries
    status TEXT DEFAULT 'active',         -- 'draft', 'active', 'paused', 'completed'
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    settings_json TEXT DEFAULT '{}',          -- Gantt chart settings, milestones
    resource_permission_id TEXT REFERENCES resource_permissions(resource_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects(tenant_id);

-- ============================================
-- 4. TASKS (Project Management)
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,                 -- "task_xxx"
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to TEXT REFERENCES users(id),  -- Worker assigned
    created_by TEXT REFERENCES users(id),  -- Work Leader who created it
    status TEXT DEFAULT 'draft',          -- 'draft', 'in_progress', 'complete', 'cancelled'
    priority TEXT DEFAULT 'medium',       -- 'low', 'medium', 'high', 'critical'
    estimated_hours REAL,
    actual_hours REAL DEFAULT 0,
    start_date TEXT,
    due_date TEXT,
    depends_on TEXT,                       -- JSON array of task IDs
    cad_file_paths TEXT,                   -- JSON array of .dwg/.rvt paths
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    resource_permission_id TEXT REFERENCES resource_permissions(resource_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tasks_tenant ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- ============================================
-- 5. TIME_ENTRIES (Worker Logs)
-- ============================================
CREATE TABLE IF NOT EXISTS time_entries (
    id TEXT PRIMARY KEY,                 -- "time_xxx"
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    project_id TEXT REFERENCES projects(id),
    task_id TEXT REFERENCES tasks(id),
    date TEXT NOT NULL,                    -- "2026-05-05"
    hours REAL NOT NULL,
    description TEXT,                       -- "Poured foundation section A"
    drawing_ref TEXT,                       -- "A-101_Foundation.pdf"
    status TEXT DEFAULT 'pending',        -- 'pending', 'approved', 'rejected'
    approved_by TEXT REFERENCES users(id),
    approved_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_time_user_date ON time_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_time_status ON time_entries(status);

-- ============================================
-- 6. WORKSPACE FILES (Isolated per Tenant)
-- ============================================
CREATE TABLE IF NOT EXISTS workspace_files (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id TEXT REFERENCES projects(id),
    file_path TEXT NOT NULL,               -- Relative to workspace root
    file_size INTEGER,
    mime_type TEXT,
    cad_type TEXT,                         -- 'dwg', 'rvt', 'pdf', 'image'
    uploaded_by TEXT REFERENCES users(id),
    download_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(tenant_id, file_path),              -- Prevent path conflicts
    resource_permission_id TEXT REFERENCES resource_permissions(resource_id) ON DELETE CASCADE
);

-- ============================================
-- 7. WHATSAPP SESSIONS (For Bots)
-- ============================================
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    phone_number TEXT NOT NULL,
    bot_type TEXT NOT NULL,                -- 'WORKER_BOT', 'LEADER_CLAW'
    session_token TEXT,                      -- WhatsApp Business API token
    pi_agent_name TEXT,                    -- "WorkTimeBot", "WorkLeaderClaw"
    active BOOLEAN DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(tenant_id, phone_number)
);

-- ============================================
-- 8. AUDIT_LOG (Security & Debugging)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT REFERENCES tenants(id),
    user_id TEXT REFERENCES users(id),
    action TEXT NOT NULL,                 -- 'LOGIN', 'FILE_DOWNLOAD', 'TASK_CREATE'
    resource_type TEXT,                    -- 'task', 'file', 'time_entry'
    resource_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    details_json TEXT,                       -- Additional context (masked secrets)
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- 9. NOTES (Project Documentation)
-- ============================================
CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    resource_permission_id TEXT REFERENCES resource_permissions(resource_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notes_tenant ON notes(tenant_id);
-- ============================================
-- 10. CALENDAR_EVENTS (Project Scheduling)
-- ============================================
CREATE TABLE IF NOT EXISTS calendar_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    all_day BOOLEAN DEFAULT 0,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_calendar_tenant ON calendar_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendar_project ON calendar_events(project_id);

-- ============================================
-- 11. PROJECT_MEMBERS (Access Control)
-- ============================================
CREATE TABLE IF NOT EXISTS project_members (
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'WORKER',
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_tenant ON project_members(tenant_id);


-- ============================================
-- 13. RESOURCE_PERMISSIONS (Access Control)
-- ============================================
CREATE TABLE IF NOT EXISTS resource_permissions (
    resource_id TEXT PRIMARY KEY,        -- e.g., "board_123", "file_abc"
    resource_type TEXT NOT NULL,         -- 'kanban_board', 'workspace_file', 'document'
    owner_id TEXT NOT NULL REFERENCES users(id),
    visibility TEXT NOT NULL DEFAULT 'private', -- 'private', 'shared', 'tenant'
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS resource_shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id TEXT NOT NULL REFERENCES resource_permissions(resource_id) ON DELETE CASCADE,
    shared_with_id TEXT NOT NULL REFERENCES users(id),
    permission TEXT NOT NULL DEFAULT 'read', -- 'read', 'write'
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(resource_id, shared_with_id)
);

-- ============================================
-- SAMPLE DATA (Development Only - Remove in Production)
-- ============================================
-- Insert demo tenant
INSERT OR IGNORE INTO tenants (id, name, slug) VALUES ('tenant_demo', 'Demo Construction', 'demo');

-- Insert Super Admin
INSERT OR IGNORE INTO users (id, tenant_id, username, password_hash, role, full_name)
VALUES ('user_admin', 'tenant_demo', 'admin',
        '$2b$10$...', -- Bun.password.hash('admin123')
        'SUPER_ADMIN', 'Admin User');

-- Insert Work Leader
INSERT OR IGNORE INTO users (id, tenant_id, username, password_hash, pin, role, full_name, job_title)
VALUES ('user_leader', 'tenant_demo', 'leader',
        '$2b$10$...', -- Bun.password.hash('leader123')
        '1234', -- PIN for portal
        'LEADER', 'John Leader', 'Construction Manager');

-- Insert Workers
INSERT OR IGNORE INTO users (id, tenant_id, username, password_hash, pin, role, full_name, job_title, phone)
VALUES
    ('user_worker1', 'tenant_demo', 'worker1', '$2b$10$...', '5678', 'WORKER', 'Bob Builder', 'Foreman', '+1234567890'),
    ('user_worker2', 'tenant_demo', 'worker2', '$2b$10$...', '9012', 'WORKER', 'Alice Electric', 'Electrician', '+1234567891');

-- Insert Sample Project
INSERT OR IGNORE INTO projects (id, tenant_id, name, description, budget_allocated)
VALUES ('proj_1', 'tenant_demo', 'Foundation Work', 'Main building foundation phase', 50000);

-- Insert Project Members
INSERT OR IGNORE INTO project_members (tenant_id, project_id, user_id, role)
VALUES 
    ('tenant_demo', 'proj_1', 'user_leader', 'LEADER'),
    ('tenant_demo', 'proj_1', 'user_worker1', 'WORKER'),
    ('tenant_demo', 'proj_1', 'user_worker2', 'WORKER');

-- Insert Sample Tasks
INSERT OR IGNORE INTO tasks (id, tenant_id, project_id, title, assigned_to, status, estimated_hours)
VALUES
    ('task_1', 'tenant_demo', 'proj_1', 'Pour Foundation', 'user_worker1', 'in_progress', 40),
    ('task_2', 'tenant_demo', 'proj_1', 'Install Rebar', 'user_worker2', 'draft', 20);

CREATE TABLE IF NOT EXISTS bug_reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  description TEXT NOT NULL,
  expected_behavior TEXT,
  actual_behavior TEXT,
  steps_to_reproduce TEXT,
  environment TEXT,
  screenshots TEXT,
  video_url TEXT,
  reproduction_rate TEXT DEFAULT 'often',
  is_security_issue INTEGER DEFAULT 0,
  is_duplicate_of TEXT,
  status TEXT DEFAULT 'pending',
  assigned_to TEXT,
  status_reason TEXT,
  comments TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  acknowledged_at TEXT,
  status_changed_at TEXT,
  fixed_in_version TEXT,
  closed_by TEXT,
  closed_at TEXT,
  notifications_count INTEGER DEFAULT 0,
  upvotes INTEGER DEFAULT 0,
  labels TEXT,
  tenant_id TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_bug_user_id ON bug_reports(user_id);
CREATE INDEX idx_bug_status ON bug_reports(status);
CREATE INDEX idx_bug_category ON bug_reports(category);
CREATE INDEX idx_bug_severity ON bug_reports(severity);
CREATE INDEX idx_bug_assigned ON bug_reports(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_bug_created ON bug_reports(created_at DESC);
