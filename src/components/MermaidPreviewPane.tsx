import { useEffect, useRef, useState } from "react";

const wrapDark =
	"flex min-h-0 min-w-0 flex-1 flex-col overflow-auto bg-[#1e1e1e] p-4 text-[#d4d4d4] " +
	"[&_.mermaid]:mx-auto [&_.mermaid]:max-w-full [&_.mermaid]:rounded [&_.mermaid]:border [&_.mermaid]:border-[#3c3c3c] [&_.mermaid]:bg-[#252526] [&_.mermaid]:p-3";

const wrapLight =
	"flex min-h-0 min-w-0 flex-1 flex-col overflow-auto bg-[#f3f3f3] p-4 text-[#333] " +
	"[&_.mermaid]:mx-auto [&_.mermaid]:max-w-full [&_.mermaid]:rounded [&_.mermaid]:border [&_.mermaid]:border-[#e5e7eb] [&_.mermaid]:bg-white [&_.mermaid]:p-3";

/**
 * Renders a **standalone** Mermaid diagram file (`.mmd` / `.mermaid`). Markdown ```mermaid``` blocks use
 * {@link MarkdownPreviewPane} instead.
 */
export function MermaidPreviewPane({
	source,
	appearanceDark,
}: {
	source: string;
	appearanceDark: boolean;
}) {
	const hostRef = useRef<HTMLDivElement>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const host = hostRef.current;
		if (!host) return undefined;

		setError(null);
		host.replaceChildren();
		const diagram = document.createElement("div");
		diagram.className = "mermaid";
		diagram.textContent = source;
		host.appendChild(diagram);

		let cancelled = false;

		void (async () => {
			try {
				const mermaid = (await import("mermaid")).default;
				mermaid.initialize({
					startOnLoad: false,
					theme: appearanceDark ? "dark" : "neutral",
					securityLevel: "strict",
				});
				if (cancelled) return;
				await mermaid.run({ nodes: [diagram] });
			} catch (e) {
				if (!cancelled) {
					setError(e instanceof Error ? e.message : String(e));
				}
			}
		})();

		return () => {
			cancelled = true;
			host.replaceChildren();
		};
	}, [source, appearanceDark]);

	return (
		<div className={appearanceDark ? wrapDark : wrapLight}>
			{error ? (
				<p className="mb-3 shrink-0 font-mono text-[12px] text-red-400" role="alert">
					Mermaid: {error}
				</p>
			) : null}
			<div ref={hostRef} className="flex min-h-0 min-w-0 flex-1 flex-col" />
		</div>
	);
}
