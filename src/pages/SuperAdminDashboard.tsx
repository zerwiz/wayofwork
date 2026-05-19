import { useState, useEffect } from "react";
// UiMode typed as string

interface Tenant {
  id: string;
  name: string;
  slug: string;
  subscription_tier: string;
  active: number;
  user_count: number;
  created_at: string;
}

interface SystemStats {
  tenants: number;
  users: number;
  projects: number;
  tasks: number;
  time_entries: number;
  system?: {
    memoryUsage: { rss: number, heapTotal: number, heapUsed: number, external: number, arrayBuffers: number };
    uptime: number;
    platform: string;
    nodeVersion: string;
    bunVersion: string;
  };
}

interface User {
  id: string;
  tenant_id: string;
  username: string;
  role: string;
  full_name: string;
  job_title: string;
  active: number;
  tenant_name: string;
}

export default function SuperAdminDashboard({ uiMode, setUiMode }: { uiMode: string; setUiMode: (m: string) => void }) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<SystemStats>({ tenants: 0, users: 0, projects: 0, tasks: 0, time_entries: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tenants" | "users" | "stats">("tenants");
  const [showCreateTenant, setShowCreateTenant] = useState(false);
  const [newTenant, setNewTenant] = useState({ name: "", slug: "", subscription_tier: "free" });

  // Helper to get auth headers
  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("wop_token");
    return token ? { "Authorization": `Bearer ${token}` } : {};
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [tenantsRes, usersRes, statsRes] = await Promise.all([
        fetch("/api/admin/tenants", { headers }),
        fetch("/api/admin/users", { headers }),
        fetch("/api/admin/stats", { headers }),
      ]);

      if (tenantsRes.ok) {
        const tenantsData = await tenantsRes.json();
        setTenants(tenantsData);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async () => {
    if (!newTenant.name || !newTenant.slug) return;

    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(newTenant),
      });

      if (res.ok) {
        setShowCreateTenant(false);
        setNewTenant({ name: "", slug: "", subscription_tier: "free" });
        fetchData();
      }
    } catch (error) {
      console.error("Failed to create tenant:", error);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN": return "bg-red-600";
      case "ADMIN": return "bg-purple-600";
      case "LEADER": return "bg-blue-600";
      case "WORKER": return "bg-green-600";
      default: return "bg-gray-600";
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return "0 MB";
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return "0s";
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    return `${d}d ${h}h ${m}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e] text-white">
        <div className="text-lg">Loading Developer View...</div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#1e1e1e] text-[#cccccc]">
      {/* Header */}
      <div className="bg-[#252526] border-b border-[#3c3c3c] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Developer View</h1>
              <p className="text-sm text-[#999] mt-1">System-wide management console</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-6 gap-4 p-6">
        {[
          { label: "Tenants", value: stats.tenants, color: "border-[#ea580c]" },
          { label: "Users", value: stats.users, color: "border-blue-500" },
          { label: "Clients", value: (stats as any).clients || 0, color: "border-[#ea580c]" },
          { label: "Projects", value: stats.projects, color: "border-green-500" },
          { label: "Tasks", value: stats.tasks, color: "border-yellow-500" },
          { label: "Time Entries", value: stats.time_entries, color: "border-purple-500" },
        ].map((stat) => (
          <div key={stat.label} className={`bg-[#252526] border-l-4 ${stat.color} p-4 rounded`}>
            <div className="text-3xl font-bold text-white">{stat.value}</div>
            <div className="text-sm text-[#999] mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="px-6">
        <div className="flex gap-4 border-b border-[#3c3c3c]">
          {(["tenants", "users", "stats"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 capitalize ${
                activeTab === tab
                  ? "text-[#ea580c] border-b-2 border-[#ea580c]"
                  : "text-[#999] hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === "tenants" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Tenants</h2>
              <button
                onClick={() => setShowCreateTenant(true)}
                className="px-4 py-2 bg-[#ea580c] hover:bg-[#d45309] rounded text-white text-sm"
              >
                + Create Tenant
              </button>
            </div>

            {showCreateTenant && (
              <div className="bg-[#252526] p-4 rounded mb-4 border border-[#3c3c3c]">
                <h3 className="text-lg font-semibold mb-3">New Tenant</h3>
                <div className="grid grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="Name (e.g., Acme Construction)"
                    value={newTenant.name}
                    onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                    className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Slug (e.g., acme)"
                    value={newTenant.slug}
                    onChange={(e) => setNewTenant({ ...newTenant, slug: e.target.value })}
                    className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm"
                  />
                  <select
                    value={newTenant.subscription_tier}
                    onChange={(e) => setNewTenant({ ...newTenant, subscription_tier: e.target.value })}
                    className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm"
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleCreateTenant}
                    className="px-4 py-2 bg-[#ea580c] hover:bg-[#d45309] rounded text-white text-sm"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowCreateTenant(false)}
                    className="px-4 py-2 bg-[#3c3c3c] hover:bg-[#4a4a4a] rounded text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="bg-[#252526] rounded border border-[#3c3c3c]">
              <table className="w-full text-sm">
                <thead className="border-b border-[#3c3c3c]">
                  <tr className="text-left text-[#999]">
                    <th className="p-3">Name</th>
                    <th className="p-3">Slug</th>
                    <th className="p-3">Tier</th>
                    <th className="p-3">Users</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="border-b border-[#3c3c3c] hover:bg-[#2d2d2d]">
                      <td className="p-3 text-white">{tenant.name}</td>
                      <td className="p-3">{tenant.slug}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          tenant.subscription_tier === "enterprise" ? "bg-purple-600" :
                          tenant.subscription_tier === "pro" ? "bg-blue-600" : "bg-gray-600"
                        }`}>
                          {tenant.subscription_tier}
                        </span>
                      </td>
                      <td className="p-3">{tenant.user_count}</td>
                      <td className="p-3">
                        <span className={tenant.active ? "text-green-500" : "text-red-500"}>
                          {tenant.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-3 text-[#999]">
                        {new Date(tenant.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">All Users (System-Wide)</h2>
            <div className="bg-[#252526] rounded border border-[#3c3c3c]">
              <table className="w-full text-sm">
                <thead className="border-b border-[#3c3c3c]">
                  <tr className="text-left text-[#999]">
                    <th className="p-3">Username</th>
                    <th className="p-3">Full Name</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Tenant</th>
                    <th className="p-3">Job Title</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-[#3c3c3c] hover:bg-[#2d2d2d]">
                      <td className="p-3 text-white">{user.username}</td>
                      <td className="p-3">{user.full_name || "-"}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-3 text-[#999]">{user.tenant_name || user.tenant_id}</td>
                      <td className="p-3">{user.job_title || "-"}</td>
                      <td className="p-3">
                        <span className={user.active ? "text-green-500" : "text-red-500"}>
                          {user.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "stats" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Business Metrics</h2>
              <div className="grid grid-cols-3 gap-6 max-w-5xl">
                {[
                  { label: "Total Tenants", value: stats.tenants, icon: "🏢" },
                  { label: "Total Users", value: stats.users, icon: "👥" },
                  { label: "Total Clients", value: (stats as any).clients || 0, icon: "🤝" },
                  { label: "Total Projects", value: stats.projects, icon: "📁" },
                  { label: "Total Tasks", value: stats.tasks, icon: "✅" },
                  { label: "Time Entries", value: stats.time_entries, icon: "⏱️" },
                ].map((item) => (
                  <div key={item.label} className="bg-[#252526] p-6 rounded border border-[#3c3c3c]">
                    <div className="text-4xl mb-2">{item.icon}</div>
                    <div className="text-3xl font-bold text-white">{item.value}</div>
                    <div className="text-[#999] mt-1">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {stats.system && (
              <div>
                <h2 className="text-xl font-semibold text-white mb-4">Server Health & Environment</h2>
                <div className="grid grid-cols-2 gap-6 max-w-5xl">
                  {/* System Info */}
                  <div className="bg-[#252526] p-6 rounded border border-[#3c3c3c]">
                    <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                      <span>🖥️</span> Host Information
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between border-b border-[#3c3c3c] pb-2">
                        <span className="text-[#999]">Platform</span>
                        <span className="text-white capitalize">{stats.system.platform}</span>
                      </div>
                      <div className="flex justify-between border-b border-[#3c3c3c] pb-2">
                        <span className="text-[#999]">Uptime</span>
                        <span className="text-white">{formatUptime(stats.system.uptime)}</span>
                      </div>
                      <div className="flex justify-between border-b border-[#3c3c3c] pb-2">
                        <span className="text-[#999]">Node.js Version</span>
                        <span className="text-white">{stats.system.nodeVersion}</span>
                      </div>
                      <div className="flex justify-between border-b border-[#3c3c3c] pb-2">
                        <span className="text-[#999]">Bun Version</span>
                        <span className="text-white">{stats.system.bunVersion || "N/A"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Memory Usage */}
                  <div className="bg-[#252526] p-6 rounded border border-[#3c3c3c]">
                    <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                      <span>🧠</span> Memory Usage
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between border-b border-[#3c3c3c] pb-2">
                        <span className="text-[#999]" title="Resident Set Size (Total Memory)">RSS</span>
                        <span className="text-white font-medium">{formatBytes(stats.system.memoryUsage?.rss)}</span>
                      </div>
                      <div className="flex justify-between border-b border-[#3c3c3c] pb-2">
                        <span className="text-[#999]" title="V8 Heap Total">Heap Total</span>
                        <span className="text-white">{formatBytes(stats.system.memoryUsage?.heapTotal)}</span>
                      </div>
                      <div className="flex justify-between border-b border-[#3c3c3c] pb-2">
                        <span className="text-[#999]" title="V8 Heap Used">Heap Used</span>
                        <span className="text-white">{formatBytes(stats.system.memoryUsage?.heapUsed)}</span>
                      </div>
                      <div className="flex justify-between border-b border-[#3c3c3c] pb-2">
                        <span className="text-[#999]">External & Buffers</span>
                        <span className="text-white">
                          {formatBytes((stats.system.memoryUsage?.external || 0) + (stats.system.memoryUsage?.arrayBuffers || 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
