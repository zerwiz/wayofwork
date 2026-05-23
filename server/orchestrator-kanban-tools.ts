/**
 * Kanban board & card tools for the construction work portal orchestrator.
 * Wraps the projects (boards) and tasks (cards) database directly.
 */
import { randomUUID } from "node:crypto";
import { db } from "./db";
import { getPrimaryWorkspacePath } from "./workspace-state";
import { notifyUser } from "./notifications";

const DEFAULT_COLUMNS = [
	{ id: "todo", name: "To Do" },
	{ id: "in_progress", name: "In Progress" },
	{ id: "complete", name: "Complete" },
];

// ── Boards (projects) ──

export async function kanbanListBoards(tenantId: string): Promise<string> {
	try {
		const projects = db
			.query("SELECT * FROM projects WHERE tenant_id = ? ORDER BY created_at DESC")
			.all(tenantId) as any[];
		if (!projects.length) return "kanban_list_boards: no boards found.";
		const lines = projects.map(
			(p: any) =>
				`- **${p.name}** (id: \`${p.id}\`)${p.description ? ` — ${p.description}` : ""}  status: ${p.status}`,
		);
		return `[kanban_list_boards]\n${lines.join("\n")}`;
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		return `kanban_list_boards: ${m}`;
	}
}

export async function kanbanCreateBoard(args: {
	name: string;
	description?: string;
	tenantId: string;
	userId: string;
}): Promise<string> {
	if (!args.name?.trim()) return "kanban_create_board: **name** is required.";
	try {
		const id = `proj_${Date.now()}_${randomUUID().slice(0, 8)}`;
		db.query(
			`INSERT INTO projects (id, tenant_id, name, description, status, created_by)
			 VALUES (?, ?, ?, ?, 'active', ?)`,
		).run(id, args.tenantId, args.name.trim(), args.description?.trim() || null, args.userId);
		return `kanban_create_board: ok — created board "${args.name.trim()}" (id: \`${id}\`).`;
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		return `kanban_create_board: ${m}`;
	}
}

export async function kanbanUpdateBoard(args: {
	boardId: string;
	name?: string;
	description?: string;
	status?: string;
	tenantId: string;
}): Promise<string> {
	if (!args.boardId) return "kanban_update_board: **boardId** is required.";
	try {
		const existing = db
			.query("SELECT * FROM projects WHERE id = ? AND tenant_id = ?")
			.get(args.boardId, args.tenantId) as any;
		if (!existing) return `kanban_update_board: board \`${args.boardId}\` not found.`;
		db.query(
			`UPDATE projects
			 SET name = COALESCE(?, name),
			     description = COALESCE(?, description),
			     status = COALESCE(?, status)
			 WHERE id = ? AND tenant_id = ?`,
		).run(
			args.name?.trim() || null,
			args.description?.trim() || null,
			args.status?.trim() || null,
			args.boardId,
			args.tenantId,
		);
		return `kanban_update_board: ok — updated board \`${args.boardId}\`.`;
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		return `kanban_update_board: ${m}`;
	}
}

export async function kanbanDeleteBoard(args: {
	boardId: string;
	tenantId: string;
}): Promise<string> {
	if (!args.boardId) return "kanban_delete_board: **boardId** is required.";
	try {
		const existing = db
			.query("SELECT * FROM projects WHERE id = ? AND tenant_id = ?")
			.get(args.boardId, args.tenantId) as any;
		if (!existing) return `kanban_delete_board: board \`${args.boardId}\` not found.`;
		db.query("DELETE FROM projects WHERE id = ? AND tenant_id = ?").run(
			args.boardId,
			args.tenantId,
		);
		db.query("UPDATE tasks SET project_id = NULL WHERE project_id = ?").run(args.boardId);
		return `kanban_delete_board: ok — deleted board \`${args.boardId}\` and unlinked its cards.`;
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		return `kanban_delete_board: ${m}`;
	}
}

export async function kanbanBoardTemplates(): Promise<string> {
	return [
		"[kanban_board_templates]",
		"- **construction** — Construction (columns: To Do, In Progress, Complete)",
		"- **ata** — ÄTA Workflow (columns: Identified, Documented, Reviewed, Priced, Client Approval, Executed, Completed, Invoiced)",
		"- **punch** — Punch List (columns: Identified, Assigned, Scheduled, In Progress, Resolved, Verified)",
		"- **general** — General Kanban (columns: To Do, In Progress, Complete)",
	].join("\n");
}

// ── Cards (tasks) ──

export async function kanbanListCards(args: {
	boardId: string;
	columnId?: string;
	assigneeId?: string;
	tenantId: string;
	userId: string;
}): Promise<string> {
	try {
		const isLeader = true; // orchestrator runs as system, see all
		let rows: any[];
		if (args.boardId) {
			rows = db
				.query(
					`SELECT t.*, u.username as assigned_name
					 FROM tasks t
					 LEFT JOIN users u ON t.assigned_to = u.id
					 WHERE t.tenant_id = ? AND t.project_id = ?
					 ORDER BY t.due_date ASC, t.created_at DESC`,
				)
				.all(args.tenantId, args.boardId) as any[];
		} else {
			rows = db
				.query(
					`SELECT t.*, u.username as assigned_name
					 FROM tasks t
					 LEFT JOIN users u ON t.assigned_to = u.id
					 WHERE t.tenant_id = ?
					 ORDER BY t.due_date ASC, t.created_at DESC`,
				)
				.all(args.tenantId) as any[];
		}
		if (args.columnId) {
			rows = rows.filter((r) => r.status === args.columnId);
		}
		if (args.assigneeId) {
			rows = rows.filter((r) => r.assigned_to === args.assigneeId);
		}
		if (!rows.length) return "kanban_list_cards: no cards found matching the filters.";
		const lines = rows.map((t: any) => {
			const status = t.status || "todo";
			const assignee = t.assigned_name ? `👤 ${t.assigned_name}` : "unassigned";
			const due = t.due_date ? `📅 ${t.due_date}` : "";
			return `- **${t.title}** (id: \`${t.id}\`) [${status}] ${assignee} ${due}`.trim();
		});
		return `[kanban_list_cards]\n${lines.join("\n")}`;
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		return `kanban_list_cards: ${m}`;
	}
}

export async function kanbanCreateCard(args: {
	boardId: string;
	title: string;
	description?: string;
	columnId?: string;
	priority?: string;
	assigneeId?: string;
	dueDate?: string;
	estimatedHours?: number;
	tenantId: string;
	userId: string;
}): Promise<string> {
	if (!args.title?.trim()) return "kanban_create_card: **title** is required.";
	try {
		const id = `task_${Date.now()}_${randomUUID().slice(0, 8)}`;
		db.query(
			`INSERT INTO tasks (id, tenant_id, title, description, assigned_to, project_id, status, priority, due_date, estimated_hours, created_by)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		).run(
			id,
			args.tenantId,
			args.title.trim(),
			args.description?.trim() || null,
			args.assigneeId?.trim() || null,
			args.boardId?.trim() || null,
			args.columnId?.trim() || "todo",
			args.priority?.trim() || "medium",
			args.dueDate?.trim() || null,
			args.estimatedHours ?? null,
			args.userId,
		);
		return `kanban_create_card: ok — created card "${args.title.trim()}" (id: \`${id}\`) in column "${args.columnId || "todo"}" on board \`${args.boardId}\`.`;
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		return `kanban_create_card: ${m}`;
	}
}

export async function kanbanGetCard(args: {
	cardId: string;
	tenantId: string;
}): Promise<string> {
	if (!args.cardId) return "kanban_get_card: **cardId** is required.";
	try {
		const task = db
			.query(
				`SELECT t.*, u.username as assigned_name, p.name as project_name
				 FROM tasks t
				 LEFT JOIN users u ON t.assigned_to = u.id
				 LEFT JOIN projects p ON t.project_id = p.id
				 WHERE t.id = ? AND t.tenant_id = ?`,
			)
			.get(args.cardId, args.tenantId) as any;
		if (!task) return `kanban_get_card: card \`${args.cardId}\` not found.`;
		const lines = [
			`[kanban_get_card]`,
			`Title: ${task.title}`,
			`Board: ${task.project_name || "none"} (\`${task.project_id || ""}\`)`,
			`Status: ${task.status || "todo"}`,
			`Priority: ${task.priority || "medium"}`,
			`Assignee: ${task.assigned_name || "unassigned"}`,
			`Due: ${task.due_date || "none"}`,
			`Estimated: ${task.estimated_hours ?? "none"} hours`,
			`Description: ${task.description || "(none)"}`,
		];
		return lines.join("\n");
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		return `kanban_get_card: ${m}`;
	}
}

export async function kanbanUpdateCard(args: {
	cardId: string;
	title?: string;
	description?: string;
	columnId?: string;
	priority?: string;
	assigneeId?: string;
	dueDate?: string;
	estimatedHours?: number;
	tenantId: string;
}): Promise<string> {
	if (!args.cardId) return "kanban_update_card: **cardId** is required.";
	try {
		const existing = db
			.query("SELECT * FROM tasks WHERE id = ? AND tenant_id = ?")
			.get(args.cardId, args.tenantId) as any;
		if (!existing) return `kanban_update_card: card \`${args.cardId}\` not found.`;
		db.query(
			`UPDATE tasks
			 SET title = COALESCE(?, title),
			     description = COALESCE(?, description),
			     status = COALESCE(?, status),
			     priority = COALESCE(?, priority),
			     assigned_to = COALESCE(?, assigned_to),
			     due_date = COALESCE(?, due_date),
			     estimated_hours = COALESCE(?, estimated_hours),
			     updated_at = datetime('now')
			 WHERE id = ? AND tenant_id = ?`,
		).run(
			args.title?.trim() || null,
			args.description?.trim() || null,
			args.columnId?.trim() || null,
			args.priority?.trim() || null,
			args.assigneeId?.trim() || null,
			args.dueDate?.trim() || null,
			args.estimatedHours ?? null,
			args.cardId,
			args.tenantId,
		);

		// Notify assignee if changed or updated
		const targetUserId = args.assigneeId || existing.assigned_to;
		if (targetUserId) {
			notifyUser({
				tenantId: args.tenantId,
				userId: targetUserId,
				type: "kanban",
				severity: "info",
				title: "Card Updated",
				message: `Task "${args.title || existing.title}" has been updated.`,
				link: `/kanban?card=${args.cardId}`
			}).catch(() => {});
		}

		return `kanban_update_card: ok — updated card \`${args.cardId}\`.`;
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		return `kanban_update_card: ${m}`;
	}
}

export async function kanbanDeleteCard(args: {
	cardId: string;
	tenantId: string;
}): Promise<string> {
	if (!args.cardId) return "kanban_delete_card: **cardId** is required.";
	try {
		const result = db
			.query("DELETE FROM tasks WHERE id = ? AND tenant_id = ?")
			.run(args.cardId, args.tenantId);
		if (result.changes === 0) return `kanban_delete_card: card \`${args.cardId}\` not found.`;
		return `kanban_delete_card: ok — deleted card \`${args.cardId}\`.`;
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		return `kanban_delete_card: ${m}`;
	}
}

export async function kanbanMoveCard(args: {
	cardId: string;
	columnId: string;
	tenantId: string;
}): Promise<string> {
	if (!args.cardId) return "kanban_move_card: **cardId** is required.";
	if (!args.columnId) return "kanban_move_card: **columnId** is required.";
	try {
		const existing = db
			.query("SELECT * FROM tasks WHERE id = ? AND tenant_id = ?")
			.get(args.cardId, args.tenantId) as any;
		if (!existing) return `kanban_move_card: card \`${args.cardId}\` not found.`;
		db.query("UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ? AND tenant_id = ?").run(
			args.columnId,
			args.cardId,
			args.tenantId,
		);

		// Notify assignee
		if (existing.assigned_to) {
			notifyUser({
				tenantId: args.tenantId,
				userId: existing.assigned_to,
				type: "kanban",
				severity: "info",
				title: "Task Moved",
				message: `Task "${existing.title}" moved to ${args.columnId}.`,
				link: `/kanban?card=${args.cardId}`
			}).catch(() => {});
		}

		return `kanban_move_card: ok — moved card \`${args.cardId}\` to column "${args.columnId}".`;
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		return `kanban_move_card: ${m}`;
	}
}

// ── Time logging ──

export async function kanbanLogTime(args: {
	cardId: string;
	hours: number;
	date: string;
	description?: string;
	tenantId: string;
	userId: string;
}): Promise<string> {
	if (!args.cardId) return "kanban_log_time: **cardId** is required.";
	if (!args.hours || args.hours <= 0) return "kanban_log_time: **hours** must be > 0.";
	if (!args.date) return "kanban_log_time: **date** is required (YYYY-MM-DD).";
	try {
		const task = db
			.query("SELECT project_id FROM tasks WHERE id = ? AND tenant_id = ?")
			.get(args.cardId, args.tenantId) as any;
		if (!task) return `kanban_log_time: card \`${args.cardId}\` not found.`;
		const id = `time_${Date.now()}_${randomUUID().slice(0, 8)}`;
		db.query(
			`INSERT INTO time_entries (id, tenant_id, user_id, project_id, task_id, date, hours, description, status)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
		).run(
			id,
			args.tenantId,
			args.userId,
			task.project_id,
			args.cardId,
			args.date,
			args.hours,
			args.description?.trim() || null,
		);
		return `kanban_log_time: ok — logged ${args.hours}h to card \`${args.cardId}\` on ${args.date}.`;
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		return `kanban_log_time: ${m}`;
	}
}

export async function kanbanCardTimeLogs(args: {
	cardId: string;
	tenantId: string;
}): Promise<string> {
	if (!args.cardId) return "kanban_card_time_logs: **cardId** is required.";
	try {
		const entries = db
			.query(
				`SELECT te.*, u.username
				 FROM time_entries te
				 LEFT JOIN users u ON te.user_id = u.id
				 WHERE te.task_id = ? AND te.tenant_id = ?
				 ORDER BY te.date DESC`,
			)
			.all(args.cardId, args.tenantId) as any[];
		if (!entries.length) return `kanban_card_time_logs: no time logs for card \`${args.cardId}\`.`;
		const lines = entries.map(
			(e: any) => `- ${e.date}: ${e.hours}h by ${e.username || "?"} — ${e.description || "(no description)"}`,
		);
		return `[kanban_card_time_logs for ${args.cardId}]\n${lines.join("\n")}`;
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		return `kanban_card_time_logs: ${m}`;
	}
}

// ── Worker listing ──

export async function kanbanListWorkers(tenantId: string): Promise<string> {
	try {
		const users = db
			.query("SELECT id, username, role FROM users WHERE tenant_id = ? ORDER BY username")
			.all(tenantId) as any[];
		if (!users.length) return "kanban_list_workers: no users found.";
		const lines = users.map(
			(u: any) => `- **${u.username}** (id: \`${u.id}\`) role: ${u.role}`,
		);
		return `[kanban_list_workers]\n${lines.join("\n")}`;
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		return `kanban_list_workers: ${m}`;
	}
}

// ── OpenAI tool definitions ──

export const ORCHESTRATOR_KANBAN_TOOLS_OPENAI = [
	{
		type: "function" as const,
		function: {
			name: "kanban_list_boards",
			description:
				"List all kanban boards (projects) in the workspace. Shows board name, id, description, and status.",
			parameters: { type: "object", properties: {}, required: [] },
		},
	},
	{
		type: "function" as const,
		function: {
			name: "kanban_create_board",
			description:
				"Create a new kanban board (project). Use for new construction phases, work packages, or projects. Requires **name**; optional **description**.",
			parameters: {
				type: "object",
				properties: {
					name: { type: "string", description: "Board/project name, e.g. 'Gjutning vecka 22'" },
					description: { type: "string", description: "Optional description of the board's purpose" },
				},
				required: ["name"],
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "kanban_update_board",
			description:
				"Update a kanban board's name, description, or status. Use **boardId** (from kanban_list_boards) to target the board.",
			parameters: {
				type: "object",
				properties: {
					boardId: { type: "string", description: "Board id from kanban_list_boards" },
					name: { type: "string", description: "New board name" },
					description: { type: "string", description: "New description" },
					status: { type: "string", description: "Status: active, archived" },
				},
				required: ["boardId"],
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "kanban_delete_board",
			description:
				"Delete a kanban board and unlink all its cards. Use **boardId** from kanban_list_boards. Irreversible.",
			parameters: {
				type: "object",
				properties: {
					boardId: { type: "string", description: "Board id to delete" },
				},
				required: ["boardId"],
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "kanban_board_templates",
			description:
				"List available kanban board templates for construction work: construction, ata (ÄTA workflow), punch (punch list), general.",
			parameters: { type: "object", properties: {}, required: [] },
		},
	},
	{
		type: "function" as const,
		function: {
			name: "kanban_list_cards",
			description:
				"List cards (tasks) on a kanban board. Optionally filter by **columnId** (todo, in_progress, complete) or **assigneeId** (user id from kanban_list_workers). Pass **boardId** to scope to one board, or omit for all cards.",
			parameters: {
				type: "object",
				properties: {
					boardId: { type: "string", description: "Optional board id to scope the listing" },
					columnId: { type: "string", description: "Filter by column: todo, in_progress, complete, or custom status" },
					assigneeId: { type: "string", description: "Filter by assignee user id" },
				},
				required: [],
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "kanban_create_card",
			description:
				"Create a new card (task) on a kanban board. Requires **boardId** and **title**. Optional: **description**, **columnId** (default: todo), **priority** (low, medium, high, critical), **assigneeId**, **dueDate** (YYYY-MM-DD), **estimatedHours**.",
			parameters: {
				type: "object",
				properties: {
					boardId: { type: "string", description: "Board id from kanban_list_boards" },
					title: { type: "string", description: "Card title" },
					description: { type: "string", description: "Card description" },
					columnId: { type: "string", description: "Column: todo (default), in_progress, complete, or custom" },
					priority: { type: "string", description: "Priority: low, medium (default), high, critical" },
					assigneeId: { type: "string", description: "User id from kanban_list_workers" },
					dueDate: { type: "string", description: "Due date YYYY-MM-DD" },
					estimatedHours: { type: "number", description: "Estimated hours to complete" },
				},
				required: ["boardId", "title"],
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "kanban_get_card",
			description:
				"Get full details of a single card by **cardId**. Shows title, board, status, priority, assignee, due date, estimated hours, and description.",
			parameters: {
				type: "object",
				properties: {
					cardId: { type: "string", description: "Card id from kanban_list_cards" },
				},
				required: ["cardId"],
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "kanban_update_card",
			description:
				"Update a card's title, description, column, priority, assignee, due date, or estimated hours. Pass only the fields you want to change.",
			parameters: {
				type: "object",
				properties: {
					cardId: { type: "string", description: "Card id to update" },
					title: { type: "string", description: "New title" },
					description: { type: "string", description: "New description" },
					columnId: { type: "string", description: "Move to column: todo, in_progress, complete" },
					priority: { type: "string", description: "New priority: low, medium, high, critical" },
					assigneeId: { type: "string", description: "User id to assign" },
					dueDate: { type: "string", description: "New due date YYYY-MM-DD" },
					estimatedHours: { type: "number", description: "New estimated hours" },
				},
				required: ["cardId"],
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "kanban_delete_card",
			description:
				"Delete a card by **cardId**. Irreversible. Use kanban_get_card first to confirm the correct card.",
			parameters: {
				type: "object",
				properties: {
					cardId: { type: "string", description: "Card id to delete" },
				},
				required: ["cardId"],
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "kanban_move_card",
			description:
				"Move a card to another column (change its status). Pass **cardId** and **columnId** (todo, in_progress, complete, or custom status). Shortcut for kanban_update_card when only changing column.",
			parameters: {
				type: "object",
				properties: {
					cardId: { type: "string", description: "Card id to move" },
					columnId: { type: "string", description: "Target column: todo, in_progress, complete" },
				},
				required: ["cardId", "columnId"],
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "kanban_log_time",
			description:
				"Log hours worked on a card. Requires **cardId**, **hours** (> 0), and **date** (YYYY-MM-DD). Optional **description**. The time entry is recorded as 'pending' for leader approval.",
			parameters: {
				type: "object",
				properties: {
					cardId: { type: "string", description: "Card id to log time against" },
					hours: { type: "number", description: "Hours worked (e.g. 7.5)" },
					date: { type: "string", description: "Date YYYY-MM-DD" },
					description: { type: "string", description: "What was done" },
				},
				required: ["cardId", "hours", "date"],
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "kanban_card_time_logs",
			description:
				"View all time entries logged against a card. Shows date, hours, user, and description per entry.",
			parameters: {
				type: "object",
				properties: {
					cardId: { type: "string", description: "Card id to view time logs for" },
				},
				required: ["cardId"],
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "kanban_list_workers",
			description:
				"List all workers and users in the workspace with their ids and roles. Use to get **assigneeId** for kanban_create_card or kanban_update_card.",
			parameters: { type: "object", properties: {}, required: [] },
		},
	},
] as const;
