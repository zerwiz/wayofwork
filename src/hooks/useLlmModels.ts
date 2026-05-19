import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../api/client";

export interface LlmCatalogModel {
	name: string;
	size?: number;
	modified_at?: string;
}

export interface LlmModelsResponse {
	provider: string;
	ollamaHost: string;
	envDefaultOllama: string;
	envDefaultOpenrouter: string;
	models: LlmCatalogModel[];
	error?: string;
	catalogNote?: string;
	/** True when `WOP_LLM_PROVIDER` is not `ollama` or `openrouter` (web chat unsupported). */
	unsupportedProvider?: boolean;
}

export function useLlmModels() {
	const [data, setData] = useState<LlmModelsResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const reload = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await apiGet<LlmModelsResponse>("/api/llm/models");
			setData(res);
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
			setData(null);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void reload();
	}, [reload]);

	return { data, loading, error, reload };
}
