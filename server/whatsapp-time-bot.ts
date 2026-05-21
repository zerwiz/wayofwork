/**
 * WhatsApp Time Workbot — parse natural language time entries from WhatsApp messages
 * and create time_entries in the database.
 *
 * Designed to run as a handler when a WhatsApp message arrives at a bot account
 * labelled "time_bot".
 */
import { db } from "./db";

export interface TimeParseResult {
	hours: number;
	description: string;
	projectId?: string;
	taskId?: string;
	date?: string;
}

/**
 * Naive natural-language time entry parser.
 * Supports:
 *   - "Xh on <description>" / "X hours <description>"
 *   - "worked X:Y to A:B on <description>"
 *   - "<hours> <project-name>" (match by project name)
 *   - "<hours> <description> #<project-id>"
 */
export function parseTimeText(text: string, tenantId: string): TimeParseResult | null {
	const t = text.trim().toLowerCase();

	// "Xh on <description>" or "X hours <description>"
	const hoursMatch = t.match(/^(\d+(?:\.\d+)?)\s*h(?:ours?)?\s+(?:on\s+)?(.+)/);
	if (hoursMatch) {
		const hours = parseFloat(hoursMatch[1]);
		if (isNaN(hours) || hours <= 0 || hours > 24) return null;
		let description = hoursMatch[2].trim();
		let projectId: string | undefined;
		// Check for #project-id suffix
		const pidMatch = description.match(/\s+#([a-zA-Z0-9_-]+)$/);
		if (pidMatch) {
			projectId = pidMatch[1];
			description = description.replace(/\s+#[a-zA-Z0-9_-]+$/, "").trim();
		}
		return { hours, description, projectId, date: todayDate() };
	}

	// "worked X:Y to A:B on <description>" 
	const rangeMatch = t.match(/^worked\s+(\d{1,2}):(\d{2})\s*(?:to|-)\s*(\d{1,2}):(\d{2})\s+(?:on\s+)?(.+)/);
	if (rangeMatch) {
		const startH = parseInt(rangeMatch[1]);
		const startM = parseInt(rangeMatch[2]);
		const endH = parseInt(rangeMatch[3]);
		const endM = parseInt(rangeMatch[4]);
		const hours = (endH + endM / 60) - (startH + startM / 60);
		if (isNaN(hours) || hours <= 0 || hours > 24) return null;
		let description = rangeMatch[5].trim();
		return { hours: Math.round(hours * 100) / 100, description, date: todayDate() };
	}

	// "<hours> <project-name>" — try to match project by name
	const projMatch = t.match(/^(\d+(?:\.\d+)?)\s*h(?:ours?)?\s+(.+)/);
	if (projMatch) {
		const hours = parseFloat(projMatch[1]);
		if (isNaN(hours) || hours <= 0 || hours > 24) return null;
		const projName = projMatch[2].trim();
		// Look up project by name
		try {
			const project = db.query(
				"SELECT id FROM projects WHERE tenant_id = ? AND LOWER(name) = ? LIMIT 1"
			).get(tenantId, projName) as { id: string } | undefined;
			if (project) {
				return { hours, description: projName, projectId: project.id, date: todayDate() };
			}
		} catch { /* ignore lookup failure */ }
		return { hours, description: projName, date: todayDate() };
	}

	return null;
}

function todayDate(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface TimeLogResult {
	ok: boolean;
	entryId?: string;
	hours?: number;
	description?: string;
	error?: string;
}

/**
 * Log a time entry for a user. Creates time_entries row and returns confirmation.
 */
export function logTimeEntry(
	tenantId: string,
	userId: string,
	parsed: TimeParseResult,
): TimeLogResult {
	try {
		const id = `te_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
		db.query(`
			INSERT INTO time_entries (id, tenant_id, user_id, project_id, task_id, date, hours, description, status)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved')
		`).run(
			id,
			tenantId,
			userId,
			parsed.projectId || null,
			parsed.taskId || null,
			parsed.date || todayDate(),
			parsed.hours,
			parsed.description,
		);
		return { ok: true, entryId: id, hours: parsed.hours, description: parsed.description };
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return { ok: false, error: message };
	}
}

/**
 * Get today's total logged hours for a user.
 */
export function getTodayHours(tenantId: string, userId: string): number {
	try {
		const row = db.query(
			"SELECT COALESCE(SUM(hours), 0) as total FROM time_entries WHERE tenant_id = ? AND user_id = ? AND date = ?"
		).get(tenantId, userId, todayDate()) as { total: number };
		return row.total;
	} catch {
		return 0;
	}
}

/**
 * Handle an incoming WhatsApp message for time tracking.
 * Returns a response text to send back to the user.
 */
export function handleTimeBotMessage(
	tenantId: string,
	userId: string,
	messageText: string,
	userName: string,
): string {
	const trimmed = messageText.trim().toLowerCase();

	// Command: "status" — today's hours
	if (trimmed === "status" || trimmed === "today" || trimmed === "summary") {
		const total = getTodayHours(tenantId, userId);
		return `📊 *Time summary for ${userName}*\nToday: *${total}h* logged`;
	}

	// Command: "tasks" — assigned tasks
	if (trimmed === "tasks" || trimmed === "my tasks" || trimmed === "assigned") {
		try {
			const tasks = db.query(`
				SELECT t.title, p.name as project_name, t.status
				FROM tasks t
				LEFT JOIN projects p ON t.project_id = p.id
				WHERE t.tenant_id = ? AND t.assigned_to = ?
				ORDER BY t.created_at DESC
				LIMIT 10
			`).all(tenantId, userId) as any[];
			if (tasks.length === 0) return "✅ No tasks assigned to you.";
			const lines = tasks.map((t: any) => `• ${t.title} (${t.project_name ?? "No project"}) — ${t.status}`);
			return `📋 *Your tasks:*\n${lines.join("\n")}`;
		} catch {
			return "Could not fetch tasks.";
		}
	}

	// "help" command
	if (trimmed === "help" || trimmed === "commands") {
		return [
			"🤖 *Time Bot Commands*",
			"",
			"`4h on roof repair` — log 4 hours",
			"`3.5h project-name` — log with project match",
			"`worked 8:00 to 12:30 on site` — log by time range",
			"`status` — today's hours",
			"`tasks` — my assigned tasks",
			"`help` — this message",
		].join("\n");
	}

	// Try to parse as time entry
	const parsed = parseTimeText(messageText, tenantId);
	if (parsed) {
		const result = logTimeEntry(tenantId, userId, parsed);
		if (result.ok) {
			const projectLabel = parsed.projectId ? ` (linked to project)` : "";
			return `✅ *Logged:* ${result.hours}h — "${result.description}"${projectLabel}`;
		}
		return `❌ Failed to log time: ${result.error}`;
	}

	return [
		"🤔 Didn't understand that. Try:",
		"`4h on roof repair` to log time",
		"`status` to see today's hours",
		"`help` for all commands",
	].join("\n");
}
