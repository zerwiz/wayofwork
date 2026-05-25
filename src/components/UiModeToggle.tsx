import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Briefcase, Shield, User, LogOut, Columns3, ClipboardList, CircleDot } from "lucide-react";
import { useNotifications } from "../contexts/NotificationContext";

/** Same control as in the technical `MenuBar` (IDE chrome). */
export function UiModeToggle({
	uiMode,
	onUiModeChange,
}: {
	uiMode: string;
	onUiModeChange: (mode: string) => void;
}) {
	const navigate = useNavigate();
	const [role, setRole] = useState<string>("");

	useEffect(() => {
		const token = localStorage.getItem("wop_token");
		if (token) {
			try {
				const tokenStr = token.includes('.') ? atob(token.split('.')[1]) : atob(token);
				const payload = JSON.parse(tokenStr);
				setRole(payload.role?.toUpperCase() || "");
			} catch (e) {
				console.error("Failed to parse token in UiModeToggle", e);
			}
		}
	}, []);

	const isSuperAdminRole = role === "SUPER_ADMIN";
	const isAdminRole = role === "ADMIN" || isSuperAdminRole;
	const isLeaderRole = role === "LEADER" || isAdminRole;
	const isWorkerRole = role === "WORKER" || isLeaderRole;
	const isClientRole = role === "CLIENT";

	const isClientPage = window.location.pathname.startsWith("/client");
	const isAdminPage = window.location.pathname.startsWith("/admin");
	const isPortalPage = window.location.pathname.startsWith("/portal");
	const isProfilePage = window.location.pathname.startsWith("/profile");
	const isSuperAdminPage = window.location.pathname.startsWith("/super-admin");

	const anyPageActive = isClientPage || isAdminPage || isPortalPage || isProfilePage || isSuperAdminPage;

	return (
		<div className="flex shrink-0 items-center gap-0.5 rounded border border-[#454545] bg-[#2d2d2d] p-0.5 text-[11px]">
			<button
				type="button"
				onClick={() => {
					if (window.location.pathname !== "/") navigate("/", { replace: true });
					onUiModeChange("simple");
				}}
				className={`rounded px-1.5 py-0.5 transition-colors ${
					uiMode === "simple" && !anyPageActive ? "bg-[#ea580c] text-white" : "text-[#858585] hover:text-[#cccccc]"
				}`}
				title="Calmer layout and friendly labels"
			>
				Simple
			</button>

			{isLeaderRole && (
				<button
					type="button"
					onClick={() => {
						if (window.location.pathname !== "/") navigate("/", { replace: true });
						onUiModeChange("claw");
					}}
					className={`rounded px-1.5 py-0.5 transition-colors ${
						uiMode === "claw" && !anyPageActive ? "bg-[#ea580c] text-white" : "text-[#858585] hover:text-[#cccccc]"
					}`}
					title="Claw roadmap: autonomous-agent shell"
				>
					Claw
				</button>
			)}

			<div className="mx-1 h-3 w-[1px] bg-[#454545]" />

			<button
				type="button"
				onClick={() => {
					if (window.location.pathname !== "/") navigate("/", { replace: true });
					onUiModeChange("docs");
				}}
				className={`flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors ${
					uiMode === "docs" && !anyPageActive ? "bg-[#ea580c] text-white" : "text-[#858585] hover:text-[#cccccc]"
				}`}
				title="Docs mode: 3-panel layout"
			>
				<FileText size={12} />
				Docs
			</button>

			<button
				type="button"
				onClick={() => {
					if (window.location.pathname !== "/") navigate("/", { replace: true });
					onUiModeChange("work");
				}}
				className={`flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors ${
					uiMode === "work" && !anyPageActive ? "bg-[#ea580c] text-white" : "text-[#858585] hover:text-[#cccccc]"
				}`}
				title="Workboard mode: Time and tasks"
			>
				<Briefcase size={12} />
				Workboard
			</button>

			<button
				type="button"
				onClick={() => {
					if (window.location.pathname !== "/") navigate("/", { replace: true });
					onUiModeChange("kanban");
				}}
				className={`flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors ${
					uiMode === "kanban" && !anyPageActive ? "bg-[#ea580c] text-white" : "text-[#858585] hover:text-[#cccccc]"
				}`}
				title="Kanban Board"
			>
				<Columns3 size={12} />
				Kanban
			</button>

			<button
				type="button"
				onClick={() => {
					if (window.location.pathname !== "/") navigate("/", { replace: true });
					onUiModeChange("ta-planner");
				}}
				className={`flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors ${
					uiMode === "ta-planner" && !anyPageActive ? "bg-[#ea580c] text-white" : "text-[#858585] hover:text-[#cccccc]"
				}`}
				title="TA-Planner"
			>
				<ClipboardList size={12} />
				TA-Planner
			</button>

			<button
				type="button"
				onClick={() => {
					if (window.location.pathname !== "/") navigate("/", { replace: true });
					onUiModeChange("ata");
				}}
				className={`flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors ${
					uiMode === "ata" && !anyPageActive ? "bg-[#ea580c] text-white" : "text-[#858585] hover:text-[#cccccc]"
				}`}
				title="ÄTA — Change order ticket system"
			>
				<ClipboardList size={12} />
				ÄTA
			</button>

			<button
				type="button"
				onClick={() => navigate("/profile", { replace: true })}
				className={`flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors ${
					isProfilePage ? "bg-[#ea580c] text-white" : "text-[#858585] hover:text-[#cccccc]"
				}`}
				title="User Profile"
			>
				<User size={12} />
				Profile
			</button>

			<div className="mx-1 h-3 w-[1px] bg-[#454545]" />

			<NotificationBell />

			<button
				type="button"
				onClick={() => {
					localStorage.removeItem("wop_token");
					navigate("/login", { replace: true });
				}}
				className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[#858585] transition-colors hover:text-[#cccccc]"
				title="Logout"
			>
				<LogOut size={12} />
				Logout
			</button>
		</div>
	);
}

function NotificationBell() {
	const { unreadCount } = useNotifications();
	const [open, setOpen] = useState(false);

	return (
		<div className="relative">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="relative flex items-center gap-1 rounded px-1.5 py-0.5 text-[#858585] transition-colors hover:text-[#cccccc]"
				title="Notifications"
			>
				<CircleDot size={12} />
				{unreadCount > 0 && (
					<span className="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-[#ea580c] text-[8px] font-bold text-white">
						{unreadCount > 9 ? "9+" : unreadCount}
					</span>
				)}
			</button>
		</div>
	);
}

