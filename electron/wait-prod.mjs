/**
 * Waits for the Bun production server health check, then starts Electron (no dev URL).
 * Honors WOP_SERVER_PORT (must match the concurrently-started `bun run start`).
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import waitOn from "wait-on";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.WOP_SERVER_PORT || "3333";
const health = `http-get://127.0.0.1:${port}/api/health`;

await waitOn({ resources: [health], timeout: 120_000 });

const env = { ...process.env, ELECTRON_DEV: "0" };
const child = spawn("npx", ["--yes", "electron", "."], {
	cwd: root,
	stdio: "inherit",
	env,
	shell: true,
});

child.on("exit", (code, signal) => {
	if (signal) process.kill(process.pid, signal);
	process.exit(code ?? 1);
});
