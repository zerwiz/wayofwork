/** User-insertable prompt for Claw chat — Pi still runs `/telegram-*` in a real Pi session. */
export function clawTelegramSetupChecklist(): string {
	return [
		"Help me finish Telegram setup for Claw using **pi-telegram** (see `docs/WOP_TELEGRAM_PLAN.md`).",
		"",
		"Checklist:",
		"1. Confirm I created a bot with @BotFather and have the token stored only in `~/.pi/agent/telegram.json` (never in git).",
		"2. Confirm `pi-telegram` is installed (`pi install git:github.com/badlogic/pi-telegram`) and listed in `.pi/settings.json` extensions if needed.",
		"3. Walk me through `/telegram-setup`, `/telegram-connect`, and `/telegram-status` in Pi.",
		"4. Update `.claw/workspace/TOOLS.md` with a short note that Telegram is enabled and where the token lives.",
		"5. Remind me of security: one paired user, rotate token via @BotFather if leaked.",
	].join("\n");
}
