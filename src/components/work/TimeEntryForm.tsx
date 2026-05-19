import { useState } from "react";
import { CheckCircle, XCircle, Clock } from "lucide-react";

interface TimeEntryFormProps {
  onSubmit: (entry: { date: string; hours: number; project: string; notes: string }) => void;
  onCancel: () => void;
}

export function TimeEntryForm({ onSubmit, onCancel }: TimeEntryFormProps) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [hours, setHours] = useState("");
  const [project, setProject] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hours && project) {
      onSubmit({
        date,
        hours: parseFloat(hours),
        project,
        notes,
      });
      setHours("");
      setProject("");
      setNotes("");
    }
  };

  return (
    <div className="time-entry-form">
      <h3>Submit Time Entry</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Hours</label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            max="24"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="8"
            required
          />
        </div>
        <div className="form-group">
          <label>Project</label>
          <input
            type="text"
            value={project}
            onChange={(e) => setProject(e.target.value)}
            placeholder="Project name"
            required
          />
        </div>
        <div className="form-group">
          <label>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you work on?"
            rows={3}
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-primary">
            <CheckCircle size={16} /> Submit
          </button>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            <XCircle size={16} /> Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
