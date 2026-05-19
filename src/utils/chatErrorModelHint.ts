/**
 * Heuristic: chat `error` payloads that usually mean the user can fix routing by
 * adjusting session model, provider env, or workspace JSON — not “start the server”.
 */
export function chatErrorSuggestsModelFix(message: string | null): boolean {
	if (!message?.trim()) return false;
	const m = message.toLowerCase();
	const infra = ["websocket unreachable", "vite-only", "npm run dev:ui", "start the bun server"];
	if (infra.some((x) => m.includes(x))) return false;
	if (m.includes("openrouter_api_key")) return true;
	if (m.includes("wop_llm_provider")) return true;
	if (m.includes("way of pi web chat")) return true;
	if (m.includes("cannot set model")) return true;
	if (m.includes("openrouter")) return true;
	if (m.includes("ollama")) return true;
	if (m.includes("model not found")) return true;
	if (m.includes("not found") && (m.includes("404") || m.includes("pull"))) return true;
	if (m.includes("/v1/chat/completions")) return true;
	if (m.includes("chat completions")) return true;
	if (m.includes("api key")) return true;
	return false;
}
