import { useCallback, useEffect, useRef, useState } from "react";

const GROUP_MS = 420;
const MAX_PAST = 120;

/**
 * Groups rapid typing into undo steps; pairs with controlled textarea `content` / `onChange`.
 */
export function useDebouncedUndoRedo(content: string, onChange: (next: string) => void, fileKey: string | null) {
	const past = useRef<string[]>([]);
	const future = useRef<string[]>([]);
	const groupBase = useRef<string>(content);
	const contentRef = useRef(content);
	const applying = useRef(false);
	const timer = useRef(0);
	const [stackGen, setStackGen] = useState(0);
	const bump = useCallback(() => setStackGen((g) => g + 1), []);

	contentRef.current = content;

	useEffect(() => {
		past.current = [];
		future.current = [];
		groupBase.current = content;
		applying.current = false;
		bump();
	}, [fileKey, bump]);

	const commitGroup = useCallback(() => {
		const cur = contentRef.current;
		const base = groupBase.current;
		if (cur !== base) {
			past.current.push(base);
			if (past.current.length > MAX_PAST) past.current.shift();
			future.current = [];
			groupBase.current = cur;
			bump();
		}
	}, [bump]);

	const onUserChange = useCallback(
		(next: string) => {
			onChange(next);
			if (applying.current) return;
			window.clearTimeout(timer.current);
			timer.current = window.setTimeout(() => {
				commitGroup();
			}, GROUP_MS);
		},
		[onChange, commitGroup],
	);

	const undo = useCallback(() => {
		window.clearTimeout(timer.current);
		commitGroup();
		if (past.current.length === 0) return false;
		const prev = past.current.pop()!;
		future.current.push(contentRef.current);
		applying.current = true;
		groupBase.current = prev;
		onChange(prev);
		bump();
		queueMicrotask(() => {
			applying.current = false;
		});
		return true;
	}, [onChange, commitGroup, bump]);

	const redo = useCallback(() => {
		if (future.current.length === 0) return false;
		const next = future.current.pop()!;
		past.current.push(contentRef.current);
		applying.current = true;
		groupBase.current = next;
		onChange(next);
		bump();
		queueMicrotask(() => {
			applying.current = false;
		});
		return true;
	}, [onChange, bump]);

	const canUndo = () => past.current.length > 0;
	const canRedo = () => future.current.length > 0;

	return { onUserChange, undo, redo, canUndo, canRedo, stackGen };
}
