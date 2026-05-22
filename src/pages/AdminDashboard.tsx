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
  priceLists: number;
  pendingChanges: number;
}

export default function AdminDashboard({ uiMode, setUiMode }: { uiMode: string; setUiMode: (m: string) => void }) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [clients, setClients] = useState<Worker[]>([]);
  const [stats, setStats] = useState<AdminStats>({ workers: 0, clients: 0, projects: 0, tasks: 0, time_entries: 0, priceLists: 0, pendingChanges: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"workers" | "clients" | "channels" | "llm" | "pricing" | "approvals">("workers");
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newWorker, setNewWorker] = useState({ username: "", full_name: "", pin: "1234" });
  const [newClient, setNewClient] = useState({ username: "", full_name: "", pin: "1234" });
  const [whatsappBots, setWhatsappBots] = useState<any[]>([]);
  const [telegramBots, setTelegramBots] = useState<any[]>([]);
  const [channelLinks, setChannelLinks] = useState<any[]>([]);
  const [channelLogs, setChannelLogs] = useState<any[]>([]);
  const [showAddWhatsappBot, setShowAddWhatsappBot] = useState(false);
  const [showAddTelegramBot, setShowAddTelegramBot] = useState(false);
  const [channelsTab, setChannelsTab] = useState<"bots" | "links" | "logs">("bots");
  const [newWhatsappBot, setNewWhatsappBot] = useState({ label: "", phone_number_id: "", access_token: "", business_account_id: "" });
  const [newTelegramBot, setNewTelegramBot] = useState({ label: "", bot_token: "", bot_username: "" });

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("wop_token")}` });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const h = authHeaders();
      const [usersRes, statsRes, waBotsRes, tgBotsRes, linksRes, logsRes] = await Promise.all([
        fetch("/api/admin/users", { headers: h }),
        fetch("/api/admin/stats", { headers: h }),
        fetch("/api/admin/channels/whatsapp-bots", { headers: h }),
        fetch("/api/admin/channels/telegram-bots", { headers: h }),
        fetch("/api/admin/channels/links", { headers: h }),
        fetch("/api/admin/channels/logs?limit=50", { headers: h }),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setWorkers(data.filter((u: any) => u.role !== "CLIENT"));
        setClients(data.filter((u: any) => u.role === "CLIENT"));
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({
          workers: (statsData.users || 0) - (statsData.clients || 0),
          clients: statsData.clients || 0,
          projects: statsData.projects || 0,
          tasks: statsData.tasks || 0,
          time_entries: statsData.timeEntries || 0,
          priceLists: statsData.priceLists || 0,
          pendingChanges: statsData.pendingChanges || 0,
        });
      }

      if (waBotsRes.ok) setWhatsappBots(await waBotsRes.json());
      if (tgBotsRes.ok) setTelegramBots(await tgBotsRes.json());
      if (linksRes.ok) setChannelLinks(await linksRes.json());
      if (logsRes.ok) setChannelLogs(await logsRes.json());
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWorker = async () => {
    if (!newWorker.username) return;
    try {
      await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          username: newWorker.username,
          full_name: newWorker.full_name,
          pin: newWorker.pin || "1234",
          password: newWorker.pin || "1234",
          role: "WORKER",
        }),
      });
    } catch (e) {
      console.error("Failed to create worker:", e);
    }
    setShowAddWorker(false);
    setNewWorker({ username: "", full_name: "", pin: "1234" });
    fetchData();
  };

  const handleAddClient = async () => {
    if (!newClient.username) return;
    try {
      await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          username: newClient.username,
          full_name: newClient.full_name,
          pin: newClient.pin || "1234",
          password: newClient.pin || "1234",
          role: "CLIENT",
        }),
      });
    } catch (e) {
      console.error("Failed to create client:", e);
    }
    setShowAddClient(false);
    setNewClient({ username: "", full_name: "", pin: "1234" });
    fetchData();
  };

  const handleAddWhatsappBot = async () => {
    if (!newWhatsappBot.label || !newWhatsappBot.phone_number_id || !newWhatsappBot.access_token) return;
    try {
      await fetch("/api/admin/channels/whatsapp-bots", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(newWhatsappBot),
      });
    } catch (e) { console.error("Failed to create WhatsApp bot:", e); }
    setShowAddWhatsappBot(false);
    setNewWhatsappBot({ label: "", phone_number_id: "", access_token: "", business_account_id: "" });
    fetchData();
  };

  const handleDeleteWhatsappBot = async (id: string) => {
    try {
      await fetch(`/api/admin/channels/whatsapp-bots/${id}`, { method: "DELETE", headers: authHeaders() });
      fetchData();
    } catch (e) { console.error("Failed to delete WhatsApp bot:", e); }
  };

  const handleAddTelegramBot = async () => {
    if (!newTelegramBot.label || !newTelegramBot.bot_token) return;
    try {
      await fetch("/api/admin/channels/telegram-bots", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(newTelegramBot),
      });
    } catch (e) { console.error("Failed to create Telegram bot:", e); }
    setShowAddTelegramBot(false);
    setNewTelegramBot({ label: "", bot_token: "", bot_username: "" });
    fetchData();
  };

  const handleDeleteTelegramBot = async (id: string) => {
    try {
      await fetch(`/api/admin/channels/telegram-bots/${id}`, { method: "DELETE", headers: authHeaders() });
      fetchData();
    } catch (e) { console.error("Failed to delete Telegram bot:", e); }
  };

  const handleForceUnlink = async (id: string) => {
    try {
      await fetch(`/api/admin/channels/links/${id}`, { method: "DELETE", headers: authHeaders() });
      fetchData();
    } catch (e) { console.error("Failed to unlink channel:", e); }
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
        <div className="grid grid-cols-6 gap-4 mb-8">
          {[
            { label: "Workers", value: stats.workers, color: "border-blue-500" },
            { label: "Clients", value: stats.clients, color: "border-[#ea580c]" },
            { label: "Projects", value: stats.projects, color: "border-green-500" },
            { label: "Price Lists", value: stats.priceLists ?? 0, color: "border-cyan-500" },
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
            onClick={() => setActiveTab("pricing")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "pricing"
                ? "border-b-2 border-[#ea580c] text-[#ea580c]"
                : "text-[#858585] hover:text-[#cccccc]"
            }`}
          >
            Prislistor
          </button>
          <button
            onClick={() => setActiveTab("approvals")}
            className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === "approvals"
                ? "border-b-2 border-[#ea580c] text-[#ea580c]"
                : "text-[#858585] hover:text-[#cccccc]"
            }`}
          >
            Godkännandekö
            {stats.pendingChanges > 0 && (
              <span className="bg-[#ea580c] text-white text-xs rounded-full px-2 py-0.5 font-bold">
                {stats.pendingChanges}
              </span>
            )}
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
          <button
            onClick={() => setActiveTab("channels")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "channels"
                ? "border-b-2 border-[#ea580c] text-[#ea580c]"
                : "text-[#858585] hover:text-[#cccccc]"
            }`}
          >
            Channels
          </button>
          <button
            onClick={() => setActiveTab("llm")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "llm"
                ? "border-b-2 border-[#ea580c] text-[#ea580c]"
                : "text-[#858585] hover:text-[#cccccc]"
            }`}
          >
            LLM Providers
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

        {activeTab === "channels" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Channels</h2>
            </div>

            <div className="flex gap-4 border-b border-[#3c3c3c] mb-6">
              <button
                onClick={() => setChannelsTab("bots")}
                className={`px-3 py-1 text-sm transition-colors ${
                  channelsTab === "bots"
                    ? "border-b-2 border-[#ea580c] text-[#ea580c]"
                    : "text-[#858585] hover:text-[#cccccc]"
                }`}
              >Bot Accounts</button>
              <button
                onClick={() => setChannelsTab("links")}
                className={`px-3 py-1 text-sm transition-colors ${
                  channelsTab === "links"
                    ? "border-b-2 border-[#ea580c] text-[#ea580c]"
                    : "text-[#858585] hover:text-[#cccccc]"
                }`}
              >Channel Links</button>
              <button
                onClick={() => setChannelsTab("logs")}
                className={`px-3 py-1 text-sm transition-colors ${
                  channelsTab === "logs"
                    ? "border-b-2 border-[#ea580c] text-[#ea580c]"
                    : "text-[#858585] hover:text-[#cccccc]"
                }`}
              >Message Logs</button>
            </div>

            {channelsTab === "bots" && (
              <div className="space-y-6">
                {/* WhatsApp Bots */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-white">WhatsApp Bot Accounts</h3>
                    <button
                      onClick={() => setShowAddWhatsappBot(true)}
                      className="px-3 py-1.5 bg-[#ea580c] hover:bg-[#d45309] rounded text-white text-xs"
                    >+ Add WhatsApp Bot</button>
                  </div>
                  {showAddWhatsappBot && (
                    <div className="bg-[#252526] p-4 rounded mb-4 border border-[#3c3c3c]">
                      <div className="grid grid-cols-2 gap-3">
                        <input type="text" placeholder="Label (e.g. Sales Bot)"
                          value={newWhatsappBot.label}
                          onChange={(e) => setNewWhatsappBot({...newWhatsappBot, label: e.target.value})}
                          className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm" />
                        <input type="text" placeholder="Phone Number ID"
                          value={newWhatsappBot.phone_number_id}
                          onChange={(e) => setNewWhatsappBot({...newWhatsappBot, phone_number_id: e.target.value})}
                          className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm" />
                        <input type="text" placeholder="Access Token"
                          value={newWhatsappBot.access_token}
                          onChange={(e) => setNewWhatsappBot({...newWhatsappBot, access_token: e.target.value})}
                          className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm" />
                        <input type="text" placeholder="Business Account ID (optional)"
                          value={newWhatsappBot.business_account_id}
                          onChange={(e) => setNewWhatsappBot({...newWhatsappBot, business_account_id: e.target.value})}
                          className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm" />
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button onClick={handleAddWhatsappBot} className="px-3 py-1.5 bg-[#ea580c] hover:bg-[#d45309] rounded text-white text-xs">Create</button>
                        <button onClick={() => setShowAddWhatsappBot(false)} className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#4a4a4a] rounded text-xs">Cancel</button>
                      </div>
                    </div>
                  )}
                  <div className="bg-[#252526] rounded border border-[#3c3c3c]">
                    <table className="w-full text-sm">
                      <thead className="border-b border-[#3c3c3c]">
                        <tr className="text-left text-[#999]">
                          <th className="p-2">Label</th>
                          <th className="p-2">Phone Number ID</th>
                          <th className="p-2">Active</th>
                          <th className="p-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {whatsappBots.map((bot: any) => (
                          <tr key={bot.id} className="border-b border-[#3c3c3c] hover:bg-[#2d2d2d]">
                            <td className="p-2 text-white">{bot.label}</td>
                            <td className="p-2 text-[#999]">{bot.phone_number_id || "-"}</td>
                            <td className="p-2">
                              <span className={bot.active ? "text-green-500" : "text-red-500"}>{bot.active ? "Yes" : "No"}</span>
                            </td>
                            <td className="p-2">
                              <button onClick={() => handleDeleteWhatsappBot(bot.id)} className="text-red-500 hover:underline text-xs">Delete</button>
                            </td>
                          </tr>
                        ))}
                        {whatsappBots.length === 0 && (
                          <tr><td colSpan={4} className="p-4 text-center text-[#585858]">No WhatsApp bot accounts</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Telegram Bots */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-white">Telegram Bot Accounts</h3>
                    <button
                      onClick={() => setShowAddTelegramBot(true)}
                      className="px-3 py-1.5 bg-[#ea580c] hover:bg-[#d45309] rounded text-white text-xs"
                    >+ Add Telegram Bot</button>
                  </div>
                  {showAddTelegramBot && (
                    <div className="bg-[#252526] p-4 rounded mb-4 border border-[#3c3c3c]">
                      <div className="grid grid-cols-2 gap-3">
                        <input type="text" placeholder="Label (e.g. Support Bot)"
                          value={newTelegramBot.label}
                          onChange={(e) => setNewTelegramBot({...newTelegramBot, label: e.target.value})}
                          className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm" />
                        <input type="text" placeholder="Bot Username (e.g. my_bot)"
                          value={newTelegramBot.bot_username}
                          onChange={(e) => setNewTelegramBot({...newTelegramBot, bot_username: e.target.value})}
                          className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm" />
                        <input type="password" placeholder="Bot Token"
                          value={newTelegramBot.bot_token}
                          onChange={(e) => setNewTelegramBot({...newTelegramBot, bot_token: e.target.value})}
                          className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm col-span-2" />
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button onClick={handleAddTelegramBot} className="px-3 py-1.5 bg-[#ea580c] hover:bg-[#d45309] rounded text-white text-xs">Create</button>
                        <button onClick={() => setShowAddTelegramBot(false)} className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#4a4a4a] rounded text-xs">Cancel</button>
                      </div>
                    </div>
                  )}
                  <div className="bg-[#252526] rounded border border-[#3c3c3c]">
                    <table className="w-full text-sm">
                      <thead className="border-b border-[#3c3c3c]">
                        <tr className="text-left text-[#999]">
                          <th className="p-2">Label</th>
                          <th className="p-2">Bot Username</th>
                          <th className="p-2">Active</th>
                          <th className="p-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {telegramBots.map((bot: any) => (
                          <tr key={bot.id} className="border-b border-[#3c3c3c] hover:bg-[#2d2d2d]">
                            <td className="p-2 text-white">{bot.label}</td>
                            <td className="p-2 text-[#999]">{bot.bot_username || "-"}</td>
                            <td className="p-2">
                              <span className={bot.active ? "text-green-500" : "text-red-500"}>{bot.active ? "Yes" : "No"}</span>
                            </td>
                            <td className="p-2">
                              <button onClick={() => handleDeleteTelegramBot(bot.id)} className="text-red-500 hover:underline text-xs">Delete</button>
                            </td>
                          </tr>
                        ))}
                        {telegramBots.length === 0 && (
                          <tr><td colSpan={4} className="p-4 text-center text-[#585858]">No Telegram bot accounts</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {channelsTab === "links" && (
              <div className="bg-[#252526] rounded border border-[#3c3c3c]">
                <table className="w-full text-sm">
                  <thead className="border-b border-[#3c3c3c]">
                    <tr className="text-left text-[#999]">
                      <th className="p-3">User</th>
                      <th className="p-3">Channel</th>
                      <th className="p-3">Channel User ID</th>
                      <th className="p-3">Channel Username</th>
                      <th className="p-3">Bot</th>
                      <th className="p-3">Active</th>
                      <th className="p-3">Last Activity</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channelLinks.map((link: any) => (
                      <tr key={link.id} className="border-b border-[#3c3c3c] hover:bg-[#2d2d2d]">
                        <td className="p-3 text-white">{link.user_name || link.user_id}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-xs bg-blue-600">{link.channel}</span>
                        </td>
                        <td className="p-3 text-[#999] text-xs">{link.channel_user_id || "-"}</td>
                        <td className="p-3 text-[#999]">{link.channel_username || "-"}</td>
                        <td className="p-3 text-[#999] text-xs">{link.channel_bot_id || "-"}</td>
                        <td className="p-3">
                          <span className={link.active ? "text-green-500" : "text-red-500"}>{link.active ? "Yes" : "No"}</span>
                        </td>
                        <td className="p-3 text-[#999] text-xs">
                          {link.last_activity_at ? new Date(link.last_activity_at).toLocaleString() : "-"}
                        </td>
                        <td className="p-3">
                          <button onClick={() => handleForceUnlink(link.id)} className="text-red-500 hover:underline text-xs">Unlink</button>
                        </td>
                      </tr>
                    ))}
                    {channelLinks.length === 0 && (
                      <tr><td colSpan={8} className="p-6 text-center text-[#585858]">No channel links</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {channelsTab === "logs" && (
              <div className="bg-[#252526] rounded border border-[#3c3c3c]">
                <table className="w-full text-sm">
                  <thead className="border-b border-[#3c3c3c]">
                    <tr className="text-left text-[#999]">
                      <th className="p-2">Time</th>
                      <th className="p-2">Channel</th>
                      <th className="p-2">Direction</th>
                      <th className="p-2">User</th>
                      <th className="p-2">Message</th>
                      <th className="p-2">Type</th>
                      <th className="p-2">Bot</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channelLogs.map((log: any) => (
                      <tr key={log.id} className="border-b border-[#3c3c3c] hover:bg-[#2d2d2d]">
                        <td className="p-2 text-[#999] text-xs">
                          {log.created_at ? new Date(log.created_at).toLocaleString() : "-"}
                        </td>
                        <td className="p-2">
                          <span className="px-2 py-0.5 rounded text-xs bg-blue-600">{log.channel}</span>
                        </td>
                        <td className="p-2 text-xs">
                          <span className={log.direction === "inbound" ? "text-green-500" : "text-yellow-500"}>
                            {log.direction}
                          </span>
                        </td>
                        <td className="p-2 text-[#999] text-xs">{log.channel_user_id || "-"}</td>
                        <td className="p-2 text-[#999] text-xs max-w-[200px] truncate">{log.message_text || "-"}</td>
                        <td className="p-2 text-[#999] text-xs">{log.message_type || "-"}</td>
                        <td className="p-2 text-[#999] text-xs">{log.bot_id || "-"}</td>
                      </tr>
                    ))}
                    {channelLogs.length === 0 && (
                      <tr><td colSpan={7} className="p-6 text-center text-[#585858]">No channel message logs</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "llm" && (
          <LlmProvidersTab />
        )}

        {activeTab === "pricing" && (
          <PriceListsTab />
        )}

        {activeTab === "approvals" && (
          <ApprovalQueueTab />
        )}
      </div>
    </div>
  );
}

function LlmProvidersTab() {
  const [config, setConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeProvider, setActiveProvider] = useState("ollama");
  const [providers, setProviders] = useState<any[]>([]);

  const knownProviders = [
    { name: "ollama", label: "Ollama (local)" },
    { name: "openrouter", label: "OpenRouter" },
    { name: "openai", label: "OpenAI" },
    { name: "anthropic", label: "Anthropic" },
    { name: "google", label: "Google AI (Gemini)" },
    { name: "google-vertex", label: "Google Vertex AI" },
    { name: "amazon-bedrock", label: "Amazon Bedrock" },
    { name: "azure-openai", label: "Azure OpenAI" },
    { name: "deepseek", label: "DeepSeek" },
    { name: "github-copilot", label: "GitHub Copilot" },
    { name: "xai", label: "xAI (Grok)" },
    { name: "groq", label: "Groq" },
    { name: "cerebras", label: "Cerebras" },
    { name: "mistral", label: "Mistral AI" },
    { name: "minimax", label: "MiniMax" },
    { name: "moonshotai", label: "Moonshot AI (Kimi)" },
    { name: "huggingface", label: "Hugging Face" },
    { name: "fireworks", label: "Fireworks AI" },
    { name: "together", label: "Together AI" },
    { name: "vercel-ai-gateway", label: "Vercel AI Gateway" },
    { name: "zai", label: "ZAI" },
    { name: "opencode", label: "OpenCode" },
    { name: "opencode-go", label: "OpenCode Go" },
    { name: "kimi-coding", label: "Kimi Coding" },
    { name: "cloudflare-workers-ai", label: "Cloudflare Workers AI" },
    { name: "cloudflare-ai-gateway", label: "Cloudflare AI Gateway" },
    { name: "xiaomi", label: "Xiaomi" },
  ];

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("wop_token")}` });

  useEffect(() => {
    fetch("/api/admin/llm-providers", { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        setConfig(d);
        setActiveProvider(d.activeProvider || "ollama");
        setProviders(d.providers || []);
      });
  }, []);

  const addProvider = () => {
    setProviders([...providers, { name: "", label: "", model: "", host: "", apiKey: "" }]);
  };

  const removeProvider = (i: number) => {
    const next = providers.filter((_, idx) => idx !== i);
    setProviders(next);
  };

  const updateProvider = (i: number, field: string, value: string) => {
    const next = [...providers];
    next[i] = { ...next[i], [field]: value };
    setProviders(next);
  };

  const providerLabel = (name: string) => {
    const k = knownProviders.find(p => p.name === name);
    return k ? k.label : name;
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/llm-providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ activeProvider, providers }),
      });
      if (res.ok) setSaved(true);
    } catch {}
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">LLM Provider</h2>
      <p className="text-sm text-[#858585]">Configure AI model providers for the Claw assistant (web chat & bots). The active provider is used at runtime.</p>

      <div className="space-y-3 max-w-2xl">
        {providers.map((p, i) => (
          <div key={i} className="rounded border border-[#3c3c3c] bg-[#1e1e1e] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input type="radio" name="activeProvider"
                  checked={activeProvider === p.name}
                  onChange={() => setActiveProvider(p.name)}
                  className="accent-[#ea580c]" />
                <span className="text-sm font-medium text-white">
                  {p.name ? providerLabel(p.name) : "(new provider)"}
                </span>
                {activeProvider === p.name && (
                  <span className="text-xs bg-[#ea580c] text-white px-2 py-0.5 rounded">active</span>
                )}
              </div>
              <button onClick={() => removeProvider(i)}
                className="text-xs text-red-400 hover:text-red-300">
                Remove
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#585858] mb-1">Provider</label>
                <select value={p.name} onChange={e => updateProvider(i, "name", e.target.value)}
                  className="w-full rounded border border-[#3c3c3c] bg-[#2a2a2a] px-3 py-2 text-sm text-[#cccccc]">
                  <option value="">-- select --</option>
                  {knownProviders.map(kp => (
                    <option key={kp.name} value={kp.name}>{kp.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#585858] mb-1">Label</label>
                <input value={p.label} onChange={e => updateProvider(i, "label", e.target.value)}
                  placeholder={p.name ? providerLabel(p.name) : ""}
                  className="w-full rounded border border-[#3c3c3c] bg-[#2a2a2a] px-3 py-2 text-sm text-[#cccccc]" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#585858] mb-1">Model</label>
                <input value={p.model} onChange={e => updateProvider(i, "model", e.target.value)}
                  placeholder={p.name === "ollama" ? "qwen3.5:9b" : p.name === "openrouter" ? "anthropic/claude-3.5-sonnet" : ""}
                  className="w-full rounded border border-[#3c3c3c] bg-[#2a2a2a] px-3 py-2 text-sm text-[#cccccc]" />
              </div>
              <div>
                <label className="block text-xs text-[#585858] mb-1">Host URL</label>
                <input value={p.host} onChange={e => updateProvider(i, "host", e.target.value)}
                  placeholder={p.name === "ollama" ? "http://127.0.0.1:11434" : p.name === "openrouter" ? "https://openrouter.ai/api/v1" : ""}
                  className="w-full rounded border border-[#3c3c3c] bg-[#2a2a2a] px-3 py-2 text-sm text-[#cccccc]" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#585858] mb-1">API Key</label>
              <input value={p.apiKey} onChange={e => updateProvider(i, "apiKey", e.target.value)}
                placeholder={p.apiKey ? "•••••• (leave empty to keep)" : "sk-..."}
                className="w-full rounded border border-[#3c3c3c] bg-[#2a2a2a] px-3 py-2 text-sm text-[#cccccc]" />
            </div>
          </div>
        ))}

        <button onClick={addProvider}
          className="w-full rounded border border-dashed border-[#3c3c3c] bg-transparent px-4 py-3 text-sm text-[#858585] hover:text-[#cccccc] hover:border-[#585858] transition-colors">
          + Add Provider
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving}
          className="rounded bg-[#ea580c] px-4 py-2 text-sm text-white disabled:opacity-50">
          {saving ? "Saving..." : "Save"}
        </button>
        {saved && <span className="text-xs text-green-500">Saved ✓</span>}
      </div>
    </div>
  );
}

function PriceListsTab() {
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editItems, setEditItems] = useState("[]");

  const h = () => ({ Authorization: `Bearer ${localStorage.getItem("wop_token")}` });

  const fetchLists = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/price-lists", { headers: h() });
      if (res.ok) {
        const data = await res.json();
        setLists(data);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchLists(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const res = await fetch("/api/price-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...h() },
        body: JSON.stringify({ name: newName, items_json: "[]" }),
      });
      if (res.ok) {
        setNewName("");
        setShowNew(false);
        fetchLists();
      }
    } catch {}
  };

  const handleUpdate = async (id: string, data: any) => {
    try {
      const res = await fetch(`/api/price-lists/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...h() },
        body: JSON.stringify(data),
      });
      if (res.ok) fetchLists();
    } catch {}
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/price-lists/${id}`, { method: "DELETE", headers: h() });
      if (res.ok) fetchLists();
    } catch {}
  };

  const addItem = (items: any[]) => {
    return [...items, { name: "", unit: "", unit_price: 0, category: "" }];
  };

  const updateItem = (items: any[], idx: number, field: string, value: string | number) => {
    const updated = items.map((item, i) => (i === idx ? { ...item, [field]: value } : item));
    return updated;
  };

  const removeItem = (items: any[], idx: number) => {
    return items.filter((_, i) => i !== idx);
  };

  const parsedItems = (list: any): any[] => {
    if (!list) return [];
    if (Array.isArray(list.items_json)) return list.items_json;
    if (typeof list.items_json === "string") {
      try { return JSON.parse(list.items_json); } catch { return []; }
    }
    return [];
  };

  if (loading) {
    return <div className="text-[#858585] py-4">Loading price lists...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Price Lists</h2>
        <button
          onClick={() => setShowNew(!showNew)}
          className="px-4 py-2 bg-[#ea580c] hover:bg-[#d45309] rounded text-white text-sm"
        >
          + Ny prispaket
        </button>
      </div>

      {showNew && (
        <div className="bg-[#252526] p-4 rounded border border-[#3c3c3c] space-y-3">
          <input
            type="text"
            placeholder="Price list name (e.g. Grundarbeten 2024)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-4 py-2 bg-[#ea580c] hover:bg-[#d45309] rounded text-white text-sm">
              Create
            </button>
            <button onClick={() => setShowNew(false)} className="px-4 py-2 bg-[#3c3c3c] hover:bg-[#4a4a4a] rounded text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {lists.length === 0 && (
        <div className="text-center text-[#585858] py-8">No price lists yet. Create your first one.</div>
      )}

      <div className="space-y-4">
        {lists.map((list) => {
          const items = parsedItems(list);
          const isEditing = editingId === list.id;
          return (
            <div key={list.id} className="bg-[#252526] rounded border border-[#3c3c3c]">
              <div className="flex justify-between items-center px-4 py-3 border-b border-[#3c3c3c]">
                <div>
                  <span className="text-white font-medium">{list.name}</span>
                  <span className="text-[#585858] text-xs ml-3">{items.length} items</span>
                  {list.valid_from && (
                    <span className="text-[#585858] text-xs ml-3">
                      {list.valid_from} – {list.valid_to || "∞"}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (isEditing) {
                        setEditingId(null);
                      } else {
                        setEditingId(list.id);
                        setEditItems(JSON.stringify(items, null, 2));
                      }
                    }}
                    className="text-[#999] hover:text-white text-xs"
                  >
                    {isEditing ? "Close" : "Edit"}
                  </button>
                  <button
                    onClick={() => handleDelete(list.id)}
                    className="text-red-500 hover:text-red-400 text-xs"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {!isEditing && items.length > 0 && (
                <div className="p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[#999] text-xs">
                        <th className="pb-2">Item</th>
                        <th className="pb-2">Unit</th>
                        <th className="pb-2">Unit Price</th>
                        <th className="pb-2">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item: any, i: number) => (
                        <tr key={i} className="border-t border-[#3c3c3c]">
                          <td className="py-2 text-white">{item.name || "-"}</td>
                          <td className="py-2 text-[#999]">{item.unit || "-"}</td>
                          <td className="py-2 text-[#ea580c] font-mono">
                            {item.unit_price ? `${item.unit_price} kr/${item.unit}` : "-"}
                          </td>
                          <td className="py-2 text-[#999]">{item.category || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {isEditing && (
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      defaultValue={list.valid_from || ""}
                      onChange={(e) => handleUpdate(list.id, { valid_from: e.target.value })}
                      className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm"
                      placeholder="Valid from"
                    />
                    <input
                      type="date"
                      defaultValue={list.valid_to || ""}
                      onChange={(e) => handleUpdate(list.id, { valid_to: e.target.value })}
                      className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm"
                      placeholder="Valid to"
                    />
                  </div>

                  <div className="border border-[#3c3c3c] rounded">
                    <table className="w-full text-sm">
                      <thead className="bg-[#1e1e1e] border-b border-[#3c3c3c]">
                        <tr className="text-left text-[#999] text-xs">
                          <th className="p-2">Name</th>
                          <th className="p-2">Unit</th>
                          <th className="p-2">Unit Price (kr)</th>
                          <th className="p-2">Category</th>
                          <th className="p-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item: any, i: number) => (
                          <tr key={i} className="border-b border-[#3c3c3c]">
                            <td className="p-1">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => {
                                  const updated = updateItem(items, i, "name", e.target.value);
                                  setEditItems(JSON.stringify(updated, null, 2));
                                }}
                                className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 text-xs"
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={item.unit}
                                onChange={(e) => {
                                  const updated = updateItem(items, i, "unit", e.target.value);
                                  setEditItems(JSON.stringify(updated, null, 2));
                                }}
                                className="w-16 bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 text-xs"
                                placeholder="m²"
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="number"
                                value={item.unit_price}
                                onChange={(e) => {
                                  const updated = updateItem(items, i, "unit_price", parseFloat(e.target.value) || 0);
                                  setEditItems(JSON.stringify(updated, null, 2));
                                }}
                                className="w-28 bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 text-xs font-mono"
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={item.category}
                                onChange={(e) => {
                                  const updated = updateItem(items, i, "category", e.target.value);
                                  setEditItems(JSON.stringify(updated, null, 2));
                                }}
                                className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 text-xs"
                                placeholder="Grund"
                              />
                            </td>
                            <td className="p-1">
                              <button
                                onClick={() => {
                                  const updated = removeItem(items, i);
                                  setEditItems(JSON.stringify(updated, null, 2));
                                }}
                                className="text-red-500 hover:text-red-400 text-xs"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const updated = addItem(items);
                        setEditItems(JSON.stringify(updated, null, 2));
                      }}
                      className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#4a4a4a] rounded text-xs"
                    >
                      + Add Item
                    </button>
                    <button
                      onClick={async () => {
                        let parsed;
                        try { parsed = JSON.parse(editItems); } catch { return; }
                        await handleUpdate(list.id, { items_json: JSON.stringify(parsed) });
                        setEditingId(null);
                      }}
                      className="px-3 py-1.5 bg-[#ea580c] hover:bg-[#d45309] rounded text-white text-xs"
                    >
                      Save Items
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ApprovalQueueTab() {
  const [changes, setChanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);

  const h = () => ({ Authorization: `Bearer ${localStorage.getItem("wop_token")}` });

  const fetchChanges = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pending-changes", { headers: h() });
      if (res.ok) setChanges(await res.json());
    } catch {}
    setLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users", { headers: h() });
      if (res.ok) setUsers(await res.json());
    } catch {}
  };

  useEffect(() => { fetchChanges(); fetchUsers(); }, []);

  const handleApprove = async (id: string) => {
    try {
      await fetch(`/api/admin/pending-changes/${id}/approve`, {
        method: "POST",
        headers: h(),
      });
      fetchChanges();
    } catch {}
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) return;
    try {
      await fetch(`/api/admin/pending-changes/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...h() },
        body: JSON.stringify({ reason: rejectReason }),
      });
      setRejectingId(null);
      setRejectReason("");
      fetchChanges();
    } catch {}
  };

  if (loading) return <div className="text-[#999] text-sm">Loading pending changes...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-white">
          Godkännandekö <span className="text-sm text-[#999] font-normal">({changes.filter(c => c.status === "pending").length} pending)</span>
        </h2>
        <button
          onClick={fetchChanges}
          className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#4a4a4a] rounded text-xs text-[#ccc]"
        >
          Refresh
        </button>
      </div>

      {changes.filter(c => c.status === "pending").length === 0 ? (
        <div className="text-[#585858] text-sm py-8 text-center">Inga väntande godkännanden</div>
      ) : (
        <div className="space-y-4">
          {changes.filter(c => c.status === "pending").map((ch) => {
            let proposed: any = {};
            try { proposed = JSON.parse(ch.proposed_data || "{}"); } catch {}
            let current: any = null;
            try { current = ch.current_data ? JSON.parse(ch.current_data) : null; } catch {}
            const assignedUser = users.find(u => u.id === ch.assigned_to);
            const isAssignedToMe = !ch.assigned_to || ch.assigned_to === localStorage.getItem("user_id");

            return (
              <div key={ch.id} className={`bg-[#252526] border-l-4 ${isAssignedToMe ? "border-[#ea580c]" : "border-[#555]"} p-4 rounded`}>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#3c3c3c] text-[#ccc]">
                        {ch.change_type}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-900/30 text-blue-400">
                        {ch.target_table}
                      </span>
                      {ch.assigned_to && (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${isAssignedToMe ? "bg-green-900/30 text-green-400" : "bg-yellow-900/30 text-yellow-400"}`}>
                          {isAssignedToMe ? "Tilldelad mig" : assignedUser ? assignedUser.username : `User ${ch.assigned_to.slice(0, 8)}`}
                        </span>
                      )}
                    </div>
                    <p className="text-white text-sm font-medium mb-1">{ch.summary}</p>
                    <p className="text-[#999] text-xs">
                      {ch.suggested_by === "ai" ? "AI" : ch.suggested_by} · {new Date(ch.created_at).toLocaleString("sv-SE")}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isAssignedToMe ? (
                      <span className="text-xs text-[#777] italic">Tilldelad annan admin</span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleApprove(ch.id)}
                          className="px-4 py-1.5 bg-green-700 hover:bg-green-600 rounded text-white text-xs font-medium"
                        >
                          Godkänn
                        </button>
                        <button
                          onClick={() => { setRejectingId(ch.id); setRejectReason(""); }}
                          className="px-4 py-1.5 bg-red-800 hover:bg-red-700 rounded text-white text-xs font-medium"
                        >
                          Avvisa
                        </button>
                        <button
                          onClick={() => setSelectedId(selectedId === ch.id ? null : ch.id)}
                          className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#4a4a4a] rounded text-xs text-[#ccc]"
                        >
                          {selectedId === ch.id ? "Dölj" : "Diff"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {rejectingId === ch.id && (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Anledning till avvisning..."
                      className="flex-1 bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-1.5 text-sm text-white placeholder-[#585858] focus:outline-none focus:border-[#ea580c]"
                    />
                    <button
                      onClick={() => handleReject(ch.id)}
                      disabled={!rejectReason.trim()}
                      className="px-3 py-1.5 bg-red-700 hover:bg-red-600 rounded text-white text-xs font-medium disabled:opacity-50"
                    >
                      Bekräfta
                    </button>
                    <button
                      onClick={() => setRejectingId(null)}
                      className="px-3 py-1.5 bg-[#3c3c3c] rounded text-xs text-[#ccc]"
                    >
                      Avbryt
                    </button>
                  </div>
                )}

                {selectedId === ch.id && (
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    {current && (
                      <div>
                        <h4 className="text-xs font-semibold text-[#999] uppercase mb-2">Current</h4>
                        <pre className="bg-[#1e1e1e] p-3 rounded text-xs text-[#ccc] overflow-x-auto max-h-60 overflow-y-auto">{JSON.stringify(current, null, 2)}</pre>
                      </div>
                    )}
                    <div>
                      <h4 className="text-xs font-semibold text-[#999] uppercase mb-2">Proposed</h4>
                      <pre className="bg-[#1e1e1e] p-3 rounded text-xs text-[#ccc] overflow-x-auto max-h-60 overflow-y-auto">{JSON.stringify(proposed, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {changes.filter(c => c.status !== "pending").length > 0 && (
        <div className="mt-8">
          <h3 className="text-md font-semibold text-[#999] mb-4">Historik</h3>
          <div className="space-y-2">
            {changes.filter(c => c.status !== "pending").map((ch) => (
              <div key={ch.id} className="bg-[#1e1e1e] p-3 rounded flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    ch.status === "approved" ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
                  }`}>
                    {ch.status === "approved" ? "Godkänd" : "Avvisad"}
                  </span>
                  <span className="text-sm text-[#ccc]">{ch.summary}</span>
                </div>
                <span className="text-xs text-[#777]">
                  {new Date(ch.approved_at || ch.created_at).toLocaleString("sv-SE")}
                  {ch.rejected_reason && ` · ${ch.rejected_reason}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
