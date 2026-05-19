import { useState } from "react";
import { BarChart3, Users, Clock } from "lucide-react";

interface DashboardProps {
  workers: Array<{
    id: string;
    name: string;
    totalHours: number;
    tasksCompleted: number;
    status: "active" | "inactive";
  }>;
  timeEntries: Array<{
    workerName: string;
    hours: number;
    date: string;
  }>;
  tasks: Array<{
    status: string;
    assignedTo: string;
  }>;
}

export function TeamDashboard({ workers, timeEntries, tasks }: DashboardProps) {
  const [timeRange, setTimeRange] = useState<"week" | "month" | "all">("week");

  const totalHours = timeEntries.reduce((sum, e) => sum + e.hours, 0);
  const avgHours = workers.length > 0 ? totalHours / workers.length : 0;
  const completionRate = tasks.length > 0
    ? (tasks.filter(t => t.status === "complete").length / tasks.length) * 100
    : 0;

  return (
    <div className="team-dashboard">
      <div className="dashboard-header">
        <h3><BarChart3 size={20} /> Team Dashboard</h3>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="all">All Time</option>
        </select>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h4>Total Hours</h4>
          <span className="stat-number">{totalHours.toFixed(1)}h</span>
        </div>
        <div className="stat-card">
          <h4>Avg per Worker</h4>
          <span className="stat-number">{avgHours.toFixed(1)}h</span>
        </div>
        <div className="stat-card">
          <h4>Task Completion</h4>
          <span className="stat-number">{completionRate.toFixed(0)}%</span>
        </div>
        <div className="stat-card">
          <h4>Active Workers</h4>
          <span className="stat-number">
            {workers.filter(w => w.status === "active").length}/{workers.length}
          </span>
        </div>
      </div>

      <div className="dashboard-section">
        <h4><Users size={16} /> Top Performers</h4>
        <div className="performers-list">
          {workers
            .sort((a, b) => b.totalHours - a.totalHours)
            .slice(0, 5)
            .map((worker, idx) => (
              <div key={worker.id} className="performer-card">
                <span className="rank">#{idx + 1}</span>
                <span className="name">{worker.name}</span>
                <span className="hours">
                  <Clock size={14} /> {worker.totalHours}h
                </span>
              </div>
            ))}
        </div>
      </div>

      <div className="dashboard-section">
        <h4>Recent Activity</h4>
        <div className="activity-list">
          {timeEntries
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 10)
            .map((entry, idx) => (
              <div key={idx} className="activity-item">
                <span className="worker">{entry.workerName}</span>
                <span className="hours">{entry.hours}h</span>
                <span className="date">{new Date(entry.date).toLocaleDateString()}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
