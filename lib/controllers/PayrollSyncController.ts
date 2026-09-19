import { NextResponse } from 'next/server';
import { BaseRepository } from '../repositories/BaseRepository';
import { AuthorizationService } from '../services/AuthorizationService';
import { PayrollService } from '../services/PayrollService';

export class PayrollSyncController {
  private static instance: PayrollSyncController;
  private readonly employeeRepo: BaseRepository;
  private readonly authService: AuthorizationService;
  private readonly payrollService: PayrollService;

  private constructor() {
    this.employeeRepo = new BaseRepository('Employees');
    this.authService = AuthorizationService.getInstance();
    this.payrollService = PayrollService.getInstance();
    this.handlePost = this.handlePost.bind(this);
  }

  static getInstance(): PayrollSyncController {
    if (!PayrollSyncController.instance) {
      PayrollSyncController.instance = new PayrollSyncController();
    }
    return PayrollSyncController.instance;
  }

  async handlePost(request: Request): Promise<NextResponse> {
    const denied = this.authService.requireManager(request);
    if (denied) return denied;

    try {
      await this.employeeRepo.ensureHeaders(['id', 'employeeId', 'month', 'year', 'baseSalary', 'deductions', 'netPay', 'status']);
      const employees = await this.employeeRepo.getAll();

      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const emp of employees) {
        const id = (emp.id || '').toString();
        const salary = emp.salary;
        if (!id || salary === undefined || salary === '') {
          skipped++;
          continue;
        }
        const result = await this.payrollService.syncPayroll(id, salary);
        if (result === 'created') created++;
        else if (result === 'updated') updated++;
        else skipped++;
      }

      return NextResponse.json({
        message: `ซิงค์เงินเดือนสำเร็จ: สร้างใหม่ ${created} รายการ, อัปเดต ${updated} รายการ`,
        created,
        updated,
        skipped,
      });
    } catch (error) {
      console.error('API Error (PAYROLL SYNC):', error);
      return NextResponse.json({ error: 'Failed to sync payroll' }, { status: 500 });
    }
  }
}
