/** Native `title` for explorer rows with Git decoration. */
export function gitExplorerRowTitle(gitStatus?: string): string | undefined {
	if (!gitStatus) return;
	if (gitStatus === "*") return "Contains nested changes (from git status)";
	if (gitStatus === "??") return "Untracked";
	return `Git status: ${gitStatus}`;
}

/** Primary action in the Git badge popover (stage via API or refresh tree). */
export type GitExplorerFix =
	| { kind: "stage"; label: string; workspaceRelPath: string }
	| { kind: "refresh_tree"; label: string };

export type GitBadgeHelp = {
	summary: string;
	detail: string;
	fix?: GitExplorerFix;
	/** `git add -A` in the repo that contains this row (anchor path for multi-root). */
	fixStageAll?: { label: string; workspaceRelPath: string };
};

/** Best-effort quoting for `git add "…"` in a terminal (reference only). */
export function shellGitAddQuoted(relPath: string): string {
	const norm = relPath.trim().replace(/\\/g, "/");
	const escaped = norm.replace(/"/g, '\\"');
	return `git add "${escaped}"`;
}

/** Rich copy for the explorer Git badge popover (??, *, two-letter codes). */
export function gitBadgeHelp(gitStatus: string, relPath: string): GitBadgeHelp {
	const stageAll = { label: "Stage all changes", workspaceRelPath: relPath };

	if (gitStatus === "??") {
		return {
			summary: "Untracked (Git ??)",
			detail:
				"Git has not recorded this path in the index yet—common for new files or folders. Stage it before it can be committed, or add a .gitignore rule if it should stay local-only.",
			fix: { kind: "stage", label: "Stage for commit", workspaceRelPath: relPath },
			fixStageAll: stageAll,
		};
	}
	if (gitStatus === "*") {
		return {
			summary: "Nested Git changes",
			detail:
				"Something inside this folder was modified, added, deleted, renamed, or is untracked. Expand the folder to see each entry’s status (M, A, D, ??, …).",
			fix: { kind: "refresh_tree", label: "Refresh tree" },
			fixStageAll: stageAll,
		};
	}

	const known: Record<string, string> = {
		M: "Modified in the working tree compared to what is staged in the index.",
		MM: "Modified in both the index and the working tree (staged and unstaged edits).",
		A: "Added: new content is staged in the index.",
		D: "Deleted: removal is staged or the file is gone in the working tree.",
		R: "Renamed (Git detected a rename).",
		U: "Unmerged: conflict markers or an unfinished merge.",
		AM: "Added then modified (staged add with further working-tree edits).",
		AD: "Added then deleted before commit.",
		RM: "Renamed with additional modifications.",
	};
	const detail =
		known[gitStatus] ??
		`Short status from git status --porcelain (${gitStatus}). See Git’s “Short Format” documentation for the exact meaning of each column.`;

	return {
		summary: `Git status: ${gitStatus}`,
		detail,
		fix: { kind: "stage", label: "Stage for commit", workspaceRelPath: relPath },
		fixStageAll: stageAll,
	};
}
