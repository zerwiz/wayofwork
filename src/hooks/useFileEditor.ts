import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet, apiPutJson } from "../api/client";
import type { FileGetResponse } from "../types/workspaceFile";

export type FilePersistEncoding = "utf8" | "base64";

function base64ToLatin1(b64: string): string {
	const bin = atob(b64);
	let out = "";
	for (let i = 0; i < bin.length; i++) {
		out += String.fromCharCode(bin.charCodeAt(i) & 255);
	}
	return out;
}

function latin1ToBase64(s: string): string {
	const bytes = new Uint8Array(s.length);
	for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 255;
	let bin = "";
	for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
	return btoa(bin);
}

/** Body for `PUT /api/file` — matches `useFileEditor.save` encoding rules. */
export function buildFilePutPayload(
	path: string,
	content: string,
	persistEncoding: FilePersistEncoding,
): { path: string; content: string } | { path: string; encoding: "base64"; content: string } {
	if (persistEncoding === "base64") {
		return { path, encoding: "base64", content: latin1ToBase64(content) };
	}
	return { path, content };
}

function payloadToEditorState(r: FileGetResponse): {
	text: string;
	persistEncoding: FilePersistEncoding;
	mimeType: string | null;
} {
	if ("encoding" in r && r.encoding === "base64") {
		return { text: base64ToLatin1(r.content), persistEncoding: "base64", mimeType: r.mimeType };
	}
	return { text: r.content, persistEncoding: "utf8", mimeType: null };
}

export function useFileEditor(
	path: string | null,
	options?: {
		autoSave?: boolean;
		/** When GET `/api/file` returns a different `path` (e.g. legacy `.claw/` fallback), sync selection. */
		onDiskPathMismatch?: (actualPath: string) => void;
	},
) {
	const autoSave = options?.autoSave ?? false;
	const onDiskPathMismatchRef = useRef(options?.onDiskPathMismatch);
	onDiskPathMismatchRef.current = options?.onDiskPathMismatch;
	const [content, setContent] = useState("");
	const [lastPersistedContent, setLastPersistedContent] = useState("");
	const [persistEncoding, setPersistEncoding] = useState<FilePersistEncoding>("utf8");
	const [mimeType, setMimeType] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [dirty, setDirty] = useState(false);

	useEffect(() => {
		if (!path) {
			setContent("");
			setLastPersistedContent("");
			setPersistEncoding("utf8");
			setMimeType(null);
			setDirty(false);
			setError(null);
			setLoading(false);
			return;
		}
		let cancelled = false;
		setLoading(true);
		setError(null);
		apiGet<FileGetResponse>(`/api/file?path=${encodeURIComponent(path)}`)
			.then((r) => {
				if (!cancelled) {
					const { text, persistEncoding: enc, mimeType: mt } = payloadToEditorState(r);
					setContent(text);
					setLastPersistedContent(text);
					setPersistEncoding(enc);
					setMimeType(mt);
					setDirty(false);
					if (typeof r.path === "string" && r.path !== path) {
						onDiskPathMismatchRef.current?.(r.path);
					}
				}
			})
			.catch((e) => {
				if (!cancelled) setError(e instanceof Error ? e.message : String(e));
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [path]);

	const setContentTracked = useCallback((next: string) => {
		setContent(next);
		setDirty(true);
	}, []);

	const save = useCallback(async (): Promise<boolean> => {
		if (!path) return false;
		setError(null);
		try {
			if (persistEncoding === "base64") {
				await apiPutJson<{ ok: boolean }>("/api/file", {
					path,
					encoding: "base64",
					content: latin1ToBase64(content),
				});
			} else {
				await apiPutJson<{ ok: boolean }>("/api/file", { path, content });
			}
			setLastPersistedContent(content);
			setDirty(false);
			return true;
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
			return false;
		}
	}, [path, content, persistEncoding]);

	const reload = useCallback(async () => {
		if (!path) return;
		setLoading(true);
		setError(null);
		try {
			const r = await apiGet<FileGetResponse>(`/api/file?path=${encodeURIComponent(path)}`);
			const { text, persistEncoding: enc, mimeType: mt } = payloadToEditorState(r);
			setContent(text);
			setLastPersistedContent(text);
			setPersistEncoding(enc);
			setMimeType(mt);
			setDirty(false);
			if (typeof r.path === "string" && r.path !== path) {
				onDiskPathMismatchRef.current?.(r.path);
			}
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(false);
		}
	}, [path]);

	/** Drop in-memory edits and match last saved snapshot (no network). */
	const discardUnsavedChanges = useCallback(() => {
		if (!path) return;
		setContent(lastPersistedContent);
		setDirty(false);
	}, [path, lastPersistedContent]);

	const saveRef = useRef(save);
	saveRef.current = save;

	useEffect(() => {
		if (!autoSave || !path || !dirty) return;
		const t = window.setTimeout(() => {
			void saveRef.current();
		}, 850);
		return () => window.clearTimeout(t);
	}, [autoSave, path, dirty, content]);

	return {
		content,
		setContent: setContentTracked,
		lastPersistedContent,
		persistEncoding,
		mimeType,
		loading,
		error,
		dirty,
		save,
		reload,
		discardUnsavedChanges,
	};
}
