import { useEffect, useState } from "react";

/** Renders UTF-8 SVG markup via an object URL (avoids huge `data:` URLs and encoding edge cases). */
export function WorkspaceSvgPreview({ xml, imgClassName }: { xml: string; imgClassName: string }) {
	const [url, setUrl] = useState("");

	useEffect(() => {
		const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
		const u = URL.createObjectURL(blob);
		setUrl(u);
		return () => URL.revokeObjectURL(u);
	}, [xml]);

	if (!url) return null;

	return <img src={url} alt="" className={imgClassName} loading="lazy" decoding="async" />;
}
