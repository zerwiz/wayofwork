import { useState, useEffect } from "react";
import { 
  History, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  Shield, 
  AlertCircle,
  FileText,
  User,
  ArrowRight
} from "lucide-react";
import { useTranslation } from "../contexts/LanguageContext";

interface AuditEntry {
  id: string;
  tenant_id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  summary: string;
  ip_address: string;
  created_at: string;
  username: string;
  full_name: string;
}

interface ChangeEntry {
  id: string;
  tenant_id: string;
  change_type: string;
  status: string;
  target_table: string;
  target_id: string;
  proposed_data: string;
  current_data: string;
  summary: string;
  suggested_by: string;
  created_at: string;
}

export function AuditTrailPage() {
  const { t } = useTranslation();
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [changes, setChanges] = useState<ChangeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"logs" | "changes">("logs");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("wop_token");
      const [logsRes, changesRes] = await Promise.all([
        fetch("/api/admin/audit-logs", { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch("/api/admin/pending-changes", { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (!logsRes.ok || !changesRes.ok) throw new Error("Failed to fetch audit data");

      const [logsData, changesData] = await Promise.all([
        logsRes.json(),
        changesRes.json()
      ]);

      setAuditLogs(logsData);
      setChanges(changesData);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = (list: AuditEntry[]) => {
    if (!searchQuery) return list;
    const lower = searchQuery.toLowerCase();
    return list.filter(l => 
      l.summary.toLowerCase().includes(lower) ||
      l.username.toLowerCase().includes(lower) ||
      l.resource_type.toLowerCase().includes(lower)
    );
  };

  const filterChanges = (list: ChangeEntry[]) => {
    if (!searchQuery) return list;
    const lower = searchQuery.toLowerCase();
    return list.filter(c => 
      c.summary.toLowerCase().includes(lower) ||
      c.target_table.toLowerCase().includes(lower) ||
      (c.proposed_data && JSON.stringify(c.proposed_data).toLowerCase().includes(lower)) ||
      (c.current_data && JSON.stringify(c.current_data).toLowerCase().includes(lower))
    );
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE": return "text-emerald-400 bg-emerald-500/10";
      case "UPDATE": return "text-blue-400 bg-blue-500/10";
      case "DELETE": return "text-red-400 bg-red-500/10";
      case "ACCESS_DENIED": return "text-red-500 bg-red-500/20 animate-pulse";
      case "VIEW_ECONOMICS": return "text-amber-400 bg-amber-500/10";
      default: return "text-gray-400 bg-gray-500/10";
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-[#cccccc]">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#3c3c3c] bg-[#252526]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#ea580c]/20">
            <History className="text-[#ea580c]" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white uppercase tracking-tight">Audit Trail</h1>
            <p className="text-xs text-[#858585]">System logs & change history</p>
          </div>
        </div>
        <div className="flex bg-[#1e1e1e] p-1 rounded-xl border border-[#3c3c3c]">
          <button 
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === "logs" ? "bg-[#3c3c3c] text-white shadow-sm" : "text-[#858585] hover:text-[#cccccc]"}`}
          >
            System Logs
          </button>
          <button 
            onClick={() => setActiveTab("changes")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === "changes" ? "bg-[#3c3c3c] text-white shadow-sm" : "text-[#858585] hover:text-[#cccccc]"}`}
          >
            Pending Changes
          </button>
        </div>
      </div>

      <div className="p-6 border-b border-[#3c3c3c] bg-[#1e1e1e]/50">
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#858585]" size={16} />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab === 'logs' ? 'system logs' : 'change suggestions'}...`}
            className="w-full pl-10 pr-4 py-2 bg-[#252526] border border-[#3c3c3c] rounded-xl text-sm focus:border-[#ea580c] outline-none transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-[#ea580c]/20 border-t-[#ea580c] rounded-full animate-spin mb-4" />
              <p className="text-sm text-[#858585]">Analyzing audit trail...</p>
            </div>
          ) : activeTab === "logs" ? (
            <div className="space-y-2">
              {filterLogs(auditLogs).map((log) => (
                <div key={log.id} className="flex items-center gap-4 p-3 bg-[#252526] border border-[#3c3c3c] rounded-xl hover:border-[#454545] transition-all group">
                  <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 w-24 text-center ${getActionColor(log.action)}`}>
                    {log.action.replace('_', ' ')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-[#cccccc] font-medium leading-tight">{log.summary}</p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-[#858585]">
                      <span className="flex items-center gap-1 group-hover:text-[#ea580c] transition-colors"><User size={12} />{log.full_name || log.username}</span>
                      <span className="flex items-center gap-1"><Shield size={12} />{log.resource_type}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-mono text-[#555555]">{new Date(log.created_at).toLocaleString()}</p>
                    <p className="text-[10px] text-[#444444] font-mono uppercase">{log.ip_address}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filterChanges(changes).map((ch) => {
                const statusClass = 
                  ch.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                  ch.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                  'bg-red-500/10 text-red-400';
                
                let proposed: any = {};
                try { proposed = JSON.parse(ch.proposed_data || "{}"); } catch {}
                let current: any = null;
                try { current = ch.current_data ? JSON.parse(ch.current_data) : null; } catch {}

                const assignedUser = (() => {
                  if (!ch.suggested_by) return "AI Agent";
                  return ch.suggested_by;
                })();

                return (
                  <div key={ch.id} className="bg-[#252526] border border-[#3c3c3c] rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-[#3c3c3c] flex items-start justify-between bg-[#1e1e1e]/30">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#333333] rounded-lg text-[#ea580c]">
                          <FileText size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-white text-[14px]">{ch.summary}</h4>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusClass}`}>
                              {ch.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#858585] mt-0.5">
                            Table: <span className="text-[#9cdcfe] font-mono uppercase">{ch.target_table}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-mono text-[#555555]">{new Date(ch.created_at).toLocaleString()}</p>
                        <p className="text-[11px] text-[#858585] mt-1 italic">Suggested by {assignedUser}</p>
                      </div>
                    </div>
                    
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(ch.current_data || ch.proposed_data) && (
                        <div className="col-span-2">
                          <div className="text-[11px] font-bold text-[#585858] mb-2 uppercase flex items-center gap-2">
                            {current ? "Reviewing Change" : "Proposed Data"}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {current && (
                              <div className="space-y-1.5">
                                <div className="text-[10px] text-[#858585] font-mono uppercase tracking-widest">Current</div>
                                <pre className="bg-red-500/5 p-3 rounded-xl border border-red-500/10 text-xs text-red-200/60 overflow-x-auto max-h-48 overflow-y-auto font-mono">{JSON.stringify(current, null, 2)}</pre>
                              </div>
                            )}
                            {proposed && (
                              <div className="space-y-1.5">
                                <div className="text-[10px] text-[#858585] font-mono uppercase tracking-widest">Proposed</div>
                                <pre className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 text-xs text-emerald-400 overflow-x-auto max-h-48 overflow-y-auto font-mono">{JSON.stringify(proposed, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {ch.status === 'pending' && (
                      <div className="px-4 py-3 bg-[#1e1e1e]/20 border-t border-[#3c3c3c] flex justify-end gap-2">
                        <button className="px-4 py-1.5 bg-[#f14c4c]/10 text-red-400 hover:bg-[#f14c4c]/20 text-[12px] font-bold rounded-lg transition-all">
                          Reject
                        </button>
                        <button className="px-4 py-1.5 bg-[#238636] text-white hover:bg-[#2ea043] text-[12px] font-bold rounded-lg transition-all shadow-md active:scale-95">
                          Approve Changes
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
