import {
	forwardRef,
	useCallback,
	useDeferredValue,
	useEffect,
	useImperativeHandle,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useDebouncedUndoRedo } from "../hooks/useDebouncedUndoRedo";
import type { WorkspaceEditorRef } from "../types/workspaceEditor";
import {
	copyLineDown,
	copyLineUp,
	duplicateSelection,
	expandSelectionStep,
	moveLineDown,
	moveLineUp,
	nextOccurrenceRange,
	previousOccurrenceRange,
	resolveSearchNeedle,
} from "../utils/editorSelection";
import {
	toggleBlockComment,
	toggleLineComment,
	tryExpandEmmetAbbreviation,
} from "../utils/editorTextComments";
import { highlightCodeForEditor, highlightPlainForEditor } from "../utils/editorSyntaxHighlight";
import { EditorFindBar } from "./EditorFindBar";

const SS_CTRL_CLICK = "wop-editor-ctrl-click";
const SS_COLUMN = "wop-editor-column-sel";

function measureSoftWrappedLineHeightsPx(
	measure: HTMLDivElement,
	lines: string[],
	widthPx: number,
	textareaStyle: CSSStyleDeclaration,
): number[] {
	measure.style.width = `${Math.max(0, widthPx)}px`;
	measure.style.boxSizing = textareaStyle.boxSizing;
	measure.style.padding = textareaStyle.padding;
	measure.style.border = textareaStyle.border;
	measure.style.margin = textareaStyle.margin;
	measure.style.font = textareaStyle.font;
	measure.style.lineHeight = textareaStyle.lineHeight;
	measure.style.fontFamily = textareaStyle.fontFamily;
	measure.style.fontSize = textareaStyle.fontSize;
	measure.style.fontWeight = textareaStyle.fontWeight;
	measure.style.fontStyle = textareaStyle.fontStyle;
	measure.style.letterSpacing = textareaStyle.letterSpacing;
	measure.style.tabSize = textareaStyle.tabSize;
	measure.style.fontFeatureSettings = textareaStyle.fontFeatureSettings;
	measure.style.fontVariantNumeric = textareaStyle.fontVariantNumeric;
	measure.style.whiteSpace = textareaStyle.whiteSpace;
	measure.style.overflowWrap = textareaStyle.overflowWrap;
	measure.style.wordBreak = textareaStyle.wordBreak;
	measure.style.hyphens = textareaStyle.hyphens;
	measure.style.direction = textareaStyle.direction;
	measure.style.unicodeBidi = textareaStyle.unicodeBidi;

	return lines.map((line) => {
		measure.textContent = line.length > 0 ? line : "\u00a0";
		return Math.max(1, Math.ceil(measure.offsetHeight));
	});
}

const BRACKET_PAIRS: Record<string, string> = { "(": ")", "[": "]", "{": "}" };

function offsetFromLineColumn(content: string, line1: number, col1: number): number {
	const lines = content.split("\n");
	let li = Math.max(1, Math.floor(line1)) - 1;
	if (lines.length === 0) return 0;
	if (li >= lines.length) li = lines.length - 1;
	let off = 0;
	for (let i = 0; i < li; i++) off += lines[i].length + 1;
	const lineStr = lines[li] ?? "";
	const col = Math.max(1, Math.floor(col1));
	const ci = Math.min(Math.max(0, col - 1), lineStr.length);
	return Math.min(off + ci, content.length);
}

function findMatchingBracketIndex(content: string, caret: number): number | null {
	const isOpen = (c: string) => c === "(" || c === "[" || c === "{";
	const isClose = (c: string) => c === ")" || c === "]" || c === "}";
	const len = content.length;
	if (len === 0) return null;
	let i = Math.min(Math.max(0, caret), len - 1);
	let ch = content[i];
	if (!isOpen(ch) && !isClose(ch) && caret > 0) {
		i = caret - 1;
		ch = content[i];
	}
	if (!isOpen(ch) && !isClose(ch)) return null;
	if (isOpen(ch)) {
		const close = BRACKET_PAIRS[ch];
		let depth = 0;
		for (let k = i; k < len; k++) {
			const c = content[k];
			if (c === ch) depth++;
			else if (c === close) {
				depth--;
				if (depth === 0) return k;
			}
		}
	} else {
		let openChar = "";
		for (const [o, cl] of Object.entries(BRACKET_PAIRS)) {
			if (cl === ch) {
				openChar = o;
				break;
			}
		}
		if (!openChar) return null;
		let depth = 0;
		for (let k = i; k >= 0; k--) {
			const c = content[k];
			if (c === ch) depth++;
			else if (c === openChar) {
				depth--;
				if (depth === 0) return k;
			}
		}
	}
	return null;
}

function cursorFromTextarea(el: HTMLTextAreaElement): { line: number; col: number } {
	const start = el.selectionStart ?? 0;
	const before = el.value.slice(0, start);
	const lines = before.split("\n");
	const line = lines.length;
	const col = (lines[lines.length - 1]?.length ?? 0) + 1;
	return { line, col };
}

function findOccurrences(haystack: string, needle: string): number[] {
	if (!needle) return [];
	const out: number[] = [];
	let i = 0;
	while (i <= haystack.length - needle.length) {
		const j = haystack.indexOf(needle, i);
		if (j === -1) break;
		out.push(j);
		i = j + 1;
	}
	return out;
}

function isCtrlLike(e: React.KeyboardEvent): boolean {
	return e.ctrlKey || e.metaKey;
}

export type WorkspaceTextBufferProps = {
	path: string | null;
	content: string;
	onChange: (next: string) => void;
	loading: boolean;
	error: string | null;
	onCursor?: (line: number, col: number) => void;
	wordWrap?: boolean;
	/** Row wrapper (scroll region): e.g. technical padded editor body */
	scrollClassName: string;
	/** Line-number column (font-size + line-height should match `textareaClassName` so rows stay aligned, especially with word wrap off). */
	lineGutterClassName: string;
	textareaClassName: string;
	/** Optional find bar container (technical: border-t; simple: none) */
	findBarClassName?: string;
	statusLoadingClassName?: string;
	statusErrorClassName?: string;
	onFindInFiles?: () => void;
	onReplaceInFiles?: () => void;
	/** Notify parent so menu bar can re-read canUndo/canRedo after debounced history commits. */
	onUndoRedoStackChange?: () => void;
	/** Toggles for Selection menu checkmarks. */
	onSelectionPrefsChange?: () => void;
	/** Read-only buffer (e.g. in-editor welcome doc) — same layout as an open file, no edits / undo. */
	readOnly?: boolean;
	/** Use escaped plain text for the highlight layer (byte/Latin-1 files so wraps match the textarea). */
	disableSyntaxHighlight?: boolean;
};

export const WorkspaceTextBuffer = forwardRef<WorkspaceEditorRef, WorkspaceTextBufferProps>(
	function WorkspaceTextBuffer(
		{
			path,
			content,
			onChange,
			loading,
			error,
			onCursor,
			wordWrap = true,
			scrollClassName,
			lineGutterClassName,
			textareaClassName,
			findBarClassName = "",
			statusLoadingClassName = "text-[#858585]",
			statusErrorClassName = "text-[#f14c4c]",
			onFindInFiles,
			onReplaceInFiles,
			onUndoRedoStackChange,
			onSelectionPrefsChange,
			readOnly = false,
			disableSyntaxHighlight = false,
		},
		ref,
	) {
		const lines = content.split("\n");
		const deferredContent = useDeferredValue(content);
		const highlightHtml = useMemo(() => {
			if (!path) return "";
			return (
				disableSyntaxHighlight
					? highlightPlainForEditor(deferredContent)
					: highlightCodeForEditor(path, deferredContent)
			).html;
		}, [path, disableSyntaxHighlight, deferredContent]);
		const textareaRef = useRef<HTMLTextAreaElement>(null);
		const contentWrapRef = useRef<HTMLDivElement>(null);
		const wrapMeasureRef = useRef<HTMLDivElement | null>(null);
		const scrollContainerRef = useRef<HTMLDivElement>(null);
		const [gutterLineMinHeightsPx, setGutterLineMinHeightsPx] = useState<number[] | null>(null);
		const [wrapWidthTick, setWrapWidthTick] = useState(0);
		const findInputRef = useRef<HTMLInputElement>(null);
		const expandStackRef = useRef<[number, number][]>([]);
		const skipSelectionStackClear = useRef(false);
		const [ctrlClickMultiCursor, setCtrlClickMultiCursor] = useState(
			() => typeof sessionStorage !== "undefined" && sessionStorage.getItem(SS_CTRL_CLICK) === "1",
		);
		const [columnSelectionMode, setColumnSelectionMode] = useState(
			() => typeof sessionStorage !== "undefined" && sessionStorage.getItem(SS_COLUMN) === "1",
		);

		const editable = Boolean(path && !loading && !error && !readOnly);
		/** Reset undo when the buffer identity changes — use `path` for read-only views too so tab/file switches clear history. */
		const fileKey = path && !loading && !error ? path : null;
		const { onUserChange, undo, redo, canUndo, canRedo, stackGen } = useDebouncedUndoRedo(
			content,
			onChange,
			fileKey,
		);

		useEffect(() => {
			onUndoRedoStackChange?.();
		}, [stackGen, onUndoRedoStackChange]);

		const [findBar, setFindBar] = useState<"hidden" | "find" | "replace">("hidden");
		const [findQuery, setFindQuery] = useState("");
		const [replaceWith, setReplaceWith] = useState("");
		const [activeOccIdx, setActiveOccIdx] = useState(0);

		const occurrences = useMemo(() => findOccurrences(content, findQuery), [content, findQuery]);

		useEffect(() => {
			if (activeOccIdx >= occurrences.length) setActiveOccIdx(occurrences.length > 0 ? occurrences.length - 1 : 0);
		}, [occurrences.length, activeOccIdx]);

		useEffect(() => {
			if (findBar !== "hidden") {
				queueMicrotask(() => findInputRef.current?.focus());
			}
		}, [findBar]);

		useEffect(() => {
			const el = contentWrapRef.current;
			if (!el || !wordWrap) return;
			const ro = new ResizeObserver(() => setWrapWidthTick((t) => t + 1));
			ro.observe(el);
			let cancelled = false;
			const bump = () => {
				if (!cancelled) setWrapWidthTick((t) => t + 1);
			};
			const fonts = typeof document !== "undefined" ? document.fonts : undefined;
			const p = fonts?.ready;
			if (p) void p.then(bump);
			return () => {
				cancelled = true;
				ro.disconnect();
			};
		}, [wordWrap, path]);

		useLayoutEffect(() => {
			if (!wordWrap || !path) {
				setGutterLineMinHeightsPx(null);
				return;
			}
			const wrap = contentWrapRef.current;
			const ta = textareaRef.current;
			if (!wrap || !ta) return;
			const w = wrap.clientWidth;
			if (w < 2) return;
			let measure = wrapMeasureRef.current;
			if (!measure) {
				measure = document.createElement("div");
				measure.setAttribute("aria-hidden", "true");
				measure.style.position = "fixed";
				measure.style.left = "-99999px";
				measure.style.top = "0";
				measure.style.visibility = "hidden";
				measure.style.pointerEvents = "none";
				wrapMeasureRef.current = measure;
				document.body.appendChild(measure);
			}
			const heights = measureSoftWrappedLineHeightsPx(measure, content.split("\n"), w, getComputedStyle(ta));
			setGutterLineMinHeightsPx(heights);
		}, [content, wordWrap, path, wrapWidthTick]);

		useEffect(() => {
			return () => {
				const m = wrapMeasureRef.current;
				if (m?.parentNode) m.parentNode.removeChild(m);
				wrapMeasureRef.current = null;
			};
		}, []);

		const applyContentAndSelection = useCallback(
			(next: string, selStart: number, selEnd: number) => {
				expandStackRef.current = [];
				onUserChange(next);
				queueMicrotask(() => {
					const ta = textareaRef.current;
					if (!ta) return;
					const a = Math.max(0, Math.min(selStart, next.length));
					const b = Math.max(0, Math.min(selEnd, next.length));
					ta.focus();
					ta.setSelectionRange(a, b);
				});
			},
			[onUserChange],
		);

		const openFind = useCallback(
			(replace: boolean) => {
				setFindBar(replace ? "replace" : "find");
				const ta = textareaRef.current;
				if (ta && ta.selectionStart !== ta.selectionEnd) {
					const a = Math.min(ta.selectionStart, ta.selectionEnd);
					const b = Math.max(ta.selectionStart, ta.selectionEnd);
					setFindQuery(content.slice(a, b));
				}
			},
			[content],
		);

		const closeFindBar = useCallback(() => {
			setFindBar("hidden");
			textareaRef.current?.focus();
		}, []);

		const selectOccurrence = useCallback(
			(idx: number) => {
				const occ = occurrences[idx];
				if (occ === undefined) return;
				setActiveOccIdx(idx);
				const ta = textareaRef.current;
				if (!ta) return;
				const end = occ + findQuery.length;
				ta.focus();
				ta.setSelectionRange(occ, end);
			},
			[occurrences, findQuery.length],
		);

		const findNext = useCallback(() => {
			if (!findQuery || occurrences.length === 0) return;
			const ta = textareaRef.current;
			const from = ta ? ta.selectionEnd : 0;
			let idx = occurrences.findIndex((o) => o >= from);
			if (idx === -1) idx = 0;
			selectOccurrence(idx);
		}, [findQuery, occurrences, selectOccurrence]);

		const findPrev = useCallback(() => {
			if (!findQuery || occurrences.length === 0) return;
			const ta = textareaRef.current;
			const from = ta ? ta.selectionStart - 1 : content.length;
			let idx = -1;
			for (let i = occurrences.length - 1; i >= 0; i--) {
				if (occurrences[i]! < from) {
					idx = i;
					break;
				}
			}
			if (idx === -1) idx = occurrences.length - 1;
			selectOccurrence(idx);
		}, [findQuery, occurrences, selectOccurrence, content.length]);

		const replaceOne = useCallback(() => {
			if (!findQuery || occurrences.length === 0) return;
			const idx = Math.min(activeOccIdx, occurrences.length - 1);
			const at = occurrences[idx]!;
			const next = content.slice(0, at) + replaceWith + content.slice(at + findQuery.length);
			const newPos = at + replaceWith.length;
			applyContentAndSelection(next, newPos, newPos);
		}, [findQuery, occurrences, activeOccIdx, content, replaceWith, applyContentAndSelection]);

		const replaceAll = useCallback(() => {
			if (!findQuery) return;
			const next = content.split(findQuery).join(replaceWith);
			const ta = textareaRef.current;
			const start = ta ? ta.selectionStart : 0;
			applyContentAndSelection(next, start, start);
		}, [findQuery, replaceWith, content, applyContentAndSelection]);

		const cut = useCallback(() => {
			if (!editable) return;
			const ta = textareaRef.current;
			if (!ta) return;
			const a = Math.min(ta.selectionStart, ta.selectionEnd);
			const b = Math.max(ta.selectionStart, ta.selectionEnd);
			const sel = content.slice(a, b);
			void navigator.clipboard.writeText(sel);
			const next = content.slice(0, a) + content.slice(b);
			applyContentAndSelection(next, a, a);
		}, [editable, content, applyContentAndSelection]);

		const copy = useCallback(() => {
			const ta = textareaRef.current;
			if (!ta) return;
			const a = Math.min(ta.selectionStart, ta.selectionEnd);
			const b = Math.max(ta.selectionStart, ta.selectionEnd);
			void navigator.clipboard.writeText(content.slice(a, b));
		}, [content]);

		const paste = useCallback(async () => {
			if (!editable) return;
			const ta = textareaRef.current;
			if (!ta) return;
			let text = "";
			try {
				text = await navigator.clipboard.readText();
			} catch {
				return;
			}
			const a = Math.min(ta.selectionStart, ta.selectionEnd);
			const b = Math.max(ta.selectionStart, ta.selectionEnd);
			const next = content.slice(0, a) + text + content.slice(b);
			const pos = a + text.length;
			applyContentAndSelection(next, pos, pos);
		}, [editable, content, applyContentAndSelection]);

		const doLineComment = useCallback(() => {
			if (!editable) return;
			const ta = textareaRef.current;
			if (!ta) return;
			const a = ta.selectionStart;
			const b = ta.selectionEnd;
			const next = toggleLineComment(content, a, b);
			if (next === content) return;
			const delta = next.length - content.length;
			applyContentAndSelection(next, a, b + delta);
		}, [editable, content, applyContentAndSelection]);

		const doBlockComment = useCallback(() => {
			if (!editable) return;
			const ta = textareaRef.current;
			if (!ta) return;
			const a = ta.selectionStart;
			const b = ta.selectionEnd;
			const next = toggleBlockComment(content, a, b);
			if (next === content) return;
			const delta = next.length - content.length;
			applyContentAndSelection(next, a, b + delta);
		}, [editable, content, applyContentAndSelection]);

		const emmetExpand = useCallback(() => {
			if (!editable) return;
			const ta = textareaRef.current;
			if (!ta) return;
			const selStart = ta.selectionStart;
			const lineStart = content.lastIndexOf("\n", selStart - 1) + 1;
			const lineEndIdx = content.indexOf("\n", selStart);
			const lineEnd = lineEndIdx === -1 ? content.length : lineEndIdx;
			const line = content.slice(lineStart, lineEnd);
			const colInLine = selStart - lineStart;
			const before = line.slice(0, colInLine);
			const tokenMatch = /(\S+)$/.exec(before);
			const abbr = tokenMatch?.[1];
			if (!abbr) {
				const next = content.slice(0, selStart) + "\t" + content.slice(selStart);
				applyContentAndSelection(next, selStart + 1, selStart + 1);
				return;
			}
			const exp = tryExpandEmmetAbbreviation(abbr);
			if (!exp) {
				const next = content.slice(0, selStart) + "\t" + content.slice(selStart);
				applyContentAndSelection(next, selStart + 1, selStart + 1);
				return;
			}
			const tokenStart = selStart - abbr.length;
			const next = content.slice(0, tokenStart) + exp + content.slice(selStart);
			const pos = tokenStart + exp.length;
			applyContentAndSelection(next, pos, pos);
		}, [editable, content, applyContentAndSelection]);

		const selectAll = useCallback(() => {
			if (!editable) return;
			expandStackRef.current = [];
			skipSelectionStackClear.current = true;
			queueMicrotask(() => {
				const ta = textareaRef.current;
				if (!ta) return;
				ta.focus();
				ta.setSelectionRange(0, content.length);
			});
		}, [editable, content.length]);

		const expandSelection = useCallback(() => {
			if (!editable) return;
			const ta = textareaRef.current;
			if (!ta) return;
			const a = Math.min(ta.selectionStart, ta.selectionEnd);
			const b = Math.max(ta.selectionStart, ta.selectionEnd);
			const next = expandSelectionStep(content, a, b);
			if (!next) return;
			expandStackRef.current.push([a, b]);
			skipSelectionStackClear.current = true;
			queueMicrotask(() => {
				ta.focus();
				ta.setSelectionRange(next[0], next[1]);
			});
		}, [editable, content]);

		const shrinkSelection = useCallback(() => {
			if (!editable) return;
			const prev = expandStackRef.current.pop();
			if (!prev) return;
			const [a, b] = prev;
			skipSelectionStackClear.current = true;
			queueMicrotask(() => {
				const ta = textareaRef.current;
				if (!ta) return;
				ta.focus();
				ta.setSelectionRange(a, b);
			});
		}, [editable]);

		const doCopyLineUp = useCallback(() => {
			if (!editable) return;
			const ta = textareaRef.current;
			if (!ta) return;
			const { next, selStart, selEnd } = copyLineUp(content, ta.selectionStart);
			applyContentAndSelection(next, selStart, selEnd);
		}, [editable, content, applyContentAndSelection]);

		const doCopyLineDown = useCallback(() => {
			if (!editable) return;
			const ta = textareaRef.current;
			if (!ta) return;
			const { next, selStart, selEnd } = copyLineDown(content, ta.selectionStart);
			applyContentAndSelection(next, selStart, selEnd);
		}, [editable, content, applyContentAndSelection]);

		const doMoveLineUp = useCallback(() => {
			if (!editable) return;
			const ta = textareaRef.current;
			if (!ta) return;
			const r = moveLineUp(content, ta.selectionStart);
			if (!r) return;
			applyContentAndSelection(r.next, r.selStart, r.selEnd);
		}, [editable, content, applyContentAndSelection]);

		const doMoveLineDown = useCallback(() => {
			if (!editable) return;
			const ta = textareaRef.current;
			if (!ta) return;
			const r = moveLineDown(content, ta.selectionStart);
			if (!r) return;
			applyContentAndSelection(r.next, r.selStart, r.selEnd);
		}, [editable, content, applyContentAndSelection]);

		const doDuplicateSelection = useCallback(() => {
			if (!editable) return;
			const ta = textareaRef.current;
			if (!ta) return;
			const { next, selStart, selEnd } = duplicateSelection(content, ta.selectionStart, ta.selectionEnd);
			applyContentAndSelection(next, selStart, selEnd);
		}, [editable, content, applyContentAndSelection]);

		const addNextOccurrence = useCallback(() => {
			if (!editable) return;
			const ta = textareaRef.current;
			if (!ta) return;
			const needle = resolveSearchNeedle(content, ta.selectionStart, ta.selectionEnd);
			if (!needle) return;
			expandStackRef.current = [];
			const fromExclusive = Math.max(ta.selectionStart, ta.selectionEnd);
			const r = nextOccurrenceRange(content, needle, fromExclusive);
			if (!r) return;
			skipSelectionStackClear.current = true;
			queueMicrotask(() => {
				ta.focus();
				ta.setSelectionRange(r[0], r[1]);
			});
		}, [editable, content]);

		const addPreviousOccurrence = useCallback(() => {
			if (!editable) return;
			const ta = textareaRef.current;
			if (!ta) return;
			const needle = resolveSearchNeedle(content, ta.selectionStart, ta.selectionEnd);
			if (!needle) return;
			expandStackRef.current = [];
			const caretBefore = Math.min(ta.selectionStart, ta.selectionEnd);
			const r = previousOccurrenceRange(content, needle, caretBefore);
			if (!r) return;
			skipSelectionStackClear.current = true;
			queueMicrotask(() => {
				ta.focus();
				ta.setSelectionRange(r[0], r[1]);
			});
		}, [editable, content]);

		const selectAllOccurrences = useCallback(() => {
			if (!editable) return;
			const ta = textareaRef.current;
			if (!ta) return;
			const needle = resolveSearchNeedle(content, ta.selectionStart, ta.selectionEnd);
			if (!needle) return;
			expandStackRef.current = [];
			setFindQuery(needle);
			setFindBar("find");
			setActiveOccIdx(0);
			const occ = findOccurrences(content, needle);
			skipSelectionStackClear.current = true;
			queueMicrotask(() => {
				const t = textareaRef.current;
				if (!t || occ[0] === undefined) return;
				t.focus();
				t.setSelectionRange(occ[0], occ[0] + needle.length);
			});
		}, [editable, content]);

		const setCtrlClickMultiCursorFn = useCallback(
			(v: boolean) => {
				setCtrlClickMultiCursor(v);
				try {
					sessionStorage.setItem(SS_CTRL_CLICK, v ? "1" : "0");
				} catch {
					/* private mode */
				}
				onSelectionPrefsChange?.();
			},
			[onSelectionPrefsChange],
		);

		const setColumnSelectionModeFn = useCallback(
			(v: boolean) => {
				setColumnSelectionMode(v);
				try {
					sessionStorage.setItem(SS_COLUMN, v ? "1" : "0");
				} catch {
					/* private mode */
				}
				onSelectionPrefsChange?.();
			},
			[onSelectionPrefsChange],
		);

		const getSelectedText = useCallback(() => {
			const ta = textareaRef.current;
			if (!ta) return "";
			const a = Math.min(ta.selectionStart, ta.selectionEnd);
			const b = Math.max(ta.selectionStart, ta.selectionEnd);
			return content.slice(a, b);
		}, [content]);

		const goToLineColumn = useCallback(
			(line: number, column = 1) => {
				const ta = textareaRef.current;
				if (!ta || !editable) return;
				const off = offsetFromLineColumn(content, line, column);
				queueMicrotask(() => {
					ta.focus();
					ta.setSelectionRange(off, off);
				});
			},
			[content, editable],
		);

		const goToMatchingBracket = useCallback(() => {
			const ta = textareaRef.current;
			if (!ta || !editable) return;
			const a = ta.selectionStart;
			const b = ta.selectionEnd;
			const caret = a === b ? a : a;
			const j = findMatchingBracketIndex(content, caret);
			if (j == null) return;
			queueMicrotask(() => {
				ta.focus();
				ta.setSelectionRange(j, j);
			});
		}, [content, editable]);

		useImperativeHandle(
			ref,
			() => ({
				undo: () => (editable ? undo() : false),
				redo: () => (editable ? redo() : false),
				cut: () => cut(),
				copy: () => copy(),
				paste: () => paste(),
				find: () => {
					if (editable) openFind(false);
				},
				replace: () => {
					if (editable) openFind(true);
				},
				toggleLineComment: () => doLineComment(),
				toggleBlockComment: () => doBlockComment(),
				emmetExpand: () => emmetExpand(),
				canUndo: () => (editable ? canUndo() : false),
				canRedo: () => (editable ? canRedo() : false),
				selectAll: () => selectAll(),
				expandSelection: () => expandSelection(),
				shrinkSelection: () => shrinkSelection(),
				copyLineUp: () => doCopyLineUp(),
				copyLineDown: () => doCopyLineDown(),
				moveLineUp: () => doMoveLineUp(),
				moveLineDown: () => doMoveLineDown(),
				duplicateSelection: () => doDuplicateSelection(),
				addNextOccurrence: () => addNextOccurrence(),
				addPreviousOccurrence: () => addPreviousOccurrence(),
				selectAllOccurrences: () => selectAllOccurrences(),
				getCtrlClickMultiCursor: () => ctrlClickMultiCursor,
				setCtrlClickMultiCursor: (v: boolean) => setCtrlClickMultiCursorFn(v),
				getColumnSelectionMode: () => columnSelectionMode,
				setColumnSelectionMode: (v: boolean) => setColumnSelectionModeFn(v),
				getSelectedText: () => getSelectedText(),
				goToLineColumn: (line: number, column?: number) => goToLineColumn(line, column),
				goToMatchingBracket: () => goToMatchingBracket(),
			}),
			[
				editable,
				undo,
				redo,
				cut,
				copy,
				paste,
				openFind,
				doLineComment,
				doBlockComment,
				emmetExpand,
				canUndo,
				canRedo,
				selectAll,
				expandSelection,
				shrinkSelection,
				doCopyLineUp,
				doCopyLineDown,
				doMoveLineUp,
				doMoveLineDown,
				doDuplicateSelection,
				addNextOccurrence,
				addPreviousOccurrence,
				selectAllOccurrences,
				ctrlClickMultiCursor,
				columnSelectionMode,
				setCtrlClickMultiCursorFn,
				setColumnSelectionModeFn,
				getSelectedText,
				goToLineColumn,
				goToMatchingBracket,
			],
		);

		const onTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (!editable) return;
			if (findBar !== "hidden" && e.key === "Escape") {
				e.preventDefault();
				closeFindBar();
				return;
			}
			if (isCtrlLike(e) && e.key.toLowerCase() === "a" && !e.shiftKey) {
				e.preventDefault();
				selectAll();
				return;
			}
			if (e.shiftKey && e.altKey && (e.key === "ArrowRight" || e.code === "ArrowRight")) {
				e.preventDefault();
				expandSelection();
				return;
			}
			if (e.shiftKey && e.altKey && (e.key === "ArrowLeft" || e.code === "ArrowLeft")) {
				e.preventDefault();
				shrinkSelection();
				return;
			}
			if (isCtrlLike(e) && e.shiftKey && e.altKey && (e.key === "ArrowUp" || e.code === "ArrowUp")) {
				e.preventDefault();
				doCopyLineUp();
				return;
			}
			if (isCtrlLike(e) && e.shiftKey && e.altKey && (e.key === "ArrowDown" || e.code === "ArrowDown")) {
				e.preventDefault();
				doCopyLineDown();
				return;
			}
			if (e.altKey && !isCtrlLike(e) && (e.key === "ArrowUp" || e.code === "ArrowUp")) {
				e.preventDefault();
				doMoveLineUp();
				return;
			}
			if (e.altKey && !isCtrlLike(e) && (e.key === "ArrowDown" || e.code === "ArrowDown")) {
				e.preventDefault();
				doMoveLineDown();
				return;
			}
			if (isCtrlLike(e) && e.key.toLowerCase() === "d" && !e.shiftKey) {
				e.preventDefault();
				addNextOccurrence();
				return;
			}
			if (isCtrlLike(e) && e.shiftKey && e.key.toLowerCase() === "d") {
				e.preventDefault();
				addPreviousOccurrence();
				return;
			}
			if (isCtrlLike(e) && e.key === "z" && !e.shiftKey) {
				e.preventDefault();
				undo();
				return;
			}
			if (isCtrlLike(e) && (e.key === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) {
				e.preventDefault();
				redo();
				return;
			}
			if (isCtrlLike(e) && e.key === "f" && !e.shiftKey) {
				e.preventDefault();
				openFind(false);
				return;
			}
			if (isCtrlLike(e) && e.key === "h" && !e.shiftKey) {
				e.preventDefault();
				openFind(true);
				return;
			}
			if (isCtrlLike(e) && e.shiftKey && e.key === "F") {
				e.preventDefault();
				onFindInFiles?.();
				return;
			}
			if (isCtrlLike(e) && e.shiftKey && e.key === "H") {
				e.preventDefault();
				onReplaceInFiles?.();
				return;
			}
			if (isCtrlLike(e) && e.shiftKey && (e.key === "7" || e.code === "Digit7")) {
				e.preventDefault();
				doLineComment();
				return;
			}
			if (isCtrlLike(e) && e.shiftKey && e.key.toLowerCase() === "a") {
				e.preventDefault();
				doBlockComment();
				return;
			}
			if (e.key === "Tab" && !e.shiftKey) {
				const ta = e.currentTarget;
				const selStart = ta.selectionStart;
				const lineStart = content.lastIndexOf("\n", selStart - 1) + 1;
				const lineEndIdx = content.indexOf("\n", selStart);
				const lineEnd = lineEndIdx === -1 ? content.length : lineEndIdx;
				const line = content.slice(lineStart, lineEnd);
				const colInLine = selStart - lineStart;
				const before = line.slice(0, colInLine);
				const tokenMatch = /(\S+)$/.exec(before);
				const abbr = tokenMatch?.[1];
				if (abbr && tryExpandEmmetAbbreviation(abbr)) {
					e.preventDefault();
					emmetExpand();
				}
			}
		};

		const wrap = wordWrap ? "soft" : "off";
		const wrapCls = wordWrap
			? "overflow-x-hidden whitespace-pre-wrap break-words"
			: "overflow-x-auto whitespace-pre";

		const forwardWheelToScrollParent = useCallback((e: React.WheelEvent<HTMLTextAreaElement>) => {
			const scroller = scrollContainerRef.current;
			if (!scroller) return;
			scroller.scrollTop += e.deltaY;
			scroller.scrollLeft += e.deltaX;
			e.preventDefault();
		}, []);

		return (
			<div className="flex min-h-0 min-w-0 flex-1 flex-col">
				<div
					ref={scrollContainerRef}
					className={`flex min-h-0 flex-1 items-start overflow-auto ${scrollClassName}`}
				>
					{loading ? (
						<div className={statusLoadingClassName}>Loading…</div>
					) : error ? (
						<div className={statusErrorClassName}>{error}</div>
					) : path ? (
						<>
							<div className={`flex shrink-0 flex-col pr-4 text-right leading-relaxed select-none ${lineGutterClassName}`}>
								{lines.map((_, i) => {
									const h = gutterLineMinHeightsPx?.[i];
									return (
										<span
											key={i}
											className="box-border flex shrink-0 items-start justify-end leading-relaxed"
											style={h != null ? { minHeight: `${h}px` } : undefined}
										>
											{i + 1}
										</span>
									);
								})}
							</div>
							<div ref={contentWrapRef} className="relative min-h-[1.5em] min-w-0 flex-1">
								<pre
									className={`wop-hl-pre pointer-events-none m-0 block min-h-[1.5em] w-full max-w-full p-0 leading-relaxed ${wrapCls}`}
									aria-hidden
								>
									<code
										className={`hljs block w-full max-w-full p-0 font-mono text-[13px] leading-relaxed ${wrapCls}`}
										// eslint-disable-next-line react/no-danger -- trusted local file buffer; server paths only
										dangerouslySetInnerHTML={{ __html: highlightHtml }}
									/>
								</pre>
								<textarea
									ref={textareaRef}
									readOnly={readOnly}
									value={content}
									onChange={(e) => onUserChange(e.target.value)}
									onSelect={(e) => {
										if (skipSelectionStackClear.current) {
											skipSelectionStackClear.current = false;
										} else {
											expandStackRef.current = [];
										}
										const c = cursorFromTextarea(e.currentTarget);
										onCursor?.(c.line, c.col);
									}}
									onKeyUp={(e) => {
										const c = cursorFromTextarea(e.currentTarget);
										onCursor?.(c.line, c.col);
									}}
									onKeyDown={onTextareaKeyDown}
									className={`wop-editor-input-layer absolute inset-0 z-[1] box-border min-h-full min-w-0 resize-none overflow-hidden bg-transparent font-mono text-[13px] leading-relaxed outline-none ${wrapCls} ${textareaClassName} ${
										columnSelectionMode ? "outline outline-1 outline-dashed outline-[#ea580c]/60" : ""
									}`}
									onWheel={forwardWheelToScrollParent}
									spellCheck={false}
									autoComplete="off"
									wrap={wrap}
								/>
							</div>
						</>
					) : null}
				</div>
				{path && !loading && !error && findBar !== "hidden" ? (
					<div className={findBarClassName}>
						<EditorFindBar
							replaceMode={findBar === "replace"}
							query={findQuery}
							replaceWith={replaceWith}
							findInputRef={findInputRef}
							onQuery={(q) => {
								setFindQuery(q);
								setActiveOccIdx(0);
							}}
							onReplaceWith={setReplaceWith}
							onNext={findNext}
							onPrev={findPrev}
							onReplaceOne={replaceOne}
							onReplaceAll={replaceAll}
							onClose={closeFindBar}
						/>
					</div>
				) : null}
			</div>
		);
	},
);
