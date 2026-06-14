import { NextResponse } from 'next/server';
import { requireManager } from '@/lib/apiGuard';
import { getRows, addRow, updateRow, deleteRow, ensureHeaders } from '@/lib/sheetManager';
import { hashPassword } from '@/lib/auth';
import { syncPayroll, PAYROLL_HEADERS } from '@/lib/payrollSync';

const SHEET_NAME = 'Employees';
const USERS_SHEET = 'Users';
const PAYROLL_SHEET = 'Payroll';
const ID_KEY = 'id';

// Extra columns the Employee Management feature relies on. Created on demand so a
// pre-existing sheet without them still works.
const EMPLOYEE_EXTRA_HEADERS = ['salary', 'role', 'nickname', 'startDate'];
const USERS_HEADERS = ['id', 'email', 'password', 'role', 'name', 'position', 'avatar', 'employeeId', 'status'];

/**
 * Mirror the employee's login account into the Users sheet (the table the login
 * route authenticates against), keyed by employeeId. Login is by email, so the
 * "username" field is stored as Users.email. A blank password on edit leaves the
 * existing one untouched so admins don't have to retype it.
 */
async function syncUserAccount(employeeId: string, emp: any, username?: string, password?: string) {
  const loginEmail = (username || emp.email || '').trim();
  // Nothing to link an account to (no login id and no password) — skip entirely.
  if (!loginEmail && !password) return;

  const users = await getRows(USERS_SHEET);
  const existing = users.find(u => (u.employeeId || '').toString() === employeeId.toString());

  const base: any = {
    employeeId,
    email: loginEmail || existing?.email || '',
    role: (emp.role || existing?.role || 'user').toLowerCase(),
    name: emp.name ?? existing?.name ?? '',
    position: emp.position ?? existing?.position ?? '',
    avatar: existing?.avatar || (emp.name ? String(emp.name).slice(0, 2) : 'U'),
    status: (emp.status === 'Inactive' ? 'disabled' : 'active'),
  };
  if (password) base.password = hashPassword(password);

  if (existing) {
    await updateRow(USERS_SHEET, 'id', existing.id, base);
  } else {
    // Require a password to create a brand-new account; otherwise there's nothing
    // to log in with.
    if (!password) return;
    await addRow(USERS_SHEET, base);
  }
}

export async function GET() {
  try {
    const rows = await getRows(SHEET_NAME);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('API Error (GET):', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = requireManager(request);
  if (denied) return denied;

  try {
    await ensureHeaders(SHEET_NAME, EMPLOYEE_EXTRA_HEADERS);
    await ensureHeaders(USERS_SHEET, USERS_HEADERS);
    await ensureHeaders(PAYROLL_SHEET, PAYROLL_HEADERS);
    const body = await request.json();
    // Account credentials live in the Users sheet, never the Employees sheet.
    const { username, password, ...employee } = body;

    // Generate the id up front so the linked Users / Payroll rows can reference it.
    const employeeId = (employee.id || `ID-${Date.now()}-${Math.floor(Math.random() * 1000)}`).toString();
    employee.id = employeeId;

    await addRow(SHEET_NAME, employee);
    await syncUserAccount(employeeId, employee, username, password);
    if (employee.salary !== undefined && employee.salary !== '') {
      await syncPayroll(employeeId, employee.salary);
    }

    return NextResponse.json({ message: 'Employee added successfully', id: employeeId });
  } catch (error) {
    console.error('API Error (POST):', error);
    return NextResponse.json({ error: 'Failed to add employee' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const denied = requireManager(request);
  if (denied) return denied;

  try {
    await ensureHeaders(SHEET_NAME, EMPLOYEE_EXTRA_HEADERS);
    await ensureHeaders(USERS_SHEET, USERS_HEADERS);
    await ensureHeaders(PAYROLL_SHEET, PAYROLL_HEADERS);
    const body = await request.json();
    const { id, username, password, ...updatedData } = body;
    if (!id) return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });

    await updateRow(SHEET_NAME, ID_KEY, id, updatedData);
    await syncUserAccount(id.toString(), { ...updatedData, id }, username, password);
    if (updatedData.salary !== undefined && updatedData.salary !== '') {
      await syncPayroll(id.toString(), updatedData.salary);
    }

    return NextResponse.json({ message: 'Employee updated successfully' });
  } catch (error) {
    console.error('API Error (PATCH):', error);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const denied = requireManager(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });

    await deleteRow(SHEET_NAME, ID_KEY, id);
    return NextResponse.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('API Error (DELETE):', error);
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 });
  }
}
