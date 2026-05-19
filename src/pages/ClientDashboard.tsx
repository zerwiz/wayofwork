import { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
const useNavigate = () => (path: string) => { window.location.pathname = path; };
import { UiModeToggle } from "../components/UiModeToggle";
import type { UiMode } from "../hooks/useUiMode";
import { apiGet } from "../api/client";

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  budget_allocated: number;
  budget_spent: number;
  task_count: number;
  completed_tasks: number;
  created_at: string;
}

interface ProjectProgress {
  project: {
    id: string;
    name: string;
    description: string;
    status: string;
    budget_allocated: number;
    budget_spent: number;
  };
  tasks_summary: Array<{ status: string; count: number }>;
  total_hours: number;
  completion_percentage: number;
}

interface Drawing {
  id: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  cad_type: string;
  project_name: string;
  created_at: string;
}

export default function ClientDashboard({ uiMode, setUiMode, appHeader }: { uiMode: UiMode; setUiMode: (m: UiMode) => void; appHeader?: React.ReactNode }) {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const token = localStorage.getItem("wop_token");
    if (!token) return false;
    try {
      const tokenStr = token.includes('.') ? atob(token.split('.')[1]) : atob(token);
      const payload = JSON.parse(tokenStr);
      return payload.role === "CLIENT" || payload.role === "ADMIN" || payload.role === "SUPER_ADMIN";
    } catch {
      return false;
    }
  });
  const [clientId, setClientId] = useState("");
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProjectProgress | null>(null);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"projects" | "drawings" | "feedback">("projects");
  const [feedback, setFeedback] = useState({ rating: 5, comment: "", category: "general" });

  const handleLogin = async () => {
    if (!clientId || !pin) {
      setLoginError("Client ID and PIN required");
      return;
    }
    // Demo mode
    if (clientId === "Demo" && pin === "1234") {
      const demoToken = btoa(JSON.stringify({ role: "CLIENT", id: "demo-client" }));
      localStorage.setItem("wop_token", demoToken);
      setIsLoggedIn(true);
      setLoginError("");
      fetchData();
      return;
    }
    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId: clientId, pin }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLoginError(data.error || "Login failed");
        return;
      }
      const data = await res.json();
      localStorage.setItem("wop_token", data.token);
      setIsLoggedIn(true);
      fetchData();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("wop_token");
    setIsLoggedIn(false);
    setClientId("");
    setPin("");
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [isLoggedIn]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projectsData, drawingsData] = await Promise.all([
        apiGet<Project[]>("/api/client/projects").catch(() => [] as Project[]),
        apiGet<Drawing[]>("/api/client/drawings").catch(() => [] as Drawing[]),
      ]);
      setProjects(projectsData);
      if (projectsData.length > 0 && !selectedProject) {
        setSelectedProject(projectsData[0].id);
      }
      setDrawings(drawingsData);
    } catch (error) {
      console.error("Failed to fetch client data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProject) {
      fetchProgress(selectedProject);
    }
  }, [selectedProject]);

  const fetchProgress = async (projectId: string) => {
    try {
      const res = await fetch(`/api/client/projects/${projectId}/progress`);
      if (res.ok) {
        const progressData = await res.json();
        setProgress(progressData);
      }
    } catch (error) {
      console.error("Failed to fetch progress:", error);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedback.comment) return;

    try {
      const res = await fetch("/api/client/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: selectedProject,
          rating: feedback.rating,
          comment: feedback.comment,
          category: feedback.category,
        }),
      });

      if (res.ok) {
        setFeedback({ rating: 5, comment: "", category: "general" });
        alert("Feedback submitted successfully!");
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "text-green-500";
      case "paused": return "text-yellow-500";
      case "completed": return "text-blue-500";
      default: return "text-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e] text-white">
        <div className="text-lg">Loading Client Dashboard...</div>
      </div>
    );
  }

  // Show login form if not logged in
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#1e1e1e] text-[#cccccc] flex items-center justify-center">
        <div className="bg-[#252526] border border-[#3c3c3c] rounded p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-white mb-2">Client Login</h1>
          <p className="text-sm text-[#999] mb-6">Enter your Client ID and PIN</p>
          {loginError && (
            <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-2 rounded mb-4 text-sm">
              {loginError}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#999] mb-1">Client ID</label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-white"
                placeholder="Enter your Client ID"
              />
            </div>
            <div>
              <label className="block text-sm text-[#999] mb-1">PIN</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-white"
                placeholder="Enter your PIN"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <button
              onClick={handleLogin}
              className="w-full bg-[#ea580c] hover:bg-[#d45307] text-white py-2 rounded font-medium"
            >
              Login
            </button>
          </div>
          <p className="mt-4 text-center text-xs text-[#585858]">
            Demo: Client ID "Demo", PIN "1234"
          </p>
          <button
            onClick={() => window.location.pathname = "/"}
            className="mt-4 w-full text-center text-xs text-[#585858] hover:text-[#858585] transition-colors"
          >
            &larr; Back to Welcome
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#1e1e1e] text-[#cccccc] flex flex-col">
      {appHeader}

      {/* Info Bar */}
      <div className="bg-[#252526] border-b border-[#3c3c3c] px-6 py-2 flex items-center justify-between">
        <div>
          <h1 className="text-xs font-bold text-white uppercase tracking-wider">Client Dashboard</h1>
          <p className="text-[10px] text-[#999]">Project progress and feedback</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-3 py-1 bg-[#3c3c3c] hover:bg-[#4a4a4a] text-red-400 border border-[#3c3c3c] rounded text-[10px] transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Project Selector */}
      {projects.length > 0 && (
        <div className="px-6 pt-4">
          <select
            value={selectedProject || ""}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="bg-[#252526] border border-[#3c3c3c] rounded px-4 py-2 text-white"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Progress Overview */}
      {progress && (
        <div className="grid grid-cols-4 gap-4 p-6">
          <div className="bg-[#252526] border-l-4 border-[#ea580c] p-4 rounded">
            <div className="text-3xl font-bold text-white">{progress.completion_percentage}%</div>
            <div className="text-sm text-[#999] mt-1">Completion</div>
          </div>
          <div className="bg-[#252526] border-l-4 border-green-500 p-4 rounded">
            <div className="text-3xl font-bold text-white">${progress.project.budget_spent?.toLocaleString() || 0}</div>
            <div className="text-sm text-[#999] mt-1">Spent / ${progress.project.budget_allocated?.toLocaleString() || 0}</div>
          </div>
          <div className="bg-[#252526] border-l-4 border-blue-500 p-4 rounded">
            <div className="text-3xl font-bold text-white">{progress.total_hours || 0}h</div>
            <div className="text-sm text-[#999] mt-1">Total Hours</div>
          </div>
          <div className="bg-[#252526] border-l-4 border-yellow-500 p-4 rounded">
            <div className="text-3xl font-bold text-white">
              {progress.tasks_summary.find((t) => t.status === "complete")?.count || 0} /{" "}
              {progress.tasks_summary.reduce((sum, t) => sum + t.count, 0)}
            </div>
            <div className="text-sm text-[#999] mt-1">Tasks Complete</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-6">
        <div className="flex gap-4 border-b border-[#3c3c3c]">
          {(["projects", "drawings", "feedback"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 capitalize ${
                activeTab === tab
                  ? "text-[#ea580c] border-b-2 border-[#ea580c]"
                  : "text-[#999] hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === "projects" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Your Projects</h2>
            <div className="grid gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className={`bg-[#252526] p-4 rounded border border-[#3c3c3c] cursor-pointer hover:bg-[#2d2d2d] ${
                    selectedProject === project.id ? "border-[#ea580c]" : ""
                  }`}
                  onClick={() => setSelectedProject(project.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                      <p className="text-sm text-[#999] mt-1">{project.description}</p>
                    </div>
                    <span className={`text-sm ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </div>
                  <div className="flex gap-6 mt-3 text-sm text-[#999]">
                    <div>
                      Tasks: <span className="text-white">{project.completed_tasks}/{project.task_count}</span>
                    </div>
                    <div>
                      Budget: <span className="text-white">${project.budget_spent?.toLocaleString() || 0} / ${project.budget_allocated?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "drawings" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Project Drawings & Documents</h2>
            <div className="bg-[#252526] rounded border border-[#3c3c3c]">
              <table className="w-full text-sm">
                <thead className="border-b border-[#3c3c3c]">
                  <tr className="text-left text-[#999]">
                    <th className="p-3">File</th>
                    <th className="p-3">Project</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Size</th>
                    <th className="p-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {drawings.map((drawing) => (
                    <tr key={drawing.id} className="border-b border-[#3c3c3c] hover:bg-[#2d2d2d]">
                      <td className="p-3 text-white">{drawing.file_path.split("/").pop()}</td>
                      <td className="p-3">{drawing.project_name || "-"}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          drawing.cad_type === "dwg" ? "bg-blue-600" :
                          drawing.cad_type === "rvt" ? "bg-purple-600" :
                          drawing.cad_type === "pdf" ? "bg-red-600" : "bg-gray-600"
                        }`}>
                          {drawing.cad_type}
                        </span>
                      </td>
                      <td className="p-3">{(drawing.file_size / 1024).toFixed(1)} KB</td>
                      <td className="p-3 text-[#999]">
                        {new Date(drawing.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "feedback" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Submit Feedback</h2>
            <div className="bg-[#252526] p-6 rounded border border-[#3c3c3c] max-w-2xl">
              <div className="mb-4">
                <label className="block text-sm text-[#999] mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setFeedback({ ...feedback, rating: star })}
                      className={`w-10 h-10 rounded ${
                        star <= feedback.rating ? "bg-[#ea580c] text-white" : "bg-[#3c3c3c] text-[#999]"
                      }`}
                    >
                      {star}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm text-[#999] mb-2">Category</label>
                <select
                  value={feedback.category}
                  onChange={(e) => setFeedback({ ...feedback, category: e.target.value })}
                  className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-white"
                >
                  <option value="general">General</option>
                  <option value="design">Design</option>
                  <option value="progress">Progress</option>
                  <option value="budget">Budget</option>
                  <option value="quality">Quality</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm text-[#999] mb-2">Comment</label>
                <textarea
                  value={feedback.comment}
                  onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
                  className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-white h-32"
                  placeholder="Share your thoughts about the project..."
                />
              </div>

              <button
                onClick={handleFeedbackSubmit}
                className="px-6 py-2 bg-[#ea580c] hover:bg-[#d45309] rounded text-white"
              >
                Submit Feedback
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
