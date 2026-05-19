import { useCallback, useEffect, useState } from "react";
import {
	clampSimpleChatColumnWidth,
	readSimpleChatWorkspaceState,
	writeSimpleChatWorkspaceState,
	type SimpleChatWorkspaceLayout,
	type SimpleChatWorkspaceState,
} from "../utils/simpleWorkspaceLayoutStorage";

function normalize(s: SimpleChatWorkspaceState): SimpleChatWorkspaceState {
	return {
		layout: s.layout,
		chatColumnWidthPx: clampSimpleChatColumnWidth(s.chatColumnWidthPx),
	};
}

export function useSimpleChatWorkspaceLayout() {
	const [state, setState] = useState<SimpleChatWorkspaceState>(() => normalize(readSimpleChatWorkspaceState()));

	useEffect(() => {
		setState(normalize(readSimpleChatWorkspaceState()));
	}, []);

	const setLayout = useCallback((layout: SimpleChatWorkspaceLayout) => {
		setState((prev) => {
			const next = normalize({ ...prev, layout });
			writeSimpleChatWorkspaceState(next);
			return next;
		});
	}, []);

	const toggleLayout = useCallback(() => {
		setState((prev) => {
			const next = normalize({
				...prev,
				layout: prev.layout === "stacked" ? "side_by_side" : "stacked",
			});
			writeSimpleChatWorkspaceState(next);
			return next;
		});
	}, []);

	const applyChatSplitDelta = useCallback((dx: number) => {
		setState((prev) => {
			if (prev.layout !== "side_by_side") return prev;
			const next = normalize({
				...prev,
				/* Drag splitter right (positive dx) → wider chat / agent column, narrower editor. */
				chatColumnWidthPx: prev.chatColumnWidthPx + dx,
			});
			writeSimpleChatWorkspaceState(next);
			return next;
		});
	}, []);

	return {
		chatWorkspaceLayout: state.layout,
		setChatWorkspaceLayout: setLayout,
		toggleChatWorkspaceLayout: toggleLayout,
		chatColumnWidthPx: state.chatColumnWidthPx,
		applyChatSplitDelta,
	};
}
