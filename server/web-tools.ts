import { Type } from "typebox";

export function createWebFetchTool() {
  return {
    name: "web_fetch",
    label: "Web Fetch",
    description: "Fetch and read the content of a URL. Returns the page text content extracted via Readability. Max 500KB.",
    promptSnippet: "Fetch and read web page content",
    promptGuidelines: ["Use web_fetch to read documentation, articles, or any public URL."],
    parameters: Type.Object({
      url: Type.String({ description: "Full URL including protocol, e.g. https://example.com/page" }),
    }),
    async execute(_toolCallId: string, params: { url: string }) {
      try {
        const res = await fetch(params.url, {
          signal: AbortSignal.timeout(15000),
          headers: { "User-Agent": "WayofWork-Claw/1.0" },
        });
        if (!res.ok) {
          return { content: [{ type: "text" as const, text: `HTTP ${res.status}: ${res.statusText}` }], details: { error: true } };
        }
        const html = await res.text();
        const text = extractText(html);
        const maxLen = 500000;
        const truncated = text.length > maxLen ? text.slice(0, maxLen) + "\n[Truncated...]" : text;
        return { content: [{ type: "text" as const, text: truncated }], details: { url: params.url, bytes: html.length } };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { content: [{ type: "text" as const, text: `Fetch error: ${msg}` }], details: { error: true } };
      }
    },
  };
}

function extractText(html: string): string {
  try {
    if (typeof DOMParser !== "undefined") {
      const doc = new DOMParser().parseFromString(html, "text/html");
      return doc.body?.textContent?.replace(/\s+/g, " ").trim() || html.replace(/<[^>]*>/g, "").trim();
    }
  } catch {}
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}
