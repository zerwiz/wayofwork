import { MobileChrome } from "../chrome/MobileChrome";

/** Placeholder until Track 3 (Technical mobile) ships — see `docs/WOP_MOBILE_UI_PLAN.md`. */
export function MobileTechnicalShell({
	subtitle,
	onDesktopLayout,
}: {
	subtitle?: string | null;
	onDesktopLayout: () => void;
}) {
	return (
		<div
			className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#1e1e1e] font-sans text-[#cccccc]"
			style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
		>
			<MobileChrome title="Technical (mobile)" subtitle={subtitle} onDesktopLayout={onDesktopLayout} />
			<main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
				<p className="max-w-sm text-sm text-[#cccccc]">
					Mobile layout for Technical mode is planned after Claw and Simple. Use desktop layout for the
					full IDE shell (grid, docks, terminals).
				</p>
			</main>
		</div>
	);
}
