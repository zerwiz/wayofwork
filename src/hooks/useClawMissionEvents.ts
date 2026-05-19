import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../api/client";

export type ClawMissionEvent = {
	at: string;
	kind: "schedule" | "webhook";
	name: string;
	ok: boolean;
	error?: string | null;
};

export function useClawMissionEvents(pollMs = 25_000) {
	const [events, setEvents] = useState<ClawMissionEvent[]>([]);

	const refresh = useCallback(async () => {
		try {
			const r = await apiGet<{ version?: number; events?: ClawMissionEvent[] }>(
				"/api/claw/mission-events",
			);
			if (Array.isArray(r.events)) setEvents(r.events);
		} catch {
			/* ignore */
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

	return { events, refresh };
}
