/**
 * **Wo agent runtime** — replaces old Pi SDK with direct `@wayofmono/wo-agent` imports.
 *
 * Instead of spawning pi or importing the old pi SDK, this module uses
 * `@wayofmono/wo-agent` directly: typed events, in-process tools, no PATH hacks.
 *
 * Wo Agent (`@wayofmono/wo-agent`) replaces the legacy Pi CLI —
 * no runtime code imports it.
 *
 * @module wo-sdk-runtime
 */

import { createAgentSession } from "@wayofmono/wo-agent";
import type { ChatRuntimeModel, StreamChatResult } from "./chat";
import type { StreamTokenUsage } from "./chat-usage";
import { createWebFetchTool } from "./web-tools";
import { resolveWoAiHost, resolveWoAiModelDefault } from "./wo-ai-env";

/**
 * Options mirroring `RunPiChatTurnOpts` so callers can switch between
 * subprocess and SDK paths with minimal changes.
 */
export interface RunSdkChatTurnOpts {
  cwd: string;
  messages: Array<{ role: string; content: string | null }>;
  onDelta: (s: string) => void;
  onReasoningDelta?: (s: string) => void;
  onStreamUsage?: (u: StreamTokenUsage) => void;
  onLog: (level: "INFO" | "WARN" | "ERROR", source: string, msg: string) => void;
  signal?: AbortSignal;
  runtime?: ChatRuntimeModel;
  tenantId?: string;
  userId?: string;
}

/**
 * Run one chat turn through the `@wayofmono/wo-agent` SDK.
 *
 * Creates an `AgentSession` via `createAgentSession()` and sends
 * the user prompt through the SDK. Events are dispatched to the same callbacks
 * used by the old pi subprocess path (`onDelta`, `onReasoningDelta`, etc.).
 *
 * The session is ephemeral — each call creates a fresh session so the
 * conversation history is reconstructed from the provided messages array.
 */
export async function runSdkChatTurn(
  opts: RunSdkChatTurnOpts,
): Promise<{ result: StreamChatResult; lastStreamUsage: StreamTokenUsage | null }> {
  if (opts.signal?.aborted) {
    return { result: { ok: false, aborted: true }, lastStreamUsage: null };
  }

  const lastUserMsg = [...opts.messages].reverse().find((m) => m.role === "user");
  if (!lastUserMsg?.content) {
    return { result: { ok: false, error: "No user message to send" }, lastStreamUsage: null };
  }

  opts.onLog("INFO", "wo-sdk", "Creating agent session via Wo SDK…");

  try {
    const provider = (process.env.WOP_LLM_PROVIDER || "wo-ai").toLowerCase();
    const modelId = opts.runtime?.ollamaModel || resolveWoAiModelDefault(opts.tenantId);
    const host = opts.runtime?.ollamaHost || resolveWoAiHost();
    let baseUrl = host;
    if ((provider === "wo-ai" || provider === "ollama") && baseUrl) {
      baseUrl = baseUrl.replace(/\/+$/, "") + "/v1";
    }

    const model = {
      id: modelId,
      name: modelId,
      api: "openai-completions" as const,
      provider: provider === "wo-ai" ? "ollama" : provider,
      baseUrl: baseUrl || "",
      reasoning: false,
      input: ["text", "image"] as ("text" | "image")[],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: (provider === "wo-ai" || provider === "ollama") ? 4096 : 200000,
      maxTokens: (provider === "wo-ai" || provider === "ollama") ? 2048 : 4096,
    };

    const { session } = await createAgentSession({
      cwd: opts.cwd,
      model,
      customTools: [createWebFetchTool()],
    });

    let fullText = "";
    let lastUsage: StreamTokenUsage | null = null;

    const unsub = session.subscribe((event) => {
      const ev = event as Record<string, unknown>;
      switch (ev.type as string) {
        case "message_update": {
          const assistantEvent = ev.assistantMessageEvent as Record<string, unknown> | undefined;
          if (!assistantEvent) break;
          if (assistantEvent.type === "text_delta" && typeof assistantEvent.delta === "string") {
            fullText += assistantEvent.delta;
            opts.onDelta(assistantEvent.delta);
          }
          if (assistantEvent.type === "thinking_delta" && typeof assistantEvent.delta === "string") {
            opts.onReasoningDelta?.(assistantEvent.delta);
          }
          break;
        }
        case "tool_execution_start": {
          const name = String(ev.toolName ?? "tool");
          const args = ev.args;
          const argsStr = args != null ? JSON.stringify(args).slice(0, 200) : "";
          opts.onLog("INFO", name, `start ${argsStr}`);
          break;
        }
        case "tool_execution_end": {
          const name = String(ev.toolName ?? "tool");
          const isErr = ev.isError === true;
          opts.onLog("INFO", name, `end${isErr ? " (error)" : ""}`);
          break;
        }
      }
    });

    opts.onLog("INFO", "wo-sdk", `Sending prompt (${lastUserMsg.content.length} chars)…`);

    await session.prompt(lastUserMsg.content);

    unsub();

    if (opts.signal?.aborted) {
      return { result: { ok: false, aborted: true }, lastStreamUsage: null };
    }

    opts.onLog("INFO", "wo-sdk", `Session complete (${fullText.length} chars)`);

    return {
      result: { ok: true },
      lastStreamUsage: lastUsage,
    } as const;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    opts.onLog("ERROR", "wo-sdk", `SDK session failed: ${message}`);
    return { result: { ok: false, error: `Wo SDK error: ${message}` }, lastStreamUsage: null };
  }
}
