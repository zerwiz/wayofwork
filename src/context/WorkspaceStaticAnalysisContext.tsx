import { createContext, useContext, type ReactNode } from "react";
import type { WorkspaceProblem } from "../types/workspaceProblems";

export type WorkspaceStaticAnalysisContextValue = {
	problems: WorkspaceProblem[];
	loading: boolean;
	runAnalysis: () => Promise<void>;
	/** After save / external bump. */
	scheduleDebouncedRefresh: () => void;
	engine: string;
	log: string;
	ranAt: string;
	ok: boolean;
	error?: string;
	openProblem: (path: string, line: number, column: number) => void;
	/** Re-fetch cached problems from `GET /api/workspace/problems` (e.g. after starting the Bun server). */
	refreshProblemsCache: () => Promise<void>;
};

const Ctx = createContext<WorkspaceStaticAnalysisContextValue | null>(null);

export function WorkspaceStaticAnalysisProvider({
	value,
	children,
}: {
	value: WorkspaceStaticAnalysisContextValue;
	children: ReactNode;
}) {
	return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkspaceStaticAnalysisContext(): WorkspaceStaticAnalysisContextValue {
	const v = useContext(Ctx);
	if (!v) {
		throw new Error("useWorkspaceStaticAnalysisContext must be used within WorkspaceStaticAnalysisProvider");
	}
	return v;
}

/** For `ToolPanelBody` when the provider is absent (should not happen in Technical UI). */
export function useWorkspaceStaticAnalysisContextOptional(): WorkspaceStaticAnalysisContextValue | null {
	return useContext(Ctx);
}
