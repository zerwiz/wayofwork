import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../api/client";

export function usePackageScripts() {
	const [scripts, setScripts] = useState<Record<string, string> | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const reload = useCallback(() => {
		setLoading(true);
		setError(null);
		apiGet<{ scripts: Record<string, string> | null }>("/api/package-scripts")
			.then((r) => setScripts(r.scripts))
			.catch((e) => setError(e instanceof Error ? e.message : String(e)))
			.finally(() => setLoading(false));
	}, []);

	useEffect(() => {
		reload();
	}, [reload]);

	return { scripts, loading, error, reload };
}
