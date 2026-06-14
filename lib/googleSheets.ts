import { google, sheets_v4 } from 'googleapis';

// --- Auth / client singleton -------------------------------------------------
// Re-creating GoogleAuth on every call forced a fresh access-token round-trip
// and added needless load. GoogleAuth refreshes tokens internally, so a single
// cached client is both correct and much lighter on the API.
let _sheetsClient: sheets_v4.Sheets | null = null;

export async function getSheetsInstance() {
  if (_sheetsClient) return _sheetsClient;
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  _sheetsClient = google.sheets({ version: 'v4', auth });
  return _sheetsClient;
}

// --- Rate-limit handling -----------------------------------------------------
// Google Sheets allows ~60 read req/min/user. A burst (dashboard loading several
// sheets, or quick navigation) can trip a 429 RESOURCE_EXHAUSTED. Retry those
// (and transient 503s) with exponential backoff instead of failing the request.
function statusOf(err: any): number | undefined {
  return err?.status ?? err?.code ?? err?.response?.status;
}

export async function withRetry<T>(fn: () => Promise<T>, retries = 4): Promise<T> {
  let lastErr: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const status = statusOf(err);
      if (status !== 429 && status !== 503 && status !== 500) throw err;
      if (attempt === retries) break;
      const delay = Math.min(4000, 300 * 2 ** attempt) + Math.floor(Math.random() * 200);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

// --- Read cache --------------------------------------------------------------
// Short-lived in-memory cache + in-flight de-duplication. Collapses the repeated
// reads of the same range that happen during a single dashboard load or rapid
// page switching, which is what was pushing the app over the per-minute quota.
// Writes invalidate the affected sheet (see sheetManager) so edits show at once.
type CacheEntry = { value: any[][]; expires: number };
const READ_CACHE = new Map<string, CacheEntry>();
const INFLIGHT = new Map<string, Promise<any[][]>>();
const CACHE_TTL_MS = 8000;

export function invalidateSheetCache(sheetName?: string) {
  if (!sheetName) {
    READ_CACHE.clear();
    return;
  }
  const prefix = `${sheetName}!`;
  for (const key of [...READ_CACHE.keys()]) {
    if (key.startsWith(prefix)) READ_CACHE.delete(key);
  }
}

// ฟังก์ชันดึงข้อมูลจาก Google Sheets
export async function getSheetData(range: string): Promise<any[][]> {
  const now = Date.now();
  const cached = READ_CACHE.get(range);
  if (cached && cached.expires > now) return cached.value;

  // If an identical read is already in flight, await it instead of firing again.
  const inflight = INFLIGHT.get(range);
  if (inflight) return inflight;

  const p = (async (): Promise<any[][]> => {
    try {
      const sheets = await getSheetsInstance();
      const response = await withRetry(() =>
        sheets.spreadsheets.values.get({
          spreadsheetId: process.env.SPREADSHEET_ID,
          range, // เช่น 'Employees!A:E'
        }),
      );
      const data = response.data.values || [];
      READ_CACHE.set(range, { value: data, expires: Date.now() + CACHE_TTL_MS });
      return data;
    } catch (error) {
      console.error('Error fetching data from Google Sheets:', error);
      // Serve stale data on failure if we have any — better than wiping the UI.
      if (cached) return cached.value;
      return [];
    } finally {
      INFLIGHT.delete(range);
    }
  })();

  INFLIGHT.set(range, p);
  return p;
}

// ฟังก์ชันเพิ่มข้อมูลลง Google Sheets
export async function appendSheetData(range: string, values: any[][]) {
  try {
    const sheets = await getSheetsInstance();
    const response = await withRetry(() =>
      sheets.spreadsheets.values.append({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: values,
        },
      }),
    );
    // A write makes any cached read of this sheet stale.
    invalidateSheetCache(range.split('!')[0]);
    return response.data;
  } catch (error) {
    console.error('Error appending data to Google Sheets:', error);
    throw error;
  }
}
