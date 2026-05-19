/**
 * Browser dev: Vite proxies `/api` to Bun on WOP_SERVER_PORT. If nothing is listening,
 * or the UI was started with `vite` alone, Claw file calls 404. The Vite plugin exposes
 * POST `/__wop_dev/start-wayofpi-api` to spawn `bun run server/index.ts` (see vite.config.ts).
 */

export type WayofpiHealthCapabilities = {
	workspaceProblems?: boolean;
	configRuntimePost?: boolean;
	clawHostTreeGet?: boolean;
	clawTelegramStatusGet?: boolean;
};

export async function fetchWayofpiHealthCapabilities(): Promise<WayofpiHealthCapabilities | null> {
	try {
		const r = await fetch("/api/health", { headers: { Accept: "application/json" } });
		if (!r.ok) return null;
		const j = (await r.json().catch(() => null)) as { capabilities?: WayofpiHealthCapabilities } | null;
		if (!j || typeof j !== "object") return null;
		const c = j.capabilities;
		if (c && typeof c === "object") return c;
		/* Legacy server: 200 health JSON without `capabilities` — treat as unsupported. */
		return {};
	} catch {
		return null;
	}
}

/** True when this build’s Way of Pi Bun is answering (not an older server on the same port). */
export function healthSupportsClawHostTree(caps: WayofpiHealthCapabilities | null): boolean {
	return caps?.clawHostTreeGet === true;
}

/**
 * In Vite dev only, ask the dev server to start the Bun API if the port is empty or unreachable.
 * Does not replace a stale Bun on the port (plugin returns staleServer — user must stop it).
 */
export async function warmDevWayOfPiApiIfNeeded(): Promise<void> {
	if (!import.meta.env.DEV) return;
	try {
		const r = await fetch("/__wop_dev/start-wayofpi-api", { method: "POST" });
		await r.json().catch(() => ({}));
	} catch {
		/* No Vite plugin (preview / non-dev) */
	}
	await new Promise((r) => setTimeout(r, 700));
}

export function staleWayOfPiApiMessage(): string {
	return [
		"The process on your API port (default 3333, or WOP_SERVER_PORT) is an older Way of Pi server without the current Claw routes (files, schedules, mission APIs).",
		"Stop it, then start the current API from apps/wayofwork-ui:",
		"  bun run server/index.ts",
		"Or use: bun run dev (starts API + Vite together).",
		"Find the listener (Linux): ss -tlnp | grep :3333    (macOS): lsof -nP -iTCP:3333 | grep LISTEN",
	].join(" ");
}

/**
 * Returns latest `/api/health` capabilities. In Vite dev, may spawn the Bun API once and poll
 * until it is fresh, stale (old Bun on port), or the deadline passes.
 */
export async function ensureDevWayOfPiApiFresh(): Promise<WayofpiHealthCapabilities | null> {
	if (!import.meta.env.DEV) {
		return fetchWayofpiHealthCapabilities();
	}
	let caps = await fetchWayofpiHealthCapabilities();
	if (healthSupportsClawHostTree(caps)) return caps;

	await warmDevWayOfPiApiIfNeeded();
	const deadline = Date.now() + 20_000;
	while (Date.now() < deadline) {
		caps = await fetchWayofpiHealthCapabilities();
		if (caps !== null && !healthSupportsClawHostTree(caps)) return caps;
		if (healthSupportsClawHostTree(caps)) return caps;
		await new Promise((r) => setTimeout(r, 450));
	}
	return fetchWayofpiHealthCapabilities();
}

/** @deprecated Use {@link ensureDevWayOfPiApiFresh} */
export const ensureDevWayOfPiApiForClawFiles = ensureDevWayOfPiApiFresh;
