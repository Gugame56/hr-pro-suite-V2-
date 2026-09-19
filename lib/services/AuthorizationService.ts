// =============================================================================
// AuthorizationService — แปลงจาก permissions.ts + apiGuard.ts
// Role-based access control (canManage, requireManager)
// =============================================================================

import { NextResponse } from 'next/server';

export const MANAGER_ROLES = ['admin', 'manager'] as const;
export type ManagerRole = (typeof MANAGER_ROLES)[number];

export class AuthorizationService {
  private static instance: AuthorizationService;

  private constructor() {}

  static getInstance(): AuthorizationService {
    if (!AuthorizationService.instance) {
      AuthorizationService.instance = new AuthorizationService();
    }
    return AuthorizationService.instance;
  }

  /** True when the role may create/edit/delete managed (setup) data. */
  canManage(role?: string | null): boolean {
    return (MANAGER_ROLES as readonly string[]).includes(
      (role || '').trim().toLowerCase(),
    );
  }

  /** True for the elevated UI bucket (admin + manager share the management UI). */
  isManagement(role?: string | null): boolean {
    return this.canManage(role);
  }

  /** Server-side guard — returns NextResponse 403 if not manager, else null. */
  requireManager(request: Request): NextResponse | null {
    const role = request.headers.get('x-role');
    if (!this.canManage(role)) {
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์ดำเนินการ — เฉพาะ Admin หรือ Manager เท่านั้นที่แก้ไขข้อมูลนี้ได้' },
        { status: 403 },
      );
    }
    return null;
  }
}

// Backward-compatible exports
const _instance = AuthorizationService.getInstance();
export const canManage = _instance.canManage.bind(_instance);
export const isManagement = _instance.isManagement.bind(_instance);
export function requireManager(request: Request) {
  return _instance.requireManager(request);
}
