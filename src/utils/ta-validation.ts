export interface TAValidationContext {
  speed_limit: number | null;
  traffic_volume_adt: number | null;
  work_type: string;
}

export interface ValidationIssue {
  severity: "error" | "warning" | "info";
  message: string;
  field?: string;
  tdokReference?: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
}

/**
 * Validates a Traffic Arrangement (TA) plan against TDOK 2024:0043 regulations.
 * This is a simplified engine that covers core rules based on speed, volume, and work type.
 */
export function validateTAPlan(context: TAValidationContext): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Rule 1: Missing critical data
  if (!context.speed_limit) {
    issues.push({
      severity: "error",
      message: "Hastighetsgräns (Speed limit) is required for compliance checks.",
      field: "speed_limit",
    });
  }
  
  if (context.traffic_volume_adt === null || context.traffic_volume_adt === undefined) {
    issues.push({
      severity: "error",
      message: "ÅDT (Traffic Volume) is required for compliance checks.",
      field: "traffic_volume_adt",
    });
  }

  // If missing core data, return early as we can't perform complex checks
  if (issues.length > 0) {
    return { isValid: false, issues };
  }

  const speed = context.speed_limit!;
  const adt = context.traffic_volume_adt || 0;

  // Rule 2: High-speed road requirements (≥ 80 km/h)
  if (speed >= 80) {
    if (context.work_type === "moving") {
      issues.push({
        severity: "error",
        message: "Moving workplaces on roads ≥ 80 km/h require TMA (Truck Mounted Attenuator).",
        tdokReference: "TDOK 2024:0043, kap 5.2",
      });
    }

    if (adt > 2000) {
      issues.push({
        severity: "warning",
        message: "High traffic volume (>2000 ADT) on high-speed road. Consider working during night or off-peak hours.",
        tdokReference: "TDOK 2024:0043, kap 4.1",
      });
    }
  }

  // Rule 3: Urban/low-speed requirements (≤ 50 km/h)
  if (speed <= 50) {
    issues.push({
      severity: "info",
      message: "Ensure safe passage for pedestrians and cyclists (GC-trafik) is maintained.",
      tdokReference: "TDOK 2024:0043, kap 6.3",
    });
  }

  // Rule 4: Intermittent work limitations
  if (context.work_type === "intermittent") {
    if (speed > 60) {
      issues.push({
        severity: "warning",
        message: "Intermittent work on roads > 60 km/h should be avoided if possible. Strictly limit exposure time.",
      });
    }
  }

  const hasErrors = issues.some((i) => i.severity === "error");

  return {
    isValid: !hasErrors,
    issues,
  };
}
