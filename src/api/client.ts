function getAuthHeaders(): Record<string, string> {
	const token = localStorage.getItem("wop_token");
	return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet<T>(path: string, options?: { signal?: AbortSignal }): Promise<T> {
	const res = await fetch(path, {
		headers: { Accept: "application/json", ...getAuthHeaders() },
		signal: options?.signal,
	});
	if (!res.ok) {
		const t = await res.text();
		throw new Error(`${res.status}: ${t}`);
	}
	return res.json() as Promise<T>;
}

export async function apiPostJson<T>(path: string, body: unknown): Promise<T> {
	const res = await fetch(path, {
		method: "POST",
		headers: { "Content-Type": "application/json", Accept: "application/json", ...getAuthHeaders() },
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const t = await res.text();
		throw new Error(`${res.status}: ${t}`);
	}
	return res.json() as Promise<T>;
}

export async function apiPutJson<T>(path: string, body: unknown): Promise<T> {
	const res = await fetch(path, {
		method: "PUT",
		headers: { "Content-Type": "application/json", Accept: "application/json", ...getAuthHeaders() },
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const t = await res.text();
		throw new Error(`${res.status}: ${t}`);
	}
	return res.json() as Promise<T>;
}

export async function apiDeleteJson<T>(path: string): Promise<T> {
	const res = await fetch(path, {
		method: "DELETE",
		headers: { Accept: "application/json", ...getAuthHeaders() },
	});
	if (!res.ok) {
		const t = await res.text();
		throw new Error(`${res.status}: ${t}`);
	}
	return res.json() as Promise<T>;
}
