import type { ReactNode } from "react";
import { 
  LayoutDashboard, 
  User, 
  Shield, 
  Clock,
  FileText, 
  Settings,
  HelpCircle,
} from "lucide-react";

interface NavigationProps {
  uiMode: string;
  setUiMode: (mode: string) => void;
}

export function Navigation({ uiMode, setUiMode }: NavigationProps) {
  // Determine active route
  const path = window.location.pathname;
  const activeRoute = (paths: string[]) => paths.includes(path);
  const isClient = activeRoute(["/client", "/client/"]);
  const isAdmin = activeRoute(["/admin", "/admin/"]);
  const isPortal = activeRoute(["/portal", "/portal/"]);
  const isProfile = activeRoute(["/profile", "/profile/"]);
  const isLogout = activeRoute(["/logout", "/logout/"]);
  const isHelp = activeRoute(["/help", "/help/"]);
  
  return (
    <div className="flex shrink-0 items-center gap-1 bg-[#252526] p-2">
      {/* Main navigation routes */}
      <div className="flex items-center gap-1">
        <button
          className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs transition-colors ${
            (!isClient && !isAdmin && !isPortal && !isProfile) 
              ? (path === "/" ? "bg-[#ea580c] text-white font-medium" : "text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]")
              : "text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]"
          }`}
          onClick={() => window.location.pathname = "/"}
          title="Dashboard"
        >
          <LayoutDashboard size={12} />
          <span className="hidden sm:inline">Dashboard</span>
        </button>
        
        <button
          className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs transition-colors ${
            isClient 
              ? "bg-[#ea580c] text-white font-medium" 
              : "text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]"
          }`}
          onClick={() => window.location.pathname = "/client"}
          title="Client Dashboard"
        >
          <User size={12} />
          <span className="hidden sm:inline">Client</span>
        </button>
        
        <button
          className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs transition-colors ${
            isPortal 
              ? "bg-[#ea580c] text-white font-medium" 
              : "text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]"
          }`}
          onClick={() => window.location.pathname = "/portal"}
          title="Worker Portal"
        >
          <LayoutDashboard size={12} />
          <span className="hidden sm:inline">Portal</span>
        </button>
        
        <button
          className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs transition-colors ${
            isAdmin 
              ? "bg-[#ea580c] text-white font-medium" 
              : "text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]"
          }`}
          onClick={() => window.location.pathname = "/admin"}
          title="Admin Dashboard"
        >
          <Shield size={12} />
          <span className="hidden sm:inline">Admin</span>
        </button>
        
        {(!isClient && !isPortal && !isLogout) && (
          <button
            className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs transition-colors ${
              isProfile 
                ? "bg-[#ea580c] text-white font-medium" 
                : "text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]"
            }`}
            onClick={() => window.location.pathname = "/profile"}
            title="User Profile"
          >
            <User size={12} />
            Profile
          </button>
        )}
      </div>
      
      <div className="mx-1 h-3 w-[1px] bg-[#454545]" />
      
      {/* Mode toggle */}
      <div className="relative group">
        <button
          className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-[#858585] hover:text-[#cccccc]"
          onClick={() => setUiMode("simple")}
          title="Toggle UI modes"
        >
          <Settings size={12} />
          <span className="hidden md:inline">Mode</span>
        </button>
        
        {/* Mode toggle dropdown */}
        <div className="absolute right-0 top-full mt-1 z-50 hidden group-hover:block w-48 rounded border border-[#454545] bg-[#2d2d2d] p-2 shadow-xl">
          <div className="py-1">
            <button
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded ${
                uiMode === "simple" ? "bg-[#3c3c3c] text-white" : ""
              }`}
              onClick={() => setUiMode("simple")}
              title="Simple UI"
            >
              <LayoutDashboard size={12} />
              Simple
            </button>
            <button
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded ${
                uiMode === "technical" ? "bg-[#3c3c3c] text-white" : ""
              }`}
              onClick={() => setUiMode("technical")}
              title="Technical IDE"
            >
              <Settings size={12} />
              Technical
            </button>
            <button
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded ${
                uiMode === "claw" ? "bg-[#3c3c3c] text-white" : ""
              }`}
              onClick={() => setUiMode("claw")}
              title="Claw Agent"
            >
              <LayoutDashboard size={12} />
              Claw
            </button>
            <button
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded ${
                uiMode === "docs" ? "bg-[#3c3c3c] text-white" : ""
              }`}
              onClick={() => setUiMode("docs")}
              title="Documentation 3-panel"
            >
              <FileText size={12} />
              Docs
            </button>
            <button
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded ${
                uiMode === "work" ? "bg-[#3c3c3c] text-white" : ""
              }`}
              onClick={() => setUiMode("work")}
              title="Time & Tasks"
            >
              <Clock size={12} />
              Work
            </button>
          </div>
        </div>
      </div>
      
      <button
        onClick={() => window.location.pathname = "/help"}
        className="flex items-center gap-2 rounded px-3 py-1.5 text-xs text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc] transition-colors"
        title="Help & About"
      >
        <HelpCircle size={12} />
      </button>
    </div>
  );
}
