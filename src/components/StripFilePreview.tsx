import { useEffect, useState } from "react";
import { apiGet } from "../api/client";
import {
	WOP_WORKSPACE_EDITOR_FIND_BAR_INACTIVE,
	WOP_WORKSPACE_EDITOR_GUTTER_DARK,
	WOP_WORKSPACE_EDITOR_SCROLL_DARK,
	WOP_WORKSPACE_EDITOR_TEXTAREA_DARK,
} from "../constants/workspaceEditorChrome";
import type { FileGetResponse } from "../types/workspaceFile";
import { WorkspaceTextBuffer } from "./WorkspaceTextBuffer";

function stripFilePreviewNoop(): void {}

/**
 * Read-only file body for a horizontal dock tab (separate from the main editor buffer).
 * Uses the same line-number gutter as the main workspace editor — see **`docs/WOP_CODE_EDITOR_LINE_NUMBERS.md`**.
 */
export function StripFilePreview({ path }: { path: string }) {
	const [text, setText] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const ac = new AbortController();
		setText(null);
		setError(null);
		void (async () => {
			try {
				const data = await apiGet<FileGetResponse>(`/api/file?path=${encodeURIComponent(path)}`, {
					signal: ac.signal,
				});
				if (ac.signal.aborted) return;
				if ("encoding" in data && data.encoding === "base64") {
					setText(`[Binary or image — open in editor for full handling]\n${data.mimeType}\n${data.path}`);
				} else {
					setText(data.content ?? "");
				}
			} catch (e) {
				if (ac.signal.aborted) return;
				setError(e instanceof Error ? e.message : String(e));
			}
		})();
		return () => ac.abort();
	}, [path]);

	if (error) {
		return (
			<div className="min-h-0 flex-1 overflow-auto p-4 font-mono text-[12px] text-[#f14c4c]">{error}</div>
		);
	}
	if (text === null) {
		return (
			<div className="min-h-0 flex-1 overflow-auto p-4 font-mono text-[12px] text-[#858585]">Loading…</div>
		);
	}
	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-2">
			<WorkspaceTextBuffer
				path={path}
				content={text}
				onChange={stripFilePreviewNoop}
				loading={false}
				error={null}
				readOnly
				wordWrap
				scrollClassName={`${WOP_WORKSPACE_EDITOR_SCROLL_DARK} px-2 py-2`}
				lineGutterClassName={WOP_WORKSPACE_EDITOR_GUTTER_DARK}
				textareaClassName={WOP_WORKSPACE_EDITOR_TEXTAREA_DARK}
				findBarClassName={WOP_WORKSPACE_EDITOR_FIND_BAR_INACTIVE}
				statusLoadingClassName="p-4 text-sm text-[#858585]"
				statusErrorClassName="p-4 text-sm text-red-500"
			/>
		</div>
	);
}
