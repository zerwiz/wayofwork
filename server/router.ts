import type { json } from "./utils";

type Handler = (
	req: Request,
	params: Record<string, string>,
	auth: { userId: string; tenantId: string; role?: string } | null,
) => Response | Promise<Response>;

type Route = {
	method: string;
	pattern: RegExp;
	paramNames: string[];
	handler: Handler;
};

export class Router {
	private routes: Route[] = [];

	get(path: string, handler: Handler) {
		this.add("GET", path, handler);
	}

	post(path: string, handler: Handler) {
		this.add("POST", path, handler);
	}

	put(path: string, handler: Handler) {
		this.add("PUT", path, handler);
	}

	delete(path: string, handler: Handler) {
		this.add("DELETE", path, handler);
	}

	private add(method: string, path: string, handler: Handler) {
		const paramNames: string[] = [];
		const regexStr = path.replace(/:(\w+)/g, (_: string, name: string) => {
			paramNames.push(name);
			return "([^/]+)";
		});
		this.routes.push({
			method,
			pattern: new RegExp(`^${regexStr}$`),
			paramNames,
			handler,
		});
	}

	async handle(
		url: URL,
		req: Request,
		auth: { userId: string; tenantId: string; role?: string } | null,
	): Promise<Response | null> {
		const p =
			url.pathname.replace(/\/{2,}/g, "/").replace(/\/+$/, "") || "/";
		for (const route of this.routes) {
			if (req.method !== route.method) continue;
			const match = p.match(route.pattern);
			if (!match) continue;
			const params: Record<string, string> = {};
			route.paramNames.forEach((name, i) => {
				params[name] = match[i + 1];
			});
			return await route.handler(req, params, auth);
		}
		return null;
	}
}
