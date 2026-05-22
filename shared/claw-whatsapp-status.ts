/**
 * Claw Channels — WhatsApp integration snapshot (filesystem only).
 * Never includes secrets; Pi owns live polling after pairing.
 */
export const CLAW_WHATSAPP_STATUS_VERSION = 1 as const;

export type ClawWhatsAppTokenSource = "none" | "workspace" | "global" | "both";

export type ClawWhatsAppStatusV1 = {
  version: typeof CLAW_WHATSAPP_STATUS_VERSION;
  /** `~/.pi/agent/whatsapp.json` */
  globalTokenConfigured: boolean;
  /** `.claw/whatsapp.json` (workspace-specific override). */
  workspaceTokenConfigured: boolean;
  /** Any opened workspace `.pi/settings.json` lists pi-whatsapp. */
  piWhatsAppInSettings: boolean;
  tokenSource: ClawWhatsAppTokenSource;
};

const TOKEN_SOURCES: ClawWhatsAppTokenSource[] = [
  "none",
  "workspace",
  "global",
  "both",
];

export function parseClawWhatsAppStatusV1(
  raw: unknown,
): ClawWhatsAppStatusV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== CLAW_WHATSAPP_STATUS_VERSION) return null;
  const ts = o.tokenSource;
  if (
    typeof ts !== "string" ||
    !TOKEN_SOURCES.includes(ts as ClawWhatsAppTokenSource)
  )
    return null;
  for (const k of [
    "globalTokenConfigured",
    "workspaceTokenConfigured",
    "piWhatsAppInSettings",
  ] as const) {
    if (typeof o[k] !== "boolean") return null;
  }
  return {
    version: CLAW_WHATSAPP_STATUS_VERSION,
    globalTokenConfigured: o.globalTokenConfigured as boolean,
    workspaceTokenConfigured: o.workspaceTokenConfigured as boolean,
    piWhatsAppInSettings: o.piWhatsAppInSettings as boolean,
    tokenSource: ts as ClawWhatsAppTokenSource,
  };
}
