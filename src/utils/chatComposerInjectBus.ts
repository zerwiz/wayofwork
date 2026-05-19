/** Single active listener — Simple and Technical shells mount one chat composer at a time. */
type InjectFn = (text: string) => void;

let listener: InjectFn | null = null;
/** When nothing is mounted yet (e.g. inject from Help before Chat tab mounts), flush on register. */
let pending: string | null = null;

export function registerChatComposerInject(fn: InjectFn | null): void {
	listener = fn;
	if (fn && pending) {
		const t = pending;
		pending = null;
		fn(t);
	}
}

export function injectIntoChatComposer(text: string): void {
	const t = text.trim();
	if (!t) return;
	if (listener) listener(t);
	else pending = t;
}
