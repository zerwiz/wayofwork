/**
 * useShellMobile Hook
 *
 * @description Mobile detection state management for responsive UI adjustments
 * @returns Object with shellMobile boolean state and setter
 *
 * @example
 * ```tsx
 * const { shellMobile, setShellMobile } = useShellMobile();
 * // shellMobile is true when viewport is <= 767px
 * ```
 */
import { useState, useCallback } from "react";

export interface UseShellMobileReturn {
  shellMobile: boolean;
  setShellMobile: (mobile: boolean) => void;
}

// Simple persistent state initialized from localStorage or default
const STORAGE_KEY = "wop-shell-mobile";

export function useShellMobile(): UseShellMobileReturn {
  const [shellMobile, setShellMobileState] = useState<boolean>(() => {
    // Initialize from storage if available, otherwise false
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === "true";
    } catch {
      return false;
    }
  });

  const setShellMobile = useCallback((mobile: boolean) => {
    setShellMobileState(mobile);
    try {
      localStorage.setItem(STORAGE_KEY, String(mobile));
    } catch {
      // Storage might not be available
    }
  }, []);

  return {
    shellMobile,
    setShellMobile,
  };
}
