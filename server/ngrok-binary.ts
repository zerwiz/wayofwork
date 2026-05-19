import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function expandUserPath(p: string): string {
	const t = p.trim();
	if (t.startsWith("~/")) return join(homedir(), t.slice(2));
	if (t === "~") return homedir();
	return t;
}

export type NgrokBinarySource = "WOP_NGROK_BINARY" | "PATH" | "bundled" | null;

/**
 * Resolve the ngrok **CLI** to execute (config + http tunnel).
 *
 * Order: **`WOP_NGROK_BINARY`** (file must exist) → **`Bun.which`** (preferring system over bundled if v3+) → **`node_modules/ngrok/bin`**.
 */
export function resolveNgrokExecutable(): { path: string | null; source: NgrokBinarySource } {
	const fromEnv = process.env.WOP_NGROK_BINARY?.trim();
	if (fromEnv) {
		const p = expandUserPath(fromEnv);
		if (existsSync(p)) return { path: p, source: "WOP_NGROK_BINARY" };
	}

	const win = process.platform === "win32";
	
	// Try to find a v3+ on the path first by checking /usr/bin or /usr/local/bin specifically
	// if Bun.which just returns the one in node_modules/.bin (v2).
	const systemCandidates = win ? ["C:\\Program Files\\ngrok\\ngrok.exe"] : ["/usr/local/bin/ngrok", "/usr/bin/ngrok"];
	for (const c of systemCandidates) {
		if (existsSync(c)) return { path: c, source: "PATH" };
	}

	const onPath = Bun.which(win ? "ngrok.exe" : "ngrok") ?? (win ? Bun.which("ngrok") : null);
	if (onPath) return { path: onPath, source: "PATH" };

	const pkgRoot = join(import.meta.dir, "..");
	const binDir = join(pkgRoot, "node_modules", "ngrok", "bin");
	const candidates = win
		? [join(binDir, "ngrok.exe"), join(binDir, "ngrok")]
		: [join(binDir, "ngrok")];
	for (const c of candidates) {
		if (existsSync(c)) return { path: c, source: "bundled" };
	}

	return { path: null, source: null };
}
