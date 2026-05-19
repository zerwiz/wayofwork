/// <reference types="vite/client" />

/** Electron main exposes this via `electron/preload.mjs` (desktop shell only). */
type NativeSaveWorkspaceResult =
	| { path: string }
	| { cancelled: true }
	| { error: string };

type NativeSaveFileAsPayload = { defaultPath?: string };

interface WopShellApi {
	reload: () => Promise<void>;
	reloadHard: () => Promise<void>;
	toggleDevtools: () => Promise<void>;
	closeWindow?: () => Promise<void>;
	openExternalUrl: (url: string) => Promise<void>;
	saveWorkspaceFileAs?: (suggestedName?: string) => Promise<NativeSaveWorkspaceResult>;
	saveFileAs?: (payload?: NativeSaveFileAsPayload) => Promise<NativeSaveWorkspaceResult>;
	/** Electron dev: start `bun run server/index.ts` when `/api` is unreachable (Vite without Bun). */
	startWayOfPiBunServer?: () => Promise<{
		ok: boolean;
		message?: string;
		alreadyRunning?: boolean;
		/** Port answered health but build predates current API (e.g. GET /api/workspace/problems). */
		staleServer?: boolean;
	}>;
}

declare global {
	interface Window {
		wopShell?: WopShellApi;
	}
}

export {};
