import { diffLines, type Change } from "diff";

/** Split a diff part value into logical lines (without trailing newline fragment). */
function partLines(part: Change): string[] {
	const v = part.value;
	if (!v) return [];
	const lines = v.split("\n");
	if (lines.length && lines[lines.length - 1] === "") lines.pop();
	return lines;
}

export type FileChangeHunk = {
	/** 0-based line index in **modified** text where this hunk starts (first added line, or insertion point for pure deletions). */
	newStartLine: number;
	/** Exclusive end line in **modified** text. */
	newEndLine: number;
	/** Replacement content from **original** (disk) for this region. */
	oldLines: string[];
	/** Current lines in **modified** in this region. */
	newLines: string[];
};

/**
 * Group diff output into revertible hunks (contiguous added/removed regions).
 * Line indices use `modified.split("\n")` coordinates.
 */
export function computeFileChangeHunks(original: string, modified: string): FileChangeHunk[] {
	const parts = diffLines(original, modified);
	const hunks: FileChangeHunk[] = [];
	let newLine = 0;
	let pending: { start: number; oldL: string[]; newL: string[] } | null = null;

	const flush = () => {
		if (pending && (pending.oldL.length > 0 || pending.newL.length > 0)) {
			hunks.push({
				newStartLine: pending.start,
				newEndLine: newLine,
				oldLines: pending.oldL,
				newLines: pending.newL,
			});
		}
		pending = null;
	};

	for (const part of parts) {
		const lines = partLines(part);
		if (!part.added && !part.removed) {
			flush();
			newLine += lines.length;
		} else if (part.removed) {
			if (!pending) pending = { start: newLine, oldL: [], newL: [] };
			pending.oldL.push(...lines);
		} else if (part.added) {
			if (!pending) pending = { start: newLine, oldL: [], newL: [] };
			pending.newL.push(...lines);
			newLine += lines.length;
		}
	}
	flush();
	return hunks;
}

export type UnifiedDiffRow =
	| { kind: "context"; line: string; oldNum: number; newNum: number }
	| { kind: "removed"; line: string; oldNum: number; hunkIndex: number }
	| { kind: "added"; line: string; newNum: number; hunkIndex: number };

/** Build rows for a unified diff view with hunk indices on change lines. */
export function computeUnifiedDiffRows(original: string, modified: string): UnifiedDiffRow[] {
	const parts = diffLines(original, modified);
	const rows: UnifiedDiffRow[] = [];
	let oldNum = 1;
	let newNum = 1;
	let hunkIndex = -1;
	let inHunk = false;

	const bumpHunk = () => {
		if (!inHunk) {
			hunkIndex += 1;
			inHunk = true;
		}
	};
	const endHunk = () => {
		inHunk = false;
	};

	for (const part of parts) {
		const lines = partLines(part);
		if (!part.added && !part.removed) {
			endHunk();
			for (const line of lines) {
				rows.push({ kind: "context", line, oldNum: oldNum++, newNum: newNum++ });
			}
		} else if (part.removed) {
			bumpHunk();
			for (const line of lines) {
				rows.push({ kind: "removed", line, oldNum: oldNum++, hunkIndex });
			}
		} else if (part.added) {
			bumpHunk();
			for (const line of lines) {
				rows.push({ kind: "added", line, newNum: newNum++, hunkIndex });
			}
		}
	}
	return rows;
}

/** Revert a single hunk in `modified` back toward `original` semantics (replace new region with old lines). */
export function revertHunkInModified(modified: string, hunk: FileChangeHunk): string {
	const lines = modified.split("\n");
	const { newStartLine, newEndLine, oldLines } = hunk;
	const del = Math.max(0, newEndLine - newStartLine);
	lines.splice(newStartLine, del, ...oldLines);
	return lines.join("\n");
}

export function countChangeHunks(original: string, modified: string): number {
	return computeFileChangeHunks(original, modified).length;
}
