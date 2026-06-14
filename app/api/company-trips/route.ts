import { NextResponse } from 'next/server';
import { requireManager } from '@/lib/apiGuard';
import { getRows, addRow, updateRow, deleteRow } from '@/lib/sheetManager';

const SHEET_NAME = 'CompanyTrips';
const ID_KEY = 'id';

export async function GET() {
  try {
    const rows = await getRows(SHEET_NAME);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('API Error (GET):', error);
    return NextResponse.json({ error: 'Failed to fetch company trips' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = requireManager(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    await addRow(SHEET_NAME, body);
    return NextResponse.json({ message: 'Company trip added successfully' });
  } catch (error) {
    console.error('API Error (POST):', error);
    return NextResponse.json({ error: 'Failed to add company trip' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const denied = requireManager(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { id, ...updatedData } = body;
    if (!id) return NextResponse.json({ error: 'Company trip ID is required' }, { status: 400 });

    await updateRow(SHEET_NAME, ID_KEY, id, updatedData);
    return NextResponse.json({ message: 'Company trip updated successfully' });
  } catch (error) {
    console.error('API Error (PATCH):', error);
    return NextResponse.json({ error: 'Failed to update company trip' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const denied = requireManager(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Company trip ID is required' }, { status: 400 });

    await deleteRow(SHEET_NAME, ID_KEY, id);
    return NextResponse.json({ message: 'Company trip deleted successfully' });
  } catch (error) {
    console.error('API Error (DELETE):', error);
    return NextResponse.json({ error: 'Failed to delete company trip' }, { status: 500 });
  }
}
