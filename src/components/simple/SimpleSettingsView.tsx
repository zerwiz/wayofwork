import type { SimpleColorMode } from "../../hooks/useSimplePreferences";
import type { ServerConfig } from "../../hooks/useServerConfig";
import { GithubManageSettingsCard } from "../GithubManageSettingsCard";
import { TerminalSettingsSection } from "../technical/TerminalSettingsSection";

export type ClawWorkspaceSettingsActions = {
	/** False when no folder is open (or workspace not ready). */
	workspacePresent: boolean;
	/** Create **`.claw/workspace/`** and write any missing scaffold files (same as Mission). */
	onCreateClawWorkspaceFolder: () => void;
	creatingClawWorkspaceFolder: boolean;
	clawWorkspaceScaffoldReady: boolean;
	clawWorkspaceScaffoldMissingCount: number;
	clawWorkspaceScaffoldError: string | null;
	onRunNewOnboarding: () => void;
	onDeleteClawWorkspace: () => void;
	deletingClawWorkspace: boolean;
};

function ToggleRow({
	title,
	description,
	on,
	onToggle,
	appearanceDark,
}: {
	title: string;
	description: string;
	on: boolean;
	onToggle: () => void;
	appearanceDark: boolean;
}) {
	const card = appearanceDark
		? "border-[#3c3c3c] bg-[#252526]"
		: "border-[#e5e5e5] bg-white shadow-sm";
	const titleC = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";
	const desc = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const trackOff = appearanceDark ? "bg-[#6f6f6f]" : "bg-[#c8c8c8]";

	return (
		<div className={`flex flex-col gap-4 rounded-2xl border p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between ${card}`}>
			<div>
				<h3 className={`font-bold ${titleC}`}>{title}</h3>
				<p className={`mt-1 text-sm ${desc}`}>{description}</p>
			</div>
			<button
				type="button"
				role="switch"
				aria-checked={on}
				onClick={onToggle}
				className={`relative h-6 w-12 shrink-0 cursor-pointer rounded-full transition-colors ${on ? "bg-[#ea580c]" : trackOff}`}
			>
				<span
					className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${on ? "right-1" : "left-1"}`}
				/>
			</button>
		</div>
	);
}

/** Simple shell — **wired for local prefs**: appearance, approval queue toggle, switch to technical UI. */
export function SimpleSettingsView({
	colorMode,
	onColorMode,
	approvalQueue,
	onApprovalQueue,
	onSwitchToTechnical,
	onOpenIndexingDocs,
	serverConfig,
	onConfigRefresh,
	clawWorkspaceActions,
}: {
	colorMode: SimpleColorMode;
	onColorMode: (m: SimpleColorMode) => void;
	approvalQueue: boolean;
	onApprovalQueue: (next: boolean) => void;
	onSwitchToTechnical: () => void;
	/** Settings menu parity: codebase index + docs (server). */
	onOpenIndexingDocs?: () => void;
	/** `/api/config` — terminal enable flag and shell hints. */
	serverConfig: ServerConfig | null;
	/** Called after toggling terminal so parent can refresh /api/config. */
	onConfigRefresh?: () => void | Promise<void>;
	/** Claw shell only — `.claw/workspace/` bundle, onboarding, and removal. */
	clawWorkspaceActions?: ClawWorkspaceSettingsActions;
}) {
	const appearanceDark = colorMode === "dark";
	const pageBg = appearanceDark ? "" : "bg-[#f3f3f3]";
	const heading = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";
	const sub = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const card = appearanceDark
		? "border-[#3c3c3c] bg-[#252526]"
		: "border-[#e5e5e5] bg-white shadow-sm";

	return (
		<div className={`flex-1 overflow-y-auto p-8 ${pageBg}`}>
			<div className="mx-auto max-w-4xl">
				<h1 className={`mb-2 text-2xl font-extrabold ${heading}`}>Settings</h1>
				<p className={`mb-8 font-medium ${sub}`}>Simple UI preferences (stored in this browser).</p>

				<div className="space-y-4">
					<GithubManageSettingsCard appearanceDark={appearanceDark} />

					<div className={`rounded-2xl border p-6 shadow-sm ${card}`}>
						<h3 className={`mb-2 font-bold ${heading}`}>Appearance</h3>
						<p className={`mb-4 text-sm ${sub}`}>
							<strong className={heading}>Dark mode</strong> — same grays as Technical UI (default).{" "}
							<strong className={heading}>White mode</strong> — light neutral chrome.
						</p>
						<div className="flex flex-wrap gap-2">
							<button
								type="button"
								onClick={() => onColorMode("dark")}
								className={`rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${
									colorMode === "dark"
										? "border-[#ea580c] bg-[#ea580c]/20 text-[#fed7aa]"
										: appearanceDark
											? "border-[#6f6f6f] text-[#cccccc] hover:bg-[#3c3c3c]"
											: "border-[#d4d4d4] text-[#333333] hover:bg-[#e5e5e5]"
								}`}
							>
								Dark mode
							</button>
							<button
								type="button"
								onClick={() => onColorMode("light")}
								className={`rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${
									colorMode === "light"
										? "border-[#ea580c] bg-[#ea580c]/12 text-[#c2410c]"
										: appearanceDark
											? "border-[#6f6f6f] text-[#cccccc] hover:bg-[#3c3c3c]"
											: "border-[#d4d4d4] text-[#333333] hover:bg-[#e5e5e5]"
								}`}
							>
								White mode
							</button>
						</div>
					</div>

					<ToggleRow
						title="Approval queue (preview)"
						description="Stored for future wiring to tool approval on the agent host."
						on={approvalQueue}
						onToggle={() => onApprovalQueue(!approvalQueue)}
						appearanceDark={appearanceDark}
					/>

					{clawWorkspaceActions ? (
						<div className={`rounded-2xl border p-6 shadow-sm ${card}`}>
							<h3 className={`mb-2 font-bold ${heading}`}>Claw workspace folder</h3>
							<p className={`mb-4 text-sm ${sub}`}>
								The <strong className={heading}>Claw workspace folder</strong> is host-scoped: it lives under the
								Way of Pi checkout as <code className="text-xs">.claw/workspace/</code> (not inside the folder you
								opened as
								the project workspace). It holds seven markdown files (SOUL, AGENTS, USER, MEMORY, HEARTBEAT,
								TOOLS, SECURITY). Override the host root with <code className="text-xs">WOP_CLAW_HOST_ROOT</code>{" "}
								or <code className="text-xs">WOP_PLAYGROUND_ROOT</code> on the server. Use{" "}
								<strong className={heading}>Create Claw workspace folder</strong> to add the directory and any
								missing files. <strong className={heading}>Run new onboarding</strong> opens the guided setup
								dialog. <strong className={heading}>Delete Claw workspace folder</strong> removes that host{" "}
								<code className="text-xs">.claw/workspace/</code> tree (including <code className="text-xs">
									memory/
								</code>
								). Optional <code className="text-xs">.claw/telegram.json</code> stays outside that folder.
							</p>
							{!clawWorkspaceActions.workspacePresent ? (
								<p className={`text-sm ${sub}`}>
									Claw host paths are not available yet — ensure the Way of Pi Bun server is running and{" "}
									<code className="text-xs">GET /api/config</code> returns <code className="text-xs">
										clawWorkspaceDirAbs
									</code>
									.
								</p>
							) : (
								<div className="flex flex-col gap-3">
									{clawWorkspaceActions.clawWorkspaceScaffoldError ? (
										<p className={`text-sm ${appearanceDark ? "text-[#f87171]" : "text-red-600"}`}>
											{clawWorkspaceActions.clawWorkspaceScaffoldError}
										</p>
									) : null}
									<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
										<button
											type="button"
											disabled={
												clawWorkspaceActions.creatingClawWorkspaceFolder ||
												!clawWorkspaceActions.clawWorkspaceScaffoldReady ||
												clawWorkspaceActions.clawWorkspaceScaffoldMissingCount === 0
											}
											onClick={clawWorkspaceActions.onCreateClawWorkspaceFolder}
											className={`rounded-xl px-4 py-2 text-sm font-bold text-white transition-colors ${
												clawWorkspaceActions.creatingClawWorkspaceFolder ||
												!clawWorkspaceActions.clawWorkspaceScaffoldReady ||
												clawWorkspaceActions.clawWorkspaceScaffoldMissingCount === 0
													? "cursor-not-allowed bg-[#9a9a9a]"
													: "bg-[#ea580c] hover:bg-[#c2410c]"
											}`}
										>
											{clawWorkspaceActions.creatingClawWorkspaceFolder
												? "Creating folder…"
												: clawWorkspaceActions.clawWorkspaceScaffoldReady &&
													  clawWorkspaceActions.clawWorkspaceScaffoldMissingCount === 0
													? "Claw workspace folder complete"
													: `Create Claw workspace folder (${clawWorkspaceActions.clawWorkspaceScaffoldMissingCount} missing)`}
										</button>
										<button
											type="button"
											onClick={clawWorkspaceActions.onRunNewOnboarding}
											className={`rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${
												appearanceDark
													? "border-[#6f6f6f] text-[#cccccc] hover:bg-[#3c3c3c]"
													: "border-[#d4d4d4] text-[#333333] hover:bg-[#e5e5e5]"
											}`}
										>
											Run new onboarding
										</button>
										<button
											type="button"
											disabled={clawWorkspaceActions.deletingClawWorkspace}
											onClick={clawWorkspaceActions.onDeleteClawWorkspace}
											className={`rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${
												clawWorkspaceActions.deletingClawWorkspace
													? "cursor-not-allowed opacity-50"
													: appearanceDark
														? "border-[#f14c4c]/50 text-[#f87171] hover:bg-[#f14c4c]/10"
														: "border-[#dc2626] text-[#b91c1c] hover:bg-[#fef2f2]"
											}`}
										>
											{clawWorkspaceActions.deletingClawWorkspace
												? "Deleting…"
												: "Delete Claw workspace folder"}
										</button>
									</div>
								</div>
							)}
						</div>
					) : null}

					{onOpenIndexingDocs ? (
						<div className={`rounded-2xl border p-6 shadow-sm ${card}`}>
							<h3 className={`font-bold ${heading}`}>Indexing & Docs</h3>
							<p className={`mt-1 text-sm ${sub}`}>
								Local workspace manifest under <code className="text-xs">.wayofpi/index</code>, optional chat
								context, and HTTP(S) doc crawls — same product area as Cursor’s Indexing & Docs (without cloud
								embeddings).
							</p>
							<button
								type="button"
								onClick={onOpenIndexingDocs}
								className="mt-4 rounded-xl bg-[#ea580c] px-4 py-2 text-sm font-bold text-white hover:bg-[#c2410c]"
							>
								Open Indexing & Docs…
							</button>
						</div>
					) : null}

					<div className={`rounded-2xl border p-6 shadow-sm ${card}`}>
						<TerminalSettingsSection config={serverConfig} appearanceDark={appearanceDark} onConfigRefresh={onConfigRefresh} />
					</div>

					<div className={`rounded-2xl border p-6 shadow-sm ${card}`}>
						<h3 className={`font-bold ${heading}`}>Technical layout</h3>
						<p className={`mt-1 text-sm ${sub}`}>
							Switch to the IDE-style UI (same as the Simple / Technical toggle in the top bar).
						</p>
						<button
							type="button"
							onClick={onSwitchToTechnical}
							className="mt-4 rounded-xl bg-[#ea580c] px-4 py-2 text-sm font-bold text-white hover:bg-[#c2410c]"
						>
							Open Technical UI
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
