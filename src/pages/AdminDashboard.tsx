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
  const [activeTab, setActiveTab] = useState<"workers" | "clients" | "channels">("workers");
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
      </div>
    </div>
  );
}
