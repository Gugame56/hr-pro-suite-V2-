// =============================================================================
// AttendanceConfigService — แปลงจาก attendanceConfig.ts
// Loads attendance/geofence config from Settings sheet
// =============================================================================

import { BaseRepository } from '../repositories/BaseRepository';
import type { AttendanceConfig } from './GeofenceService';

export class AttendanceConfigService {
  private static instance: AttendanceConfigService;
  private readonly settingsRepo: BaseRepository;

  private constructor() {
    this.settingsRepo = new BaseRepository('Settings', 'key');
  }

  static getInstance(): AttendanceConfigService {
    if (!AttendanceConfigService.instance) {
      AttendanceConfigService.instance = new AttendanceConfigService();
    }
    return AttendanceConfigService.instance;
  }

  /** Read attendance/geofence configuration from Settings sheet */
  async loadAttendanceConfig(): Promise<AttendanceConfig> {
    const rows = await this.settingsRepo.getAll();
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
}

// Backward-compatible export
export async function loadAttendanceConfig() {
  return AttendanceConfigService.getInstance().loadAttendanceConfig();
}
