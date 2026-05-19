import { useState } from "react";
import { Download, BarChart3 } from "lucide-react";

interface TimeReportProps {
  entries: Array<{
    workerName: string;
    date: string;
    hours: number;
    project: string;
    status: string;
  }>;
  onExportCSV: () => void;
  onGenerateReport: (startDate: string, endDate: string) => void;
}

export function TimeReport({ entries, onExportCSV, onGenerateReport }: TimeReportProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
  const byWorker = entries.reduce((acc, e) => {
    acc[e.workerName] = (acc[e.workerName] || 0) + e.hours;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="time-report">
      <div className="report-header">
        <h3><BarChart3 size={20} /> Time Report</h3>
        <button className="btn-primary" onClick={onExportCSV}>
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="report-filters">
        <div className="filter-group">
          <label>Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <button
          className="btn-secondary"
          onClick={() => onGenerateReport(startDate, endDate)}
        >
          Generate Report
        </button>
      </div>

      <div className="report-summary">
        <div className="summary-card">
          <h4>Total Hours</h4>
          <span className="big-number">{totalHours}h</span>
        </div>
        <div className="summary-card">
          <h4>Total Entries</h4>
          <span className="big-number">{entries.length}</span>
        </div>
        <div className="summary-card">
          <h4>Workers</h4>
          <span className="big-number">{Object.keys(byWorker).length}</span>
        </div>
      </div>

      <div className="report-by-worker">
        <h4>Hours by Worker</h4>
        <div className="worker-stats">
          {Object.entries(byWorker).map(([name, hours]) => (
            <div key={name} className="worker-stat">
              <span className="name">{name}</span>
              <span className="hours">{hours}h</span>
              <div className="bar" style={{ width: `${(hours / totalHours) * 100}%` }} />
            </div>
          ))}
        </div>
      </div>

      <div className="report-entries">
        <h4>Detailed Entries</h4>
        <table>
          <thead>
            <tr>
              <th>Worker</th>
              <th>Date</th>
              <th>Project</th>
              <th>Hours</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <tr key={idx}>
                <td>{entry.workerName}</td>
                <td>{entry.date}</td>
                <td>{entry.project}</td>
                <td>{entry.hours}h</td>
                <td><span className={`status ${entry.status}`}>{entry.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
