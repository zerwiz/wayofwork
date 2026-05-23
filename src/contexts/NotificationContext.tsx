import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { apiGet } from "../api/client";

export type NotificationType = "approval" | "deadline" | "mention" | "alert" | "announcement" | "security" | "weather" | "system" | "kanban";
export type NotificationSeverity = "info" | "success" | "warning" | "error";

export interface Notification {
	id: string;
	tenant_id: string;
	user_id: string;
	type: NotificationType;
	severity: NotificationSeverity;
	title: string;
	message: string;
	read: number;
	link: string | null;
	created_at: string;
}

interface NotificationContextType {
	notifications: Notification[];
	unreadCount: number;
	loading: boolean;
	refresh: () => Promise<void>;
	markAsRead: (id: string) => Promise<void>;
	markAllAsRead: () => Promise<void>;
	removeNotification: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const POLL_INTERVAL = 30000;

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [loading, setLoading] = useState(false);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const fetchNotifications = useCallback(async () => {
		try {
			setLoading(true);
			const data = await apiGet<{ notifications: Notification[]; unreadCount: number }>("/api/notifications?limit=100");
			setNotifications(data.notifications);
		} catch {
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchNotifications();
		intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL);
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [fetchNotifications]);

	const unreadCount = notifications.filter((n) => !n.read).length;

	const markAsRead = useCallback(async (id: string) => {
		setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: 1 } : n)));
		try {
			await fetch(`/api/notifications/${id}/read`, { method: "PATCH", headers: { Authorization: `Bearer ${localStorage.getItem("wop_token")}` } });
		} catch {}
	}, []);

	const markAllAsRead = useCallback(async () => {
		setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 })));
		try {
			await fetch("/api/notifications/read-all", { method: "PATCH", headers: { Authorization: `Bearer ${localStorage.getItem("wop_token")}` } });
		} catch {}
	}, []);

	const removeNotification = useCallback(async (id: string) => {
		setNotifications((prev) => prev.filter((n) => n.id !== id));
		try {
			await fetch(`/api/notifications/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${localStorage.getItem("wop_token")}` } });
		} catch {}
	}, []);

	return (
		<NotificationContext.Provider
			value={{
				notifications,
				unreadCount,
				loading,
				refresh: fetchNotifications,
				markAsRead,
				markAllAsRead,
				removeNotification,
			}}
		>
			{children}
		</NotificationContext.Provider>
	);
};

export const useNotifications = () => {
	const context = useContext(NotificationContext);
	if (context === undefined) {
		throw new Error("useNotifications must be used within a NotificationProvider");
	}
	return context;
};
