/** Claw schedule row — definitions (UI + server). Last-run fields are merged from run-state on read. */
export type ScheduleStatus = "enabled" | "disabled";
export type ScheduleLastResult = "success" | "error" | null;
export type ScheduleTriggerMode = "cron" | "once";

export interface ClawSchedule {
  id: string;
  name: string;
  description: string;
  cron: string;
  triggerMode: ScheduleTriggerMode;
  runOnceAt: string | null;
  agentName: string | null;
  prompt: string;
  status: ScheduleStatus;
  lastRun: string | null;
  lastResult: ScheduleLastResult;
  createdAt: string;
}

export const CLAW_SCHEDULES_FILE_VERSION = 1 as const;

export interface ClawSchedulesDefinitionsFile {
  version: typeof CLAW_SCHEDULES_FILE_VERSION;
  schedules: ClawSchedule[];
}

export interface ClawScheduleRunEntry {
  lastRun: string | null;
  lastResult: ScheduleLastResult;
  lastError?: string | null;
}

export interface ClawScheduleRunsFile {
  version: 1;
  /** Per schedule id — updated only by the server scheduler / webhook executor */
  byId: Record<string, ClawScheduleRunEntry>;
}
