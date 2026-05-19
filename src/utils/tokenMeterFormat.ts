/** Match Pi footer / `extensions/footer-context-stats.ts` compact style. */
export function fmtTok(n: number): string {
	if (n < 1000) return `${Math.round(n)}`;
	if (n < 1_000_000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`;
	return `${(n / 1_000_000).toFixed(2)}M`;
}

/** Pi `extensions/minimal.ts` — 10-segment `#`/`-` bar from percent 0–100. */
export function contextMeterBlocks(pct: number): string {
	const filled = Math.round(Math.max(0, Math.min(100, pct)) / 10);
	const f = Math.min(10, Math.max(0, filled || (pct > 0 ? 1 : 0)));
	return "#".repeat(f) + "-".repeat(10 - f);
}
