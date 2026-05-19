import type { ReactNode } from "react";

/**
 * Shared title row for Technical UI dock regions (unified horizontal docks, primary sidebar).
 */
export function dockRegionTitleBarRowClass(): string {
	return "flex h-6 shrink-0 items-center gap-1.5 border-b border-[#3c3c3c] bg-[#252526] px-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#858585]";
}

export function DockRegionTitleBar({
	grip,
	label,
	trailing,
	title: titleAttr,
	className,
}: {
	/** e.g. GripHorizontal (draggable) or GripVertical (affordance only) */
	grip?: ReactNode;
	/** Omit or leave empty to show only grip + trailing (e.g. primary sidebar). */
	label?: string;
	trailing?: ReactNode;
	title?: string;
	className?: string;
}) {
	const showLabel = Boolean(label?.trim());
	return (
		<div
			className={`${dockRegionTitleBarRowClass()}${className ? ` ${className}` : ""}`}
			title={titleAttr}
		>
			{grip ? <span className="inline-flex shrink-0 items-center text-[#555]">{grip}</span> : null}
			{showLabel ? <span className="min-w-0 select-none truncate">{label}</span> : null}
			{trailing ? (
				<span className="ml-auto flex min-w-0 max-w-[min(100%,14rem)] shrink-0 items-center justify-end gap-2 font-normal normal-case">
					{trailing}
				</span>
			) : null}
		</div>
	);
}
