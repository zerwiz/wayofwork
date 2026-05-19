import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PI_MODEL_CONFIG_ENTRIES, type PiModelConfigPath } from "../constants/piModelConfigPaths";
import {
	WOP_WORKSPACE_EDITOR_FIND_BAR_INACTIVE,
	WOP_WORKSPACE_EDITOR_GUTTER_DARK,
	WOP_WORKSPACE_EDITOR_GUTTER_LIGHT,
	WOP_WORKSPACE_EDITOR_SCROLL_DARK,
	WOP_WORKSPACE_EDITOR_SCROLL_LIGHT,
	WOP_WORKSPACE_EDITOR_TEXTAREA_DARK,
	WOP_WORKSPACE_EDITOR_TEXTAREA_LIGHT,
} from "../constants/workspaceEditorChrome";
import { useFileEditor } from "../hooks/useFileEditor";
import { WorkspaceTextBuffer } from "./WorkspaceTextBuffer";

function tryParseJson(text: string): { ok: true } | { ok: false; message: string } {
	try {
		JSON.parse(text);
		return { ok: true };
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return { ok: false, message: msg };
	}
}

export function ProviderConfigEditor({
	appearanceDark,
	initialPath,
	initialPathNonce = 0,
	onInitialPathConsumed,
	onAfterSave,
}: {
	appearanceDark: boolean;
	/** When set (e.g. from menu), select this file and optionally clear via callback. */
	initialPath?: PiModelConfigPath | null;
	/** Bump when re-focusing the same path from the menu. */
	initialPathNonce?: number;
	onInitialPathConsumed?: () => void;
	onAfterSave?: () => void;
}) {
	const [selected, setSelected] = useState<PiModelConfigPath>(() =>
		initialPath && PI_MODEL_CONFIG_ENTRIES.some((e) => e.path === initialPath)
			? initialPath
			: PI_MODEL_CONFIG_ENTRIES[0].path,
	);

	useEffect(() => {
		if (!initialPath) return;
		const known = PI_MODEL_CONFIG_ENTRIES.some((e) => e.path === initialPath);
		if (known) setSelected(initialPath);
		onInitialPathConsumed?.();
		// initialPathNonce lets the menu re-open the same file twice.
	}, [initialPath, initialPathNonce, onInitialPathConsumed]);

	const { content, setContent, loading, error, dirty, save, reload } = useFileEditor(selected, { autoSave: false });
	const [saving, setSaving] = useState(false);
	const [savedFlash, setSavedFlash] = useState(false);
	const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const parseCheck = useMemo(() => tryParseJson(content), [content]);

	useEffect(() => {
		return () => {
			if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
		};
	}, []);

	useEffect(() => {
		if (dirty) setSavedFlash(false);
	}, [dirty]);

	useEffect(() => {
		setSavedFlash(false);
	}, [selected]);

	const border = appearanceDark ? "border-slate-800" : "border-zinc-200";
	const navBg = appearanceDark ? "bg-slate-950/80" : "bg-zinc-100";
	const navBtn = appearanceDark
		? "text-left text-slate-300 hover:bg-slate-800/80"
		: "text-left text-zinc-800 hover:bg-white";
	const navActive = appearanceDark ? "border-l-2 border-sky-500 bg-slate-900/90 text-white" : "border-l-2 border-sky-600 bg-white text-zinc-900";
	const sub = appearanceDark ? "text-slate-500" : "text-zinc-500";

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
				onAfterSave?.();
			}
		} finally {
			setSaving(false);
		}
	}, [parseCheck.ok, save, onAfterSave]);

	return (
		<div className={`flex min-h-[min(420px,50vh)] w-full flex-col overflow-hidden rounded-xl border md:flex-row ${border} ${appearanceDark ? "bg-slate-900/40" : "bg-white"}`}>
			<nav className={`flex w-full shrink-0 flex-col border-b p-2 md:w-52 md:border-b-0 md:border-r ${border} ${navBg}`}>
				<div className={`mb-2 px-2 text-[10px] font-bold uppercase tracking-wider ${sub}`}>Pi config</div>
				<ul className="flex flex-row gap-1 overflow-x-auto md:flex-col md:overflow-visible">
					{PI_MODEL_CONFIG_ENTRIES.map((e) => {
						const active = e.path === selected;
						return (
							<li key={e.id} className="shrink-0 md:w-full">
								<button
									type="button"
									onClick={() => setSelected(e.path)}
									className={`w-full rounded px-2 py-2 text-left text-xs font-semibold md:py-2.5 ${navBtn} ${active ? navActive : ""}`}
									title={e.hint}
								>
									{e.label}
									<span className={`mt-0.5 block font-mono text-[10px] font-normal opacity-80 ${sub}`}>{e.path}</span>
								</button>
							</li>
						);
					})}
				</ul>
				<p className={`mt-2 px-2 text-[10px] leading-snug md:hidden ${sub}`}>
					Saves to workspace via API. Restart Way of Pi for env changes; Pi TUI: <span className="font-mono">/models</span>.
				</p>
				<p className={`mt-2 hidden px-2 text-[10px] leading-snug md:block ${sub}`}>
					Edits are saved to the workspace over the API. Restart the <strong className="font-semibold">Way of Pi server</strong>{" "}
					so host env (<span className="font-mono">WOP_LLM_PROVIDER</span>, <span className="font-mono">WOP_CHAT_ENGINE</span>,{" "}
					<span className="font-mono">OLLAMA_*</span>, …) matches what you expect. For the Pi TUI, restart Pi or use{" "}
					<span className="font-mono">/models</span> so catalog changes from JSON are picked up.
				</p>
			</nav>
			<div className="flex min-h-0 min-w-0 flex-1 flex-col">
				<div className={`flex flex-wrap items-center gap-2 border-b px-3 py-2 ${border}`}>
					<span className="font-mono text-[11px] text-sky-500">{selected}</span>
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
									? "rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800 disabled:opacity-40"
									: "rounded border border-zinc-300 px-2 py-1 text-[11px] text-zinc-800 hover:bg-zinc-100 disabled:opacity-40"
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
				<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-2 pb-2">
					<WorkspaceTextBuffer
						path={selected}
						content={content}
						onChange={setContent}
						loading={loading}
						error={error}
						wordWrap
						scrollClassName={
							appearanceDark
								? `${WOP_WORKSPACE_EDITOR_SCROLL_DARK} rounded border border-slate-800`
								: `${WOP_WORKSPACE_EDITOR_SCROLL_LIGHT} rounded border border-zinc-200`
						}
						lineGutterClassName={
							appearanceDark ? WOP_WORKSPACE_EDITOR_GUTTER_DARK : WOP_WORKSPACE_EDITOR_GUTTER_LIGHT
						}
						textareaClassName={
							appearanceDark ? WOP_WORKSPACE_EDITOR_TEXTAREA_DARK : WOP_WORKSPACE_EDITOR_TEXTAREA_LIGHT
						}
						findBarClassName={WOP_WORKSPACE_EDITOR_FIND_BAR_INACTIVE}
						statusLoadingClassName="p-4 text-sm text-slate-500"
						statusErrorClassName="p-4 text-sm text-red-500"
					/>
				</div>
			</div>
		</div>
	);
}
