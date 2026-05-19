/**
 * Fan-out **Tool log** lines to all connected **chat** WebSockets (`/ws`).
 * Pi TUI streams tool events here once headless Pi owns chat; today we mirror
 * workspace + shell activity that maps to Pi-style tools (`read`, `write`, `bash`, …).
 */

export type ToolLogLevel = "INFO" | "WARN" | "ERROR" | "SUCCESS";

type LogSender = { send(data: string | ArrayBufferLike): void };

const subscribers = new Set<LogSender>();

function nowTime(): string {
	return new Date().toISOString().split("T")[1]?.slice(0, 12) ?? "";
}

export function registerChatSocketForToolLogs(ws: LogSender): void {
	subscribers.add(ws);
}

export function unregisterChatSocketForToolLogs(ws: LogSender): void {
	subscribers.delete(ws);
}

export function broadcastToolLog(level: ToolLogLevel, source: string, msg: string): void {
	const line = JSON.stringify({ type: "log", time: nowTime(), level, source, msg });
	for (const s of subscribers) {
		try {
			s.send(line);
		} catch {
			subscribers.delete(s);
		}
	}
}
