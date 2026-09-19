// =============================================================================
// HR Pro Suite — GoogleSheetsClient (Singleton)
// แปลงจาก googleSheets.ts เดิม — รวม auth, retry, read/write operations
// =============================================================================

import { google, sheets_v4 } from 'googleapis';
import { CacheManager } from './CacheManager';

export class GoogleSheetsClient {
  private static instance: GoogleSheetsClient;

  private sheetsClient: sheets_v4.Sheets | null = null;
  private readonly cache: CacheManager;
  private readonly spreadsheetId: string;

  private constructor() {
    this.cache = CacheManager.getInstance();
    this.spreadsheetId = process.env.SPREADSHEET_ID || '';
  }

  /** Singleton instance */
  static getInstance(): GoogleSheetsClient {
    if (!GoogleSheetsClient.instance) {
      GoogleSheetsClient.instance = new GoogleSheetsClient();
    }
    return GoogleSheetsClient.instance;
  }

  // ---------------------------------------------------------------------------
  // Auth / client
  // ---------------------------------------------------------------------------

  /** ดึง Google Sheets API client (สร้างครั้งเดียว แล้ว reuse) */
  async getSheetsApi(): Promise<sheets_v4.Sheets> {
    if (this.sheetsClient) return this.sheetsClient;

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheetsClient = google.sheets({ version: 'v4', auth });
    return this.sheetsClient;
  }

  // ---------------------------------------------------------------------------
  // Retry logic
  // ---------------------------------------------------------------------------

  /** Retry with exponential backoff สำหรับ 429/503/500 errors */
  async withRetry<T>(fn: () => Promise<T>, retries = 4): Promise<T> {
    let lastErr: any;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err: any) {
        lastErr = err;
        const status = this.statusOf(err);
        if (status !== 429 && status !== 503 && status !== 500) throw err;
        if (attempt === retries) break;
        const delay = Math.min(4000, 300 * 2 ** attempt) + Math.floor(Math.random() * 200);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw lastErr;
  }

  private statusOf(err: any): number | undefined {
    return err?.status ?? err?.code ?? err?.response?.status;
  }

  // ---------------------------------------------------------------------------
  // Read operations (with cache + in-flight dedup)
  // ---------------------------------------------------------------------------

  /** อ่านข้อมูลจาก Google Sheets พร้อม cache + in-flight dedup */
  async getSheetData(range: string): Promise<any[][]> {
    // ตรวจ cache ก่อน
    const cached = this.cache.get(range);
    if (cached) return cached;

    // ถ้ามี request เดียวกันกำลัง in-flight อยู่ ให้รอแทน
    const inflight = this.cache.getInflight(range);
    if (inflight) return inflight;

    const p = (async (): Promise<any[][]> => {
      try {
        const sheets = await this.getSheetsApi();
        const response = await this.withRetry(() =>
          sheets.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range,
          }),
        );
        const data = response.data.values || [];
        this.cache.set(range, data);
        return data;
      } catch (error) {
        console.error('Error fetching data from Google Sheets:', error);
        // Serve stale data on failure if we have any
        const stale = this.cache.getStale(range);
        if (stale) return stale;
        return [];
      } finally {
        this.cache.deleteInflight(range);
      }
    })();

    this.cache.setInflight(range, p);
    return p;
  }

  // ---------------------------------------------------------------------------
  // Write operations
  // ---------------------------------------------------------------------------

  /** เพิ่ม row(s) ลง Google Sheets */
  async appendSheetData(range: string, values: any[][]): Promise<any> {
    try {
      const sheets = await this.getSheetsApi();
      const response = await this.withRetry(() =>
        sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values },
        }),
      );
      // ล้าง cache ของ sheet ที่เขียน
      this.cache.invalidate(range.split('!')[0]);
      return response.data;
    } catch (error) {
      console.error('Error appending data to Google Sheets:', error);
      throw error;
    }
  }

  /** อัปเดต row ที่ตำแหน่งระบุ */
  async updateSheetData(range: string, values: any[][]): Promise<any> {
    const sheets = await this.getSheetsApi();
    const response = await this.withRetry(() =>
      sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      }),
    );
    this.cache.invalidate(range.split('!')[0]);
    return response.data;
  }

  /** ลบ row ที่ตำแหน่งระบุ */
  async deleteSheetRow(sheetId: number, rowIndex: number): Promise<void> {
    const sheets = await this.getSheetsApi();
    await this.withRetry(() =>
      sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndex - 1,
                  endIndex: rowIndex,
                },
              },
            },
          ],
        },
      }),
    );
  }

  /** ดึง sheetId (numeric) จากชื่อ sheet */
  async getSheetId(sheetName: string): Promise<number> {
    const sheets = await this.getSheetsApi();
    const response = await this.withRetry(() =>
      sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      }),
    );
    const sheet = response.data.sheets?.find(
      (s) => s.properties?.title === sheetName,
    );
    if (!sheet) throw new Error(`Sheet ${sheetName} not found`);
    return sheet.properties!.sheetId!;
  }

  /** สร้าง sheet ใหม่ */
  async createSheet(sheetName: string): Promise<void> {
    const sheets = await this.getSheetsApi();
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetName } } }],
      },
    });
  }

  /** อ่าน headers (row 1) ของ sheet */
  async getHeaders(sheetName: string): Promise<string[]> {
    const sheets = await this.getSheetsApi();
    const headerRange = `${sheetName}!A1:Z1`;
    const response = await this.withRetry(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: headerRange,
      }),
    );
    return response.data.values?.[0] || [];
  }

  /** เขียน headers ลง row 1 */
  async setHeaders(sheetName: string, headers: string[]): Promise<void> {
    await this.updateSheetData(`${sheetName}!A1`, [headers]);
  }

  /** ล้าง cache ของ sheet ที่ระบุ */
  invalidateCache(sheetName?: string): void {
    this.cache.invalidate(sheetName);
  }
}
