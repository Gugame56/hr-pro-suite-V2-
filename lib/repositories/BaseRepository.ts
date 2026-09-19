// =============================================================================
// HR Pro Suite — BaseRepository<T>
// แปลงจาก sheetManager.ts — abstract base class สำหรับ CRUD operations
// รวม header translation, auto-ID generation, row addressing
// =============================================================================

import { GoogleSheetsClient } from '../infrastructure/GoogleSheetsClient';

/** Thai → English header mapping (preserved from original sheetManager.ts) */
const HEADER_TRANSLATIONS: Record<string, string | string[]> = {
  'ชื่อ': 'name',
  'ชื่อแผนก': 'name',
  'departmentName': 'name',
  'departmentname': 'name',
  'positionName': 'title',
  'positionname': 'title',
  'level': 'grade',
  'แผนก': ['department', 'name'],
  'ตำแหน่ง': ['title', 'position'],
  'ระดับ': 'grade',
  'ผู้จัดการ': 'manager',
  'หัวหน้า': 'manager',
  'รายละเอียด': 'description',
  'คำอธิบาย': 'description',
  'รหัส': 'id',
  'อีเมล': 'email',
  'เงินเดือน': 'salary',
  'สถานะ': 'status',
  'เบอร์โทรศัพท์': 'phone',
  'ที่อยู่': 'address',
  'วันเริ่มงาน': 'startDate',
  'วันสิ้นสุด': 'endDate',
  'เหตุผล': 'reason',
};

export class BaseRepository<T extends Record<string, any> = Record<string, any>> {
  protected readonly sheetName: string;
  protected readonly idKey: string;
  protected readonly client: GoogleSheetsClient;

  constructor(sheetName: string, idKey = 'id') {
    this.sheetName = sheetName;
    this.idKey = idKey;
    this.client = GoogleSheetsClient.getInstance();
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  /** ดึงทุก rows จาก sheet — พร้อม Thai→English header mapping */
  async getAll(): Promise<T[]> {
    const range = `${this.sheetName}!A:Z`;
    const values = await this.client.getSheetData(range);
    if (!values || values.length === 0) return [];

    const headers = values[0];
    const hasIdColumn = headers.some((h: any) => String(h).toLowerCase() === 'id');

    return values.slice(1).map((row, index) => {
      const obj: any = {};
      headers.forEach((header: any, i: number) => {
        const val = row[i] || '';
        const hStr = String(header);
        obj[hStr] = val;

        // lowercase key
        const lowerHeader = hStr.toLowerCase();
        if (lowerHeader !== hStr) {
          obj[lowerHeader] = val;
        }

        // Thai → English translation
        const translation = HEADER_TRANSLATIONS[hStr] || HEADER_TRANSLATIONS[lowerHeader];
        if (translation) {
          if (Array.isArray(translation)) {
            translation.forEach((key) => { obj[key] = val; });
          } else {
            obj[translation] = val;
          }
        }
      });

      // _row = real 1-based sheet row number
      obj._row = index + 2;

      if (!hasIdColumn) {
        obj.id = (index + 2).toString();
      }
      return obj as T;
    });
  }

  /** ดึง row ด้วย ID */
  async getById(id: string): Promise<T | undefined> {
    const rows = await this.getAll();
    return rows.find((row) => row[this.idKey]?.toString() === id.toString());
  }

  /** ดึง rows ที่ match กับ filter field */
  async getByField(field: string, value: string): Promise<T[]> {
    const rows = await this.getAll();
    return rows.filter((row) => (row[field] || '').toString() === value);
  }

  // ---------------------------------------------------------------------------
  // Write
  // ---------------------------------------------------------------------------

  /** Ensure ว่า headers ที่ต้องการมีอยู่ใน row 1 — สร้าง sheet ถ้ายังไม่มี */
  async ensureHeaders(required: string[]): Promise<string[]> {
    let headers: string[] = [];

    try {
      headers = await this.client.getHeaders(this.sheetName);
    } catch (error: any) {
      // Sheet ไม่มี → สร้างใหม่
      if (error.response?.status === 400 || error.message?.includes('not found')) {
        await this.client.createSheet(this.sheetName);
        headers = [];
      } else {
        throw error;
      }
    }

    const lower = headers.map((h) => String(h).toLowerCase());
    const missing = required.filter((h) => !lower.includes(h.toLowerCase()));
    if (missing.length === 0 && headers.length > 0) return headers;

    const newHeaders = [...headers, ...missing];
    await this.client.setHeaders(this.sheetName, newHeaders);
    this.client.invalidateCache(this.sheetName);
    return newHeaders;
  }

  /** เพิ่ม row ใหม่ — auto-generate ID ถ้าไม่มี */
  async add(data: Partial<T>): Promise<string> {
    const headers = await this.client.getHeaders(this.sheetName);
    if (headers.length === 0) {
      throw new Error(`Sheet ${this.sheetName} must have headers in the first row.`);
    }

    const record = { ...data } as any;

    // Auto-generate ID
    const idIndex = headers.findIndex((h: any) => h.toLowerCase() === 'id');
    if (idIndex !== -1 && !record.id) {
      record.id = `ID-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    const rowValues = this.mapDataToRow(headers, record);
    await this.client.appendSheetData(this.sheetName, [rowValues]);

    return record.id || '';
  }

  /** อัปเดต row ที่ match กับ idKey/idValue */
  async update(idValue: string, updatedData: Partial<T>): Promise<void> {
    const rows = await this.getAll();
    const headers = await this.client.getHeaders(this.sheetName);

    const rowIndex = rows.findIndex(
      (row) => row[this.idKey]?.toString() === idValue.toString(),
    );
    if (rowIndex === -1) throw new Error('Row not found');

    const actualRowNumber = (rows[rowIndex] as any)._row as number;
    const range = `${this.sheetName}!A${actualRowNumber}:Z${actualRowNumber}`;

    const newRowValues = headers.map((header: any) => {
      const hStr = String(header);
      const lowerHeader = hStr.toLowerCase();
      const translation = HEADER_TRANSLATIONS[hStr] || HEADER_TRANSLATIONS[lowerHeader];

      // ค้นหา key ใน updatedData
      const key = this.findMatchingKey(updatedData, lowerHeader, translation);

      if (key && (updatedData as any)[key] !== undefined) {
        return (updatedData as any)[key];
      }

      // Fallback to existing value
      const existingRow = rows[rowIndex] as any;
      const existingKey = this.findMatchingKey(existingRow, lowerHeader, translation);
      return existingKey ? existingRow[existingKey] : '';
    });

    await this.client.updateSheetData(range, [newRowValues]);
  }

  /** ลบ row ที่ match กับ idKey/idValue */
  async delete(idValue: string): Promise<void> {
    const rows = await this.getAll();
    const rowIndex = rows.findIndex(
      (row) => row[this.idKey]?.toString() === idValue.toString(),
    );
    if (rowIndex === -1) throw new Error('Row not found');

    const actualRowIndex = (rows[rowIndex] as any)._row as number;
    const sheetId = await this.client.getSheetId(this.sheetName);
    await this.client.deleteSheetRow(sheetId, actualRowIndex);
    this.client.invalidateCache(this.sheetName);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Map data object → row values array ตาม header order */
  protected mapDataToRow(headers: string[], data: any): any[] {
    return headers.map((header: any) => {
      const hStr = String(header);
      const lowerHeader = hStr.toLowerCase();
      const translation = HEADER_TRANSLATIONS[hStr] || HEADER_TRANSLATIONS[lowerHeader];

      const key = this.findMatchingKey(data, lowerHeader, translation);
      return key ? data[key] : '';
    });
  }

  /** ค้นหา key ใน object ที่ตรงกับ header (case-insensitive + translation) */
  protected findMatchingKey(
    data: any,
    lowerHeader: string,
    translation: string | string[] | undefined,
  ): string | undefined {
    return Object.keys(data).find((k) => {
      const kLower = k.toLowerCase();
      if (kLower === lowerHeader) return true;
      if (translation) {
        if (Array.isArray(translation)) {
          return translation.some((t) => t.toLowerCase() === kLower);
        } else {
          return translation.toLowerCase() === kLower;
        }
      }
      return false;
    });
  }

  /** Strip internal fields (_row) สำหรับส่งกลับ client */
  static stripInternal<R extends Record<string, any>>(row: R): R {
    const { _row, ...rest } = row;
    return rest as R;
  }
}
