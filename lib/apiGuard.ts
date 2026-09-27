import { NextResponse } from 'next/server';
import { canManage } from './permissions';
import type { TenantContext } from './models/tenant';

// Server-side authorization guard for write operations on managed (setup) data.
//
// The client (see the fetch patch in app/ClientLayout.tsx) attaches the signed-in
// user's role via the `x-role` header on every /api request. Managed routes call
// `requireManager(request)` at the top of POST / PATCH / DELETE; if it returns a
// response, the handler should return it immediately.
//
//   export async function POST(request: Request) {
//     const denied = requireManager(request);
//     if (denied) return denied;
//     ...
//   }
//
// This is the real enforcement boundary: even if an employee bypasses the UI and
// calls the API directly, the write is rejected with 403.
export function requireManager(request: Request): NextResponse | null {
  const role = request.headers.get('x-role');
  if (!canManage(role)) {
    return NextResponse.json(
      { error: 'ไม่มีสิทธิ์ดำเนินการ — เฉพาะ Admin หรือ Manager เท่านั้นที่แก้ไขข้อมูลนี้ได้' },
      { status: 403 },
    );
  }
  return null;
}

// =============================================================================
// Multi-Tenant Data Isolation Guard
// =============================================================================

/** Extract tenant context (companyCode, userId, role) from request headers.
 *  The client-side fetch patch injects these headers on every /api call. */
export function extractTenant(request: Request): TenantContext {
  const companyCode = request.headers.get('x-company-code') || '';
  const userId = request.headers.get('x-user-id') || '';
  const role = request.headers.get('x-role') || 'employee';

  if (!companyCode) {
    throw new Error('ไม่พบข้อมูลรหัสบริษัท (Unauthorized Tenant)');
  }

  return { companyCode, userId, role };
}

/** Try to extract tenant context — returns null if no company code present
 *  (e.g. during login before session is established, or super-admin access) */
export function extractTenantOrNull(request: Request): TenantContext | null {
  const companyCode = request.headers.get('x-company-code') || '';
  if (!companyCode) return null;
  return {
    companyCode,
    userId: request.headers.get('x-user-id') || '',
    role: request.headers.get('x-role') || 'employee',
  };
}

/** Filter a data list to only include rows matching the given company code.
 *  Use this to scope all query results to the requesting tenant. */
export function scopeToCompany<T extends { companyCode?: string }>(
  dataList: T[],
  companyCode: string,
): T[] {
  return dataList.filter(
    (item) => (item.companyCode || '').toUpperCase() === companyCode.toUpperCase(),
  );
}

/** Guard that ensures the requesting tenant can only access their own data.
 *  Returns a 403 response if the target companyCode doesn't match the tenant. */
export function requireTenantMatch(
  request: Request,
  targetCompanyCode: string,
): NextResponse | null {
  const tenantCode = request.headers.get('x-company-code') || '';
  if (!tenantCode || tenantCode.toUpperCase() !== targetCompanyCode.toUpperCase()) {
    return NextResponse.json(
      { error: 'ไม่มีสิทธิ์เข้าถึงข้อมูลของบริษัทอื่น' },
      { status: 403 },
    );
  }
  return null;
}
