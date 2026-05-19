import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "wayofpi.shell.mobile";

function readShellFromSearch(params: URLSearchParams): boolean | null {
	const raw = params.get("shell");
	if (raw == null) return null;
	const v = raw.trim().toLowerCase();
	if (v === "mobile" || v === "1" || v === "true") return true;
	if (v === "desktop" || v === "0" || v === "false") return false;
	return null;
}

function pathnameImpliesMobile(pathname: string): boolean {
	const p = pathname.replace(/\/+$/, "") || "/";
	return p === "/m";
}

function readInitialShellMobile(): boolean {
	if (typeof window === "undefined") return false;
	try {
		const u = new URL(window.location.href);
		const fromQuery = readShellFromSearch(u.searchParams);
		if (fromQuery !== null) return fromQuery;
		if (pathnameImpliesMobile(u.pathname)) return true;
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored === "1" || stored === "true";
	} catch {
		return false;
	}
}

function writeStored(next: boolean) {
	try {
		localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
	} catch {
		/* ignore */
	}
}

function syncUrlToShellMobile(next: boolean) {
	try {
		const u = new URL(window.location.href);
		if (!next && pathnameImpliesMobile(u.pathname)) {
			u.pathname = "/";
		}
		if (next) {
			u.searchParams.set("shell", "mobile");
		} else {
			u.searchParams.delete("shell");
		}
		window.history.replaceState({}, "", u.toString());
	} catch {
		/* ignore */
	}
}

export function useShellMobile() {
	const [shellMobile, setShellMobileState] = useState<boolean>(readInitialShellMobile);

	/** Persist explicit `?shell=` and `/m` once so the next visit can restore without the query string. */
	useEffect(() => {
		try {
			const u = new URL(window.location.href);
			const fromQ = readShellFromSearch(u.searchParams);
			if (fromQ === true || pathnameImpliesMobile(u.pathname)) writeStored(true);
			else if (fromQ === false) writeStored(false);
		} catch {
			/* ignore */
		}
	}, []);

	const setShellMobile = useCallback((next: boolean) => {
		setShellMobileState(next);
		writeStored(next);
		syncUrlToShellMobile(next);
	}, []);

	const api = useMemo(
		() => ({
			shellMobile,
			setShellMobile,
		}),
		[shellMobile, setShellMobile],
	);

	return api;
}
