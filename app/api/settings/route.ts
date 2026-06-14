import { NextResponse } from 'next/server';
import { requireManager } from '@/lib/apiGuard';
import { getRows, updateRow, addRow } from '@/lib/sheetManager';

const SHEET_NAME = 'Settings';
const ID_KEY = 'key';

export async function GET() {
  try {
    const rows = await getRows(SHEET_NAME);
    // Convert rows [{key: '...', value: '...'}] to a simple object {key: value}
    const settings = rows.reduce((acc: any, row: any) => {
      if (row.key) acc[row.key] = row.value;
      return acc;
    }, {});
    return NextResponse.json(settings);
  } catch (error) {
    console.error('API Error (Settings GET):', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const denied = requireManager(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const settingsToUpdate = body; // Expected { key1: val1, key2: val2 }

    const allSettings = await getRows(SHEET_NAME);

    for (const [key, value] of Object.entries(settingsToUpdate)) {
      const existing = allSettings.find((s: any) => s.key === key);
      if (existing) {
        await updateRow(SHEET_NAME, ID_KEY, key, { value });
      } else {
        await addRow(SHEET_NAME, { key, value });
      }
    }

    return NextResponse.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('API Error (Settings PATCH):', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
