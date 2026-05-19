import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFileEditor } from "../hooks/useFileEditor";
import {
	WOP_WORKSPACE_EDITOR_FIND_BAR_INACTIVE,
	WOP_WORKSPACE_EDITOR_GUTTER_DARK,
	WOP_WORKSPACE_EDITOR_GUTTER_LIGHT,
	WOP_WORKSPACE_EDITOR_SCROLL_DARK,
	WOP_WORKSPACE_EDITOR_SCROLL_LIGHT,
	WOP_WORKSPACE_EDITOR_TEXTAREA_DARK,
	WOP_WORKSPACE_EDITOR_TEXTAREA_LIGHT,
} from "../constants/workspaceEditorChrome";
import { WorkspaceTextBuffer } from "./WorkspaceTextBuffer";

function validateEditableContent(path: string, text: string): { ok: true } | { ok: false; message: string } {
	if (path.endsWith(".json")) {
		try {
			JSON.parse(text);
			return { ok: true };
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			return { ok: false, message: msg };
		}
	}
	return { ok: true };
}

/** Workspace-relative JSON/YAML editor with **Save** / **Revert** (same **`/api/file`** path as the rest of the shell). */
export function HostDoctorWorkspaceFileEditor({
	path,
	appearanceDark,
	onSaveSuccess,
}: {
	path: string;
	appearanceDark: boolean;
	onSaveSuccess?: () => void;
}) {
	const { content, setContent, loading, error, dirty, save, reload } = useFileEditor(path);
	const [saving, setSaving] = useState(false);
	const [savedFlash, setSavedFlash] = useState(false);
	const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(
		() => () => {
			if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
		},
		[],
	);

	const parseCheck = useMemo(() => validateEditableContent(path, content), [path, content]);

	const onSave = useCallback(async () => {
		if (!parseCheck.ok) return;
		setSaving(true);
		setSavedFlash(false);
		try {
			const ok = await save();
			if (ok) {
				if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
				setSavedFlash(true);
				savedTimerRef.current = setTimeout(() => {
					setSavedFlash(false);
					savedTimerRef.current = null;
				}, 2200);
				onSaveSuccess?.();
			}
		} finally {
			setSaving(false);
		}
	}, [parseCheck.ok, save, onSaveSuccess]);

	const border = appearanceDark ? "border-[#3c3c3c]" : "border-[#e5e5e5]";
	const sub = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const scroll = `${appearanceDark ? WOP_WORKSPACE_EDITOR_SCROLL_DARK : WOP_WORKSPACE_EDITOR_SCROLL_LIGHT} px-2 pb-2`;

	return (
		<div className={`flex min-h-[min(360px,45vh)] flex-col overflow-hidden rounded-lg border ${border}`}>
			<div className={`flex flex-wrap items-center gap-2 border-b px-3 py-2 ${border}`}>
				<span className="font-mono text-[11px] text-sky-500">{path}</span>
				{loading ? <span className={`text-[11px] ${sub}`}>Loading…</span> : null}
				{dirty ? <span className="text-[11px] font-bold text-amber-500">Modified</span> : null}
				{savedFlash ? (
					<span
						className={`text-[11px] font-bold ${appearanceDark ? "text-emerald-400" : "text-emerald-700"}`}
						role="status"
					>
						Saved to disk
					</span>
				) : null}
				<div className="ml-auto flex flex-wrap gap-2">
					<button
						type="button"
						onClick={() => void reload()}
						disabled={loading || saving}
						className={
							appearanceDark
								? "rounded border border-[#505050] px-2 py-1 text-[11px] text-[#cccccc] hover:bg-[#3c3c3c] disabled:opacity-40"
								: "rounded border border-[#ccc] px-2 py-1 text-[11px] text-[#333] hover:bg-[#f5f5f5] disabled:opacity-40"
						}
					>
						Revert
					</button>
					<button
						type="button"
						onClick={() => void onSave()}
						disabled={loading || saving || !dirty || !parseCheck.ok}
						className="rounded border border-sky-600 bg-sky-600/90 px-2 py-1 text-[11px] font-bold text-white hover:bg-sky-600 disabled:opacity-40"
					>
						{saving ? "Saving…" : "Save"}
					</button>
				</div>
			</div>
			<p className={`border-b px-3 py-1.5 text-[10px] leading-snug ${border} ${sub}`}>
				This is a real workspace file (not the live snapshot). Restart the Way of Pi server after changing host env (
				<span className="font-mono">WOP_*</span>, <span className="font-mono">OLLAMA_*</span>) outside the repo.
			</p>
			{error ? (
				<div
					className={`mx-3 mt-2 rounded border px-2 py-2 font-mono text-[11px] ${
						appearanceDark ? "border-red-900/60 bg-red-950/50 text-red-200" : "border-red-200 bg-red-50 text-red-900"
					}`}
				>
					{error}
				</div>
			) : null}
			{!parseCheck.ok ? (
				<div
					className={`mx-3 mt-2 rounded border px-2 py-2 font-mono text-[11px] ${
						appearanceDark ? "border-amber-900/50 bg-amber-950/40 text-amber-100" : "border-amber-200 bg-amber-50 text-amber-950"
					}`}
				>
					Invalid JSON — fix before save: {parseCheck.message}
				</div>
			) : null}
			<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
				<WorkspaceTextBuffer
					path={path}
					content={content}
					onChange={setContent}
					loading={loading}
					error={error}
					wordWrap
					scrollClassName={scroll}
					lineGutterClassName={
						appearanceDark ? WOP_WORKSPACE_EDITOR_GUTTER_DARK : WOP_WORKSPACE_EDITOR_GUTTER_LIGHT
					}
					textareaClassName={
						appearanceDark ? WOP_WORKSPACE_EDITOR_TEXTAREA_DARK : WOP_WORKSPACE_EDITOR_TEXTAREA_LIGHT
					}
					findBarClassName={WOP_WORKSPACE_EDITOR_FIND_BAR_INACTIVE}
					statusLoadingClassName="p-4 text-sm text-[#858585]"
					statusErrorClassName="p-4 text-sm text-red-500"
				/>
			</div>
		</div>
	);
}
