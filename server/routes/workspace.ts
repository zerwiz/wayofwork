import { json } from "../utils";
import {
	addFolder,
	getFrozenInitialWorkspacePath,
	getPrimaryWorkspacePath,
	listWorkspaceFolders,
	loadFoldersFromWorkspaceJson,
	openFileInWorkspace,
	openFolder,
	removeFolderByLabel,
	resetWorkspaceToInitial,
	saveCodeWorkspaceFileToPath,
	setWorkspaceFoldersAbs,
	workspaceSwitchAllowed,
} from "../workspace-state";
import {
	addWorkspaceIndexDoc,
	applyAutoSync,
	clearWorkspaceIndex,
	getWorkspaceIndexChatBoostSync,
	getWorkspaceIndexStatus,
	patchWorkspaceIndexOptions,
	removeWorkspaceIndexDoc,
	syncWorkspaceIndex,
	syncWorkspaceIndexDoc,
} from "../workspace-index";
import {
	runWorkspaceProblemsAnalysis,
	type WorkspaceProblemsRunResult,
} from "../workspace-problems";
import { broadcastToolLog } from "../tool-log-broadcast";
import { getPrimaryWorkspacePath as getWorkspaceRoot } from "../paths";
import type { Router } from "../router";

export function registerWorkspaceRoutes(router: Router) {
	router.get("/api/workspace", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		return json({
			root: getPrimaryWorkspacePath(),
			folders: listWorkspaceFolders(),
			switchAllowed: workspaceSwitchAllowed(),
			initialRoot: getFrozenInitialWorkspacePath(),
		});
	});

	router.post("/api/workspace", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: Record<string, unknown>;
		try {
			body = (await req.json()) as Record<string, unknown>;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		const op = String(body.op ?? "");
		try {
			if (op === "open_folder") {
				const p = String(body.path ?? "").trim();
				if (!p) return json({ error: "path required" }, 400);
				await openFolder(p);
				broadcastToolLog("INFO", "cd", `workspace open_folder ${p.length > 160 ? `${p.slice(0, 157)}…` : p}`);
				return json({ ok: true, folders: listWorkspaceFolders(), root: getPrimaryWorkspacePath() });
			}
			if (op === "add_folder") {
				const p = String(body.path ?? "").trim();
				if (!p) return json({ error: "path required" }, 400);
				await addFolder(p);
				broadcastToolLog("INFO", "cd", `workspace add_folder ${p.length > 160 ? `${p.slice(0, 157)}…` : p}`);
				return json({ ok: true, folders: listWorkspaceFolders(), root: getPrimaryWorkspacePath() });
			}
			if (op === "remove_folder") {
				const label = String(body.label ?? "").trim();
				if (!label) return json({ error: "label required" }, 400);
				removeFolderByLabel(label);
				return json({ ok: true, folders: listWorkspaceFolders(), root: getPrimaryWorkspacePath() });
			}
			if (op === "save_code_workspace_file") {
				const filePath = String(body.path ?? "").trim();
				if (!filePath) return json({ error: "path required" }, 400);
				await saveCodeWorkspaceFileToPath(filePath);
				broadcastToolLog("INFO", "write", `workspace save_code_workspace_file ${filePath.length > 200 ? `${filePath.slice(0, 197)}…` : filePath}`);
				return json({ ok: true, folders: listWorkspaceFolders(), root: getPrimaryWorkspacePath() });
			}
			if (op === "close_workspace" || op === "reset_workspace") {
				resetWorkspaceToInitial();
				return json({ ok: true, folders: listWorkspaceFolders(), root: getPrimaryWorkspacePath() });
			}
			if (op === "open_file") {
				const p = String(body.path ?? "").trim();
				if (!p) return json({ error: "path required" }, 400);
				const selectPath = await openFileInWorkspace(p);
				broadcastToolLog("INFO", "read", `workspace open_file ${p.length > 200 ? `${p.slice(0, 197)}…` : p}`);
				return json({ ok: true, folders: listWorkspaceFolders(), root: getPrimaryWorkspacePath(), selectPath });
			}
			if (op === "apply_workspace_folders") {
				const pathsRaw = body.paths;
				if (!Array.isArray(pathsRaw) || pathsRaw.length === 0) {
					return json({ error: "paths array required" }, 400);
				}
				const paths = pathsRaw.map((item) => String(item ?? "").trim()).filter(Boolean);
				if (paths.length === 0) return json({ error: "No valid paths" }, 400);
				await setWorkspaceFoldersAbs(paths);
				return json({ ok: true, folders: listWorkspaceFolders(), root: getPrimaryWorkspacePath() });
			}
			if (op === "from_code_workspace_file") {
				const filePath = String(body.workspaceFilePath ?? "").trim();
				const rawJson = body.json;
				if (!filePath || rawJson === undefined) {
					return json({ error: "workspaceFilePath and json required" }, 400);
				}
				await loadFoldersFromWorkspaceJson(rawJson, filePath);
				return json({ ok: true, folders: listWorkspaceFolders(), root: getPrimaryWorkspacePath() });
			}
			return json({ error: `Unknown op: ${op}` }, 400);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: message }, 400);
		}
	});

	router.get("/api/workspace/problems", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		return json({
			ok: true,
			ranAt: new Date(0).toISOString(),
			engine: "none",
			problems: [],
			exitCode: null,
			log: "No analysis run yet — open the Problems panel and choose Run analysis.",
		} satisfies WorkspaceProblemsRunResult);
	});

	router.post("/api/workspace/problems/run", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			const root = getPrimaryWorkspacePath();
			const result = await runWorkspaceProblemsAnalysis(root);
			broadcastToolLog("INFO", "analyze", `workspace problems: engine=${result.engine} count=${result.problems.length}${result.error ? ` (${result.error})` : ""}`);
			return json(result);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ ok: false, error: message, ranAt: new Date().toISOString(), engine: "error", problems: [], exitCode: null, log: message }, 500);
		}
	});

	router.get("/api/workspace-index", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			return json(await getWorkspaceIndexStatus());
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: message }, 500);
		}
	});

	router.post("/api/workspace-index/sync", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			const result = await syncWorkspaceIndex();
			broadcastToolLog("INFO", "index", `workspace index sync: files=${result.state.fileCount}`);
			return json(result);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ ok: false, error: message }, 500);
		}
	});

	router.post("/api/workspace-index/clear", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			await clearWorkspaceIndex();
			broadcastToolLog("INFO", "index", "workspace index cleared");
			return json({ ok: true });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ ok: false, error: message }, 500);
		}
	});

	router.post("/api/workspace-index/options", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: Record<string, unknown>;
		try {
			body = (await req.json()) as Record<string, unknown>;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		try {
			const partial: {
				indexNewFolders?: boolean;
				instantGrepIndex?: boolean;
				attachSummaryToChat?: boolean;
				autoSyncIntervalMinutes?: number;
			} = {};
			if (typeof body.indexNewFolders === "boolean") partial.indexNewFolders = body.indexNewFolders;
			if (typeof body.instantGrepIndex === "boolean") partial.instantGrepIndex = body.instantGrepIndex;
			if (typeof body.attachSummaryToChat === "boolean") partial.attachSummaryToChat = body.attachSummaryToChat;
			if (typeof body.autoSyncIntervalMinutes === "number") partial.autoSyncIntervalMinutes = body.autoSyncIntervalMinutes;
			const options = await patchWorkspaceIndexOptions(partial);
			void applyAutoSync((result) => {
				broadcastToolLog("INFO", "index", `auto-sync: files=${result.state.fileCount} fingerprint=${result.state.merkleRoot}`);
			});
			return json({ ok: true, options });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ ok: false, error: message }, 500);
		}
	});

	router.post("/api/workspace-index/docs", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: Record<string, unknown>;
		try {
			body = (await req.json()) as Record<string, unknown>;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		const url = String(body.url ?? "").trim();
		if (!url) return json({ error: "url required" }, 400);
		try {
			const entry = await addWorkspaceIndexDoc(url);
			return json({ ok: true, entry });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ ok: false, error: message }, 400);
		}
	});

	router.post("/api/workspace-index/docs/sync", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: Record<string, unknown>;
		try {
			body = (await req.json()) as Record<string, unknown>;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		const id = String(body.id ?? "").trim();
		if (!id) return json({ error: "id required" }, 400);
		try {
			const entry = await syncWorkspaceIndexDoc(id);
			if (!entry) return json({ error: "not found" }, 404);
			return json({ ok: true, entry });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ ok: false, error: message }, 500);
		}
	});

	router.post("/api/workspace-index/docs/remove", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: Record<string, unknown>;
		try {
			body = (await req.json()) as Record<string, unknown>;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		const id = String(body.id ?? "").trim();
		if (!id) return json({ error: "id required" }, 400);
		const ok = await removeWorkspaceIndexDoc(id);
		if (!ok) return json({ error: "not found" }, 404);
		return json({ ok: true });
	});
}
