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
    if (!cfg.gpsEnabled && !cfg.qrEnabled) return { ok: true };

    const { method } = input;

    if (method === 'gps') {
      if (!cfg.gpsEnabled) return { ok: false, error: 'การยืนยันด้วย GPS ถูกปิดอยู่' };
      if (input.lat == null || input.lng == null || Number.isNaN(input.lat) || Number.isNaN(input.lng)) {
        return { ok: false, error: 'ไม่พบตำแหน่ง GPS กรุณาอนุญาตการเข้าถึงตำแหน่ง' };
      }
      if (Number.isNaN(cfg.lat) || Number.isNaN(cfg.lng)) {
        return { ok: false, error: 'ผู้ดูแลระบบยังไม่ได้ตั้งค่าพิกัดออฟฟิศ' };
      }
      const distance = this.haversineMeters(input.lat, input.lng, cfg.lat, cfg.lng);
      if (distance > cfg.radius) {
        return {
          ok: false,
          distance,
          error: `อยู่นอกพื้นที่ออฟฟิศ (ห่าง ${Math.round(distance)} ม. / รัศมีที่อนุญาต ${cfg.radius} ม.)`,
        };
      }
      return { ok: true, distance };
    }

    if (method === 'qr') {
      if (!cfg.qrEnabled) return { ok: false, error: 'การยืนยันด้วย QR ถูกปิดอยู่' };
      if (!cfg.qrToken) return { ok: false, error: 'ผู้ดูแลระบบยังไม่ได้ตั้งค่า QR ของออฟฟิศ' };
      if ((input.qrToken || '').trim() !== cfg.qrToken.trim()) {
        return { ok: false, error: 'QR Code ไม่ถูกต้องหรือหมดอายุ' };
      }
      return { ok: true };
    }

    return { ok: false, error: 'กรุณาเลือกวิธียืนยันการลงเวลา (GPS หรือ QR)' };
  }
}

// Backward-compatible exports
const _instance = GeofenceService.getInstance();
export const haversineMeters = _instance.haversineMeters.bind(_instance);
export const verifyAttendance = _instance.verifyAttendance.bind(_instance);
