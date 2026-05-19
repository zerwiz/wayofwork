/**
 * Claw Mission — `.claw/workspace/` bundle panel.
 *
 * Shows scaffold file status (exists / missing), setup button,
 * Link to Channels (Telegram + future webhooks), and a shortcut to open the workspace folder.
 */
import {
	AlertTriangle,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	FileText,
	FolderOpen,
	Loader,
	Plus,
	Radio,
	RefreshCw,
} from "lucide-react";
import { useState } from "react";
import type { UseClawWorkspaceResult } from "../../hooks/useClawWorkspace";

export function ClawWorkspaceCard({
	ws,
	workspacePath,
	dark,
	onOpenFile,
	onOpenChannels,
	hostClawDirAbs,
}: {
	ws: UseClawWorkspaceResult;
	workspacePath: string;
	dark: boolean;
	onOpenFile: (path: string) => void;
	onOpenChannels?: () => void;
	/** Absolute host path for **`.claw/workspace/`** (Way of Pi checkout, not the opened project). */
	hostClawDirAbs?: string | null;
}) {
	const [expanded, setExpanded] = useState(false);

	const borderC = dark ? "border-[#2a2a2a]" : "border-[#e5e5e5]";
	const bgC = dark ? "bg-[#1e1e1e]" : "bg-white shadow-sm";
	const mutedC = dark ? "text-[#858585]" : "text-[#888888]";
	const textC = dark ? "text-[#cccccc]" : "text-[#333333]";
	const hoverRowC = dark ? "hover:bg-[#252526]" : "hover:bg-[#f5f5f5]";
	const accentC = dark ? "text-[#fb923c]" : "text-[#ea580c]";

	const isReady = ws.ready && !ws.checking;
	const allPresent = isReady && ws.missingCount === 0 && ws.existCount > 0;
	const noWorkspace = workspacePath === "—";

	const statusIcon = noWorkspace ? (
		<AlertTriangle size={14} className={dark ? "text-[#fb923c]" : "text-[#ea580c]"} />
	) : !isReady ? (
		<Loader size={14} className={`animate-spin ${mutedC}`} />
	) : allPresent ? (
		<CheckCircle2 size={14} className="text-[#4ec9b0]" />
	) : ws.existCount > 0 ? (
		<AlertTriangle size={14} className={dark ? "text-[#fb923c]" : "text-[#ea580c]"} />
	) : (
		<Plus size={14} className={accentC} />
	);

	const summaryText = noWorkspace
		? "No workspace open"
		: !isReady
			? "Checking…"
			: allPresent
				? `All ${ws.existCount} files present`
				: ws.existCount === 0
					? "Not set up yet"
					: `${ws.existCount} of ${ws.files.length} files present`;

	return (
		<div className={`rounded-xl border ${borderC} ${bgC}`}>
			{/* Header */}
			<div className={`flex items-center justify-between border-b px-4 py-3 ${borderC}`}>
				<div className="flex items-center gap-2">
					<FolderOpen size={14} className={accentC} />
					<span className={`text-[11px] font-bold uppercase tracking-wider ${mutedC}`}>
						Claw workspace folder
					</span>
				</div>
				<button
					type="button"
					onClick={() => ws.refresh()}
					disabled={ws.checking}
					title="Re-check workspace files"
					className={`rounded p-1 ${mutedC} hover:${textC} disabled:opacity-40`}
				>
					<RefreshCw size={11} className={ws.checking ? "animate-spin" : ""} />
				</button>
			</div>

			{/* Summary row */}
			<button
				type="button"
				className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${hoverRowC}`}
				onClick={() => setExpanded((v) => !v)}
			>
				{statusIcon}
				<div className="flex min-w-0 flex-1 flex-col">
					<span className={`text-[12px] font-semibold ${textC}`}>Workspace</span>
					<span className={`text-[11px] ${mutedC}`}>{summaryText}</span>
					{hostClawDirAbs ? (
						<span className={`mt-0.5 break-all font-mono text-[9px] leading-snug ${mutedC} opacity-90`}>
							{hostClawDirAbs}
						</span>
					) : null}
				</div>
				{expanded ? (
					<ChevronDown size={14} className={mutedC} />
				) : (
					<ChevronRight size={14} className={mutedC} />
				)}
			</button>

			{/* Expanded file list */}
			{expanded ? (
				<div className={`border-t ${borderC}`}>
					<ul className="px-3 py-2">
						{ws.files.map(({ file, status, resolvedReadPath }) => {
							const exists = status === "exists";
							const openPath = exists ? (resolvedReadPath ?? file.path) : file.path;
							return (
								<li key={file.path} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
									{status === "checking" ? (
										<Loader size={11} className={`shrink-0 animate-spin ${mutedC}`} />
									) : exists ? (
										<CheckCircle2 size={11} className="shrink-0 text-[#4ec9b0]" />
									) : status === "error" ? (
										<AlertTriangle size={11} className="shrink-0 text-[#f14c4c]" />
									) : (
										<FileText size={11} className={`shrink-0 ${mutedC} opacity-40`} />
									)}
									<button
										type="button"
										disabled={!exists}
										onClick={() => exists && onOpenFile(openPath)}
										className={`min-w-0 flex-1 truncate text-left font-mono text-[10px] ${
											exists
												? `${accentC} hover:underline cursor-pointer`
												: `${mutedC} opacity-50 cursor-default`
										}`}
										title={
											resolvedReadPath
												? `${file.description} (on disk: ${resolvedReadPath})`
												: file.description
										}
									>
										{resolvedReadPath ? (
											<span className="flex min-w-0 flex-col gap-0.5">
												<span className="truncate">{file.path}</span>
												<span className={`truncate text-[9px] font-normal ${mutedC}`}>
													→ {resolvedReadPath}
												</span>
											</span>
										) : (
											file.path
										)}
									</button>
									<span className={`truncate text-right text-[10px] ${mutedC}`}>{file.description}</span>
								</li>
							);
						})}
					</ul>
				</div>
			) : null}

			{/* Action row */}
			{!noWorkspace && isReady && ws.missingCount > 0 ? (
				<div className={`border-t ${borderC} px-4 py-3`}>
					{ws.scaffoldError ? (
						<p className="mb-2 text-[11px] text-[#f14c4c]">{ws.scaffoldError}</p>
					) : null}
				<button
					type="button"
					disabled={ws.scaffolding}
					onClick={() => void ws.scaffold()}
					className={`flex w-full flex-wrap items-center justify-center gap-2 rounded-lg px-3 py-2 text-center text-[12px] font-semibold transition-colors ${
						ws.scaffolding
							? "cursor-wait opacity-50"
							: dark
								? "bg-[#ea580c]/15 text-[#fb923c] hover:bg-[#ea580c]/25"
								: "bg-[#ea580c]/10 text-[#ea580c] hover:bg-[#ea580c]/18"
					}`}
				>
					{ws.scaffolding ? (
						<>
							<Loader size={13} className="shrink-0 animate-spin" />
							<span>Creating Claw workspace folder…</span>
						</>
					) : (
						<>
							<Plus size={13} className="shrink-0" />
							<span className="min-w-0 break-words">
								Create Claw workspace folder ({ws.missingCount} missing)
							</span>
						</>
					)}
				</button>
				</div>
			) : null}

		{/* Channels shortcut */}
		{onOpenChannels ? (
			<div className={`border-t ${borderC} px-4 py-2.5`}>
				<button
					type="button"
					onClick={onOpenChannels}
					className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] transition-colors ${
						dark
							? "text-[#585858] hover:bg-[#252526] hover:text-[#aaaaaa]"
							: "text-[#aaaaaa] hover:bg-[#f5f5f5] hover:text-[#555555]"
					}`}
				>
					<Radio size={12} className="shrink-0" />
					<span>Telegram, webhooks & channels</span>
					<ChevronRight size={10} className="ml-auto shrink-0" />
				</button>
			</div>
		) : null}
	</div>
	);
}

