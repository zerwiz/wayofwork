import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "../contexts/LanguageContext";

interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    role: string;
    tenantId: string;
  };
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const [userId, setUserId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectAfterLogin = (role: string) => {
    if (from) {
      navigate(from, { replace: true });
      return;
    }
    const r = role.toUpperCase();
    if (r === "CLIENT") navigate("/client", { replace: true });
    else if (r === "WORKER" || r === "LEADER") navigate("/portal", { replace: true });
    else if (r === "ADMIN" || r === "SUPER_ADMIN") navigate("/simple", { replace: true });
    else navigate("/", { replace: true });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !pin) {
      setError("User ID and PIN required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId: userId, pin }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Login failed. Check your ID and PIN.");
        return;
      }

      const data: LoginResponse = await res.json();
      localStorage.setItem("wop_token", data.token);
      redirectAfterLogin(data.user.role);
    } catch (err) {
      setError("Failed to connect to server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#1e1e1e]">
      <div className="w-full max-w-md rounded-lg border border-[#3c3c3c] bg-[#252526] p-10 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
             <div className="bg-[#ea580c] p-3 rounded-xl shadow-lg shadow-[#ea580c]/20">
               <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                 <polyline points="4 17 10 11 4 5"></polyline>
                 <line x1="12" y1="19" x2="20" y2="19"></line>
               </svg>
             </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Way of Work</h1>
          <p className="mt-2 text-sm text-[#858585] font-medium">{t("auth.login_subtitle")}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-[#858585] uppercase tracking-widest mb-1.5">{t("auth.username")}</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter your ID"
              className="w-full rounded-md border border-[#3c3c3c] bg-[#1e1e1e] px-4 py-3 text-sm text-[#cccccc] placeholder-[#585858] focus:border-[#ea580c] focus:ring-1 focus:ring-[#ea580c] focus:outline-none transition-all"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#858585] uppercase tracking-widest mb-1.5">{t("auth.pin")}</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              maxLength={4}
              className="w-full rounded-md border border-[#3c3c3c] bg-[#1e1e1e] px-4 py-3 text-sm text-[#cccccc] placeholder-[#585858] tracking-[0.5em] focus:border-[#ea580c] focus:ring-1 focus:ring-[#ea580c] focus:outline-none transition-all"
            />
          </div>

          {error && (
            <div className="rounded border border-red-900/50 bg-red-900/10 p-3">
              <p className="text-xs text-red-400 text-center font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[#ea580c] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#ea580c]/20 hover:bg-[#c2410c] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t("auth.logging_in") : t("auth.login")}
          </button>
        </form>
      </div>
      

      <p className="mt-4 text-xs text-[#444] font-medium tracking-tight">
        &copy; 2026 Way of Work. All rights reserved.
      </p>
    </div>
  );
}
