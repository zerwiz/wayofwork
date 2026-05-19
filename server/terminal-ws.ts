import { spawn as nodeSpawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import type { ServerWebSocket, Subprocess } from "bun";

type BunTerminal = NonNullable<Subprocess["terminal"]>;
import { getWorkspaceRoot } from "./paths";
import { broadcastToolLog } from "./tool-log-broadcast";

function terminalEnvTruthy(): boolean {
	const v = process.env.WOP_ALLOW_TERMINAL?.trim().toLowerCase();
	return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function terminalAllowed(): boolean {
	return terminalEnvTruthy();
}

/** For `/api/config` — which shell the embedded terminal spawns (read-only; set on the server process). */
export function terminalShellHints(): {
	shellExecutable: string;
	shellArgs: string[];
	customShell: boolean;
	/** Same as Node `process.platform` (e.g. `linux`, `darwin`, `win32`). */
	platform: string;
	/** Same as Node `process.arch` (e.g. `arm64`, `x64`) — Apple Silicon macOS is `darwin` + `arm64`. */
	arch: string;
} {
	const { file, args } = shellArgv();
	return {
		shellExecutable: file,
		shellArgs: args,
		customShell: Boolean(process.env.WOP_SHELL?.trim()),
		platform: process.platform,
		arch: process.arch,
	};
}

/** POSIX: real PTY via `Bun.spawn` `terminal` option. Windows / fallback: piped `child_process`. */
export type TerminalSession =
	| { mode: "pty"; proc: Subprocess & { terminal: BunTerminal } }
	| { mode: "pipe"; child: ChildProcessWithoutNullStreams };

export type TerminalWsData = {
	kind: "terminal";
	session: TerminalSession | null;
	/** Client stdin chunks until CR/LF — used for Tool log (Pi-style `bash`). */
	stdinLogBuffer: string;
};

function shellArgv(): { file: string; args: string[] } {
	if (process.platform === "win32") {
		return { file: "cmd.exe", args: ["/K"] };
	}
	const custom = process.env.WOP_SHELL?.trim();
	if (custom) {
		return { file: custom, args: [] };
	}
	return { file: "/bin/bash", args: [] };
}

/** Piped Bash without a TTY needs `-i` so Readline runs at all (still inferior to PTY). */
function shellArgvPipeUnix(): { file: string; args: string[] } {
	const base = shellArgv();
	if (process.platform === "win32") return base;
	if (base.file.endsWith("bash") && base.args.length === 0) {
		return { file: base.file, args: ["-i"] };
	}
	return base;
}

function utf8FromPtyChunk(data: Uint8Array): string {
	return new TextDecoder("utf-8", { fatal: false }).decode(data);
}

function attachPipeSession(
	ws: ServerWebSocket<TerminalWsData>,
	cwd: string,
	file: string,
	args: string[],
	safeSend: (payload: object) => void,
): boolean {
	let child: ChildProcessWithoutNullStreams;
	try {
		child = nodeSpawn(file, args, {
			cwd,
			env: {
				...process.env,
				TERM: "xterm-256color",
				COLORTERM: "truecolor",
			},
			stdio: ["pipe", "pipe", "pipe"],
			windowsHide: true,
		}) as ChildProcessWithoutNullStreams;
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		safeSend({ type: "term_error", message: `Failed to start shell: ${message}` });
		ws.close();
		return false;
	}

	ws.data.session = { mode: "pipe", child };

	child.stdout.setEncoding("utf8");
	child.stderr.setEncoding("utf8");

	child.stdout.on("data", (chunk: string) => {
		safeSend({ type: "term_out", stream: "stdout", data: chunk });
	});
	child.stderr.on("data", (chunk: string) => {
		safeSend({ type: "term_out", stream: "stderr", data: chunk });
	});

	child.on("error", (err) => {
		safeSend({ type: "term_error", message: err.message });
	});

	child.on("close", (code) => {
		safeSend({ type: "term_exit", code: code ?? 0 });
		try {
			ws.close();
		} catch {
			/* ignore */
		}
	});

	safeSend({ type: "term_ready", cwd });
	return true;
}

function tryAttachPtySession(
	ws: ServerWebSocket<TerminalWsData>,
	cwd: string,
	file: string,
	args: string[],
	safeSend: (payload: object) => void,
): boolean {
	let proc: Subprocess;
	try {
		proc = Bun.spawn([file, ...args], {
			cwd,
			env: {
				...process.env,
				TERM: "xterm-256color",
				COLORTERM: "truecolor",
			},
			onExit(_sub, exitCode, _signalCode) {
				safeSend({ type: "term_exit", code: exitCode ?? 0 });
				try {
					ws.close();
				} catch {
					/* ignore */
				}
			},
			terminal: {
				cols: 80,
				rows: 24,
				name: "xterm-256color",
				data(_terminal, data: Uint8Array) {
					const text = utf8FromPtyChunk(data);
					if (text.length > 0) {
						safeSend({ type: "term_out", stream: "stdout", data: text });
					}
				},
			},
		});
	} catch {
		return false;
	}

	const term = proc.terminal;
	if (!term) {
		try {
			proc.kill?.("SIGTERM");
		} catch {
			/* ignore */
		}
		return false;
	}

	ws.data.session = { mode: "pty", proc: proc as Subprocess & { terminal: BunTerminal } };
	safeSend({ type: "term_ready", cwd });
	return true;
}

export function attachTerminalSession(ws: ServerWebSocket<TerminalWsData>): void {
	const cwd = getWorkspaceRoot();
	if (!cwd || !existsSync(cwd)) {
		ws.send(
			JSON.stringify({
				type: "term_error",
				message: "No workspace folder (open a folder in Way of Pi so the server has a cwd).",
			}),
		);
		ws.close();
		return;
	}

	const safeSend = (payload: object) => {
		if (ws.readyState !== WebSocket.OPEN) return;
		try {
			ws.send(JSON.stringify(payload));
		} catch {
			/* ignore */
		}
	};

	const { file, args } = shellArgv();

	if (process.platform !== "win32") {
		if (tryAttachPtySession(ws, cwd, file, args, safeSend)) {
			return;
		}
		const pipe = shellArgvPipeUnix();
		attachPipeSession(ws, cwd, pipe.file, pipe.args, safeSend);
		return;
	}

	attachPipeSession(ws, cwd, file, args, safeSend);
}

function shouldLogTerminalLine(line: string): boolean {
	const t = line.replace(/\r/g, "").trim();
	if (!t) return false;
	if (t.startsWith("\x1b")) return false;
	if (t.includes("\x1b[200~") || t.includes("\x1b[201~")) return false;
	return true;
}

function appendStdinForToolLog(ws: ServerWebSocket<TerminalWsData>, chunk: string): void {
	let buf = (ws.data.stdinLogBuffer ?? "") + chunk;
	for (;;) {
		const m = buf.match(/[\r\n]/);
		if (!m || m.index === undefined) break;
		const end = m.index + m[0].length;
		const line = buf.slice(0, m.index);
		buf = buf.slice(end);
		if (shouldLogTerminalLine(line)) {
			const one = line.replace(/\s+/g, " ").trim();
			if (one.length > 0) {
				const preview = one.length > 500 ? `${one.slice(0, 497)}…` : one;
				broadcastToolLog("INFO", "bash", preview);
			}
		}
	}
	ws.data.stdinLogBuffer = buf;
}

export function handleTerminalMessage(ws: ServerWebSocket<TerminalWsData>, raw: string | Buffer): void {
	const session = ws.data.session;
	if (!session) return;

	let msg: { type?: string; data?: string; cols?: number; rows?: number };
	try {
		msg = JSON.parse(String(raw)) as typeof msg;
	} catch {
		return;
	}

	if (msg.type === "term_in" && typeof msg.data === "string") {
		if (session.mode === "pty") {
			try {
				session.proc.terminal.write(msg.data);
			} catch {
				/* ignore */
			}
		} else if (session.child.stdin?.writable) {
			try {
				session.child.stdin.write(msg.data, "utf8");
			} catch {
				/* ignore */
			}
		} else {
			return;
		}
		appendStdinForToolLog(ws, msg.data);
		return;
	}

	if (msg.type === "term_resize" && session.mode === "pty") {
		const cols = msg.cols;
		const rows = msg.rows;
		if (typeof cols === "number" && typeof rows === "number" && cols > 0 && rows > 0) {
			try {
				session.proc.terminal.resize(cols, rows);
			} catch {
				/* ignore */
			}
		}
	}
}

export function disposeTerminal(ws: ServerWebSocket<TerminalWsData>): void {
	const session = ws.data.session;
	ws.data.session = null;
	if (!session) return;

	if (session.mode === "pty") {
		try {
			session.proc.kill("SIGTERM");
		} catch {
			/* ignore */
		}
		try {
			session.proc.terminal.close();
		} catch {
			/* ignore */
		}
		setTimeout(() => {
			try {
				if (!session.proc.killed) session.proc.kill("SIGKILL");
			} catch {
				/* ignore */
			}
		}, 400);
		return;
	}

	const child = session.child;
	try {
		child.stdout.destroy();
		child.stderr.destroy();
		child.stdin.destroy();
	} catch {
		/* ignore */
	}
	try {
		child.kill("SIGTERM");
	} catch {
		/* ignore */
	}
	setTimeout(() => {
		try {
			if (!child.killed) child.kill("SIGKILL");
		} catch {
			/* ignore */
		}
	}, 400);
}
