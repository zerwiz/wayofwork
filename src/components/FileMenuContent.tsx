import { useState } from "react";
import type { FileMenuProps } from "../types/fileMenu";

function btn(disabled?: boolean) {
	return `block w-full px-3 py-1.5 text-left text-[13px] ${
		disabled
			? "cursor-not-allowed text-[#555]"
			: "cursor-pointer text-[#cccccc] hover:bg-[#ea580c]/30 hover:text-white"
	}`;
}

function run(close: () => void, fn: () => void) {
	fn();
	close();
}

export function FileMenuContent({ fm, closeMenus }: { fm: FileMenuProps; closeMenus: () => void }) {
	const [sub, setSub] = useState<null | "recent" | "profile" | "share" | "remove" | "prefs">(null);
	const sw = fm.switchAllowed;

	return (
		<ul
			className="absolute left-0 top-full z-50 mt-0.5 min-w-[280px] list-none border border-[#454545] bg-[#252526] py-1 shadow-xl"
			onMouseLeave={() => setSub(null)}
		>
			<li>
				<button
					type="button"
					disabled={!sw}
					title={!sw ? "Set WOP_ALLOW_WORKSPACE_SWITCH on the server (not 0/false)" : undefined}
					className={btn(!sw)}
					onClick={() => run(closeMenus, fm.onNewTextFile)}
				>
					New Text File <span className="float-right font-mono text-[10px] text-[#858585]">Ctrl+N</span>
				</button>
			</li>
			<li>
				<button type="button" className={btn()} onClick={() => run(closeMenus, fm.onNewWindow)}>
					New Window <span className="float-right font-mono text-[10px] text-[#858585]">Ctrl+Shift+N</span>
				</button>
			</li>
			<li>
				<button type="button" className={btn()} onClick={() => run(closeMenus, fm.onNewAgentsWindow)}>
					New Agents Window
				</button>
			</li>
			<li className="group relative">
				<button
					type="button"
					className={btn()}
					onClick={() => setSub(sub === "profile" ? null : "profile")}
				>
					New Window with Profile <span className="float-right text-[#858585]">›</span>
				</button>
				{sub === "profile" ? (
					<ul className="absolute left-full top-0 z-[60] ml-0.5 min-w-[200px] list-none border border-[#454545] bg-[#252526] py-1 shadow-xl">
						<li>
							<button type="button" disabled className={btn(true)}>
								Default <span className="text-[#555]">(only)</span>
							</button>
						</li>
					</ul>
				) : null}
			</li>

			<li className="my-1 border-t border-[#3c3c3c]" />

			<li>
				<button
					type="button"
					disabled={!sw}
					title={!sw ? "Workspace switching disabled on server" : undefined}
					className={btn(!sw)}
					onClick={() => run(closeMenus, fm.onOpenFile)}
				>
					Open File… <span className="float-right font-mono text-[10px] text-[#858585]">Ctrl+O</span>
				</button>
			</li>
			<li>
				<button
					type="button"
					disabled={!sw}
					className={btn(!sw)}
					onClick={() => run(closeMenus, fm.onOpenFolder)}
				>
					Open Folder…
				</button>
			</li>
			<li>
				<button
					type="button"
					disabled={!sw}
					className={btn(!sw)}
					onClick={() => run(closeMenus, fm.onOpenWorkspaceFromFile)}
				>
					Open Workspace from File…
				</button>
			</li>
			<li className="group relative">
				<button
					type="button"
					className={btn(!sw)}
					disabled={!sw}
					onClick={() => setSub(sub === "recent" ? null : "recent")}
				>
					Open Recent <span className="float-right text-[#858585]">›</span>
				</button>
				{sub === "recent" && sw ? (
					<ul className="absolute left-full top-0 z-[60] ml-0.5 max-h-64 min-w-[260px] overflow-y-auto list-none border border-[#454545] bg-[#252526] py-1 shadow-xl">
						{fm.recentFolders.length === 0 ? (
							<li className="px-3 py-2 font-mono text-[11px] text-[#858585]">No recent folders</li>
						) : (
							fm.recentFolders.map((p) => (
								<li key={p}>
									<button
										type="button"
										className={btn()}
										title={p}
										onClick={() => {
											fm.onOpenRecentFolder(p);
											closeMenus();
											setSub(null);
										}}
									>
										<span className="block truncate font-mono text-[11px]">{p}</span>
									</button>
								</li>
							))
						)}
					</ul>
				) : null}
			</li>

			<li className="my-1 border-t border-[#3c3c3c]" />

			<li>
				<button
					type="button"
					disabled={!sw}
					className={btn(!sw)}
					onClick={() => run(closeMenus, fm.onAddFolderToWorkspace)}
				>
					Add Folder to Workspace…
				</button>
			</li>
			<li>
				<button
					type="button"
					className={btn()}
					title={
						!sw
							? "Workspace switching disabled: saves a downloadable .code-workspace only (set WOP_ALLOW_WORKSPACE_SWITCH to write on the server)."
							: "Writes a .code-workspace file on the server (browser: enter absolute path) or native save dialog in Electron."
					}
					onClick={() => run(closeMenus, fm.onSaveWorkspaceAs)}
				>
					Save Workspace As…
				</button>
			</li>
			<li>
				<button
					type="button"
					className={btn()}
					title={!sw ? "Download-only while workspace switching is disabled." : undefined}
					onClick={() => run(closeMenus, fm.onDuplicateWorkspace)}
				>
					Duplicate Workspace
				</button>
			</li>
			<li className="group relative">
				<button
					type="button"
					className={btn(fm.workspaceFolders.length < 2 || !sw)}
					disabled={fm.workspaceFolders.length < 2 || !sw}
					title={
						fm.workspaceFolders.length < 2
							? "Add another folder first (File → Add Folder to Workspace…)."
							: !sw
								? "Workspace switching disabled on server."
								: undefined
					}
					onClick={() => setSub(sub === "remove" ? null : "remove")}
				>
					Remove Folder from Workspace <span className="float-right text-[#858585]">›</span>
				</button>
				{sub === "remove" && fm.workspaceFolders.length > 1 ? (
					<ul className="absolute left-full top-0 z-[60] ml-0.5 min-w-[200px] list-none border border-[#454545] bg-[#252526] py-1 shadow-xl">
						{fm.workspaceFolders.map((f) => (
							<li key={f.label}>
								<button
									type="button"
									className={btn()}
									onClick={() => {
										fm.onRemoveWorkspaceFolder(f.label);
										closeMenus();
										setSub(null);
									}}
								>
									{f.label}
								</button>
							</li>
						))}
					</ul>
				) : null}
			</li>

			<li className="my-1 border-t border-[#3c3c3c]" />

			<li>
				<button
					type="button"
					disabled={!fm.canSaveFile}
					className={btn(!fm.canSaveFile)}
					onClick={() => {
						void fm.onSave();
						closeMenus();
					}}
				>
					Save <span className="float-right font-mono text-[10px] text-[#858585]">Ctrl+S</span>
				</button>
			</li>
			<li>
				<button
					type="button"
					disabled={!fm.hasOpenFile}
					className={btn(!fm.hasOpenFile)}
					onClick={() => run(closeMenus, fm.onSaveAs)}
				>
					Save As… <span className="float-right font-mono text-[10px] text-[#858585]">Ctrl+Shift+S</span>
				</button>
			</li>
			<li>
				<button
					type="button"
					disabled={!fm.dirty}
					className={btn(!fm.dirty)}
					onClick={() => {
						void fm.onSaveAll();
						closeMenus();
					}}
				>
					Save All
				</button>
			</li>

			<li className="my-1 border-t border-[#3c3c3c]" />

			<li className="group relative">
				<button type="button" className={btn()} onClick={() => setSub(sub === "share" ? null : "share")}>
					Share <span className="float-right text-[#858585]">›</span>
				</button>
				{sub === "share" ? (
					<ul className="absolute left-full top-0 z-[60] ml-0.5 min-w-[220px] list-none border border-[#454545] bg-[#252526] py-1 shadow-xl">
						<li>
							<button type="button" className={btn()} onClick={() => run(closeMenus, fm.onShareCopyLink)}>
								Copy editor URL
							</button>
						</li>
						<li>
							<button
								type="button"
								className={btn()}
								onClick={() => run(closeMenus, fm.onCopyWorkspacePath)}
							>
								Copy primary workspace path
							</button>
						</li>
					</ul>
				) : null}
			</li>

			<li>
				<button type="button" className={btn()} onClick={() => run(closeMenus, fm.onToggleAutoSave)}>
					<span className="inline-block w-4">{fm.autoSave ? "✓" : ""}</span>
					Auto Save
				</button>
			</li>
			<li className="group relative">
				<button type="button" className={btn()} onClick={() => setSub(sub === "prefs" ? null : "prefs")}>
					Preferences <span className="float-right text-[#858585]">›</span>
				</button>
				{sub === "prefs" ? (
					<ul className="absolute left-full top-0 z-[60] ml-0.5 min-w-[220px] list-none border border-[#454545] bg-[#252526] py-1 shadow-xl">
						<li>
							<button type="button" className={btn()} onClick={() => run(closeMenus, fm.onPreferencesOpen)}>
								Open Settings
							</button>
						</li>
						<li>
							<button type="button" disabled className={btn(true)}>
								Keyboard shortcuts <span className="text-[#555]">(planned)</span>
							</button>
						</li>
						<li>
							<button type="button" disabled className={btn(true)}>
								Color theme <span className="text-[#555]">(planned)</span>
							</button>
						</li>
					</ul>
				) : null}
			</li>

			<li className="my-1 border-t border-[#3c3c3c]" />

			<li>
				<button
					type="button"
					disabled={!fm.canRevertFile}
					className={btn(!fm.canRevertFile)}
					onClick={() => {
						void fm.onRevertFile();
						closeMenus();
					}}
				>
					Revert File
				</button>
			</li>
			<li>
				<button
					type="button"
					disabled={!fm.hasOpenFile}
					className={btn(!fm.hasOpenFile)}
					onClick={() => run(closeMenus, fm.onCloseEditor)}
				>
					Close Editor <span className="float-right font-mono text-[10px] text-[#858585]">Ctrl+W</span>
				</button>
			</li>
			<li>
				<button
					type="button"
					disabled={!sw}
					className={btn(!sw)}
					onClick={() => run(closeMenus, fm.onCloseWorkspace)}
				>
					Close Workspace
				</button>
			</li>
			<li>
				<button type="button" className={btn()} onClick={() => run(closeMenus, fm.onCloseWindow)}>
					Close Window
				</button>
			</li>

			<li className="my-1 border-t border-[#3c3c3c]" />

			<li>
				<button
					type="button"
					className={btn()}
					onClick={() => {
						void fm.onRefreshWorkspaceTree();
						closeMenus();
					}}
				>
					Refresh workspace tree
				</button>
			</li>
			<li>
				<button type="button" className={btn()} onClick={() => run(closeMenus, fm.onExit)}>
					Exit <span className="float-right font-mono text-[10px] text-[#858585]">Ctrl+Q</span>
				</button>
			</li>
		</ul>
	);
}
