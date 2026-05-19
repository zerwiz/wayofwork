import { useState } from "react";
import { CheckCircle, Clock, XCircle } from "lucide-react";

interface Worker {
  id: string;
  name: string;
  role: "worker" | "leader";
  totalHours: number;
  status: "active" | "inactive";
}

interface TeamBrowserProps {
  workers: Worker[];
  onSelectWorker: (workerId: string) => void;
  selectedWorkerId?: string;
}

export function TeamBrowser({ workers, onSelectWorker, selectedWorkerId }: TeamBrowserProps) {
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const filteredWorkers = workers.filter((w) => {
    if (filter === "active") return w.status === "active";
    if (filter === "inactive") return w.status === "inactive";
    return true;
  });

  return (
    <div className="team-browser">
      <div className="team-header">
        <h3>Team Browser</h3>
        <div className="filter-buttons">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All ({workers.length})
          </button>
          <button
            className={filter === "active" ? "active" : ""}
            onClick={() => setFilter("active")}
          >
            Active ({workers.filter((w) => w.status === "active").length})
          </button>
          <button
            className={filter === "inactive" ? "active" : ""}
            onClick={() => setFilter("inactive")}
          >
            Inactive ({workers.filter((w) => w.status === "inactive").length})
          </button>
        </div>
      </div>
      <div className="workers-list">
        {filteredWorkers.map((worker) => (
          <div
            key={worker.id}
            className={`worker-card ${selectedWorkerId === worker.id ? "selected" : ""}`}
            onClick={() => onSelectWorker(worker.id)}
          >
            <div className="worker-info">
              <span className="worker-name">{worker.name}</span>
              <span className={`worker-role ${worker.role}`}>{worker.role}</span>
            </div>
            <div className="worker-stats">
              <span className="hours">
                <Clock size={14} /> {worker.totalHours}h
              </span>
              <span className={`status ${worker.status}`}>
                {worker.status === "active" ? (
                  <CheckCircle size={14} />
                ) : (
                  <XCircle size={14} />
                )}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
