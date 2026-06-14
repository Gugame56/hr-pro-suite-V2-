import { NextResponse } from 'next/server';
import { getRows, addRow, updateRow, deleteRow } from '@/lib/sheetManager';

const SHEET_NAME = 'Documents';
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
    console.error('API Error (GET):', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await addRow(SHEET_NAME, body);
    return NextResponse.json({ message: 'Document request submitted successfully' });
  } catch (error) {
    console.error('API Error (POST):', error);
    return NextResponse.json({ error: 'Failed to submit document request' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updatedData } = body;
    if (!id) return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });

    await updateRow(SHEET_NAME, ID_KEY, id, updatedData);
    return NextResponse.json({ message: 'Document updated successfully' });
  } catch (error) {
    console.error('API Error (PATCH):', error);
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });

    await deleteRow(SHEET_NAME, ID_KEY, id);
    return NextResponse.json({ message: 'Document record deleted successfully' });
  } catch (error) {
    console.error('API Error (DELETE):', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
