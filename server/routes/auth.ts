import { json } from "../utils";
import { createToken } from "../auth";
import { db } from "../db";
import type { Router } from "../router";

export function registerAuthRoutes(router: Router) {
	router.post("/api/login", async (req, _params, _auth) => {
		let body: { username?: string; password?: string };
		try {
			body = (await req.json()) as { username?: string; password?: string };
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		const { username, password } = body;
		if (!username || !password) {
			return json({ error: "Username and password required" }, 400);
		}

		const user = db.query("SELECT * FROM users WHERE username = ?").get(username) as any;
		if (!user || !(await Bun.password.verify(password, user.password_hash))) {
			return json({ error: "Invalid credentials" }, 401);
		}

		const token = await createToken(user.id, user.tenant_id, user.role);
		return json({
			token,
			user: {
				id: user.id,
				username: user.username,
				role: user.role,
				tenantId: user.tenant_id,
			},
		});
	});

	router.post("/api/portal/login", async (req, _params, _auth) => {
		let body: { workerId?: string; pin?: string };
		try {
			body = (await req.json()) as { workerId?: string; pin?: string };
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		const { workerId, pin } = body;
		if (!workerId || !pin) {
			return json({ error: "Worker ID and PIN required" }, 400);
		}

		let user = db.query("SELECT * FROM users WHERE username = ? AND pin = ?").get(workerId, pin) as any;

		if (!user) {
			const byUsername = db.query("SELECT * FROM users WHERE username = ?").get(workerId) as any;
			if (byUsername && byUsername.password_hash) {
				const valid = await Bun.password.verify(pin, byUsername.password_hash);
				if (valid) user = byUsername;
			}
		}

		if (!user) {
			return json({ error: "Invalid credentials" }, 401);
		}

		const token = await createToken(user.id, user.tenant_id, user.role);
		return json({
			token,
			user: {
				id: user.id,
				username: user.username,
				role: user.role,
				tenantId: user.tenant_id,
			},
		});
	});
}
