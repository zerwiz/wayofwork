import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../api/client";

export type WebManifestSettingsExtensionsSlice = {
	root: string;
	settingsPath: string;
	entries: string[];
};

export type WebManifestShimSlice = {
	root: string;
	dir: string;
	files: string[];
};

export type WebManifestV1 = {
	version: 1;
	source: "filesystem_static";
	piDrivesRuntime: false;
	settingsExtensions: WebManifestSettingsExtensionsSlice[];
	shimFiles: WebManifestShimSlice[];
	tools: unknown[];
	slashCommands: unknown[];
	note: string;
};

export function useWebManifest() {
	const [manifest, setManifest] = useState<WebManifestV1 | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const reload = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const m = await apiGet<WebManifestV1>("/api/manifest");
			setManifest(m);
		} catch (e) {
			setManifest(null);
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void reload();
	}, [reload]);

	return { manifest, loading, error, reload };
}
