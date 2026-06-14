import { NextResponse } from 'next/server';
import { getRows, addRow, updateRow } from '@/lib/sheetManager';
import { toISODate, toISOTime, diffHoursMinutes } from '@/lib/dateUtils';
import { verifyAttendance } from '@/lib/geo';
import { loadAttendanceConfig } from '@/lib/attendanceConfig';

const SHEET_NAME = 'Attendance';
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
    return NextResponse.json({ error: 'Failed to fetch attendance logs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, employeeId, date, checkIn, checkOut, status, method, lat, lng, qrToken } = body;

    if (!employeeId) return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });

    // Geofence / QR verification is enforced for both check-in and check-out.
    if (action === 'check-in' || action === 'check-out') {
      const cfg = await loadAttendanceConfig();
      const result = verifyAttendance(cfg, { method, lat, lng, qrToken });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 403 });
      }
    }

    if (action === 'check-in') {
      const now = new Date();
      const dateStr = toISODate(now); // YYYY-MM-DD — stable for comparison
      const timeStr = toISOTime(now); // HH:mm:ss (24h)

      // Check if already checked in today
      const rows = await getRows(SHEET_NAME);
      const existing = rows.find(row => row.employeeId === employeeId && row.date === dateStr);

      if (existing) {
        return NextResponse.json({ error: 'Already checked in for today' }, { status: 400 });
      }

      await addRow(SHEET_NAME, {
        employeeId,
        date: dateStr,
        checkIn: timeStr,
        checkOut: '',
        status: 'On Time', // In a real system, compare with shift start time
        hours: '',
        // Persisted only if these columns exist in the sheet; ignored otherwise.
        method: method || '',
        lat: lat != null ? String(lat) : '',
        lng: lng != null ? String(lng) : '',
      });

      return NextResponse.json({ message: 'Checked in successfully', time: timeStr });
    }

    if (action === 'check-out') {
      const now = new Date();
      const dateStr = toISODate(now);
      const timeStr = toISOTime(now);

      const rows = await getRows(SHEET_NAME);
      const existing = rows.find(row => row.employeeId === employeeId && row.date === dateStr);

      if (!existing) {
        return NextResponse.json({ error: 'No check-in found for today' }, { status: 400 });
      }

      // Real worked-hours from the recorded check-in to now.
      const hours = diffHoursMinutes(existing.checkIn, timeStr);

      await updateRow(SHEET_NAME, ID_KEY, existing.id, {
        checkOut: timeStr,
        hours: hours
      });

      return NextResponse.json({ message: 'Checked out successfully', time: timeStr });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('API Error (POST):', error);
    return NextResponse.json({ error: 'Attendance action failed' }, { status: 500 });
  }
}
