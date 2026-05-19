/**
 * First-time (per host bundle) onboarding: explains `.claw/workspace/` and creates scaffold files.
 */
import { FolderOpen, Loader, Sparkles, X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CLAW_WORKSPACE_BUNDLE_REL, CLAW_WORKSPACE_FILES } from "../../utils/clawWorkspaceTemplates";
import type { UseClawWorkspaceResult } from "../../hooks/useClawWorkspace";

export type ClawWorkspaceOnboardingModalProps = {
	open: boolean;
	dark: boolean;
	/** Absolute path to the host **`.claw/workspace/`** directory (Way of Pi checkout, not project workspace). */
	clawWorkspaceDirAbs: string;
	ws: UseClawWorkspaceResult;
	onDismiss: () => void;
};

export function ClawWorkspaceOnboardingModal({
	open,
	dark,
	clawWorkspaceDirAbs,
	ws,
	onDismiss,
}: ClawWorkspaceOnboardingModalProps) {
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onDismiss();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onDismiss]);

	if (!open) return null;

	const border = dark ? "border-[#2a2a2a]" : "border-[#e5e5e5]";
	const panelBg = dark ? "bg-[#161616]" : "bg-white";
	const headerText = dark ? "text-[#e5e5e5]" : "text-[#1a1a1a]";
	const subText = dark ? "text-[#858585]" : "text-[#666666]";
	const bodyText = dark ? "text-[#cccccc]" : "text-[#333333]";
	const rowBorder = dark ? "border-[#252526]" : "border-[#eeeeee]";

	const modal = (
		<div
			className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/60 backdrop-blur-sm px-3 py-6"
			role="dialog"
			aria-modal="true"
			aria-labelledby="claw-onboarding-title"
		>
			<div
				className={`relative flex max-h-[min(640px,90vh)] w-[min(520px,100%)] flex-col overflow-hidden rounded-2xl border shadow-2xl ${border} ${panelBg}`}
				onClick={(e) => e.stopPropagation()}
			>
				<div className={`flex shrink-0 items-start justify-between gap-3 border-b px-5 py-4 ${border}`}>
					<div className="flex min-w-0 items-start gap-3">
						<div
							className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
								dark ? "border-[#ea580c]/30 bg-[#ea580c]/10" : "border-[#ea580c]/25 bg-[#ea580c]/8"
							}`}
						>
							<Sparkles size={18} className={dark ? "text-[#fb923c]" : "text-[#ea580c]"} />
						</div>
						<div className="min-w-0">
							<h2 id="claw-onboarding-title" className={`text-[15px] font-bold ${headerText}`}>
								Welcome to Claw
							</h2>
							<p className={`mt-0.5 text-[11px] leading-snug ${subText}`}>
								Create the <strong className={headerText}>Claw workspace folder</strong> (
								<span className="font-mono text-[10px]">.claw/workspace/</span>) with the seven agent files below.
								Claw reads
								them each session so behaviour stays aligned with your project and preferences.
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onDismiss}
						className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
							dark
								? "text-[#585858] hover:bg-[#252526] hover:text-[#cccccc]"
								: "text-[#888888] hover:bg-[#f0f0f0] hover:text-[#333333]"
						}`}
						aria-label="Skip onboarding"
					>
						<X size={16} />
					</button>
				</div>

				<div className={`min-h-0 flex-1 overflow-y-auto px-5 py-4 ${bodyText}`}>
					<div
						className={`mb-4 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[11px] leading-relaxed ${
							dark ? "border-[#3c3c3c] bg-[#1e1e1e]/80" : "border-[#e5e5e5] bg-[#fafafa]"
						}`}
					>
						<FolderOpen size={14} className={`mt-0.5 shrink-0 ${dark ? "text-[#fb923c]" : "text-[#ea580c]"}`} />
						<span className={subText}>
							<span className={`font-mono text-[10px] ${headerText}`}>.claw/workspace/</span> — on-disk folder:{" "}
							<span className="break-all font-mono text-[10px]">{clawWorkspaceDirAbs}</span>
						</span>
					</div>

					<p className={`mb-3 text-[12px] font-semibold ${headerText}`}>Seven files in the folder</p>
					<ul className={`divide-y rounded-xl border text-[11px] ${rowBorder} ${border}`}>
						{CLAW_WORKSPACE_FILES.map((f) => (
							<li key={f.path} className={`flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:gap-2`}>
								<span className={`shrink-0 font-mono text-[10px] ${dark ? "text-[#fb923c]" : "text-[#c2410c]"}`}>
									{f.path.startsWith(`${CLAW_WORKSPACE_BUNDLE_REL}/`)
										? f.path.slice(CLAW_WORKSPACE_BUNDLE_REL.length + 1)
										: f.path}
								</span>
								<span className={`min-w-0 sm:flex-1 ${subText}`}>{f.description}</span>
							</li>
						))}
					</ul>

					{ws.ready && ws.missingCount === 0 ? (
						<p className={`mt-3 text-[11px] leading-relaxed ${subText}`}>
							The Claw workspace folder is complete (all seven files present). Review the list above, or close and
							edit under Mission or Files.
						</p>
					) : null}

					{ws.scaffoldError ? (
						<p className="mt-3 text-[11px] text-[#f14c4c]">{ws.scaffoldError}</p>
					) : null}
				</div>

				<div className={`flex shrink-0 flex-col gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end ${border}`}>
					{ws.ready && ws.missingCount === 0 ? (
						<button
							type="button"
							onClick={onDismiss}
							className={`w-full rounded-lg px-4 py-2.5 text-[12px] font-semibold sm:w-auto ${
								dark
									? "bg-[#ea580c]/20 text-[#fb923c] hover:bg-[#ea580c]/30"
									: "bg-[#ea580c] text-white hover:bg-[#d97706]"
							}`}
						>
							Close
						</button>
					) : (
						<>
							<button
								type="button"
								onClick={onDismiss}
								disabled={ws.scaffolding}
								className={`order-2 rounded-lg px-4 py-2.5 text-[12px] font-semibold transition-colors sm:order-1 ${
									dark
										? "text-[#858585] hover:bg-[#252526] hover:text-[#cccccc] disabled:opacity-40"
										: "text-[#666666] hover:bg-[#f5f5f5] hover:text-[#333333] disabled:opacity-40"
								}`}
							>
								Skip for now
							</button>
							<button
								type="button"
								disabled={ws.scaffolding || ws.missingCount === 0 || !ws.ready}
								onClick={() => void ws.scaffold()}
								className={`order-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[12px] font-semibold transition-colors sm:order-2 ${
									ws.scaffolding || ws.missingCount === 0 || !ws.ready
										? "cursor-not-allowed opacity-50"
										: dark
											? "bg-[#ea580c]/20 text-[#fb923c] hover:bg-[#ea580c]/30"
											: "bg-[#ea580c] text-white hover:bg-[#d97706]"
								}`}
							>
								{ws.scaffolding ? (
									<>
										<Loader size={14} className="animate-spin" />
										Creating Claw workspace folder…
									</>
								) : (
									<>
										<Sparkles size={14} />
										Create Claw workspace folder ({ws.missingCount} missing)
									</>
								)}
							</button>
						</>
					)}
				</div>
			</div>
		</div>
	);

	return createPortal(modal, document.body);
}
