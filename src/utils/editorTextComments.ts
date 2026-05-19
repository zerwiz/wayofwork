/** Toggle `//` at line starts for selected lines (VS Code–style). */
export function toggleLineComment(text: string, selStart: number, selEnd: number, prefix = "//"): string {
	const a = Math.min(selStart, selEnd);
	const b = Math.max(selStart, selEnd);
	const lineStart = text.lastIndexOf("\n", a - 1) + 1;
	const lineEndIdx = text.indexOf("\n", b);
	const lineEnd = lineEndIdx === -1 ? text.length : lineEndIdx;
	const block = text.slice(lineStart, lineEnd);
	const lines = block.split("\n");
	const allCommented = lines.every((ln) => {
		const t = ln.trimStart();
		return t.startsWith(prefix) || t === "";
	});
	const indent = (ln: string) => {
		const m = /^(\s*)/.exec(ln);
		return m ? m[1] : "";
	};
	if (allCommented && lines.some((ln) => ln.trim().startsWith(prefix))) {
		const next = lines
			.map((ln) => {
				const sp = indent(ln);
				const rest = ln.slice(sp.length);
				if (rest.startsWith(prefix + " ")) return sp + rest.slice(prefix.length + 1);
				if (rest.startsWith(prefix)) return sp + rest.slice(prefix.length);
				return ln;
			})
			.join("\n");
		return text.slice(0, lineStart) + next + text.slice(lineEnd);
	}
	const next = lines.map((ln) => (ln.trim() === "" ? ln : `${indent(ln)}${prefix} ${ln.slice(indent(ln).length)}`)).join("\n");
	return text.slice(0, lineStart) + next + text.slice(lineEnd);
}

/** Toggle `/* *\/` around selection. */
export function toggleBlockComment(text: string, selStart: number, selEnd: number): string {
	const a = Math.min(selStart, selEnd);
	const b = Math.max(selStart, selEnd);
	const inner = text.slice(a, b);
	const open = "/*";
	const close = "*/";
	if (inner.startsWith(open) && inner.endsWith(close) && inner.length >= open.length + close.length) {
		const stripped = inner.slice(open.length, inner.length - close.length);
		return text.slice(0, a) + stripped + text.slice(b);
	}
	return text.slice(0, a) + open + inner + close + text.slice(b);
}

/** Minimal Emmet-style expansion for common cases; returns null if no rule matched. */
export function tryExpandEmmetAbbreviation(abbr: string): string | null {
	const t = abbr.trim();
	if (!t) return null;
	// Single tag: div, span, p
	const single = /^([a-z][a-z0-9]*)$/i.exec(t);
	if (single) {
		const tag = single[1].toLowerCase();
		return `<${tag}></${tag}>`;
	}
	// tag.class or tag#id
	const cls = /^([a-z][a-z0-9]*)\.([a-zA-Z0-9_-]+)$/.exec(t);
	if (cls) return `<${cls[1].toLowerCase()} class="${cls[2]}"></${cls[1].toLowerCase()}>`;
	const id = /^([a-z][a-z0-9]*)#([a-zA-Z0-9_-]+)$/.exec(t);
	if (id) return `<${id[1].toLowerCase()} id="${id[2]}"></${id[1].toLowerCase()}>`;
	// parent>child
	const chain = /^([a-z][a-z0-9]*)(>[a-z][a-z0-9]*)+$/i.exec(t);
	if (chain) {
		const parts = t.split(">").map((p) => p.toLowerCase());
		let inner = "";
		for (let i = parts.length - 1; i >= 0; i--) {
			const tag = parts[i];
			inner = inner ? `<${tag}>${inner}</${tag}>` : `<${tag}></${tag}>`;
		}
		return inner;
	}
	return null;
}
