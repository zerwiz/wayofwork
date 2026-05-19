import { apiPutJson } from "../api/client";
import { defaultPlanMarkdown, planRelativePathForDate, sanitizePlanSlug } from "./planModeArtifacts";

/**
 * Creates \`plans/PLAN-YYYYMMDD-<slug>.md\` with a structured template (PUT /api/file).
 */
export async function createPlanArtifactInWorkspace(input: {
	slugSuggestion: string;
	title: string;
}): Promise<{ path: string }> {
	const slug = sanitizePlanSlug(input.slugSuggestion);
	const path = planRelativePathForDate(new Date(), slug);
	const content = defaultPlanMarkdown(input.title.trim() || slug.replace(/-/g, " "));
	await apiPutJson<{ ok: boolean; path: string }>("/api/file", { path, content });
	return { path };
}
