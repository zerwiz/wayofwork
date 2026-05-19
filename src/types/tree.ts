export interface TreeNode {
	name: string;
	path: string;
	type: "file" | "dir";
	gitStatus?: string;
	children?: TreeNode[];
}

export interface WorkspaceFolderInfo {
	label: string;
	path: string;
}

/** Per workspace folder: Git repo detection (from server `git` CLI). */
export type WorkspaceGitRootState = {
	label: string;
	path: string;
	isRepo: boolean;
	topLevel: string | null;
	branch: string | null;
	error: string | null;
};

export interface WorkspaceGitState {
	roots: WorkspaceGitRootState[];
}

export interface WorkspaceResponse {
	root: string;
	nodes: TreeNode[];
	folders: WorkspaceFolderInfo[];
	switchAllowed: boolean;
	initialRoot: string;
	git: WorkspaceGitState;
}
