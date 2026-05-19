import { useNavigate } from "react-router-dom";

export function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#1e1e1e] p-4">
      <div className="mb-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-xl bg-[#ea580c] p-3 shadow-lg shadow-[#ea580c]/20">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 17 10 11 4 5"></polyline>
              <line x1="12" y1="19" x2="20" y2="19"></line>
            </svg>
          </div>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Way of Pi</h1>
        <p className="mt-2 text-sm text-[#858585]">Engineering Platform</p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => navigate("/login")}
          className="w-full rounded-lg border border-[#3c3c3c] bg-[#252526] px-6 py-4 text-left hover:bg-[#2d2d2d] hover:border-[#ea580c] transition-all group"
        >
          <span className="block text-sm font-semibold text-[#cccccc] group-hover:text-[#ea580c]">Sign In</span>
          <span className="block text-xs text-[#585858]">Admin · Worker · Client · Super</span>
        </button>
      </div>

      <p className="mt-8 text-xs text-[#444]">&copy; 2026 Way of Pi</p>
    </div>
  );
}
