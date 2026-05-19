import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { getWorkspaceRoot } from "./paths";

/** Matches `plans/PLAN-YYYYMMDD-<slug>.md` filenames only. */
const PLAN_FILENAME_RE = /^PLAN-\d{8}-.+\.md$/i;

const MAX_PLAN_READ = 400_000;

export function countPlanTodosInMarkdown(md: string): { openTodos: number; doneTodos: number } {
	let openTodos = 0;
	let doneTodos = 0;
	for (const line of md.split(/\r?\n/)) {
		const m = line.match(/^\s*-\s*\[([ xX])\]/);
		if (!m) continue;
		if (m[1] === " ") openTodos += 1;
		else doneTodos += 1;
	}
	return { openTodos, doneTodos };
}

export type PlansCatalogFile = {
	path: string;
	mtimeMs: number;
	openTodos: number;
	doneTodos: number;
};

/** Newest `plans/PLAN-*.md` by `mtimeMs` — same shape as the first entry in `files`. */
export type PlansCatalogLatest = PlansCatalogFile;

async function readPlanTodoCounts(absPath: string): Promise<{ openTodos: number; doneTodos: number }> {
	try {
		const buf = await readFile(absPath, "utf8");
		const slice = buf.length > MAX_PLAN_READ ? buf.slice(0, MAX_PLAN_READ) : buf;
		return countPlanTodosInMarkdown(slice);
	} catch {
		return { openTodos: 0, doneTodos: 0 };
	}
}

export async function listPlansCatalog(): Promise<{
	files: PlansCatalogFile[];
	latest: PlansCatalogLatest | null;
}> {
	const root = getWorkspaceRoot();
	const dir = join(root, "plans");
	if (!existsSync(dir)) {
		return { files: [], latest: null };
	}
	const names = await readdir(dir);
	const candidates = names.filter((name) => PLAN_FILENAME_RE.test(name));
	const entries = await Promise.all(
		candidates.map(async (name) => {
			const rel = `plans/${name}`;
			const norm = rel.replace(/\\/g, "/");
			const abs = join(root, rel);
			try {
				const st = await stat(abs);
				if (!st.isFile()) return null;
				const { openTodos, doneTodos } = await readPlanTodoCounts(abs);
				return { path: norm, mtimeMs: st.mtimeMs, openTodos, doneTodos } satisfies PlansCatalogFile;
			} catch {
				return null;
			}
		}),
	);
	const files = entries.filter((e): e is PlansCatalogFile => e != null);
	files.sort((a, b) => b.mtimeMs - a.mtimeMs);
	const latest = files.length > 0 ? files[0]! : null;
	return { files, latest };
}
