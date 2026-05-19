/** Client mirror of `GET /api/workspace-index` (+ nested shapes). */

export type WorkspaceIndexOptions = {
	indexNewFolders: boolean;
	instantGrepIndex: boolean;
	attachSummaryToChat: boolean;
	/** 0 = disabled. Positive integer = auto-sync every N minutes. */
	autoSyncIntervalMinutes: number;
};

export type WorkspaceIndexStateFile = {
	version: number;
	syncedAt: string;
	fileCount: number;
	truncated: boolean;
	merkleRoot: string;
	samplePaths: string[];
};

export type WorkspaceIndexDocEntry = {
	id: string;
	url: string;
	title?: string;
	fetchedAt?: string;
	status: "pending" | "ok" | "error";
	error?: string;
	excerptChars?: number;
};

export type WorkspaceIndexStatusPayload = {
	rootLabel: string;
	hasIndex: boolean;
	state: WorkspaceIndexStateFile | null;
	options: WorkspaceIndexOptions;
	docs: WorkspaceIndexDocEntry[];
	about: string;
};
