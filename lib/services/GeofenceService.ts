// =============================================================================
// GeofenceService — แปลงจาก geo.ts
// Geofence / attendance verification helpers
// =============================================================================

export interface AttendanceConfig {
  gpsEnabled: boolean;
  qrEnabled: boolean;
  lat: number;
  lng: number;
  radius: number;
  qrToken: string;
}

export interface VerifyInput {
  method?: 'gps' | 'qr';
  lat?: number;
  lng?: number;
  qrToken?: string;
}

export interface VerifyResult {
  ok: boolean;
  error?: string;
  distance?: number;
}

export class GeofenceService {
  private static instance: GeofenceService;

  private constructor() {}

  static getInstance(): GeofenceService {
    if (!GeofenceService.instance) {
      GeofenceService.instance = new GeofenceService();
    }
    return GeofenceService.instance;
  }

  /** Great-circle distance between two lat/lng points, in meters. */
  haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  /** Verify attendance check-in/out against config (GPS/QR). */
  verifyAttendance(cfg: AttendanceConfig, input: VerifyInput): VerifyResult {
    // If neither GPS nor QR is enabled, allow free check-in
    if (!cfg.gpsEnabled && !cfg.qrEnabled) return { ok: true };

    const method = input.method || (cfg.gpsEnabled ? 'gps' : 'qr');

    if (cfg.gpsEnabled && method !== 'qr') {
      if (input.lat == null || input.lng == null || Number.isNaN(Number(input.lat)) || Number.isNaN(Number(input.lng))) {
        return { ok: false, error: 'ระบบบังคับตรวจพิกัด GPS: ไม่พบตำแหน่ง GPS กรุณาเปิด Location และอนุญาตการเข้าถึงตำแหน่ง' };
      }
      if (Number.isNaN(cfg.lat) || Number.isNaN(cfg.lng)) {
        return { ok: false, error: 'ผู้ดูแลระบบยังไม่ได้ตั้งค่าพิกัดออฟฟิศในระบบ' };
      }
      const lat = Number(input.lat);
      const lng = Number(input.lng);
      const distance = this.haversineMeters(lat, lng, cfg.lat, cfg.lng);
      if (distance > cfg.radius) {
        return {
          ok: false,
          distance,
          error: `อยู่นอกพื้นที่ที่กำหนด (คุณอยู่ห่าง ${Math.round(distance)} เมตร / รัศมีที่อนุญาต ${cfg.radius} เมตร) — ไม่อนุญาตให้ลงเวลา`,
        };
      }
      return { ok: true, distance };
    }

    if (method === 'qr' && cfg.qrEnabled) {
      if (!cfg.qrToken) return { ok: false, error: 'ผู้ดูแลระบบยังไม่ได้ตั้งค่า QR ของออฟฟิศ' };
      if ((input.qrToken || '').trim() !== cfg.qrToken.trim()) {
        return { ok: false, error: 'QR Code ไม่ถูกต้องหรือหมดอายุ' };
      }
      return { ok: true };
    }

    return { ok: false, error: 'การลงเวลาต้องยืนยันพิกัด GPS ตามที่กำหนดเท่านั้น' };
  }
}

// Backward-compatible exports
const _instance = GeofenceService.getInstance();
export const haversineMeters = _instance.haversineMeters.bind(_instance);
export const verifyAttendance = _instance.verifyAttendance.bind(_instance);
