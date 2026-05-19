/** Path segments for editor breadcrumb UI (workspace-relative POSIX paths). */
export function workspacePathBreadcrumbSegments(path: string): string[] {
	return path.split("/").filter(Boolean);
}

/** First markdown ATX heading line (trimmed), or null. */
export function firstMarkdownHeadingLine(content: string): string | null {
	for (const line of content.split(/\r?\n/)) {
		const t = line.trim();
		const m = /^(#{1,6})\s+(.+)$/.exec(t);
		if (m) return m[2]!.trim();
	}
	return null;
}
