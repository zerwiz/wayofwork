/**
 * useMaxWidthMediaQuery Hook
 *
 * @description Manages responsive breakpoint state based on CSS media queries
 * @param maxPixels - Maximum width in pixels for the breakpoint
 *
 * @returns Object containing current breakpoint state and optional resize handlers
 *
 * @example
 * ```tsx
 * const { isAtMaxWidth, onWidth } = useMaxWidthMediaQuery(576);
 * if (isAtMaxWidth) {
 *   // render mobile UI
 * }
 * onWidth(false);
 * ```
 */

import { useState, useEffect } from "react";

export interface UseMaxWidthMediaQueryReturn {
	isAtMaxWidth: boolean;
}

export function useMaxWidthMediaQuery(
	maxPixels: number,
): UseMaxWidthMediaQueryReturn {
	const [isAtMaxWidth, setIsAtMaxWidth] = useState(() => {
		try {
			return window.matchMedia(`(max-width: ${maxPixels}px)`).matches;
		} catch {
			return false;
		}
	});

	useEffect(() => {
		const handleResize = () => {
			try {
				setIsAtMaxWidth(
					window.matchMedia(`(max-width: ${maxPixels}px)`).matches,
				);
			} catch {
				// Ignore matchMedia errors
			}
		};

		// Handle initial setup
		handleResize();

		// Listen for window resize events
		try {
			window.addEventListener("resize", handleResize);
		} catch {
			// Ignore addEventListener errors
		}

		// Cleanup on unmount
		return () => {
			try {
				window.removeEventListener("resize", handleResize);
			} catch {
				// Ignore removeEventListener errors
			}
		};
	}, [maxPixels]);

	return {
		isAtMaxWidth,
	};
}
