import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../api/client";
import { parseClawWhatsAppStatusV1, type ClawWhatsAppStatusV1 } from "../../shared/claw-whatsapp-status";
import type { ServerConfig } from "./useServerConfig";

const POLL_MS = 30_000;

export type ClawWhatsAppLoadIssue = "stale_api" | "invalid_payload" | "network";

type LoadOk = { ok: true; status: ClawWhatsAppStatusV1 };
type LoadErr = { ok: false; issue: ClawWhatsAppLoadIssue; message: string };
type LoadResult = LoadOk | LoadErr;

async function loadWhatsAppStatus(): Promise<LoadResult> {
	let cfg: ServerConfig;
	try {
		cfg = await apiGet<ServerConfig>("/api/config");
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return {
			ok: false,
			issue: "network",
			message:
				`Could not load server settings (${message}). Start the Way of Work Bun API (same checkout as this UI), e.g. \`cd apps/wayofwork-ui && bun run dev\` or \`bun run server/index.ts\`, then refresh.`,
		};
	}

	const fromCfg = parseClawWhatsAppStatusV1((cfg as any).clawWhatsAppStatus);
	if (fromCfg) return { ok: true, status: fromCfg };

	try {
		const alt = await apiGet<ClawWhatsAppStatusV1>("/api/claw/whatsapp/status");
		const fromRoute = parseClawWhatsAppStatusV1(alt);
		if (fromRoute) return { ok: true, status: fromRoute };
	} catch {
		/* dedicated route missing on older Bun */
	}

	if ((cfg as any).capabilities?.clawWhatsAppStatusGet === true) {
		return {
			ok: false,
			issue: "invalid_payload",
			message:
				"The API reported WhatsApp support but returned an unexpected payload. Restart the Way of Work server from this repository.",
		};
	}

	return {
		ok: false,
		issue: "stale_api",
		message:
			"The process answering on your API port is an older Way of Work Bun build (no WhatsApp snapshot in /api/config). Stop that process, then start the server from this checkout — e.g. `cd apps/wayofwork-ui && bun run dev` or `bun run server/index.ts` — and click Refresh status.",
	};
}

export function useClawWhatsAppStatus() {
	const [status, setStatus] = useState<ClawWhatsAppStatusV1 | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [loadIssue, setLoadIssue] = useState<ClawWhatsAppLoadIssue | null>(null);

	const refresh = useCallback(async (mode: "full" | "silent" = "full") => {
		if (mode === "full") setLoading(true);
		setError(null);
		setLoadIssue(null);
		const result = await loadWhatsAppStatus();
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
