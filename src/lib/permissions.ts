export type Permission =
  | "projects:create" | "projects:edit" | "projects:delete"
  | "tasks:create"    | "tasks:edit"    | "tasks:delete"    | "tasks:assign"
  | "users:manage"    | "roles:manage"
  | "channels:manage"
  | "meetings:manage"
  | "documents:manage"
  | "attendance:view_all" | "attendance:manage"
  | "admin:access"    | "settings:access"
  | "analytics:view";

export const ALL_PERMISSIONS: { id: Permission; label: string; category: string; description: string }[] = [
  // Projects
  { id: "projects:create", label: "Create Projects",    category: "Projects",   description: "Create new projects" },
  { id: "projects:edit",   label: "Edit Projects",      category: "Projects",   description: "Edit project details and settings" },
  { id: "projects:delete", label: "Delete Projects",    category: "Projects",   description: "Permanently delete projects" },
  // Tasks
  { id: "tasks:create",    label: "Create Tasks",       category: "Tasks",      description: "Create tasks in any project" },
  { id: "tasks:edit",      label: "Edit Tasks",         category: "Tasks",      description: "Edit task details, status and priority" },
  { id: "tasks:delete",    label: "Delete Tasks",       category: "Tasks",      description: "Delete tasks from projects" },
  { id: "tasks:assign",    label: "Assign Tasks",       category: "Tasks",      description: "Assign tasks to team members" },
  // Users & Roles
  { id: "users:manage",    label: "Manage Users",       category: "Users",      description: "Create, edit and deactivate users" },
  { id: "roles:manage",    label: "Manage Roles",       category: "Users",      description: "Create roles and assign permissions" },
  // Collaboration
  { id: "channels:manage", label: "Manage Channels",   category: "Collaboration", description: "Create and delete chat channels" },
  { id: "meetings:manage", label: "Manage Meetings",   category: "Collaboration", description: "Edit and cancel any meeting" },
  { id: "documents:manage",label: "Manage Documents",  category: "Collaboration", description: "Edit and delete any document" },
  // Attendance
  { id: "attendance:view_all", label: "View All Attendance", category: "Attendance", description: "See attendance records for all users" },
  { id: "attendance:manage",   label: "Manage Attendance",   category: "Attendance", description: "Approve, reject and edit attendance" },
  // System
  { id: "admin:access",    label: "Admin Panel",        category: "System",     description: "Access the admin control panel" },
  { id: "settings:access", label: "System Settings",    category: "System",     description: "Change workspace-wide settings" },
  { id: "analytics:view",  label: "View Analytics",     category: "System",     description: "Access analytics and reports" },
];

export const PERMISSION_CATEGORIES = ALL_PERMISSIONS.reduce<string[]>((acc, p) => {
  if (!acc.includes(p.category)) acc.push(p.category);
  return acc;
}, []);

// Default permissions for the 4 system roles
export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  OWNER: ALL_PERMISSIONS.map((p) => p.id),
  ADMIN: [
    "projects:create", "projects:edit", "projects:delete",
    "tasks:create",    "tasks:edit",    "tasks:delete",    "tasks:assign",
    "users:manage",
    "channels:manage", "meetings:manage", "documents:manage",
    "attendance:view_all", "attendance:manage",
    "admin:access",    "settings:access", "analytics:view",
  ],
  MANAGER: [
    "projects:create", "projects:edit",
    "tasks:create",    "tasks:edit",    "tasks:delete",    "tasks:assign",
    "channels:manage", "meetings:manage",
    "attendance:view_all",
    "analytics:view",
  ],
  MEMBER: [
    "tasks:create", "tasks:edit",
  ],
};

export function hasPermission(role: string | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return (DEFAULT_ROLE_PERMISSIONS[role] ?? []).includes(permission);
}

export function can(role: string | undefined | null, ...permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Resolves the full permission list for a role.
 * For system roles (OWNER/ADMIN/MANAGER/MEMBER) uses the static map.
 * For custom roles, queries the database by role name + org.
 */
export async function resolveRolePermissions(
  role: string,
  orgId: string
): Promise<Permission[]> {
  if (DEFAULT_ROLE_PERMISSIONS[role]) {
    return DEFAULT_ROLE_PERMISSIONS[role];
  }
  // Custom role — look up from DB
  try {
    const { prisma } = await import("@/lib/prisma");
    const customRole = await prisma.role.findFirst({
      where: { name: role, organizationId: orgId },
      select: { permissions: true },
    });
    if (customRole?.permissions) {
      const parsed = JSON.parse(customRole.permissions) as Permission[];
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {}
  return DEFAULT_ROLE_PERMISSIONS["MEMBER"]; // safe fallback
}

/**
 * Async permission check that correctly handles custom DB-defined roles.
 * Use this in API route guards instead of hasPermission().
 */
export async function hasPermissionAsync(
  role: string | undefined | null,
  orgId: string,
  permission: Permission
): Promise<boolean> {
  if (!role) return false;
  const perms = await resolveRolePermissions(role, orgId);
  return perms.includes(permission);
}

export const ROLES = ["OWNER", "ADMIN", "MANAGER", "MEMBER"] as const;
export type UserRole = (typeof ROLES)[number];

export const ROLE_LABELS: Record<string, { label: string; color: string; description: string }> = {
  OWNER:   { label: "Owner",   color: "#A78BFA", description: "Full access to everything" },
  ADMIN:   { label: "Admin",   color: "#60A5FA", description: "Manage users and all resources" },
  MANAGER: { label: "Manager", color: "#34D399", description: "Manage projects and assign tasks" },
  MEMBER:  { label: "Member",  color: "#6B7280", description: "Create and edit own tasks" },
};
