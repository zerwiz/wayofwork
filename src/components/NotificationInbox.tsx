import React, { useState } from "react";
import { useNotifications, type Notification, type NotificationSeverity, type NotificationType } from "../contexts/NotificationContext";
import { X, AlertCircle, CheckCircle, AlertTriangle, Info, Bell, Trash2, ExternalLink } from "lucide-react";

const sevIcon: Record<string, React.ReactNode> = {
	error: <AlertCircle size={14} />,
	warning: <AlertTriangle size={14} />,
	success: <CheckCircle size={14} />,
	info: <Info size={14} />,
};

const sevColor: Record<string, string> = {
	error: "text-red-400",
	warning: "text-orange-400",
	success: "text-green-400",
	info: "text-blue-400",
};

const typeLabel: Record<string, string> = {
	approval: "Godkännande",
	deadline: "Deadline",
	mention: "Omnämnande",
	alert: "Alert",
	announcement: "Meddelande",
	security: "Säkerhet",
	weather: "Väder",
	system: "System",
	kanban: "Kanban",
};

function NotificationRow({
	notif,
	onMarkRead,
	onDelete,
	appearanceDark,
}: {
	notif: Notification;
	onMarkRead: (id: string) => void;
	onDelete: (id: string) => void;
	appearanceDark: boolean;
}) {
	const rowBg = appearanceDark ? "hover:bg-[#2d2d2d]" : "hover:bg-[#f5f5f5]";
	const titleC = notif.read ? (appearanceDark ? "text-[#858585]" : "text-[#999]") : appearanceDark ? "text-[#cccccc]" : "text-[#333]";
	const msgC = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const borderC = appearanceDark ? "border-[#3c3c3c]" : "border-[#e5e5e5]";
	const badgeBg = appearanceDark ? "bg-[#3c3c3c]" : "bg-[#e5e5e5]";
	const badgeText = appearanceDark ? "text-[#cccccc]" : "text-[#555]";

	return (
		<div
			className={`flex items-start gap-3 border-b px-4 py-3 transition-colors ${rowBg} ${borderC} ${notif.read ? "opacity-60" : ""}`}
		>
			<span className={`mt-0.5 shrink-0 ${sevColor[notif.severity] || "text-blue-400"}`}>
				{sevIcon[notif.severity] || <Bell size={14} />}
			</span>
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<p className={`text-sm font-bold truncate ${titleC}`}>{notif.title}</p>
					<span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${badgeBg} ${badgeText}`}>
						{typeLabel[notif.type] || notif.type}
					</span>
				</div>
				<p className={`mt-0.5 text-xs line-clamp-2 ${msgC}`}>{notif.message}</p>
				<div className="mt-1 flex items-center gap-3">
					<span className="text-[10px] text-[#6f6f6f]">
						{new Date(notif.created_at).toLocaleString("sv-SE")}
					</span>
					{notif.link ? (
						<a
							href={notif.link}
							className="inline-flex items-center gap-1 text-[10px] text-[#ea580c] hover:underline"
						>
							<ExternalLink size={10} /> Öppna
						</a>
					) : null}
				</div>
			</div>
			<div className="flex shrink-0 flex-col gap-1">
				{!notif.read ? (
					<button
						type="button"
						onClick={() => onMarkRead(notif.id)}
						className="rounded p-1 text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc] transition-colors"
						title="Mark as read"
					>
						<CheckCircle size={14} />
					</button>
				) : null}
				<button
					type="button"
					onClick={() => onDelete(notif.id)}
					className="rounded p-1 text-[#858585] hover:bg-[#3c3c3c] hover:text-[#f87171] transition-colors"
					title="Delete"
				>
					<Trash2 size={14} />
				</button>
			</div>
		</div>
	);
}

export function NotificationInbox({
	appearanceDark,
}: {
	appearanceDark: boolean;
}) {
	const { notifications, unreadCount, loading, markAsRead, markAllAsRead, removeNotification } = useNotifications();
	const [filter, setFilter] = useState<"all" | "unread">("all");

	const filtered = filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

	const containerBg = appearanceDark ? "bg-[#1e1e1e]" : "bg-white";
	const heading = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";
	const sub = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const card = appearanceDark ? "border-[#3c3c3c] bg-[#252526]" : "border-[#e5e5e5] bg-white shadow-sm";
	const tabBg = appearanceDark ? "bg-[#3c3c3c]" : "bg-[#e5e5e5]";
	const tabActive = appearanceDark ? "bg-[#0e639c] text-white" : "bg-[#ea580c] text-white";

	return (
		<div className={`rounded-2xl border p-6 shadow-sm ${card}`}>
			<div className="flex items-center justify-between mb-4">
				<div>
					<h3 className={`font-bold ${heading}`}>Notifications</h3>
					<p className={`text-sm mt-0.5 ${sub}`}>
						{unreadCount > 0 ? `${unreadCount} olästa` : "Inga olästa notiser"}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setFilter(filter === "all" ? "unread" : "all")}
						className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors ${filter === "all" ? tabActive : tabBg} ${appearanceDark ? "text-[#cccccc]" : "text-[#555]"}`}
					>
						{filter === "all" ? "Alla" : "Olästa"}
					</button>
					{unreadCount > 0 ? (
						<button
							type="button"
							onClick={markAllAsRead}
							className="rounded-lg bg-[#ea580c] px-3 py-1 text-xs font-bold text-white hover:bg-[#c2410c] transition-colors"
						>
							Markera alla som lästa
						</button>
					) : null}
				</div>
			</div>

			{loading && filtered.length === 0 ? (
				<div className="flex items-center justify-center py-12">
					<p className={`text-sm ${sub}`}>Laddar notiser…</p>
				</div>
			) : filtered.length === 0 ? (
				<div className="flex items-center justify-center py-12">
					<div className="text-center">
						<Bell size={32} className={`mx-auto mb-2 ${sub}`} />
						<p className={`text-sm font-medium ${sub}`}>Inga notiser</p>
						<p className={`text-xs mt-1 ${sub}`}>
							{filter === "unread" ? "Alla notiser är lästa" : "Inga notiser än."}
						</p>
					</div>
				</div>
			) : (
				<div className={`max-h-96 overflow-y-auto rounded-xl border ${card}`}>
					{filtered.map((n) => (
						<NotificationRow
							key={n.id}
							notif={n}
							onMarkRead={markAsRead}
							onDelete={removeNotification}
							appearanceDark={appearanceDark}
						/>
					))}
				</div>
			)}
		</div>
	);
}
