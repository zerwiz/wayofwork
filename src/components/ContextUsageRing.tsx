/** Thin ring meter: clockwise fill from 12 o'clock; 100% = full loop (Pi-style context window fill). */

const VB = 32;
const C = VB / 2;

export function ContextUsageRing({
	contextFillPct,
	title,
	appearanceDark = true,
	sizePx = 20,
	className = "",
}: {
	/** 0–100 from `chat_usage` / `chatPulseMeters`; null = no reading yet */
	contextFillPct: number | null;
	/** Tooltip (e.g. last prompt vs window) */
	title?: string;
	appearanceDark?: boolean;
	sizePx?: number;
	className?: string;
}) {
	const stroke = 2.75;
	const r = C - stroke / 2 - 0.5;
	const len = 2 * Math.PI * r;
	const pct = contextFillPct == null ? 0 : Math.min(100, Math.max(0, contextFillPct));
	const dashOffset = len * (1 - pct / 100);

	/** Lighter than `#3c3c3c` shells (e.g. ChatPanel composer) so the track stays visible on charcoal inputs. */
	const track = appearanceDark ? "#6e6e6e" : "#d4d4d4";
	/** Same accent as Send / primary actions (`#ea580c`) */
	const arc = "#ea580c";

	const fallbackTip =
		contextFillPct == null
			? "Context usage — updates after each assistant reply completes"
			: `Context window about ${Math.round(pct)}% used`;
	const tip = title?.trim() ? title : fallbackTip;

	return (
		<span
			className={`inline-flex shrink-0 items-center justify-center leading-none ${className}`}
			title={tip}
			role="img"
			aria-label={tip}
			style={{ width: sizePx, height: sizePx, lineHeight: 0 }}
		>
			{/* `block` avoids inline-SVG baseline gap that pushed the arc up inside pill/circle shells */}
			<svg
				className="block h-full w-full shrink-0"
				viewBox={`0 0 ${VB} ${VB}`}
				width="100%"
				height="100%"
				preserveAspectRatio="xMidYMid meet"
				aria-hidden
			>
				<g transform={`rotate(-90 ${C} ${C})`}>
					<circle cx={C} cy={C} r={r} fill="none" stroke={track} strokeWidth={stroke} />
					<circle
						cx={C}
						cy={C}
						r={r}
						fill="none"
						stroke={arc}
						strokeWidth={stroke}
						strokeLinecap="round"
						strokeDasharray={len}
						strokeDashoffset={dashOffset}
					/>
				</g>
			</svg>
		</span>
	);
}
