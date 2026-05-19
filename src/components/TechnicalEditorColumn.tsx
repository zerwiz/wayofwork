import { forwardRef, useCallback, useEffect, useMemo, useRef } from "react";
import { useFileEditor } from "../hooks/useFileEditor";
import type { WorkspaceEditorRef } from "../types/workspaceEditor";
import { computeWorkspaceFilePreview } from "../utils/workspaceFilePreview";
import type { PanelTab } from "../utils/panelDockLayout";
import { WorkspacePane, type WorkspacePaneProps } from "./WorkspacePane";

export type MainEditorColumnApi = {
	save: () => Promise<boolean>;
	reload: () => Promise<void>;
	getContent: () => string;
	dirty: boolean;
};

type SharedWorkspacePaneProps = Omit<
	WorkspacePaneProps,
	| "tabs"
	| "activeIndex"
	| "onActiveIndexChange"
	| "onSelectFileTab"
	| "onReorderTab"
	| "onCloseTab"
	| "onAddTool"
	| "fileActions"
	| "logs"
	| "editorPath"
	| "content"
	| "onChange"
	| "loading"
	| "error"
	| "dirty"
	| "persistEncoding"
	| "filePreview"
	| "onSave"
	| "onDiscardUnsaved"
	| "onCursor"
>;

/**
 * One main-workspace editor column with its own `useFileEditor` state (so multiple files stay open side by side).
 * Uses the same {@link WorkspacePane} shell as the primary column (single file tab for this column).
 */
export const TechnicalEditorColumn = forwardRef<
	WorkspaceEditorRef,
	{
		path: string;
		isFocused: boolean;
		autoSave: boolean;
		onActivate: () => void;
		onClose: () => void;
		onColumnApi: (path: string, api: MainEditorColumnApi | null) => void;
		onFocusedMeta: (meta: { dirty: boolean; loading: boolean; error: string | null }) => void;
		onCursor?: (line: number, col: number) => void;
		shared: SharedWorkspacePaneProps;
	}
>(function TechnicalEditorColumn(
	{ path, isFocused, autoSave, onActivate, onClose, onColumnApi, onFocusedMeta, onCursor, shared },
	ref,
) {
	const {
		content,
		setContent,
		persistEncoding,
		mimeType,
		loading,
		error,
		dirty,
		save,
		reload,
		discardUnsavedChanges,
	} = useFileEditor(path, {
		autoSave,
	});

	const filePreview = useMemo(() => {
		if (loading) return null;
		return computeWorkspaceFilePreview(path, persistEncoding, mimeType, content);
	}, [loading, path, persistEncoding, mimeType, content]);

	const tabs = useMemo<PanelTab[]>(() => [{ type: "file", path }], [path]);

	const contentRef = useRef(content);
	contentRef.current = content;

	const publishApi = useCallback(() => {
		const api: MainEditorColumnApi = {
			save,
			reload,
			getContent: () => contentRef.current,
			dirty,
		};
		onColumnApi(path, api);
	}, [path, save, reload, dirty, onColumnApi]);

	useEffect(() => {
		publishApi();
		return () => onColumnApi(path, null);
	}, [path, publishApi, onColumnApi]);

	useEffect(() => {
		if (!isFocused) return;
		onFocusedMeta({ dirty, loading, error: error ?? null });
	}, [isFocused, dirty, loading, error, onFocusedMeta]);

	return (
		<div
			className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden outline-none"
			onPointerDownCapture={() => onActivate()}
			role="presentation"
		>
			<WorkspacePane
				ref={ref}
				tabs={tabs}
				activeIndex={0}
				onActiveIndexChange={() => {}}
				onSelectFileTab={() => {}}
				onReorderTab={() => {}}
				onCloseTab={() => {
					void onClose();
				}}
				onAddTool={() => {}}
				fileActions={[]}
				logs={[]}
				editorPath={path}
				content={content}
				onChange={setContent}
				loading={loading}
				error={error}
				dirty={dirty}
				persistEncoding={persistEncoding}
				filePreview={filePreview}
				onDiscardUnsaved={discardUnsavedChanges}
				onSave={() => void save()}
				onCursor={isFocused ? onCursor : undefined}
				{...shared}
			/>
		</div>
	);
});
