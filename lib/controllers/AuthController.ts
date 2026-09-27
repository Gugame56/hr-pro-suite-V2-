// =============================================================================
// AuthController — Multi-Tenant Login with Company Code
// Login logic with test accounts, company validation, password verification,
// subscription expiry check, and audit logging
// =============================================================================

import { NextResponse } from 'next/server';
import { BaseRepository } from '../repositories/BaseRepository';
import { AuthService } from '../services/AuthService';
import { AuthorizationService } from '../services/AuthorizationService';
import { AuditService } from '../services/AuditService';
import { TenantService } from '../services/TenantService';

export class AuthController {
  private static _instance: AuthController;
  private readonly usersRepo: BaseRepository;
  private readonly authSvc: AuthService;
  private readonly authzSvc: AuthorizationService;
  private readonly auditSvc: AuditService;
  private readonly tenantSvc: TenantService;

  constructor() {
    this.usersRepo = new BaseRepository('Users');
    this.authSvc = AuthService.getInstance();
    this.authzSvc = AuthorizationService.getInstance();
    this.auditSvc = AuditService.getInstance();
    this.tenantSvc = TenantService.getInstance();
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
      const { email, password, role, companyCode } = await request.json();

      // ── Test account bypass (backward compatible — linked to real employee data) ──
      const testAccounts: Record<string, any> = {
        'admin@hrpro.com': { id: 'admin-test', employeeId: 'EMP-001', email: 'admin@hrpro.com', role: 'admin', name: 'ก้องภพ วัฒนกุล (Admin)', position: 'ผู้จัดการฝ่ายไอที', avatar: 'KP', password: 'admin123', companyCode: 'DEMO-0001' },
        'manager@hrpro.com': { id: 'manager-test', employeeId: 'EMP-002', email: 'manager@hrpro.com', role: 'manager', name: 'ปิยะวรรณ ศรีสุข (Manager)', position: 'ผู้จัดการฝ่ายบุคคล', avatar: 'PW', password: 'manager123', companyCode: 'DEMO-0001' },
        'user@hrpro.com': { id: 'user-test', employeeId: 'EMP-003', email: 'user@hrpro.com', role: 'employee', name: 'ธนกร อินทรา (Employee)', position: 'นักพัฒนาซอฟต์แวร์', avatar: 'TK', password: 'user123', companyCode: 'DEMO-0001' },
      };

      const testAccount = testAccounts[email?.toLowerCase()];
      if (testAccount && password === testAccount.password) {
        const { password: _, ...user } = testAccount;
        return NextResponse.json({ user });
      }

      // ── Input validation ──
      if (!email || !password) {
        return NextResponse.json({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' }, { status: 400 });
      }

      // ── Company code validation (if provided) ──
      let validatedCompanyCode = companyCode || '';

      if (companyCode) {
        const companyResult = await this.tenantSvc.validateCompany(companyCode);
        if (!companyResult.valid) {
          return NextResponse.json(
            { error: companyResult.error },
            { status: companyResult.errorCode || 403 },
          );
        }
      }

      // ── Find user ──
      const users = await this.usersRepo.getAll();
      let user: any;

      if (companyCode) {
        // Multi-tenant: find user by email AND companyCode
        user = users.find(
          (u: any) =>
            (u.email || '').trim().toLowerCase() === String(email).trim().toLowerCase() &&
            (u.companyCode || '').toUpperCase() === companyCode.toUpperCase(),
        );
      } else {
        // Backward compatible: find by email only (legacy single-tenant)
        user = users.find(
          (u: any) => (u.email || '').trim().toLowerCase() === String(email).trim().toLowerCase(),
        );
      }

      if (!user) {
        return NextResponse.json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
      }

      if ((user.status || 'active').toLowerCase() === 'disabled') {
        return NextResponse.json({ error: 'บัญชีนี้ถูกระงับการใช้งาน' }, { status: 403 });
      }

      // ── Verify password ──
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

      // ── Build session (include companyCode) ──
      const session = {
        id: user.id,
        employeeId: user.employeeId || user.id,
        email: user.email,
        role: (user.role || 'employee').toLowerCase(),
        name: user.name || user.email,
        position: user.position || '',
        avatar: user.avatar || (user.name ? user.name.slice(0, 2) : 'U'),
        companyCode: user.companyCode || validatedCompanyCode || '',
      };

      return NextResponse.json({ user: session });
    } catch (error) {
      console.error('API Error (LOGIN):', error);
      return NextResponse.json({ error: 'เข้าสู่ระบบล้มเหลว กรุณาลองใหม่' }, { status: 500 });
    }
  }
}
