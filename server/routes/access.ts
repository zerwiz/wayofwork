import { json } from "../utils";
import { db } from "../db";
import type { Router } from "../router";
import { auditLog } from "../audit-logger";
import { checkResourceAccess } from "../accessControl";

export function registerAccessRoutes(router: Router) {
    // Route to change resource visibility
    router.put("/api/access/:resourceId/visibility", async (req, params, auth) => {
        if (!auth) return json({ error: "Unauthorized" }, 401);

        const resourceId = params.resourceId;
        let body: { visibility?: 'private' | 'shared' | 'tenant' };
        try {
            body = await req.json();
        } catch {
            return json({ error: "Invalid JSON" }, 400);
        }

        if (!body.visibility || !['private', 'shared', 'tenant'].includes(body.visibility)) {
            return json({ error: "Invalid visibility value" }, 400);
        }

        try {
            const resourcePermission = db.query("SELECT * FROM resource_permissions WHERE resource_id = ?").get(resourceId) as any;
            if (!resourcePermission) {
                return json({ error: "Resource permission not found" }, 404);
            }

            // Only the owner or an ADMIN/SUPER_ADMIN can change visibility
            if (resourcePermission.owner_id !== auth.userId && auth.role !== "ADMIN" && auth.role !== "SUPER_ADMIN") {
                auditLog({
                    tenantId: auth.tenantId,
                    userId: auth.userId,
                    action: "ACCESS_DENIED",
                    resourceType: "resource_permission",
                    resourceId: resourceId,
                    summary: `User attempted to change visibility without ownership/admin rights`
                });
                return json({ error: "Forbidden" }, 403);
            }

            db.query("UPDATE resource_permissions SET visibility = ?, updated_at = datetime('now') WHERE resource_id = ?").run(body.visibility, resourceId);
            auditLog({
                tenantId: auth.tenantId,
                userId: auth.userId,
                action: "CHANGE_VISIBILITY",
                resourceType: "resource",
                resourceId: resourceId,
                summary: `Changed resource visibility to ${body.visibility}`
            });
            return json({ ok: true });
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            return json({ error: "Failed to update resource visibility", details: message }, 500);
        }
    });

    // Route to add a share for a resource
    router.post("/api/access/:resourceId/share", async (req, params, auth) => {
        if (!auth) return json({ error: "Unauthorized" }, 401);

        const resourceId = params.resourceId;
        let body: { sharedWithId?: string; permission?: 'read' | 'write' };
        try {
            body = await req.json();
        } catch {
            return json({ error: "Invalid JSON" }, 400);
        }

        if (!body.sharedWithId) {
            return json({ error: "sharedWithId required" }, 400);
        }
        if (!body.permission || !['read', 'write'].includes(body.permission)) {
            return json({ error: "Invalid permission value" }, 400);
        }

        try {
            const resourcePermission = db.query("SELECT * FROM resource_permissions WHERE resource_id = ?").get(resourceId) as any;
            if (!resourcePermission) {
                return json({ error: "Resource permission not found" }, 404);
            }

            // Only the owner or an ADMIN/SUPER_ADMIN can add shares
            if (resourcePermission.owner_id !== auth.userId && auth.role !== "ADMIN" && auth.role !== "SUPER_ADMIN") {
                auditLog({
                    tenantId: auth.tenantId,
                    userId: auth.userId,
                    action: "ACCESS_DENIED",
                    resourceType: "resource_share",
                    resourceId: resourceId,
                    summary: `User attempted to add share without ownership/admin rights`
                });
                return json({ error: "Forbidden" }, 403);
            }

            // Check if user to be shared with exists in the tenant
            const sharedWithUser = db.query("SELECT id FROM users WHERE id = ? AND tenant_id = ?").get(body.sharedWithId, auth.tenantId);
            if (!sharedWithUser) {
                return json({ error: "User to share with not found in tenant" }, 404);
            }

            db.query(`
                INSERT INTO resource_shares (resource_id, shared_with_id, permission)
                VALUES (?, ?, ?)
                ON CONFLICT(resource_id, shared_with_id) DO UPDATE SET permission = excluded.permission
            `).run(resourceId, body.sharedWithId, body.permission);

            auditLog({
                tenantId: auth.tenantId,
                userId: auth.userId,
                action: "ADD_RESOURCE_SHARE",
                resourceType: "resource",
                resourceId: resourceId,
                summary: `Shared resource with user ${body.sharedWithId} with ${body.permission} permission`
            });
            return json({ ok: true });
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            return json({ error: "Failed to add resource share", details: message }, 500);
        }
    });

    // Route to remove a share for a resource
    router.delete("/api/access/:resourceId/share/:sharedWithId", async (_req, params, auth) => {
        if (!auth) return json({ error: "Unauthorized" }, 401);

        const resourceId = params.resourceId;
        const sharedWithId = params.sharedWithId;

        try {
            const resourcePermission = db.query("SELECT * FROM resource_permissions WHERE resource_id = ?").get(resourceId) as any;
            if (!resourcePermission) {
                return json({ error: "Resource permission not found" }, 404);
            }

            // Only the owner or an ADMIN/SUPER_ADMIN can remove shares
            if (resourcePermission.owner_id !== auth.userId && auth.role !== "ADMIN" && auth.role !== "SUPER_ADMIN") {
                auditLog({
                    tenantId: auth.tenantId,
                    userId: auth.userId,
                    action: "ACCESS_DENIED",
                    resourceType: "resource_share",
                    resourceId: resourceId,
                    summary: `User attempted to remove share without ownership/admin rights`
                });
                return json({ error: "Forbidden" }, 403);
            }

            db.query("DELETE FROM resource_shares WHERE resource_id = ? AND shared_with_id = ?").run(resourceId, sharedWithId);
            auditLog({
                tenantId: auth.tenantId,
                userId: auth.userId,
                action: "REMOVE_RESOURCE_SHARE",
                resourceType: "resource",
                resourceId: resourceId,
                summary: `Removed resource share with user ${sharedWithId}`
            });
            return json({ ok: true });
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            return json({ error: "Failed to remove resource share", details: message }, 500);
        }
    });

    // Route to get all shares for a resource
    router.get("/api/access/:resourceId/shares", async (_req, params, auth) => {
        if (!auth) return json({ error: "Unauthorized" }, 401);

        const resourceId = params.resourceId;

        try {
            const resourcePermission = db.query("SELECT * FROM resource_permissions WHERE resource_id = ?").get(resourceId) as any;
            if (!resourcePermission) {
                return json({ error: "Resource permission not found" }, 404);
            }

            // Only the owner or an ADMIN/SUPER_ADMIN can view shares
            if (resourcePermission.owner_id !== auth.userId && auth.role !== "ADMIN" && auth.role !== "SUPER_ADMIN") {
                auditLog({
                    tenantId: auth.tenantId,
                    userId: auth.userId,
                    action: "ACCESS_DENIED",
                    resourceType: "resource_share",
                    resourceId: resourceId,
                    summary: `User attempted to view shares without ownership/admin rights`
                });
                return json({ error: "Forbidden" }, 403);
            }

            const shares = db.query(`
                SELECT rs.shared_with_id, u.username, u.full_name, rs.permission
                FROM resource_shares rs
                JOIN users u ON rs.shared_with_id = u.id
                WHERE rs.resource_id = ?
            `).all(resourceId) as any[];

            return json(shares || []);
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            return json({ error: "Failed to fetch resource shares", details: message }, 500);
        }
    });

    // Route to get a single resource's permission details
    router.get("/api/access/:resourceId/permissions", async (_req, params, auth) => {
        if (!auth) return json({ error: "Unauthorized" }, 401);

        const resourceId = params.resourceId;

        try {
            const resourcePermission = db.query("SELECT * FROM resource_permissions WHERE resource_id = ?").get(resourceId) as any;
            if (!resourcePermission) {
                return json({ error: "Resource permission not found" }, 404);
            }
            
            // For now, only owner and admins can view the full permission details
            if (resourcePermission.owner_id !== auth.userId && auth.role !== "ADMIN" && auth.role !== "SUPER_ADMIN") {
                auditLog({
                    tenantId: auth.tenantId,
                    userId: auth.userId,
                    action: "ACCESS_DENIED",
                    resourceType: "resource_permission_view",
                    resourceId: resourceId,
                    summary: `User attempted to view resource permission details without ownership/admin rights`
                });
                return json({ error: "Forbidden" }, 403);
            }

            return json(resourcePermission);
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            return json({ error: "Failed to fetch resource permission details", details: message }, 500);
        }
    });
}
