import { useState, useEffect, useCallback } from "react";
import { Building2, CheckCircle, ClipboardCheck, Clock, DollarSign, Download, MessageSquare, Play, ShieldCheck, Wallet, XCircle } from "lucide-react";
import { registerClawUiModule, type ClawUiModuleContext } from "./clawUiModules";
import { getTickets, reviewTicket, getApprovedTickets, getTicketStatusReport, getTimeSessions, getProjectBudget } from "../hooks/useTicketApi";

const cardBase = "rounded-xl border p-5 shadow-sm transition-all";
const darkCard = `${cardBase} border-[#3c3c3c] bg-[#252526] text-[#cccccc]`;
const lightCard = `${cardBase} border-[#e5e5e5] bg-white text-[#333333]`;

const SectionHeader = ({ title, icon: Icon, dark }: { title: string, icon: any, dark: boolean }) => (
  <div className="mb-4 flex items-center gap-2">
    <Icon size={18} className="text-[#ea580c]" />
    <h3 className={`text-xs font-bold uppercase tracking-wider ${dark ? "text-[#858585]" : "text-[#666]"}`}>
      {title}
    </h3>
  </div>
);

const ActionBtn = ({ label, icon: Icon, onClick, dark }: { label: string, icon: any, onClick: () => void, dark: boolean }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
      dark ? "bg-[#3c3c3c] text-[#cccccc] hover:bg-[#4a4a4a]" : "bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb]"
    }`}
  >
    <Icon size={14} />
    {label}
  </button>
);

const StatusBadge = ({ status, dark }: { status: string, dark: boolean }) => {
  const colors: Record<string, string> = {
    draft: "bg-yellow-500/20 text-yellow-400",
    pending_review: "bg-blue-500/20 text-blue-400",
    pending_approval: "bg-purple-500/20 text-purple-400",
    approved: "bg-green-500/20 text-green-400",
    rejected: "bg-red-500/20 text-red-400",
    invoiced: "bg-emerald-500/20 text-emerald-400",
  };
  const labels: Record<string, string> = {
    draft: "Draft",
    pending_review: "Awaiting Review",
    pending_approval: "Awaiting Client",
    approved: "Approved",
    rejected: "Rejected",
    invoiced: "Invoiced",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${colors[status] || ""} ${dark ? "" : ""}`}>
      {labels[status] || status}
    </span>
  );
};

// --- REVIEW MODULE ---
registerClawUiModule({
  id: "review",
  label: "Review",
  title: "Ticket Approval Queue",
  icon: ClipboardCheck,
  order: 40,
  render: ({ appearanceDark }) => {
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusReport, setStatusReport] = useState<any>(null);

    const fetchData = useCallback(async () => {
      try {
        const [t, r] = await Promise.all([getTickets(), getTicketStatusReport()]);
        setTickets(t.filter((tk: any) => tk.status === "pending_review"));
        setStatusReport(r);
      } catch { /* ignore */ }
      setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleApprove = async (id: string) => {
      await reviewTicket(id, true, undefined, true);
      fetchData();
    };

    const handleReject = async (id: string) => {
      await reviewTicket(id, false, "Returned for revision");
      fetchData();
    };

    return (
      <div className="flex flex-1 flex-col gap-6 p-6 overflow-y-auto">
        <div className={appearanceDark ? darkCard : lightCard}>
          <SectionHeader title={`Pending Review (${tickets.length})`} icon={ClipboardCheck} dark={appearanceDark} />
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm opacity-50">Loading...</div>
          ) : tickets.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm opacity-50">All clear. No tickets awaiting leader review.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {tickets.map((t: any) => (
                <div key={t.id} className={`flex items-center justify-between rounded-lg p-3 ${appearanceDark ? "bg-[#1e1e1e]" : "bg-gray-50"}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{t.title}</span>
                      <StatusBadge status={t.status} dark={appearanceDark} />
                    </div>
                    {t.description && <p className="text-[11px] opacity-60 mt-0.5 truncate">{t.description}</p>}
                    <p className="text-[10px] opacity-40 mt-0.5">Category: {t.category} | Priority: {t.priority}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <button onClick={() => handleApprove(t.id)} className="rounded-lg p-2 text-green-500 hover:bg-green-500/10 transition-colors" title="Approve">
                      <CheckCircle size={18} />
                    </button>
                    <button onClick={() => handleReject(t.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-500/10 transition-colors" title="Reject">
                      <XCircle size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={appearanceDark ? darkCard : lightCard}>
            <div className="text-xs opacity-60">Total Tickets</div>
            <div className="text-2xl font-bold">{statusReport?.total ?? 0}</div>
          </div>
          <div className={appearanceDark ? darkCard : lightCard}>
            <div className="text-xs opacity-60">Pending Review</div>
            <div className="text-2xl font-bold text-blue-400">{statusReport?.counts?.find((c: any) => c.status === "pending_review")?.count ?? 0}</div>
          </div>
          <div className={appearanceDark ? darkCard : lightCard}>
            <div className="text-xs opacity-60">Approved</div>
            <div className="text-2xl font-bold text-green-400">{statusReport?.counts?.find((c: any) => c.status === "approved")?.count ?? 0}</div>
          </div>
          <div className={appearanceDark ? darkCard : lightCard}>
            <div className="text-xs opacity-60">Invoiced</div>
            <div className="text-2xl font-bold text-emerald-400">{statusReport?.counts?.find((c: any) => c.status === "invoiced")?.count ?? 0}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={appearanceDark ? darkCard : lightCard}>
            <SectionHeader title="Communications" icon={MessageSquare} dark={appearanceDark} />
            <div className="flex flex-wrap gap-2">
              <ActionBtn label="Message Worker" icon={MessageSquare} onClick={() => {}} dark={appearanceDark} />
              <ActionBtn label="Send to Client" icon={Play} onClick={() => {}} dark={appearanceDark} />
            </div>
          </div>
          <div className={appearanceDark ? darkCard : lightCard}>
            <SectionHeader title="Automations" icon={Play} dark={appearanceDark} />
            <div className="flex flex-wrap gap-2">
              <ActionBtn label="Sync with Budget" icon={Play} onClick={() => {}} dark={appearanceDark} />
              <ActionBtn label="Notify Overdue" icon={Play} onClick={() => {}} dark={appearanceDark} />
            </div>
          </div>
        </div>
      </div>
    );
  },
});

// --- FINANCIALS MODULE ---
registerClawUiModule({
  id: "financials",
  label: "Finance",
  title: "Project Budgets & Rates",
  icon: Wallet,
  order: 50,
  render: ({ appearanceDark }) => {
    const [budgets, setBudgets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      getProjectBudget().then(setBudgets).catch(() => {}).finally(() => setLoading(false));
    }, []);

    const totalHours = budgets.reduce((s: number, p: any) => s + (p.total_hours ?? 0), 0);

    return (
      <div className="flex flex-1 flex-col gap-6 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={appearanceDark ? darkCard : lightCard}>
            <SectionHeader title="Active Projects" icon={Wallet} dark={appearanceDark} />
            <div className="text-2xl font-bold text-[#ea580c]">{loading ? "..." : budgets.length}</div>
            <div className="text-[10px] opacity-60">Active tracked projects</div>
          </div>
          <div className={appearanceDark ? darkCard : lightCard}>
            <SectionHeader title="Total Hours" icon={Clock} dark={appearanceDark} />
            <div className="text-2xl font-bold">{loading ? "..." : totalHours.toFixed(1)}</div>
            <div className="text-[10px] opacity-60">Across all projects</div>
          </div>
          <div className={appearanceDark ? darkCard : lightCard}>
            <SectionHeader title="Avg Cost" icon={DollarSign} dark={appearanceDark} />
            <div className="text-2xl font-bold">--</div>
            <div className="text-[10px] opacity-60">Set hourly rates for calculation</div>
          </div>
        </div>

        {!loading && budgets.length > 0 && (
          <div className={appearanceDark ? darkCard : lightCard}>
            <SectionHeader title="Project Breakdown" icon={Wallet} dark={appearanceDark} />
            <div className="flex flex-col gap-2">
              {budgets.map((p: any) => (
                <div key={p.project_id} className={`flex items-center justify-between rounded-lg p-3 ${appearanceDark ? "bg-[#1e1e1e]" : "bg-gray-50"}`}>
                  <span className="text-sm">{p.name}</span>
                  <span className="text-sm font-semibold">{p.total_hours.toFixed(1)}h</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={appearanceDark ? darkCard : lightCard}>
            <SectionHeader title="Communications" icon={MessageSquare} dark={appearanceDark} />
            <ActionBtn label="Request Budget Approval" icon={MessageSquare} onClick={() => {}} dark={appearanceDark} />
          </div>
          <div className={appearanceDark ? darkCard : lightCard}>
            <SectionHeader title="Automations" icon={Play} dark={appearanceDark} />
            <ActionBtn label="Recalculate Totals" icon={Play} onClick={() => {}} dark={appearanceDark} />
          </div>
        </div>
      </div>
    );
  },
});

// --- OFFICE MODULE ---
registerClawUiModule({
  id: "office",
  label: "Office",
  title: "Invoicing & Integration",
  icon: Building2,
  order: 60,
  render: ({ appearanceDark }) => {
    const [approved, setApproved] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      getApprovedTickets().then(setApproved).catch(() => {}).finally(() => setLoading(false));
    }, []);

    return (
      <div className="flex flex-1 flex-col gap-6 p-6 overflow-y-auto">
        <div className={appearanceDark ? darkCard : lightCard}>
          <SectionHeader title={`Approved for Invoicing (${approved.length})`} icon={Building2} dark={appearanceDark} />
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm opacity-50">Loading...</div>
          ) : approved.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm opacity-50">Select approved tickets to generate underlag.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {approved.map((t: any) => (
                <div key={t.id} className={`flex items-center justify-between rounded-lg p-3 ${appearanceDark ? "bg-[#1e1e1e]" : "bg-gray-50"}`}>
                  <div>
                    <span className="text-sm">{t.title}</span>
                    <span className="text-[10px] opacity-40 ml-2">{t.category}</span>
                  </div>
                  <StatusBadge status={t.status} dark={appearanceDark} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={appearanceDark ? darkCard : lightCard}>
            <SectionHeader title="Sync Actions" icon={Play} dark={appearanceDark} />
            <div className="flex flex-wrap gap-2">
              <ActionBtn label="Push to Fortnox" icon={Play} onClick={() => {}} dark={appearanceDark} />
              <ActionBtn label="Push to Visma" icon={Play} onClick={() => {}} dark={appearanceDark} />
            </div>
          </div>
          <div className={appearanceDark ? darkCard : lightCard}>
            <SectionHeader title="Reporting" icon={MessageSquare} dark={appearanceDark} />
            <ActionBtn label="Email Summary to Client" icon={MessageSquare} onClick={() => {}} dark={appearanceDark} />
          </div>
        </div>
      </div>
    );
  },
});

// --- COMPLIANCE MODULE ---
registerClawUiModule({
  id: "compliance",
  label: "Audit",
  title: "Ledger & Compliance",
  icon: ShieldCheck,
  order: 70,
  render: ({ appearanceDark }) => {
    const [activeSessions, setActiveSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      getTimeSessions().then(setActiveSessions).catch(() => {}).finally(() => setLoading(false));
    }, []);

    return (
      <div className="flex flex-1 flex-col gap-6 p-6 overflow-y-auto">
        <div className={appearanceDark ? darkCard : lightCard}>
          <SectionHeader title="Staff Ledger (Personalliggare)" icon={ShieldCheck} dark={appearanceDark} />
          <div className={`flex items-center justify-center py-8 text-sm ${loading ? "opacity-50" : ""}`}>
            {loading ? "Loading..." : `Current site status: ${activeSessions.length} workers checked in.`}
          </div>
          {activeSessions.length > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              {activeSessions.map((s: any) => (
                <div key={s.id} className={`flex items-center justify-between rounded-lg p-2 ${appearanceDark ? "bg-[#1e1e1e]" : "bg-gray-50"}`}>
                  <span className="text-xs">{s.username || s.user_id}</span>
                  <span className="text-[10px] opacity-60">Since {new Date(s.check_in).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={appearanceDark ? darkCard : lightCard}>
            <SectionHeader title="Legal Exports" icon={Download} dark={appearanceDark} />
            <div className="flex flex-wrap gap-2">
              <ActionBtn label="Export Skatteverket XML" icon={Download} onClick={() => {}} dark={appearanceDark} />
              <ActionBtn label="Generate KMA Report" icon={Download} onClick={() => {}} dark={appearanceDark} />
            </div>
          </div>
          <div className={appearanceDark ? darkCard : lightCard}>
            <SectionHeader title="Direct Alerts" icon={MessageSquare} dark={appearanceDark} />
            <ActionBtn label="Alert Missing Check-out" icon={MessageSquare} onClick={() => {}} dark={appearanceDark} />
          </div>
        </div>
      </div>
    );
  },
});
