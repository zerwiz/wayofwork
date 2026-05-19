import { X } from "lucide-react";
import { MIT_LICENSE_TEXT } from "../constants/mitLicenseText";

async function openLearnUrl(href: string): Promise<void> {
	try {
		if (typeof window !== "undefined" && window.wopShell?.openExternalUrl) {
			await window.wopShell.openExternalUrl(href);
			return;
		}
	} catch {
		/* fall through */
	}
	window.open(href, "_blank", "noopener,noreferrer");
}

export function MitLicenseModal({
	open,
	onDismiss,
	repoLicenseUrl,
	appearanceDark = true,
}: {
	open: boolean;
	onDismiss: () => void;
	/** e.g. GitHub **LICENSE** in default branch */
	repoLicenseUrl: string;
	/** Match Simple / Claw appearance and shared modal styling (`llmFixModalAppearanceDark` in App). */
	appearanceDark?: boolean;
}) {
	const panel = appearanceDark
		? "border-[#454545] bg-[#252526] text-[#cccccc]"
		: "border-[#e5e5e5] bg-white text-[#333333]";
	const headerRow = appearanceDark
		? "flex shrink-0 items-center justify-between border-b border-[#3c3c3c] px-4 py-3"
		: "flex shrink-0 items-center justify-between border-b border-[#e5e5e5] px-4 py-3";
	const titleClass = appearanceDark
		? "text-[15px] font-semibold text-white"
		: "text-[15px] font-semibold text-[#111827]";
	const closeBtn = appearanceDark
		? "rounded p-1 text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]"
		: "rounded p-1 text-[#616161] hover:bg-[#e5e5e5] hover:text-[#333333]";
	const preClass = appearanceDark
		? "m-0 whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-[#d4d4d4]"
		: "m-0 whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-[#1f2937]";
	const preWrap = appearanceDark ? "" : "rounded-md border border-[#e5e5e5] bg-[#f9fafb] p-3";
	const footerRow = appearanceDark
		? "flex shrink-0 flex-wrap items-center gap-2 border-t border-[#3c3c3c] px-4 py-3"
		: "flex shrink-0 flex-wrap items-center gap-2 border-t border-[#e5e5e5] px-4 py-3";
	const repoLink = appearanceDark
		? "inline-flex rounded border border-[#454545] px-3 py-1.5 text-[12px] text-[#cccccc] no-underline hover:bg-[#2a2d2e]"
		: "inline-flex rounded border border-[#d1d5db] px-3 py-1.5 text-[12px] text-[#111827] no-underline hover:bg-[#f3f4f6]";
	const primaryClose = appearanceDark
		? "rounded bg-[#007acc] px-4 py-2 text-[13px] text-white hover:bg-[#006bb3]"
		: "rounded bg-[#2563eb] px-4 py-2 text-[13px] text-white hover:bg-[#1d4ed8]";

	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/60 p-4"
			role="presentation"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onDismiss();
			}}
		>
			<div
				className={`flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border shadow-2xl ${panel}`}
				role="dialog"
				aria-labelledby="mit-license-title"
				aria-modal="true"
				onMouseDown={(e) => e.stopPropagation()}
			>
				<div className={headerRow}>
					<h2 id="mit-license-title" className={titleClass}>
						MIT License
					</h2>
					<button
						type="button"
						onClick={onDismiss}
						className={closeBtn}
						aria-label="Close"
					>
						<X size={20} />
					</button>
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
					<pre className={`${preClass} ${preWrap}`.trim()}>
						{MIT_LICENSE_TEXT}
					</pre>
				</div>
				<div className={footerRow}>
					<a
						href={repoLicenseUrl}
						target="_blank"
						rel="noopener noreferrer"
						title={repoLicenseUrl}
						className={repoLink}
						onClick={(e) => {
							e.preventDefault();
							void openLearnUrl(repoLicenseUrl);
						}}
					>
						Open LICENSE in repository
					</a>
					<button
						type="button"
						onClick={onDismiss}
						className={primaryClose}
					>
						Close
					</button>
				</div>
			</div>
		</div>
	);
}
