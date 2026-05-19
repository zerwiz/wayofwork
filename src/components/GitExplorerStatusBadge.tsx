import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiPostJson } from "../api/client";
import { gitBadgeHelp } from "../utils/gitStatusUi";

type Variant = "technical" | "simple";

export function GitExplorerStatusBadge({
	gitStatus,
	relativePath,
	variant,
	appearanceDark = true,
	onExplorerGitMutated,
}: {
	gitStatus: string;
	/** Workspace-relative path (same as tree node `path`). */
	relativePath: string;
	variant: Variant;
	/** Simple UI: match light/dark file panel. Technical explorer is always dark. */
	appearanceDark?: boolean;
	/** After a successful `git add` or refresh — reload `/api/tree` so badges update. */
	onExplorerGitMutated?: () => void;
}) {
	const help = useMemo(() => gitBadgeHelp(gitStatus, relativePath), [gitStatus, relativePath]);
	const [open, setOpen] = useState(false);
	const [fixBusy, setFixBusy] = useState<null | "primary" | "stage_all">(null);
	const [fixHint, setFixHint] = useState<string | null>(null);
	const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const wrapRef = useRef<HTMLDivElement>(null);
	const [tipPos, setTipPos] = useState<{ top: number; left: number; width: number } | null>(null);

	const clearLeaveTimer = useCallback(() => {
		if (leaveTimer.current != null) {
			clearTimeout(leaveTimer.current);
			leaveTimer.current = null;
		}
	}, []);

	const updateTipPos = useCallback(() => {
		const el = wrapRef.current;
		if (!el) return;
		const r = el.getBoundingClientRect();
		const width = Math.min(280, Math.max(200, window.innerWidth - 16));
		let left = r.right - width;
		if (left < 8) left = 8;
		if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
		/* Slight overlap with the badge so the pointer can reach the tooltip without a dead zone. */
		setTipPos({ top: r.bottom - 4, left, width });
	}, []);

	const onEnterWrap = useCallback(() => {
		clearLeaveTimer();
		updateTipPos();
		setFixHint(null);
		setOpen(true);
	}, [clearLeaveTimer, updateTipPos]);

	const onLeaveWrap = useCallback(() => {
		clearLeaveTimer();
		leaveTimer.current = window.setTimeout(() => setOpen(false), 200) as unknown as ReturnType<typeof setTimeout>;
	}, [clearLeaveTimer]);

	const onEnterTip = useCallback(() => {
		clearLeaveTimer();
	}, [clearLeaveTimer]);

	const onLeaveTip = useCallback(() => {
		clearLeaveTimer();
		leaveTimer.current = window.setTimeout(() => setOpen(false), 200) as unknown as ReturnType<typeof setTimeout>;
	}, [clearLeaveTimer]);

	useEffect(() => () => clearLeaveTimer(), [clearLeaveTimer]);

	useEffect(() => {
		if (!open) {
			setTipPos(null);
			return;
		}
		updateTipPos();
		const onRe = () => updateTipPos();
		window.addEventListener("resize", onRe);
		window.addEventListener("scroll", onRe, true);
		return () => {
			window.removeEventListener("resize", onRe);
			window.removeEventListener("scroll", onRe, true);
		};
	}, [open, updateTipPos]);

	const applyFix = useCallback(
		async (mode: "primary" | "stage_all") => {
			if (fixBusy) return;
			let relPath: string;
			let stageEntireRepo: boolean;
			if (mode === "primary") {
				const fx = help.fix;
				if (!fx) return;
				if (fx.kind === "refresh_tree") {
					await Promise.resolve(onExplorerGitMutated?.());
					setOpen(false);
					return;
				}
				relPath = fx.workspaceRelPath;
				stageEntireRepo = false;
				setFixBusy("primary");
			} else {
				if (!help.fixStageAll) return;
				relPath = help.fixStageAll.workspaceRelPath;
				stageEntireRepo = true;
				setFixBusy("stage_all");
			}
			setFixHint(null);
			try {
				const r = await apiPostJson<{ ok?: boolean; error?: string }>("/api/git/stage", {
					path: relPath,
					...(stageEntireRepo ? { all: true as const } : {}),
				});
				if (!r.ok) {
					setFixHint(
						r.error?.trim() ||
							(stageEntireRepo ? "Could not stage all changes." : "Could not stage this path."),
					);
					return;
				}
				setFixHint(stageEntireRepo ? "All changes staged." : "Staged.");
				await Promise.resolve(onExplorerGitMutated?.());
				window.setTimeout(() => setOpen(false), 700);
			} catch (e) {
				setFixHint(e instanceof Error ? e.message : String(e));
			} finally {
				setFixBusy(null);
			}
		},
		[fixBusy, help.fix, help.fixStageAll, onExplorerGitMutated],
	);

	const badgeMuted =
		gitStatus === "*"
			? appearanceDark
				? "text-[#858585]"
				: "text-[#737373]"
			: appearanceDark
				? "text-[#e2c08d]"
				: "text-amber-700";

	const popover =
		appearanceDark
			? "border border-[#454545] bg-[#252526] text-[#cccccc] shadow-xl"
			: "border border-neutral-300 bg-white text-neutral-800 shadow-lg";

	const btnPrimary =
		"mt-2 w-full rounded bg-[#ea580c] px-2 py-1.5 text-left text-[11px] font-medium text-white hover:bg-[#c2410c] disabled:opacity-50";
	const btnStageAll = appearanceDark
		? "mt-1.5 w-full rounded border border-[#ea580c]/55 bg-transparent px-2 py-1.5 text-left text-[11px] font-medium text-[#fb923c] hover:bg-[#ea580c]/15 disabled:opacity-50"
		: "mt-1.5 w-full rounded border border-orange-400 bg-transparent px-2 py-1.5 text-left text-[11px] font-medium text-orange-800 hover:bg-orange-50 disabled:opacity-50";

	const labelCls = variant === "simple" ? "font-mono text-[10px] font-bold uppercase" : "font-mono text-[11px] font-bold";

	const fixLabelPrimary =
		help.fix && fixBusy === "primary"
			? help.fix.kind === "refresh_tree"
				? "Refreshing…"
				: "Staging…"
			: help.fix?.label;

	const fixLabelStageAll =
		fixBusy === "stage_all" ? "Staging all…" : help.fixStageAll?.label;

	const tip =
		open &&
		tipPos &&
		typeof document !== "undefined" &&
		createPortal(
			<div
				role="tooltip"
				className={`pointer-events-auto fixed z-[40000] rounded px-2.5 pb-2.5 pt-3 text-[11px] leading-snug ${popover}`}
				style={{ top: tipPos.top, left: tipPos.left, width: tipPos.width }}
				onMouseEnter={onEnterTip}
				onMouseLeave={onLeaveTip}
				onMouseDown={(e) => e.stopPropagation()}
			>
				<p className="m-0 font-semibold text-[12px]">{help.summary}</p>
				<p className="mt-1.5 m-0 opacity-95">{help.detail}</p>
				{help.fix ? (
					<>
						<button
							type="button"
							className={btnPrimary}
							disabled={fixBusy !== null}
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								void applyFix("primary");
							}}
						>
							{fixLabelPrimary}
						</button>
						{help.fixStageAll ? (
							<button
								type="button"
								className={btnStageAll}
								disabled={fixBusy !== null}
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									void applyFix("stage_all");
								}}
							>
								{fixLabelStageAll}
							</button>
						) : null}
						{fixHint ? (
							<p
								className={`mt-1.5 m-0 font-mono text-[10px] ${
									fixHint === "Staged." || fixHint === "All changes staged."
										? appearanceDark
											? "text-[#89d185]"
											: "text-green-700"
										: appearanceDark
											? "text-[#f14c4c]"
											: "text-red-600"
								}`}
							>
								{fixHint}
							</p>
						) : null}
					</>
				) : null}
			</div>,
			document.body,
		);

	return (
		<>
			<div
				ref={wrapRef}
				className={`relative shrink-0 ${variant === "technical" ? "ml-auto" : "ml-1"}`}
				onMouseEnter={onEnterWrap}
				onMouseLeave={onLeaveWrap}
			>
				<span
					className={`cursor-help ${labelCls} ${badgeMuted} ${variant === "simple" ? "rounded px-1.5 py-0.5" : ""}`}
					title={help.summary}
					aria-label={help.summary}
				>
					{gitStatus}
				</span>
			</div>
			{tip}
		</>
	);
}
