// =============================================================================
// AttendanceController — แปลงจาก app/api/attendance/route.ts
// Check-in/out with GPS/QR verification
// =============================================================================

import { NextResponse } from 'next/server';
import { BaseRepository } from '../repositories/BaseRepository';
import { GeofenceService } from '../services/GeofenceService';
import { AttendanceConfigService } from '../services/AttendanceConfigService';
import { DateService } from '../services/DateService';

export class AttendanceController {
  private static _instance: AttendanceController;
  private readonly repository: BaseRepository;
  private readonly geoService: GeofenceService;
  private readonly configService: AttendanceConfigService;

  constructor() {
    this.repository = new BaseRepository('Attendance');
    this.geoService = GeofenceService.getInstance();
    this.configService = AttendanceConfigService.getInstance();

    this.handleGet = this.handleGet.bind(this);
    this.handlePost = this.handlePost.bind(this);
  }

  static getInstance(): AttendanceController {
    if (!AttendanceController._instance) {
      AttendanceController._instance = new AttendanceController();
    }
    return AttendanceController._instance;
  }

  async handleGet(request: Request): Promise<NextResponse> {
    try {
      const { searchParams } = new URL(request.url);
      const employeeId = searchParams.get('employeeId');
      const rows = (await this.repository.getAll()).map(BaseRepository.stripInternal);

      if (employeeId) {
        return NextResponse.json(rows.filter((r: any) => r.employeeId === employeeId));
      }
      return NextResponse.json(rows);
    } catch (error) {
      console.error('API Error (GET):', error);
      return NextResponse.json({ error: 'Failed to fetch attendance logs' }, { status: 500 });
    }
  }

  async handlePost(request: Request): Promise<NextResponse> {
    try {
      const body = await request.json();
      const { action, employeeId, method, lat, lng, qrToken } = body;

      if (!employeeId) return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });

      // Geofence / QR verification
      if (action === 'check-in' || action === 'check-out') {
        const cfg = await this.configService.loadAttendanceConfig();
        const result = this.geoService.verifyAttendance(cfg, { method, lat, lng, qrToken });
        if (!result.ok) {
          return NextResponse.json({ error: result.error }, { status: 403 });
        }
      }

      if (action === 'check-in') {
        const now = new Date();
        const dateStr = DateService.toISODate(now);
        const timeStr = DateService.toISOTime(now);

        const rows = await this.repository.getAll();
        const existing = rows.find((r: any) => r.employeeId === employeeId && r.date === dateStr);

        if (existing) {
          return NextResponse.json({ error: 'Already checked in for today' }, { status: 400 });
        }

        await this.repository.add({
          employeeId,
          date: dateStr,
          checkIn: timeStr,
          checkOut: '',
          status: 'On Time',
          hours: '',
          method: method || '',
          lat: lat != null ? String(lat) : '',
          lng: lng != null ? String(lng) : '',
        });

        return NextResponse.json({ message: 'Checked in successfully', time: timeStr });
      }

      if (action === 'check-out') {
        const now = new Date();
        const dateStr = DateService.toISODate(now);
        const timeStr = DateService.toISOTime(now);

        const rows = await this.repository.getAll();
        const existing = rows.find((r: any) => r.employeeId === employeeId && r.date === dateStr);

        if (!existing) {
          return NextResponse.json({ error: 'No check-in found for today' }, { status: 400 });
        }

        const hours = DateService.diffHoursMinutes(existing.checkIn, timeStr);
        await this.repository.update(existing.id, { checkOut: timeStr, hours });

        return NextResponse.json({ message: 'Checked out successfully', time: timeStr });
      }

      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
      console.error('API Error (POST):', error);
      return NextResponse.json({ error: 'Attendance action failed' }, { status: 500 });
    }
  }
}
