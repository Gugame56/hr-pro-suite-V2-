import { NextResponse } from 'next/server';
import { requireManager } from '@/lib/apiGuard';
import { getRows, addRow, updateRow, deleteRow, ensureHeaders } from '@/lib/sheetManager';
import { LEAVE_TYPES_SHEET, LEAVE_TYPE_HEADERS, DEFAULT_LEAVE_TYPES, normalizeLeaveType } from '@/lib/leave';

const ID_KEY = 'id';

// Boolean-ish fields are stored as Yes/No strings so they read cleanly in the sheet.
function toSheet(data: any) {
  const out = { ...data };
  if (out.paid !== undefined) out.paid = (out.paid === true || out.paid === 'Yes' || out.paid === 'true') ? 'Yes' : 'No';
  if (out.active !== undefined) out.active = (out.active === true || out.active === 'Yes' || out.active === 'true') ? 'Yes' : 'No';
  return out;
}

export async function GET() {
  try {
    await ensureHeaders(LEAVE_TYPES_SHEET, LEAVE_TYPE_HEADERS);
    let rows = await getRows(LEAVE_TYPES_SHEET);

    // Seed the default catalogue the first time the sheet is empty so the module
    // works without anyone running a setup script.
    if (rows.length === 0) {
      for (const t of DEFAULT_LEAVE_TYPES) {
        await addRow(LEAVE_TYPES_SHEET, toSheet(t));
      }
      rows = await getRows(LEAVE_TYPES_SHEET);
    }

    return NextResponse.json(rows.map(normalizeLeaveType).filter(t => t.name));
  } catch (error) {
    console.error('API Error (LeaveTypes GET):', error);
    return NextResponse.json({ error: 'Failed to fetch leave types' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = requireManager(request);
  if (denied) return denied;
  try {
    await ensureHeaders(LEAVE_TYPES_SHEET, LEAVE_TYPE_HEADERS);
    const body = await request.json();
    if (!body.name || !String(body.name).trim()) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อประเภทการลา' }, { status: 400 });
    }
    await addRow(LEAVE_TYPES_SHEET, toSheet(body));
    return NextResponse.json({ message: 'Leave type added successfully' });
  } catch (error) {
    console.error('API Error (LeaveTypes POST):', error);
    return NextResponse.json({ error: 'Failed to add leave type' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const denied = requireManager(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    const { id, ...updated } = body;
    if (!id) return NextResponse.json({ error: 'Leave type ID is required' }, { status: 400 });
    await updateRow(LEAVE_TYPES_SHEET, ID_KEY, id, toSheet(updated));
    return NextResponse.json({ message: 'Leave type updated successfully' });
  } catch (error) {
    console.error('API Error (LeaveTypes PATCH):', error);
    return NextResponse.json({ error: 'Failed to update leave type' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const denied = requireManager(request);
  if (denied) return denied;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Leave type ID is required' }, { status: 400 });
    await deleteRow(LEAVE_TYPES_SHEET, ID_KEY, id);
    return NextResponse.json({ message: 'Leave type deleted successfully' });
  } catch (error) {
    console.error('API Error (LeaveTypes DELETE):', error);
    return NextResponse.json({ error: 'Failed to delete leave type' }, { status: 500 });
  }
}
