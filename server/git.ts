import { existsSync, realpathSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";

function syncRealpath(abs: string): string {
	try {
		return realpathSync(abs);
	} catch {
		return abs;
	}
}

/** Two-column porcelain status → short label for the explorer (keeps `??`). */
function compactPorcelainStatus(xy: string): string {
	const pair = xy.length >= 2 ? xy.slice(0, 2) : xy;
	if (pair === "??") return "??";
	return pair.replace(/\s/g, "");
}

function unquotePorcelainPath(raw: string): string {
	let s = raw.trim();
	if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) {
		s = s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
	}
	return s.replace(/\\/g, "/");
}

function stripTrailingSlash(p: string): string {
	return p.replace(/\/+$/, "");
}

/**
 * Map a path from `git status` (repo-root-relative) to a path relative to
 * `workspaceRoot`. Returns null when the path is outside the workspace.
 *
 * Git reports paths relative to the repository root even when using
 * `git -C <workspaceSubdir>`, while the file tree uses paths relative to the
 * opened folder — so we rebase against `rev-parse --show-toplevel`.
 */
function repoPathToWorkspaceKey(
	workspaceRoot: string,
	repoTop: string,
	repoRelRaw: string,
): string | null {
	const parsed = stripTrailingSlash(unquotePorcelainPath(repoRelRaw));
	if (!parsed || parsed.includes("//")) return null;
	const abs = syncRealpath(join(repoTop, parsed));
	const wr = syncRealpath(workspaceRoot);
	const key = relative(wr, abs).replace(/\\/g, "/");
	if (!key || key.startsWith("..") || key.split("/").includes("..")) return null;
	return key;
}

function recordPath(
	map: Record<string, string>,
	workspaceRoot: string,
	repoTop: string,
	repoRelRaw: string,
	status: string,
): void {
	const key = repoPathToWorkspaceKey(workspaceRoot, repoTop, repoRelRaw);
	if (key) map[key] = status;
}

/** Worktree identity for the Source Control panel (no label — add in `tree.ts`). */
export interface GitWorktreeSnapshot {
	isRepo: boolean;
	topLevel: string | null;
	branch: string | null;
	error: string | null;
}

function emptySnapshot(error: string | null): GitWorktreeSnapshot {
	return { isRepo: false, topLevel: null, branch: null, error };
}

/**
 * Resolve whether `root` is inside a Git worktree and which branch (or detached) is checked out.
 * Used by `/api/tree` for the SCM sidebar; failures are surfaced in `error` except plain “not a repo”.
 */
export async function gitWorktreeSnapshot(root: string): Promise<GitWorktreeSnapshot> {
	const proc = Bun.spawn(["git", "-C", root, "rev-parse", "--is-inside-work-tree", "--show-toplevel"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const out = await new Response(proc.stdout).text();
	const err = await new Response(proc.stderr).text();
	const code = await proc.exited;
	const msg = (err.trim() || out.trim()).replace(/\s+/g, " ");
	if (code !== 0) {
		if (/not a git repository/i.test(msg)) return emptySnapshot(null);
		return emptySnapshot(msg || `git rev-parse exited ${code}`);
	}
	const lines = out
		.trim()
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean);
	const inside = lines[0] === "true";
	const topLine = lines[1];
	const topLevel = topLine ? syncRealpath(topLine) : null;
	if (!inside || !topLevel) return emptySnapshot(null);

	const branchProc = Bun.spawn(["git", "-C", root, "branch", "--show-current"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const branchOut = await new Response(branchProc.stdout).text();
	const branchErr = await new Response(branchProc.stderr).text();
	const branchCode = await branchProc.exited;
	let branch: string | null = branchOut.trim() || null;
	if (branchCode !== 0 && branchErr.trim()) {
		return { isRepo: true, topLevel, branch: null, error: branchErr.trim() };
	}
	if (!branch) {
		const shortProc = Bun.spawn(["git", "-C", root, "rev-parse", "--short", "HEAD"], {
			stdout: "pipe",
			stderr: "pipe",
		});
		const shortOut = await new Response(shortProc.stdout).text();
		await shortProc.exited;
		const h = shortOut.trim();
		branch = h ? `(detached @ ${h})` : "(detached)";
	}
	return { isRepo: true, topLevel, branch, error: null };
}

/** Relative path (tree keys) → short porcelain status (M, ??, MM, …). */
export async function gitStatusMap(root: string): Promise<Record<string, string>> {
	const map: Record<string, string> = {};
	const topProc = Bun.spawn(["git", "-C", root, "rev-parse", "--show-toplevel"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const topRaw = await new Response(topProc.stdout).text();
	if ((await topProc.exited) !== 0) return map;
	const repoTop = syncRealpath(topRaw.trim());
	if (!repoTop) return map;

	const proc = Bun.spawn(["git", "-C", root, "status", "--porcelain"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const out = await new Response(proc.stdout).text();
	if ((await proc.exited) !== 0) return map;

	for (const line of out.split("\n")) {
		if (line.length < 4) continue;
		const xyRaw = line.slice(0, 2);
		const status = compactPorcelainStatus(xyRaw);
		if (!status) continue;
		let rest = line.slice(3).trimStart();
		if (!rest) continue;

		const arrow = rest.indexOf(" -> ");
		const repoPaths = arrow === -1 ? [rest] : [rest.slice(0, arrow), rest.slice(arrow + 4)];
		for (const rp of repoPaths) {
			recordPath(map, root, repoTop, rp, status);
		}
	}
	return map;
}

export type GitStageResult = { ok: true } | { ok: false; error: string };

/**
 * Stage a workspace file or directory (`git add`) using the repository that contains `absPath`.
 */
export async function gitStageAbsolutePath(absPath: string): Promise<GitStageResult> {
	if (!existsSync(absPath)) return { ok: false, error: "Path does not exist" };
	const startDir = dirname(absPath);
	const topProc = Bun.spawn(["git", "-C", startDir, "rev-parse", "--show-toplevel"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const topOut = await new Response(topProc.stdout).text();
	const topErr = await new Response(topProc.stderr).text();
	if ((await topProc.exited) !== 0) {
		const msg = topErr.trim() || topOut.trim();
		if (/not a git repository/i.test(msg)) return { ok: false, error: "Not a git repository" };
		return { ok: false, error: msg || "git rev-parse failed" };
	}
	const repoTop = syncRealpath(topOut.trim());
	const absReal = syncRealpath(absPath);
	const spec = relative(repoTop, absReal).replace(/\\/g, "/");
	if (!spec || spec.startsWith("..") || spec.split("/").includes("..")) {
		return { ok: false, error: "Path is outside the git repository" };
	}

	const addProc = Bun.spawn(["git", "-C", repoTop, "add", "--", spec], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const addErr = await new Response(addProc.stderr).text();
	const code = await addProc.exited;
	if (code !== 0) {
		return { ok: false, error: addErr.trim() || `git add exited with code ${code}` };
	}
	return { ok: true };
}

/**
 * Stage every change in the worktree (`git add -A`) for the repository that contains `absPath`.
 * `absPath` may be a file, directory, or a path whose leaf was deleted (ancestor dir is used).
 */
export async function gitStageAllFromAbsolutePath(absPath: string): Promise<GitStageResult> {
	let startDir = absPath;
	if (!existsSync(absPath)) {
		let d = dirname(absPath);
		while (!existsSync(d) && d !== dirname(d)) {
			d = dirname(d);
		}
		if (!existsSync(d)) return { ok: false, error: "Path does not exist" };
		startDir = d;
	} else if (!statSync(absPath).isDirectory()) {
		startDir = dirname(absPath);
	}

	const topProc = Bun.spawn(["git", "-C", startDir, "rev-parse", "--show-toplevel"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const topOut = await new Response(topProc.stdout).text();
	const topErr = await new Response(topProc.stderr).text();
	if ((await topProc.exited) !== 0) {
		const msg = topErr.trim() || topOut.trim();
		if (/not a git repository/i.test(msg)) return { ok: false, error: "Not a git repository" };
		return { ok: false, error: msg || "git rev-parse failed" };
	}
	const repoTop = syncRealpath(topOut.trim());

	const addProc = Bun.spawn(["git", "-C", repoTop, "add", "-A"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const addErr = await new Response(addProc.stderr).text();
	const code = await addProc.exited;
	if (code !== 0) {
		return { ok: false, error: addErr.trim() || `git add -A exited with code ${code}` };
	}
	return { ok: true };
}

/**
 * Create a git commit for the repository containing `absPath`.
 */
export async function gitCommit(absPath: string, message: string): Promise<GitStageResult> {
	const topProc = Bun.spawn(["git", "-C", dirname(absPath), "rev-parse", "--show-toplevel"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const topOut = await new Response(topProc.stdout).text();
	if ((await topProc.exited) !== 0) return { ok: false, error: "Not a git repository" };
	const repoTop = syncRealpath(topOut.trim());

	const proc = Bun.spawn(["git", "-C", repoTop, "commit", "-m", message], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const err = await new Response(proc.stderr).text();
	const code = await proc.exited;
	if (code !== 0) {
		return { ok: false, error: err.trim() || `git commit exited with code ${code}` };
	}
	return { ok: true };
}

/**
 * Push changes to the remote repository.
 * Uses the PAT from `readGithubTokenForGit` if available.
 */
export async function gitPush(absPath: string, token?: string | null): Promise<GitStageResult> {
	const topProc = Bun.spawn(["git", "-C", dirname(absPath), "rev-parse", "--show-toplevel"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const topOut = await new Response(topProc.stdout).text();
	if ((await topProc.exited) !== 0) return { ok: false, error: "Not a git repository" };
	const repoTop = syncRealpath(topOut.trim());

	// If token is provided, we might need to update the remote URL temporarily or use it in the push command
	// For now, assume git is configured with credential helper or the remote URL already has the token.
	// Construction simplification: just run git push.
	
	const proc = Bun.spawn(["git", "-C", repoTop, "push"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const err = await new Response(proc.stderr).text();
	const code = await proc.exited;
	if (code !== 0) {
		return { ok: false, error: err.trim() || `git push exited with code ${code}` };
	}
	return { ok: true };
}

/**
 * Create a new branch and push it to the remote.
 */
export async function gitCreateBranch(absPath: string, branchName: string): Promise<GitStageResult> {
	const topProc = Bun.spawn(["git", "-C", dirname(absPath), "rev-parse", "--show-toplevel"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const topOut = await new Response(topProc.stdout).text();
	if ((await topProc.exited) !== 0) return { ok: false, error: "Not a git repository" };
	const repoTop = syncRealpath(topOut.trim());

	// Create local branch
	const branchProc = Bun.spawn(["git", "-C", repoTop, "checkout", "-b", branchName], {
		stdout: "pipe",
		stderr: "pipe",
	});
	if ((await branchProc.exited) !== 0) {
		// If checkout -b fails, try just checkout (if it exists)
		const checkoutProc = Bun.spawn(["git", "-C", repoTop, "checkout", branchName], {
			stdout: "pipe",
			stderr: "pipe",
		});
		if ((await checkoutProc.exited) !== 0) {
			return { ok: false, error: `Failed to create/checkout branch ${branchName}` };
		}
	}

	// Push to remote
	const pushProc = Bun.spawn(["git", "-C", repoTop, "push", "-u", "origin", branchName], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const pushErr = await new Response(pushProc.stderr).text();
	const pushCode = await pushProc.exited;

	// Switch back to main/master (or original branch)
	// For simplicity, we just stay on the new branch or the user can switch back manually.
	// But for automated backup, we should probably switch back.
	void Bun.spawn(["git", "-C", repoTop, "checkout", "-"]).exited;

	if (pushCode !== 0) {
		return { ok: false, error: pushErr.trim() || `git push origin ${branchName} failed` };
	}
	return { ok: true };
}

export interface GitLogEntry {
	hash: string;
	author: string;
	date: string;
	message: string;
}

/**
 * Get the git commit log for the repository containing `absPath`.
 */
export async function gitLog(absPath: string, limit = 20): Promise<GitLogEntry[] | { error: string }> {
	try {
		const topProc = Bun.spawn(["git", "-C", dirname(absPath), "rev-parse", "--show-toplevel"], {
			stdout: "pipe",
			stderr: "pipe",
		});
		const topOut = await new Response(topProc.stdout).text();
		if ((await topProc.exited) !== 0) return { error: "Not a git repository" };
		const repoTop = syncRealpath(topOut.trim());

		const proc = Bun.spawn(
			["git", "-C", repoTop, "log", `-${limit}`, "--pretty=format:%H|%an|%ad|%s", "--date=short"],
			{ stdout: "pipe", stderr: "pipe" }
		);
		const out = await new Response(proc.stdout).text();
		if ((await proc.exited) !== 0) return [];

		return out.trim().split("\n").map(line => {
			const [hash, author, date, message] = line.split("|");
			return { hash, author, date, message };
		});
	} catch (e) {
		return { error: String(e) };
	}
}
