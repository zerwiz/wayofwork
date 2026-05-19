import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet } from "../api/client";
import {
	readPlanHandoffPathFromStorage,
	resolvePlanHandoffPath,
	writePlanHandoffPathToStorage,
} from "../utils/planHandoffPersistence";

export type PlanHandoffFile = {
	path: string;
	mtimeMs: number;
	openTodos: number;
	doneTodos: number;
};

type PlansApi = {
	files: PlanHandoffFile[];
	latest: PlanHandoffFile | null;
};

type LoadState =
	| { status: "pending" }
	| { status: "ready"; files: PlanHandoffFile[]; latest: PlanHandoffFile | null };

/**
 * Plan-mode handoff document: lists `plans/PLAN-*.md`, remembers the user’s choice per workspace key
 * (primary folder path or empty), and resolves **From plan** / **Review plan** to that path.
 */
export function usePlanHandoffSelection(workspacePersistKey: string, enabled: boolean) {
	const [load, setLoad] = useState<LoadState>({ status: "pending" });
	const [userPath, setUserPath] = useState<string | null>(null);

	useEffect(() => {
		if (!enabled) {
			setUserPath(null);
			return;
		}
		setUserPath(readPlanHandoffPathFromStorage(workspacePersistKey));
	}, [workspacePersistKey, enabled]);

	const refresh = useCallback(() => {
		if (!enabled) return;
		void apiGet<PlansApi>("/api/plans")
			.then((d) => {
				setLoad({ status: "ready", files: d.files ?? [], latest: d.latest ?? null });
			})
			.catch(() => {
				setLoad({ status: "ready", files: [], latest: null });
			});
	}, [enabled]);

	useEffect(() => {
		if (!enabled) {
			setLoad({ status: "pending" });
			return;
		}
		refresh();
		const id = window.setInterval(refresh, 12_000);
		return () => window.clearInterval(id);
	}, [enabled, refresh]);

	const files = load.status === "ready" ? load.files : [];
	const _latest = load.status === "ready" ? load.latest : null; void _latest;

	useEffect(() => {
		if (load.status !== "ready" || !userPath) return;
		if (!load.files.some((f) => f.path === userPath)) {
			setUserPath(null);
			writePlanHandoffPathToStorage(workspacePersistKey, null);
		}
	}, [load, userPath, workspacePersistKey]);

	const handoffPath = useMemo(() => {
		if (load.status !== "ready") return null;
		return resolvePlanHandoffPath(load.files, load.latest, userPath);
	}, [load, userPath]);

	const handoffSummary = useMemo(() => {
		if (!handoffPath || load.status !== "ready") return null;
		return load.files.find((f) => f.path === handoffPath) ?? null;
	}, [load, handoffPath]);

	const setHandoffPath = useCallback(
		(path: string) => {
			setUserPath(path);
			writePlanHandoffPathToStorage(workspacePersistKey, path);
		},
		[workspacePersistKey],
	);

	return {
		planCatalogReady: load.status === "ready",
		planFiles: files,
		handoffPath,
		handoffSummary,
		setHandoffPath,
		refreshPlanCatalog: refresh,
	};
}
