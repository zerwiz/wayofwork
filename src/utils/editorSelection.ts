/** Word / identifier at offset (includes `$` for JS). */
export function wordRangeAt(text: string, offset: number): [number, number] {
	const i = Math.max(0, Math.min(offset, text.length));
	let a = i;
	let b = i;
	while (a > 0 && /[\w$]/.test(text[a - 1]!)) a--;
	while (b < text.length && /[\w$]/.test(text[b]!)) b++;
	return [a, b];
}

/** Line content range [start, end) without the trailing newline. */
export function lineContentRange(text: string, pos: number): [number, number] {
	const lineStart = text.lastIndexOf("\n", pos - 1) + 1;
	const nl = text.indexOf("\n", lineStart);
	const end = nl === -1 ? text.length : nl;
	return [lineStart, end];
}

/** Line slice including trailing `\n` when not the last line. */
export function lineWithNewlineSlice(text: string, pos: number): { start: number; end: number; line: string } {
	const [ls, leNoNl] = lineContentRange(text, pos);
	if (leNoNl < text.length && text[leNoNl] === "\n") {
		return { start: ls, end: leNoNl + 1, line: text.slice(ls, leNoNl + 1) };
	}
	return { start: ls, end: leNoNl, line: text.slice(ls, leNoNl) + (leNoNl === text.length ? "" : "") };
}

export function lineIndexAt(text: string, pos: number): number {
	return (text.slice(0, pos).match(/\n/g) || []).length;
}

/** Needle for occurrence commands: selection or word at caret. */
export function resolveSearchNeedle(text: string, selStart: number, selEnd: number): string {
	const a = Math.min(selStart, selEnd);
	const b = Math.max(selStart, selEnd);
	if (a < b) return text.slice(a, b);
	const [ws, we] = wordRangeAt(text, a);
	return text.slice(ws, we);
}

export function nextOccurrenceRange(
	text: string,
	needle: string,
	searchAfter: number,
): [number, number] | null {
	if (!needle) return null;
	let idx = text.indexOf(needle, searchAfter);
	if (idx === -1) idx = text.indexOf(needle, 0);
	if (idx === -1) return null;
	return [idx, idx + needle.length];
}

export function previousOccurrenceRange(
	text: string,
	needle: string,
	caretBefore: number,
): [number, number] | null {
	if (!needle) return null;
	let last = -1;
	let i = 0;
	while (i <= text.length - needle.length) {
		const j = text.indexOf(needle, i);
		if (j === -1) break;
		if (j + needle.length <= caretBefore) last = j;
		i = j + 1;
	}
	if (last !== -1) return [last, last + needle.length];
	let wr = -1;
	i = 0;
	while (i <= text.length - needle.length) {
		const j = text.indexOf(needle, i);
		if (j === -1) break;
		wr = j;
		i = j + 1;
	}
	if (wr === -1) return null;
	return [wr, wr + needle.length];
}

/** Next larger selection; null if already whole document. */
export function expandSelectionStep(text: string, selStart: number, selEnd: number): [number, number] | null {
	const a = Math.min(selStart, selEnd);
	const b = Math.max(selStart, selEnd);
	if (a === b) {
		const [ws, we] = wordRangeAt(text, a);
		if (ws < we) return [ws, we];
		return lineContentRange(text, a);
	}
	const [ls, leContent] = lineContentRange(text, a);
	const [ws, we] = wordRangeAt(text, a);
	if (a === ws && b === we) return [ls, leContent];
	if (a === ls && b === leContent) {
		if (leContent < text.length && text[leContent] === "\n") return [ls, leContent + 1];
		if (a === 0 && b === text.length) return null;
		return [0, text.length];
	}
	if (a === ls && b === leContent + 1 && leContent < text.length && text[leContent] === "\n") {
		if (a === 0 && b === text.length) return null;
		return [0, text.length];
	}
	if (a !== 0 || b !== text.length) return [0, text.length];
	return null;
}

export function copyLineUp(text: string, pos: number): { next: string; selStart: number; selEnd: number } {
	const { start, line } = lineWithNewlineSlice(text, pos);
	const insert = line.endsWith("\n") ? line : line + "\n";
	const next = text.slice(0, start) + insert + text.slice(start);
	return { next, selStart: start, selEnd: start + insert.length };
}

export function copyLineDown(text: string, pos: number): { next: string; selStart: number; selEnd: number } {
	const { end, line } = lineWithNewlineSlice(text, pos);
	const insert = line.endsWith("\n") ? line : line + "\n";
	const next = text.slice(0, end) + insert + text.slice(end);
	return { next, selStart: end, selEnd: end + insert.length };
}

function lineStartOffset(lines: string[], index: number): number {
	let o = 0;
	for (let k = 0; k < index; k++) o += lines[k]!.length + 1;
	return o;
}

export function moveLineUp(text: string, pos: number): { next: string; selStart: number; selEnd: number } | null {
	const li = lineIndexAt(text, pos);
	if (li <= 0) return null;
	const lines = text.split("\n");
	const cur = lines[li]!;
	const prev = lines[li - 1]!;
	lines[li - 1] = cur;
	lines[li] = prev;
	const next = lines.join("\n");
	const newStart = lineStartOffset(lines, li - 1);
	return { next, selStart: newStart, selEnd: newStart + cur.length };
}

export function moveLineDown(text: string, pos: number): { next: string; selStart: number; selEnd: number } | null {
	const lines = text.split("\n");
	const li = lineIndexAt(text, pos);
	if (li >= lines.length - 1) return null;
	const cur = lines[li]!;
	const nxt = lines[li + 1]!;
	lines[li] = nxt;
	lines[li + 1] = cur;
	const next = lines.join("\n");
	const newStart = lineStartOffset(lines, li + 1);
	return { next, selStart: newStart, selEnd: newStart + cur.length };
}

export function duplicateSelection(
	text: string,
	selStart: number,
	selEnd: number,
): { next: string; selStart: number; selEnd: number } {
	const a = Math.min(selStart, selEnd);
	const b = Math.max(selStart, selEnd);
	if (a < b) {
		const chunk = text.slice(a, b);
		const next = text.slice(0, b) + chunk + text.slice(b);
		const ns = b;
		const ne = b + chunk.length;
		return { next, selStart: ns, selEnd: ne };
	}
	const { end, line } = lineWithNewlineSlice(text, a);
	const insert = line.endsWith("\n") ? line : line + "\n";
	const next = text.slice(0, end) + insert + text.slice(end);
	const insStart = end;
	return { next, selStart: insStart, selEnd: insStart + insert.length };
}
