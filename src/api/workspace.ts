import type { WorkspaceFolderInfo } from "../types/tree";

export async function postWorkspaceOp(body: Record<string, unknown>): Promise<{
	ok?: boolean;
	error?: string;
	folders?: WorkspaceFolderInfo[];
	root?: string;
	selectPath?: string;
}> {
	const res = await fetch("/api/workspace", {
		method: "POST",
		headers: { "Content-Type": "application/json", Accept: "application/json" },
		body: JSON.stringify(body),
	});
	let data: {
		ok?: boolean;
		error?: string;
		folders?: WorkspaceFolderInfo[];
		root?: string;
		selectPath?: string;
	} = {};
	try {
		data = (await res.json()) as typeof data;
	} catch {
		/* ignore */
	}
	if (!res.ok) {
		return { error: data.error || `HTTP ${res.status}` };
	}
	return data;
}
