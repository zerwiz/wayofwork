import { useState, useEffect } from "react";
import { useTranslation } from "../contexts/LanguageContext";
import { 
  CheckCircle2, 
  XCircle, 
  Diff, 
  History, 
  User, 
  Calendar,
  AlertCircle,
  Clock,
  ArrowRight
} from "lucide-react";

// ... rest of the interfaces ...

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
  const [activeTab, setActiveTab] = useState<"workers" | "clients" | "channels" | "llm" | "pricing" | "approvals" | "offers">("workers");
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
  const [newWhatsappBot, setNewWhatsappBot] = useState({ label: "", phoneNumber: "", apiKey: "" });
  const [newTelegramBot, setNewTelegramBot] = useState({ label: "", botToken: "", botUsername: "" });

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
    if (!newWhatsappBot.label || !newWhatsappBot.phoneNumber || !newWhatsappBot.apiKey) return;
    try {
      await fetch("/api/admin/channels/whatsapp-bots", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(newWhatsappBot),
      });
    } catch (e) { console.error("Failed to create WhatsApp bot:", e); }
    setShowAddWhatsappBot(false);
    setNewWhatsappBot({ label: "", phoneNumber: "", apiKey: "" });
    fetchData();
  };

  const handleDeleteWhatsappBot = async (id: string) => {
    try {
      await fetch(`/api/admin/channels/whatsapp-bots/${id}`, { method: "DELETE", headers: authHeaders() });
      fetchData();
    } catch (e) { console.error("Failed to delete WhatsApp bot:", e); }
  };

  const handleAddTelegramBot = async () => {
    if (!newTelegramBot.label || !newTelegramBot.botToken) return;
    try {
      await fetch("/api/admin/channels/telegram-bots", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(newTelegramBot),
      });
    } catch (e) { console.error("Failed to create Telegram bot:", e); }
    setShowAddTelegramBot(false);
    setNewTelegramBot({ label: "", botToken: "", botUsername: "" });
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
            onClick={() => setActiveTab("offers")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "offers"
                ? "border-b-2 border-[#ea580c] text-[#ea580c]"
                : "text-[#858585] hover:text-[#cccccc]"
            }`}
          >
            Offers & Invoices
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
                        <input type="text" placeholder="Label (e.g. time_bot)"
                          value={newWhatsappBot.label}
                          onChange={(e) => setNewWhatsappBot({...newWhatsappBot, label: e.target.value})}
                          className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm" />
                        <input type="text" placeholder="Phone Number (e.g. +46...)"
                          value={newWhatsappBot.phoneNumber}
                          onChange={(e) => setNewWhatsappBot({...newWhatsappBot, phoneNumber: e.target.value})}
                          className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm" />
                        <input type="password" placeholder="API Key / Access Token"
                          value={newWhatsappBot.apiKey}
                          onChange={(e) => setNewWhatsappBot({...newWhatsappBot, apiKey: e.target.value})}
                          className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm col-span-2" />
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
                            <td className="p-2 text-white">
                              <span className="px-2 py-0.5 rounded text-[10px] bg-blue-900/30 text-blue-400 mr-2">{bot.label}</span>
                            </td>
                            <td className="p-2 text-[#999]">{bot.phoneNumber || "-"}</td>
                            <td className="p-2">
                              <span className={bot.active ? "text-green-500" : "text-red-500"}>{bot.active ? "Yes" : "No"}</span>
                            </td>
                            <td className="p-2 text-right">
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
                        <input type="text" placeholder="Label (e.g. claw_bot)"
                          value={newTelegramBot.label}
                          onChange={(e) => setNewTelegramBot({...newTelegramBot, label: e.target.value})}
                          className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm" />
                        <input type="text" placeholder="Bot Username (e.g. my_bot)"
                          value={newTelegramBot.botUsername}
                          onChange={(e) => setNewTelegramBot({...newTelegramBot, botUsername: e.target.value})}
                          className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm" />
                        <input type="password" placeholder="Bot Token"
                          value={newTelegramBot.botToken}
                          onChange={(e) => setNewTelegramBot({...newTelegramBot, botToken: e.target.value})}
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
                            <td className="p-2 text-white">
                              <span className="px-2 py-0.5 rounded text-[10px] bg-blue-900/30 text-blue-400 mr-2">{bot.label}</span>
                            </td>
                            <td className="p-2 text-[#999]">{bot.botUsername || "-"}</td>
                            <td className="p-2">
                              <span className={bot.active ? "text-green-500" : "text-red-500"}>{bot.active ? "Yes" : "No"}</span>
                            </td>
                            <td className="p-2 text-right">
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

        {activeTab === "offers" && (
          <OffersInvoicesTab />
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
  const { t } = useTranslation();
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

  if (loading) return <div className="text-[#999] text-sm flex items-center gap-2"><Clock size={16} className="animate-spin" /> {t("common.loading")}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
          <CheckCircle2 className="text-[#ea580c]" size={24} />
          {t("approvals.title")} 
          <span className="text-xs text-[#858585] font-normal bg-[#333] px-2 py-0.5 rounded-full">
            {changes.filter(c => c.status === "pending").length} {t("approvals.pending")}
          </span>
        </h2>
        <button
          onClick={fetchChanges}
          className="px-3 py-1.5 bg-[#333] hover:bg-[#444] rounded-lg text-xs font-bold text-[#ccc] transition-all"
        >
          {t("common.refresh")}
        </button>
      </div>

      {changes.filter(c => c.status === "pending").length === 0 ? (
        <div className="bg-[#252526] border border-[#3c3c3c] rounded-2xl p-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#1e1e1e] border border-[#3c3c3c] mb-4">
            <CheckCircle2 className="text-[#585858]" size={24} />
          </div>
          <p className="text-[#858585] text-sm">{t("approvals.no_pending")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {changes.filter(c => c.status === "pending").map((ch) => {
            let proposed: any = {};
            try { proposed = JSON.parse(ch.proposed_data || "{}"); } catch {}
            let current: any = null;
            try { current = ch.current_data ? JSON.parse(ch.current_data) : null; } catch {}
            
            const assignedUser = users.find(u => u.id === ch.assigned_to);
            const userId = localStorage.getItem("user_id") || "";
            const isAssignedToMe = !ch.assigned_to || ch.assigned_to === userId;

            return (
              <div key={ch.id} className="bg-[#252526] border border-[#3c3c3c] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="p-5 flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-[#333] text-[#aaa]">
                        {ch.change_type}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-blue-900/20 text-blue-400">
                        {ch.target_table}
                      </span>
                      {ch.assigned_to && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${isAssignedToMe ? "bg-emerald-900/20 text-emerald-400" : "bg-amber-900/20 text-amber-400"}`}>
                          <User size={10} className="inline mr-1" />
                          {isAssignedToMe ? t("approvals.assigned_to_me") : assignedUser?.username || t("approvals.assigned_to_other")}
                        </span>
                      )}
                    </div>
                    <h3 className="text-white text-base font-bold mb-1">{ch.summary}</h3>
                    <div className="flex items-center gap-3 text-[#858585] text-xs font-medium">
                      <span className="flex items-center gap-1"><History size={12} /> {ch.suggested_by === "ai" ? "Wo AI" : ch.suggested_by}</span>
                      <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(ch.created_at).toLocaleString("sv-SE")}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isAssignedToMe ? (
                      <div className="px-4 py-2 rounded-xl bg-[#1e1e1e] border border-[#3c3c3c] text-xs text-[#585858] font-medium flex items-center gap-2">
                        <Clock size={14} /> {t("approvals.assigned_to_other")}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-[#1e1e1e] p-1.5 rounded-xl border border-[#3c3c3c]">
                        <button
                          onClick={() => handleApprove(ch.id)}
                          className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] rounded-lg text-white text-xs font-bold transition-all shadow-sm"
                        >
                          {t("approvals.approve")}
                        </button>
                        <button
                          onClick={() => { setRejectingId(ch.id); setRejectReason(""); }}
                          className="px-4 py-2 bg-red-900/20 hover:bg-red-900/40 rounded-lg text-red-400 text-xs font-bold transition-all"
                        >
                          {t("approvals.reject")}
                        </button>
                        <button
                          onClick={() => setSelectedId(selectedId === ch.id ? null : ch.id)}
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${selectedId === ch.id ? "bg-[#333] text-white" : "text-[#858585] hover:text-white"}`}
                        >
                          <Diff size={14} />
                          {selectedId === ch.id ? t("approvals.hide") : t("approvals.diff")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {rejectingId === ch.id && (
                  <div className="p-5 bg-red-950/10 border-t border-[#3c3c3c] animate-in fade-in slide-in-from-top-2">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-wider">
                        <AlertCircle size={14} /> {t("approvals.reject")}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder={t("approvals.reason_placeholder")}
                          className="flex-1 bg-[#1e1e1e] border border-[#3c3c3c] rounded-xl px-4 py-2 text-sm text-white placeholder-[#585858] focus:outline-none focus:border-red-500 transition-all"
                        />
                        <button
                          onClick={() => handleReject(ch.id)}
                          disabled={!rejectReason.trim()}
                          className="px-5 py-2 bg-red-700 hover:bg-red-600 rounded-xl text-white text-xs font-bold disabled:opacity-50 transition-all shadow-sm"
                        >
                          {t("approvals.confirm")}
                        </button>
                        <button
                          onClick={() => setRejectingId(null)}
                          className="px-5 py-2 bg-[#333] hover:bg-[#444] rounded-xl text-xs font-bold text-[#ccc] transition-all"
                        >
                          {t("approvals.cancel")}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedId === ch.id && (
                  <div className="p-5 border-t border-[#3c3c3c] bg-[#1e1e1e]/30 animate-in fade-in slide-in-from-top-4">
                    <DiffTable current={current} proposed={proposed} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {changes.filter(c => c.status !== "pending").length > 0 && (
        <div className="pt-8">
          <h3 className="text-sm font-bold text-[#858585] uppercase tracking-widest mb-4 flex items-center gap-2">
            <History size={16} />
            {t("approvals.history")}
          </h3>
          <div className="space-y-2">
            {changes.filter(c => c.status !== "pending").map((ch) => (
              <div key={ch.id} className="bg-[#1e1e1e] border border-[#3c3c3c] p-4 rounded-xl flex justify-between items-center group hover:border-[#444] transition-colors">
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    ch.status === "approved" ? "bg-emerald-900/20 text-emerald-400" : "bg-red-900/20 text-red-400"
                  }`}>
                    {ch.status === "approved" ? t("approvals.approve") : t("approvals.reject")}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-white">{ch.summary}</div>
                    {ch.rejected_reason && (
                      <div className="text-[11px] text-red-400/80 mt-1 italic flex items-center gap-1">
                        <AlertCircle size={10} /> {ch.rejected_reason}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-mono text-[#555] group-hover:text-[#858585] transition-colors">
                    {new Date(ch.approved_at || ch.created_at).toLocaleString("sv-SE")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OffersInvoicesTab() {
  const [tab, setTab] = useState<"offers" | "invoices">("offers");
  const [offers, setOffers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: "", client_id: "", project_id: "", items_json: "", valid_until: "", notes: "", due_date: "" });
  const [sending, setSending] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);

  const h = () => ({ Authorization: `Bearer ${localStorage.getItem("wop_token")}` });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [offersRes, invoicesRes, usersRes] = await Promise.all([
        fetch("/api/offers", { headers: h() }),
        fetch("/api/invoices", { headers: h() }),
        fetch("/api/admin/users", { headers: h() }),
      ]);
      if (offersRes.ok) setOffers(await offersRes.json());
      if (invoicesRes.ok) setInvoices(await invoicesRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
    } catch (e) {
      console.error("Failed to fetch offers/invoices:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openForm = (item?: any) => {
    if (item) {
      setEditing(item);
      const items = typeof item.items_json === "string" ? item.items_json : JSON.stringify(item.items_json || []);
      setForm({
        title: item.title || "",
        client_id: item.client_id || "",
        project_id: item.project_id || "",
        items_json: items,
        valid_until: item.valid_until || "",
        notes: item.notes || "",
        due_date: item.due_date || "",
      });
    } else {
      setEditing(null);
      setForm({ title: "", client_id: "", project_id: "", items_json: "[]", valid_until: "", notes: "", due_date: "" });
    }
    setShowForm(true);
  };

  const saveForm = async () => {
    const endpoint = tab === "offers" ? "/api/offers" : "/api/invoices";
    const method = editing ? "PUT" : "POST";
    const url = editing ? `${endpoint}/${editing.id}` : endpoint;

    const body: any = {
      title: form.title,
      client_id: form.client_id || undefined,
      project_id: form.project_id || undefined,
      items_json: form.items_json,
      notes: form.notes || undefined,
    };
    if (tab === "offers") {
      body.valid_until = form.valid_until || undefined;
    } else {
      body.due_date = form.due_date || undefined;
    }

    const res = await fetch(url, {
      method,
      headers: { ...h(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setShowForm(false);
      fetchData();
    } else {
      const err = await res.json();
      alert(`Error: ${err.error || "Unknown error"}`);
    }
  };

  const deleteItem = async (id: string) => {
    const endpoint = tab === "offers" ? `/api/offers/${id}` : `/api/invoices/${id}`;
    const res = await fetch(endpoint, { method: "DELETE", headers: h() });
    if (res.ok) fetchData();
  };

  const sendItem = async (id: string, channel: string) => {
    setSending(id);
    const endpoint = tab === "offers" ? `/api/offers/${id}/send?channels=${channel}` : `/api/invoices/${id}/send?channels=${channel}`;
    const res = await fetch(endpoint, { method: "POST", headers: h() });
    if (res.ok) fetchData();
    setSending(null);
  };

  const viewDocument = (id: string) => {
    const endpoint = tab === "offers" ? `/api/offers/${id}/document` : `/api/invoices/${id}/document`;
    window.open(endpoint, "_blank");
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-500/30 text-gray-300",
      sent: "bg-blue-500/30 text-blue-300",
      accepted: "bg-green-500/30 text-green-300",
      rejected: "bg-red-500/30 text-red-300",
      invoiced: "bg-purple-500/30 text-purple-300",
      paid: "bg-emerald-500/30 text-emerald-300",
      overdue: "bg-orange-500/30 text-orange-300",
      cancelled: "bg-gray-500/20 text-gray-400",
    };
    return <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${colors[status] || colors.draft}`}>{status}</span>;
  };

  const formatItems = (itemsJson: string) => {
    try {
      const items = typeof itemsJson === "string" ? JSON.parse(itemsJson) : itemsJson;
      if (!Array.isArray(items)) return "0 items";
      return `${items.length} items`;
    } catch { return "0 items"; }
  };

  const sampleItems = (title: string, count: number) => {
    const items = [];
    const units = ["st", "h", "kg", "m"];
    for (let i = 1; i <= count; i++) {
      items.push({
        name: `Work item ${i}`,
        description: "",
        quantity: 1 + Math.floor(Math.random() * 10),
        unit: units[i % units.length],
        unit_price: 500 + Math.floor(Math.random() * 5000),
        total: 0,
      });
    }
    return items;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-[#858585] animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white capitalize">{tab}</h2>
        <div className="flex gap-2">
          <button onClick={() => { setTab("offers"); openForm(); }} className="px-4 py-2 bg-[#ea580c] hover:bg-[#d45309] rounded text-white text-sm">
            New Offer
          </button>
          <button onClick={() => { setTab("invoices"); openForm(); }} className="px-4 py-2 bg-[#059669] hover:bg-[#047857] rounded text-white text-sm">
            New Invoice
          </button>
        </div>
      </div>

      <div className="flex gap-4 border-b border-[#3c3c3c] mb-6">
        <button onClick={() => setTab("offers")} className={`px-4 py-2 text-sm font-medium transition-colors ${tab === "offers" ? "border-b-2 border-[#ea580c] text-[#ea580c]" : "text-[#858585] hover:text-[#cccccc]"}`}>
          Offers ({offers.length})
        </button>
        <button onClick={() => setTab("invoices")} className={`px-4 py-2 text-sm font-medium transition-colors ${tab === "invoices" ? "border-b-2 border-[#ea580c] text-[#ea580c]" : "text-[#858585] hover:text-[#cccccc]"}`}>
          Invoices ({invoices.length})
        </button>
      </div>

      <div className="bg-[#252526] rounded border border-[#3c3c3c]">
        <table className="w-full text-sm">
          <thead className="border-b border-[#3c3c3c]">
            <tr className="text-left text-[#999]">
              <th className="p-3">Number</th>
              <th className="p-3">Title</th>
              <th className="p-3">Client</th>
              <th className="p-3">Status</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Items</th>
              <th className="p-3">Created</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(tab === "offers" ? offers : invoices).length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-[#585858]">No {tab} yet.</td>
              </tr>
            ) : (
              (tab === "offers" ? offers : invoices).map((item: any) => {
                const clientName = users.find((u: any) => u.id === item.client_id)?.full_name || item.client_id?.slice(0, 8) || "-";
                const isDraft = item.status === "draft";
                return (
                  <tr key={item.id} className="border-b border-[#3c3c3c] hover:bg-[#2d2d2d]">
                    <td className="p-3 font-mono text-[#ea580c]">{item.offer_number || item.invoice_number}</td>
                    <td className="p-3 text-white">{item.title}</td>
                    <td className="p-3 text-[#999]">{clientName}</td>
                    <td className="p-3">{statusBadge(item.status)}</td>
                    <td className="p-3 font-mono">{(item.total_amount || 0).toLocaleString("sv-SE")} kr</td>
                    <td className="p-3 text-[#999]">{formatItems(item.items_json)}</td>
                    <td className="p-3 text-[#999] text-xs">{item.created_at?.slice(0, 10)}</td>
                    <td className="p-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => viewDocument(item.id)} className="px-2 py-1 bg-[#333] hover:bg-[#444] rounded text-[10px] text-[#ccc]" title="View document">View</button>
                        {isDraft && (
                          <>
                            <button onClick={() => openForm(item)} className="px-2 py-1 bg-[#333] hover:bg-[#444] rounded text-[10px] text-[#ccc]" title="Edit">Edit</button>
                            <button onClick={() => deleteItem(item.id)} className="px-2 py-1 bg-red-900/30 hover:bg-red-900/50 rounded text-[10px] text-red-400" title="Delete">Del</button>
                          </>
                        )}
                        {item.status === "draft" && (
                          <>
                            <button onClick={() => sendItem(item.id, "telegram")} disabled={sending === item.id} className="px-2 py-1 bg-blue-900/30 hover:bg-blue-900/50 rounded text-[10px] text-blue-400" title="Send via Telegram">TG</button>
                            <button onClick={() => sendItem(item.id, "whatsapp")} disabled={sending === item.id} className="px-2 py-1 bg-green-900/30 hover:bg-green-900/50 rounded text-[10px] text-green-400" title="Send via WhatsApp">WA</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-[#252526] rounded border border-[#3c3c3c] p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">{editing ? "Edit" : "New"} {tab === "offers" ? "Offer" : "Invoice"}</h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="col-span-2">
                <label className="block text-[#999] text-xs mb-1">Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm" placeholder="Description of work" />
              </div>
              <div>
                <label className="block text-[#999] text-xs mb-1">Client</label>
                <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm">
                  <option value="">Select client...</option>
                  {users.filter((u: any) => u.role === "CLIENT").map((u: any) => (
                    <option key={u.id} value={u.id}>{u.full_name || u.username}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[#999] text-xs mb-1">Valid until / Due date</label>
                <input type="date" value={tab === "offers" ? form.valid_until : form.due_date} onChange={e => {
                  const key = tab === "offers" ? "valid_until" : "due_date";
                  setForm({ ...form, [key]: e.target.value });
                }} className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-[#999] text-xs mb-1">Items (JSON)</label>
                <textarea value={form.items_json} onChange={e => setForm({ ...form, items_json: e.target.value })} rows={6} className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm font-mono text-[10px]" placeholder='[{"name":"Work","quantity":1,"unit":"st","unit_price":5000}]' />
                <div className="flex gap-2 mt-1">
                  <button onClick={() => setForm({ ...form, items_json: JSON.stringify(sampleItems("Consulting", 2), null, 2) })} className="text-[10px] text-[#ea580c] hover:underline">Sample 2 items</button>
                  <button onClick={() => setForm({ ...form, items_json: JSON.stringify(sampleItems("Material", 4), null, 2) })} className="text-[10px] text-[#ea580c] hover:underline">Sample 4 items</button>
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-[#999] text-xs mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm" placeholder="Payment terms, delivery notes..." />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-[#3c3c3c] hover:bg-[#4a4a4a] rounded text-sm">Cancel</button>
              <button onClick={saveForm} className="px-4 py-2 bg-[#ea580c] hover:bg-[#d45309] rounded text-white text-sm">{editing ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DiffTable({ current, proposed }: { current: any; proposed: any }) {
  const { t } = useTranslation();
  const allKeys = Array.from(new Set([...Object.keys(current || {}), ...Object.keys(proposed || {})]));
  
  const formatValue = (val: any) => {
    if (val === null || val === undefined) return <span className="text-[#585858]">-</span>;
    if (typeof val === "object") return <pre className="font-mono text-[10px] text-blue-400/80 max-h-40 overflow-y-auto whitespace-pre-wrap">{JSON.stringify(val, null, 2)}</pre>;
    return <span className="break-all">{String(val)}</span>;
  };

  return (
    <div className="overflow-hidden border border-[#3c3c3c] rounded-2xl bg-[#1e1e1e]">
      <table className="w-full text-xs text-left border-collapse">
        <thead>
          <tr className="bg-[#252526] border-b border-[#3c3c3c] text-[#858585] font-bold uppercase tracking-widest">
            <th className="p-4 w-1/4">Field</th>
            <th className="p-4 w-3/8">{t("approvals.current")}</th>
            <th className="p-4 w-3/8">{t("approvals.proposed")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#3c3c3c]">
          {allKeys.map(key => {
            const curVal = current?.[key];
            const propVal = proposed?.[key];
            const isChanged = JSON.stringify(curVal) !== JSON.stringify(propVal);
            
            return (
              <tr key={key} className={isChanged ? "bg-[#ea580c]/5 group/row" : ""}>
                <td className="p-4 font-mono text-[#858585] font-semibold border-r border-[#3c3c3c]">
                  <div className="flex items-center gap-2">
                    {isChanged && <div className="w-1.5 h-1.5 rounded-full bg-[#ea580c]" />}
                    {key}
                  </div>
                </td>
                <td className="p-4 text-[#aaa] align-top border-r border-[#3c3c3c]">{formatValue(curVal)}</td>
                <td className={`p-4 align-top ${isChanged ? "text-[#ea580c] font-semibold" : "text-[#aaa]"}`}>
                  <div className="flex items-start gap-2">
                    {isChanged && <ArrowRight size={14} className="mt-0.5 shrink-0" />}
                    {formatValue(propVal)}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
