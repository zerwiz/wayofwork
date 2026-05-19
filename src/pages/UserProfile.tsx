import { useState, useEffect } from "react";
// UiMode typed as string

interface Certificate {
  id: string;
  name: string;
  issuer: string;
  validUntil: string;
  category: "site" | "safety" | "trade" | "machine";
  status: "valid" | "expiring" | "expired";
}

interface CalendarConnection {
  id: string;
  provider: "internal";
  connected: boolean;
  email: string;
}

interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  jobTitle: string;
  tenantId: string;
  certificates?: Certificate[];
  calendarConnections?: CalendarConnection[];
}

export function UserProfilePage({
  uiMode,
  setUiMode,
}: {
  uiMode: string;
  setUiMode: (m: string) => void;
}) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [startBusy, setStartBusy] = useState(false);
  const [startHint, setStartHint] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [pinChange, setPinChange] = useState({
    oldPin: "",
    newPin: "",
    confirmPin: "",
  });
  const [showPinChange, setShowPinChange] = useState(false);

  const handleStartServer = async () => {
    setStartBusy(true);
    setStartHint(null);
    try {
      const shell = typeof window !== "undefined" ? window.wopShell : undefined;
      if (shell?.startWayOfPiBunServer) {
        const r = await shell.startWayOfPiBunServer();
        setStartHint(
          r.message || (r.ok ? "Server started." : "Failed to start server."),
        );
        if (r.ok) window.location.reload();
        return;
      }

      if (import.meta.env.DEV) {
        try {
          const resp = await fetch("/__wop_dev/start-wayofpi-api", {
            method: "POST",
          });
          if (resp.status !== 404) {
            const data = await resp.json().catch(() => ({}));
            setStartHint(
              data.message ||
                (data.ok ? "Server started." : "Failed to start server."),
            );
            if (data.ok) window.location.reload();
            return;
          }
        } catch {
          // Fallback
        }
      }

      const cmd = "./start-wayofpi.sh --web";
      try {
        await navigator.clipboard.writeText(cmd);
        setStartHint("Command copied to clipboard: ./start-wayofpi.sh --web");
      } catch {
        setStartHint("Run this in your terminal: ./start-wayofpi.sh --web");
      }
    } catch (e) {
      setStartHint(e instanceof Error ? e.message : String(e));
    } finally {
      setStartBusy(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      const token = localStorage.getItem("wop_token");
      
      // Demo mode - return demo profile
      if (token) {
        try {
          const tokenStr = token.includes('.') ? atob(token.split('.')[1]) : atob(token);
          const payload = JSON.parse(tokenStr);
          if (payload.id === "demo-client" || payload.id === "demo-worker" || payload.id === "demo-admin" || payload.id === "demo-super") {
            const isWorker = payload.id === "demo-worker";
            const nameMap: Record<string, string> = {
              "demo-client": "Demo Client",
              "demo-worker": "Demo Worker",
              "demo-admin": "Demo Admin",
              "demo-super": "Demo Super Admin",
            };
            const jobMap: Record<string, string> = {
              "demo-client": "Client",
              "demo-worker": "Worker",
              "demo-admin": "Administrator",
              "demo-super": "Super Administrator",
            };
            const demoProfile: UserProfile = {
              id: payload.id,
              username: payload.id,
              fullName: nameMap[payload.id] || payload.id,
              email: "demo@wayofpi.dev",
              phone: "+46-555-0123",
              role: payload.role,
              jobTitle: jobMap[payload.id] || payload.role,
              tenantId: "demo-tenant",
              certificates: isWorker ? [
                { id: "cert-1", name: "ID06 Identification Card", issuer: "ID06 AB", validUntil: "2026-12-31", category: "site" as const, status: "valid" as const },
                { id: "cert-2", name: "Safe Construction Training", issuer: "Byggföretagen", validUntil: "2025-08-15", category: "safety" as const, status: "expiring" as const },
                { id: "cert-3", name: "Heta Arbeten (Hot Works)", issuer: "Brandförsvaret", validUntil: "2027-03-20", category: "safety" as const, status: "valid" as const },
                { id: "cert-4", name: "Fallskydd (Fall Protection)", issuer: "Arbetsmiljöverket", validUntil: "2024-11-30", category: "safety" as const, status: "expired" as const },
                { id: "cert-5", name: "Träarbetare (Carpenter)", issuer: "BYN", validUntil: "2026-06-30", category: "trade" as const, status: "expiring" as const },
                { id: "cert-6", name: "Truckkort (Forklift A/B)", issuer: "TYA", validUntil: "2028-01-15", category: "machine" as const, status: "valid" as const },
              ] : [],
              calendarConnections: [
                { id: "cal-1", provider: "internal" as const, connected: true, email: "demo@wayofpi.dev" },
              ],
            };
            setProfile(demoProfile);
            setFormData(demoProfile);
            setLoading(false);
            return;
          }
        } catch {
          // Not a demo token, continue to API
        }
      }
      
      const res = await fetch("/api/portal/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 401 || res.status === 503) {
          setError(
            errorData.error ||
              "Not authenticated. Please log in to view your profile.",
          );
        } else if (res.status === 404) {
          // In dev environment, API may not be ready
          setError("API not ready. Please check Way of Pi server is running.");
        } else {
          throw new Error(errorData.error || "Failed to load profile");
        }
        return;
      }
      const data = await res.json();
      setProfile(data);
      setFormData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    try {
      const token = localStorage.getItem("wop_token");
      if (!token) {
        setError("Not authenticated. Please log in to update your profile.");
        return;
      }
      // TODO: Implement PUT /api/portal/me
      console.log("Save profile:", formData);
      setProfile({ ...profile, ...formData } as UserProfile);
      setIsEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  }

  async function changePin() {
    if (pinChange.newPin !== pinChange.confirmPin) {
      setError("New PINs do not match");
      return;
    }
    if (pinChange.newPin.length !== 4) {
      setError("PIN must be 4 digits");
      return;
    }
    try {
      const token = localStorage.getItem("wop_token");
      if (!token) {
        setError("Not authenticated. Please log in to change your PIN.");
        setShowPinChange(false);
        return;
      }
      // TODO: Implement POST /api/portal/change-pin
      console.log("Change PIN");
      setShowPinChange(false);
      setPinChange({ oldPin: "", newPin: "", confirmPin: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to change PIN");
    }
  }

  // Error UI - styled error page for not found/unauthenticated
  if (!profile && error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1e1e1e]">
        <div className="max-w-md mx-auto p-8 text-center">
          <div className="mb-6 text-[#f0f0f0]">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-[#ea580c]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            {error.startsWith("401") || error.startsWith("503") ? (
              <div>
                <h2 className="text-2xl font-bold mb-3 text-[#f0f0f0]">
                  Not Authenticated
                </h2>
                <p className="text-[#858585] mb-6">
                  You are not logged in to Way of Pi.
                </p>
                <div className="bg-[#2d2d2d] rounded-lg p-4 mb-6 text-left">
                  <p className="text-sm text-[#858585] mb-2">
                    <strong className="text-[#f0f0f0]">
                      Worker Portal Login
                    </strong>
                    <br />
                    <strong className="text-[#f0f0f0]">PIN:</strong> 1234
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => window.history.back()}
                    className="rounded bg-[#3c3c3c] px-6 py-2.5 text-sm font-medium text-[#cccccc] hover:bg-[#4c4c4c] transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="rounded bg-[#ea580c] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#c2410c] transition-colors"
                  >
                    Try Logging In
                  </button>
                </div>                <p className="text-xs text-[#585858] mt-4">
                  Demo mode: Use PIN "1234"
                </p>
              </div>
            ) : error.includes("API not ready") ? (
              <div>
                <h2 className="text-2xl font-bold mb-3 text-[#f0f0f0]">
                  Way of Pi Server Not Running
                </h2>
                <p className="text-[#858585] mb-6">
                  The API server isn't ready yet. Please start the Way of Pi
                  backend or check that your terminal is running.
                </p>
                <div className="bg-[#2d2d2d] rounded-lg p-4 mb-6 text-left">
                  <p className="text-sm text-[#858585]">
                    If you're in demo mode, use the{" "}
                    <strong className="text-[#f0f0f0]">Worker Portal</strong> to
                    log in with PIN "1234".
                  </p>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => window.history.back()}
                      className="rounded bg-[#3c3c3c] px-6 py-2.5 text-sm font-medium text-[#cccccc] hover:bg-[#4c4c4c] transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleStartServer}
                      disabled={startBusy}
                      className="rounded bg-[#007acc] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#006bb3] transition-colors disabled:opacity-50"
                    >
                      {startBusy ? "Starting..." : "Start Way of Pi"}
                    </button>
                    <button
                      onClick={() => window.location.reload()}
                      className="rounded bg-[#ea580c] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#c2410c] transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                  {startHint && (
                    <p className="text-xs text-[#858585] bg-[#2d2d2d] p-2 rounded">
                      {startHint}
                    </p>
                  )}
                </div>              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-bold mb-3 text-[#f0f0f0]">
                  Profile Not Found
                </h2>
                <p className="text-[#858585]">
                  The profile you are looking for does not exist or you are not
                  authenticated.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1e1e1e]">
        <div className="text-[#858585]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#1e1e1e] overflow-y-auto">
      <div className="mx-auto max-w-4xl p-6 pb-20">
        <div className="flex items-center justify-between mb-8 border-b border-[#3c3c3c] pb-4">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold text-[#cccccc]">User Profile</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto rounded-lg border border-[#3c3c3c] bg-[#252526] p-6">
        {!isEditing ? (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-xs text-[#585858]">Full Name</p>
                <p className="text-sm text-[#cccccc]">
                  {profile?.fullName || "Not set"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#585858]">Username</p>
                <p className="text-sm text-[#cccccc]">
                  {profile?.username || "Demo"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#585858]">Email</p>
                <p className="text-sm text-[#cccccc]">
                  {profile?.email || "demo@example.com"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#585858]">Phone</p>
                <p className="text-sm text-[#cccccc]">
                  {profile?.phone || "Not set"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#585858]">Role</p>
                <p className="text-sm text-[#ea580c]">
                  {profile?.role || "Demo"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#585858]">Job Title</p>
                <p className="text-sm text-[#cccccc]">
                  {profile?.jobTitle || "Not set"}
                </p>
              </div>
            </div>

             <div className="flex gap-3">
              <button
                onClick={() => setIsEditing(true)}
                className="rounded bg-[#ea580c] px-4 py-2 text-sm font-medium text-white hover:bg-[#c2410c]"
              >
                Edit Profile
              </button>
              <button
                onClick={() => setShowPinChange(!showPinChange)}
                className="rounded border border-[#ea580c] px-4 py-2 text-sm text-[#ea580c] hover:bg-[#ea580c] hover:text-white"
              >
                Change PIN
              </button>
            </div>

            {/* Certificates Section */}
            {profile?.certificates && profile.certificates.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-4 text-sm font-semibold text-[#cccccc]">Certificates & Licenses</h2>
                <div className="space-y-2">
                  {profile.certificates.map((cert) => (
                    <div key={cert.id} className="flex items-center justify-between rounded border border-[#3c3c3c] bg-[#1e1e1e] p-3">
                      <div>
                        <p className="text-sm font-medium text-[#cccccc]">{cert.name}</p>
                        <p className="text-xs text-[#858585]">Issuer: {cert.issuer}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-[#858585]">Valid until: {cert.validUntil}</p>
                        <span className={`rounded px-2 py-1 text-xs ${
                          cert.status === "valid" ? "bg-green-900/30 text-green-400" :
                          cert.status === "expiring" ? "bg-yellow-900/30 text-yellow-400" :
                          "bg-red-900/30 text-red-400"
                        }`}>
                          {cert.status === "valid" && "✓ Valid"}
                          {cert.status === "expiring" && "⚠ Expiring Soon"}
                          {cert.status === "expired" && "✗ Expired"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Calendar Connections Section */}
            {profile?.calendarConnections && profile.calendarConnections.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-4 text-sm font-semibold text-[#cccccc]">Calendar Connections</h2>
                <div className="space-y-2">
                  {profile.calendarConnections.map((cal) => (
                    <div key={cal.id} className="flex items-center justify-between rounded border border-[#3c3c3c] bg-[#1e1e1e] p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {cal.provider === "internal" && "📅"}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-[#cccccc]">{cal.provider.charAt(0).toUpperCase() + cal.provider.slice(1)}</p>
                          <p className="text-xs text-[#858585]">{cal.email}</p>
                        </div>
                      </div>
                      <span className={`rounded px-2 py-1 text-xs ${
                        cal.connected ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
                      }`}>
                        {cal.connected ? "✓ Connected" : "✗ Disconnected"}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-[#585858]">
                  System will notify 6 months before certificate expiration via connected calendar.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-[#585858] mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={formData.fullName || ""}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                className="w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-sm text-[#cccccc] focus:border-[#ea580c] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-[#585858] mb-1">Email</label>
              <input
                type="email"
                value={formData.email || ""}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-sm text-[#cccccc] focus:border-[#ea580c] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-[#585858] mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone || ""}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-sm text-[#cccccc] focus:border-[#ea580c] focus:outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={saveProfile}
                className="rounded bg-[#ea580c] px-4 py-2 text-sm font-medium text-white hover:bg-[#c2410c]"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="rounded border border-[#3c3c3c] px-4 py-2 text-sm text-[#cccccc] hover:bg-[#3c3c3c]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {showPinChange && (
          <div className="mt-6 pt-6 border-t border-[#3c3c3c]">
            <h3 className="text-sm font-semibold text-[#cccccc] mb-4">
              Change PIN
            </h3>
            <div className="space-y-3 max-w-sm">
              <div>
                <label className="block text-xs text-[#585858] mb-1">
                  Current PIN
                </label>
                <input
                  type="password"
                  value={pinChange.oldPin}
                  onChange={(e) =>
                    setPinChange({ ...pinChange, oldPin: e.target.value })
                  }
                  maxLength={4}
                  className="w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-sm text-[#cccccc] focus:border-[#ea580c] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-[#585858] mb-1">
                  New PIN
                </label>
                <input
                  type="password"
                  value={pinChange.newPin}
                  onChange={(e) =>
                    setPinChange({ ...pinChange, newPin: e.target.value })
                  }
                  maxLength={4}
                  className="w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-sm text-[#cccccc] focus:border-[#ea580c] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-[#585858] mb-1">
                  Confirm New PIN
                </label>
                <input
                  type="password"
                  value={pinChange.confirmPin}
                  onChange={(e) =>
                    setPinChange({ ...pinChange, confirmPin: e.target.value })
                  }
                  maxLength={4}
                  className="w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-sm text-[#cccccc] focus:border-[#ea580c] focus:outline-none"
                />
              </div>
              <button
                onClick={changePin}
                className="rounded bg-[#ea580c] px-4 py-2 text-sm font-medium text-white hover:bg-[#c2410c]"
              >
                Change PIN
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

}
