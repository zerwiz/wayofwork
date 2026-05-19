/**
 * INTERIM — Bun orchestrator Git helpers (github.com HTTPS PAT from `.wayofpi/github-credentials.json`).
 * Prefer headless Pi for long-term parity; see **`docs/WOP_PI_BACKEND_WIRING_PLAN.md`**.
 */
import { broadcastToolLog } from "./tool-log-broadcast";
import { gitStatusMap, gitWorktreeSnapshot } from "./git";
import { readGithubTokenForGit } from "./github-connection";
import { getPrimaryWorkspacePath, resolveUnderWorkspace } from "./workspace-state";

const MAX_GIT_COMBINED_OUT = 120_000;
const GIT_NET_TIMEOUT_MS = 90_000;

function orchestratorToolsEnabledInline(): boolean {
	const v = process.env.WOP_ORCHESTRATOR_TOOLS?.trim().toLowerCase();
	return v !== "0" && v !== "false" && v !== "no" && v !== "off";
}

/** When unset, Git tools follow **`WOP_ORCHESTRATOR_TOOLS`**. Set to 0/false/no/off to hide them. */
export function orchestratorGitWorkspaceToolsEnabled(): boolean {
	if (!orchestratorToolsEnabledInline()) return false;
	const v = process.env.WOP_ORCHESTRATOR_GIT_TOOLS?.trim().toLowerCase();
	if (v === "0" || v === "false" || v === "no" || v === "off") return false;
	return true;
}

function logGit(source: string, msg: string): void {
	broadcastToolLog("INFO", source, msg);
}

/** Branch / remote-tracking ref segment we pass to `git` (no shell metacharacters). */
function assertSafeGitRef(raw: string): string | null {
	const s = raw.trim();
	if (!s || s.length > 200) return null;
	if (s.includes("..")) return null;
	if (!/^[a-zA-Z0-9/._@-]+$/.test(s)) return null;
	return s;
}

async function runGitLocal(cwd: string, gitRest: string[], logLine: string): Promise<{ code: number; combined: string }> {
	return runGitArgv(["git", "-C", cwd, ...gitRest], logLine);
}

async function runGitArgv(
	args: string[],
	logLine: string,
): Promise<{ code: number; combined: string }> {
	const proc = Bun.spawn(args, {
		stdout: "pipe",
		stderr: "pipe",
	});
	const killTimer = setTimeout(() => {
		try {
			proc.kill("SIGTERM");
		} catch {
			/* ignore */
		}
	}, GIT_NET_TIMEOUT_MS);
	let out = "";
	let err = "";
	try {
		out = await new Response(proc.stdout).text();
		err = await new Response(proc.stderr).text();
	} finally {
		clearTimeout(killTimer);
	}
	const code = await proc.exited;
	let combined = [out.trim(), err.trim()].filter(Boolean).join("\n");
	if (combined.length > MAX_GIT_COMBINED_OUT) {
		combined = `${combined.slice(0, MAX_GIT_COMBINED_OUT)}\n…[truncated]`;
	}
	logGit("git", logLine);
	return { code, combined: combined || `(no output, exit ${code})` };
}

function buildGitSpawnArgs(cwd: string, token: string | null, rest: string[]): string[] {
	const argv = ["git"];
	if (token) {
		const b64 = Buffer.from(`x-access-token:${token}`, "utf8").toString("base64");
		argv.push("-c", `http.https://github.com/.extraheader=AUTHORIZATION: basic ${b64}`);
	}
	argv.push("-C", cwd, ...rest);
	return argv;
}

export async function orchestratorToolGitStatus(): Promise<string> {
	const cwd = getPrimaryWorkspacePath();
	const snap = await gitWorktreeSnapshot(cwd);
	if (!snap.isRepo) {
		return [
			"git_status: no Git worktree at the primary workspace folder.",
			"If the UI says “No Git repository detected”, open the repository root (the folder that contains `.git`) or a subdirectory inside that clone — not a parent directory above the repo.",
		].join("\n");
	}
	if (snap.error) {
		return `git_status: ${snap.error}`;
	}
	const map = await gitStatusMap(cwd);
	const keys = Object.keys(map).sort();
	const lines = keys.slice(0, 120).map((k) => `${map[k]}\t${k}`);
	const more = keys.length > 120 ? `\n… (${keys.length - 120} more paths)` : "";
	return [
		`branch: ${snap.branch ?? "?"}`,
		`repo_top: ${snap.topLevel ?? "?"}`,
		"porcelain:",
		lines.join("\n") || "(clean)",
		more,
	].join("\n");
}

export async function orchestratorToolGitRemote(): Promise<string> {
	const cwd = getPrimaryWorkspacePath();
	const { code, combined } = await runGitArgv(
		["git", "-C", cwd, "remote", "-v"],
		`git remote -v (cwd=${cwd})`,
	);
	if (code !== 0) return `git_remote: exit ${code}\n${combined}`;
	return `[git_remote]\n${combined}`;
}

export async function orchestratorToolGitFetch(args: {
	remote?: string;
	prune?: boolean;
}): Promise<string> {
	const cwd = getPrimaryWorkspacePath();
	const token = await readGithubTokenForGit();
	const remote = typeof args.remote === "string" && args.remote.trim() ? args.remote.trim() : "origin";
	const rest = ["fetch", remote];
	if (args.prune === true) rest.push("--prune");
	const argv = buildGitSpawnArgs(cwd, token, rest);
	const { code, combined } = await runGitArgv(argv, `git fetch ${remote}`);
	if (code !== 0) {
		const hint = !token
			? "\n(hint: connect GitHub in Way of Pi Settings if this remote is a private github.com HTTPS repo.)"
			: "";
		return `git_fetch: exit ${code}\n${combined}${hint}`;
	}
	return `git_fetch: ok\n${combined}`;
}

export async function orchestratorToolGitPull(args: { remote?: string; branch?: string }): Promise<string> {
	const cwd = getPrimaryWorkspacePath();
	const token = await readGithubTokenForGit();
	const remote = typeof args.remote === "string" && args.remote.trim() ? args.remote.trim() : "";
	const branch = typeof args.branch === "string" && args.branch.trim() ? args.branch.trim() : "";
	if (branch && !remote) {
		return "git_pull: pass **remote** when you pass **branch** (e.g. remote `origin`, branch `main`).";
	}
	const rest = ["pull", "--ff-only"];
	if (remote) rest.push(remote);
	if (branch) rest.push(branch);
	const argv = buildGitSpawnArgs(cwd, token, rest);
	const label =
		rest.length <= 2 ? "git pull --ff-only" : `git pull --ff-only ${rest.slice(2).join(" ")}`;
	const { code, combined } = await runGitArgv(argv, label);
	if (code !== 0) {
		const hint = !token
			? "\n(hint: Settings → GitHub adds a PAT for private github.com HTTPS remotes.)"
			: "";
		return `git_pull: exit ${code}\n${combined}${hint}`;
	}
	return `git_pull: ok\n${combined}`;
}

export async function orchestratorToolGitPush(args: {
	remote?: string;
	branch?: string;
	forceWithLease?: boolean;
}): Promise<string> {
	const cwd = getPrimaryWorkspacePath();
	const token = await readGithubTokenForGit();
	const remote = typeof args.remote === "string" && args.remote.trim() ? args.remote.trim() : "origin";
	const branch = typeof args.branch === "string" && args.branch.trim() ? args.branch.trim() : "";
	const rest: string[] = ["push"];
	if (args.forceWithLease === true) rest.push("--force-with-lease");
	if (branch) rest.push("-u");
	rest.push(remote);
	if (branch) rest.push(branch);
	const argv = buildGitSpawnArgs(cwd, token, rest);
	const label = `git push${branch ? " -u" : ""} ${remote}${branch ? ` ${branch}` : ""}${args.forceWithLease ? " --force-with-lease" : ""}`;
	const { code, combined } = await runGitArgv(argv, label);
	if (code !== 0) {
		const hint = !token
			? "\n(hint: Settings → GitHub adds a PAT for github.com HTTPS push.)"
			: "";
		return `git_push: exit ${code}\n${combined}${hint}`;
	}
	return `git_push: ok\n${combined}`;
}

export async function orchestratorToolGitBranches(): Promise<string> {
	const cwd = getPrimaryWorkspacePath();
	const { code, combined } = await runGitLocal(cwd, ["branch", "-a", "-vv"], `git branch -a -vv (cwd=${cwd})`);
	if (code !== 0) return `git_branches: exit ${code}\n${combined}`;
	const cap = 4000;
	const body = combined.length > cap ? `${combined.slice(0, cap)}\n…[truncated]` : combined;
	return `git_branches: ok\n${body}`;
}

export async function orchestratorToolGitCheckout(args: {
	branch: string;
	createNew?: boolean;
	startPoint?: string;
}): Promise<string> {
	const cwd = getPrimaryWorkspacePath();
	const branch = assertSafeGitRef(args.branch);
	if (!branch) {
		return "git_checkout: invalid **branch** (use letters, digits, /, ., _, -, @ only; max 200 chars; no `..`).";
	}
	const start =
		args.startPoint != null && String(args.startPoint).trim()
			? assertSafeGitRef(String(args.startPoint))
			: null;
	if (args.startPoint != null && String(args.startPoint).trim() && !start) {
		return "git_checkout: invalid **startPoint** ref.";
	}
	const rest: string[] = ["checkout"];
	if (args.createNew === true) {
		rest.push("-b", branch);
		if (start) rest.push(start);
	} else {
		rest.push(branch);
	}
	const label =
		args.createNew === true
			? `git checkout -b ${branch}${start ? ` ${start}` : ""}`
			: `git checkout ${branch}`;
	const { code, combined } = await runGitLocal(cwd, rest, `${label} (cwd=${cwd})`);
	if (code !== 0) return `git_checkout: exit ${code}\n${combined}`;
	return `git_checkout: ok\n${combined}`;
}

export async function orchestratorToolGitMerge(args: {
	ref: string;
	noFf?: boolean;
	commitMessage?: string;
}): Promise<string> {
	const cwd = getPrimaryWorkspacePath();
	const ref = assertSafeGitRef(args.ref);
	if (!ref) {
		return "git_merge: invalid **ref** (branch or remote-tracking name; same rules as git_checkout).";
	}
	const rest: string[] = ["merge"];
	if (args.noFf === true) {
		rest.push("--no-ff");
		if (args.commitMessage != null && String(args.commitMessage).trim()) {
			const m = singleLineGitMessage(String(args.commitMessage));
			if (!m) return "git_merge: **commitMessage** is empty after trimming.";
			rest.push("-m", m);
		}
	} else if (args.commitMessage != null && String(args.commitMessage).trim()) {
		return "git_merge: use **noFf**: true when passing **commitMessage** (non–fast-forward merge commit).";
	}
	rest.push(ref);
	const label = `git merge${args.noFf ? " --no-ff" : ""}${args.commitMessage ? " -m …" : ""} ${ref}`;
	const { code, combined } = await runGitLocal(cwd, rest, `${label} (cwd=${cwd})`);
	if (code !== 0) {
		const hint = /conflict/i.test(combined) ? "\n(hint: resolve conflicts in the editor, then `git add` and commit, or abort with `git merge --abort` via bash if enabled.)" : "";
		return `git_merge: exit ${code}\n${combined}${hint}`;
	}
	return `git_merge: ok\n${combined}`;
}

function singleLineGitMessage(raw: string): string {
	return raw.trim().replace(/\r?\n/g, " ").slice(0, 4096);
}

export async function orchestratorToolGitAdd(args: { paths?: string[]; all?: boolean }): Promise<string> {
	const cwd = getPrimaryWorkspacePath();
	const all = args.all === true;
	const pathsIn = Array.isArray(args.paths) ? args.paths : [];
	if (!all && pathsIn.length === 0) {
		return "git_add: pass **all**: true to stage everything, or **paths**: [\"src/foo.ts\", …] relative to the workspace.";
	}
	const rest: string[] = ["add", "--"];
	if (all) {
		rest.push(".");
	} else {
		const absPaths: string[] = [];
		for (const p of pathsIn.slice(0, 64)) {
			const rel = String(p ?? "").trim().replace(/^[/\\]+/, "");
			const abs = resolveUnderWorkspace(rel);
			if (!abs) return `git_add: path not in workspace or unsafe: ${p}`;
			absPaths.push(abs);
		}
		rest.push(...absPaths);
	}
	const { code, combined } = await runGitLocal(cwd, rest, `git add (cwd=${cwd})`);
	if (code !== 0) return `git_add: exit ${code}\n${combined}`;
	return `git_add: ok\n${combined || "(staged)"}`;
}

export async function orchestratorToolGitCommit(args: {
	message: string;
	allowEmpty?: boolean;
}): Promise<string> {
	const cwd = getPrimaryWorkspacePath();
	const message = singleLineGitMessage(String(args.message ?? ""));
	if (!message) return "git_commit: **message** is required (non-empty).";
	const rest: string[] = ["commit", "-m", message];
	if (args.allowEmpty === true) rest.push("--allow-empty");
	const { code, combined } = await runGitLocal(cwd, rest, `git commit -m … (cwd=${cwd})`);
	if (code !== 0) {
		const hint =
			/nothing to commit/i.test(combined) || /no changes added to commit/i.test(combined)
				? "\n(hint: run **git_add** (paths or all) after edits, then **git_commit** again.)"
				: "";
		return `git_commit: exit ${code}\n${combined}${hint}`;
	}
	return `git_commit: ok\n${combined}`;
}

export const ORCHESTRATOR_GIT_TOOLS_OPENAI = [
	{
		type: "function" as const,
		function: {
			name: "git_status",
			description:
				"Show current branch, repository top, and `git status --porcelain` for the primary workspace (local only; no network). Use when the user asks about Git state or the UI shows no repo — if this fails, the workspace folder is not inside a Git clone.",
			parameters: { type: "object", properties: {}, required: [] },
		},
	},
	{
		type: "function" as const,
		function: {
			name: "git_remote",
			description: "Run `git remote -v` in the workspace (read-only). Shows configured remotes and URLs.",
			parameters: { type: "object", properties: {}, required: [] },
		},
	},
	{
		type: "function" as const,
		function: {
			name: "git_fetch",
			description:
				"Run `git fetch` against a remote (default origin). When a GitHub PAT is saved in Way of Pi Settings, adds HTTPS auth for github.com; otherwise still runs (public remotes, SSH, or host credential helpers). Optional --prune.",
			parameters: {
				type: "object",
				properties: {
					remote: { type: "string", description: "Remote name (default origin)" },
					prune: { type: "boolean", description: "Pass --prune to fetch" },
				},
				required: [],
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "git_pull",
			description:
				"Run `git pull --ff-only` (fast-forward only). With no arguments, uses the branch’s configured upstream. Optional remote and branch; if branch is set, remote is required. PAT from Settings → GitHub is injected for github.com HTTPS when present.",
			parameters: {
				type: "object",
				properties: {
					remote: { type: "string", description: "Remote name (default origin)" },
					branch: { type: "string", description: "Optional branch/ref to merge from remote" },
				},
				required: [],
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "git_push",
			description:
				"Run `git push` to origin (or chosen remote). For a **new local branch**, pass **branch** so Git creates the upstream (e.g. `git push -u origin my-feature` semantics). Uses GitHub PAT from Way of Pi Settings for github.com HTTPS (needs push permission). Prefer non-force; optional --force-with-lease for safe force updates.",
			parameters: {
				type: "object",
				properties: {
					remote: { type: "string", description: "Remote name (default origin)" },
					branch: { type: "string", description: "Optional branch to push (default: Git push default)" },
					forceWithLease: { type: "boolean", description: "If true, add --force-with-lease" },
				},
				required: [],
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "git_branches",
			description:
				"List local and remote-tracking branches (`git branch -a -vv`). Read-only. Use before checkout/merge to pick exact names.",
			parameters: { type: "object", properties: {}, required: [] },
		},
	},
	{
		type: "function" as const,
		function: {
			name: "git_checkout",
			description:
				"Switch branches or create a new branch. With **createNew**: true, runs `git checkout -b <branch>` (optional **startPoint** ref). Otherwise `git checkout <branch>`. Typical GitHub flow: create a feature branch here, **git_add** + **git_commit**, **git_push** with **branch** set, open PR on GitHub or **git_checkout** `main`, **git_pull**, **git_merge** feature branch.",
			parameters: {
				type: "object",
				properties: {
					branch: { type: "string", description: "Branch name (e.g. feature/telegram-bot)" },
					createNew: { type: "boolean", description: "If true, create and switch to a new branch (-b)" },
					startPoint: {
						type: "string",
						description: "Optional base ref when createNew is true (e.g. main, origin/main)",
					},
				},
				required: ["branch"],
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "git_merge",
			description:
				"Merge another branch or remote-tracking ref into the **current** branch (`git merge`). Use after **git_checkout** to `main` and **git_pull**. Set **noFf**: true for an explicit merge commit; then **commitMessage** is applied. On conflicts, output explains; resolve files then **git_add** and **git_commit** (or abort via **bash** `git merge --abort` if enabled).",
			parameters: {
				type: "object",
				properties: {
					ref: { type: "string", description: "Branch or remote-tracking ref to merge (e.g. feature/foo, origin/feature/foo)" },
					noFf: { type: "boolean", description: "If true, --no-ff (merge commit even when fast-forward possible)" },
					commitMessage: {
						type: "string",
						description: "Merge commit message (only used when noFf is true)",
					},
				},
				required: ["ref"],
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "git_add",
			description:
				"Stage changes before **git_commit**. Either **all**: true (entire repo worktree under workspace root) or **paths**: workspace-relative file paths.",
			parameters: {
				type: "object",
				properties: {
					all: { type: "boolean", description: "Stage all changes under the repo (git add .)" },
					paths: {
						type: "array",
						items: { type: "string" },
						description: "Relative paths to stage (max 64); ignored if all is true",
					},
				},
				required: [],
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "git_commit",
			description:
				"Create a commit with a message (`git commit -m`). Requires staged changes from **git_add** unless **allowEmpty**: true. After commit, use **git_push** (set **branch** to push a new upstream branch). GitHub HTTPS push uses the PAT from Settings → GitHub (repo scope).",
			parameters: {
				type: "object",
				properties: {
					message: { type: "string", description: "Commit message (single-line; newlines collapsed)" },
					allowEmpty: { type: "boolean", description: "If true, pass --allow-empty" },
				},
				required: ["message"],
			},
		},
	},
] as const;
