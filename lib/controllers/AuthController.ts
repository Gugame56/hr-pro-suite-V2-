// =============================================================================
// AuthController — แปลงจาก app/api/auth/login/route.ts
// Login logic with test accounts, password verification, audit logging
// =============================================================================

import { NextResponse } from 'next/server';
import { BaseRepository } from '../repositories/BaseRepository';
import { AuthService } from '../services/AuthService';
import { AuthorizationService } from '../services/AuthorizationService';
import { AuditService } from '../services/AuditService';

export class AuthController {
  private static _instance: AuthController;
  private readonly usersRepo: BaseRepository;
  private readonly authSvc: AuthService;
  private readonly authzSvc: AuthorizationService;
  private readonly auditSvc: AuditService;

  constructor() {
    this.usersRepo = new BaseRepository('Users');
    this.authSvc = AuthService.getInstance();
    this.authzSvc = AuthorizationService.getInstance();
    this.auditSvc = AuditService.getInstance();
    this.handleLogin = this.handleLogin.bind(this);
  }

  static getInstance(): AuthController {
    if (!AuthController._instance) {
      AuthController._instance = new AuthController();
    }
    return AuthController._instance;
  }

  async handleLogin(request: Request): Promise<NextResponse> {
    try {
      const { email, password, role } = await request.json();

      // Test account bypass
      const testAccounts: Record<string, any> = {
        'admin@hrpro.com': { id: 'admin-test', employeeId: 'ADMIN-01', email: 'admin@hrpro.com', role: 'admin', name: 'System Administrator', position: 'Administrator', avatar: 'SA', password: 'admin123' },
        'manager@hrpro.com': { id: 'manager-test', employeeId: 'MGR-01', email: 'manager@hrpro.com', role: 'manager', name: 'Team Manager', position: 'Manager', avatar: 'TM', password: 'manager123' },
        'user@hrpro.com': { id: 'user-test', employeeId: 'EMP-01', email: 'user@hrpro.com', role: 'employee', name: 'Test Employee', position: 'Staff', avatar: 'TE', password: 'user123' },
      };

      const testAccount = testAccounts[email?.toLowerCase()];
      if (testAccount && password === testAccount.password) {
        const { password: _, ...user } = testAccount;
        return NextResponse.json({ user });
      }

      if (!email || !password) {
        return NextResponse.json({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' }, { status: 400 });
      }

      const users = await this.usersRepo.getAll();
      const user = users.find(
        (u: any) => (u.email || '').trim().toLowerCase() === String(email).trim().toLowerCase(),
      );

      if (!user) {
        return NextResponse.json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
      }

      if ((user.status || 'active').toLowerCase() === 'disabled') {
        return NextResponse.json({ error: 'บัญชีนี้ถูกระงับการใช้งาน' }, { status: 403 });
      }

      const { ok, needsRehash } = this.authSvc.verifyPassword(password, user.password);
      if (!ok) {
        return NextResponse.json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
      }

      // Role gate for admin login
      if (String(role).toLowerCase() === 'admin' && !this.authzSvc.canManage(user.role)) {
        return NextResponse.json({ error: 'บัญชีนี้ไม่มีสิทธิ์ผู้ดูแล/ผู้จัดการ' }, { status: 403 });
      }

      // Transparent password rehash
      if (needsRehash) {
        await this.usersRepo.update(user.id, { password: this.authSvc.hashPassword(password) });
      }

      await this.auditSvc.log({ actor: user.email, action: 'LOGIN', entity: 'Users', entityId: user.id });

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
}
