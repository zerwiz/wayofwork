/** Match Simple + Technical chat: append pasted file text for Pi-style context (no native tools in web). */
export const MAX_CHAT_ATTACHMENT_CHARS = 120_000;

export function buildChatMessageWithAttachment(
	body: string,
	attachment: { name: string; text: string } | null,
): string {
	const t = body.trim();
	if (attachment) {
		const block = `\n\n---\n[attachment: ${attachment.name}]\n${attachment.text}`;
		return t ? t + block : block.trim();
	}
	return t;
}
