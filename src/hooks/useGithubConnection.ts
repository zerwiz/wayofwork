import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPostJson } from "../api/client";

export type GithubConnectionStatus = {
	connected: boolean;
	login: string | null;
	error?: string;
};

export function useGithubConnection() {
	const [status, setStatus] = useState<GithubConnectionStatus | null>(null);
	const [loading, setLoading] = useState(true);

	const refresh = useCallback(async () => {
		setLoading(true);
		try {
			const s = await apiGet<GithubConnectionStatus>("/api/github/status");
			setStatus({ connected: s.connected, login: s.login });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			setStatus({ connected: false, login: null, error: message });
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const connect = useCallback(
		async (token: string) => {
			await apiPostJson<{ ok: true; login: string }>("/api/github/connect", { token });
			await refresh();
		},
		[refresh],
	);

	const disconnect = useCallback(async () => {
		await apiPostJson<{ ok: true }>("/api/github/disconnect", {});
		await refresh();
	}, [refresh]);

	return { status, loading, refresh, connect, disconnect };
}
