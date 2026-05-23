import { json } from "../utils";
import {
	readGithubConnectionMeta,
	readGithubTokenForGit,
	removeGithubCredentials,
	saveGithubCredentials,
	verifyGithubToken,
} from "../github-connection";
import { gitCommit, gitLog, gitPush, gitStageAbsolutePath, gitStageAllFromAbsolutePath } from "../git";
import { getWorkspaceRoot } from "../paths";
import { listPlansCatalog } from "../plans-catalog";
import { auditLog } from "../audit-logger";
import { broadcastToolLog } from "../tool-log-broadcast";
import type { Router } from "../router";

export function registerGithubRoutes(router: Router) {
	router.get("/api/github/status", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			return json(await readGithubConnectionMeta());
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ connected: false, login: null, error: message }, 500);
		}
	});

	router.post("/api/github/connect", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: Record<string, unknown>;
		try {
			body = (await req.json()) as Record<string, unknown>;
		} catch {
			return json({ ok: false, error: "Invalid JSON" }, 400);
		}
		const token = String(body.token ?? "");
		const verified = await verifyGithubToken(token) as any;
		if (!verified.ok) return json({ ok: false, error: verified.error }, 400);
		const saved = await saveGithubCredentials(token, verified.login) as any;
		if (!saved.ok) return json({ ok: false, error: saved.error }, 500);
		return json({ ok: true, login: verified.login });
	});

	router.post("/api/github/disconnect", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		await removeGithubCredentials();
		return json({ ok: true });
	});

	router.post("/api/github/save-version", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: { message?: string };
		try {
			body = (await req.json()) as any;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		const message = body.message?.trim() || `Version saved by ${auth.userId} at ${new Date().toLocaleString()}`;
		const root = getWorkspaceRoot();
		try {
			const stageRes = await gitStageAllFromAbsolutePath(root) as any;
			if (!stageRes.ok) return json({ error: `Stage failed: ${stageRes.error}` }, 500);
			const commitRes = await gitCommit(root, message) as any;
			if (!commitRes.ok) {
				if (commitRes.error.includes("nothing to commit")) {
					return json({ ok: true, message: "Nothing to save" });
				}
				return json({ error: `Commit failed: ${commitRes.error}` }, 500);
			}
			const token = await readGithubTokenForGit();
			const pushRes = await gitPush(root, token) as any;
			if (!pushRes.ok) return json({ error: `Push failed: ${pushRes.error}` }, 500);
			auditLog({
				tenantId: auth.tenantId,
				userId: auth.userId,
				action: "SAVE_VERSION",
				resourceType: "git",
				summary: `User saved a new version: ${message}`
			});
			return json({ ok: true });
		} catch (e) {
			const m = e instanceof Error ? e.message : String(e);
			return json({ error: `Save version failed: ${m}` }, 500);
		}
	});

	router.get("/api/github/version-history", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const root = getWorkspaceRoot();
		const history = await gitLog(root);
		if ("error" in history) return json({ error: history.error }, 500);
		return json(history);
	});

	router.post("/api/git/stage", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: { path?: string; all?: boolean };
		try {
			body = (await req.json()) as { path?: string; all?: boolean };
		} catch {
			return json({ ok: false as const, error: "Invalid JSON" });
		}
		const rel = String(body.path ?? "").trim();
		const abs = getWorkspaceRoot();
		if (body.all === true) {
			const result = await gitStageAllFromAbsolutePath(abs) as any;
			if (!result.ok) {
				broadcastToolLog("WARN", "git", `stage all failed (anchor ${rel}): ${result.error}`);
				return json(result);
			}
			broadcastToolLog("INFO", "git", `staged all changes (repo from ${rel})`);
			return json(result);
		}
		const result = await gitStageAbsolutePath(abs) as any;
		if (!result.ok) {
			broadcastToolLog("WARN", "git", `stage failed ${rel}: ${result.error}`);
			return json(result);
		}
		broadcastToolLog("INFO", "git", `staged ${rel}`);
		return json(result);
	});

	router.get("/api/plans", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			const catalog = await listPlansCatalog();
			return json(catalog);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: message }, 500);
		}
	});
}
