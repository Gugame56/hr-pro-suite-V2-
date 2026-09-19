// =============================================================================
// PayrollService — แปลงจาก payrollSync.ts
// Payroll sync, period calculation
// =============================================================================

import { BaseRepository } from '../repositories/BaseRepository';
import type { PayrollRecord } from '../models';

const PAYROLL_SHEET = 'Payroll';

export const PAYROLL_HEADERS = ['id', 'employeeId', 'month', 'year', 'baseSalary', 'deductions', 'netPay', 'status'];

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

export class PayrollService {
  private static instance: PayrollService;
  private readonly repository: BaseRepository<PayrollRecord>;

  private constructor() {
    this.repository = new BaseRepository<PayrollRecord>(PAYROLL_SHEET);
  }

  static getInstance(): PayrollService {
    if (!PayrollService.instance) {
      PayrollService.instance = new PayrollService();
    }
    return PayrollService.instance;
  }

  /** Current Thai month name + year */
  currentPeriod(): { month: string; year: string } {
    const now = new Date();
    return { month: THAI_MONTHS[now.getMonth()], year: now.getFullYear().toString() };
  }

  /** Parse a numeric value safely */
  num(v: any): number {
    const n = parseFloat(String(v ?? '').replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  /** Sync employee salary to Payroll sheet for current period */
  async syncPayroll(employeeId: string, salary: any): Promise<'updated' | 'created' | 'skipped'> {
    const baseSalary = this.num(salary);
    if (!employeeId) return 'skipped';

    const { month, year } = this.currentPeriod();
    const rows = await this.repository.getAll();
    const existing = rows.find(
      (r) => (r.employeeId || '').toString() === employeeId.toString()
        && r.month === month && (r.year || '').toString() === year,
    );

    if (existing) {
      const deductions = this.num(existing.deductions);
      await this.repository.update(existing.id!, {
        baseSalary: baseSalary.toString(),
        netPay: (baseSalary - deductions).toString(),
      } as Partial<PayrollRecord>);
      return 'updated';
    }

    await this.repository.add({
      employeeId,
      month,
      year,
      baseSalary: baseSalary.toString(),
      deductions: '0',
      netPay: baseSalary.toString(),
      status: 'Draft',
    } as Partial<PayrollRecord>);
    return 'created';
  }
}

// Backward-compatible exports
const _instance = PayrollService.getInstance();
export const currentPeriod = _instance.currentPeriod.bind(_instance);
export const num = _instance.num.bind(_instance);
export async function syncPayroll(employeeId: string, salary: any) {
  return _instance.syncPayroll(employeeId, salary);
}
