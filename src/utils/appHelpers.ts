import type { WorkspaceGridState, PanelTab } from "../types/technicalShell";
import { cloneLayout, PANEL_DOCK_DEFAULTS, applyRemoveTab, applyAddPanelTab, applyPanelTabMove } from "./panelDockLayout";

export function applyMovePanelTabBetweenCellsInGrid(
	g: WorkspaceGridState,
	from: number,
	to: number,
	tab: PanelTab,
	before: PanelTab | null,
): WorkspaceGridState {
	const n = g.cols * g.rows;
	if (from < 0 || from >= n || to < 0 || to >= n) return g;
	if (from === to) {
		const cells = [...g.cells];
		const dock = cells[to] ?? cloneLayout(PANEL_DOCK_DEFAULTS);
		const nextDock = applyPanelTabMove(dock, tab, before);
		if (nextDock === dock) return g;
		cells[to] = nextDock;
		return { ...g, cells };
	}
	const cells = [...g.cells];
	const fromDock = cells[from] ?? cloneLayout(PANEL_DOCK_DEFAULTS);
	const toDock = cells[to] ?? cloneLayout(PANEL_DOCK_DEFAULTS);
	const afterRemove = applyRemoveTab(fromDock, tab);
	const afterAdd = applyAddPanelTab(toDock, tab);
	const afterMove = before ? applyPanelTabMove(afterAdd, tab, before) : afterAdd;
	if (afterRemove === fromDock && afterMove === toDock) return g;
	cells[from] = afterRemove;
	cells[to] = afterMove;
	return { ...g, cells };
}

export function languageFromPath(path: string | null): string {
	if (!path) return "Plain Text";
	const ext = path.split(".").pop()?.toLowerCase() ?? "";
	const map: Record<string, string> = {
		py: "Python",
		ts: "TypeScript",
		tsx: "TypeScript",
		js: "JavaScript",
		jsx: "JavaScript",
		json: "JSON",
		md: "Markdown",
		yml: "YAML",
		yaml: "YAML",
	};
	return map[ext] ?? "Plain Text";
}

export const TASKS_JSON_TEMPLATE = `{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "build",
      "type": "shell",
      "command": "bun run build",
      "problemMatcher": [],
      "group": {
        "kind": "build",
        "isDefault": true
      }
    }
  ]
}
`;

export const LAUNCH_JSON_TEMPLATE = `{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Program",
      "skipFiles": ["<node_internals>/**"],
      "program": "\${workspaceFolder}/index.ts"
    }
  ]
}
`;
