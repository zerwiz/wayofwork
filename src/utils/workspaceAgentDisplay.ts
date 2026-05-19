/**
 * Human-readable labels for workspace agent roster ids (`name` in `.md` frontmatter).
 * Canonical dispatch id stays lowercase (e.g. `ralph`); UI uses these strings.
 */

/** Title-case a roster id the same way Pi **agent-team** does (hyphen → word boundaries). */
export function titleCaseAgentRosterId(name: string): string {
	const trimmed = name.trim();
	if (!trimmed) return name;
	return trimmed
		.split("-")
		.map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
		.join(" ");
}

/** Ids where title-casing alone is not the desired product label. */
const DISPLAY_NAME_OVERRIDES: Record<string, string> = {
	claw: "Claw",
	ralph: "Ralph Wiggum",
};

/** Picker, pulse grid, status bar — value / API still use the roster `name`. */
export function workspaceAgentDisplayName(rosterName: string): string {
	const k = rosterName.trim().toLowerCase();
	if (!k) return rosterName;
	return DISPLAY_NAME_OVERRIDES[k] ?? titleCaseAgentRosterId(rosterName);
}
