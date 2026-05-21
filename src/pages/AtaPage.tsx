import { useState, useEffect, useCallback } from "react";
import type { Ticket, TicketCategory, TicketStatus, TicketPriority } from "../../shared/ticket-types";

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  ändring: "Ändring",
  tillägg: "Tillägg",
  avgående: "Avgående",
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  draft: "Utkast",
  pending_review: "Väntar granskning",
  pending_approval: "Väntar godkännande",
  approved: "Godkänd",
  rejected: "Avslagen",
  invoiced: "Fakturerad",
};

const STATUS_COLORS: Record<TicketStatus, string> = {
  draft: "text-gray-400",
  pending_review: "text-yellow-400",
  pending_approval: "text-blue-400",
  approved: "text-green-400",
  rejected: "text-red-400",
  invoiced: "text-purple-400",
};

export function AtaPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "ändring" as TicketCategory,
    priority: "medium" as TicketPriority,
    cost_estimate: "",
  });

  const token = localStorage.getItem("wop_token");
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/tickets", { headers });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      setTickets(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const createTicket = async () => {
    if (!form.title.trim()) return;
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          category: form.category,
          priority: form.priority,
          cost_estimate: form.cost_estimate ? Number(form.cost_estimate) : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create ticket");
      setShowCreate(false);
      setForm({ title: "", description: "", category: "ändring", priority: "medium", cost_estimate: "" });
      await fetchTickets();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create ticket");
    }
  };

  const transitionTicket = async (id: string, action: string, body?: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/tickets/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as any).error || `Failed: ${res.status}`);
      }
      await fetchTickets();
      setSelectedTicket(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : `Action failed`);
    }
  };

  const filtered = statusFilter === "all" ? tickets : tickets.filter((t) => t.status === statusFilter);

  return (
    <div className="flex h-full bg-[#1e1e1e] text-[#cccccc]">
      <div className="flex flex-col w-96 border-r border-[#3c3c3c] overflow-hidden">
        <div className="p-4 border-b border-[#3c3c3c]">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-[#ea580c]">ÄTA</h1>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="px-3 py-1.5 text-xs font-bold rounded bg-[#ea580c] text-white hover:bg-[#c2410c]"
            >
              + Nytt ÄTA
            </button>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TicketStatus | "all")}
            className="w-full rounded border border-[#3c3c3c] bg-[#2d2d2d] px-2 py-1.5 text-xs text-[#cccccc]"
          >
            <option value="all">Alla statusar</option>
            {(Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <p className="p-4 text-xs text-gray-500">Laddar...</p>}
          {error && <p className="p-4 text-xs text-red-400">{error}</p>}
          {!loading && filtered.length === 0 && (
            <p className="p-4 text-xs text-gray-500">Inga ÄTA-ärenden</p>
          )}
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => { setSelectedTicket(t); setShowCreate(false); }}
              className={`w-full text-left p-3 border-b border-[#3c3c3c] hover:bg-[#2d2d2d] transition-colors ${
                selectedTicket?.id === t.id ? "bg-[#2d2d2d]" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${STATUS_COLORS[t.status]}`}>
                  {STATUS_LABELS[t.status]}
                </span>
                <span className="text-[10px] text-gray-500">{CATEGORY_LABELS[t.category]}</span>
              </div>
              <p className="text-sm font-medium truncate">{t.title}</p>
              {t.cost_estimate !== undefined && t.cost_estimate !== null && (
                <p className="text-xs text-gray-500 mt-1">
                  Budget: {t.cost_estimate.toLocaleString()} kr
                </p>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {showCreate ? (
          <div className="max-w-2xl">
            <h2 className="text-lg font-bold mb-4">Nytt ÄTA-ärende</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Titel</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded border border-[#3c3c3c] bg-[#2d2d2d] px-3 py-2 text-sm"
                  placeholder="Beskrivande titel..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Beskrivning</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded border border-[#3c3c3c] bg-[#2d2d2d] px-3 py-2 text-sm resize-none"
                  rows={4}
                  placeholder="Detaljerad beskrivning..."
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1">Kategori</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as TicketCategory })}
                    className="w-full rounded border border-[#3c3c3c] bg-[#2d2d2d] px-3 py-2 text-sm"
                  >
                    {(Object.keys(CATEGORY_LABELS) as TicketCategory[]).map((c) => (
                      <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1">Prioritet</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as TicketPriority })}
                    className="w-full rounded border border-[#3c3c3c] bg-[#2d2d2c] px-3 py-2 text-sm"
                  >
                    <option value="low">Låg</option>
                    <option value="medium">Medel</option>
                    <option value="high">Hög</option>
                    <option value="critical">Kritisk</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1">Budget (kr)</label>
                  <input
                    type="number"
                    value={form.cost_estimate}
                    onChange={(e) => setForm({ ...form, cost_estimate: e.target.value })}
                    className="w-full rounded border border-[#3c3c3c] bg-[#2d2d2d] px-3 py-2 text-sm"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={createTicket}
                  className="px-4 py-2 text-sm font-bold rounded bg-[#ea580c] text-white hover:bg-[#c2410c]"
                >
                  Skapa ÄTA
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm rounded border border-[#3c3c3c] text-gray-400 hover:text-white"
                >
                  Avbryt
                </button>
              </div>
            </div>
          </div>
        ) : selectedTicket ? (
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
              <span className={`text-sm font-bold ${STATUS_COLORS[selectedTicket.status]}`}>
                {STATUS_LABELS[selectedTicket.status]}
              </span>
              <span className="text-xs text-gray-500">{CATEGORY_LABELS[selectedTicket.category]}</span>
              <span className={`text-xs font-medium ${
                selectedTicket.priority === "critical" ? "text-red-400" :
                selectedTicket.priority === "high" ? "text-orange-400" :
                selectedTicket.priority === "medium" ? "text-yellow-400" : "text-gray-400"
              }`}>
                {selectedTicket.priority === "critical" ? "Kritisk" :
                 selectedTicket.priority === "high" ? "Hög" :
                 selectedTicket.priority === "medium" ? "Medel" : "Låg"}
              </span>
            </div>
            <h2 className="text-xl font-bold mb-2">{selectedTicket.title}</h2>
            {selectedTicket.description && (
              <p className="text-sm text-gray-400 mb-6 whitespace-pre-wrap">{selectedTicket.description}</p>
            )}
            {selectedTicket.cost_estimate !== undefined && selectedTicket.cost_estimate !== null && (
              <div className="mb-4">
                <span className="text-xs text-gray-500">Budget: </span>
                <span className="text-sm font-medium">{selectedTicket.cost_estimate.toLocaleString()} kr</span>
              </div>
            )}
            {selectedTicket.cost_actual !== undefined && selectedTicket.cost_actual !== null && (
              <div className="mb-4">
                <span className="text-xs text-gray-500">Faktisk kostnad: </span>
                <span className="text-sm font-medium">{selectedTicket.cost_actual.toLocaleString()} kr</span>
              </div>
            )}
            {selectedTicket.rejected_reason && (
              <div className="mb-4 p-3 rounded border border-red-800 bg-red-900/20">
                <span className="text-xs text-red-400 font-medium">Anledning till avslag: </span>
                <p className="text-sm text-red-300 mt-1">{selectedTicket.rejected_reason}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-6">
              {selectedTicket.status === "draft" && (
                <button
                  onClick={() => transitionTicket(selectedTicket.id, "submit")}
                  className="px-4 py-2 text-sm font-bold rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  Skicka för granskning
                </button>
              )}
              {selectedTicket.status === "pending_review" && (
                <>
                  <button
                    onClick={() => transitionTicket(selectedTicket.id, "review", { status: "pending_approval" })}
                    className="px-4 py-2 text-sm font-bold rounded bg-green-600 text-white hover:bg-green-700"
                  >
                    Godkänn internt
                  </button>
                  <button
                    onClick={() => transitionTicket(selectedTicket.id, "reject-internal", {})}
                    className="px-4 py-2 text-sm font-bold rounded bg-red-600 text-white hover:bg-red-700"
                  >
                    Avslå
                  </button>
                </>
              )}
              {selectedTicket.status === "pending_approval" && (
                <>
                  <button
                    onClick={() => transitionTicket(selectedTicket.id, "approve", {})}
                    className="px-4 py-2 text-sm font-bold rounded bg-green-600 text-white hover:bg-green-700"
                  >
                    Godkänn (klient)
                  </button>
                  <button
                    onClick={() => transitionTicket(selectedTicket.id, "reject", {})}
                    className="px-4 py-2 text-sm font-bold rounded bg-red-600 text-white hover:bg-red-700"
                  >
                    Avslå (klient)
                  </button>
                </>
              )}
              {selectedTicket.status === "approved" && (
                <button
                  onClick={() => transitionTicket(selectedTicket.id, "invoice", { invoice_ref: `INV-${Date.now()}` })}
                  className="px-4 py-2 text-sm font-bold rounded bg-purple-600 text-white hover:bg-purple-700"
                >
                  Fakturera
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-500">Välj ett ÄTA-ärende eller skapa ett nytt</p>
          </div>
        )}
      </div>
    </div>
  );
}
