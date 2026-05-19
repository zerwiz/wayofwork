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

/**
 * Check if token file exists and is valid JSON.
 * Returns true if the file exists and is parseable as JSON.
 */
export function checkTokenFileExists(filepath: string): boolean {
  try {
    if (!filepath || typeof filepath !== "string") return false;
    const fs = require("fs");
    // Attempt to read and parse the file
    fs.readFileSync(filepath, "utf-8");
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse token file JSON (return undefined if missing/invalid).
 * Validates presence of required fields.
 */
export function parseTokenJson(filepath: string) {
  try {
    if (!filepath || typeof filepath !== "string") return undefined;
    const fs = require("fs");
    const content = fs.readFileSync(filepath, "utf-8").trim();
    return JSON.parse(content);
  } catch {
    return undefined;
  }
}

/**
 * Get global token path (~/.pi/agent/telegram.json).
 */
export function getGlobalTokenPath(): string {
  return "~/.pi/agent/telegram.json";
}

/**
 * Get workspace token path (.claw/telegram.json).
 */
export function getWorkspaceTokenPath(): string {
  return ".claw/telegram.json";
}

/**
 * Get settings path for workspace `.pi/settings.json`.
 */
export function getSettingsPath(): string {
  return ".pi/settings.json";
}

/**
 * Determine token source from filesystem state.
 * Implements the priority chain described above.
 */
export function checkTelegramStatus(): ClawTelegramStatusV1 {
  const globalPath = getGlobalTokenPath();
  const workspacePath = getWorkspaceTokenPath();

  const globalExists = checkTokenFileExists(globalPath) ?? false;
  const workspaceExists = checkTokenFileExists(workspacePath) ?? false;

  // Check any workspace .pi/settings.json lists pi-telegram
  // We'll assume the user has a single workspace for now
  const piTelegramInSettings = false; // TODO: Check all opened workspaces

  let source: ClawTelegramTokenSource;
  if (!globalExists && !workspaceExists) {
    source = "none";
  } else if (workspaceExists && !globalExists) {
    source = "workspace";
  } else if (!workspaceExists && globalExists) {
    source = "global";
  } else {
    source = "both";
  }

  return {
    version: CLAW_TELEGRAM_STATUS_VERSION,
    piTelegramInSettings,
    globalTokenConfigured: globalExists,
    workspaceTokenConfigured: workspaceExists,
    tokenSource: source,
  };
}
