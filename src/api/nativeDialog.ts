/**
 * Ask the Way of Pi server to open a host-native file/folder dialog (zenity/kdialog,
 * macOS osascript, or Windows PowerShell). Paths are on the machine running the server.
 */
export type NativePickResponse =
	| { path: string }
	| { cancelled: true }
	| { error: string; fallback?: boolean };

export async function requestNativePick(kind: "file" | "folder"): Promise<NativePickResponse> {
	const res = await fetch("/api/native-dialog/pick", {
		method: "POST",
		headers: { "Content-Type": "application/json", Accept: "application/json" },
		body: JSON.stringify({ kind }),
	});
	let data: Record<string, unknown> = {};
	try {
		data = (await res.json()) as Record<string, unknown>;
	} catch {
		/* ignore */
	}
	if (res.status === 403) {
		return { error: String(data.error ?? "Forbidden"), fallback: true };
	}
	if (!res.ok) {
		return { error: String(data.error ?? `HTTP ${res.status}`), fallback: true };
	}
	if (data.cancelled === true) {
		return { cancelled: true };
	}
	if (typeof data.path === "string" && data.path.trim()) {
		return { path: data.path.trim() };
	}
	if (typeof data.error === "string") {
		return { error: data.error, fallback: data.fallback === true };
	}
	return { error: "Unexpected response", fallback: true };
}
