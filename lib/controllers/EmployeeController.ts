// =============================================================================
// EmployeeController — แปลงจาก app/api/employees/route.ts
// CRUD + User account sync + Payroll sync
// =============================================================================

import { NextResponse } from 'next/server';
import { BaseController } from './BaseController';
import { BaseRepository } from '../repositories/BaseRepository';
import { AuthService } from '../services/AuthService';
import { PayrollService, PAYROLL_HEADERS } from '../services/PayrollService';

const EMPLOYEE_EXTRA_HEADERS = ['salary', 'role', 'nickname', 'startDate'];
const USERS_HEADERS = ['id', 'email', 'password', 'role', 'name', 'position', 'avatar', 'employeeId', 'status'];

export class EmployeeController extends BaseController {
  private static _instance: EmployeeController;
  private readonly usersRepo: BaseRepository;
  private readonly payrollRepo: BaseRepository;
  private readonly authSvc: AuthService;
  private readonly payrollSvc: PayrollService;

  constructor() {
    super('Employees', { requireManager: true });
    this.usersRepo = new BaseRepository('Users');
    this.payrollRepo = new BaseRepository('Payroll');
    this.authSvc = AuthService.getInstance();
    this.payrollSvc = PayrollService.getInstance();

    this.handlePost = this.handlePost.bind(this);
    this.handlePatch = this.handlePatch.bind(this);
  }

  static getInstance(): EmployeeController {
    if (!EmployeeController._instance) {
      EmployeeController._instance = new EmployeeController();
    }
    return EmployeeController._instance;
  }

  /** Mirror employee's login account into Users sheet */
  private async syncUserAccount(employeeId: string, emp: any, username?: string, password?: string) {
    const loginEmail = (username || emp.email || '').trim();
    if (!loginEmail && !password) return;

    const users = await this.usersRepo.getAll();
    const existing = users.find((u: any) => (u.employeeId || '').toString() === employeeId.toString());

    const base: any = {
      employeeId,
      email: loginEmail || existing?.email || '',
      role: (emp.role || existing?.role || 'user').toLowerCase(),
      name: emp.name ?? existing?.name ?? '',
      position: emp.position ?? existing?.position ?? '',
      avatar: existing?.avatar || (emp.name ? String(emp.name).slice(0, 2) : 'U'),
      status: (emp.status === 'Inactive' ? 'disabled' : 'active'),
    };
    if (password) base.password = this.authSvc.hashPassword(password);

    if (existing) {
      await this.usersRepo.update(existing.id, base);
    } else {
      if (!password) return;
      await this.usersRepo.add(base);
    }
  }

  async handlePost(request: Request): Promise<NextResponse> {
    const denied = this.checkManager(request);
    if (denied) return denied;

    try {
      await this.repository.ensureHeaders(EMPLOYEE_EXTRA_HEADERS);
      await this.usersRepo.ensureHeaders(USERS_HEADERS);
      await this.payrollRepo.ensureHeaders(PAYROLL_HEADERS);

      const body = await request.json();
      const { username, password, ...employee } = body;

      const employeeId = (employee.id || `ID-${Date.now()}-${Math.floor(Math.random() * 1000)}`).toString();
      employee.id = employeeId;

      await this.repository.add(employee);
      await this.syncUserAccount(employeeId, employee, username, password);
      if (employee.salary !== undefined && employee.salary !== '') {
        await this.payrollSvc.syncPayroll(employeeId, employee.salary);
      }

      return NextResponse.json({ message: 'Employee added successfully', id: employeeId });
    } catch (error) {
      console.error('API Error (POST):', error);
      return NextResponse.json({ error: 'Failed to add employee' }, { status: 500 });
    }
  }

  async handlePatch(request: Request): Promise<NextResponse> {
    const denied = this.checkManager(request);
    if (denied) return denied;

    try {
      await this.repository.ensureHeaders(EMPLOYEE_EXTRA_HEADERS);
      await this.usersRepo.ensureHeaders(USERS_HEADERS);
      await this.payrollRepo.ensureHeaders(PAYROLL_HEADERS);

      const body = await request.json();
      const { id, username, password, ...updatedData } = body;
      if (!id) return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });

      await this.repository.update(id, updatedData);
      await this.syncUserAccount(id.toString(), { ...updatedData, id }, username, password);
      if (updatedData.salary !== undefined && updatedData.salary !== '') {
        await this.payrollSvc.syncPayroll(id.toString(), updatedData.salary);
      }

      return NextResponse.json({ message: 'Employee updated successfully' });
    } catch (error) {
      console.error('API Error (PATCH):', error);
      return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
    }
  }
}
