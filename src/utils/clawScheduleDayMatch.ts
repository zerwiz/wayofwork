/**
 * Whether a Claw schedule applies to a local calendar day (cron or one-time).
 */
import type { ClawSchedule } from "../../shared/claw-schedules-types";
import { fireTimesOnLocalDay, scheduleRunsOnLocalDay } from "./clawScheduleCronDay";
import { pad2, sameLocalDay } from "./localCalendarDate";

export function scheduleAppliesToLocalDay(s: ClawSchedule, day: Date): boolean {
	if (s.triggerMode === "once" && s.runOnceAt) {
		const at = new Date(s.runOnceAt);
		if (Number.isNaN(at.getTime())) return false;
		return sameLocalDay(at, day);
	}
	return scheduleRunsOnLocalDay(s.cron, day);
}

export function scheduleFireTimesOnLocalDay(s: ClawSchedule, day: Date, cap = 12): string[] {
	if (s.triggerMode === "once" && s.runOnceAt) {
		const at = new Date(s.runOnceAt);
		if (Number.isNaN(at.getTime()) || !sameLocalDay(at, day)) return [];
		return [`${pad2(at.getHours())}:${pad2(at.getMinutes())}`];
	}
	return fireTimesOnLocalDay(s.cron, day, cap);
}
