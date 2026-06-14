import { NextResponse } from 'next/server';
import { requireManager } from '@/lib/apiGuard';
import { getRows, addRow, updateRow, deleteRow, ensureHeaders } from '@/lib/sheetManager';
import {
  LEAVE_TYPES_SHEET, LEAVE_REQUEST_EXTRA_HEADERS, DEFAULT_LEAVE_TYPES,
  normalizeLeaveType, computeQuota, checkAgainstQuota, leaveDays, type LeaveType, type LeaveRow,
} from '@/lib/leave';

const SHEET_NAME = 'LeaveRequests';
const EMPLOYEES_SHEET = 'Employees';
const ID_KEY = 'id';

async function getLeaveTypes(): Promise<LeaveType[]> {
  const rows = await getRows(LEAVE_TYPES_SHEET).catch(() => []);
  const types = rows.map(normalizeLeaveType).filter(t => t.name);
  return types.length ? types : DEFAULT_LEAVE_TYPES;
}

async function getEmployeeStartDate(employeeId?: string): Promise<string | undefined> {
  if (!employeeId) return undefined;
  const emps = await getRows(EMPLOYEES_SHEET).catch(() => []);
  const emp = emps.find(e => (e.id || '').toString() === employeeId.toString());
  return emp?.startDate || undefined;
}

/**
 * Enforce the per-type yearly quota and tenure gate for a leave that is (or is
 * becoming) Approved. `excludeId` skips the row being re-approved so it isn't
 * counted against itself. Returns an error response when the leave is rejected.
 */
async function enforceQuota(req: LeaveRow & { employeeId?: string }, excludeId?: string): Promise<NextResponse | null> {
  const types = await getLeaveTypes();
  const type = types.find(t => t.name === (req.leaveType || ''));
  if (!type) return null; // free-form / unknown type — nothing to enforce

  const all = await getRows(SHEET_NAME).catch(() => []);
  const mine = (all as LeaveRow[]).filter(
    (r: any) => (r.employeeId || '').toString() === (req.employeeId || '').toString() && r.id?.toString() !== excludeId,
  );
  const startDate = await getEmployeeStartDate(req.employeeId);
  const year = new Date(req.startDate || Date.now()).getFullYear();
  const quota = computeQuota(type, startDate, mine, year);

  const check = checkAgainstQuota(quota, quota.used, leaveDays(req));
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 422 });
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const rows = await getRows(SHEET_NAME);
    if (employeeId) {
      return NextResponse.json(rows.filter(row => (row.employeeId || '').toString() === employeeId));
    }
    return NextResponse.json(rows);
  } catch (error) {
    console.error('API Error (GET):', error);
    return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureHeaders(SHEET_NAME, LEAVE_REQUEST_EXTRA_HEADERS);
    const body = await request.json();
    const data = { ...body, status: body.status || 'Pending' };

    // Guard the balance up front so an over-quota request never enters the queue.
    const denied = await enforceQuota(data);
    if (denied) return denied;

    await addRow(SHEET_NAME, data);
    return NextResponse.json({ message: 'Leave request submitted successfully' });
  } catch (error) {
    console.error('API Error (POST):', error);
    return NextResponse.json({ error: 'Failed to submit leave request' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await ensureHeaders(SHEET_NAME, LEAVE_REQUEST_EXTRA_HEADERS);
    const body = await request.json();
    const { id, ...updatedData } = body;
    if (!id) return NextResponse.json({ error: 'Leave request ID is required' }, { status: 400 });

    // Approving / rejecting a request is a management action — guard it even if an
    // employee bypasses the UI and calls the API directly. Self-service edits
    // (e.g. cancelling one's own pending request) remain allowed.
    if (updatedData.status === 'Approved' || updatedData.status === 'Rejected') {
      const denied = requireManager(request);
      if (denied) return denied;
    }

    // Re-check quota when a request is being approved (the moment it deducts).
    if (updatedData.status === 'Approved') {
      const rows = await getRows(SHEET_NAME);
      const existing = rows.find((r: any) => r.id?.toString() === id.toString());
      if (existing) {
        const merged: any = { ...existing, ...updatedData };
        const denied = await enforceQuota(merged, id.toString());
        if (denied) return denied;
      }
    }

    await updateRow(SHEET_NAME, ID_KEY, id, updatedData);
    return NextResponse.json({ message: 'Leave request updated successfully' });
  } catch (error) {
    console.error('API Error (PATCH):', error);
    return NextResponse.json({ error: 'Failed to update leave request' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Leave request ID is required' }, { status: 400 });
    await deleteRow(SHEET_NAME, ID_KEY, id);
    return NextResponse.json({ message: 'Leave request deleted successfully' });
  } catch (error) {
    console.error('API Error (DELETE):', error);
    return NextResponse.json({ error: 'Failed to delete leave request' }, { status: 500 });
  }
}
