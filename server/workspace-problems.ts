import { existsSync } from "node:fs";
import { isAbsolute, join, normalize, relative, resolve } from "node:path";
import type { Subprocess } from "bun";

export type WorkspaceProblemSeverity = "error" | "warning" | "info";

export type WorkspaceProblem = {
	/** Workspace-relative path (POSIX-style). */
	path: string;
	line: number;
	column: number;
	message: string;
	severity: WorkspaceProblemSeverity;
	rule?: string;
	source: "tsc" | "eslint";
};

export type WorkspaceProblemsRunResult = {
	ok: boolean;
	error?: string;
	ranAt: string;
	engine: string;
	problems: WorkspaceProblem[];
	exitCode: number | null;
	log: string;
};

const ESLINT_CONFIG_NAMES = [
	"eslint.config.js",
	"eslint.config.mjs",
	"eslint.config.cjs",
	"eslint.config.ts",
	".eslintrc.cjs",
	".eslintrc.js",
	".eslintrc.json",
	".eslintrc.yaml",
	".eslintrc.yml",
];

const MAX_PROBLEMS = 800;
const SPAWN_MS = 120_000;

function hasEslintConfig(rootAbs: string): boolean {
	return ESLINT_CONFIG_NAMES.some((n) => existsSync(join(rootAbs, n)));
}

function normalizeWorkspacePath(rootAbs: string, filePath: string): string {
	const norm = filePath.replace(/\\/g, "/").trim();
	const rootNorm = rootAbs.replace(/\\/g, "/");
	if (norm.startsWith(rootNorm + "/")) return norm.slice(rootNorm.length + 1);
	if (norm.startsWith("./")) return norm.slice(2);
	return norm;
}

/** Map a tool-reported file path to a path relative to the opened workspace folder. */
function toWorkspaceRelativeFile(workspaceRoot: string, analysisCwd: string, filePath: string): string {
	const f = filePath.replace(/\\/g, "/").trim();
	let abs: string;
	try {
		abs = isAbsolute(f) ? normalize(f) : normalize(resolve(analysisCwd, f));
	} catch {
		return normalizeWorkspacePath(workspaceRoot, f);
	}
	const wr = normalize(workspaceRoot);
	const rel = relative(wr, abs).replace(/\\/g, "/");
	if (!rel || rel.startsWith("..")) return normalizeWorkspacePath(workspaceRoot, f);
	return rel;
}

/**
 * Directory to run ESLint / tsc in: workspace root, or **apps/wayofwork-ui** when this monorepo is opened at repo root.
 */
function pickAnalysisDirectory(rootAbs: string): string | null {
	if (!rootAbs || !existsSync(rootAbs)) return null;
	if (hasEslintConfig(rootAbs) || existsSync(join(rootAbs, "tsconfig.json"))) return rootAbs;
	const nested = join(rootAbs, "apps", "wayofwork-ui");
	if (existsSync(nested) && (hasEslintConfig(nested) || existsSync(join(nested, "tsconfig.json")))) return nested;
	return null;
}

function parseTscLine(workspaceRoot: string, analysisCwd: string, line: string): WorkspaceProblem | null {
	const m = line.match(/^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+(TS\d+):\s*(.+)$/i);
	if (!m) return null;
	const [, file, ln, col, sev, tsCode, msg] = m;
	const severity = sev.toLowerCase() === "warning" ? "warning" : "error";
	const path = toWorkspaceRelativeFile(workspaceRoot, analysisCwd, file.trim());
	return {
		path,
		line: Math.max(1, parseInt(ln, 10) || 1),
		column: Math.max(1, parseInt(col, 10) || 1),
		message: msg.trim(),
		severity,
		rule: tsCode,
		source: "tsc",
	};
}

function parseEslintUnixLine(workspaceRoot: string, analysisCwd: string, line: string): WorkspaceProblem | null {
	const t = line.trim();
	if (!t || t.startsWith("(")) return null;
	const m = t.match(/^(.+?):(\d+):(\d+):\s*(.+)$/);
	if (!m) return null;
	const [, file, ln, col, rest] = m;
	let message = rest.trim();
	let severity: WorkspaceProblemSeverity = "error";
	let rule: string | undefined;
	const bracket = message.match(/\s*\[(Error|Warning|error|warning)\/([^\]]+)\]\s*$/);
	if (bracket) {
		const level = bracket[1].toLowerCase();
		severity = level === "warning" ? "warning" : "error";
		rule = bracket[2];
		message = message.replace(/\s*\[(?:Error|Warning|error|warning)\/[^\]]+\]\s*$/, "").trim();
	}
	const path = toWorkspaceRelativeFile(workspaceRoot, analysisCwd, file.trim());
	return {
		path,
		line: Math.max(1, parseInt(ln, 10) || 1),
		column: Math.max(1, parseInt(col, 10) || 1),
		message,
		severity,
		rule,
		source: "eslint",
	};
}

async function runCommand(
	cwd: string,
	cmd: string[],
): Promise<{ code: number | null; stdout: string; stderr: string; killed: boolean }> {
	let proc: Subprocess;
	try {
		proc = Bun.spawn(cmd, {
			cwd,
			stdout: "pipe",
			stderr: "pipe",
			env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return { code: null, stdout: "", stderr: message, killed: false };
	}
	let killed = false;
	const killTimer = setTimeout(() => {
		killed = true;
		try {
			proc.kill("SIGTERM");
		} catch {
			/* ignore */
		}
	}, SPAWN_MS);
	let code: number | null = null;
	try {
		code = await proc.exited;
	} finally {
		clearTimeout(killTimer);
	}
	const stdout = await new Response(proc.stdout).text();
	const stderr = await new Response(proc.stderr).text();
	return { code, stdout, stderr, killed };
}

function parseLines(
	workspaceRoot: string,
	analysisCwd: string,
	text: string,
	source: "tsc" | "eslint",
): WorkspaceProblem[] {
	const out: WorkspaceProblem[] = [];
	for (const line of text.split("\n")) {
		const p =
			source === "tsc"
				? parseTscLine(workspaceRoot, analysisCwd, line)
				: parseEslintUnixLine(workspaceRoot, analysisCwd, line);
		if (p && out.length < MAX_PROBLEMS) out.push(p);
	}
	return out;
}

/**
 * Runs **ESLint** (unix formatter) when an ESLint config exists, otherwise **TypeScript** (`tsc --noEmit`).
 * Uses the workspace root, or **apps/wayofwork-ui** when the repo root has no config but that package does (monorepo).
 */
export async function runWorkspaceProblemsAnalysis(rootAbs: string): Promise<WorkspaceProblemsRunResult> {
	const ranAt = new Date().toISOString();
	if (!rootAbs || !existsSync(rootAbs)) {
		return {
			ok: false,
			error: "No workspace folder on disk.",
			ranAt,
			engine: "none",
			problems: [],
			exitCode: null,
			log: "",
		};
	}

	const analysisCwd = pickAnalysisDirectory(rootAbs);
	if (!analysisCwd) {
		return {
			ok: true,
			ranAt,
			engine: "none",
			problems: [],
			exitCode: null,
			log: "No eslint config or tsconfig.json at the workspace root (or under apps/wayofwork-ui for this layout). Add one to enable static checks.",
		};
	}

	const useEslint = hasEslintConfig(analysisCwd);
	let engine: string;
	let cmd: string[];
	if (useEslint) {
		engine = "eslint";
		cmd = ["bunx", "eslint", ".", "-f", "unix", "--max-warnings", "0"];
	} else {
		engine = "tsc";
		cmd = ["bunx", "tsc", "--noEmit", "-p", "tsconfig.json"];
	}

	const { code, stdout, stderr, killed } = await runCommand(analysisCwd, cmd);
	const combined = `${stdout}\n${stderr}`.trim();
	const log = killed ? `${combined}\n\n(analysis timed out after ${SPAWN_MS / 1000}s)`.trim() : combined;
	const problems = parseLines(rootAbs, analysisCwd, combined, engine === "tsc" ? "tsc" : "eslint");

	if (killed) {
		return {
			ok: false,
			error: `Analyzer timed out after ${SPAWN_MS / 1000}s`,
			ranAt,
			engine,
			problems,
			exitCode: code,
			log,
		};
	}

	return {
		ok: true,
		ranAt,
		engine,
		problems,
		exitCode: code,
		log,
	};
}
