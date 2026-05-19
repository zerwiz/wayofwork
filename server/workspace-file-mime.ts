/** Image extensions served as base64 with a concrete MIME type (browser preview). */
const IMAGE_EXT: Record<string, string> = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	gif: "image/gif",
	webp: "image/webp",
	ico: "image/x-icon",
	bmp: "image/bmp",
};

export function imageMimeFromPath(rel: string): string | null {
	const ext = rel.split(".").pop()?.toLowerCase() ?? "";
	return IMAGE_EXT[ext] ?? null;
}
