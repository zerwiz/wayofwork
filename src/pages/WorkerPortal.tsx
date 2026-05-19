import { useState, useEffect } from "react";
import type { UiMode } from "../hooks/useUiMode";

interface WorkerCredentials {
  workerId: string;
  pin: string;
}

interface WorkerFile {
  id: string;
  name: string;
  size: string;
  type: "pdf" | "cad" | "image" | "doc";
  updatedAt: string;
}

interface WorkerTask {
  id: string;
  title: string;
  hours: number;
  status: "not_started" | "in_progress" | "complete";
  progressPct?: number;
}

export function WorkerPortal({ uiMode, setUiMode, appHeader }: { uiMode: UiMode; setUiMode: (m: UiMode) => void; appHeader?: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const token = localStorage.getItem("wop_token");
    if (!token) return false;
    try {
      // Handle demo token (no dots) vs JWT (has dots)
      const tokenStr = token.includes('.') ? atob(token.split('.')[1]) : atob(token);
      const payload = JSON.parse(tokenStr);
      return payload.role === "WORKER" || payload.role === "LEADER" || payload.role === "ADMIN";
    } catch {
      return false;
    }
  });
  const [workerId, setWorkerId] = useState("");
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [activeTab, setActiveTab] = useState<"tasks" | "files" | "time" | "profile">("tasks");

  // Real data from APIs
  const [workerName, setWorkerName] = useState("Worker");
  const [tasks, setTasks] = useState<WorkerTask[]>([]);
  const [files, setFiles] = useState<WorkerFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  
  // Profile data
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileRole, setProfileRole] = useState("");
  const [profileJobTitle, setProfileJobTitle] = useState("");
  const [profileId, setProfileId] = useState("");

  // Demo data (shown when API is not available)
  const DEMO_TASKS: WorkerTask[] = [
    {
      id: "task-001",
      title: "Review CAD drawings for A-102",
      hours: 3,
      status: "in_progress",
      progressPct: 65,
    },
    {
      id: "task-002",
      title: "Update documentation for Portal API",
      hours: 2,
      status: "not_started",
    },
    {
      id: "task-003",
      title: "Fix login flow in Worker Portal",
      hours: 4,
      status: "in_progress",
      progressPct: 40,
    },
  ];

  const DEMO_FILES: WorkerFile[] = [
    {
      id: "file-001",
      name: "A-102_CAD_draft.pdf",
      size: "2.3 MB",
      type: "pdf",
      updatedAt: "2024-01-15 14:30",
    },
    {
      id: "file-002",
      name: "Project_specs.docx",
      size: "456 KB",
      type: "doc",
      updatedAt: "2024-01-14 09:15",
    },
  ];

  useEffect(() => {
    loadPortalData();
  }, []);

  async function loadPortalData() {
    try {
      setLoading(true);
      // Load demo data in case of demo credentials or API error
      loadDemoData();
      // TODO: Fetch from /api/portal/me, /api/portal/tasks, /api/portal/files
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  function loadDemoData() {
    // Demo data (shown when API is not available)
    setWorkerName("Demo Worker");
    setTasks([...DEMO_TASKS]);
    setFiles([...DEMO_FILES]);
    setProfileId("demo-worker");
    setProfileEmail("demo@wayofpi.dev");
    setProfilePhone("+46-555-0123");
    setProfileRole("WORKER");
    setProfileJobTitle("Worker");
  }

  const handleLogin = async () => {
    if (!workerId || !pin) {
      setLoginError("Worker ID and PIN required");
      return;
    }
    // Demo mode
    if (workerId === "Demo" && pin === "1234") {
      const demoToken = btoa(JSON.stringify({ role: "WORKER", id: "demo-worker" }));
      localStorage.setItem("wop_token", demoToken);
      setIsLoggedIn(true);
      setLoginError("");
      loadPortalData();
      return;
    }
    if (workerId === "Admin" && pin === "1234") {
      const demoToken = btoa(JSON.stringify({ role: "ADMIN", id: "demo-admin" }));
      localStorage.setItem("wop_token", demoToken);
      setIsLoggedIn(true);
      setLoginError("");
      loadPortalData();
      return;
    }
    if (workerId === "Super" && pin === "1234") {
      const demoToken = btoa(JSON.stringify({ role: "SUPER_ADMIN", id: "demo-super" }));
      localStorage.setItem("wop_token", demoToken);
      setIsLoggedIn(true);
      setLoginError("");
      loadPortalData();
      return;
    }
    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId, pin }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLoginError(data.error || "Login failed");
        return;
      }
      const data = await res.json();
      localStorage.setItem("wop_token", data.token);
      setIsLoggedIn(true);
      setLoginError("");
      loadPortalData();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed");
    }
  };

  const handleDownload = (fileId: string) => {
    window.open(`/api/portal/download/${fileId}`, "_blank");
  };

  if (isLoggedIn) {
    window.location.pathname = "/workboard";
    return null;
  }

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#1e1e1e]">
        <div className="w-full max-w-md rounded-lg border border-[#3c3c3c] bg-[#252526] p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-[#cccccc]">WAY OF PI</h1>
            <p className="mt-1 text-sm text-[#858585]">Worker Portal</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4">
            <div>
              <label className="block text-xs text-[#858585] mb-1">Worker ID</label>
              <input
                type="text"
                value={workerId}
                onChange={(e) => setWorkerId(e.target.value)}
                placeholder="e.g., WORKER-001"
                className="w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-sm text-[#cccccc] placeholder-[#585858] focus:border-[#ea580c] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[#858585] mb-1">PIN</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="4-digit PIN"
                maxLength={4}
                className="w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-sm text-[#cccccc] placeholder-[#585858] focus:border-[#ea580c] focus:outline-none"
              />
            </div>

            {loginError && (
              <p className="text-sm text-red-400">{loginError}</p>
            )}

            <button
              type="submit"
              className="w-full rounded bg-[#ea580c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c2410c] transition-colors"
            >
              Login
            </button>
          </form>

          {loginError ? (
            <div className="mt-4 p-3 bg-[#2d2d2d] rounded border border-[#3c3c3c] text-left">
              <p className="text-xs text-[#ea580c] font-medium mb-1">
                {loginError.includes("not ready") || loginError.includes("not running") ? (
                  "⚠️ Backend Not Ready"
                ) : (
                  "⚠️ Login Failed"
                )}
              </p>
              <p className="text-xs text-[#858585]">
                {loginError.includes("not ready") || loginError.includes("not running") ? (
                  <div>
                    The Way of Pi backend API isn't available. This is expected in demo mode.
                    <br />
                    Use <strong className="text-[#f0f0f0]">Worker ID: "Demo"</strong> and <strong className="text-[#f0f0f0]">PIN: "1234"</strong> to test.
                  </div>
                ) : (
                  "Login failed with invalid credentials. Please check your Worker ID and PIN."
                )}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-center text-xs text-[#585858]">
              Demo: Use PIN "1234"
            </p>
          )}
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
    <div className="h-full bg-[#1e1e1e] flex flex-col">
      {appHeader}
      
      {/* Info Bar */}
      <div className="flex items-center justify-between border-b border-[#3c3c3c] bg-[#252526] px-4 py-2">
        <div>
          <h1 className="text-xs font-bold text-[#cccccc] uppercase tracking-wider">Worker Portal</h1>
          <p className="text-[10px] text-[#858585]">Signed in as {workerName}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.pathname = "/profile"}
            className="rounded px-2 py-1 text-[10px] text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc] transition-colors border border-[#3c3c3c]"
          >
            Profile
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#3c3c3c] bg-[#252526] px-4">
        {(["tasks", "files", "time", "profile"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === tab
                ? "border-b-2 border-[#ea580c] text-[#ea580c]"
                : "text-[#858585] hover:text-[#cccccc]"
            }`}
          >
            {tab === "tasks" && "📋 My Tasks"}
            {tab === "files" && "📐 My Files"}
            {tab === "time" && "⏰ Time Entries"}
            {tab === "profile" && "👤 Profile"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === "tasks" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#cccccc]">My Tasks</h2>
              <span className="text-xs text-[#858585]">{tasks.length} tasks</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {(["not_started", "in_progress", "complete"] as const).map((status) => (
                <div key={status} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-2 py-1">
                    <span className="text-xs font-medium text-[#858585] uppercase">
                      {status === "not_started" && "⏳ Not Started"}
                      {status === "in_progress" && "🚀 In Progress"}
                      {status === "complete" && "✅ Complete"}
                    </span>
                    <span className="rounded-full bg-[#3c3c3c] px-2 py-0.5 text-xs text-[#858585]">
                      {tasks.filter(t => t.status === status).length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 min-h-[200px]">
                    {tasks.filter(t => t.status === status).map((task) => (
                      <div key={task.id} className="rounded border border-[#3c3c3c] bg-[#252526] p-3">
                        <h3 className="text-xs font-medium text-[#cccccc]">{task.title}</h3>
                        <p className="mt-1 text-xs text-[#858585]">Est: {task.hours}h</p>
                        {task.progressPct !== undefined && (
                          <div className="mt-2">
                            <div className="h-1 rounded-full bg-[#3c3c3c]">
                              <div
                                className="h-full rounded-full bg-[#ea580c]"
                                style={{ width: `${task.progressPct}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {tasks.filter(t => t.status === status).length === 0 && (
                      <p className="text-xs text-[#585858] text-center py-4">No tasks</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "files" && (
          <div>
            <h2 className="mb-4 text-sm font-semibold text-[#cccccc]">My Files</h2>
            <div className="space-y-2">
              {files.map((file) => (
                <div key={file.id} className="flex items-center justify-between rounded border border-[#3c3c3c] bg-[#252526] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {file.type === "pdf" && "📐"}
                      {file.type === "cad" && "📐"}
                      {file.type === "image" && "📸"}
                      {file.type === "doc" && "📄"}
                    </span>
                    <div>
                      <p className="text-sm text-[#cccccc]">{file.name}</p>
                      <p className="text-xs text-[#858585]">{file.size} • Updated {file.updatedAt}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(file.id)}
                    className="rounded bg-[#3c3c3c] px-3 py-1.5 text-xs text-[#cccccc] hover:bg-[#4c4c4c] transition-colors"
                  >
                    Download
                  </button>
                </div>
              ))}
              {files.length === 0 && (
                <p className="text-xs text-[#585858] text-center py-4">
                  No files uploaded yet
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === "time" && (
          <div>
            <h2 className="mb-4 text-sm font-semibold text-[#cccccc]">Time Entries</h2>
            <div className="mb-4 rounded border border-[#3c3c3c] bg-[#252526] p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-[#ea580c]">6h</p>
                  <p className="text-xs text-[#858585]">Today</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-400">2</p>
                  <p className="text-xs text-[#858585]">Pending</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">32.5h</p>
                  <p className="text-xs text-[#858585]">This Month</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button className="rounded border border-[#ea580c] px-4 py-2 text-sm text-[#ea580c] hover:bg-[#ea580c] hover:text-white transition-colors">
                + Log Time Entry
              </button>
              
              <p className="text-xs text-[#585858]">
                Or use WhatsApp: "log 4.5h on A-101" to @WorkTimeBot
              </p>
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="max-w-2xl">
            <h2 className="mb-4 text-sm font-semibold text-[#cccccc]">My Profile</h2>
            <div className="rounded-lg border border-[#3c3c3c] bg-[#252526] p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#585858]">Full Name</p>
                  <p className="text-sm text-[#cccccc]">{workerName}</p>
                </div>
                <div>
                  <p className="text-xs text-[#585858]">User ID</p>
                  <p className="text-sm text-[#cccccc]">{profileId}</p>
                </div>
                <div>
                  <p className="text-xs text-[#585858]">Email</p>
                  <p className="text-sm text-[#cccccc]">{profileEmail}</p>
                </div>
                <div>
                  <p className="text-xs text-[#585858]">Phone</p>
                  <p className="text-sm text-[#cccccc]">{profilePhone}</p>
                </div>
                <div>
                  <p className="text-xs text-[#585858]">Role</p>
                  <p className="text-sm text-[#ea580c]">{profileRole}</p>
                </div>
                <div>
                  <p className="text-xs text-[#585858]">Job Title</p>
                  <p className="text-sm text-[#cccccc]">{profileJobTitle}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-[#3c3c3c]">
                <button
                  onClick={() => window.location.pathname = "/profile"}
                  className="rounded bg-[#ea580c] px-4 py-2 text-sm font-medium text-white hover:bg-[#c2410c]"
                >
                  Full Profile & Settings →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
