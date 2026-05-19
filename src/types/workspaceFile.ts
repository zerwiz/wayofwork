/** GET `/api/file` JSON. Omitted `encoding` means UTF-8 text (legacy shape). */
export type FileGetResponse =
	| { path: string; encoding?: "utf8"; content: string }
	| { path: string; encoding: "base64"; mimeType: string; content: string };

/** Visual preview for the workspace editor (raster from base64 transport, SVG as UTF-8 text). */
export type FilePreview =
	| { kind: "image"; src: string }
	| { kind: "svg"; xml: string }
	| { kind: "mermaid"; source: string }
	| { kind: "binary"; mimeType: string };
