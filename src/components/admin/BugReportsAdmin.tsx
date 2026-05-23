import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle, Clock, Bug, Search, ExternalLink, ChevronDown, ChevronUp, MessageSquare, Flag } from "lucide-react";

const STATUSES = ["pending", "in-review", "fixed", "closed"] as const;
const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  "in-review": "In Review",
  fixed: "Fixed",
  closed: "Closed",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-400",
  "in-review": "text-blue-400",
  fixed: "text-green-400",
  closed: "text-[#858585]",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400",
  high: "bg-orange-500/20 text-orange-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  low: "bg-blue-500/20 text-blue-400",
};

interface BugReport {
  id: string;
  user_id: string;
  username: string;
  submitter_name: string;
  title: string;
  category: string;
  severity: string;
  description: string;
  expected_behavior: string | null;
  actual_behavior: string | null;
  steps_to_reproduce: string;
  environment: string;
  screenshots: string;
  reproduction_rate: string;
  is_security_issue: number;
  is_duplicate_of: string | null;
  status: string;
  assigned_to: string | null;
  status_reason: string | null;
  comments: string;
  created_at: string;
  updated_at: string;
  labels: string;
  tenant_id: string;
}

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("wop_token")}` };
}

export default function BugReportsAdmin() {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BugReport | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/bug-reports", { headers: authHeaders() });
      if (res.ok) setReports(await res.json());
    } catch (e) {
      console.error("Failed to fetch bug reports:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const updateStatus = async (id: string, status: string, reason?: string) => {
    try {
      await fetch(`/api/admin/bug-reports/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ status, status_reason: reason || null }),
      });
      fetchReports();
    } catch (e) {
      console.error("Failed to update status:", e);
    }
  };

  const openDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/bug-reports/${id}`, { headers: authHeaders() });
      if (res.ok) setSelected(await res.json());
    } catch (e) {
      console.error("Failed to fetch detail:", e);
    }
  };

  const filtered = reports.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.username?.toLowerCase().includes(q);
    }
    return true;
  });

  if (selected) {
    return (
      <DetailView
        report={selected}
        onBack={() => setSelected(null)}
        onStatusChange={updateStatus}
      />
    );
  }

  const pendingCount = reports.filter((r) => r.status === "pending").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Bug Reports</h2>
          <p className="text-sm text-[#858585] mt-1">
            {reports.length} total{pendingCount > 0 ? `, ${pendingCount} pending` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#858585]" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#858585] focus:outline-none focus:border-[#ea580c]"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {["all", ...STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              statusFilter === s
                ? "bg-[#ea580c] text-white"
                : "bg-[#3c3c3c] text-[#858585] hover:text-[#cccccc]"
            }`}
          >
            {s === "all" ? "All" : STATUS_LABELS[s] || s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-[#858585]">Loading...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Bug size={32} className="mx-auto mb-2 text-[#858585]" />
            <p className="text-[#858585]">No bug reports found</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="bg-[#252526] border border-[#3c3c3c] rounded-lg overflow-hidden"
            >
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-[#2d2d2d] transition-colors"
                onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
              >
                <span className={`shrink-0 ${r.is_security_issue ? "text-red-400" : STATUS_COLORS[r.status] || ""}`}>
                  {r.is_security_issue ? <AlertCircle size={16} /> : r.status === "pending" ? <Clock size={16} /> : r.status === "in-review" ? <Search size={16} /> : r.status === "fixed" ? <CheckCircle size={16} /> : <CheckCircle size={16} />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-[#cccccc] truncate">{r.title}</p>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${SEVERITY_COLORS[r.severity] || "bg-[#3c3c3c] text-[#858585]"}`}>
                      {r.severity}
                    </span>
                    {r.is_security_issue ? (
                      <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-red-500/20 text-red-400">
                        SECURITY
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-[#858585] mt-0.5">
                    {r.submitter_name || r.username} &middot; {new Date(r.created_at).toLocaleString("sv-SE")}
                  </p>
                </div>
                <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status] || ""} bg-[#3c3c3c]`}>
                  {STATUS_LABELS[r.status] || r.status}
                </span>
                {expandedId === r.id ? <ChevronUp size={14} className="shrink-0 text-[#858585]" /> : <ChevronDown size={14} className="shrink-0 text-[#858585]" />}
              </div>
              {expandedId === r.id ? (
                <div className="border-t border-[#3c3c3c] p-4 space-y-4">
                  <p className="text-sm text-[#cccccc]">{r.description}</p>
                  <div className="flex gap-2 flex-wrap">
                    {STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => updateStatus(r.id, s)}
                        disabled={r.status === s}
                        className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                          r.status === s
                            ? "bg-[#ea580c] text-white cursor-not-allowed"
                            : "bg-[#3c3c3c] text-[#858585] hover:text-[#cccccc]"
                        }`}
                      >
                        Mark {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => openDetail(r.id)}
                    className="inline-flex items-center gap-1 text-xs text-[#ea580c] hover:underline"
                  >
                    <ExternalLink size={12} /> Open full detail
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailView({
  report,
  onBack,
  onStatusChange,
}: {
  report: BugReport;
  onBack: () => void;
  onStatusChange: (id: string, status: string, reason?: string) => void;
}) {
  const [statusReason, setStatusReason] = useState("");

  const env = typeof report.environment === "string" ? (() => { try { return JSON.parse(report.environment); } catch { return {}; } })() : report.environment || {};
  const steps = typeof report.steps_to_reproduce === "string" ? (() => { try { return JSON.parse(report.steps_to_reproduce); } catch { return []; } })() : report.steps_to_reproduce || [];
  const envEntries = typeof env === "object" && !Array.isArray(env) ? Object.entries(env) : [];

  return (
    <div>
      <button
        onClick={onBack}
        className="text-sm text-[#ea580c] hover:underline mb-4 inline-flex items-center gap-1"
      >
        &larr; Back to list
      </button>

      <div className="bg-[#252526] border border-[#3c3c3c] rounded-lg p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{report.title}</h2>
            <p className="text-sm text-[#858585] mt-1">
              by {report.submitter_name || report.username} &middot; {new Date(report.created_at).toLocaleString("sv-SE")}
            </p>
          </div>
          <span className={`rounded px-2 py-1 text-xs font-bold ${STATUS_COLORS[report.status] || ""} bg-[#3c3c3c]`}>
            {STATUS_LABELS[report.status] || report.status}
          </span>
        </div>

        <div className="flex gap-2 flex-wrap">
          <span className={`rounded px-2 py-1 text-xs font-medium ${SEVERITY_COLORS[report.severity] || "bg-[#3c3c3c] text-[#858585]"}`}>
            {report.severity}
          </span>
          <span className="rounded px-2 py-1 text-xs font-medium bg-[#3c3c3c] text-[#858585]">
            {report.category}
          </span>
          {report.is_duplicate_of ? (
            <span className="rounded px-2 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-400">
              Duplicate of {report.is_duplicate_of}
            </span>
          ) : null}
        </div>

        <div>
          <h3 className="text-sm font-bold text-[#cccccc] mb-2">Description</h3>
          <p className="text-sm text-[#cccccc] whitespace-pre-wrap">{report.description}</p>
        </div>

        {report.expected_behavior ? (
          <div>
            <h3 className="text-sm font-bold text-[#cccccc] mb-2">Expected Behavior</h3>
            <p className="text-sm text-[#cccccc]">{report.expected_behavior}</p>
          </div>
        ) : null}

        {report.actual_behavior ? (
          <div>
            <h3 className="text-sm font-bold text-[#cccccc] mb-2">Actual Behavior</h3>
            <p className="text-sm text-[#cccccc]">{report.actual_behavior}</p>
          </div>
        ) : null}

        {steps.length > 0 ? (
          <div>
            <h3 className="text-sm font-bold text-[#cccccc] mb-2">Steps to Reproduce</h3>
            <ol className="list-decimal list-inside space-y-1">
              {steps.map((s: string, i: number) => (
                <li key={i} className="text-sm text-[#cccccc]">{s}</li>
              ))}
            </ol>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-4">
          {envEntries.map(([key, val]) => (
            <div key={key}>
              <span className="text-xs text-[#858585] font-medium uppercase">{key}</span>
              <p className="text-sm text-[#cccccc]">{String(val)}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-[#3c3c3c] pt-4">
          <h3 className="text-sm font-bold text-[#cccccc] mb-3">Update Status</h3>
          <div className="flex gap-2 flex-wrap">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => { onStatusChange(report.id, s, statusReason); setStatusReason(""); }}
                disabled={report.status === s}
                className={`px-4 py-2 rounded text-sm font-bold transition-colors ${
                  report.status === s
                    ? "bg-[#ea580c] text-white cursor-not-allowed"
                    : "bg-[#3c3c3c] text-[#858585] hover:text-[#cccccc]"
                }`}
              >
                {report.status === s ? `✓ ${STATUS_LABELS[s]}` : `Mark ${STATUS_LABELS[s]}`}
              </button>
            ))}
          </div>
          <textarea
            placeholder="Status reason / comment (optional)..."
            value={statusReason}
            onChange={(e) => setStatusReason(e.target.value)}
            className="mt-3 w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-sm text-white placeholder-[#858585] h-20"
          />
        </div>
      </div>
    </div>
  );
}
