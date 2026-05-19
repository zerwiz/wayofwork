import { Clock, Folder, FolderOpen, FolderSearch } from "lucide-react";

/** Simple shell — Projects & Workspace: shows current workspace, lets users switch or pick a recent folder. */
export function SimpleProjectsView({
	rootLabel,
	rootPath,
	onRefresh,
	onOpenFolder,
	onOpenRecentFolder,
	recentFolders = [],
	appearanceDark,
}: {
	rootLabel: string;
	rootPath: string;
	onRefresh: () => void;
	/** Opens a path-picker prompt and switches the workspace. */
	onOpenFolder?: () => void;
	/** Switches to a recently-used folder directly. */
	onOpenRecentFolder?: (path: string) => void;
	/** Ordered list of recently used absolute paths. */
	recentFolders?: string[];
	appearanceDark: boolean;
}) {
	const pageBg = appearanceDark ? "" : "bg-[#f3f3f3]";
	const heading = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";
	const sub = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const card = appearanceDark
		? "border-[#3c3c3c] bg-[#252526]"
		: "border-[#e5e5e5] bg-white shadow-sm";
	const inner = appearanceDark
		? "border-[#3c3c3c] bg-[#1e1e1e]"
		: "border-[#e5e5e5] bg-[#ececec]";
	const label = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";
	const pathC = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const btn = appearanceDark
		? "bg-[#3c3c3c] text-[#cccccc] hover:bg-[#4a4a4a]"
		: "bg-[#e5e5e5] text-[#333333] hover:bg-[#d0d0d0]";
	const recentHover = appearanceDark ? "hover:bg-[#2a2d2e]" : "hover:bg-[#f0f0f0]";
	const recentBorder = appearanceDark ? "border-[#3c3c3c]" : "border-[#e5e5e5]";

	const visibleRecent = recentFolders.filter((p) => p !== rootPath).slice(0, 8);

	return (
		<div className={`flex-1 overflow-y-auto p-8 ${pageBg}`}>
			<div className="mx-auto max-w-4xl">
				<h1 className={`mb-2 text-2xl font-extrabold ${heading}`}>Projects &amp; Workspace</h1>

				{/* Plain-English explainer */}
				<p className={`mb-6 max-w-2xl text-sm leading-relaxed ${sub}`}>
					A <strong className={heading}>workspace</strong> is the folder on your computer that Way of Pi is working
					inside. Think of it like opening a drawer — everything inside (your files, code, agents) comes from
					that folder. You can switch to a different folder any time to work on a different project.
				</p>

				{/* Current workspace */}
				<div className={`mb-6 rounded-2xl border p-6 shadow-sm ${card}`}>
					<h2 className={`mb-1 flex items-center gap-2 text-base font-bold ${heading}`}>
						<Folder className="text-[#fb923c]" size={18} />
						Current Workspace
					</h2>
					<p className={`mb-4 text-xs ${sub}`}>
						This is the folder you're currently working in. All files, chats, and agents refer to this location.
					</p>
					<div className={`flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${inner}`}>
						<div className="flex min-w-0 flex-col">
							<span className={`font-bold ${label}`}>{rootLabel || "Workspace"}</span>
							<span className={`mt-1 truncate font-mono text-sm ${pathC}`} title={rootPath}>
								{rootPath || "—"}
							</span>
						</div>
						<button
							type="button"
							onClick={onRefresh}
							className={`shrink-0 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${btn}`}
						>
							Refresh tree
						</button>
					</div>
				</div>

				{/* Change workspace */}
				{onOpenFolder && (
					<div className={`mb-6 rounded-2xl border p-6 shadow-sm ${card}`}>
						<h2 className={`mb-1 flex items-center gap-2 text-base font-bold ${heading}`}>
							<FolderOpen className="text-[#fb923c]" size={18} />
							Open a Different Folder
						</h2>
						<p className={`mb-4 text-sm leading-relaxed ${sub}`}>
							Want to work on a different project? Click the button below to type the path to any folder on
							your computer and switch to it instantly.
						</p>
						<button
							type="button"
							onClick={onOpenFolder}
							className="flex items-center gap-2 rounded-xl bg-[#ea580c] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#c2410c]"
						>
							<FolderOpen size={16} />
							Choose folder…
						</button>
					</div>
				)}

				{/* Recent folders */}
				{onOpenRecentFolder && visibleRecent.length > 0 && (
					<div className={`rounded-2xl border p-6 shadow-sm ${card}`}>
						<h2 className={`mb-1 flex items-center gap-2 text-base font-bold ${heading}`}>
							<Clock className="text-[#fb923c]" size={18} />
							Recently Opened
						</h2>
						<p className={`mb-4 text-sm ${sub}`}>
							Click any folder below to switch back to it right away — no typing needed.
						</p>
						<ul className={`divide-y rounded-xl border ${recentBorder} ${appearanceDark ? "divide-[#3c3c3c]" : "divide-[#e5e5e5]"}`}>
							{visibleRecent.map((p) => {
								const name = p.split(/[/\\]/).filter(Boolean).pop() ?? p;
								return (
									<li key={p}>
										<button
											type="button"
											onClick={() => onOpenRecentFolder(p)}
											title={p}
											className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${recentHover}`}
										>
											<FolderSearch size={16} className="shrink-0 text-[#fb923c]/70" />
											<div className="min-w-0">
												<p className={`truncate text-sm font-semibold ${label}`}>{name}</p>
												<p className={`truncate font-mono text-xs ${pathC}`}>{p}</p>
											</div>
										</button>
									</li>
								);
							})}
						</ul>
					</div>
				)}

				{onOpenRecentFolder && visibleRecent.length === 0 && onOpenFolder && (
					<p className={`text-xs ${sub}`}>
						No recent folders yet — open one above and it will appear here next time.
					</p>
				)}
			</div>
		</div>
	);
}
