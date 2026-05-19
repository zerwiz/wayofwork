import { useState } from "react";
import { CheckCircle, Clock, Pencil, Trash2, type LucideIcon } from "lucide-react";

interface Task {
  id: string;
  title: string;
  assignedTo: string;
  status: "draft" | "in_progress" | "complete" | "cancelled";
  deadline?: string;
  estimatedHours?: number;
  actualHours?: number;
}

interface TaskListProps {
  tasks: Task[];
  onUpdateStatus: (id: string, status: Task["status"]) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isLeader: boolean;
}

export function TaskList({ tasks, onUpdateStatus, onEdit, onDelete, isLeader }: TaskListProps) {
  const [filter, setFilter] = useState<Task["status"] | "all">("all");

  const filteredTasks = tasks.filter((t) => filter === "all" || t.status === filter);

  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "draft": return "#6b7280";
      case "in_progress": return "#3b82f6";
      case "complete": return "#22c55e";
      case "cancelled": return "#ef4444";
    }
  };

  return (
    <div className="task-list">
      <div className="task-header">
        <h3>Tasks</h3>
        <div className="filter-buttons">
          {["all", "draft", "in_progress", "complete", "cancelled"].map((f) => (
            <button
              key={f}
              className={filter === f ? "active" : ""}
              onClick={() => setFilter(f as Task["status"] | "all")}
            >
              {f.replace("_", " ")} ({tasks.filter((t) => f === "all" || t.status === f).length})
            </button>
          ))}
        </div>
      </div>
      <div className="tasks">
        {filteredTasks.map((task) => (
          <div key={task.id} className={`task-card status-${task.status}`}>
            <div className="task-info">
              <span className="task-title">{task.title}</span>
              <span className="task-assignee">Assigned to: {task.assignedTo}</span>
              {task.deadline && (
                <span className="task-deadline">
                  <Clock width={14} /> {new Date(task.deadline).toLocaleDateString()}
                </span>
              )}
              {task.estimatedHours && (
                <span className="task-hours">
                  Est: {task.estimatedHours}h | Actual: {task.actualHours || 0}h
                </span>
              )}
            </div>
            <div className="task-status">
              <span style={{ color: getStatusColor(task.status) }}>
                {task.status.replace("_", " ")}
              </span>
            </div>
            {isLeader && (
              <div className="task-actions">
                <button onClick={() => onEdit(task.id)}>
                  <Pencil size={16} />
                </button>
                <button onClick={() => onDelete(task.id)}>
                  <Trash2 size={16} />
                </button>
                {task.status !== "complete" && (
                  <button onClick={() => onUpdateStatus(task.id, "complete")}>
                    <CheckCircle size={16} /> Complete
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {filteredTasks.length === 0 && (
          <div className="empty-state">No tasks found</div>
        )}
      </div>
    </div>
  );
}
