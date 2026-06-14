import { NextResponse } from 'next/server';
import { canManage } from './permissions';

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
