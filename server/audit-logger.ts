import { db } from "./db";
import { notifyUser } from "./notifications";

export interface AuditLogOptions {
	tenantId: string;
	userId: string;
	action: string;
	resourceType: string;
	resourceId?: string;
	summary?: string;
	ipAddress?: string;
	userAgent?: string;
	details?: any;
}

/**
 * Log a sensitive action or data access for auditing.
 */
export function auditLog(opts: AuditLogOptions): void {
	try {
		const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
		db.query(`
			INSERT INTO audit_logs (id, tenant_id, user_id, action, resource_type, resource_id, summary, ip_address, user_agent, details_json)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`).run(
			id,
			opts.tenantId,
			opts.userId,
			opts.action,
			opts.resourceType,
			opts.resourceId || null,
			opts.summary || null,
			opts.ipAddress || null,
			opts.userAgent || null,
			opts.details ? JSON.stringify(opts.details) : null
		);
	// Send notification for security-critical actions
	if (opts.action.startsWith("security.") || opts.resourceType === "auth") {
		notifyUser({
			tenantId: opts.tenantId,
			userId: opts.userId,
			type: "security",
			severity: "warning",
			title: `Säkerhetshändelse: ${opts.action}`,
			message: opts.summary || `${opts.action} on ${opts.resourceType}`,
			link: "/admin/audit-logs",
		}).catch(() => {});
	}
  } catch (e) {
    console.error("[audit-logger] Failed to log audit entry:", e);
  }
}
