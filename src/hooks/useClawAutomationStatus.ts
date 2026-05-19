import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../api/client";
import {
	ensureDevWayOfPiApiFresh,
	healthSupportsClawHostTree,
	staleWayOfPiApiMessage,
} from "../utils/wayofpiDevApiWarmup";

/** Fired after **`PUT /api/claw/schedules`** succeeds so Mission / automation UI can refresh without waiting for the poll interval. */
export const WAYOFPI_CLAW_SCHEDULES_SYNCED_EVENT = "wayofpi:claw-schedules-synced";

export type ClawAutomationStatus = {
	version: 1;
	piAutomationReady: boolean;
	schedulerEnvEnabled: boolean;
	schedulerRunning: boolean;
	webhookSecretConfigured: boolean;
	webhookInboundEnabled: boolean;
	schedulesDefinitionsPath: string;
	schedulesOnDisk: boolean;
};

export function useClawAutomationStatus(pollMs = 20_000) {
	const [status, setStatus] = useState<ClawAutomationStatus | null>(null);
	const [error, setError] = useState<string | null>(null);
	/** True after the first **`/api/claw/automation`** attempt finishes (success or failure). */
	const [loaded, setLoaded] = useState(false);

	const refresh = useCallback(async () => {
		setError(null);
		try {
			const caps = await ensureDevWayOfPiApiFresh();
			if (caps !== null && !healthSupportsClawHostTree(caps)) {
				setError(staleWayOfPiApiMessage());
				return;
			}
			try {
				const r = await apiGet<ClawAutomationStatus>("/api/claw/automation");
				if (r?.version === 1) {
					setStatus(r);
				} else {
					setError("Automation API returned an unexpected response.");
				}
			} catch (e1) {
				try {
					const cfg = await apiGet<{ clawAutomation?: ClawAutomationStatus }>("/api/config");
					if (cfg.clawAutomation?.version === 1) {
						setStatus(cfg.clawAutomation);
					} else {
						setError(e1 instanceof Error ? e1.message : String(e1));
					}
				} catch {
					setError(e1 instanceof Error ? e1.message : String(e1));
				}
			}
		} finally {
			setLoaded(true);
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	useEffect(() => {
		if (pollMs <= 0) return;
		const id = window.setInterval(() => void refresh(), pollMs);
		return () => window.clearInterval(id);
	}, [pollMs, refresh]);

	useEffect(() => {
		const on = () => {
			void refresh();
		};
		window.addEventListener(WAYOFPI_CLAW_SCHEDULES_SYNCED_EVENT, on);
		return () => window.removeEventListener(WAYOFPI_CLAW_SCHEDULES_SYNCED_EVENT, on);
	}, [refresh]);

	return { status, error, refresh, loaded };
}
