/**
 * Shared 5-field cron matching (local time). Used by Claw Schedules UI calendar
 * and the Bun scheduler for Phase D execution.
 */

function splitCron(
  expr: string,
): [string, string, string, string, string] | null {
  const parts = expr.trim().split(/\s+/).filter(Boolean);
  if (parts.length !== 5) return null;
  return parts as [string, string, string, string, string];
}

const MAX_CRON_LIST_DEPTH = 48;

function matchField(
  spec: string,
  value: number,
  min: number,
  max: number,
  depth: number = 0,
): boolean {
  if (depth > MAX_CRON_LIST_DEPTH) return false;
  const s = spec.trim();
  if (s === "*" || s === "?") return true;

  if (s.includes(",")) {
    return s
      .split(",")
      .some((p) => matchField(p.trim(), value, min, max, depth + 1));
  }

  let step = 1;
  let baseSpec = s;
  if (s.includes("/")) {
    const [left, stepStr] = s.split("/");
    baseSpec = left ?? "*";
    step = Number.parseInt(stepStr ?? "1", 10);
    if (!Number.isFinite(step) || step < 1) return false;
  }

  const inBase = (() => {
    if (baseSpec === "*" || baseSpec === "?")
      return value >= min && value <= max;
    if (baseSpec.includes("-")) {
      const [loS, hiS] = baseSpec.split("-");
      const lo = Number.parseInt(loS?.trim() ?? "", 10);
      const hi = Number.parseInt(hiS?.trim() ?? "", 10);
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) return false;
      return value >= lo && value <= hi;
    }
    const n = Number.parseInt(baseSpec, 10);
    if (!Number.isFinite(n)) return false;
    return n === value;
  })();
  if (!inBase) return false;
  if (step === 1) return true;

  if (baseSpec === "*" || baseSpec === "?") {
    return (value - min) % step === 0;
  }
  if (baseSpec.includes("-")) {
    const lo = Number.parseInt(baseSpec.split("-")[0]?.trim() ?? "", 10);
    if (!Number.isFinite(lo)) return false;
    return (value - lo) % step === 0;
  }
  const n = Number.parseInt(baseSpec, 10);
  if (!Number.isFinite(n)) return false;
  return (value - n) % step === 0;
}

function normalizeCronDowField(dowS: string): string {
  return dowS
    .split(",")
    .map((t) => (t.trim() === "7" ? "0" : t.trim()))
    .join(",");
}

/** True if `cronExpr` (5-field, local) matches this exact minute of `dt`. */
export function cronMatchesInstant(cronExpr: string, dt: Date): boolean {
  try {
    if (typeof cronExpr !== "string" || !cronExpr.trim()) return false;
    if (!(dt instanceof Date) || Number.isNaN(dt.getTime())) return false;
    const parts = splitCron(cronExpr);
    if (!parts) return false;
    const [minS, hourS, domS, monthS, dowS] = parts;
    if (!matchField(minS, dt.getMinutes(), 0, 59)) return false;
    if (!matchField(hourS, dt.getHours(), 0, 23)) return false;
    if (!matchField(domS, dt.getDate(), 1, 31)) return false;
    if (!matchField(monthS, dt.getMonth() + 1, 1, 12)) return false;
    if (!matchField(normalizeCronDowField(dowS), dt.getDay(), 0, 6))
      return false;
    return true;
  } catch {
    return false;
  }
}

export { splitCron, matchField, normalizeCronDowField };
