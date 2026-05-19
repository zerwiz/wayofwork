import { useEffect, useMemo, useState } from "react";
import { msUntilNextLocalMidnight, startOfLocalDay } from "../utils/localCalendarDate";

const POLL_MS = 60_000;

/**
 * Start of the user's **current** local civil day, kept in sync with the real clock:
 * bumps on a timer, at the next local midnight, when the tab becomes visible, and on window focus.
 * Long-lived sessions still show the correct "today" after date changes.
 */
export function useLocalTodayStart(): Date {
	const [tick, setTick] = useState(0);

	const bump = () => setTick((n) => n + 1);

	useEffect(() => {
		const interval = window.setInterval(bump, POLL_MS);
		const onVis = () => {
			if (document.visibilityState === "visible") bump();
		};
		document.addEventListener("visibilitychange", onVis);
		window.addEventListener("focus", bump);
		return () => {
			window.clearInterval(interval);
			document.removeEventListener("visibilitychange", onVis);
			window.removeEventListener("focus", bump);
		};
	}, []);

	useEffect(() => {
		const id = window.setTimeout(() => bump(), msUntilNextLocalMidnight(new Date()) + 50);
		return () => window.clearTimeout(id);
	}, [tick]);

	const now = useMemo(() => new Date(), [tick]);
	return useMemo(() => startOfLocalDay(now), [now]);
}
