/**
 * Bounds the **non-system** tail of `messages` before Bun / headless Pi requests so long sessions
 * do not grow prompts without bound (Pi TUI does compaction; Bun path does not).
 * See **`docs/WOP_PI_TOKEN_CONTEXT_DISCIPLINE.md`**.
 */

import type { ChatMessage } from "./chat";

function countLeadingSystem(messages: ChatMessage[]): number {
	let n = 0;
	for (const m of messages) {
		if (m.role === "system") n += 1;
		else break;
	}
	return n;
}

function approxMessageChars(m: ChatMessage): number {
	let n = (m.content ?? "").length;
	if (m.tool_calls?.length) n += JSON.stringify(m.tool_calls).length;
	if (m.tool_call_id) n += m.tool_call_id.length;
	if (m.name) n += m.name.length;
	return n;
}

function tailStats(messages: ChatMessage[], startIdx: number): { msgs: number; chars: number } {
	let msgs = 0;
	let chars = 0;
	for (let i = startIdx; i < messages.length; i++) {
		msgs += 1;
		chars += approxMessageChars(messages[i]);
	}
	return { msgs, chars };
}

function parsePositiveInt(env: string | undefined, fallback: number): number {
	const v = Number.parseInt((env ?? "").trim(), 10);
	return Number.isFinite(v) && v > 0 ? v : fallback;
}

/** When unset or truthy, apply caps. Set to **0**, **false**, **no**, or **off** to disable trimming. */
export function isChatContextBudgetEnabled(): boolean {
	const v = (process.env.WOP_CHAT_CONTEXT_BUDGET ?? "").trim().toLowerCase();
	if (!v) return true;
	return !["0", "false", "no", "off"].includes(v);
}

export function chatContextBudgetLimitsFromEnv(): { maxRestMessages: number; maxRestChars: number } {
	return {
		maxRestMessages: parsePositiveInt(process.env.WOP_CHAT_MAX_MESSAGES, 120),
		maxRestChars: parsePositiveInt(process.env.WOP_CHAT_MAX_INPUT_CHARS, 120_000),
	};
}

export type ApplyChatContextBudgetResult = {
	/** Messages removed from between the system prefix and the kept tail. */
	droppedMessages: number;
	/** Sum of {@link approxMessageChars} for dropped rows (diagnostics only). */
	droppedApproxChars: number;
};

/**
 * Mutates **`messages` in place**: keeps all leading **`system`** rows, then drops oldest **full**
 * turns so the tail from the first kept **`user`** message satisfies message + character caps.
 * Never removes the last **`user`** row (current turn). Aligns with Pi “no mid-turn cut” at user boundaries.
 */
export function applyChatContextBudget(
	messages: ChatMessage[],
	onLog?: (level: "INFO" | "WARN", source: string, msg: string) => void,
): ApplyChatContextBudgetResult {
	const empty: ApplyChatContextBudgetResult = { droppedMessages: 0, droppedApproxChars: 0 };
	if (!isChatContextBudgetEnabled() || messages.length === 0) return empty;

	const { maxRestMessages, maxRestChars } = chatContextBudgetLimitsFromEnv();
	const prefixLen = countLeadingSystem(messages);
	const userStarts: number[] = [];
	for (let i = prefixLen; i < messages.length; i++) {
		if (messages[i]?.role === "user") userStarts.push(i);
	}
	if (userStarts.length === 0) return empty;

	const withinBudget = (startIdx: number): boolean => {
		const t = tailStats(messages, startIdx);
		return t.msgs <= maxRestMessages && t.chars <= maxRestChars;
	};

	/** Prefer maximum history: first user index whose suffix fits. */
	let chosenStart = userStarts[userStarts.length - 1]!;
	for (let k = 0; k < userStarts.length; k++) {
		const s = userStarts[k]!;
		if (withinBudget(s)) {
			chosenStart = s;
			break;
		}
	}

	const dropCount = chosenStart - prefixLen;
	if (dropCount <= 0) return empty;

	let droppedApproxChars = 0;
	for (let i = prefixLen; i < chosenStart; i++) {
		droppedApproxChars += approxMessageChars(messages[i]!);
	}
	messages.splice(prefixLen, dropCount);

	const msg =
		`Context budget: dropped ${dropCount} older message(s) (~${droppedApproxChars} chars) so the request stays within **WOP_CHAT_MAX_MESSAGES=${maxRestMessages}** and **WOP_CHAT_MAX_INPUT_CHARS=${maxRestChars}**. Prefer **WOP_CHAT_ENGINE=pi** for Pi-native compaction, or start a new session. See **docs/WOP_PI_TOKEN_CONTEXT_DISCIPLINE.md**.`;
	onLog?.("WARN", "chat", msg);

	return { droppedMessages: dropCount, droppedApproxChars };
}
