// Staff roles are allowed to use the admin interface.
// The USER role represents a normal end user / visitor with no admin access.
export const STAFF_ROLES = [
  "SUPERADMIN",
  "ADMIN",
  "MANAGER",
  "STOREKEEPER",
  "PRODUCTION",
  "QC",
  "PURCHASE",
  "VIEWER",
];

// Only admins (and super admins) manage users and settings.
export const ADMIN_ROLES = ["SUPERADMIN", "ADMIN"];

export function isStaffRole(role: string): boolean {
  return STAFF_ROLES.includes(role);
}

export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role);
}

export const ROLE_LABELS: Record<string, string> = {
  USER: "Customer / Visitor",
  VIEWER: "Viewer",
  PURCHASE: "Purchase",
  QC: "Quality Control",
  PRODUCTION: "Production",
  STOREKEEPER: "Storekeeper",
  MANAGER: "Manager",
  ADMIN: "Admin",
  SUPERADMIN: "Super Admin",
};