import { PanelLeft, FileText, Cpu, Plus, FileCode, X, MessageSquare } from "lucide-react";
import type { ChatSessionTab } from "../../hooks/useWayOfWorkSession";

/** Shared toolbar for Claw views: sidebar toggle + status (matches Simple mode feel). */
export function ClawSecondaryToolbar({
	sidebarOpen,
	onToggleSidebar,
	connected,
	appearanceDark,
	activeTab,
	onNew,
	onToggleWorkspace,
	workspaceActive,
	streaming,
	chatTabs,
	activeChatTabId,
	onSelectChatTab,
	onCloseChatTab,
}: {
	sidebarOpen: boolean;
	onToggleSidebar: () => void;
	connected: boolean;
	appearanceDark: boolean;
	activeTab: string;
	onNew?: () => void;
	onToggleWorkspace?: () => void;
	workspaceActive?: boolean;
	streaming?: boolean;
	chatTabs?: ChatSessionTab[];
	activeChatTabId?: string;
	onSelectChatTab?: (id: string) => void;
	onCloseChatTab?: (id: string) => void;
}) {
	const bar = appearanceDark
		? "border-b border-[#252526] bg-[#252526]"
		: "border-b border-[#e5e5e5] bg-[#ececec]";
	const btn = appearanceDark
		? "text-[#cccccc] hover:bg-[#3c3c3c] hover:text-white"
		: "text-[#616161] hover:bg-[#e5e5e5] hover:text-[#333333]";
	const activeBtn = appearanceDark
		? "bg-[#ea580c]/15 text-[#fb923c]"
		: "bg-[#ea580c]/10 text-[#ea580c]";
	const label = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";

	const isChat = activeTab === "chat";

	return (
		<div className={`flex h-9 shrink-0 items-center justify-between px-2 ${bar}`}>
			<div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
				<button
					type="button"
					onClick={onToggleSidebar}
					className={`shrink-0 rounded p-1.5 transition-colors ${btn}`}
					title={sidebarOpen ? "Hide primary sidebar" : "Show primary sidebar"}
				>
					<PanelLeft size={18} />
				</button>
				
				<div className="flex shrink-0 items-center gap-1.5 ml-1 mr-2">
					<Cpu size={14} className="text-[#fb923c] opacity-80" />
					<span className={`text-[10px] font-bold uppercase tracking-wider ${label}`}>
						{activeTab}
					</span>
				</div>

				{/* Chat Tabs */}
				{isChat && chatTabs && chatTabs.length > 0 ? (
					<div className="flex min-w-0 flex-1 items-center gap-px overflow-hidden">
						{chatTabs.map((tab) => {
							const active = tab.id === activeChatTabId;
							const canClose = chatTabs.length > 1 && onCloseChatTab;
							return (
								<div
									key={tab.id}
									className={`flex min-w-0 max-w-[160px] items-center gap-1 rounded-t px-2 py-1.5 transition-colors ${
										active
											? appearanceDark
												? "bg-[#1e1e1e] text-[#cccccc]"
												: "bg-white text-[#333333]"
											: appearanceDark
												? "text-[#858585] hover:bg-[#1e1e1e]/50 hover:text-[#cccccc]"
												: "text-[#666666] hover:bg-white/50 hover:text-[#333333]"
									}`}
								>
									<button
										type="button"
										onClick={() => onSelectChatTab?.(tab.id)}
										className="min-w-0 flex-1 truncate text-left text-[11px] font-medium"
										title={tab.label}
									>
										{tab.label}
									</button>
									{active && canClose ? (
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												onCloseChatTab(tab.id);
											}}
											className="shrink-0 opacity-60 hover:opacity-100"
											title="Close chat"
										>
											<X size={12} />
										</button>
									) : null}
								</div>
							);
						})}
					</div>
				) : null}
			</div>

			<div className="flex shrink-0 items-center gap-3 ml-4">
				{onNew || onToggleWorkspace ? (
					<div className="flex items-center gap-1 mr-2">
						{onNew ? (
							<button
								type="button"
								onClick={onNew}
								disabled={streaming || !connected}
								className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${btn} disabled:cursor-not-allowed disabled:opacity-40`}
								title={
									streaming
										? "Wait for the current reply to finish before starting a new session"
										: "New session"
								}
							>
								<Plus size={14} />
								<span className="hidden sm:inline">New</span>
							</button>
						) : null}
						{onToggleWorkspace ? (
							<button
								type="button"
								onClick={onToggleWorkspace}
								className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${workspaceActive ? activeBtn : btn}`}
								title="Toggle Workspace file panel"
							>
								<FileCode size={14} />
								<span className="hidden sm:inline">Workspace</span>
							</button>
						) : null}
					</div>
				) : null}

				<div className="flex items-center gap-2">
					<div
						className={`h-2 w-2 rounded-full ${connected ? "bg-[#4ec9b0]" : "bg-[#cca700]"}`}
						title={connected ? "Connected" : "Connecting…"}
					/>
					<span className={`hidden text-[10px] font-medium sm:inline ${label}`}>
						{connected ? "Online" : "Connecting…"}
					</span>
				</div>
			</div>
			
			<div className="w-2" /> {/* Small spacer */}
		</div>
	);
}
