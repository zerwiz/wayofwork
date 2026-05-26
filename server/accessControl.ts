import { db } from "./db";
import { AuthInfo } from "./router";

export async function checkResourceAccess(
    resourceId: string,
    resourceType: 'kanban_board' | 'workspace_file' | 'document' | 'task',
    auth: AuthInfo,
): Promise<boolean> {
    if (!auth) return false;

    // Admins and Super Admins bypass all checks
    if (auth.role === "ADMIN" || auth.role === "SUPER_ADMIN") {
        return true;
    }

    const resourcePermission = db.query("SELECT * FROM resource_permissions WHERE resource_id = ?").get(resourceId) as any;
    
    // If no permission entry exists, deny access. This ensures explicit permission is required.
    if (!resourcePermission) {
        return false;
    }

    // Check if user is the owner
    if (resourcePermission.owner_id === auth.userId) {
        return true;
    }

    // Check global tenant visibility
    if (resourcePermission.visibility === 'tenant') {
        return true;
    }

    // Check explicit shares
    const isShared = db.query("SELECT 1 FROM resource_shares WHERE resource_id = ? AND shared_with_id = ?").get(resourceId, auth.userId);
    if (isShared) {
        return true;
    }

    // Worker project membership check (only for kanban_board and task)
    if (auth.role === "WORKER" && (resourceType === "kanban_board" || resourceType === "task")) {
        let projectId = resourceId;
        if (resourceType === "task") {
            const task = db.query("SELECT project_id FROM tasks WHERE id = ?").get(resourceId) as { project_id: string } | undefined;
            if (task && task.project_id) {
                projectId = task.project_id;
            } else {
                return false; // Task not associated with a project, worker cannot access
            }
        }
        const isMember = db.query("SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?").get(projectId, auth.userId);
        if (isMember) {
            return true;
        }
    }

    return false; // Deny by default
}
