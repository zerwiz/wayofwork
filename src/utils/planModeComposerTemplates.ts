/** User message templates for Plan → Build handoff (composer inject). */

export function buildImplementPlanPrompt(planPath: string): string {
	return [
		`Implement the saved plan at \`${planPath}\`.`,
		"",
		"- Work section by section; prefer small commits or logical steps.",
		"- Call out blockers instead of guessing.",
		"- If the plan’s unchecked todos are stale, propose an update to the markdown file.",
	].join("\n");
}

export function buildReviewPlanPrompt(planPath: string): string {
	return [
		`Review the plan at \`${planPath}\`.`,
		"",
		"Critique: scope creep, ordering, missing risks or verification, unclear handoff to Build.",
		"Suggest concrete edits (bullet list); do not rewrite the entire plan unless it is unsalvageable.",
	].join("\n");
}
