import { ClipboardList, FilePlus, MessageSquareText } from "lucide-react";

/** Right-column (or stacked top) surface for Plan chat mode: orient the user, optional new plan file. */
export function SimplePlanWorkspacePane({
	appearanceDark,
	columnLayout = "besideChat",
	canCreatePlan,
	onNewPlanFile,
}: {
	appearanceDark: boolean;
	columnLayout?: "stacked" | "besideChat";
	canCreatePlan: boolean;
	onNewPlanFile: () => void;
}) {
	const shell = appearanceDark
		? "border-[#3c3c3c] bg-[#252526]"
		: "border-[#e5e5e5] bg-white shadow-sm";
	const header = appearanceDark ? "border-[#3c3c3c] bg-[#1e1e1e]/90" : "border-[#e5e5e5] bg-[#ececec]";
	const title = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";
	const body = appearanceDark ? "text-[#a3a3a3]" : "text-[#616161]";
	const accent = appearanceDark ? "text-[#fed7aa]" : "text-[#c2410c]";
	const btnPrimary =
		appearanceDark
			? "inline-flex items-center gap-2 rounded-lg bg-[#7c3aed] px-3 py-2 text-xs font-bold text-white hover:bg-[#6d28d9] disabled:opacity-40"
			: "inline-flex items-center gap-2 rounded-lg bg-[#7c3aed] px-3 py-2 text-xs font-bold text-white hover:bg-[#6d28d9] disabled:opacity-40";
	const outer =
		columnLayout === "besideChat"
			? `flex min-h-0 flex-1 flex-col overflow-hidden ${shell}`
			: `flex max-h-[min(38vh,320px)] min-h-[140px] shrink-0 flex-col overflow-hidden border-b ${shell}`;

	return (
		<div className={outer}>
			<div className={`flex shrink-0 items-center gap-3 border-b px-4 py-3 ${header}`}>
				<div
					className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
						appearanceDark ? "border-[#3c3c3c] bg-[#252526]" : "border-[#e5e5e5] bg-white"
					}`}
				>
					<ClipboardList size={20} className={accent} />
				</div>
				<div className="min-w-0 flex-1">
					<div className={`text-sm font-bold ${title}`}>Plan mode</div>
					<div className={`text-[11px] leading-snug ${body}`}>
						Describe goals and constraints in chat; capture a plan file only when you want a written artifact.
					</div>
				</div>
			</div>
			<div
				className={`flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-4 py-4 text-sm leading-relaxed ${
					appearanceDark ? "bg-[#1e1e1e]" : "bg-[#f3f3f3]"
				}`}
			>
				<div className={`flex gap-2 ${body}`}>
					<MessageSquareText size={18} className={`mt-0.5 shrink-0 ${accent}`} />
					<p>
						Start in the chat with what you are planning (scope, risks, milestones). The assistant uses the{" "}
						<span className={`font-semibold ${title}`}>plan</span> session style for structured thinking—not a
						specific document on disk.
					</p>
				</div>
				<div className={`flex gap-2 ${body}`}>
					<FilePlus size={18} className={`mt-0.5 shrink-0 ${accent}`} />
					<p>
						When you are ready, create{" "}
						<span className={`font-mono text-[12px] ${title}`}>plans/PLAN-*.md</span> from here or the menu.
						Open any file from <span className={title}>Project Files</span> when you need the raw editor beside
						chat.
					</p>
				</div>
				<div className="pt-1">
					<button type="button" className={btnPrimary} disabled={!canCreatePlan} onClick={onNewPlanFile}>
						<FilePlus size={14} />
						New plan document…
					</button>
					{!canCreatePlan ? (
						<p className={`mt-2 text-[11px] ${body}`}>Open a workspace folder first.</p>
					) : null}
				</div>
			</div>
		</div>
	);
}
