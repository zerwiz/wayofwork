/**
 * useServerConfig Hook
 *
 * @description Manages server configuration state including connection status,
 *              API endpoints, and refresh mechanisms for Way of Pi backend communication
 * @returns Object containing config object, refresh function, and related state
 *
 * @example
 * ```tsx
 * const { config, refresh: refreshServerConfig } = useServerConfig();
 * if (config) displayConfig(config);
 * refreshServerConfig();
 * ```
 */

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "wop-server-config";

export interface ServerConfig {
	baseUrl: string;
	enabled: boolean;
	version: string;
	apiVersion?: string;
	timeoutMs?: number;
	authEnabled?: boolean;
	authBearerToken?: string;
	debugMode?: boolean;
	lastConnected?: Date;
	connectionStatus?: "connected" | "disconnected" | "error";
	shellExecutable?: string;
	shellArgs?: string[];
	shellEnabled?: boolean;
	shellCustom?: boolean;
	platform?: string;
	arch?: string;
	features?: Record<string, boolean>;
	clawTelegramStatus?: boolean;
	clawTelegramEnabled?: boolean;
	clawTelegramChannels?: string[];
	capabilities?: Record<string, boolean>;
	cliVersion?: string;
	terminalEnabled?: boolean;
	customShell?: string;
	piDrivesChat?: boolean;
	piBinaryResolved?: boolean;
	chatEngine?: string;
	provider?: string;
	clawWorkspaceDirAbs?: string;
	clawDotDirAbs?: string;
	piChatEngineRequested?: boolean;
	orchestratorTools?: boolean;
	orchestratorBash?: boolean;
	clawAutomation?: boolean;
	ollamaHost?: string;
	ollamaModel?: string;
	openrouterModel?: string;
	configRuntimePost?: boolean;
	clawTelegramStatusGet?: boolean;
}

export interface UseServerConfigReturn {
	config: ServerConfig | null;
	refresh: () => Promise<void>;
	refreshQuiet: () => Promise<void>;
	setConfig: (config: Partial<ServerConfig>) => void;
}

const DEFAULT_CONFIG: ServerConfig = {
	baseUrl: "",
	enabled: true,
	version: "1.0.0",
	apiVersion: "v1",
	timeoutMs: 30000,
	authEnabled: false,
	debugMode: false,
	connectionStatus: "disconnected",
	features: {
		fileOperations: true,
		agentCommunication: true,
		planExecution: true,
		workspaceSync: true,
	},
};

export function useServerConfig(): UseServerConfigReturn {
	const [config, setConfigState] = useState<ServerConfig>(() => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored) as ServerConfig;
				// Migrate old hardcoded port to relative URL (Vite proxy)
				if (parsed.baseUrl === "http://localhost:3000") {
					parsed.baseUrl = "";
				}
				// Merge with defaults to ensure all fields exist
				return {
					...DEFAULT_CONFIG,
					...parsed,
					features: {
						...DEFAULT_CONFIG.features,
						...parsed.features,
					},
				};
			}
		} catch {
			// Storage not available or parse error
		}
		return DEFAULT_CONFIG;
	});

	const refresh = useCallback(async () => {
		try {
			// Try to fetch current server config
			const response = await fetch(`${config.baseUrl}/api/config`, {
				headers: config.authEnabled
					? { Authorization: `Bearer ${config.authBearerToken}` }
					: {},
			});

			if (response.ok) {
				const newConfig = await response.json();
				setConfigState((prev) => ({
					...prev,
					...newConfig,
					connectionStatus: "connected",
					lastConnected: new Date(),
				}));

				// Persist updated config
				localStorage.setItem(
					STORAGE_KEY,
					JSON.stringify({
						baseUrl: config.baseUrl,
						enabled: config.enabled,
						version: config.version,
						authEnabled: config.authEnabled,
						authBearerToken: config.authBearerToken,
						debugMode: config.debugMode,
						connectionStatus: "connected",
						lastConnected: config.lastConnected,
					}),
				);
			}
		} catch (error) {
			console.warn("Server config refresh failed:", error);
			setConfigState((prev) => ({
				...prev,
				connectionStatus: "error",
			}));
		}
	}, [config.baseUrl, config.authEnabled, config.authBearerToken]);

	const refreshQuiet = useCallback(async () => {
		// Same as refresh but doesn't update connection status
		try {
			const response = await fetch(`${config.baseUrl}/api/config`, {
				headers: config.authEnabled
					? { Authorization: `Bearer ${config.authBearerToken}` }
					: {},
			});

			if (response.ok) {
				const newConfig = await response.json();
				setConfigState((prev) => ({
					...prev,
					...newConfig,
				}));
			}
		} catch (error) {
			// Silently handle errors for quiet refresh
			console.warn("Server config quiet refresh failed:", error);
		}
	}, [config.baseUrl, config.authEnabled, config.authBearerToken]);

	const setConfig = useCallback(
		(newConfig: Partial<ServerConfig>) => {
			setConfigState((prev) => ({
				...prev,
				...newConfig,
			}));

			// Persist updated config
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					baseUrl: config.baseUrl,
					enabled: config.enabled,
					version: config.version,
					authEnabled: config.authEnabled,
					authBearerToken: config.authBearerToken,
					debugMode: config.debugMode,
					...newConfig,
				}),
			);
		},
		[
			config.baseUrl,
			config.enabled,
			config.version,
			config.authEnabled,
			config.authBearerToken,
			config.debugMode,
		],
	);

	useEffect(() => {
		// Refresh config on mount
		refresh();

		// Set up periodic refresh if enabled
		if (config.enabled) {
			const interval = setInterval(refreshQuiet, 60000); // Refresh every minute
			return () => clearInterval(interval);
		}
	}, []);

	return {
		config,
		refresh,
		refreshQuiet,
		setConfig,
	};
}
