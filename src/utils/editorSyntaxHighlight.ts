import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import go from "highlight.js/lib/languages/go";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

/** Skip highlighting very large buffers to keep typing responsive. */
const MAX_HIGHLIGHT_CHARS = 350_000;

const EXT_TO_LANG: Record<string, string> = {
	md: "markdown",
	mdx: "markdown",
	ts: "typescript",
	tsx: "typescript",
	mts: "typescript",
	cts: "typescript",
	js: "javascript",
	jsx: "javascript",
	mjs: "javascript",
	cjs: "javascript",
	json: "json",
	jsonc: "json",
	css: "css",
	scss: "css",
	less: "css",
	html: "xml",
	htm: "xml",
	xml: "xml",
	svg: "xml",
	vue: "xml",
	py: "python",
	pyw: "python",
	rs: "rust",
	go: "go",
	sh: "bash",
	bash: "bash",
	zsh: "bash",
	yml: "yaml",
	yaml: "yaml",
};

let didRegister = false;

function ensureLanguagesRegistered() {
	if (didRegister) return;
	didRegister = true;
	hljs.registerLanguage("bash", bash);
	hljs.registerLanguage("shell", bash);
	hljs.registerLanguage("css", css);
	hljs.registerLanguage("go", go);
	hljs.registerLanguage("javascript", javascript);
	hljs.registerLanguage("json", json);
	hljs.registerLanguage("markdown", markdown);
	hljs.registerLanguage("python", python);
	hljs.registerLanguage("rust", rust);
	hljs.registerLanguage("typescript", typescript);
	hljs.registerLanguage("xml", xml);
	hljs.registerLanguage("yaml", yaml);
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function extensionOfPath(path: string): string {
	const base = path.split(/[/\\]/).pop() ?? path;
	const i = base.lastIndexOf(".");
	return i <= 0 ? "" : base.slice(i + 1).toLowerCase();
}

export type EditorHighlightResult = {
	/** Inner HTML placed inside `<code class="hljs">`. */
	html: string;
	/** True when a grammar was applied (not plain escaped text). */
	grammarActive: boolean;
};

/**
 * Produces HTML for the highlight layer behind the transparent textarea.
 * Cursor / VS Code–style colors are applied via `.wop-hl-pre` in `index.css`.
 */
export function highlightCodeForEditor(path: string, content: string): EditorHighlightResult {
	if (!content) {
		return { html: "", grammarActive: false };
	}
	if (content.length > MAX_HIGHLIGHT_CHARS) {
		return { html: escapeHtml(content), grammarActive: false };
	}

	const ext = extensionOfPath(path);
	const lang = EXT_TO_LANG[ext];
	if (!lang) {
		return { html: escapeHtml(content), grammarActive: false };
	}

	ensureLanguagesRegistered();
	try {
		const { value } = hljs.highlight(content, { language: lang, ignoreIllegals: true });
		return { html: value, grammarActive: true };
	} catch {
		return { html: escapeHtml(content), grammarActive: false };
	}
}

/** Escape-only layer (binary / Latin-1 buffers) — avoids hljs token boundaries changing wraps vs the textarea. */
export function highlightPlainForEditor(content: string): EditorHighlightResult {
	if (!content) {
		return { html: "", grammarActive: false };
	}
	if (content.length > MAX_HIGHLIGHT_CHARS) {
		return { html: escapeHtml(content), grammarActive: false };
	}
	return { html: escapeHtml(content), grammarActive: false };
}
