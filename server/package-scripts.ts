import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getWorkspaceRoot } from "./paths";

export async function readPackageScripts(): Promise<Record<string, string> | null> {
	const pkgPath = join(getWorkspaceRoot(), "package.json");
	if (!existsSync(pkgPath)) return null;
	try {
		const raw = await readFile(pkgPath, "utf8");
		const j = JSON.parse(raw) as { scripts?: Record<string, string> };
		if (!j.scripts || typeof j.scripts !== "object") return null;
		return j.scripts;
	} catch {
		return null;
	}
}
