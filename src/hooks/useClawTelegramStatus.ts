import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../api/client";
import { parseClawTelegramStatusV1, type ClawTelegramStatusV1 } from "../../shared/claw-telegram-status";
import type { ServerConfig } from "./useServerConfig";

const POLL_MS = 30_000;

/** Why the Telegram snapshot could not load (distinct from “no token on disk”). */
export type ClawTelegramLoadIssue = "stale_api" | "invalid_payload" | "network";

type LoadOk = { ok: true; status: ClawTelegramStatusV1 };
type LoadErr = { ok: false; issue: ClawTelegramLoadIssue; message: string };
type LoadResult = LoadOk | LoadErr;

async function loadTelegramStatus(): Promise<LoadResult> {
	let cfg: ServerConfig;
	try {
		cfg = await apiGet<ServerConfig>("/api/config");
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return {
			ok: false,
			issue: "network",
			message:
				`Could not load server settings (${message}). Start the Way of Pi Bun API (same checkout as this UI), e.g. \`cd apps/wayofwork-ui && bun run dev\` or \`bun run server/index.ts\`, then refresh.`,
		};
	}

	const fromCfg = parseClawTelegramStatusV1(cfg.clawTelegramStatus);
	if (fromCfg) return { ok: true, status: fromCfg };

	try {
		const alt = await apiGet<ClawTelegramStatusV1>("/api/claw/telegram/status");
		const fromRoute = parseClawTelegramStatusV1(alt);
		if (fromRoute) return { ok: true, status: fromRoute };
	} catch {
		/* dedicated route missing on older Bun */
	}

	if (cfg.capabilities?.clawTelegramStatusGet === true) {
		return {
			ok: false,
			issue: "invalid_payload",
			message:
				"The API reported Telegram support but returned an unexpected payload. Restart the Way of Pi server from this repository.",
		};
	}

	return {
		ok: false,
		issue: "stale_api",
		message:
			"The process answering on your API port is an older Way of Pi Bun build (no Telegram snapshot in /api/config). Stop that process, then start the server from this checkout — e.g. `cd apps/wayofwork-ui && bun run dev` or `bun run server/index.ts` — and click Refresh status.",
	};
}

export function useClawTelegramStatus() {
	const [status, setStatus] = useState<ClawTelegramStatusV1 | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [loadIssue, setLoadIssue] = useState<ClawTelegramLoadIssue | null>(null);

	const refresh = useCallback(async (mode: "full" | "silent" = "full") => {
		if (mode === "full") setLoading(true);
		setError(null);
		setLoadIssue(null);
		const result = await loadTelegramStatus();
		if (result.ok) {
			setStatus(result.status);
		} else {
			setStatus(null);
			setLoadIssue(result.issue);
			setError(result.message);
		}
		if (mode === "full") setLoading(false);
	}, []);

	useEffect(() => {
		void refresh("full");
		const id = window.setInterval(() => void refresh("silent"), POLL_MS);
		return () => window.clearInterval(id);
	}, [refresh]);

	return { status, loading, error, loadIssue, refresh };
}
