/** Read ngrok agent local inspector (default `http://127.0.0.1:4040/api/tunnels`). */

/** Base URL for ngrok’s local API (no trailing slash). Override if the agent uses a non-default web UI address. */
export function ngrokInspectorBaseUrl(): string {
	const raw = process.env.WOP_NGROK_WEB_ADDR?.trim();
	if (!raw) return "http://127.0.0.1:4040";
	if (raw.startsWith("http://") || raw.startsWith("https://")) return raw.replace(/\/+$/, "");
	return `http://${raw.replace(/\/+$/, "")}`;
}

export function ngrokInspectorTunnelsUrl(): string {
	return `${ngrokInspectorBaseUrl()}/api/tunnels`;
}

type TunnelJson = {
	public_url?: string;
	proto?: string;
	config?: { addr?: string };
};

function pickHttpPublicUrl(tunnels: TunnelJson[]): string | null {
	const list = Array.isArray(tunnels) ? tunnels : [];
	const httpish = list.filter((t) => {
		const p = String(t.proto ?? "").toLowerCase();
		return p === "https" || p === "http";
	});
	const urls = httpish
		.map((t) => String(t.public_url ?? "").trim())
		.filter((u) => u.startsWith("http:") || u.startsWith("https:"));
	const https = urls.find((u) => u.startsWith("https:"));
	const http = urls.find((u) => u.startsWith("http:"));
	const pick = https ?? http ?? null;
	return pick ? (pick.endsWith("/") ? pick : `${pick}/`) : null;
}

/**
 * Best-effort HTTPS (else HTTP) URL from the ngrok agent API.
 * Uses a generous default timeout so slow hosts still get a URL after `ngrok http` starts.
 */
export async function fetchNgrokPublicUrl(timeoutMs = 3000): Promise<string | null> {
	try {
		const ac = new AbortController();
		const t = setTimeout(() => ac.abort(), timeoutMs);
		const r = await fetch(ngrokInspectorTunnelsUrl(), {
			signal: ac.signal,
			headers: { Accept: "application/json" },
		});
		clearTimeout(t);
		if (!r.ok) return null;
		const j = (await r.json()) as { tunnels?: TunnelJson[] };
		return pickHttpPublicUrl(j.tunnels ?? []);
	} catch {
		return null;
	}
}
