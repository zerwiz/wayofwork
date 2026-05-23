import { json } from "../utils";
import { pickNativePath } from "../native-file-dialog";
import { workspaceSwitchAllowed } from "../workspace-state";
import type { Router } from "../router";

export function registerNativeDialogRoutes(router: Router) {
	router.post("/api/native-dialog/pick", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		if (!workspaceSwitchAllowed()) {
			return json({ error: "Native pick requires workspace switch (WOP_ALLOW_WORKSPACE_SWITCH)", fallback: true }, 403);
		}
		let body: Record<string, unknown>;
		try {
			body = (await req.json()) as Record<string, unknown>;
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		const type = String(body.type ?? "folder");
		const title = String(body.title ?? "Pick folder");
		const startPath = body.startPath ? String(body.startPath) : undefined;

		try {
			const picked = pickNativePath(type as any);
			return json(picked);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: message }, 500);
		}
	});
}
