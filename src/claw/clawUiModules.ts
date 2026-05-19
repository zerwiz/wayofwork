/**
 * Claw operator shell — optional extra nav tabs and full-width views.
 *
 * Built-ins stay in `ClawApp` / `ClawNavRail`. Forks and integrators register
 * additional panels with `registerClawUiModule` (typically from
 * `clawUserUiModules.ts`, imported once at app startup).
 */
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { ServerConfig } from "../hooks/useServerConfig";

export const CLAW_BUILTIN_TAB_IDS = [
	"mission",
	"chat",
	"team",
	"schedule",
	"channels",
	"management",
	"files",
	"settings",
] as const;

export type ClawBuiltinTabId = (typeof CLAW_BUILTIN_TAB_IDS)[number];

/** Active rail tab: a built-in id or a registered module id. */
export type ClawTabId = ClawBuiltinTabId | string;

const RESERVED = new Set<string>(CLAW_BUILTIN_TAB_IDS);

export function isClawBuiltinTab(id: string): id is ClawBuiltinTabId {
	return RESERVED.has(id);
}

export type ClawUiModuleContext = {
	activeTab: ClawTabId;
	/** Workspace root path or null if none. */
	workspaceRoot: string | null;
	appearanceDark: boolean;
	serverConfig: ServerConfig | null;
	setTab: (tab: ClawTabId) => void;
	/** Select a workspace-relative path and switch to the Files tab. */
	openWorkspaceFile: (relativePath: string) => void;
};

export type ClawUiModule = {
	/** Stable id — shown as `activeTab` when selected; must not match a built-in tab id. */
	id: string;
	/** Short label under the nav icon. */
	label: string;
	/** Optional longer tooltip (defaults to label). */
	title?: string;
	icon?: LucideIcon;
	/** Lower sorts first; default 100. */
	order?: number;
	render: (ctx: ClawUiModuleContext) => ReactNode;
};

const registry: ClawUiModule[] = [];

export function registerClawUiModule(module: ClawUiModule): void {
	if (RESERVED.has(module.id)) {
		throw new Error(
			`Claw UI module id "${module.id}" is reserved (built-in tab). Pick another id.`,
		);
	}
	if (!module.id.trim()) {
		throw new Error("Claw UI module id must be non-empty.");
	}
	const i = registry.findIndex((m) => m.id === module.id);
	if (i >= 0) registry[i] = module;
	else registry.push(module);
}

export function unregisterClawUiModule(id: string): void {
	const i = registry.findIndex((m) => m.id === id);
	if (i >= 0) registry.splice(i, 1);
}

export function getClawUiModule(id: string): ClawUiModule | undefined {
	return registry.find((m) => m.id === id);
}

/** Registered modules sorted for display (nav rail). */
export function listClawUiModules(): ClawUiModule[] {
	return [...registry].sort((a, b) => {
		const ao = a.order ?? 100;
		const bo = b.order ?? 100;
		if (ao !== bo) return ao - bo;
		return a.label.localeCompare(b.label);
	});
}
