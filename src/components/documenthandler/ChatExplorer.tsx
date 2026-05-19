import React from "react";
import type { TreeNode } from "../../types/tree";
import type { LogRow } from "../../hooks/useWayOfPiSession";
import type { ChatRow } from "../../hooks/useWayOfPiSession";
import { DocumentHandlerProvider } from "./context/DocumentHandlerContext";
import ChatPanel from "./ChatPanel";
import FileExplorer from "./FileExplorer";
import "./styles/ChatExplorer.css";

export interface ChatExplorerProps {
	appearanceDark?: boolean;
	nodes: TreeNode[];
	selectedPath: string | null;
	onSelectFile: (path: string) => void;
	loading: boolean;
	error: string | null;
	logs: LogRow[];
	streaming: boolean;
	connected?: boolean;
	rows: ChatRow[];
	onSend: (text: string) => void;
	onStop: () => void;
}

const ChatExplorer: React.FC<ChatExplorerProps> = ({
	appearanceDark = true,
	nodes,
	selectedPath,
	onSelectFile,
	loading,
	error,
	connected = true,
	rows,
	streaming,
	onSend,
	onStop,
}) => {
	return (
		<DocumentHandlerProvider>
			<div
				className={`chat-explorer-container ${
					appearanceDark ? "theme-dark" : "theme-light"
				}`}
			>
				<ChatPanel
					visible={true}
					onToggle={() => {}}
					appearanceDark={appearanceDark}
					connected={connected}
					rows={rows}
					streaming={streaming}
					onSend={onSend}
					onStop={onStop}
				/>
				<FileExplorer
					visible={true}
					onToggle={() => {}}
					appearanceDark={appearanceDark}
					nodes={nodes}
					selectedPath={selectedPath}
					onSelectFile={onSelectFile}
					loading={loading}
					error={error}
				/>
			</div>
		</DocumentHandlerProvider>
	);
};

export default ChatExplorer;