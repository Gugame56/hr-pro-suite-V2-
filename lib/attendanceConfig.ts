// Server-only loader for attendance/geofence configuration.
//
// Kept separate from lib/geo.ts because it imports the Google Sheets client
// (a Node-only dependency). lib/geo.ts stays pure so the browser can use its
// math without bundling googleapis.

import { getRows } from './sheetManager';
import type { AttendanceConfig } from './geo';

/** Read attendance/geofence configuration out of the Settings sheet. */
export async function loadAttendanceConfig(): Promise<AttendanceConfig> {
  const rows = await getRows('Settings');
  const map: Record<string, string> = {};
  for (const r of rows as any[]) {
    if (r.key) map[r.key] = r.value;
  }
  return {
    gpsEnabled: map['attendance_verify_gps'] === 'On',
    qrEnabled: map['attendance_verify_qr'] === 'On',
    lat: parseFloat(map['office_lat']),
    lng: parseFloat(map['office_lng']),
    radius: parseFloat(map['office_radius']) || 200,
    qrToken: map['attendance_qr_token'] || '',
  };
}
