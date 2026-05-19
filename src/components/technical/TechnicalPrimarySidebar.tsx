import type { ReactNode } from "react";

/**
 * Technical shell: primary (left) sidebar frame — panel body only (toggle lives in the menu bar next to WAY OF PI).
 */
export function TechnicalPrimarySidebar({
	widthPx,
	minWidthPx = 200,
	maxWidthPx = 640,
	children,
}: {
	widthPx: number;
	minWidthPx?: number;
	maxWidthPx?: number;
	children: ReactNode;
}) {
	return (
		<div
			className="flex min-h-0 shrink-0 flex-col overflow-hidden border border-[#3c3c3c] bg-[#1e1e1e]"
			style={{
				width: widthPx,
				minWidth: minWidthPx,
				maxWidth: maxWidthPx,
			}}
		>
			<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
		</div>
	);
}
