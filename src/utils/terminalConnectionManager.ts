import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { registerTerminalInputSender } from "./terminalInputBridge";

const WOP_TERMINAL_CURSOR = "#E95420";
const WOP_TERMINAL_CURSOR_ACCENT = "#ffffff";

let ws: WebSocket | null = null;
let term: Terminal | null = null;
let fit: FitAddon | null = null;
let ro: ResizeObserver | null = null;
let winResizeHandler: (() => void) | null = null;
let containerEl: HTMLDivElement | null = null;

function terminalWsUrl(): string {
	const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
	return `${proto}//${window.location.host}/ws/terminal`;
}

function createTerminal(fontSize: number, fontFamily: string): Terminal {
	const t = new Terminal({
		cursorBlink: true,
		cursorStyle: "block",
		fontSize,
		fontFamily,
		theme: {
			background: "#1e1e1e",
			foreground: "#d4d4d4",
			cursor: WOP_TERMINAL_CURSOR,
			cursorAccent: WOP_TERMINAL_CURSOR_ACCENT,
			black: "#1e1e1e",
			red: "#f14c4c",
			green: "#89d185",
			yellow: "#dcdcaa",
			blue: "#569cd6",
			cyan: "#4ec9b0",
			white: "#d4d4d4",
			brightBlack: "#858585",
		},
	});
	return t;
}

function createWebSocket(): WebSocket {
	const sock = new WebSocket(terminalWsUrl());
	let open = false;

	sock.onopen = () => {
		open = true;
		term?.focus();
		registerTerminalInputSender((data) => {
			if (sock.readyState === WebSocket.OPEN) {
				sock.send(JSON.stringify({ type: "term_in", data }));
			}
		});
	};

	sock.onmessage = (ev) => {
		try {
			const msg = JSON.parse(String(ev.data)) as {
				type?: string;
				data?: string;
				stream?: string;
				message?: string;
				cwd?: string;
				code?: number;
			};
			if (msg.type === "term_ready" && msg.cwd) {
				term?.writeln(`\x1b[90m# cwd: ${msg.cwd}\x1b[0m`);
				term?.focus();
				return;
			}
			if (msg.type === "term_out" && typeof msg.data === "string") {
				term?.write(msg.data);
				return;
			}
			if (msg.type === "term_error" && msg.message) {
				term?.writeln(`\r\n\x1b[31m${msg.message}\x1b[0m\r\n`);
				return;
			}
			if (msg.type === "term_exit") {
				term?.writeln(`\r\n\x1b[90m[Process exited${msg.code != null ? ` (${msg.code})` : ""}]\x1b[0m\r\n`);
			}
		} catch {
			/* ignore */
		}
	};

	sock.onerror = () => {
		if (open) return;
		term?.writeln("\r\n\x1b[31mTerminal WebSocket error (server running with WOP_ALLOW_TERMINAL=1?)\x1b[0m\r\n");
	};

	sock.onclose = () => {
		open = false;
	};

	return sock;
}

export function ensureConnection(fontSize: number, fontFamily: string): void {
	if (ws && ws.readyState === WebSocket.OPEN) return;
	if (!ws || ws.readyState === WebSocket.CLOSED) {
		ws?.close();
		ws = createWebSocket();
	}
	if (!term) {
		term = createTerminal(fontSize, fontFamily);
		fit = new FitAddon();
		term.loadAddon(fit);
	}
}

export function attachTerminal(container: HTMLDivElement): void {
	containerEl = container;
	if (!term || !fit) return;

	term.open(container);
	try {
		fit.fit();
	} catch {
		/* ignore */
	}
	term.focus();

	if (ro) ro.disconnect();
	ro = new ResizeObserver(() => {
		try {
			fit?.fit();
			const dims = fit?.proposeDimensions();
			if (dims && ws?.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: "term_resize", cols: dims.cols, rows: dims.rows }));
			}
		} catch {
			/* ignore */
		}
	});
	ro.observe(container);

	if (winResizeHandler) window.removeEventListener("resize", winResizeHandler);
	winResizeHandler = () => {
		try {
			fit?.fit();
		} catch {
			/* ignore */
		}
	};
	window.addEventListener("resize", winResizeHandler);
}

export function detachTerminal(): void {
	if (ro) {
		ro.disconnect();
		ro = null;
	}
	if (winResizeHandler) {
		window.removeEventListener("resize", winResizeHandler);
		winResizeHandler = null;
	}
	if (term && containerEl) {
		term.write("");
	}
	containerEl = null;
}

export function disposeConnection(): void {
	detachTerminal();
	registerTerminalInputSender(null);
	if (ws) {
		try { ws.close(); } catch { /* ignore */ }
		ws = null;
	}
	if (term) {
		term.dispose();
		term = null;
	}
	fit = null;
}

export function isConnected(): boolean {
	return ws?.readyState === WebSocket.OPEN;
}
