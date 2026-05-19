import type { FilePersistEncoding } from "../hooks/useFileEditor";
import type { FilePreview } from "../types/workspaceFile";

/** Files that offer **Preview** (rendered) vs **Source** (buffer / bytes) in the workspace editor. */
export function filePreviewSupportsSourceToggle(p: FilePreview | null): boolean {
	return p?.kind === "image" || p?.kind === "svg" || p?.kind === "mermaid";
}

/** Latin-1 string → base64 (same bytes as original file; used with GET `encoding: "base64"` payloads). */
function latin1ToBase64(s: string): string {
	const bytes = new Uint8Array(s.length);
	for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 255;
	let bin = "";
	for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
	return btoa(bin);
}

/**
 * When non-null, the editor should show a preview surface instead of the byte/text buffer.
 */
export function computeWorkspaceFilePreview(
	path: string | null,
	persistEncoding: FilePersistEncoding,
	mimeType: string | null,
	content: string,
): FilePreview | null {
	if (!path) return null;

	if (persistEncoding === "base64" && mimeType) {
		if (mimeType.startsWith("image/")) {
			return { kind: "image", src: `data:${mimeType};base64,${latin1ToBase64(content)}` };
		}
		if (mimeType === "application/octet-stream") {
			return { kind: "binary", mimeType };
		}
	}

	if (persistEncoding === "utf8" && /\.svg$/i.test(path)) {
		const t = content.trim();
		if (t.startsWith("<") || t.startsWith("\ufeff<")) {
			return { kind: "svg", xml: content };
		}
	}

	if (persistEncoding === "utf8" && /\.(mmd|mermaid)$/i.test(path) && content.trim().length > 0) {
		return { kind: "mermaid", source: content };
	}

	return null;
}
