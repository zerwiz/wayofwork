import React, { useState, useEffect, useCallback } from "react";
import { useNotifications, type Notification } from "../contexts/NotificationContext";
import { X, AlertCircle, CheckCircle, AlertTriangle, Info, Bell } from "lucide-react";

const severityConfig: Record<string, { icon: React.ReactNode; border: string; bg: string }> = {
	error: { icon: <AlertCircle size={16} />, border: "border-red-500", bg: "bg-red-500/10" },
	warning: { icon: <AlertTriangle size={16} />, border: "border-orange-500", bg: "bg-orange-500/10" },
	success: { icon: <CheckCircle size={16} />, border: "border-green-500", bg: "bg-green-500/10" },
	info: { icon: <Info size={16} />, border: "border-blue-500", bg: "bg-blue-500/10" },
};

function SingleToast({ notif, onDismiss }: { notif: Notification; onDismiss: (id: string) => void }) {
	const cfg = severityConfig[notif.severity] || severityConfig.info;
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const t = requestAnimationFrame(() => setVisible(true));
		return () => cancelAnimationFrame(t);
	}, []);

	useEffect(() => {
		const t = setTimeout(() => {
			setVisible(false);
			setTimeout(() => onDismiss(notif.id), 300);
		}, 5000);
		return () => clearTimeout(t);
	}, [notif.id, onDismiss]);

	return (
		<div
			className={`flex items-start gap-3 rounded-lg border p-3 shadow-lg transition-all duration-300 ${
				visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
			} ${cfg.bg} border-[#3c3c3c] bg-[#252526]`}
			style={{ minWidth: 320, maxWidth: 420 }}
		>
			<span className="mt-0.5 shrink-0">{cfg.icon}</span>
			<div className="flex-1 min-w-0">
				<p className="text-sm font-bold text-[#cccccc] truncate">{notif.title}</p>
				<p className="text-xs text-[#858585] mt-0.5 line-clamp-2">{notif.message}</p>
			</div>
			<button
				type="button"
				onClick={() => { setVisible(false); setTimeout(() => onDismiss(notif.id), 300); }}
				className="shrink-0 text-[#858585] hover:text-[#cccccc] transition-colors"
			>
				<X size={14} />
			</button>
		</div>
	);
}

export function NotificationToast() {
	const { notifications, markAsRead, refresh } = useNotifications();
	const [dismissed, setDismissed] = useState<Set<string>>(new Set());
	const [visibleNotifs, setVisibleNotifs] = useState<Notification[]>([]);

	const unread = notifications.filter((n) => !n.read && !dismissed.has(n.id));

	useEffect(() => {
		if (unread.length === 0) {
			setVisibleNotifs([]);
			return;
		}
		setVisibleNotifs(unread.slice(0, 3));
	}, [unread.length]);

	const onDismiss = useCallback((id: string) => {
		setDismissed((prev) => new Set(prev).add(id));
		markAsRead(id);
	}, [markAsRead]);

	if (visibleNotifs.length === 0) return null;

	return (
		<div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
			{visibleNotifs.map((n) => (
				<SingleToast key={n.id} notif={n} onDismiss={onDismiss} />
			))}
		</div>
	);
}
