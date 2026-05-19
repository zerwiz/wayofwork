export type MessageSegment =
	| { type: "text"; text: string }
	| { type: "code"; language: string; filename: string; body: string };

/**
 * Split assistant/user text on ``` fenced blocks for rich chat rendering.
 */
export function parseMessageSegments(content: string): MessageSegment[] {
	const segments: MessageSegment[] = [];
	const fence = /```(\w+)?\s*([^\n]*)\n([\s\S]*?)```/g;
	let last = 0;
	let m: RegExpExecArray | null;
	while ((m = fence.exec(content)) !== null) {
		const [full, langRaw, firstLine, body] = m;
		const before = content.slice(last, m.index);
		if (before.trim()) {
			segments.push({ type: "text", text: before });
		}
		const language = (langRaw ?? "").trim() || "text";
		let filename = firstLine?.trim() ?? "";
		if (!filename || filename === language) {
			filename = language === "python" || language === "py" ? "snippet.py" : `snippet.${language}`;
		}
		segments.push({ type: "code", language, filename, body: body.trimEnd() });
		last = m.index + full.length;
	}
	const rest = content.slice(last);
	if (rest.trim()) {
		segments.push({ type: "text", text: rest });
	}
	if (segments.length === 0) {
		segments.push({ type: "text", text: content });
	}
	return segments;
}

export function languageLabel(language: string): string {
	const map: Record<string, string> = {
		python: "Python",
		py: "Python",
		typescript: "TypeScript",
		ts: "TypeScript",
		tsx: "TypeScript",
		javascript: "JavaScript",
		js: "JavaScript",
		json: "JSON",
		md: "Markdown",
		bash: "Shell",
		sh: "Shell",
	};
	return map[language.toLowerCase()] ?? language.toUpperCase();
}
