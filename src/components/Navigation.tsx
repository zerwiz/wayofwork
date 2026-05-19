import { useNavigate } from "react-router-dom";
import { FileText, Briefcase, Shield, User, LayoutDashboard, Code2, Bot, FileCode } from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  title: string;
  path?: string;
  showCondition?: (role?: string) => boolean;
}

interface NavigationProps {
  uiMode: string;
  onUiModeChange: (mode: string) => void;
  /** Current pathname-based context (portal, client, admin, profile) */
  isPortal: boolean;
  isClient: boolean;
  isAdmin: boolean;
  isProfile: boolean;
  /** Optional: user role to conditionally show context nav */
  userRole?: "worker" | "client" | "admin" | null;
}

const PRIMARY_NAV: NavItem[] = [
  { id: "simple", label: "Simple", icon: <Code2 size={14} />, title: "Calmer layout and friendly labels", showCondition: (role?: string) => !!role },
  { id: "technical", label: "Technical", icon: <Code2 size={14} />, title: "IDE-style chrome and technical labels", showCondition: (role?: string) => role === "worker" || role === "leader" || role === "admin" || role === "super_admin" },
  { id: "claw", label: "Claw", icon: <Bot size={14} />, title: "Claw roadmap: autonomous-agent shell", showCondition: (role?: string) => role === "leader" || role === "admin" || role === "super_admin" },
  { id: "docs", label: "Docs", icon: <FileText size={14} />, title: "Docs mode: Document-centric layout", showCondition: (role?: string) => !!role },
  { id: "work", label: "Work", icon: <Briefcase size={14} />, title: "Work mode: Time and tasks", showCondition: (role?: string) => role === "worker" || role === "leader" || role === "admin" || role === "super_admin" },
];

const CONTEXT_NAV: NavItem[] = [
  { id: "portal", label: "Portal", icon: <LayoutDashboard size={14} />, title: "Worker/Admin Portal", path: "/portal", showCondition: (role?: string) => role === "worker" || role === "leader" || role === "admin" },
  { id: "admin", label: "Admin", icon: <Shield size={14} />, title: "Admin Console", path: "/admin", showCondition: (role?: string) => role === "admin" },
  { id: "super_admin", label: "DevView", icon: <Shield size={14} />, title: "Developer View", path: "/super-admin", showCondition: (role?: string) => role === "super_admin" },
  { id: "profile", label: "Profile", icon: <User size={14} />, title: "User Profile", path: "/profile", showCondition: (role?: string) => !!role },
];

// Client entry - only for clients (separate orange button)
const CLIENT_ENTRY = { id: "client", label: "Client", icon: <User size={14} />, title: "Client Dashboard (View-Only)", path: "/client", showCondition: (role?: string) => role === "client" };

export function Navigation({ uiMode, onUiModeChange, isPortal, isClient, isAdmin, isProfile, userRole = null }: NavigationProps) {
  const navigate = useNavigate();

  // Universal Authorization Gate: Only show navigation AFTER user is logged in
  if (!userRole) return null;

  const isContextActive = isPortal || isClient || isAdmin || isProfile;

  const handlePrimaryClick = (mode: string) => {
    if (mode === "technical") {
      window.open("http://localhost:5174", "_blank");
      return;
    }
    if (window.location.pathname !== "/") navigate("/", { replace: true });
    onUiModeChange(mode);
  };

  const handleContextClick = (item: NavItem) => {
    if (item.path) navigate(item.path, { replace: true });
  };

  const isActive = (item: NavItem): boolean => {
    if (item.path) {
      return window.location.pathname.startsWith(item.path);
    }
    return uiMode === item.id && !isContextActive;
  };

  const navBtnClass = (active: boolean) =>
    `flex items-center gap-1 rounded px-2 py-1 text-[12px] transition-colors ${
      active ? "bg-[#ea580c] text-white" : "text-[#858585] hover:bg-[#474747] hover:text-[#cccccc]"
    }`;

  return (
    <nav className="flex shrink-0 items-center gap-1" aria-label="Main navigation">
      {/* Primary Navigation - Role-based visibility */}
      <div className="flex shrink-0 items-center gap-0.5 rounded border border-[#454545] bg-[#2d2d2d] p-0.5">
        {PRIMARY_NAV.map((item) => {
          const shouldShow = item.showCondition ? item.showCondition(userRole) : true;
          if (!shouldShow) return null;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handlePrimaryClick(item.id)}
              className={navBtnClass(isActive(item))}
              title={item.title}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Context-Aware Navigation - Role-based */}
      <div className="flex shrink-0 items-center gap-0.5 rounded border border-[#454545] bg-[#2d2d2d] p-0.5">
        {CONTEXT_NAV.map((item) => {
          const shouldShow = item.showCondition ? item.showCondition(userRole) : true;
          if (!shouldShow) return null;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleContextClick(item)}
              className={navBtnClass(isActive(item))}
              title={item.title}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Client Entry - Only for clients */}
      {CLIENT_ENTRY.showCondition(userRole) && (
        <div className="flex shrink-0 items-center gap-0.5 rounded border border-[#ea580c] bg-[#2d2d2d] p-0.5">
          <button
            type="button"
            onClick={() => handleContextClick(CLIENT_ENTRY)}
            className={navBtnClass(isActive(CLIENT_ENTRY))}
            title={CLIENT_ENTRY.title}
          >
            {CLIENT_ENTRY.icon}
            <span className="text-[#ea580c]">{CLIENT_ENTRY.label}</span>
          </button>
        </div>
      )}
    </nav>
  );
}
