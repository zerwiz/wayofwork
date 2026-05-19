import { createConnection } from "node:net";

/** True if something accepts a TCP connection on `host:port` (e.g. Vite before `ngrok http`). */
export function probeTcpListening(port: number, host = "127.0.0.1", timeoutMs = 2000): Promise<boolean> {
	return new Promise((resolve) => {
		let settled = false;
		const finish = (ok: boolean) => {
			if (settled) return;
			settled = true;
			resolve(ok);
		};
		const socket = createConnection({ port, host, allowHalfOpen: true }, () => {
			socket.destroy();
			finish(true);
		});
		socket.on("error", () => finish(false));
		socket.setTimeout(timeoutMs, () => {
			socket.destroy();
			finish(false);
		});
	});
}
