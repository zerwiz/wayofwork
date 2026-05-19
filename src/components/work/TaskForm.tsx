import { useState } from "react";
import { CheckCircle, Clock } from "lucide-react";

interface TaskFormProps {
  onSubmit: (task: { title: string; assignedTo: string; deadline: string; estimatedHours?: number }) => void;
  onCancel: () => void;
  workers: Array<{ id: string; name: string }>;
}

export function TaskForm({ onSubmit, onCancel, workers }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [deadline, setDeadline] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title && assignedTo && deadline) {
      onSubmit({
        title,
        assignedTo,
        deadline,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
      });
      setTitle("");
      setAssignedTo("");
      setDeadline("");
      setEstimatedHours("");
    }
  };

  return (
    <div className="task-form">
      <h3>Create New Task</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Task Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter task description"
            required
          />
        </div>
        <div className="form-group">
          <label>Assign To</label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            required
          >
            <option value="">Select worker...</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Deadline</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Estimated Hours (optional)</label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(e.target.value)}
            placeholder="8"
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-primary">
            <CheckCircle size={16} /> Create Task
          </button>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
