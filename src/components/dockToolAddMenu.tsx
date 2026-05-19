import { ChevronRight, Plus } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { BottomPanelTab } from "../types/technicalShell";
import { PANEL_BAND_CHROME, WORKSPACE_PANE_MENU_HEADING, type PanelBand } from "../utils/panelDockLayout";

export const DOCK_ADD_TOOL_ITEMS: { tab: BottomPanelTab; label: string; detail?: string }[] = [
	{ tab: "terminal", label: "Terminal", detail: "Shell / host (when enabled)" },
	{ tab: "agent_chat", label: "Agent chat", detail: "Session chat in this editor pane" },
	{ tab: "agent_team", label: "Team pulse", detail: "Pi agent-team roster (from teams.yaml)" },
	{ tab: "tool_log", label: "Tool log", detail: "Traces: read, list_dir, grep, write, bash, team_*, mv, mkdir + Pi tools" },
	{
		tab: "agent_log",
		label: "Agent log",
		detail: "Merged timeline: session, chat, orchestrator + every tool trace (debug stalls, git, push)",
	},
	{ tab: "output", label: "Output", detail: "Session, workspace nav, index, diagnostics, chat errors" },
	{ tab: "problems", label: "Problems", detail: "ESLint or tsc — workspace static analysis" },
];

export type DockFileSubmenuEntry = { label: string; detail?: string; run: () => void };

export type DockFileActionItem = {
	label: string;
	detail?: string;
	run: () => void;
	/** Hover opens a side flyout (portaled) with these actions. */
	submenu?: DockFileSubmenuEntry[];
};

const MENU_MIN_WIDTH_PX = 240;
const SUBMENU_MIN_WIDTH_PX = 220;
const MENU_VIEWPORT_MARGIN = 6;
const SUBMENU_CLOSE_MS = 220;

type DockAddMenuAnchor = { top: number; left: number; minWidth: number; maxHeight: number };

function measureDockAddMenuAnchor(button: HTMLElement): DockAddMenuAnchor {
	const r = button.getBoundingClientRect();
	const gap = 2;
	let left = r.left;
	const top = r.bottom + gap;
	if (left + MENU_MIN_WIDTH_PX > window.innerWidth - MENU_VIEWPORT_MARGIN) {
		left = Math.max(MENU_VIEWPORT_MARGIN, window.innerWidth - MENU_MIN_WIDTH_PX - MENU_VIEWPORT_MARGIN);
	}
	const maxFromViewport = window.innerHeight - top - MENU_VIEWPORT_MARGIN;
	const maxHeight = Math.min(window.innerHeight * 0.7, 520, Math.max(120, maxFromViewport));
	return { top, left, minWidth: MENU_MIN_WIDTH_PX, maxHeight };
}

type SubmenuFlyout = {
	entries: DockFileSubmenuEntry[];
	pos: { top: number; left: number; maxHeight: number };
	parentLabel: string;
};

function measureSubmenuFlyout(trigger: HTMLElement): SubmenuFlyout["pos"] {
	const r = trigger.getBoundingClientRect();
	let left = r.right + 2;
	if (left + SUBMENU_MIN_WIDTH_PX > window.innerWidth - MENU_VIEWPORT_MARGIN) {
		left = Math.max(MENU_VIEWPORT_MARGIN, r.left - SUBMENU_MIN_WIDTH_PX - 2);
	}
	const maxFromViewport = window.innerHeight - r.top - MENU_VIEWPORT_MARGIN;
	const maxHeight = Math.min(480, Math.max(120, maxFromViewport));
	return { top: r.top, left, maxHeight };
}

function bandMenuHeading(b: PanelBand): string {
	return PANEL_BAND_CHROME[b].bandLabel;
}

function resolveMenuHeading(band: PanelBand | undefined, menuHeading: string | undefined): string {
	if (menuHeading) return menuHeading;
	if (band != null) return bandMenuHeading(band);
	return WORKSPACE_PANE_MENU_HEADING;
}

/** + menu: file actions and tool panels (single workspace stack or legacy band). */
export function DockZoneAddMenu({
	band,
	menuHeading,
	onAddTool,
	fileActions,
	rootClassName,
}: {
	/** Legacy horizontal band; omit when using {@link menuHeading} for the main workspace pane. */
	band?: PanelBand;
	/** e.g. {@link WORKSPACE_PANE_MENU_HEADING} for the unified stack. */
	menuHeading?: string;
	onAddTool: (tab: BottomPanelTab) => void;
	fileActions: DockFileActionItem[];
	/** Override wrapper (e.g. unified dock tab row alignment). */
	rootClassName?: string;
}) {
	const heading = resolveMenuHeading(band, menuHeading);
	const [open, setOpen] = useState(false);
	const [anchor, setAnchor] = useState<DockAddMenuAnchor | null>(null);
	const [submenuFlyout, setSubmenuFlyout] = useState<SubmenuFlyout | null>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const menuRef = useRef<HTMLUListElement>(null);
	const submenuPanelRef = useRef<HTMLUListElement>(null);
	const submenuTriggerRef = useRef<HTMLLIElement | null>(null);
	const submenuCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearSubmenuCloseTimer = useCallback(() => {
		if (submenuCloseTimerRef.current != null) {
			clearTimeout(submenuCloseTimerRef.current);
			submenuCloseTimerRef.current = null;
		}
	}, []);

	const scheduleSubmenuClose = useCallback(() => {
		clearSubmenuCloseTimer();
		submenuCloseTimerRef.current = setTimeout(() => {
			submenuCloseTimerRef.current = null;
			setSubmenuFlyout(null);
			submenuTriggerRef.current = null;
		}, SUBMENU_CLOSE_MS);
	}, [clearSubmenuCloseTimer]);

	const updateAnchor = useCallback(() => {
		const el = buttonRef.current;
		if (!el) return;
		setAnchor(measureDockAddMenuAnchor(el));
	}, []);

	useLayoutEffect(() => {
		if (!open) {
			setAnchor(null);
			return;
		}
		updateAnchor();
		const onReposition = () => updateAnchor();
		window.addEventListener("resize", onReposition);
		window.addEventListener("scroll", onReposition, true);
		return () => {
			window.removeEventListener("resize", onReposition);
			window.removeEventListener("scroll", onReposition, true);
		};
	}, [open, updateAnchor]);

	useLayoutEffect(() => {
		if (!open || !submenuFlyout) return;
		const sync = () => {
			const el = submenuTriggerRef.current;
			if (!el) return;
			setSubmenuFlyout((prev) => (prev ? { ...prev, pos: measureSubmenuFlyout(el) } : null));
		};
		window.addEventListener("resize", sync);
		window.addEventListener("scroll", sync, true);
		return () => {
			window.removeEventListener("resize", sync);
			window.removeEventListener("scroll", sync, true);
		};
	}, [open, submenuFlyout]);

	useEffect(() => {
		if (!open) {
			clearSubmenuCloseTimer();
			setSubmenuFlyout(null);
			submenuTriggerRef.current = null;
		}
	}, [open, clearSubmenuCloseTimer]);

	useEffect(() => {
		if (!open) return;
		const close = (e: MouseEvent) => {
			const t = e.target as Node;
			if (buttonRef.current?.contains(t)) return;
			if (menuRef.current?.contains(t)) return;
			if (submenuPanelRef.current?.contains(t)) return;
			setOpen(false);
		};
		document.addEventListener("mousedown", close);
		return () => document.removeEventListener("mousedown", close);
	}, [open]);

	const run = (fn: () => void) => {
		clearSubmenuCloseTimer();
		setSubmenuFlyout(null);
		submenuTriggerRef.current = null;
		fn();
		setOpen(false);
	};

	const openSubmenuFromRow = (entries: DockFileSubmenuEntry[], row: HTMLLIElement, parentLabel: string) => {
		clearSubmenuCloseTimer();
		submenuTriggerRef.current = row;
		setSubmenuFlyout({ entries, pos: measureSubmenuFlyout(row), parentLabel });
	};

	const dismissSubmenu = () => {
		clearSubmenuCloseTimer();
		setSubmenuFlyout(null);
		submenuTriggerRef.current = null;
	};

	const menu =
		open && anchor ? (
			<ul
				ref={menuRef}
				role="menu"
				style={{
					position: "fixed",
					top: anchor.top,
					left: anchor.left,
					minWidth: anchor.minWidth,
					maxHeight: anchor.maxHeight,
				}}
				className="z-[10000] list-none overflow-y-auto rounded border border-[#454545] bg-[#252526] py-1 shadow-xl"
			>
				<li className="px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#858585]">
					{heading}
				</li>
				{fileActions.length > 0 ? (
					<>
						<li className="px-3 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#6b6b6b]">
							Files
						</li>
						{fileActions.map((a) =>
							a.submenu && a.submenu.length > 0 ? (
								<li
									key={a.label}
									role="none"
									className="relative"
									onMouseEnter={(e) => openSubmenuFromRow(a.submenu!, e.currentTarget, a.label)}
									onMouseLeave={scheduleSubmenuClose}
								>
									<div className="flex w-full min-w-0 items-stretch">
										<button
											type="button"
											role="menuitem"
											aria-haspopup="menu"
											aria-expanded={submenuFlyout?.parentLabel === a.label}
											className="flex min-w-0 flex-1 flex-col items-start gap-0.5 px-3 py-2 text-left text-[13px] text-[#cccccc] hover:bg-[#2a2d2e]"
											onClick={() => run(a.run)}
										>
											<span className="flex min-w-0 items-center gap-1">
												<span className="truncate">{a.label}</span>
											</span>
											{a.detail ? (
												<span className="font-mono text-[11px] text-[#858585]">{a.detail}</span>
											) : null}
										</button>
										<span
											className="flex w-7 shrink-0 items-center justify-center border-l border-transparent text-[#858585]"
											aria-hidden
										>
											<ChevronRight size={14} strokeWidth={2} />
										</span>
									</div>
								</li>
							) : (
								<li
									key={a.label}
									role="none"
									onMouseEnter={dismissSubmenu}
								>
									<button
										type="button"
										role="menuitem"
										className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-[13px] text-[#cccccc] hover:bg-[#2a2d2e]"
										onClick={() => run(a.run)}
									>
										<span>{a.label}</span>
										{a.detail ? (
											<span className="font-mono text-[11px] text-[#858585]">{a.detail}</span>
										) : null}
									</button>
								</li>
							),
						)}
						<li className="my-1 border-t border-[#3c3c3c]" role="separator" />
					</>
				) : null}
				<li className="px-3 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#6b6b6b]">
					Views
				</li>
				{DOCK_ADD_TOOL_ITEMS.map(({ tab, label, detail }) => (
					<li key={tab} role="none">
						<button
							type="button"
							role="menuitem"
							className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-[13px] text-[#cccccc] hover:bg-[#2a2d2e]"
							onClick={() => run(() => onAddTool(tab))}
						>
							<span>{label}</span>
							{detail ? <span className="font-mono text-[11px] text-[#858585]">{detail}</span> : null}
						</button>
					</li>
				))}
			</ul>
		) : null;

	const submenuFlyoutEl =
		open && submenuFlyout ? (
			<ul
				ref={submenuPanelRef}
				role="menu"
				aria-label="New file type"
				style={{
					position: "fixed",
					top: submenuFlyout.pos.top,
					left: submenuFlyout.pos.left,
					minWidth: SUBMENU_MIN_WIDTH_PX,
					maxHeight: submenuFlyout.pos.maxHeight,
				}}
				className="z-[10001] list-none overflow-y-auto rounded border border-[#454545] bg-[#252526] py-1 shadow-xl"
				onMouseEnter={clearSubmenuCloseTimer}
				onMouseLeave={scheduleSubmenuClose}
			>
				<li className="px-3 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#6b6b6b]">
					New file as…
				</li>
				{submenuFlyout.entries.map((e) => (
					<li key={e.label} role="none">
						<button
							type="button"
							role="menuitem"
							className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-[13px] text-[#cccccc] hover:bg-[#2a2d2e]"
							onClick={() => run(e.run)}
						>
							<span>{e.label}</span>
							{e.detail ? <span className="font-mono text-[11px] text-[#858585]">{e.detail}</span> : null}
						</button>
					</li>
				))}
			</ul>
		) : null;

	return (
		<div className={rootClassName ?? "relative ml-1 shrink-0"}>
			<button
				ref={buttonRef}
				type="button"
				title={`Add file or view — ${heading} (terminal, new file, …)`}
				aria-label={`Add tab — ${heading}`}
				aria-expanded={open}
				onClick={() => setOpen((v) => !v)}
				className="flex h-8 w-8 items-center justify-center rounded border border-transparent text-[#858585] hover:border-[#3c3c3c] hover:bg-[#3c3c3c] hover:text-[#cccccc]"
			>
				<Plus size={16} strokeWidth={2} />
			</button>
			{menu ? createPortal(menu, document.body) : null}
			{submenuFlyoutEl ? createPortal(submenuFlyoutEl, document.body) : null}
		</div>
	);
}
