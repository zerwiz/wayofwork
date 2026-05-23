import { db } from "./db";

export type Permission = "read" | "write";

/**
 * Checks if a user has specific access to a resource.
 * 
 * Rules:
 * 1. If visibility is 'tenant', all users in the tenant have access (permission checked via RBAC/Admin status).
 * 2. If visibility is 'private', only owner has access.
 * 3. If visibility is 'shared', check resource_shares.
 */
export function hasResourceAccess(
    userId: string,
    tenantId: string,
    resourceId: string,
    permission: Permission
): boolean {
    const perm = db.query(`
        SELECT rp.*, rs.permission as share_permission
        FROM resource_permissions rp
        LEFT JOIN resource_shares rs ON rp.resource_id = rs.resource_id AND rs.shared_with_id = ?
        WHERE rp.resource_id = ?
    `).get(userId, resourceId) as { 
        owner_id: string; 
        visibility: string; 
        share_permission?: string 
    } | undefined;

    if (!perm) return false; // Resource not found or not mapped

    // 1. Owner always has full access
    if (perm.owner_id === userId) return true;

    // 2. Tenant-wide visibility
    if (perm.visibility === 'tenant') return true; 

    // 3. Private - no access if not owner (already checked)
    if (perm.visibility === 'private') return false;

    // 4. Shared access
    if (perm.visibility === 'shared') {
        if (!perm.share_permission) return false;
        if (permission === 'write' && perm.share_permission !== 'write') return false;
        return true;
    }

    return false;
}
