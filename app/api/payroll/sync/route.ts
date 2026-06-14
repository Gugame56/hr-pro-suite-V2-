import { NextResponse } from 'next/server';
import { requireManager } from '@/lib/apiGuard';
import { getRows, ensureHeaders } from '@/lib/sheetManager';
import { syncPayroll, PAYROLL_HEADERS } from '@/lib/payrollSync';

const EMPLOYEES_SHEET = 'Employees';
const PAYROLL_SHEET = 'Payroll';

/**
 * Backfill: walk every employee that has a salary and upsert their current-period
 * Payroll row. Lets existing employees (added before the salary→payroll sync
 * existed) appear on the Payroll page without re-saving each one by hand.
 */
export async function POST(request: Request) {
  const denied = requireManager(request);
  if (denied) return denied;

  try {
    await ensureHeaders(PAYROLL_SHEET, PAYROLL_HEADERS);
    const employees = await getRows(EMPLOYEES_SHEET);

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
      const result = await syncPayroll(id, salary);
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
