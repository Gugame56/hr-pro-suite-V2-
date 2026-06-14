import { getSheetData, appendSheetData, getSheetsInstance, withRetry, invalidateSheetCache } from './googleSheets';

const HEADER_TRANSLATIONS: Record<string, string | string[]> = {
  // Common Thai to English mappings
  'ชื่อ': 'name',
  'ชื่อแผนก': 'name',
  // Live sheets sometimes use a fully-qualified English header instead of the
  // short key the UI reads. Map those aliases so values surface correctly.
  'departmentName': 'name',
  'departmentname': 'name',
  'positionName': 'title',
  'positionname': 'title',
  'level': 'grade',
  'แผนก': ['department', 'name'], // 'แผนก' can mean department name in Departments sheet
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

export async function getRows(sheetName: string) {
  const range = `${sheetName}!A:Z`;
  const values = await getSheetData(range);
  if (!values || values.length === 0) return [];

  const headers = values[0];
  const hasIdColumn = headers.some(h => String(h).toLowerCase() === 'id');

  const rows = values.slice(1).map((row, index) => {
    const obj: any = {};
    headers.forEach((header, i) => {
      const val = row[i] || '';
      const hStr = String(header);
      obj[hStr] = val;
      
      // Also provide lowercase keys for easier access in code
      const lowerHeader = hStr.toLowerCase();
      if (lowerHeader !== hStr) {
        obj[lowerHeader] = val;
      }

      // Map Thai headers to English keys
      const translation = HEADER_TRANSLATIONS[hStr] || HEADER_TRANSLATIONS[lowerHeader];
      if (translation) {
        if (Array.isArray(translation)) {
          translation.forEach(key => { obj[key] = val; });
        } else {
          obj[translation] = val;
        }
      }
    });
    // `_row` is the real 1-based sheet row number; it is what update/delete use to
    // address the row, so edits never drift even if data is sparse or shifts.
    obj._row = index + 2;

    if (!hasIdColumn) {
      obj.id = (index + 2).toString();
    }
    return obj;
  });

  return rows;
}

/**
 * Make sure the given header columns exist in row 1 of the sheet. Missing ones
 * are appended to the end of the header row. If the sheet does not exist, it is created.
 */
export async function ensureHeaders(sheetName: string, required: string[]): Promise<string[]> {
  const sheets = await getSheetsInstance();
  let headers: string[] = [];
  
  try {
    const headerRange = `${sheetName}!A1:Z1`;
    const headerResponse = await withRetry(() => sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: headerRange,
    }));
    headers = headerResponse.data.values?.[0] || [];
  } catch (error: any) {
    // If sheet doesn't exist (400 error), create it
    if (error.response?.status === 400 || error.message?.includes('not found')) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: process.env.SPREADSHEET_ID,
        requestBody: {
          requests: [{ addSheet: { properties: { title: sheetName } } }]
        }
      });
      headers = [];
    } else {
      throw error;
    }
  }

  const lower = headers.map(h => String(h).toLowerCase());
  const missing = required.filter(h => !lower.includes(h.toLowerCase()));
  if (missing.length === 0 && headers.length > 0) return headers;

  const newHeaders = [...headers, ...missing];
  await withRetry(() => sheets.spreadsheets.values.update({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [newHeaders] },
  }));
  invalidateSheetCache(sheetName);
  return newHeaders;
}

export async function addRow(sheetName: string, data: any) {
  const sheets = await getSheetsInstance();
  const headerRange = `${sheetName}!A1:Z1`;
  const headerResponse = await withRetry(() => sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: headerRange,
  }));
  const headers = headerResponse.data.values?.[0] || [];

  if (headers.length === 0) {
    throw new Error(`Sheet ${sheetName} must have headers in the first row.`);
  }

  // Generate ID if not provided and 'id' header exists
  const idIndex = headers.findIndex(h => h.toLowerCase() === 'id');
  if (idIndex !== -1 && !data.id) {
    // Simple unique ID generation
    data.id = `ID-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  const rowValues = headers.map(header => {
    const hStr = String(header);
    const lowerHeader = hStr.toLowerCase();
    const translation = HEADER_TRANSLATIONS[hStr] || HEADER_TRANSLATIONS[lowerHeader];

    // Find data value by case-insensitive header match OR by translated key
    const key = Object.keys(data).find(k => {
      const kLower = k.toLowerCase();
      if (kLower === lowerHeader) return true;
      if (translation) {
        if (Array.isArray(translation)) {
          return translation.some(t => t.toLowerCase() === kLower);
        } else {
          return translation.toLowerCase() === kLower;
        }
      }
      return false;
    });
    return key ? data[key] : '';
  });

  await appendSheetData(sheetName, [rowValues]);
  return { success: true };
}

export async function updateRow(sheetName: string, rowIdKey: string, rowIdValue: string, updatedData: any) {
  const rows = await getRows(sheetName);

  const sheets = await getSheetsInstance();
  const headerResponse = await withRetry(() => sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: `${sheetName}!A1:Z1`,
  }));
  const headers = headerResponse.data.values?.[0] || [];

  const rowIndex = rows.findIndex(row => row[rowIdKey]?.toString() === rowIdValue.toString());
  if (rowIndex === -1) throw new Error('Row not found');

  // Address by the row's real sheet position, not its array index.
  const actualRowNumber = rows[rowIndex]._row as number;
  const range = `${sheetName}!A${actualRowNumber}:Z${actualRowNumber}`;

  const newRowValues = headers.map(header => {
    const hStr = String(header);
    const lowerHeader = hStr.toLowerCase();
    const translation = HEADER_TRANSLATIONS[hStr] || HEADER_TRANSLATIONS[lowerHeader];

    const key = Object.keys(updatedData).find(k => {
      const kLower = k.toLowerCase();
      if (kLower === lowerHeader) return true;
      if (translation) {
        if (Array.isArray(translation)) {
          return translation.some(t => t.toLowerCase() === kLower);
        } else {
          return translation.toLowerCase() === kLower;
        }
      }
      return false;
    });

    if (key && updatedData[key] !== undefined) {
      return updatedData[key];
    }
    // Fallback to existing value
    const existingRow = rows[rowIndex];
    const existingKey = Object.keys(existingRow).find(k => {
      const kLower = k.toLowerCase();
      if (kLower === lowerHeader) return true;
      if (translation) {
        if (Array.isArray(translation)) {
          return translation.some(t => t.toLowerCase() === kLower);
        } else {
          return translation.toLowerCase() === kLower;
        }
      }
      return false;
    });
    return existingKey ? existingRow[existingKey] : '';
  });

  await withRetry(() => sheets.spreadsheets.values.update({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: range,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [newRowValues],
    },
  }));
  invalidateSheetCache(sheetName);

  return { success: true };
}

export async function deleteRow(sheetName: string, rowIdKey: string, rowIdValue: string) {
  const rows = await getRows(sheetName);
  const rowIndex = rows.findIndex(row => row[rowIdKey]?.toString() === rowIdValue.toString());
  if (rowIndex === -1) throw new Error('Row not found');

  const actualRowIndex = rows[rowIndex]._row as number;
  const sheets = await getSheetsInstance();
  const sheetId = await getSheetId(sheetName);

  await withRetry(() => sheets.spreadsheets.batchUpdate({
    spreadsheetId: process.env.SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: actualRowIndex - 1,
              endIndex: actualRowIndex,
            },
          },
        },
      ],
    },
  }));
  invalidateSheetCache(sheetName);

  return { success: true };
}

async function getSheetId(sheetName: string): Promise<number> {
  const sheets = await getSheetsInstance();
  const response = await withRetry(() => sheets.spreadsheets.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
  }));
  const sheet = response.data.sheets?.find(s => s.properties?.title === sheetName);
  if (!sheet) throw new Error(`Sheet ${sheetName} not found`);
  return sheet.properties!.sheetId!;
}
