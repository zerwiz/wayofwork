/** Workspace-relative paths Pi uses for `/models`, session defaults, and catalog. */
export const PI_MODEL_CONFIG_ENTRIES = [
	{
		id: "catalog",
		label: "Provider catalog",
		path: "agent/models.json",
		hint: "Ollama / OpenRouter provider blocks and model list (Pi /models).",
	},
	{
		id: "workspace",
		label: "Workspace models",
		path: "pi.config.json",
		hint: "Flat model entries for this repo (id, provider, baseUrl, apiKey).",
	},
	{
		id: "session",
		label: "Session defaults",
		path: "agent/settings.json",
		hint: "defaultModel, defaultProvider, theme, packages…",
	},
] as const;

export type PiModelConfigPath = (typeof PI_MODEL_CONFIG_ENTRIES)[number]["path"];
