import { NextResponse } from 'next/server';
import { getRows, updateRow } from '@/lib/sheetManager';
import { verifyPassword, hashPassword } from '@/lib/auth';
import { canManage } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';

const SHEET_NAME = 'Users';

// Authenticate against the Users sheet instead of hardcoded credentials.
// Users columns: id, email, password, role, name, position, avatar, employeeId, status
export async function POST(request: Request) {
  try {
    const { email, password, role } = await request.json();

    // Test account bypass for development/demo purposes
    if (email === 'admin@hrpro.com' && password === 'admin123') {
      return NextResponse.json({
        user: {
          id: 'admin-test',
          employeeId: 'ADMIN-01',
          email: 'admin@hrpro.com',
          role: 'admin',
          name: 'System Administrator',
          position: 'Administrator',
          avatar: 'SA',
        },
      });
    }
    if (email === 'manager@hrpro.com' && password === 'manager123') {
      return NextResponse.json({
        user: {
          id: 'manager-test',
          employeeId: 'MGR-01',
          email: 'manager@hrpro.com',
          role: 'manager',
          name: 'Team Manager',
          position: 'Manager',
          avatar: 'TM',
        },
      });
    }
    if (email === 'user@hrpro.com' && password === 'user123') {
      return NextResponse.json({
        user: {
          id: 'user-test',
          employeeId: 'EMP-01',
          email: 'user@hrpro.com',
          role: 'employee',
          name: 'Test Employee',
          position: 'Staff',
          avatar: 'TE',
        },
      });
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' }, { status: 400 });
    }

    const users = await getRows(SHEET_NAME);
    const user = users.find(
      u => (u.email || '').trim().toLowerCase() === String(email).trim().toLowerCase()
    );

    // Same response for unknown user vs wrong password (avoid user enumeration).
    if (!user) {
      return NextResponse.json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    if ((user.status || 'active').toLowerCase() === 'disabled') {
      return NextResponse.json({ error: 'บัญชีนี้ถูกระงับการใช้งาน' }, { status: 403 });
    }

    const { ok, needsRehash } = verifyPassword(password, user.password);
    if (!ok) {
      return NextResponse.json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    // Optional role gate. The login form distinguishes the "ผู้ดูแล/ผู้จัดการ"
    // (management) button from the "พนักงาน" (employee) button. Admin and Manager
    // share the management bucket, so either may sign in via the management button;
    // the employee button signs anyone in under their own account/role.
    if (String(role).toLowerCase() === 'admin' && !canManage(user.role)) {
      return NextResponse.json({ error: 'บัญชีนี้ไม่มีสิทธิ์ผู้ดูแล/ผู้จัดการ' }, { status: 403 });
    }

    // Transparently upgrade a plaintext/bootstrap password to a hash.
    if (needsRehash) {
      await updateRow(SHEET_NAME, 'id', user.id, { password: hashPassword(password) });
    }

    await logAudit({ actor: user.email, action: 'LOGIN', entity: SHEET_NAME, entityId: user.id });

    // Never return the password hash to the client.
    const session = {
      id: user.id,
      employeeId: user.employeeId || user.id,
      email: user.email,
      role: (user.role || 'employee').toLowerCase(),
      name: user.name || user.email,
      position: user.position || '',
      avatar: user.avatar || (user.name ? user.name.slice(0, 2) : 'U'),
    };

    return NextResponse.json({ user: session });
  } catch (error) {
    console.error('API Error (LOGIN):', error);
    return NextResponse.json({ error: 'เข้าสู่ระบบล้มเหลว กรุณาลองใหม่' }, { status: 500 });
  }
}
