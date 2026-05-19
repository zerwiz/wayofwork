export type WorkspaceProblemSeverity = "error" | "warning" | "info";

export type WorkspaceProblem = {
	path: string;
	line: number;
	column: number;
	message: string;
	severity: WorkspaceProblemSeverity;
	rule?: string;
	source: "tsc" | "eslint";
};

export type WorkspaceProblemsResponse = {
	ok: boolean;
	error?: string;
	ranAt: string;
	engine: string;
	problems: WorkspaceProblem[];
	exitCode: number | null;
	log: string;
};
