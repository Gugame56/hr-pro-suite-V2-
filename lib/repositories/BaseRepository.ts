// =============================================================================
// HR Pro Suite — BaseRepository<T>
// Migrated from Google Sheets → Supabase REST API (PostgREST)
// Same public interface — Controllers & Services ไม่ต้องแก้ไข
// =============================================================================

import { SupabaseClient } from '../infrastructure/SupabaseClient';

/** Thai → English header mapping (kept for backward compatibility with legacy data) */
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
  protected readonly tableName: string;
  protected readonly idKey: string;
  protected readonly client: SupabaseClient;

  constructor(sheetName: string, idKey = 'id') {
    this.sheetName = sheetName;
    this.tableName = this.client_toTableName(sheetName);
    this.idKey = idKey;
    this.client = SupabaseClient.getInstance();
  }

  /** Convert sheet name to Supabase table name (lowercase, no separators) */
  private client_toTableName(sheetName: string): string {
    return sheetName.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  /** ดึงทุก rows จาก Supabase table */
  async getAll(): Promise<T[]> {
    const rows = await this.client.getAll(this.tableName);
    // Return as-is from Supabase (JSON objects with correct column names)
    return rows as T[];
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

  /**
   * Ensure ว่า headers/columns ที่ต้องการมีอยู่ใน table
   * สำหรับ Supabase: เป็น no-op เพราะ columns ถูกสร้างไว้แล้วใน SQL schema
   * คงไว้เพื่อ backward compatibility กับ Controllers/Services ที่เรียกใช้
   */
  async ensureHeaders(required: string[]): Promise<string[]> {
    return required;
  }

  /** เพิ่ม row ใหม่ — auto-generate ID ถ้าไม่มี */
  async add(data: Partial<T>): Promise<string> {
    const record = { ...data } as any;

    // Auto-generate ID for tables that use 'id' as primary key
    if (this.idKey === 'id' && !record.id) {
      record.id = `ID-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    // Remove internal fields
    delete record._row;

    // Remove undefined values (keep empty strings and nulls)
    for (const key of Object.keys(record)) {
      if (record[key] === undefined) {
        delete record[key];
      }
    }

    await this.client.insert(this.tableName, record);
    return record[this.idKey] || '';
  }

  /** อัปเดต row ที่ match กับ idKey/idValue */
  async update(idValue: string, updatedData: Partial<T>): Promise<void> {
    const cleanData = { ...updatedData } as any;

    // Remove internal fields
    delete cleanData._row;
    // Remove the primary key from update data
    delete cleanData[this.idKey];
    // Remove undefined values
    for (const key of Object.keys(cleanData)) {
      if (cleanData[key] === undefined) {
        delete cleanData[key];
      }
    }

    await this.client.update(this.tableName, idValue, cleanData, this.idKey);
  }

  /** ลบ row ที่ match กับ idKey/idValue */
  async delete(idValue: string): Promise<void> {
    await this.client.delete(this.tableName, idValue, this.idKey);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Strip internal fields (_row) สำหรับส่งกลับ client */
  static stripInternal<R extends Record<string, any>>(row: R): R {
    const { _row, ...rest } = row;
    return rest as R;
  }

  // ---------------------------------------------------------------------------
  // Legacy compatibility methods (kept for code that still references them)
  // ---------------------------------------------------------------------------

  /** @deprecated No longer needed with Supabase — kept for backward compatibility */
  protected mapDataToRow(headers: string[], data: any): any[] {
    return headers.map((header: any) => {
      const hStr = String(header);
      const lowerHeader = hStr.toLowerCase();
      const translation = HEADER_TRANSLATIONS[hStr] || HEADER_TRANSLATIONS[lowerHeader];
      const key = this.findMatchingKey(data, lowerHeader, translation);
      return key ? data[key] : '';
    });
  }

  /** @deprecated No longer needed with Supabase — kept for backward compatibility */
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

  /**
   * @deprecated Supabase tables already exist — this is a no-op
   * Kept for CompanyRepository.initialize() and SubscriptionRepository.initialize()
   */
  async initialize(): Promise<void> {
    // No-op for Supabase
  }
}
