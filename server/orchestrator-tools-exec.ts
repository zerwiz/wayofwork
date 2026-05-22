/**
 * INTERIM — Bun-native workspace tools for LLM turns when **`WOP_ORCHESTRATOR_TOOLS`** is on
 * (orchestrator and workspace **`.md`** personas). Supersede with **authoritative runtime** tool events per
 * **`docs/WOP_BACKEND_WIRING_PLAN.md`**.
 */
import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { db } from "./db";
import { formatUnknownOrchestratorToolMessage } from "../shared/session-log-metadata.ts";
import { broadcastToolLog } from "./tool-log-broadcast";
import { MAX_FILE_BYTES, shouldSkipDir } from "./paths";
import { auditLog } from "./audit-logger";
import {
	ORCHESTRATOR_GIT_TOOLS_OPENAI,
	orchestratorGitWorkspaceToolsEnabled,
	orchestratorToolGitAdd,
	orchestratorToolGitBranches,
	orchestratorToolGitCheckout,
	orchestratorToolGitCommit,
	orchestratorToolGitFetch,
	orchestratorToolGitMerge,
	orchestratorToolGitPull,
	orchestratorToolGitPush,
	orchestratorToolGitRemote,
	orchestratorToolGitStatus,
	orchestratorToolWorkspaceSnapshot,
	orchestratorToolDocHistory,
	orchestratorToolDocRestore,
	orchestratorToolWorkspaceBackupStatus,
} from "./orchestrator-git-tools";
import {
	toolTeamList,
	toolTeamMemberAdd,
	toolTeamMemberRemove,
	toolTeamMemberReplace,
} from "./teams-yaml-mutate";
import { getPrimaryWorkspacePath, resolveUnderWorkspace } from "./workspace-state";
import {
	ORCHESTRATOR_KANBAN_TOOLS_OPENAI,
	kanbanListBoards,
	kanbanCreateBoard,
	kanbanUpdateBoard,
	kanbanDeleteBoard,
	kanbanBoardTemplates,
	kanbanListCards,
	kanbanCreateCard,
	kanbanGetCard,
	kanbanUpdateCard,
	kanbanDeleteCard,
	kanbanMoveCard,
	kanbanLogTime,
	kanbanCardTimeLogs,
	kanbanListWorkers,
} from "./orchestrator-kanban-tools";
import {
	ORCHESTRATOR_CHANNEL_TOOLS_OPENAI,
	toolTelegramSend,
	toolWhatsappSend,
} from "./orchestrator-channel-tools";
import { dispatchToAgent } from "./agent-dispatch";

export type OrchestratorToolResult = {
	output: string;
	agentsCatalogChanged?: boolean;
	/** Workspace-relative path after a successful **`write`** (new file or overwrite) — UI may focus the editor. */
	workspaceFileWritten?: string;
};

let orchestratorToolsRuntimeOverride: boolean | undefined;
let orchestratorBashRuntimeOverride: boolean | undefined;

/**
 * Authoritative Runtime Spine - Execute tools via authoritative CLI with --mode json
 * When enabled (WOP_CHAT_ENGINE=pi or auto with runtime on PATH), tool calls
 * are executed by the runtime instead of Bun-native implementations.
 */
export async function executeToolViaRuntime(
	toolName: string,
	args: Record<string, unknown>,
	workspacePath: string
): Promise<OrchestratorToolResult> {
	const binary = process.env.WOP_PI_BINARY || "pi";
	const timeoutMs = 30_000; // 30s timeout for tool execution

	try {
		// Build command: pi --mode json --tool <name> --args '<json>'
		const argsJson = JSON.stringify(args);
		const proc = Bun.spawn(
			[binary, "--mode", "json", "--tool", toolName, "--args", argsJson],
			{
				cwd: workspacePath,
				stdout: "pipe",
				stderr: "pipe",
				timeout: timeoutMs,
			}
		);

		const output = await new Response(proc.stdout).text();
		const stderr = await new Response(proc.stderr).text();
		const exitCode = await proc.exited;

		if (exitCode !== 0) {
			return {
				output: `Tool execution failed (exit ${exitCode}): ${stderr || output}`,
			};
		}

		// Parse JSON output
		try {
			const result = JSON.parse(output);
			return {
				output: result.output || output,
				agentsCatalogChanged: result.agentsCatalogChanged,
				workspaceFileWritten: result.workspaceFileWritten,
			};
		} catch {
			// If not JSON, return raw output
			return { output };
		}
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return { output: `Tool execution error: ${message}` };
	}
}

/**
 * Check if authoritative runtime mode is active for tool execution.
 * Returns true when WOP_CHAT_ENGINE=pi or auto with binary resolvable.
 */
export function isRuntimeToolExecutionEnabled(): boolean {
	const engine = process.env.WOP_CHAT_ENGINE?.trim().toLowerCase();
	if (engine === "pi") return true;
	if (engine === "bundled" || engine === "bun") return false;
	// auto mode: check if binary is on PATH
	if (engine === "auto" || !engine) {
		try {
			const proc = Bun.spawn(["which", "pi"], { stdout: "pipe" });
			return proc.exited === 0;
		} catch {
			return false;
		}
	}
	return false;
}

export type OrchestratorGateRuntimePatch = {
	/** Set **`true`/`false`** for this process; **`null`** clears override so **`WOP_*`** env applies again. */
	orchestratorTools?: boolean | null;
	orchestratorBash?: boolean | null;
};

/** In-memory toggles from **`POST /api/config`** (or **`POST /api/config/orchestrator-gates`**) until server restart. */
export function patchOrchestratorGateRuntime(patch: OrchestratorGateRuntimePatch): {
	orchestratorTools: boolean;
	orchestratorBash: boolean;
} {
	if (patch.orchestratorTools !== undefined) {
		orchestratorToolsRuntimeOverride =
			patch.orchestratorTools === null ? undefined : patch.orchestratorTools;
	}
	if (patch.orchestratorBash !== undefined) {
		orchestratorBashRuntimeOverride = patch.orchestratorBash === null ? undefined : patch.orchestratorBash;
	}
	return { orchestratorTools: orchestratorToolsEnabled(), orchestratorBash: orchestratorBashEnabled() };
}

/** When not `0`/`false`/`no`/`off`, orchestrator turns may use standard workspace tools (default: on). */
export function orchestratorToolsEnabled(): boolean {
	if (orchestratorToolsRuntimeOverride !== undefined) return orchestratorToolsRuntimeOverride;
	const v = process.env.WOP_ORCHESTRATOR_TOOLS?.trim().toLowerCase();
	return v !== "0" && v !== "false" && v !== "no" && v !== "off";
}

/**
 * `bash` tool (host shell, cwd = workspace). Default on when orchestrator tools run; set
 * **`WOP_ORCHESTRATOR_BASH`** to **`0`/`false`/`no`/`off`** to disable on untrusted hosts.
 */
export function orchestratorBashEnabled(): boolean {
	if (orchestratorBashRuntimeOverride !== undefined) return orchestratorBashRuntimeOverride;
	const v = process.env.WOP_ORCHESTRATOR_BASH?.trim().toLowerCase();
	return v !== "0" && v !== "false" && v !== "no" && v !== "off";
}

const MAX_GREP_BYTES = 120_000;
const MAX_LIST_ENTRIES = 200;
const BASH_TIMEOUT_MS = 28_000;
const MAX_BASH_CMD = 8_000;
/** UTF-8 write cap per call (orchestrator; keeps prompts and disk bounded). */
const MAX_WRITE_UTF8_BYTES = Math.min(MAX_FILE_BYTES, 1_048_576);

function logTool(source: string, msg: string): void {
	broadcastToolLog("INFO", source, msg);
}

async function toolRead(rel: string, offset?: number, limit?: number): Promise<string> {
	const abs = resolveUnderWorkspace(rel.replace(/^[/\\]+/, ""));
	if (!abs) return "read: path is not inside the workspace or is unsafe.";
	try {
		const st = await stat(abs);
		if (!st.isFile()) return `read: not a file: ${rel}`;
		if (st.size > MAX_FILE_BYTES) return `read: file too large (${st.size} bytes; max ${MAX_FILE_BYTES}).`;
		const raw = await readFile(abs, "utf8");
		const lines = raw.split(/\r?\n/);
		const off = Math.max(1, Math.floor(offset ?? 1));
		const lim = Math.min(500, Math.max(1, Math.floor(limit ?? 200)));
		const slice = lines.slice(off - 1, off - 1 + lim);
		const header = `[read ${rel} lines ${off}-${off + slice.length - 1} of ${lines.length}]\n`;
		return header + slice.join("\n");
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		return `read: ${m}`;
	}
}

async function toolListDir(rel: string): Promise<string> {
	const raw = rel?.trim() || ".";
	const abs =
		raw === "." || raw === ""
			? getPrimaryWorkspacePath()
			: resolveUnderWorkspace(raw.replace(/^[/\\]+/, ""));
	if (!abs) return "list_dir: path is not inside the workspace or is unsafe.";
	try {
		const st = await stat(abs);
		if (!st.isDirectory()) return `list_dir: not a directory: ${raw}`;
		const names = await readdir(abs);
		const filtered = names.filter((n) => !shouldSkipDir(n)).slice(0, MAX_LIST_ENTRIES);
		const more = names.length > filtered.length ? `\n… (${names.length - filtered.length} more entries skipped)` : "";
		return `[list_dir ${raw}]\n${filtered.sort().join("\n")}${more}`;
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		return `list_dir: ${m}`;
	}
}

async function toolWrite(rel: string, content: string): Promise<{ output: string; writtenRel?: string }> {
	const relNorm = rel.replace(/^[/\\]+/, "");
	const abs = resolveUnderWorkspace(relNorm);
	if (!abs) return { output: "write: path is not inside the workspace or is unsafe." };
	const bytes = new TextEncoder().encode(content).byteLength;
	if (bytes > MAX_WRITE_UTF8_BYTES) {
		return {
			output: `write: content too large (${bytes} bytes UTF-8; max ${MAX_WRITE_UTF8_BYTES}).`,
		};
	}
	try {
		const st = await stat(abs).catch(() => null);
		if (st?.isDirectory()) return { output: `write: path is a directory: ${rel}` };
		await mkdir(dirname(abs), { recursive: true });
		await writeFile(abs, content, "utf8");
		logTool("write", `${rel} (${bytes} bytes)`);
		return {
			output: `write: ok — ${bytes} bytes written to ${rel}`,
			writtenRel: relNorm,
		};
	} catch (e) {
		const m = e instanceof Error ? e.message : String(e);
		return { output: `write: ${m}` };
	}
}

async function toolGrep(pattern: string, relPath?: string, glob?: string): Promise<string> {
	if (!pattern?.trim()) return "grep: pattern is required.";
	const base = relPath?.trim() || ".";
	const abs =
		base === "." || base === ""
			? getPrimaryWorkspacePath()
			: resolveUnderWorkspace(base.replace(/^[/\\]+/, ""));
	if (!abs) return "grep: path is not inside the workspace or is unsafe.";
	const cwd = getPrimaryWorkspacePath();
	const args = [
		"--line-number",
		"--max-count",
		"48",
		"--max-columns",
		"240",
		"-e",
		pattern,
	];
	if (glob?.trim()) {
		args.push("--glob", glob.trim());
	}
	args.push(abs);
	return await new Promise((resolve) => {
		const child = spawn("rg", args, {
			cwd,
			stdio: ["ignore", "pipe", "pipe"],
			windowsHide: true,
		});
		let out = "";
		let err = "";
		const cap = () => {
			if (out.length > MAX_GREP_BYTES) {
				out = `${out.slice(0, MAX_GREP_BYTES)}\n…[truncated]`;
				try {
					child.kill("SIGTERM");
				} catch {
					/* ignore */
				}
			}
		};
		child.stdout?.setEncoding("utf8");
		child.stderr?.setEncoding("utf8");
		child.stdout?.on("data", (c: string) => {
			out += c;
			cap();
		});
		child.stderr?.on("data", (c: string) => {
			err += c;
		});
		const t = setTimeout(() => {
			try {
				child.kill("SIGTERM");
			} catch {
				/* ignore */
			}
		}, 22_000);
		child.on("close", (code) => {
			clearTimeout(t);
			if (code === 2) {
				resolve(`grep: rg error — ${err.trim() || "exit 2"}`);
				return;
			}
			if (code === 1 && !out) {
				resolve(`[grep pattern in ${base}]\n(no matches)`);
				return;
			}
			if (code !== 0 && code !== 1) {
				resolve(`grep: rg exited ${code} — ${err.trim() || out.slice(0, 400)}`);
				return;
			}
			resolve(`[grep in ${base}]\n${out.trim() || "(no output)"}`);
		});
		child.on("error", (e) => {
			clearTimeout(t);
			const m = e instanceof Error ? e.message : String(e);
			resolve(
				`grep: failed to spawn ripgrep (\`rg\`). Install ripgrep or use **read** on known paths. (${m})`,
			);
		});
	});
}

async function toolBash(command: string): Promise<string> {
	if (!orchestratorBashEnabled()) {
		return "bash: disabled on this server (WOP_ORCHESTRATOR_BASH is 0/false/no/off — default is enabled).";
	}
	const cmd = command?.trim();
	if (!cmd) return "bash: empty command.";
	if (cmd.length > MAX_BASH_CMD) return `bash: command too long (max ${MAX_BASH_CMD} chars).`;
	const cwd = getPrimaryWorkspacePath();
	logTool("bash", cmd.slice(0, 200) + (cmd.length > 200 ? "…" : ""));
	return await new Promise((resolve) => {
		const isWin = process.platform === "win32";
		const child = isWin
			? spawn(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", cmd], {
					cwd,
					stdio: ["ignore", "pipe", "pipe"],
					windowsHide: true,
					env: { ...process.env },
				})
			: spawn("/bin/sh", ["-c", cmd], {
					cwd,
					stdio: ["ignore", "pipe", "pipe"],
					windowsHide: true,
					env: { ...process.env, CI: process.env.CI ?? "1" },
				});
		let out = "";
		let err = "";
		const t = setTimeout(() => {
			try {
				child.kill("SIGTERM");
			} catch {
				/* ignore */
			}
		}, BASH_TIMEOUT_MS);
		child.stdout?.setEncoding("utf8");
		child.stderr?.setEncoding("utf8");
		child.stdout?.on("data", (c: string) => {
			out += c;
			if (out.length > MAX_GREP_BYTES) out = `${out.slice(0, MAX_GREP_BYTES)}\n…[truncated stdout]`;
		});
		child.stderr?.on("data", (c: string) => {
			err += c;
			if (err.length > 50_000) err = `${err.slice(0, 50_000)}\n…`;
		});
		child.on("close", (code) => {
			clearTimeout(t);
			const parts = [`[bash exit=${code ?? 0}]`, out.trim(), err.trim()].filter(Boolean);
			resolve(parts.join("\n"));
		});
		child.on("error", (e) => {
			clearTimeout(t);
			const m = e instanceof Error ? e.message : String(e);
			resolve(`bash: ${m}`);
		});
	});
}

/**
 * Run one orchestrator tool (workspace-jailed).
 * Results are plain text for the model.
 *
 * When `isRuntimeToolExecutionEnabled()` is true (WOP_CHAT_ENGINE=pi or auto with binary on PATH),
 * tool execution is delegated to the authoritative CLI via `executeToolViaRuntime()` for authoritative tool execution.
 */
export async function executeOrchestratorTool(
	name: string,
	argsJson: string,
	auth?: { tenantId: string; userId: string },
): Promise<OrchestratorToolResult> {
	let args: Record<string, unknown> = {};
	try {
		args = JSON.parse(argsJson || "{}") as Record<string, unknown>;
	} catch {
		return { output: "Invalid JSON in tool arguments." };
	}

	// AUTHORITATIVE RUNTIME SPINE: Delegate to CLI when enabled
	if (isRuntimeToolExecutionEnabled()) {
		const workspacePath = getPrimaryWorkspacePath();
		broadcastToolLog("INFO", "runtime-tool", `${name} → CLI (--mode json)`);
		return await executeToolViaRuntime(name, args, workspacePath);
	}

	const tenantId = auth?.tenantId ?? "default";
	const userId = auth?.userId ?? "system";

	switch (name) {
		case "read": {
			const path = String(args.path ?? "");
			const offset = typeof args.offset === "number" ? args.offset : undefined;
			const limit = typeof args.limit === "number" ? args.limit : undefined;
			logTool("read", path);
			auditLog({
				tenantId,
				userId,
				action: "READ",
				resourceType: "file",
				resourceId: path,
				summary: `User read file ${path}`
			});
			return { output: await toolRead(path, offset, limit) };
		}
		case "list_dir": {
			const path = String(args.path ?? ".");
			logTool("list_dir", path);
			return { output: await toolListDir(path) };
		}
		case "grep": {
			const pattern = String(args.pattern ?? "");
			const path = args.path != null ? String(args.path) : undefined;
			const glob = args.glob != null ? String(args.glob) : undefined;
			logTool("grep", `${pattern} @ ${path ?? "."}`);
			auditLog({
				tenantId,
				userId,
				action: "SEARCH",
				resourceType: "workspace",
				summary: `User searched for "${pattern}" in ${path ?? "."}`,
				details: { pattern, path, glob }
			});
			return { output: await toolGrep(pattern, path, glob) };
		}
		case "write": {
			const path = String(args.path ?? "");
			const content = typeof args.content === "string" ? args.content : "";
			const w = await toolWrite(path, content);
			return { output: w.output, ...(w.writtenRel ? { workspaceFileWritten: w.writtenRel } : {}) };
		}
		case "bash": {
			const command = String(args.command ?? "");
			return { output: await toolBash(command) };
		}
		case "team_list": {
			logTool("team_list", "");
			return { output: await toolTeamList() };
		}
		case "team_member_remove": {
			const agentName = String(args.agentName ?? "");
			const team = args.team != null ? String(args.team) : undefined;
			logTool("team_member_remove", `${team ?? "(default)"} − ${agentName}`);
			return await toolTeamMemberRemove(team, agentName);
		}
		case "team_member_add": {
			const agentName = String(args.agentName ?? "");
			const team = args.team != null ? String(args.team) : undefined;
			logTool("team_member_add", `${team ?? "(default)"} + ${agentName}`);
			return await toolTeamMemberAdd(team, agentName);
		}
		case "team_member_replace": {
			const fromAgent = String(args.fromAgent ?? "");
			const toAgent = String(args.toAgent ?? "");
			const team = args.team != null ? String(args.team) : undefined;
			logTool("team_member_replace", `${team ?? "(default)"} ${fromAgent}→${toAgent}`);
			return await toolTeamMemberReplace(team, fromAgent, toAgent);
		}
		case "git_status": {
			logTool("git_status", "");
			return { output: await orchestratorToolGitStatus() };
		}
		case "git_remote": {
			logTool("git_remote", "");
			return { output: await orchestratorToolGitRemote() };
		}
		case "git_fetch": {
			const remote = args.remote != null ? String(args.remote) : undefined;
			const prune = args.prune === true;
			logTool("git_fetch", `${remote ?? "origin"}${prune ? " --prune" : ""}`);
			return { output: await orchestratorToolGitFetch({ remote, prune }) };
		}
		case "git_pull": {
			const remote = args.remote != null ? String(args.remote) : undefined;
			const branch = args.branch != null ? String(args.branch) : undefined;
			logTool("git_pull", [remote, branch].filter(Boolean).join(" ") || "(default upstream)");
			return { output: await orchestratorToolGitPull({ remote, branch }) };
		}
		case "git_push": {
			const remote = args.remote != null ? String(args.remote) : undefined;
			const branch = args.branch != null ? String(args.branch) : undefined;
			const forceWithLease = args.forceWithLease === true;
			logTool(
				"git_push",
				`${remote ?? "origin"}${branch ? ` ${branch}` : ""}${forceWithLease ? " --force-with-lease" : ""}`,
			);
			return { output: await orchestratorToolGitPush({ remote, branch, forceWithLease }) };
		}
		case "git_branches": {
			logTool("git_branches", "");
			return { output: await orchestratorToolGitBranches() };
		}
		case "git_checkout": {
			const branch = String(args.branch ?? "");
			const createNew = args.createNew === true;
			const startPoint = args.startPoint != null ? String(args.startPoint) : undefined;
			logTool("git_checkout", `${createNew ? "-b " : ""}${branch}${startPoint ? ` ← ${startPoint}` : ""}`);
			return { output: await orchestratorToolGitCheckout({ branch, createNew, startPoint }) };
		}
		case "git_merge": {
			const ref = String(args.ref ?? "");
			const noFf = args.noFf === true;
			const commitMessage = args.commitMessage != null ? String(args.commitMessage) : undefined;
			logTool("git_merge", `${ref}${noFf ? " --no-ff" : ""}`);
			return { output: await orchestratorToolGitMerge({ ref, noFf, commitMessage }) };
		}
		case "git_add": {
			const all = args.all === true;
			const paths = Array.isArray(args.paths) ? args.paths.map((p: unknown) => String(p)) : undefined;
			logTool("git_add", all ? "all" : (paths?.join(", ") ?? ""));
			return { output: await orchestratorToolGitAdd({ paths, all }) };
		}
		case "git_commit": {
			const message = String(args.message ?? "");
			const allowEmpty = args.allowEmpty === true;
			logTool("git_commit", message.slice(0, 80) + (message.length > 80 ? "…" : ""));
			return { output: await orchestratorToolGitCommit({ message, allowEmpty }) };
		}
		// ── Kanban tools ──
		case "kanban_list_boards":
			logTool("kanban_list_boards", "");
			return { output: await kanbanListBoards(tenantId) };
		case "kanban_create_board":
			logTool("kanban_create_board", String(args.name ?? ""));
			return { output: await kanbanCreateBoard({ ...args, tenantId, userId } as any) };
		case "kanban_update_board":
			logTool("kanban_update_board", String(args.boardId ?? ""));
			return { output: await kanbanUpdateBoard({ ...args, tenantId } as any) };
		case "kanban_delete_board":
			logTool("kanban_delete_board", String(args.boardId ?? ""));
			return { output: await kanbanDeleteBoard({ ...args, tenantId } as any) };
		case "kanban_board_templates":
			logTool("kanban_board_templates", "");
			return { output: await kanbanBoardTemplates() };
		case "kanban_list_cards":
			logTool("kanban_list_cards", String(args.boardId ?? ""));
			return { output: await kanbanListCards({ ...args, tenantId, userId } as any) };
		case "kanban_create_card":
			logTool("kanban_create_card", String(args.title ?? ""));
			return { output: await kanbanCreateCard({ ...args, tenantId, userId } as any) };
		case "kanban_get_card":
			logTool("kanban_get_card", String(args.cardId ?? ""));
			return { output: await kanbanGetCard({ ...args, tenantId } as any) };
		case "kanban_update_card":
			logTool("kanban_update_card", String(args.cardId ?? ""));
			return { output: await kanbanUpdateCard({ ...args, tenantId } as any) };
		case "kanban_delete_card":
			logTool("kanban_delete_card", String(args.cardId ?? ""));
			return { output: await kanbanDeleteCard({ ...args, tenantId } as any) };
		case "kanban_move_card":
			logTool("kanban_move_card", `${args.cardId} → ${args.columnId}`);
			return { output: await kanbanMoveCard({ ...args, tenantId } as any) };
		case "kanban_log_time":
			logTool("kanban_log_time", `${args.cardId} ${args.hours}h`);
			return { output: await kanbanLogTime({ ...args, tenantId, userId } as any) };
		case "kanban_card_time_logs":
			logTool("kanban_card_time_logs", String(args.cardId ?? ""));
			return { output: await kanbanCardTimeLogs({ ...args, tenantId } as any) };
		case "kanban_list_workers":
			logTool("kanban_list_workers", "");
			return { output: await kanbanListWorkers(tenantId) };
		// ── Channel tools ──
		case "telegram_send":
			return { output: await toolTelegramSend(args as any, tenantId) };
		case "whatsapp_send":
			return { output: await toolWhatsappSend(args as any, tenantId) };
		case "dispatch_agent": {
			const name = String(args.agent ?? "");
			const task = String(args.task ?? "");
			logTool("dispatch_agent", `${name}: ${task.slice(0, 40)}…`);
			const res = await dispatchToAgent(name, task, tenantId, userId, "User");
			if (res.ok) return { output: res.output };
			return { output: `Error: ${res.error}` };
		}
		case "workspace_snapshot":
			return { output: await orchestratorToolWorkspaceSnapshot(args as any) };
		case "doc_history":
			return { output: await orchestratorToolDocHistory(args as any) };
		case "doc_restore":
			return { output: await orchestratorToolDocRestore(args as any) };
		case "workspace_backup_status":
			return { output: await orchestratorToolWorkspaceBackupStatus() };
		// ── Calendar tools ──
		case "calendar_list": {
			logTool("calendar_list", `user=${userId}`);
			const startDate = args.start_date ? String(args.start_date) : null;
			const endDate = args.end_date ? String(args.end_date) : null;
			let sql = "SELECT * FROM calendar_events WHERE tenant_id = ? AND (user_id = ? OR created_by = ?)";
			const params: unknown[] = [tenantId, userId, userId];
			if (startDate) { sql += " AND start_date >= ?"; params.push(startDate); }
			if (endDate) { sql += " AND end_date <= ?"; params.push(endDate); }
			sql += " ORDER BY start_date ASC";
			try {
				const rows = db.query(sql).all(...params);
				return { output: JSON.stringify(rows, null, 2) };
			} catch (e) {
				const m = e instanceof Error ? e.message : String(e);
				return { output: `calendar_list: ${m}` };
			}
		}
		case "calendar_create": {
			const title = String(args.title ?? "").trim();
			const startDate = String(args.start_date ?? "").trim();
			const endDate = String(args.end_date ?? "").trim();
			if (!title || !startDate || !endDate) return { output: "calendar_create: title, start_date, end_date required" };
			const description = args.description ? String(args.description) : null;
			const allDay = args.all_day === true ? 1 : 0;
			try {
				const id = `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
				db.query(`
					INSERT INTO calendar_events (id, tenant_id, user_id, project_id, title, description, start_date, end_date, all_day, created_by)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`).run(id, tenantId, userId, null, title, description, startDate, endDate, allDay, userId);
				const event = db.query("SELECT * FROM calendar_events WHERE id = ?").get(id);
				return { output: JSON.stringify(event, null, 2) };
			} catch (e) {
				const m = e instanceof Error ? e.message : String(e);
				return { output: `calendar_create: ${m}` };
			}
		}
		case "calendar_update": {
			const eventId = String(args.event_id ?? "").trim();
			if (!eventId) return { output: "calendar_update: event_id required" };
			try {
				const existing = db.query("SELECT * FROM calendar_events WHERE id = ? AND tenant_id = ?").get(eventId, tenantId) as Record<string, unknown> | null;
				if (!existing) return { output: `calendar_update: event not found: ${eventId}` };
				const title = args.title ? String(args.title) : existing.title;
				const description = args.description !== undefined ? String(args.description) : existing.description;
				const startDate = args.start_date ? String(args.start_date) : existing.start_date;
				const endDate = args.end_date ? String(args.end_date) : existing.end_date;
				const allDay = args.all_day !== undefined ? (args.all_day === true ? 1 : 0) : existing.all_day;
				db.query(`
					UPDATE calendar_events SET title = ?, description = ?, start_date = ?, end_date = ?, all_day = ?
					WHERE id = ? AND tenant_id = ?
				`).run(title, description, startDate, endDate, allDay, eventId, tenantId);
				const updated = db.query("SELECT * FROM calendar_events WHERE id = ?").get(eventId);
				return { output: JSON.stringify(updated, null, 2) };
			} catch (e) {
				const m = e instanceof Error ? e.message : String(e);
				return { output: `calendar_update: ${m}` };
			}
		}
		case "calendar_delete": {
			const delId = String(args.event_id ?? "").trim();
			if (!delId) return { output: "calendar_delete: event_id required" };
			try {
				const existing = db.query("SELECT * FROM calendar_events WHERE id = ? AND tenant_id = ?").get(delId, tenantId) as Record<string, unknown> | null;
				if (!existing) return { output: `calendar_delete: event not found: ${delId}` };
				db.query("DELETE FROM calendar_events WHERE id = ? AND tenant_id = ?").run(delId, tenantId);
				return { output: `calendar_delete: ok — deleted ${delId}` };
			} catch (e) {
				const m = e instanceof Error ? e.message : String(e);
				return { output: `calendar_delete: ${m}` };
			}
		}
		default:
			return {
				output: formatUnknownOrchestratorToolMessage(name),
			};
	}
}

/** OpenAI /v1 `tools` array for orchestrator turns (standard names; subset of authoritative built-ins). */
export const ORCHESTRATOR_TOOLS_OPENAI = [
	{
		type: "function" as const,
		function: {
			name: "read",
			description:
				"Read a UTF-8 text file under the Way of Work workspace. Path is relative to workspace root.",
			parameters: {
				type: "object",
				properties: {
					path: { type: "string", description: "Relative file path, e.g. .wo/agents/teams.yaml" },
					offset: { type: "integer", description: "1-based starting line (optional)" },
					limit: { type: "integer", description: "Max lines to return (optional, default 200, max 500)" },
				},
				required: ["path"],
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "list_dir",
			description: "List files and subdirectories one level deep. Path relative to workspace.",
			parameters: {
				type: "object",
				properties: {
					path: { type: "string", description: "Directory path, or . for workspace root" },
				},
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "grep",
			description:
				"Search with ripgrep (`rg`) under a workspace path. Requires `rg` on the server PATH.",
			parameters: {
				type: "object",
				properties: {
					pattern: { type: "string", description: "Ripgrep pattern (literal or regex per rg)" },
					path: { type: "string", description: "File or directory relative to workspace (default .)" },
					glob: { type: "string", description: "Optional glob filter, e.g. *.md" },
				},
				required: ["pattern"],
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "write",
			description:
				"Create or overwrite a UTF-8 text file under the workspace. Creates parent directories. Path is relative to workspace root.",
			parameters: {
				type: "object",
				properties: {
					path: { type: "string", description: "Relative file path, e.g. docs/hello.md" },
					content: { type: "string", description: "Full new file contents (UTF-8)" },
				},
				required: ["path", "content"],
			},
		},
	},
	{
		function: {
			name: "team_list",
			description:
				"Team management parity: list teams from `.wo/agents/teams.yaml` (primary workspace) and all scanned agent definition names. Call before add/remove/replace to pick valid team and agent ids.",
			parameters: { type: "object", properties: {} },
		},
	},
	{
		type: "function" as const,
		function: {
			name: "team_member_add",
			description:
				"Add a roster member to a team in `teams.yaml` (must match an existing agent `.md` name). Persists to disk; UI refreshes automatically.",
			parameters: {
				type: "object",
				properties: {
					team: {
						type: "string",
						description:
							"YAML team key (e.g. full, ralph). Omit to use the alphabetically first team (standard default-team style).",
					},					agentName: { type: "string", description: "Agent frontmatter `name` (e.g. scout, planner)" },
				},
				required: ["agentName"],
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "team_member_remove",
			description:
				"Remove a member from a team in `teams.yaml`. Cannot remove the last member of a team. Persists to disk.",
			parameters: {
				type: "object",
				properties: {
					team: { type: "string", description: "YAML team key; omit = first team alphabetically" },
					agentName: { type: "string", description: "Agent name to remove from the roster" },
				},
				required: ["agentName"],
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "team_member_replace",
			description: "Replace one roster slot (fromAgent → toAgent) in `teams.yaml`. Target agent must exist in the scan.",
			parameters: {
				type: "object",
				properties: {
					team: { type: "string", description: "YAML team key; omit = first team alphabetically" },
					fromAgent: { type: "string", description: "Current roster member to replace" },
					toAgent: { type: "string", description: "New agent name (must exist as .md definition)" },
				},
				required: ["fromAgent", "toAgent"],
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "bash",
			description:
				"Run a non-interactive shell command in the workspace root. Default on; the server can disable with WOP_ORCHESTRATOR_BASH=0/false/no/off.",
			parameters: {
				type: "object",
				properties: {
					command: { type: "string", description: "Single shell command string" },
				},
				required: ["command"],
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "calendar_list",
			description:
				"List calendar events for the current user. Optionally filter by start_date and/or end_date (ISO 8601, e.g. 2026-05-22 or 2026-05-22T12:00:00).",
			parameters: {
				type: "object",
				properties: {
					start_date: { type: "string", description: "Optional start date filter (ISO 8601)" },
					end_date: { type: "string", description: "Optional end date filter (ISO 8601)" },
				},
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "calendar_create",
			description:
				"Create a calendar event for the current user. Requires title, start_date, and end_date (ISO 8601). Optionally set description and all_day.",
			parameters: {
				type: "object",
				properties: {
					title: { type: "string", description: "Event title" },
					start_date: { type: "string", description: "Start date/time (ISO 8601, e.g. 2026-05-22T12:00:00)" },
					end_date: { type: "string", description: "End date/time (ISO 8601, e.g. 2026-05-22T13:00:00)" },
					description: { type: "string", description: "Optional event description" },
					all_day: { type: "boolean", description: "Whether this is an all-day event" },
				},
				required: ["title", "start_date", "end_date"],
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "calendar_update",
			description:
				"Update an existing calendar event by event_id. Only provided fields are updated. Returns the updated event.",
			parameters: {
				type: "object",
				properties: {
					event_id: { type: "string", description: "The event ID to update" },
					title: { type: "string", description: "New title" },
					start_date: { type: "string", description: "New start date/time (ISO 8601)" },
					end_date: { type: "string", description: "New end date/time (ISO 8601)" },
					description: { type: "string", description: "New description" },
					all_day: { type: "boolean", description: "Whether this is an all-day event" },
				},
				required: ["event_id"],
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "calendar_delete",
			description:
				"Delete a calendar event by event_id. Only the event owner can delete their events.",
			parameters: {
				type: "object",
				properties: {
					event_id: { type: "string", description: "The event ID to delete" },
				},
				required: ["event_id"],
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "dispatch_agent",
			description: "Dispatch a specific task to a specialized sub-agent (e.g. fakturering, projektledare, ata).",
			parameters: {
				type: "object",
				properties: {
					agent: { type: "string", description: "Name of the sub-agent to dispatch." },
					task: { type: "string", description: "Clear description of the task to perform." },
				},
				required: ["agent", "task"],
			},
		},
	},
];

/** Tools sent to the LLM (omit `bash` when disabled via env). */
export function orchestratorToolsForLlm(): (typeof ORCHESTRATOR_TOOLS_OPENAI)[number][] {
	const base = orchestratorBashEnabled()
		? [...ORCHESTRATOR_TOOLS_OPENAI]
		: ORCHESTRATOR_TOOLS_OPENAI.filter((t) => t.function.name !== "bash");
	const kanban = [...ORCHESTRATOR_KANBAN_TOOLS_OPENAI] as unknown as (typeof ORCHESTRATOR_TOOLS_OPENAI)[number][];
	const channel = [...ORCHESTRATOR_CHANNEL_TOOLS_OPENAI] as unknown as (typeof ORCHESTRATOR_TOOLS_OPENAI)[number][];
	if (!orchestratorGitWorkspaceToolsEnabled()) return [...base, ...kanban, ...channel];
	return [
		...base,
		...kanban,
		...channel,
		...(ORCHESTRATOR_GIT_TOOLS_OPENAI as unknown as (typeof ORCHESTRATOR_TOOLS_OPENAI)[number][]),
	];
}
