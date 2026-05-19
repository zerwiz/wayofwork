export type UiViewCatalogKind = "simpleTab" | "openFile" | "technicalActivity";

export interface UiViewCatalogEntry {
	id: string;
	label: string;
	kind: UiViewCatalogKind;
	/** `simpleTab` → Simple nav id; `openFile` → workspace-relative path; `technicalActivity` → activity id */
	target: string;
	hint?: string;
}

export interface UiViewsCatalogResponse {
	version: number;
	entries: UiViewCatalogEntry[];
	/** Where the list came from */
	source: "workspace" | "default";
	/** Path relative to workspace root; edit this file to customize */
	catalogRelPath: string;
	/** Human-readable doc for the schema */
	schemaDocRelPath: string;
	parseError?: string;
}
