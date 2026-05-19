import { useState, useEffect } from "react";
// UiMode typed as string

interface Worker {
  id: string;
  username: string;
  full_name: string;
  role: string;
  active: number;
  last_active?: string;
}

interface AdminStats {
  workers: number;
  clients: number;
  projects: number;
  tasks: number;
  time_entries: number;
}

export default function AdminDashboard({ uiMode, setUiMode }: { uiMode: string; setUiMode: (m: string) => void }) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [clients, setClients] = useState<Worker[]>([]);
  const [stats, setStats] = useState<AdminStats>({ workers: 0, clients: 0, projects: 0, tasks: 0, time_entries: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"workers" | "clients">("workers");
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newWorker, setNewWorker] = useState({ username: "", full_name: "", pin: "1234" });
  const [newClient, setNewClient] = useState({ username: "", full_name: "", pin: "1234" });

  useEffect(() => {
    fetchData();
  }, []);

  const DEMO_WORKERS: Worker[] = [
    { id: "w-1", username: "anna", full_name: "Anna Svensson", role: "WORKER", active: 1, last_active: "2026-05-08" },
    { id: "w-2", username: "bjorn", full_name: "Björn Larsson", role: "WORKER", active: 1, last_active: "2026-05-07" },
    { id: "w-3", username: "cecilia", full_name: "Cecilia Johansson", role: "LEADER", active: 1, last_active: "2026-05-08" },
    { id: "w-4", username: "demo-worker", full_name: "Demo Worker", role: "WORKER", active: 1, last_active: "2026-05-08" },
  ];

  const DEMO_CLIENTS: Worker[] = [
    { id: "c-1", username: "demo-client", full_name: "Demo Client", role: "CLIENT", active: 1, last_active: "2026-05-08" },
    { id: "c-2", username: "byggab", full_name: "Bygg AB", role: "CLIENT", active: 1, last_active: "2026-05-06" },
  ];

  const DEMO_STATS: AdminStats = { workers: 3, clients: 2, projects: 8, tasks: 24, time_entries: 142 };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/stats"),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setWorkers(data.filter((u: any) => u.role !== "CLIENT"));
        setClients(data.filter((u: any) => u.role === "CLIENT"));
      } else {
        setWorkers(DEMO_WORKERS);
        setClients(DEMO_CLIENTS);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({
          workers: (statsData.users || 0) - (statsData.clients || 0),
          clients: statsData.clients || 0,
          projects: statsData.projects || 0,
          tasks: statsData.tasks || 0,
          time_entries: statsData.timeEntries || 0,
        });
      } else {
        setStats(DEMO_STATS);
      }
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
      setWorkers(DEMO_WORKERS);
      setClients(DEMO_CLIENTS);
      setStats(DEMO_STATS);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWorker = async () => {
    if (!newWorker.username) return;
    // Mock implementation for adding worker
    setShowAddWorker(false);
    setNewWorker({ username: "", full_name: "", pin: "1234" });
    fetchData();
  };

  const handleAddClient = async () => {
    if (!newClient.username) return;
    // Mock implementation for adding client
    setShowAddClient(false);
    setNewClient({ username: "", full_name: "", pin: "1234" });
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e] text-white">
        <div className="text-lg">Loading Admin Console...</div>
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
              <h1 className="text-2xl font-bold text-white">Admin Console</h1>
              <p className="text-sm text-[#999] mt-1">Manage team, clients, and projects</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          {[
            { label: "Workers", value: stats.workers, color: "border-blue-500" },
            { label: "Clients", value: stats.clients, color: "border-[#ea580c]" },
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
        <div className="flex gap-4 border-b border-[#3c3c3c] mb-6">
          <button
            onClick={() => setActiveTab("workers")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "workers"
                ? "border-b-2 border-[#ea580c] text-[#ea580c]"
                : "text-[#858585] hover:text-[#cccccc]"
            }`}
          >
            Workers
          </button>
          <button
            onClick={() => setActiveTab("clients")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "clients"
                ? "border-b-2 border-[#ea580c] text-[#ea580c]"
                : "text-[#858585] hover:text-[#cccccc]"
            }`}
          >
            Clients
          </button>
        </div>

        {activeTab === "workers" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Workers</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddWorker(true)}
                  className="px-4 py-2 bg-[#ea580c] hover:bg-[#d45309] rounded text-white text-sm"
                >
                  + Add Worker
                </button>
                <button
                  onClick={() => { setActiveTab("clients"); setShowAddClient(true); }}
                  className="px-4 py-2 bg-[#252526] hover:bg-[#2d2d2d] border border-[#3c3c3c] rounded text-[#999] text-sm"
                >
                  + Add Client
                </button>
              </div>
            </div>

            {showAddWorker && (
              <div className="bg-[#252526] p-4 rounded mb-6 border border-[#3c3c3c]">
                <h3 className="text-lg font-semibold mb-3">Add New Worker</h3>
                <div className="grid grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="Username"
                    value={newWorker.username}
                    onChange={(e) => setNewWorker({ ...newWorker, username: e.target.value })}
                    className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={newWorker.full_name}
                    onChange={(e) => setNewWorker({ ...newWorker, full_name: e.target.value })}
                    className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Initial PIN (4 digits)"
                    value={newWorker.pin}
                    onChange={(e) => setNewWorker({ ...newWorker, pin: e.target.value })}
                    className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleAddWorker}
                    className="px-4 py-2 bg-[#ea580c] hover:bg-[#d45309] rounded text-white text-sm"
                  >
                    Create Worker
                  </button>
                  <button
                    onClick={() => setShowAddWorker(false)}
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
                    <th className="p-3">Username</th>
                    <th className="p-3">Full Name</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Last Active</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map((worker) => (
                    <tr key={worker.id} className="border-b border-[#3c3c3c] hover:bg-[#2d2d2d]">
                      <td className="p-3 text-white">{worker.username}</td>
                      <td className="p-3">{worker.full_name || "-"}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs bg-blue-600`}>
                          {worker.role}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={worker.active ? "text-green-500" : "text-red-500"}>
                          {worker.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-3 text-[#999]">
                        {worker.last_active ? new Date(worker.last_active).toLocaleString() : "Never"}
                      </td>
                      <td className="p-3">
                        <button className="text-[#ea580c] hover:underline mr-3">Edit</button>
                        <button className="text-red-500 hover:underline">Deactivate</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "clients" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Clients</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => { setActiveTab("workers"); setShowAddWorker(true); }}
                  className="px-4 py-2 bg-[#252526] hover:bg-[#2d2d2d] border border-[#3c3c3c] rounded text-[#999] text-sm"
                >
                  + Add Worker
                </button>
                <button
                  onClick={() => setShowAddClient(true)}
                  className="px-4 py-2 bg-[#ea580c] hover:bg-[#d45309] rounded text-white text-sm"
                >
                  + Add Client
                </button>
              </div>
            </div>

            {showAddClient && (
              <div className="bg-[#252526] p-4 rounded mb-6 border border-[#3c3c3c]">
                <h3 className="text-lg font-semibold mb-3">Add New Client</h3>
                <div className="grid grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="Username/Client ID"
                    value={newClient.username}
                    onChange={(e) => setNewClient({ ...newClient, username: e.target.value })}
                    className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Company/Full Name"
                    value={newClient.full_name}
                    onChange={(e) => setNewClient({ ...newClient, full_name: e.target.value })}
                    className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Access PIN (4 digits)"
                    value={newClient.pin}
                    onChange={(e) => setNewClient({ ...newClient, pin: e.target.value })}
                    className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleAddClient}
                    className="px-4 py-2 bg-[#ea580c] hover:bg-[#d45309] rounded text-white text-sm"
                  >
                    Create Client
                  </button>
                  <button
                    onClick={() => setShowAddClient(false)}
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
                    <th className="p-3">Client ID</th>
                    <th className="p-3">Company Name</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Last Login</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id} className="border-b border-[#3c3c3c] hover:bg-[#2d2d2d]">
                      <td className="p-3 text-white">{client.username}</td>
                      <td className="p-3">{client.full_name || "-"}</td>
                      <td className="p-3">
                        <span className={client.active ? "text-green-500" : "text-red-500"}>
                          {client.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-3 text-[#999]">
                        {client.last_active ? new Date(client.last_active).toLocaleString() : "Never"}
                      </td>
                      <td className="p-3">
                        <button className="text-[#ea580c] hover:underline mr-3">View Projects</button>
                        <button className="text-red-500 hover:underline">Remove</button>
                      </td>
                    </tr>
                  ))}
                  {clients.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-[#585858]">No clients found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
