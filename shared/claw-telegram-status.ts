/**
 * Claw Channels — Telegram integration snapshot (filesystem only).
 * Never includes secrets; Pi owns live polling after `/telegram-connect`.
 */
export const CLAW_TELEGRAM_STATUS_VERSION = 1 as const;

export type ClawTelegramTokenSource = "none" | "workspace" | "global" | "both";

export type ClawTelegramStatusV1 = {
  version: typeof CLAW_TELEGRAM_STATUS_VERSION;
  /** `~/.pi/agent/telegram.json` (pi-telegram default). */
  globalTokenConfigured: boolean;
  /** Host `.claw/telegram.json` next to `workspace/` (optional override / future T-3). */
  workspaceTokenConfigured: boolean;
  /** Any opened workspace `.pi/settings.json` lists pi-telegram. */
  piTelegramInSettings: boolean;
  tokenSource: ClawTelegramTokenSource;
};

const TOKEN_SOURCES: ClawTelegramTokenSource[] = [
  "none",
  "workspace",
  "global",
  "both",
];

/** Validate JSON from **`GET /api/config`** → **`clawTelegramStatus`** or the dedicated status route. */
export function parseClawTelegramStatusV1(
  raw: unknown,
): ClawTelegramStatusV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== CLAW_TELEGRAM_STATUS_VERSION) return null;
  const ts = o.tokenSource;
  if (
    typeof ts !== "string" ||
    !TOKEN_SOURCES.includes(ts as ClawTelegramTokenSource)
  )
    return null;
  for (const k of [
    "globalTokenConfigured",
    "workspaceTokenConfigured",
    "piTelegramInSettings",
  ] as const) {
    if (typeof o[k] !== "boolean") return null;
  }
  return {
    version: CLAW_TELEGRAM_STATUS_VERSION,
    globalTokenConfigured: o.globalTokenConfigured as boolean,
    workspaceTokenConfigured: o.workspaceTokenConfigured as boolean,
    piTelegramInSettings: o.piTelegramInSettings as boolean,
    tokenSource: ts as ClawTelegramTokenSource,
  };
}
