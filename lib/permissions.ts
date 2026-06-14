// Single source of truth for role-based access.
//
// The app has three roles: `admin`, `manager`, and `employee` (legacy rows may
// also use `user`, treated as an employee). Admin and Manager are the only roles
// allowed to create / edit / delete the master & setup data in the system
// (departments, positions, shifts, benefits catalogue, assets, training, …).
// Everyone else is view-only on that data.
//
// Self-service requests an employee makes for themselves — leave, attendance
// check-in, document requests, resignation — are NOT gated by this and stay
// writable by employees on their own routes.
//
// This module is intentionally framework-free (no React, no next/server) so it
// can be imported from both client components and API route handlers. The server
// guard lives in `lib/apiGuard.ts`; the client hook in `lib/useCanManage.ts`.

export const MANAGER_ROLES = ['admin', 'manager'] as const;

export type ManagerRole = (typeof MANAGER_ROLES)[number];

/** True when the role may create/edit/delete managed (setup) data. */
export function canManage(role?: string | null): boolean {
  return (MANAGER_ROLES as readonly string[]).includes((role || '').trim().toLowerCase());
}

/** True for the elevated UI bucket (admin + manager share the management UI). */
export function isManagement(role?: string | null): boolean {
  return canManage(role);
}
