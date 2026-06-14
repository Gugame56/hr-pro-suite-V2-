import { getRows, addRow, updateRow } from './sheetManager';

const PAYROLL_SHEET = 'Payroll';

export const PAYROLL_HEADERS = ['id', 'employeeId', 'month', 'year', 'baseSalary', 'deductions', 'netPay', 'status'];

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

export function currentPeriod() {
  const now = new Date();
  return { month: THAI_MONTHS[now.getMonth()], year: now.getFullYear().toString() };
}

export const num = (v: any) => {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

/**
 * Keep the current period's Payroll record in step with the employee's base
 * salary. Upserts the row for (employeeId, current month/year) and recomputes
 * netPay = baseSalary - deductions. Returns 'updated' | 'created' | 'skipped'.
 */
export async function syncPayroll(employeeId: string, salary: any): Promise<'updated' | 'created' | 'skipped'> {
  const baseSalary = num(salary);
  if (!employeeId) return 'skipped';

  const { month, year } = currentPeriod();
  const rows = await getRows(PAYROLL_SHEET);
  const existing = rows.find(
    r => (r.employeeId || '').toString() === employeeId.toString()
      && r.month === month && (r.year || '').toString() === year
  );

  if (existing) {
    const deductions = num(existing.deductions);
    await updateRow(PAYROLL_SHEET, 'id', existing.id, {
      baseSalary: baseSalary.toString(),
      netPay: (baseSalary - deductions).toString(),
    });
    return 'updated';
  }

  await addRow(PAYROLL_SHEET, {
    employeeId,
    month,
    year,
    baseSalary: baseSalary.toString(),
    deductions: '0',
    netPay: baseSalary.toString(),
    status: 'Draft',
  });
  return 'created';
}
