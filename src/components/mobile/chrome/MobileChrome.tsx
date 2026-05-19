import type { ReactNode } from "react";
import { Monitor } from "lucide-react";

/**
 * Shared top chrome for `?shell=mobile` layouts: safe-area, title, escape to desktop shell.
 */
export function MobileChrome({
	title,
	subtitle,
	onDesktopLayout,
	children,
}: {
	title: string;
	subtitle?: string | null;
	onDesktopLayout: () => void;
	children?: ReactNode;
}) {
	return (
		<header
			className="flex shrink-0 flex-col border-b border-[#3c3c3c] bg-[#252526] text-[#cccccc]"
			style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
		>
			<div className="flex min-h-11 items-center justify-between gap-2 px-3 py-1.5">
				<div className="min-w-0 flex-1">
					<h1 className="truncate text-sm font-semibold tracking-tight">{title}</h1>
					{subtitle ? (
						<p className="truncate font-mono text-[10px] text-[#858585]" title={subtitle}>
							{subtitle}
						</p>
					) : null}
				</div>
				<button
					type="button"
					onClick={onDesktopLayout}
					className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md border border-[#3c3c3c] bg-[#2d2d2d] px-2.5 py-2 text-xs font-medium text-[#cccccc] hover:bg-[#383838] active:bg-[#404040]"
					title="Use full desktop layout for this mode"
				>
					<Monitor size={16} className="shrink-0 opacity-90" aria-hidden />
					<span className="hidden min-[380px]:inline">Desktop</span>
				</button>
			</div>
			{children}
		</header>
	);
}
