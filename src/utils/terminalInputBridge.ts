/** Lets menus / shortcuts inject bytes into the active PTY (EmbeddedTerminal registers). */
type TerminalInSender = (data: string) => void;

let sender: TerminalInSender | null = null;

export function registerTerminalInputSender(fn: TerminalInSender | null): void {
	sender = fn;
}

/** Send raw keystrokes to the shell (include `\r` to run a line). Returns false if no terminal session. */
export function sendTerminalInput(data: string): boolean {
	if (!sender) return false;
	sender(data);
	return true;
}
