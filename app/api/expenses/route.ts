import { NextResponse } from 'next/server';
import { getRows, addRow, updateRow, deleteRow } from '@/lib/sheetManager';

const SHEET_NAME = 'Expenses';
const ID_KEY = 'id';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const rows = await getRows(SHEET_NAME);
    if (employeeId) {
      const filtered = rows.filter(row => row.employeeId === employeeId);
      return NextResponse.json(filtered);
    }
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await addRow(SHEET_NAME, body);
    return NextResponse.json({ message: 'Expense claim added successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add expense' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updatedData } = body;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    await updateRow(SHEET_NAME, ID_KEY, id, updatedData);
    return NextResponse.json({ message: 'Expense updated successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    await deleteRow(SHEET_NAME, ID_KEY, id);
    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
