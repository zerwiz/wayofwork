import { useState } from "react";

interface EvaluationChecklist {
  clearObjectives: boolean;
  measurableOutcomes: boolean;
  timelineRealistic: boolean;
  resourceAllocation: boolean;
}

interface DocumentEvaluationProps {
  documentName: string;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onRequestChanges: (notes: string) => void;
  onShare: (contactIds: string[]) => void;
}

export function DocumentEvaluationPanel({
  documentName,
  onApprove,
  onReject,
  onRequestChanges,
  onShare,
}: DocumentEvaluationProps) {
  const [status, setStatus] = useState<"draft" | "pending_review" | "approved" | "rejected">("draft");
  const [checklist, setChecklist] = useState<EvaluationChecklist>({
    clearObjectives: false,
    measurableOutcomes: false,
    timelineRealistic: false,
    resourceAllocation: false,
  });
  const [leaderNotes, setLeaderNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

  const allChecked = Object.values(checklist).every(Boolean);

  const handleApprove = () => {
    setStatus("approved");
    onApprove();
  };

  const handleReject = () => {
    if (!rejectReason) return;
    setStatus("rejected");
    onReject(rejectReason);
  };

  const handleRequestChanges = () => {
    if (!leaderNotes) return;
    setStatus("pending_review");
    onRequestChanges(leaderNotes);
  };

  return (
    <div className="h-full flex flex-col bg-[#252526] border-l border-[#3c3c3c]">
      {/* Header */}
      <div className="shrink-0 border-b border-[#3c3c3c] px-4 py-3">
        <h2 className="text-sm font-bold text-[#cccccc]">Document Evaluation</h2>
        <p className="mt-1 text-xs text-[#858585]">{documentName}</p>
      </div>

      {/* Status */}
      <div className="shrink-0 border-b border-[#3c3c3c] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`rounded px-2 py-1 text-xs ${
            status === "approved" ? "bg-green-900/30 text-green-400" :
            status === "rejected" ? "bg-red-900/30 text-red-400" :
            status === "pending_review" ? "bg-yellow-900/30 text-yellow-400" :
            "bg-[#3c3c3c] text-[#858585]"
          }`}>
            {status === "approved" && "✅ Approved"}
            {status === "rejected" && "❌ Rejected"}
            {status === "pending_review" && "📝 Pending Review"}
            {status === "draft" && "📄 Draft"}
          </span>
        </div>
      </div>

      {/* Checklist */}
      <div className="shrink-0 border-b border-[#3c3c3c] px-4 py-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#858585]">
          Review Checklist
        </h3>
        <div className="space-y-2">
          {Object.entries({
            clearObjectives: "Clear objectives",
            measurableOutcomes: "Measurable outcomes",
            timelineRealistic: "Timeline realistic",
            resourceAllocation: "Resource allocation",
          }).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checklist[key as keyof EvaluationChecklist]}
                onChange={(e) =>
                  setChecklist((prev) => ({ ...prev, [key]: e.target.checked }))
                }
                className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#ea580c] focus:ring-1 focus:ring-[#ea580c]"
              />
              <span className={`text-xs ${
                checklist[key as keyof EvaluationChecklist] ? "text-[#cccccc]" : "text-[#858585]"
              }`}>
                {label}
              </span>
            </label>
          ))}
          {allChecked && (
            <p className="text-xs text-green-400">✅ All checks passed</p>
          )}
        </div>
      </div>

      {/* Leader Notes */}
      <div className="shrink-0 border-b border-[#3c3c3c] px-4 py-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#858585]">
          Leader Notes
        </h3>
        <textarea
          value={leaderNotes}
          onChange={(e) => setLeaderNotes(e.target.value)}
          placeholder="Add evaluation notes..."
          rows={3}
          className="w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-xs text-[#cccccc] placeholder-[#585858] focus:border-[#ea580c] focus:outline-none resize-none"
        />
      </div>

      {/* Share with Workers */}
      <div className="shrink-0 border-b border-[#3c3c3c] px-4 py-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#858585]">
          Share with Workers
        </h3>
        <div className="space-y-1">
          {["John Doe (Developer)", "Jane Smith (Designer)", "Bob Wilson (QA)"].map((name, i) => (
            <label key={i} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedContacts.includes(`contact-${i}`)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedContacts((prev) => [...prev, `contact-${i}`]);
                  } else {
                    setSelectedContacts((prev) => prev.filter((id) => id !== `contact-${i}`));
                  }
                }}
                className="rounded border-[#3c3c3c] bg-[#1e1e1e] text-[#ea580c] focus:ring-1 focus:ring-[#ea580c]"
              />
              <span className="text-xs text-[#cccccc]">{name}</span>
            </label>
          ))}
        </div>
        {selectedContacts.length > 0 && (
          <button
            onClick={() => onShare(selectedContacts)}
            className="mt-2 w-full rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Send via WhatsApp ({selectedContacts.length})
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="mt-auto border-t border-[#3c3c3c] px-4 py-3 space-y-2">
        <button
          onClick={handleApprove}
          disabled={!allChecked}
          className="w-full rounded bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ✅ Approve Document
        </button>

        <button
          onClick={handleRequestChanges}
          disabled={!leaderNotes}
          className="w-full rounded bg-yellow-600 px-3 py-2 text-xs font-medium text-white hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📝 Request Changes
        </button>

        <div className="space-y-2">
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection..."
            className="w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-1.5 text-xs text-[#cccccc] placeholder-[#585858] focus:border-red-500 focus:outline-none"
          />
          <button
            onClick={handleReject}
            disabled={!rejectReason}
            className="w-full rounded bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ❌ Reject Document
          </button>
        </div>
      </div>
    </div>
  );
}
