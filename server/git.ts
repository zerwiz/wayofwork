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
