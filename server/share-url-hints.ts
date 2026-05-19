import os from "node:os";
import { fetchNgrokPublicUrl } from "./ngrok-inspector";

/** Prefer typical LAN ranges over Docker bridges (172.17.x, etc.). */
function scoreLanCandidate(ip: string): number {
	if (ip.startsWith("192.168.")) return 100;
	if (ip.startsWith("10.")) return 90;
	const m = /^172\.(\d+)\./.exec(ip);
	if (m) {
		const second = Number(m[1]);
		if (second >= 16 && second <= 31) return 80;
	}
	if (ip.startsWith("169.254.")) return 20;
	return 10;
}

/** Best-effort primary IPv4 for “phone on same Wi‑Fi” URLs (not guaranteed if multiple NICs). */
export function guessLanIPv4(): string | null {
	const nets = os.networkInterfaces();
	const candidates: string[] = [];
	for (const addrs of Object.values(nets)) {
		for (const net of addrs ?? []) {
			const fam = net.family;
			if (fam !== "IPv4" && fam !== 4) continue;
			if (net.internal) continue;
			candidates.push(net.address);
		}
	}
	if (candidates.length === 0) return null;
	candidates.sort((a, b) => scoreLanCandidate(b) - scoreLanCandidate(a));
	return candidates[0] ?? null;
}

export type ShareUrlHintsJson = {
	ok: true;
	lanIPv4: string | null;
	/** `http://<lan>:<vitePort>/` when `lanIPv4` is known */
	lanUrl: string | null;
	vitePort: number;
	/** First HTTPS (else HTTP) tunnel from ngrok local inspector, or null if ngrok is not running */
	ngrokPublicUrl: string | null;
};

export async function getShareUrlHintsJson(): Promise<ShareUrlHintsJson> {
	const raw = String(process.env.WOP_VITE_PORT ?? process.env.VITE_DEV_SERVER_PORT ?? "5173").trim();
	const vitePort = /^\d+$/.test(raw)
		? Math.min(65535, Math.max(1, Number.parseInt(raw, 10)))
		: 5173;
	const lanIPv4 = guessLanIPv4();
	const lanUrl = lanIPv4 ? `http://${lanIPv4}:${vitePort}/` : null;

	const ngrokPublicUrl = await fetchNgrokPublicUrl(3500);

	return { ok: true, lanIPv4, lanUrl, vitePort, ngrokPublicUrl };
}
