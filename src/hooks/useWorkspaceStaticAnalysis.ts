/**
 * useWorkspaceStaticAnalysis Hook
 *
 * @description Manages static analysis state including problem detection,
 *              analysis engine configuration, and debounced refresh scheduling
 * @param enabled - Whether static analysis is currently enabled for this mode
 *
 * @returns Object containing analysis snapshot, loading state, run method,
 *          debounced refresh scheduler, and engine/log data
 *
 * @example
 * ```tsx
 * const { snapshot, loading, runAnalysis, scheduleDebouncedRefresh } = useWorkspaceStaticAnalysis(enabled);
 * if (loading) showLoadingSpinner();
 * runAnalysis();
 * ```
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";

export interface AnalysisProblem {
	severity: "error" | "warning" | "info";
	message: string;
	filePath: string;
	line: number;
	column?: number;
	suggestion?: string;
}

export interface AnalysisSnapshot {
	engine: string;
	log: string[];
	ranAt: Date;
	ok: boolean;
	error: string | null;
	problems: AnalysisProblem[];
}

export interface UseWorkspaceStaticAnalysisReturn {
	snapshot: AnalysisSnapshot;
	loading: boolean;
	runAnalysis: () => Promise<void>;
	scheduleDebouncedRefresh: () => void;
	loadCached: () => Promise<AnalysisSnapshot | null>;
	refresh: () => Promise<void>;
	totalCount: number;
	errorCount: number;
	warningCount: number;
}

// Storage keys
const STORAGE_KEYS = {
	SNAPSHOT: "wop-static-analysis-snapshot",
	LOADING: "wop-static-analysis-loading",
	ENABLED: "wop-static-analysis-enabled",
	DEBOUNCE_TIMEOUT: "wop-static-analysis-debounce-ms",
};

// Default snapshot
const DEFAULT_SNAPSHOT: AnalysisSnapshot = {
	engine: "unknown",
	log: [],
	ranAt: new Date(),
	ok: true,
	error: null,
	problems: [],
};

// Default debounced timeout
const DEFAULT_DEBOUNCE_MS = 2000;

export function useWorkspaceStaticAnalysis(
	enabled: boolean,
): UseWorkspaceStaticAnalysisReturn {
	const [loading, setLoadingState] = useState(false);
	const snapshotRef = useRef(DEFAULT_SNAPSHOT);
	const debounceRef = useRef<NodeJS.Timeout | null>(null);

	// Initialize from storage
	useEffect(() => {
		const initSnapshot = async () => {
			try {
				const stored = localStorage.getItem(STORAGE_KEYS.SNAPSHOT);
				if (stored) {
					const parsed = JSON.parse(stored);
					snapshotRef.current = {
						...DEFAULT_SNAPSHOT,
						...parsed,
					};
				}
			} catch (error) {
				console.warn("Failed to load static analysis snapshot:", error);
			}
		};

		initSnapshot();
	}, []);

	// Listen for enabled state changes
	useEffect(() => {
		if (enabled) {
			// Save enabled state
			try {
				localStorage.setItem(STORAGE_KEYS.ENABLED, JSON.stringify(enabled));
			} catch {
				// Storage not available
			}
		}
	}, [enabled]);

	const runAnalysis = useCallback(async () => {
		setLoadingState(true);

		try {
			const snapshot: AnalysisSnapshot = {
				engine: "bun-analyzer",
				log: [`Starting analysis at ${new Date().toISOString()}`],
				ranAt: new Date(),
				ok: true,
				error: null,
				problems: [],
			};

			// Simulate analysis - in production this would call actual static analysis API
			await new Promise((resolve) => setTimeout(resolve, 500));

			// Simulate some problems (replace with actual analysis logic)
			snapshot.problems.push({
				severity: "info",
				message: "Static analysis completed successfully",
				filePath: "",
				line: 0,
			});

			snapshotRef.current = snapshot;

			// Save snapshot to storage
			try {
				localStorage.setItem(STORAGE_KEYS.SNAPSHOT, JSON.stringify(snapshot));
			} catch {
				// Storage not available
			}
		} catch (error) {
			const errorSnapshot: AnalysisSnapshot = {
				...snapshotRef.current,
				ok: false,
				error: error instanceof Error ? error.message : "Analysis failed",
				problems: [
					{
						severity: "error",
						message: error instanceof Error ? error.message : "Analysis failed",
						filePath: "",
						line: 0,
					},
				],
			};
			snapshotRef.current = errorSnapshot;

			try {
				localStorage.setItem(
					STORAGE_KEYS.SNAPSHOT,
					JSON.stringify(errorSnapshot),
				);
			} catch {
				// Storage not available
			}
		} finally {
			setLoadingState(false);
		}
	}, []);

	const scheduleDebouncedRefresh = useCallback(() => {
		// Clear existing debounce
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
		}

		// Set up new debounce
		debounceRef.current = setTimeout(
			() => {
				runAnalysis();
			},
			parseInt(
				localStorage.getItem(STORAGE_KEYS.DEBOUNCE_TIMEOUT) ||
					DEFAULT_DEBOUNCE_MS.toString(),
				10,
			),
		);
	}, [runAnalysis]);

	const loadCached = useCallback(async (): Promise<AnalysisSnapshot | null> => {
		try {
			const stored = localStorage.getItem(STORAGE_KEYS.SNAPSHOT);
			if (stored) {
				const snapshot = JSON.parse(stored) as AnalysisSnapshot;
				snapshotRef.current = snapshot;
				return snapshot;
			}
		} catch (error) {
			console.warn("Failed to load cached analysis:", error);
		}
		return null;
	}, []);

	const refresh = useCallback(async () => {
		await runAnalysis();
	}, [runAnalysis]);

	const snapshot = useMemo(() => snapshotRef.current, [snapshotRef]);

	return {
		snapshot,
		loading,
		runAnalysis,
		scheduleDebouncedRefresh,
		loadCached,
		refresh,
		totalCount: snapshot.problems.length,
		errorCount: snapshot.problems.filter((p) => p.severity === 'error').length,
		warningCount: snapshot.problems.filter((p) => p.severity === 'warning').length,
	};
}

export default useWorkspaceStaticAnalysis;
