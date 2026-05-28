/** Imperative API for the workspace text buffer (technical `MainDockPanel` / `SimpleFilePanel`). */
export type WorkspaceEditorRef = {
	undo: () => boolean;
	redo: () => boolean;
	cut: () => void;
	copy: () => void;
	paste: () => Promise<void>;
	/** Open in-file find (Ctrl+F). */
	find: () => void;
	/** Open in-file replace (Ctrl+H). */
	replace: () => void;
	toggleLineComment: () => void;
	toggleBlockComment: () => void;
	/** Emmet-style expand or insert Tab at caret. */
	emmetExpand: () => void;
	canUndo: () => boolean;
	canRedo: () => boolean;
	selectAll: () => void;
	expandSelection: () => void;
	shrinkSelection: () => void;
	copyLineUp: () => void;
	copyLineDown: () => void;
	moveLineUp: () => void;
	moveLineDown: () => void;
	duplicateSelection: () => void;
	addNextOccurrence: () => void;
	addPreviousOccurrence: () => void;
	selectAllOccurrences: () => void;
	getCtrlClickMultiCursor: () => boolean;
	setCtrlClickMultiCursor: (v: boolean) => void;
	getColumnSelectionMode: () => boolean;
	setColumnSelectionMode: (v: boolean) => void;
	/** Current textarea selection (collapsed caret → empty string). */
	getSelectedText: () => string;
	/** Move caret to 1-based line and column (clamped). */
	goToLineColumn: (line: number, column?: number) => void;
	/** Jump to the bracket matching `()`, `[]`, or `{}` at or before the caret. */
	goToMatchingBracket: () => void;
};

/** Menu bar Settings → preferences, sidebars, and technical chrome (wired from App). */
export type SettingsMenuHandlers = {
	/** Simple UI **Settings** tab (appearance, approvals, switch to Technical). */
	onOpenSimpleAppSettings: () => void;
	/** Simple **AI Brains** tab (models / provider). */
	onOpenAiBrains: () => void;
	/** Simple **Projects** tab. */
	onOpenProjects: () => void;
	/** Settings → Indexing & Docs (local manifest under `.index`). */
	onOpenIndexingDocs: () => void;
	/** Settings → Honcho (memory API): env vars, mirror extension, doc links. */
	onOpenHonchoSettings: () => void;
	/** Open `.ui-views.json` in the Simple editor (optional). */
	onEditWorkspaceViewsCatalog?: () => void;
	/**
	 * Opens the **Restart Way of Work** confirmation modal (**POST `/api/server/restart`** when the user confirms).
	 * Reconnects the chat WebSocket when the process does not exit.
	 */
	onRestartServer: () => void | Promise<void>;
};

/** Menu bar Help → … (documentation links; some items are inert in the browser). */
export type HelpMenuHandlers = {
	onShowAllCommands: () => void;
	/** In-app getting started + links to repository docs. */
	onHowToUse: () => void;
	/** Open **Host doctor** (fetches **GET `/api/diagnostics`**: checks, env, Ollama/OpenRouter, Pi CLI, terminal). */
	onOpenHostDoctor: () => void;
	onEditorPlayground: () => void;
	onAccessibilityFeatures: () => void;
	/** Opens the maintainer contact page (WhyNot Productions). */
	onGiveFeedback: () => void;
	/** Opens the maintainer home page (WhyNot Productions). */
	onSupportUs: () => void;
	onViewLicense: () => void;
	onReportBug: () => void;
	/** False in the browser; true only if embedded in a shell that exposes devtools. */
	canToggleDeveloperTools: boolean;
	onToggleDeveloperTools: () => void;
	canOpenProcessExplorer: boolean;
	onOpenProcessExplorer: () => void;
	canDownloadUpdate: boolean;
	onDownloadUpdate: () => void;
};

/** Menu bar Edit → … actions; optional when no editor surface. */
export type EditMenuHandlers = {
	/** File open and editor ready (not loading/error). */
	canEdit: boolean;
	onUndo: () => void;
	onRedo: () => void;
	onCut: () => void;
	onCopy: () => void;
	onPaste: () => void | Promise<void>;
	onFind: () => void;
	onReplace: () => void;
	onFindInFiles: () => void;
	onReplaceInFiles: () => void;
	onToggleLineComment: () => void;
	onToggleBlockComment: () => void;
	onEmmetExpand: () => void;
	canUndo: boolean;
	canRedo: boolean;
};


