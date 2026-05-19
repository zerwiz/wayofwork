import { useState } from "react";
import { CheckCircle, XCircle, Pencil } from "lucide-react";

interface TimeEntry {
  id: string;
  workerName: string;
  date: string;
  hours: number;
  project: string;
  status: "pending" | "approved" | "rejected";
  notes?: string;
}

interface LeaderActionsProps {
  entries: TimeEntry[];
  onApprove: (id: string, notes?: string) => void;
  onReject: (id: string, notes: string) => void;
  onBulkApprove: (ids: string[]) => void;
}

export function LeaderActions({ entries, onApprove, onReject, onBulkApprove }: LeaderActionsProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rejectNotes, setRejectNotes] = useState("");
  const [showBulkActions, setShowBulkActions] = useState(false);

  const pendingEntries = entries.filter((e) => e.status === "pending");

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkApprove = () => {
    if (selectedIds.length > 0) {
      onBulkApprove(selectedIds);
      setSelectedIds([]);
    }
  };

  return (
    <div className="leader-actions">
      <div className="leader-header">
        <h3>Leader Actions</h3>
        <button
          className="btn-secondary"
          onClick={() => setShowBulkActions(!showBulkActions)}
        >
          Bulk Actions ({pendingEntries.length} pending)
        </button>
      </div>

      {showBulkActions && (
        <div className="bulk-actions">
          <div className="bulk-header">
            <label>
              <input
                type="checkbox"
                checked={selectedIds.length === pendingEntries.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedIds(pendingEntries.map((e) => e.id));
                  } else {
                    setSelectedIds([]);
                  }
                }}
              />
              Select All
            </label>
            <button
              className="btn-primary"
              onClick={handleBulkApprove}
              disabled={selectedIds.length === 0}
            >
                <CheckCircle size={16} /> Approve Selected ({selectedIds.length})
            </button>
          </div>
        </div>
      )}

      <div className="entries-list">
        <h4>Pending Approvals</h4>
        {pendingEntries.map((entry) => (
          <div key={entry.id} className="entry-card">
            <div className="entry-select">
              <input
                type="checkbox"
                checked={selectedIds.includes(entry.id)}
                onChange={() => toggleSelect(entry.id)}
              />
            </div>
            <div className="entry-details">
              <span className="worker-name">{entry.workerName}</span>
              <span className="entry-date">{entry.date}</span>
              <span className="entry-hours">{entry.hours}h</span>
              <span className="entry-project">{entry.project}</span>
            </div>
            {entry.notes && (
              <div className="entry-notes">{entry.notes}</div>
            )}
            <div className="entry-actions">
              <button
                className="btn-approve"
                onClick={() => onApprove(entry.id)}
              >
              <CheckCircle size={16} /> Approve
              </button>
              <button
                className="btn-reject"
                onClick={() => {
                  const notes = prompt("Rejection reason:");
                  if (notes) onReject(entry.id, notes);
                }}
              >
                <XCircle size={16} /> Reject
              </button>
            </div>
          </div>
        ))}
        {pendingEntries.length === 0 && (
          <div className="empty-state">No pending entries</div>
        )}
      </div>
    </div>
  );
}
