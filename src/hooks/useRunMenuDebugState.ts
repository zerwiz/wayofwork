import { useCallback, useState } from "react";

/**
 * Run menu breakpoint toggles (gutter / F9) and a lightweight **terminal debug session**
 * (Node/Bun inspector or Python pdb) so Stop / Restart and pdb stepping can be wired.
 */
export function useRunMenuDebugState() {
	const [breakpointsByPath, setBreakpointsByPath] = useState<Record<string, number[]>>({});
	const [allBreakpointsDisabled, setAllBreakpointsDisabled] = useState(false);
	const [debugSession, setDebugSession] = useState<null | { repl: boolean }>(null);

	const beginDebugSession = useCallback((repl: boolean) => {
		setDebugSession({ repl });
	}, []);
	const endDebugSession = useCallback(() => {
		setDebugSession(null);
	}, []);

	return {
		breakpointsByPath,
		setBreakpointsByPath,
		allBreakpointsDisabled,
		setAllBreakpointsDisabled,
		debugSessionActive: debugSession !== null,
		debugReplSession: debugSession?.repl ?? false,
		beginDebugSession,
		endDebugSession,
	};
}
