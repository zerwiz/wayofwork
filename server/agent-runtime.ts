/**
 * **Wo agent runtime** — routes all chat turns through `@wayofmono/wo-agent` SDK.
 *
 * Pi (`@earendil-works/pi-coding-agent`) is a dev CLI tool only.
 * No runtime code imports pi. All runtime chat goes through Wo.
 *
 * Engine modes (`WOP_CHAT_ENGINE`):
 * - **`sdk`** — use `@wayofmono/wo-agent` SDK directly (default).
 * - **`bundled`** / **`bun`** — force Bundled Bun HTTP streaming path.
 * - **Unset** or any other value — treated as **`sdk`**.
 */

import type { ChatMessage, ChatRuntimeModel, StreamChatResult } from "./chat";
import type { StreamTokenUsage } from "./chat-usage";
import { runSdkChatTurn } from "./sdk-runtime";

/**
 * Normalized `WOP_CHAT_ENGINE`:
 * - **`sdk`** — use `@wayofmono/wo-agent` SDK directly.
 * - **`bundled`** / **`bun`** — force Bundled Bun path (HTTP streaming).
 * - **Unset** or any other value — treated as **`sdk`**.
 */
export type WopChatEngineMode = "sdk" | "bundled";

export function wopChatEngineFromEnv(): WopChatEngineMode {
	const v = (process.env.WOP_CHAT_ENGINE || "").trim().toLowerCase();
	if (v === "sdk") return "sdk";
	if (v === "bundled" || v === "bun") return "bundled";
	return "sdk";
}

export function shouldUseSdkChat(): boolean {
	return wopChatEngineFromEnv() === "sdk";
}

/** Wo SDK is always available (installed in node_modules). */
export function isSdkAvailable(): boolean {
	return true;
}

/** Deprecated — kept for backward compat with claw-schedule-executor. */
export function shouldUsePiJsonChat(): boolean {
	return false;
}

/** Deprecated — kept for backward compat. */
export function getPiStackForSurface(_surface: string | null): string {
	return "";
}

/** Deprecated — kept for backward compat. */
export function resolvePiBinaryPath(): string | null {
	return null;
}

/** Deprecated — kept for backward compat. */
export function resolvePiLoaderPath(): string | null {
	return null;
}

export type RunPiChatTurnOpts = {
	piStack?: string;
	cwd: string;
	messages: ChatMessage[];
	onDelta: (s: string) => void;
	onReasoningDelta?: (s: string) => void;
	onStreamUsage?: (u: StreamTokenUsage) => void;
	onLog: (level: "INFO" | "WARN" | "ERROR", source: string, msg: string) => void;
	signal?: AbortSignal;
	runtime?: ChatRuntimeModel;
};

export async function runPiChatTurn(
	opts: RunPiChatTurnOpts,
): Promise<{ result: StreamChatResult; lastStreamUsage: StreamTokenUsage | null }> {
	if (!shouldUseSdkChat()) {
		return {
			result: { ok: false, error: "Chat engine is not SDK mode (set WOP_CHAT_ENGINE=sdk or unset)." },
			lastStreamUsage: null,
		};
	}

	return runSdkChatTurn({
		cwd: opts.cwd,
		messages: opts.messages,
		onDelta: opts.onDelta,
		onReasoningDelta: opts.onReasoningDelta,
		onStreamUsage: opts.onStreamUsage,
		onLog: opts.onLog,
		signal: opts.signal,
		runtime: opts.runtime,
	});
}
