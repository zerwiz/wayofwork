import { AlertCircle, Bot, Braces, FileCode2, MessageSquare, ScrollText, TerminalSquare, Users, X } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { LogRow } from "../hooks/useWayOfPiSession";
import type { BottomPanelTab } from "../types/technicalShell";
import {
	PANEL_BAND_CHROME,
	PANEL_TAB_DND_TYPE,
	parsePanelTabJson,
	serializePanelTab,
	type PanelBand,
	type PanelTab,
	type ToolTabId,
} from "../utils/panelDockLayout";
import { dataTransferHasType } from "../utils/dataTransferTypes";
import { wopUnifiedDockRegionChipTextClass, wopUnifiedDockRegionChipWrapperClass } from "../utils/dockChrome";
import { DockZoneAddMenu, type DockFileActionItem } from "./dockToolAddMenu";
import { StripFilePreview } from "./StripFilePreview";
import { ToolPanelBody } from "./ToolPanelBody";

const TAB_LABELS: Record<ToolTabId, string> = {
	problems: "Problems",
	output: "Output",
	tool_log: "Tool Log",
	agent_log: "Agent Log",
	terminal: "Terminal",
	agent_team: "Team pulse",
	agent_chat: "Agent chat",
};

function entryLabel(e: PanelTab): string {
	if (e.type === "tool") return TAB_LABELS[e.id];
	const parts = e.path.split("/");
	return parts[parts.length - 1] || e.path;
}

function entryKey(e: PanelTab): string {
	return e.type === "tool" ? `tool:${e.id}` : `file:${e.path}`;
}

function PanelTabIcon({ entry, active }: { entry: PanelTab; active: boolean }) {
	const iconClass = `shrink-0 ${active ? "text-[#cccccc]" : "text-[#858585]"}`;
	if (entry.type === "file") {
		return <FileCode2 size={14} className="shrink-0 text-[#519aba]" aria-hidden />;
	}
	switch (entry.id) {
		case "problems":
			return <AlertCircle size={14} className={iconClass} aria-hidden />;
		case "output":
			return <Braces size={14} className={iconClass} aria-hidden />;
		case "tool_log":
			return <ScrollText size={14} className={iconClass} aria-hidden />;
		case "agent_log":
			return <Bot size={14} className={iconClass} aria-hidden />;
		case "terminal":
			return <TerminalSquare size={14} className={iconClass} aria-hidden />;
		case "agent_team":
			return <Users size={14} className={iconClass} aria-hidden />;
		case "agent_chat":
			return <MessageSquare size={14} className={iconClass} aria-hidden />;
	}
}

/**
 * One horizontal **panel dock** band (Zed-style docked panel strip): fixed height shell + tab row + body.
 * Replaces the old `UnifiedHorizontalDock` + `DockableToolStrip` split.
 */
export function PanelDockBand({
	band,
	bandHeightPx,
	heightPx,
	fillVertical,
	className,
	entries,
	activeIndex,
	onActiveIndexChange,
	onSelectFilePath,
	onMoveEntry,
	onCloseEntry,
	onReorderInZone,
	logs,
	dropLabel,
	onAddTool,
	fileActions,
	allowEmpty,
	unifiedBandChrome,
}: {
	band: PanelBand;
	/** Outer band height (required for top/bottom stacks in `App`). */
	bandHeightPx: number;
	heightPx?: number;
	fillVertical?: boolean;
	className?: string;
	entries: PanelTab[];
	activeIndex: number;
	onActiveIndexChange: (index: number) => void;
	onSelectFilePath?: (path: string) => void;
	onMoveEntry: (moving: PanelTab, before: PanelTab | null) => void;
	onCloseEntry: (entry: PanelTab) => void;
	onReorderInZone: (moving: PanelTab, before: PanelTab | null) => void;
	logs: LogRow[];
	dropLabel: string;
	onAddTool: (tab: BottomPanelTab) => void;
	fileActions: DockFileActionItem[];
	allowEmpty?: boolean;
	unifiedBandChrome?: { grip?: ReactNode; label: string; bandTitle?: string };
}) {
	const chrome = PANEL_BAND_CHROME[band];
	const label = unifiedBandChrome?.label ?? chrome.bandLabel;
	const bandTitle = unifiedBandChrome?.bandTitle ?? chrome.bandTitle;
	const effectiveDrop = dropLabel || chrome.dropLabel;

	const onDragStart = (e: React.DragEvent, entry: PanelTab) => {
		e.dataTransfer.setData(PANEL_TAB_DND_TYPE, serializePanelTab(entry));
		e.dataTransfer.effectAllowed = "move";
	};

	const allowDrop = (e: React.DragEvent) => {
		if (dataTransferHasType(e.dataTransfer, PANEL_TAB_DND_TYPE)) {
			e.preventDefault();
			e.dataTransfer.dropEffect = "move";
		}
	};

	const onBarDrop = (e: React.DragEvent, before: PanelTab | null) => {
		e.preventDefault();
		const raw = e.dataTransfer.getData(PANEL_TAB_DND_TYPE);
		const moving = parsePanelTabJson(raw);
		if (!moving) return;
		if (before && entryKey(moving) === entryKey(before)) return;
		const inThisStrip = entries.some((x) => entryKey(x) === entryKey(moving));
		if (inThisStrip) {
			onReorderInZone(moving, before);
		} else {
			onMoveEntry(moving, before);
		}
	};

	const safeIndex =
		entries.length === 0 ? 0 : Math.min(Math.max(0, activeIndex), entries.length - 1);
	const activeEntry = entries.length > 0 ? entries[safeIndex] : null;

	const showBody = activeEntry;
	if (!showBody && !allowEmpty) return null;

	const edgeBorder = band === "bottom" ? "border-t" : "border-b";
	const fillRowDock = (band === "top" || band === "bottom") && heightPx == null && !fillVertical;
	const innerClass =
		`flex flex-col border-[#3c3c3c] bg-[#1e1e1e] ${edgeBorder} ${
			fillVertical ? "min-h-0 flex-1" : fillRowDock ? "h-full min-h-0 flex-1" : "shrink-0"
		} ${className ?? ""}`.trim();

	const innerStyle: CSSProperties = !fillVertical && heightPx != null ? { height: heightPx } : {};

	const addMenuRootClass = unifiedBandChrome
		? "relative ml-0 flex h-9 shrink-0 items-center border-r border-[#2d2d2d] px-1"
		: undefined;

	return (
		<div
			data-wop-workspace-dock={band}
			className="flex shrink-0 flex-col overflow-hidden bg-[#1e1e1e]"
			style={{ height: bandHeightPx, minHeight: 120 }}
		>
			<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
				<div className={innerClass} style={innerStyle}>
					<div
						className="flex h-9 shrink-0 items-center gap-0 border-b border-[#2d2d2d] bg-[#252526]"
						onDragOver={allowDrop}
						onDrop={(e) => onBarDrop(e, null)}
						title={effectiveDrop}
					>
						<div className={wopUnifiedDockRegionChipWrapperClass()} title={bandTitle}>
							{unifiedBandChrome?.grip ? (
								<span className="inline-flex shrink-0 items-center text-[#555]">{unifiedBandChrome.grip}</span>
							) : null}
							<span className={wopUnifiedDockRegionChipTextClass()}>{label}</span>
						</div>
						<div className="scrollbar-hide flex min-h-0 min-w-0 flex-1 items-center overflow-x-auto">
							<DockZoneAddMenu
								band={band}
								onAddTool={onAddTool}
								fileActions={fileActions}
								rootClassName={
									addMenuRootClass ?? "relative ml-0 flex h-9 shrink-0 items-center border-r border-[#2d2d2d] px-1"
								}
							/>
							{entries.map((entry, idx) => {
								const active = safeIndex === idx;
								return (
									<div
										key={entryKey(entry)}
										className={`group flex h-9 min-w-[120px] max-w-[240px] shrink-0 items-center border-r border-t border-r-[#2d2d2d] ${
											active
												? "border-[#ea580c] bg-[#1e1e1e]"
												: "cursor-pointer border-t-transparent border-b border-b-[#252526] bg-[#2d2d2d] text-[#858585]"
										}`}
										onDragOver={allowDrop}
									>
										<button
											type="button"
											draggable
											onDragStart={(e) => onDragStart(e, entry)}
											onDragOver={allowDrop}
											onDrop={(e) => onBarDrop(e, entry)}
											onClick={() => {
												onActiveIndexChange(idx);
												if (entry.type === "file") onSelectFilePath?.(entry.path);
											}}
											className={`flex min-w-0 flex-1 cursor-grab items-center gap-2 px-3 text-left active:cursor-grabbing ${
												active ? "text-white" : "text-[#cccccc]"
											}`}
											title={`${entryLabel(entry)} — drag to reorder`}
										>
											<PanelTabIcon entry={entry} active={active} />
											<span className="min-w-0 flex-1 truncate text-[13px]">{entryLabel(entry)}</span>
										</button>
										<button
											type="button"
											className="mr-1 shrink-0 rounded p-0.5 text-[#858585] opacity-0 hover:bg-[#3c3c3c] hover:text-[#cccccc] group-hover:opacity-100"
											title={entry.type === "tool" ? "Close panel" : "Close tab"}
											onClick={(e) => {
												e.stopPropagation();
												onCloseEntry(entry);
											}}
										>
											<X size={14} strokeWidth={2} />
										</button>
									</div>
								);
							})}
						</div>
					</div>
					{activeEntry?.type === "file" ? (
						<div className="flex h-6 shrink-0 items-center border-b border-[#2d2d2d] bg-[#1e1e1e] px-4 text-[12px] text-[#cccccc] shadow-sm">
							<span className="truncate" title={activeEntry.path}>
								{activeEntry.path}
							</span>
						</div>
					) : null}
					<div
						className={
							showBody
								? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
								: "flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 font-mono text-[11px] text-[#858585]"
						}
					>
						{showBody ? (
							showBody.type === "tool" ? (
								<ToolPanelBody tab={showBody.id} logs={logs} />
							) : (
								<StripFilePreview path={showBody.path} />
							)
						) : (
							<span className="text-center">Use + to add a file or panel to this dock.</span>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
