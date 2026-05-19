/**
 * **`piAutomationReady`** is **`shouldUsePiJsonChat()`** from **`agent-runtime`** — identical
 * to whether the Chat WebSocket would run **`pi --mode json`**. Claw schedules/webhooks reuse
 * that gate; there is no separate Claw Pi binary or env flag.
 */
import { clawSchedulerEnabledFromEnv } from "./claw-scheduler";
import {
	clawSchedulesFilesExist,
	clawSchedulesDefinitionsPathForDiagnostics,
} from "./claw-schedules-store";
import { clawWebhookConfigured, clawWebhookInboundEnabled } from "./claw-webhook-store";
import { shouldUsePiJsonChat } from "./agent-runtime";

export type ClawAutomationStatusV1 = {
	version: 1;
	/** Headless Pi available for schedule/webhook turns */
	piAutomationReady: boolean;
	/** `WOP_CLAW_SCHEDULER` — Bun process runs the cron / once-a-day checker */
	schedulerEnvEnabled: boolean;
	/** Same as env (timer only starts when env is on) */
	schedulerRunning: boolean;
	/** Host **`.claw/`** webhook secret store exists (see claw-webhook-store). */
	webhookSecretConfigured: boolean;
	/** POST `/api/claw/inbound` accepted (secret + not disabled by env) */
	webhookInboundEnabled: boolean;
	schedulesDefinitionsPath: string;
	schedulesOnDisk: boolean;
};

export function getClawAutomationStatus(): ClawAutomationStatusV1 {
	const files = clawSchedulesFilesExist();
	const secret = clawWebhookConfigured();
	return {
		version: 1,
		piAutomationReady: shouldUsePiJsonChat(),
		schedulerEnvEnabled: clawSchedulerEnabledFromEnv(),
		schedulerRunning: clawSchedulerEnabledFromEnv(),
		webhookSecretConfigured: secret,
		webhookInboundEnabled: clawWebhookInboundEnabled(),
		schedulesDefinitionsPath: clawSchedulesDefinitionsPathForDiagnostics(),
		schedulesOnDisk: files.definitions,
	};
}
