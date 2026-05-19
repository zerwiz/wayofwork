import DOMPurify from "dompurify";
import { marked } from "marked";
import { useEffect, useMemo, useRef } from "react";

marked.setOptions({ gfm: true, breaks: true });

function escapeHtmlText(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

marked.use({
	renderer: {
		code(token) {
			const lang = (token.lang ?? "").trim().split(/\s/)[0]?.toLowerCase() ?? "";
			if (lang === "mermaid") {
				return `<div class="mermaid">${escapeHtmlText(token.text)}</div>`;
			}
			return false;
		},
	},
});

const previewClassDark =
	"markdown-preview min-h-0 flex-1 overflow-auto p-4 text-[14px] leading-relaxed text-[#d4d4d4] " +
	"[&_a]:text-[#fb923c] [&_a]:underline [&_code]:rounded [&_code]:bg-[#2d2d2d] [&_code]:px-1 [&_code]:text-[#fed7aa] " +
	"[&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-[#252526] [&_pre]:p-3 [&_pre]:text-[13px] " +
	"[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit " +
	"[&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-[#e5e5e5] " +
	"[&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[#e5e5e5] " +
	"[&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-[#e5e5e5] " +
	"[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 " +
	"[&_blockquote]:border-l-2 [&_blockquote]:border-[#555] [&_blockquote]:pl-3 [&_blockquote]:text-[#a3a3a3] " +
	"[&_.mermaid]:mx-auto [&_.mermaid]:max-w-full [&_.mermaid]:rounded [&_.mermaid]:border [&_.mermaid]:border-[#3c3c3c] [&_.mermaid]:bg-[#252526] [&_.mermaid]:p-3";

const previewClassLight =
	"markdown-preview min-h-0 flex-1 overflow-auto p-4 text-[14px] leading-relaxed text-[#333333] " +
	"[&_a]:text-[#c2410c] [&_a]:underline [&_code]:rounded [&_code]:bg-[#f3f4f6] [&_code]:px-1 [&_code]:text-[#9a3412] " +
	"[&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:border [&_pre]:border-[#e5e7eb] [&_pre]:bg-[#f9fafb] [&_pre]:p-3 [&_pre]:text-[13px] " +
	"[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit " +
	"[&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-[#111827] " +
	"[&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[#111827] " +
	"[&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-[#111827] " +
	"[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 " +
	"[&_blockquote]:border-l-2 [&_blockquote]:border-[#d1d5db] [&_blockquote]:pl-3 [&_blockquote]:text-[#4b5563] " +
	"[&_.mermaid]:mx-auto [&_.mermaid]:max-w-full [&_.mermaid]:rounded [&_.mermaid]:border [&_.mermaid]:border-[#e5e7eb] [&_.mermaid]:bg-white [&_.mermaid]:p-3";

/**
 * Rendered Markdown for editor preview mode (sanitized). Fenced code blocks tagged `mermaid` become live diagrams
 * via mermaid.js (same engine as standalone `.mmd` / `.mermaid` files in {@link MermaidPreviewPane}).
 */
export function MarkdownPreviewPane({
	markdown,
	appearanceDark,
	className,
}: {
	markdown: string;
	appearanceDark: boolean;
	className?: string;
}) {
	const containerRef = useRef<HTMLDivElement>(null);

	const html = useMemo(() => {
		const raw = marked.parse(markdown || "", { async: false }) as string;
		return DOMPurify.sanitize(raw, {
			ADD_TAGS: ["div"],
			ADD_ATTR: ["class"],
		});
	}, [markdown]);

	useEffect(() => {
		let cancelled = false;
		const el = containerRef.current;
		if (!el) return undefined;

		void (async () => {
			try {
				const mermaid = (await import("mermaid")).default;
				mermaid.initialize({
					startOnLoad: false,
					theme: appearanceDark ? "dark" : "neutral",
					securityLevel: "strict",
				});
				if (cancelled) return;
				await mermaid.run({ nodes: el.querySelectorAll<HTMLElement>(".mermaid") });
			} catch {
				/* invalid diagram or load failure — leave fenced fallback text if any */
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [html, appearanceDark]);

	const previewClass = appearanceDark ? previewClassDark : previewClassLight;

	return (
		<div
			ref={containerRef}
			className={className ? `${previewClass} ${className}` : previewClass}
			// eslint-disable-next-line react/no-danger -- sanitized with DOMPurify
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}
