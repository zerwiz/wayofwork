import { useState, useEffect } from "react";

export default function AuditTrailPage({ tenantId }: { tenantId: string }) {
  const [changes, setChanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "approved" | "rejected">("all");
  const [search, setSearch] = useState("");

  const [h, setH] = useState(() => ({ Authorization: `Bearer ${localStorage.getItem("wop_token")}` }));

  useEffect(() => {
    setH({ Authorization: `Bearer ${localStorage.getItem("wop_token")}` });
    fetchPendingChanges();
  }, [tenantId]);

  const fetchPendingChanges = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pending-changes?tenant=" + tenantId, { headers: h });
      if (res.ok) setChanges(await res.json());
    } catch {}
    setLoading(false);
  };

  // Sync h on token change
  useEffect(() => {
    const sync = () => setH({ Authorization: `Bearer ${localStorage.getItem("wop_token")}` });
    addEventListener("storage:" + "wop_token", sync);
    // Initial sync
    sync();
    return () => removeEventListener("storage:" + "wop_token", sync);
  }, []);

  const filterChanges = (arr: any[]) => {
    let result = arr;
    if (filter === "approved") result = arr.filter(c => c.status === "approved");
    if (filter === "rejected") result = arr.filter(c => c.status === "rejected");
    if (!search) return result;
    const lower = search.toLowerCase();
    return result.filter(c =>
      (c.summary && c.summary.toLowerCase().includes(lower)) ||
      (c.target_table && c.target_table.toLowerCase().includes(lower)) ||
      (c.target_id && c.target_id.toLowerCase().includes(lower)) ||
      (c.proposed_data && JSON.stringify(c.proposed_data).toLowerCase().includes(lower)) ||
      (c.suggested_by && c.suggested_by.toLowerCase().includes(lower)) ||
      ((c.approved_by || c.rejected_by) && c.approved_by.toLowerCase().includes(lower))
    );
  };

  const getChangeTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      "price_list_create": "Ny prislista",
      "price_list_update": "Uppdaterad prislista",
      "offer_status_change": "Offertstatus",
      "task_create": "Ny uppgift",
      "task_update": "Uppdaterad uppgift",
      "project_create": "Nytt projekt",
      "project_update": "Uppdaterat projekt",
    };
    return map[type] || type.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim().toLowerCase();
  };

  const formatDate = (s?: string) => {
    if (!s) return "-";
    try {
      return new Date(s).toLocaleString("sv-SE");
    } catch { return s; }
  };

  const formatDateFull = (s?: string) => {
    if (!s) return "-";
    try {
      const d = new Date(s);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}  ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}  `;
    } catch { return s; }
  };

  const getStatusColor = (status: string) => {
    if (status === "pending") return "bg-yellow-600 text-white";
    if (status === "approved") return "bg-green-600 text-white";
    if (status === "rejected") return "bg-red-600 text-white";
    return "bg-gray-500 text-white";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e] text-white">
        <div>Loading audit trail...</div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#1e1e1e] text-[#cccccc]">
      <div className="bg-[#252526] border-b border-[#3c3c3c] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Godkännandeshistorik</h1>
            <p className="text-sm text-[#999] mt-1">Översikt över alla AI-anpassningsförslag</p>
          </div>
          <button onClick={fetchPendingChanges} className="px-4 py-2 bg-[#ea580c] hover:bg-[#d45309] rounded text-white text-sm">
            Uppdatera
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Sök (alla fält)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-2 rounded text-sm ${filter === "all" ? "bg-[#ea580c] text-white" : "bg-[#252526] text-[#858585] hover:text-white"}`}
            >
              Alla ({changes.length})
            </button>
            <button
              onClick={() => setFilter("approved")}
              className={`px-3 py-2 rounded text-sm ${filter === "approved" ? "bg-[#ea580c] text-white" : "bg-[#252526] text-[#858585] hover:text-white"}`}
            >
              Godkända ({changes.filter(c => c.status === "approved").length})
            </button>
            <button
              onClick={() => setFilter("rejected")}
              className={`px-3 py-2 rounded text-sm ${filter === "rejected" ? "bg-[#ea580c] text-white" : "bg-[#252526] text-[#858585] hover:text-white"}`}
            >
              Avvisade ({changes.filter(c => c.status === "rejected").length})
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {filterChanges(changes).map((ch) => {
            const statusClass = getStatusColor(ch.status).split(" ")[0];
            const proposed: any = {};
            try { proposed = JSON.parse(ch.proposed_data || "{}"); } catch {}
            const current: any = null;
            try { current = ch.current_data ? JSON.parse(ch.current_data) : null; } catch {}
            const assignedUser = (() => {
              if (!ch.assigned_to) return "AI";
              const u = changes.find(c => c.id === ch.assigned_to);
              return u ? u.suggested_by : `User ${ch.assigned_to?.slice(0, 8)}`;
            })();

            return (
              <div key={ch.id} className={`bg-[#252526] border-l-4 border-${statusClass} bg-opacity-10 relative overflow-hidden`}>
                {/* Status indicator */}
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusClass}`}>
                    {ch.status === "pending" && "Väntar"}
                    {ch.status === "approved" && "Godkänd"}
                    {ch.status === "rejected" && "Avvisad"}
                  </span>
                </div>

                <div className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-xs bg-[#3c3c3c] text-white font-medium">
                          {getChangeTypeLabel(ch.change_type)}
                        </span>
                        {ch.target_table && (
                          <span className="px-2 py-0.5 rounded text-xs bg-blue-900/30 text-blue-400">
                            {ch.target_table.replace("_", " ")}
                          </span>
                        )}
                        {ch.target_id && (
                          <span className="text-xs text-[#585858]">{ch.target_id}</span>
                        )}
                        {ch.suggested_by && (
                          <span className="text-xs text-[#585858]">
                            {ch.suggested_by === "ai" && "🤖 AI"}
                            {ch.suggested_by === "agent" && "⚙️ Agent"}
                          </span>
                        )}
                        <span className="text-xs text-[#777]">{formatDateFull(ch.created_at)}</span>
                      </div>

                      <p className="text-white text-sm font-medium mb-2">{ch.summary}</p>

                      <p className="text-xs text-[#777] mb-2">
                        {ch.assigned_to && !ch.approved_at && !ch.rejected_at && `Tilldelad ${assignedUser}`}
                        {ch.approved_at && !ch.rejected_at && `Godkänd ${formatDate(ch.approved_at)}`}
                        {ch.rejected_at && ch.rejected_reason && `Avvisad ${formatDate(ch.rejected_at)}: ${ch.rejected_reason}`}
                      </p>

                      {/* Diff view */}
                      {(ch.current_data || ch.proposed_data) && (
                        <div className="mt-3">
                          <div className="text-xs font-semibold text-[#585858] mb-2 uppercase">{current && proposed ? "Diff" : "Data"}</div>
                          <div className="grid gap-3">
                            {current && (
                              <div>
                                <div className="text-xs text-[#858585] mb-1">Aktuell status</div>
                                <pre className="bg-[#1e1e1e] p-3 rounded text-xs text-[#999] overflow-x-auto max-h-48 overflow-y-auto">{JSON.stringify(current, null, 2)}</pre>
                              </div>
                            )}
                            {proposed && (
                              <div>
                                <div className="text-xs text-[#858585] mb-1">Foreslagen status</div>
                                <pre className="bg-[#1e1e1e] p-3 rounded text-xs text-[#ea580c] bg-opacity-10 overflow-x-auto max-h-48 overflow-y-auto">{JSON.stringify(proposed, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {filterChanges(changes).length === 0 && (
            <div className="text-center text-[#585858] py-12 bg-[#1e1e1e] rounded">
              Inga post
            </div>
          )}
        </div>
      </div>
    </div>
  );
}