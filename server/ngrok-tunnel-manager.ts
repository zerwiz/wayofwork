import { existsSync } from "node:fs";
import { join } from "node:path";

import { fetchNgrokPublicUrl, ngrokInspectorBaseUrl } from "./ngrok-inspector";
import { resolveNgrokExecutable, type NgrokBinarySource } from "./ngrok-binary";
import { probeTcpListening } from "./tcp-probe";

let wopNgrokChild: Bun.Subprocess | null = null;

/** Spawn/stop Way-of-Pi–managed ngrok from Settings. Disable with `WOP_ALLOW_NGROK_SPAWN=0` (or `false` / `no` / `off`). */
export function isNgrokTunnelControlAllowed(): boolean {
	const v = process.env.WOP_ALLOW_NGROK_SPAWN?.trim().toLowerCase();
	if (v === "0" || v === "false" || v === "no" || v === "off") return false;
	return true;
}

/** Save authtoken via Settings (does not spawn ngrok). Independent of `WOP_ALLOW_NGROK_SPAWN`. */
export function isNgrokAuthtokenSaveAllowed(): boolean {
	return true;
}

/** Run package install in **apps/wayofwork-ui** to fetch optional **ngrok** (no `sudo`; separate from spawn gate). */
export function isNgrokBundledInstallAllowed(): boolean {
	return true;
}

async function readProcText(proc: Bun.Subprocess): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text().catch(() => ""),
		new Response(proc.stderr).text().catch(() => ""),
		proc.exited,
	]);
	return { stdout, stderr, exitCode };
}

function redactTokenInMessage(message: string, token: string): string {
	if (!token || token.length < 4) return message;
	let out = message;
	for (const chunk of [token, encodeURIComponent(token)]) {
		if (chunk) out = out.split(chunk).join("***");
	}
	return out;
}

const NGROK_MISSING_HINT =
	"No ngrok CLI found yet. Use Settings → Install ngrok into this app, or set WOP_NGROK_BINARY / install ngrok on PATH.";

/** Best-effort: `ngrok version` using the resolved binary (PATH, bundled package, or WOP_NGROK_BINARY). */
export async function detectNgrokCli(): Promise<{
	onPath: boolean;
	versionLine: string | null;
	whichPath: string | null;
	resolvedSource: NgrokBinarySource;
}> {
	const { path, source } = resolveNgrokExecutable();
	if (!path) {
		return { onPath: false, versionLine: null, whichPath: null, resolvedSource: null };
	}
	try {
		const proc = Bun.spawn([path, "version"], {
			cwd: process.cwd(),
			env: { ...process.env },
			stdout: "pipe",
			stderr: "pipe",
			stdin: "ignore",
		});
		const { stdout, stderr, exitCode } = await readProcText(proc);
		if (exitCode !== 0) {
			return { onPath: false, versionLine: null, whichPath: path, resolvedSource: source };
		}
		const line = (stdout || stderr).trim().split(/\r?\n/)[0]?.trim() || null;
		return { onPath: true, versionLine: line, whichPath: path, resolvedSource: source };
	} catch {
		return { onPath: false, versionLine: null, whichPath: path, resolvedSource: source };
	}
}

export function getNgrokTunnelTargetPort(): number {
	const raw = String(process.env.WOP_VITE_PORT ?? process.env.VITE_DEV_SERVER_PORT ?? "5173").trim();
	return /^\d+$/.test(raw) ? Math.min(65535, Math.max(1, Number.parseInt(raw, 10))) : 5173;
}

/** When `WOP_NGROK_WEB_ADDR` is set, pass `--web-addr` so the agent’s inspector matches `ngrok-inspector.ts`. */
function ngrokHttpWebAddrSpawnArgs(): string[] {
	const raw = process.env.WOP_NGROK_WEB_ADDR?.trim();
	if (!raw) return [];
	let s = raw;
	if (s.startsWith("http://")) s = s.slice(7);
	else if (s.startsWith("https://")) s = s.slice(8);
	s = s.replace(/\/+$/, "");
	if (!s || /\s/.test(s)) return [];
	return ["--web-addr", s];
}

/** When `WOP_NGROK_DOMAIN` is set, pass `--url` (v3+) or `--hostname` (v2) so the tunnel uses a static domain. */
async function ngrokHttpDomainArgs(exe: string): Promise<string[]> {
	const raw = process.env.WOP_NGROK_DOMAIN?.trim();
	if (!raw) return [];

	// Detect version
	let isV3 = true;
	try {
		const proc = Bun.spawn([exe, "version"], { stdout: "pipe" });
		const text = await new Response(proc.stdout).text();
		if (text.includes("version 2.")) isV3 = false;
	} catch {
		/* ignore */
	}

	if (isV3) {
		// Use --url as --domain is deprecated. Prepend https:// if it's just a domain.
		const url = raw.includes("://") ? raw : `https://${raw}`;
		return ["--url", url];
	} else {
		// Version 2 uses --hostname
		const host = raw.replace(/^https?:\/\//, "").split("/")[0] || raw;
		return ["--hostname", host];
	}
}

function detachExitListener(proc: Bun.Subprocess) {
	void proc.exited.then(() => {
		if (wopNgrokChild === proc) wopNgrokChild = null;
	});
}

export type NgrokTunnelGetJson = {
	ok: true;
	allowControl: boolean;
	/** True when this Bun process spawned ngrok and it has not exited yet */
	wopManagedRunning: boolean;
	pid: number | null;
	tunnelPort: number;
	/** From local inspector when any ngrok agent answers (Way of Pi–spawned or external) */
	publicUrl: string | null;
	/** `ngrok version` succeeded for the resolved CLI */
	ngrokOnPath: boolean;
	/** First line of `ngrok version` when the CLI runs */
	ngrokVersionLine: string | null;
	/** Absolute path to the ngrok executable Way of Pi will run */
	ngrokWhichPath: string | null;
	/** How **`ngrokWhichPath`** was chosen */
	ngrokResolvedSource: NgrokBinarySource;
	/** Server may run **bun install** / **npm install** in **apps/wayofwork-ui** to fetch optional **ngrok** */
	installBundledAllowed: boolean;
	/** **POST set-authtoken** allowed (not gated on `WOP_ALLOW_NGROK_SPAWN`) */
	authtokenSaveAllowed: boolean;
	/** Something accepts TCP on `127.0.0.1:tunnelPort` (e.g. Vite) — start dev before ngrok or visitors get errors */
	backendListening: boolean;
	/** Local ngrok web UI (inspector); same base as `WOP_NGROK_WEB_ADDR` when set */
	inspectorUrl: string;
};

export async function getNgrokTunnelDevJson(): Promise<NgrokTunnelGetJson> {
	const tunnelPort = getNgrokTunnelTargetPort();
	const [publicUrl, cli, backendListening] = await Promise.all([
		fetchNgrokPublicUrl(3500),
		detectNgrokCli(),
		probeTcpListening(tunnelPort, "127.0.0.1", 2000),
	]);
	const wopManagedRunning = wopNgrokChild !== null;
	const pid = wopManagedRunning ? (wopNgrokChild.pid ?? null) : null;
	return {
		ok: true,
		allowControl: isNgrokTunnelControlAllowed(),
		wopManagedRunning,
		pid,
		tunnelPort,
		publicUrl,
		ngrokOnPath: cli.onPath,
		ngrokVersionLine: cli.versionLine,
		ngrokWhichPath: cli.whichPath,
		ngrokResolvedSource: cli.resolvedSource,
		installBundledAllowed: isNgrokBundledInstallAllowed(),
		authtokenSaveAllowed: isNgrokAuthtokenSaveAllowed(),
		backendListening,
		inspectorUrl: `${ngrokInspectorBaseUrl()}/`,
	};
}

export type NgrokTunnelActionJson = { ok: boolean; message: string; publicUrl?: string | null };

export async function configureNgrokAuthtokenDev(rawToken: string): Promise<NgrokTunnelActionJson> {
	const token = rawToken.trim();
	if (token.length < 8 || token.length > 512 || /[\r\n\0]/.test(token)) {
		return { ok: false, message: "Paste the authtoken from ngrok dashboard → Your Authtoken (no line breaks)." };
	}
	const { path: exe } = resolveNgrokExecutable();
	if (!exe) {
		return { ok: false, message: NGROK_MISSING_HINT };
	}
	try {
		const proc = Bun.spawn([exe, "config", "add-authtoken", token], {
			cwd: process.cwd(),
			env: { ...process.env },
			stdout: "pipe",
			stderr: "pipe",
			stdin: "ignore",
		});
		const { stdout, stderr, exitCode } = await readProcText(proc);
		if (exitCode !== 0) {
			const raw = `${stderr}\n${stdout}`.trim().slice(0, 600);
			return { ok: false, message: redactTokenInMessage(raw || "ngrok config add-authtoken failed.", token) };
		}
		return {
			ok: true,
			message:
				"Authtoken saved to ngrok on-disk config on this machine (dashboard token applied the same as the CLI would).",
		};
	} catch (e) {
		return { ok: false, message: redactTokenInMessage(e instanceof Error ? e.message : String(e), token) };
	}
}

export async function startNgrokTunnelDev(): Promise<NgrokTunnelActionJson> {
	if (!isNgrokTunnelControlAllowed()) {
		return {
			ok: false,
			message:
				"Way of Pi cannot start ngrok from here because WOP_ALLOW_NGROK_SPAWN is off. Unset it or set a truthy value, then try again — or run ngrok http on this host yourself.",
		};
	}
	const { path: exe } = resolveNgrokExecutable();
	if (!exe) {
		return { ok: false, message: NGROK_MISSING_HINT };
	}
	if (wopNgrokChild) {
		const publicUrl = await fetchNgrokPublicUrl(3500);
		return { ok: true, message: "ngrok is already running (started from Way of Pi).", publicUrl };
	}
	const port = getNgrokTunnelTargetPort();
	const listening = await probeTcpListening(port, "127.0.0.1", 2000);
	if (!listening) {
		return {
			ok: false,
			message: `Nothing is listening on 127.0.0.1:${port}. Start the dev server first (e.g. Vite on port ${port} — usually "npm run dev" / ./start-wayofwork-ui.sh with Bun on 3333). ngrok needs a live backend or the public URL will fail (ngrok ERR_NGROK_3200 / offline after you stop the tunnel). For Bun-only static + API, set WOP_VITE_PORT or VITE_DEV_SERVER_PORT to your HTTP port (often 3333) so the tunnel target matches.`,
		};
	}
	const webAddrArgs = ngrokHttpWebAddrSpawnArgs();
	const domainArgs = await ngrokHttpDomainArgs(exe);
	const cmd = [exe, "http", ...webAddrArgs, ...domainArgs, String(port)];
	console.log(`[ngrok] Spawning: ${cmd.join(" ")}`);
	try {
		wopNgrokChild = Bun.spawn(cmd, {
			cwd: process.cwd(),
			env: { ...process.env },
			stdout: "ignore",
			stderr: "inherit",
			stdin: "ignore",
		});
		detachExitListener(wopNgrokChild);
	} catch (e) {
		wopNgrokChild = null;
		return { ok: false, message: e instanceof Error ? e.message : String(e) };
	}

	for (let i = 0; i < 100; i++) {
		await Bun.sleep(400);
		const url = await fetchNgrokPublicUrl(3500);
		if (url) return { ok: true, message: "Tunnel is up.", publicUrl: url };
	}

	try {
		wopNgrokChild.kill();
	} catch {
		/* ignore */
	}
	wopNgrokChild = null;
	return {
		ok: false,
		message: `ngrok did not publish a URL in time. Save your authtoken (section 2), ensure port ${port} is free, and check the Bun terminal for errors. If another ngrok is already running, stop it first.`,
	};
}

const WAYOFPI_UI_ROOT = join(import.meta.dir, "..");

type BundledNgrokPackageOp = "install" | "update";

async function runNgrokBundledPackageOp(op: BundledNgrokPackageOp): Promise<NgrokTunnelActionJson> {
	const pkgJson = join(WAYOFPI_UI_ROOT, "package.json");
	if (!existsSync(pkgJson)) {
		return { ok: false, message: "Could not find apps/wayofwork-ui (package.json missing next to the server)." };
	}
	const bunOnPath = Bun.which("bun") ?? (process.platform === "win32" ? Bun.which("bun.exe") : null);
	const verb = op === "install" ? "Install" : "Update";

	let proc: Bun.Subprocess;
	try {
		if (bunOnPath) {
			const args = op === "install" ? (["install"] as const) : (["update", "ngrok"] as const);
			proc = Bun.spawn([bunOnPath, ...args], {
				cwd: WAYOFPI_UI_ROOT,
				env: { ...process.env },
				stdout: "pipe",
				stderr: "pipe",
				stdin: "ignore",
			});
		} else if (process.platform === "win32") {
			const npmLine =
				op === "install" ? "npm install --no-fund --no-audit" : "npm update ngrok --no-fund --no-audit";
			proc = Bun.spawn(["cmd.exe", "/c", npmLine], {
				cwd: WAYOFPI_UI_ROOT,
				env: { ...process.env },
				stdout: "pipe",
				stderr: "pipe",
				stdin: "ignore",
			});
		} else {
			const argv =
				op === "install"
					? (["npm", "install", "--no-fund", "--no-audit"] as const)
					: (["npm", "update", "ngrok", "--no-fund", "--no-audit"] as const);
			proc = Bun.spawn([...argv], {
				cwd: WAYOFPI_UI_ROOT,
				env: { ...process.env },
				stdout: "pipe",
				stderr: "pipe",
				stdin: "ignore",
			});
		}
	} catch (e) {
		return { ok: false, message: e instanceof Error ? e.message : String(e) };
	}

	const INSTALL_MS = 240_000;
	const done = readProcText(proc);
	const timeout = Bun.sleep(INSTALL_MS).then(() => "timeout" as const);
	const result = await Promise.race([done, timeout]);
	if (result === "timeout") {
		try {
			proc.kill("SIGTERM");
		} catch {
			/* ignore */
		}
		return {
			ok: false,
			message: `${verb} timed out (4 min). Check network and disk space, then try again.`,
		};
	}
	const { stdout, stderr, exitCode } = result;
	if (exitCode !== 0) {
		const tail = `${stderr}\n${stdout}`.trim().slice(-900);
		return { ok: false, message: `${verb} failed (exit ${exitCode}). ${tail || "No output."}` };
	}
	if (op === "install") {
		const cli = await detectNgrokCli();
		if (!cli.onPath) {
			return {
				ok: false,
				message:
					"Install reported success but ngrok still does not run here. Restart the Way of Pi Bun server, then open Settings and tap Refresh.",
			};
		}
		return {
			ok: true,
			message: "ngrok is installed. Add your dashboard authtoken (section 2), then turn on the tunnel (section 3).",
		};
	}
	return {
		ok: true,
		message:
			"Updated the optional ngrok package in apps/wayofwork-ui. Press Refresh; restart the Bun server if the version line still looks stale. A system ngrok on PATH is unchanged.",
	};
}

export async function installNgrokBundledDev(): Promise<NgrokTunnelActionJson> {
	return runNgrokBundledPackageOp("install");
}

/** Upgrade the optional **ngrok** npm package under **apps/wayofwork-ui** (does not replace a PATH binary). */
export async function updateNgrokBundledDev(): Promise<NgrokTunnelActionJson> {
	return runNgrokBundledPackageOp("update");
}

export async function stopNgrokTunnelDev(): Promise<NgrokTunnelActionJson> {
	if (!isNgrokTunnelControlAllowed()) {
		return {
			ok: false,
			message:
				"Way of Pi cannot stop the managed tunnel from here because WOP_ALLOW_NGROK_SPAWN is off. Stop ngrok in the terminal where you ran it, or re-enable that env and try again.",
		};
	}
	if (!wopNgrokChild) {
		return {
			ok: true,
			message:
				"Way of Pi did not start ngrok, so there is nothing to stop here. If a tunnel is still running, stop it in the terminal where you ran ngrok, or close that session.",
		};
	}
	try {
		wopNgrokChild.kill();
	} catch {
		/* ignore */
	}
	wopNgrokChild = null;
	return { ok: true, message: "Stopped the ngrok process that Way of Pi started." };
}
