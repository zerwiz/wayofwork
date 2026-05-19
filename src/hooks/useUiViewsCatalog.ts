/**
 * useUiViewsCatalog Hook
 *
 * @description Manages UI views catalog and workspace state
 * @returns Object with catalog operations
 */

import { useState, useCallback, useMemo } from "react";

const STORAGE_KEY = "wop-ui-views-catalog";

/** @description Workspace tree row data */
export interface WorkspaceTreeRow {
	id: string;
	path: string;
	name: string;
	icon?: string;
	type: string;
	isOpen?: boolean;
}

/** @description Open file row data */
export interface OpenFileRow {
	path: string;
	name: string;
	type: string;
	icon?: string;
}

/** @description View entry for catalog */
export interface ViewEntry {
	id: string;
	title: string;
	component: React.ComponentType;
	icon?: string;
	category?: string;
}

/** @description Views catalog state */
export interface ViewsCatalogState {
	treeData: WorkspaceTreeRow[] | null;
	openFiles: OpenFileRow[] | null;
	views: ViewEntry[] | null;
	currentView: string | null;
	catalogRelPath?: string;
	schemaDocRelPath?: string;
	entries?: ViewEntry[];
	parseError?: string | null;
	source?: string;
}

export interface UseUiViewsCatalogReturn {
	treeData: WorkspaceTreeRow[] | null;
	openFiles: OpenFileRow[] | null;
	views: ViewEntry[] | null;
	data: ViewsCatalogState | null;
	setTreeData: (tree: WorkspaceTreeRow[]) => void;
	setOpenFiles: (files: OpenFileRow[]) => void;
	setViews: (views: ViewEntry[]) => void;
	setCurrentView: (viewId: string) => void;
	refreshCatalog: () => Promise<void>;
	seedCatalog: () => void;
	loading: boolean;
	error: string | null;
}

const DEFAULT_VIEWS: ViewEntry[] = [
	{
		id: "dashboard",
		title: "Dashboard",
		component: () => null,
		icon: "house",
		category: "navigation",
	},
	{
		id: "chat",
		title: "Chat",
		component: () => null,
		icon: "message-square",
		category: "communication",
	},
	{
		id: "workspace",
		title: "Workspace",
		component: () => null,
		icon: "folder",
		category: "files",
	},
	{
		id: "agent-list",
		title: "Agents",
		component: () => null,
		icon: "bot",
		category: "agents",
	},
];

export function useUiViewsCatalog(): UseUiViewsCatalogReturn {
	const [catalog, setCatalog] = useState<ViewsCatalogState>({
		treeData: null,
		openFiles: null,
		views: null,
		currentView: null,
	});

	const loadData = useCallback(async (id?: string) => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored) as ViewsCatalogState;
				setCatalog(parsed);
				return parsed;
			}
		} catch {
			// Storage error
		}

		// Load default structure
		const defaultState: ViewsCatalogState = {
			treeData: null,
			openFiles: null,
			views: null,
			currentView: null,
		};

		localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
		return defaultState;
	}, []);

	const refreshCatalog = useCallback(async () => {
		const _ = await loadData();
	}, [loadData]);

	const viewData = useMemo(() => catalog.views || [], [catalog.views]);

	const treeData = useMemo(() => catalog.treeData || [], [catalog.treeData]);

	const openFiles = useMemo(() => catalog.openFiles || [], [catalog.openFiles]);

	return {
		treeData,
		openFiles,
		views: useMemo<ViewEntry[]>(
			() => catalog.views || DEFAULT_VIEWS,
			[catalog.views],
		),
		data: catalog,
		setTreeData: (tree) => setCatalog({ ...catalog, treeData: tree }),
		setOpenFiles: (files) => setCatalog({ ...catalog, openFiles: files }),
		setViews: (views) => setCatalog({ ...catalog, views: views }),
		setCurrentView: (viewId) => setCatalog({ ...catalog, currentView: viewId }),
		refreshCatalog,
		seedCatalog: () => {},
		loading: false,
		error: null,
	};
}
