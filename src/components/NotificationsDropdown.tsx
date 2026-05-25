import { AlertTriangle, CheckCircle2, CircleDot, X } from "lucide-react";
import { useMemo, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNotifications, type Notification } from "../contexts/NotificationContext";

function relativeTime(isoTimestamp: string): string {
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHr = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHr / 24);

  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}

function NotificationItem({ notification, onClose }: { notification: Notification; onClose: () => void }) {
    const icon = useMemo(() => {
        switch (notification.type) {
            case "alert":
            case "security":
            case "weather":
                return <AlertTriangle size={16} className="text-yellow-500" />;
            case "approval":
                return <CheckCircle2 size={16} className="text-blue-500" />;
            default:
                return <CircleDot size={16} className="text-gray-500" />;
        }
    }, [notification.type]);

    return (
        <div className="flex items-start gap-2 p-3 hover:bg-[#2a2a2a]">
            <div className="mt-1 shrink-0">{icon}</div>
            <div className="flex-1">
                <p className="text-[13px] text-white">{notification.title}</p>
                <p className="text-[11px] text-[#858585]">{notification.message}</p>
                <p className="text-[10px] text-[#585858] mt-1">{relativeTime(notification.created_at)}</p>
            </div>
            <button
                type="button"
                onClick={onClose}
                className="ml-2 p-1 rounded hover:bg-[#3c3c3c] text-[#858585] hover:text-white"
                title="Dismiss notification"
            >
                <X size={14} />
            </button>
        </div>
    );
}

export function NotificationsDropdown({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { notifications, markAsRead, removeNotification } = useNotifications();
    const dropdownRef = useRef<HTMLDivElement>(null);

    const visibleNotifications = useMemo(() => {
        // Sort by unread first, then by date
        return [...notifications]
            .sort((a, b) => {
                if (a.read === b.read) {
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                }
                return a.read ? 1 : -1;
            })
            .slice(0, 10); // Show up to 10 notifications
    }, [notifications]);

    useEffect(() => {
        if (!open) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [open, onClose]);

    if (!open) return null;

    return createPortal(
        <div
            ref={dropdownRef}
            className="absolute right-0 top-full z-50 mt-1 w-[320px] rounded-md border border-[#454545] bg-[#1e1e1e] shadow-xl"
        >
            <div className="flex items-center justify-between border-b border-[#2a2a2a] p-3">
                <h3 className="text-[13px] font-bold text-white">Notifications</h3>
                <button
                    type="button"
                    onClick={() => {
                        notifications.forEach(n => markAsRead(n.id));
                        onClose();
                    }}
                    className="text-[11px] text-[#858585] hover:text-white"
                >
                    Mark all as read
                </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
                {visibleNotifications.length === 0 ? (
                    <p className="p-3 text-[12px] text-[#858585]">No new notifications.</p>
                ) : (
                    visibleNotifications.map((n) => (
                        <NotificationItem
                            key={n.id}
                            notification={n}
                            onClose={() => removeNotification(n.id)}
                        />
                    ))
                )}
            </div>
        </div>,
        document.body
    );
}