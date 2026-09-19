// =============================================================================
// HR Pro Suite — CacheManager
// Short-lived in-memory cache + in-flight de-duplication สำหรับ Google Sheets reads
// แยกจาก googleSheets.ts เดิมเป็น class
// =============================================================================

type CacheEntry = { value: any[][]; expires: number };

export class CacheManager {
  private static instance: CacheManager;

  private readonly readCache = new Map<string, CacheEntry>();
  private readonly inflight = new Map<string, Promise<any[][]>>();
  private readonly ttlMs: number;

  private constructor(ttlMs = 8000) {
    this.ttlMs = ttlMs;
  }

  /** Singleton instance */
  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /** ดึงค่าจาก cache ถ้ายังไม่หมดอายุ */
  get(key: string): any[][] | null {
    const cached = this.readCache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }
    return null;
  }

  /** ดึงค่า stale (หมดอายุแล้ว) สำหรับ fallback กรณี error */
  getStale(key: string): any[][] | null {
    const cached = this.readCache.get(key);
    return cached ? cached.value : null;
  }

  /** เก็บค่าลง cache */
  set(key: string, value: any[][]): void {
    this.readCache.set(key, {
      value,
      expires: Date.now() + this.ttlMs,
    });
  }

  /** ตรวจสอบว่ามี request กำลัง in-flight อยู่หรือไม่ */
  getInflight(key: string): Promise<any[][]> | null {
    return this.inflight.get(key) || null;
  }

  /** บันทึก in-flight promise */
  setInflight(key: string, promise: Promise<any[][]>): void {
    this.inflight.set(key, promise);
  }

  /** ลบ in-flight promise เมื่อเสร็จ */
  deleteInflight(key: string): void {
    this.inflight.delete(key);
  }

  /** ล้าง cache ของ sheet ที่ระบุ หรือทั้งหมด */
  invalidate(sheetName?: string): void {
    if (!sheetName) {
      this.readCache.clear();
      return;
    }
    const prefix = `${sheetName}!`;
    for (const key of [...this.readCache.keys()]) {
      if (key.startsWith(prefix)) {
        this.readCache.delete(key);
      }
    }
  }
}
