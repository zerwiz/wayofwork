/**
 * Electron shell for Way of Work UI — **primary desktop** target (same renderer as browser dev).
 * - Dev: `loadURL(WOP_ELECTRON_DEV_URL)` → Vite (default http://127.0.0.1:5173/) so relative `/api`, `/ws`,
 *   `/api/manifest`, `/ws/terminal` use vite.config.ts proxies to Bun on WOP_SERVER_PORT (3333).
 *   On **`app.whenReady`**, if **`ELECTRON_DEV=1`**, Electron **starts the Bun API** when it is not already healthy (same as **Start service** / IPC). Set **`WOP_ELECTRON_SKIP_BUN_AUTOSTART=1`** to skip.
 * - Prod: `loadURL(WOP_ELECTRON_PROD_URL)` → Bun origin serving `dist/` + API (`npm run start`).
 */
import { spawn } from "node:child_process";
import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, shell } from "electron";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const preloadPath = path.join(__dirname, "preload.cjs");

/** Match **`start-wayofwork-ui.sh`** so spawned Bun can **`which pi`** like a login-ish shell. */
function wayofworkEnrichedPath(base) {
	const sep = process.platform === "win32" ? ";" : ":";
	const home = process.env.HOME || process.env.USERPROFILE || "";
	const parts = [];
	if (home) {
		parts.push(
			path.join(home, ".bun", "bin"),
			path.join(home, ".local", "bin"),
			path.join(home, ".cargo", "bin"),
			path.join(home, ".nix-profile", "bin"),
		);
	}
	if (process.platform === "darwin") {
		parts.push("/opt/homebrew/bin", "/usr/local/bin");
	}
	parts.push("/usr/local/bin", "/usr/bin", "/bin");
	const head = parts.filter(Boolean).join(sep);
	const tail = String(base ?? "").trim();
	return tail ? `${head}${sep}${tail}` : head;
}

// Prefer overlay-style scrollbars where Chromium still exposes them (Windows Electron vs Chrome).
app.commandLine.appendSwitch("enable-features", "OverlayScrollbar");

const isMac = process.platform === "darwin";
const isDev = process.env.ELECTRON_DEV === "1";
const brandedIconPng = path.join(__dirname, "..", "public", "wayofwork-icon.png");
/** Optional: run `electron/build/generate-macos-icns.sh` on macOS for multi-resolution Dock icon. */
const brandedIconIcns = path.join(__dirname, "build", "icon.icns");

/** Match `StartupWMClass=` + `desktopName` in package.json (Electron lowercases WM_CLASS on Linux). */
if (process.platform === "linux") {
	app.setName("wayofwork");
}
if (isMac) {
	app.setName("Way of Work");
}

/** macOS: prefer generated `.icns`, else PNG, for Dock (BrowserWindow `icon` is ignored on darwin). */
function macDockBrandedImage() {
	try {
		if (fs.existsSync(brandedIconIcns)) {
			const icns = nativeImage.createFromPath(brandedIconIcns);
			if (!icns.isEmpty()) return icns;
		}
		if (fs.existsSync(brandedIconPng)) {
			const png = nativeImage.createFromPath(brandedIconPng);
			if (!png.isEmpty()) return png;
		}
	} catch {
		/* ignore */
	}
	return null;
}

function applyMacOSDockBranding() {
	if (!isMac || !app.dock) return;
	const img = macDockBrandedImage();
	if (img) {
		try {
			app.dock.setIcon(img);
		} catch {
			/* ignore */
		}
	}
}

function dockIconForPlatform() {
	if (isMac) return undefined;
	try {
		if (fs.existsSync(brandedIconPng)) return nativeImage.createFromPath(brandedIconPng);
	} catch {
		/* ignore */
	}
	return brandedIconPng;
}

/*
 * Electron builds the default File/Edit/View/Window/Help menu at **ready** unless the app
 * has already called setApplicationMenu — see electron#35512. Doing this only inside
 * app.whenReady() is too late; the bar stays. Clear it as soon as the main module loads.
 */
if (!isMac) {
	Menu.setApplicationMenu(null);
}

/**
 * macOS: minimal system menu (Quit, Hide, …). Windows/Linux: keep null (in-app MenuBar only).
 */
function setChromeMenus() {
	if (isMac) {
		Menu.setApplicationMenu(
			Menu.buildFromTemplate([
				{
					label: app.name,
					submenu: [
						{ role: "about" },
						{ type: "separator" },
						{ role: "services" },
						{ type: "separator" },
						{ role: "hide" },
						{ role: "hideOthers" },
						{ role: "unhide" },
						{ type: "separator" },
						{ role: "quit" },
					],
				},
			]),
		);
	} else {
		Menu.setApplicationMenu(null);
	}
}

/** Windows/Linux: default menu can still attach to the frame; strip it on every window. */
if (!isMac) {
	app.on("browser-window-created", (_event, win) => {
		win.removeMenu();
		win.setMenuBarVisibility(false);
	});
}

const wayofworkUiRoot = path.join(__dirname, "..");
let startBunServerInFlight = false;

/** Opt out of dev-time Bun autostart (Electron still loads Vite; use manual `bun run server` or Start service). */
function electronSkipBunAutostart() {
	const v = String(process.env.WOP_ELECTRON_SKIP_BUN_AUTOSTART ?? "").trim().toLowerCase();
	return v === "1" || v === "true" || v === "yes" || v === "on";
}

/**
 * Electron dev: ensure Bun serves `/api/health` on `WOP_SERVER_PORT` (spawn `bun run server/index.ts` from `apps/wayofwork-ui` if needed).
 * Used at startup and by IPC **Start service**.
 */
async function ensureWayofpiBunServerDev() {
	if (!isDev) {
		return {
			ok: false,
			message:
				"Start service is only available when the desktop shell runs in dev (ELECTRON_DEV=1). In production the API is bundled with `bun run start`.",
		};
	}
	const port = String(process.env.WOP_SERVER_PORT || "3333").trim() || "3333";
	const healthUrl = `http://127.0.0.1:${port}/api/health`;

	async function wayofworkBunApiState() {
		try {
			const ac = new AbortController();
			const t = setTimeout(() => ac.abort(), 900);
			const r = await fetch(healthUrl, {
				signal: ac.signal,
				headers: { Accept: "application/json" },
			});
			clearTimeout(t);
			if (!r.ok) return "absent";
			const j = await r.json().catch(() => ({}));
			const c = j?.capabilities;
			if (
				c?.workspaceProblems === true &&
				c?.configRuntimePost === true &&
				c?.clawHostTreeGet === true &&
				c?.clawTelegramStatusGet === true
			) {
				return "fresh";
			}
			return "stale";
		} catch {
			return "absent";
		}
	}

	if (startBunServerInFlight) {
		return { ok: false, message: "A start request is already in progress." };
	}
	startBunServerInFlight = true;
	try {
		const state = await wayofworkBunApiState();
		if (state === "fresh") {
			return {
				ok: true,
				alreadyRunning: true,
				message: `Bun API is already reachable at ${healthUrl}.`,
			};
		}
		if (state === "stale") {
			return {
				ok: false,
				staleServer: true,
				message: `Port ${port} responds to /api/health but not this app’s current API (missing workspaceProblems, configRuntimePost, clawHostTreeGet, and/or clawTelegramStatusGet — old Bun). Stop the old process, then try Start service again, or: cd apps/wayofwork-ui && bun run server/index.ts`,
			};
		}
		const bunExe = process.platform === "win32" ? "bun.exe" : "bun";
		const child = spawn(bunExe, ["run", "server/index.ts"], {
			cwd: wayofworkUiRoot,
			detached: true,
			stdio: "ignore",
			env: {
				...process.env,
				NODE_ENV: "development",
				PATH: wayofworkEnrichedPath(process.env.PATH),
			},
		});
		child.on("error", (err) => {
			console.error("[wayofwork] failed to spawn Bun server:", err);
		});
		child.unref();

		const deadline = Date.now() + 20_000;
		while (Date.now() < deadline) {
			await new Promise((resolve) => setTimeout(resolve, 400));
			if ((await wayofworkBunApiState()) === "fresh") {
				return {
					ok: true,
					message: `Started Bun server (apps/wayofwork-ui) — ${healthUrl} is responding.`,
				};
			}
		}
		return {
			ok: false,
			message: `Bun did not become ready on port ${port} within 20s. Install Bun, run from repo root, or start manually: cd apps/wayofwork-ui && bun run server/index.ts`,
		};
	} finally {
		startBunServerInFlight = false;
	}
}

function registerWopShellIpc() {
	ipcMain.handle("wop-shell:reload", (event) => {
		BrowserWindow.fromWebContents(event.sender)?.webContents.reload();
	});
	ipcMain.handle("wop-shell:reload-hard", (event) => {
		BrowserWindow.fromWebContents(event.sender)?.webContents.reloadIgnoringCache();
	});
	ipcMain.handle("wop-shell:toggle-devtools", (event) => {
		const wc = BrowserWindow.fromWebContents(event.sender)?.webContents;
		if (!wc) return;
		if (wc.isDevToolsOpened()) wc.closeDevTools();
		else wc.openDevTools({ mode: "detach" });
	});
	ipcMain.handle("wop-shell:close-window", (event) => {
		BrowserWindow.fromWebContents(event.sender)?.close();
	});
	ipcMain.handle("wop-shell:open-external-url", async (_event, rawUrl) => {
		const url = String(rawUrl ?? "").trim();
		if (!/^https?:\/\//i.test(url)) {
			throw new Error("openExternalUrl: only http(s) URLs are allowed");
		}
		await shell.openExternal(url);
	});
	/** Cursor / VS Code–style “Save Workspace As…” — returns an absolute path on disk. */
	ipcMain.handle("wop-shell:save-workspace-file", async (event, suggestedName) => {
		const win = BrowserWindow.fromWebContents(event.sender);
		if (!win) return { error: "no window" };
		const defaultPath = String(suggestedName ?? "").trim() || "wayof-pi.code-workspace";
		const r = await dialog.showSaveDialog(win, {
			title: "Save Workspace",
			defaultPath,
			filters: [
				{ name: "Code Workspace", extensions: ["code-workspace"] },
				{ name: "JSON", extensions: ["json"] },
			],
		});
		if (r.canceled || !r.filePath) return { cancelled: true };
		return { path: r.filePath };
	});

	/** Editor “Save As…” — absolute path on the local machine (same host as the Bun workspace in desktop dev). */
	ipcMain.handle("wop-shell:save-file", async (event, payload) => {
		const win = BrowserWindow.fromWebContents(event.sender);
		if (!win) return { error: "no window" };
		const raw = payload && typeof payload === "object" ? payload : {};
		const defaultPath = String(raw.defaultPath ?? "").trim() || "untitled.txt";
		const r = await dialog.showSaveDialog(win, {
			title: "Save As",
			defaultPath,
		});
		if (r.canceled || !r.filePath) return { cancelled: true };
		return { path: r.filePath };
	});

	/**
	 * Electron dev: Vite proxies `/api` to Bun on `WOP_SERVER_PORT`. If Bun is down, spawn
	 * `bun run server/index.ts` from `apps/wayofwork-ui` (parent of this `electron/` folder).
	 * Same logic as startup autostart (`ensureWayofpiBunServerDev`).
	 */
	ipcMain.handle("wop-shell:start-wayofwork-bun-server", () => ensureWayofpiBunServerDev());
}

const devUrl = process.env.WOP_ELECTRON_DEV_URL || "http://127.0.0.1:5173";
const serverPort = process.env.WOP_SERVER_PORT || "3333";
const prodUrl =
	process.env.WOP_ELECTRON_PROD_URL || `http://127.0.0.1:${serverPort}/`;

function createWindow() {
	const win = new BrowserWindow({
		width: 1400,
		height: 900,
		minWidth: 800,
		minHeight: 600,
		title: "Way of Work",
		...(isMac ? {} : { icon: dockIconForPlatform() }),
		autoHideMenuBar: !isMac,
		webPreferences: {
			preload: preloadPath,
			nodeIntegration: false,
			contextIsolation: true,
			sandbox: true,
		},
	});

	if (!isMac) {
		win.removeMenu();
		win.setMenuBarVisibility(false);
	}

	const url = isDev ? devUrl : prodUrl;
	void win.loadURL(url);

	/**
	 * Keep http(s) and blob: popups inside Electron (same as clicking links with target=_blank in the UI).
	 * `shell.openExternal` would send every link to the system browser, which feels broken for Help →
	 * Give feedback / Support us and for in-app raw JSON tabs.
	 */
	win.webContents.setWindowOpenHandler(({ url: target }) => {
		const t = String(target ?? "").trim();
		const allowInApp = /^https?:\/\//i.test(t) || t.startsWith("blob:");
		if (!allowInApp) return { action: "deny" };
		return {
			action: "allow",
			overrideBrowserWindowOptions: {
				width: 1200,
				height: 820,
				minWidth: 560,
				minHeight: 400,
				autoHideMenuBar: !isMac,
				...(isMac ? {} : { icon: dockIconForPlatform() }),
				webPreferences: {
					nodeIntegration: false,
					contextIsolation: true,
					sandbox: true,
				},
			},
		};
	});
}

app.whenReady().then(async () => {
	applyMacOSDockBranding();
	registerWopShellIpc();
	setChromeMenus();
	if (isDev && !electronSkipBunAutostart()) {
		const r = await ensureWayofpiBunServerDev();
		if (r.ok) {
			console.log("[wayofwork-electron] Bun API:", r.message);
		} else if (!r.alreadyRunning) {
			console.warn("[wayofwork-electron] Bun API autostart:", r.message);
		}
	}
	createWindow();
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
