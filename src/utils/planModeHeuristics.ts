/**
 * Client-side hints for Plan vs Build workflow (see `docs/WOP_BUILD_PLAN_MODE.md`).
 */

const PLAN_KEYWORD_RE =
	/\b(refactor|migration|architecture|roadmap|multi-?file|whole\s+(codebase|repo)|everywhere|implement\s+(the\s+)?(entire|full)|from\s+scratch|design\s+(first|doc)|before\s+(we\s+)?(code|implement))\b/i;

/** True when a Build-mode message looks like a long multi-step task worth doing in Plan first. */
export function shouldSuggestPlanModeForMessage(raw: string): boolean {
	const t = raw.trim();
	if (t.length < 120) return false;
	if (t.startsWith("/")) return false;
	if (PLAN_KEYWORD_RE.test(t)) return true;
	const newlines = (t.match(/\n/g) ?? []).length;
	if (t.length >= 480 && newlines >= 4) return true;
	if (t.length >= 900) return true;
	return false;
}
