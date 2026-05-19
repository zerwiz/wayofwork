/** Pure helpers for Plan mode file naming and templates (see docs/WOP_BUILD_PLAN_MODE.md). */

export function sanitizePlanSlug(raw: string): string {
	const t = raw
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return (t || "plan").slice(0, 48);
}

export function planRelativePathForDate(d: Date, slug: string): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	const safe = sanitizePlanSlug(slug);
	return `plans/PLAN-${y}${m}${day}-${safe}.md`;
}

/** Example path for placeholders (fixed slug). */
export function examplePlanPathForToday(): string {
	return planRelativePathForDate(new Date(), "feature");
}

export function defaultPlanMarkdown(title: string): string {
	const t = title.trim() || "Plan";
	return `# ${t}

## Goal
- 

## Assumptions & constraints
- 

## Current state
- 

## Files to touch
| Path | Action | Notes |
|------|--------|-------|
|  |  |  |

## Implementation steps
1. 

## Risks & mitigations
- 

## Verification
- 

## Handoff
- 

`;
}
