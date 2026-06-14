// Idempotent setup for the attendance/geofence feature.
//
// Safe to run on an existing spreadsheet — it only ADDS what is missing and
// never overwrites existing data:
//   1. Ensures the `Settings` tab exists with `key`/`value` headers.
//   2. Seeds default geofence settings keys (only those not already present).
//   3. Ensures the `Attendance` tab has the `method`, `lat`, `lng` columns
//      (appended after existing headers; existing rows are untouched).
//
// Run:  node scripts/setup-attendance.js

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// อ่าน .env.local แบบง่ายๆ (เหมือน setup-sheets.js)
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('.env.local not found');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      let value = valueParts.join('=').trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      env[key.trim()] = value.replace(/\\n/g, '\n');
    }
  });
  return env;
}

const env = loadEnv();

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: env.GOOGLE_CLIENT_EMAIL,
    private_key: env.GOOGLE_PRIVATE_KEY,
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const spreadsheetId = env.SPREADSHEET_ID;

// คอลัมน์ที่ต้องมีใน Attendance สำหรับเก็บหลักฐานการยืนยัน
const ATTENDANCE_VERIFY_COLUMNS = ['method', 'lat', 'lng'];

// ค่าตั้งต้นของระบบ geofence (จะเพิ่มเฉพาะ key ที่ยังไม่มี)
const DEFAULT_SETTINGS = {
  attendance_verify_gps: 'Off',
  attendance_verify_qr: 'Off',
  office_lat: '',
  office_lng: '',
  office_radius: '200',
  attendance_qr_token: '',
};

async function ensureSheetExists(title) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = meta.data.sheets.some(s => s.properties.title === title);
  if (!exists) {
    console.log(`Creating tab: ${title}`);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title } } }] },
    });
  } else {
    console.log(`Tab already exists: ${title}`);
  }
}

async function getRow1(title) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${title}!1:1`,
  });
  return (res.data.values && res.data.values[0]) || [];
}

async function setupSettings() {
  await ensureSheetExists('Settings');

  // ตรวจ header — ถ้ายังว่างให้ใส่ key/value
  let headers = await getRow1('Settings');
  if (headers.length === 0) {
    console.log('Settings: writing key/value headers');
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Settings!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['key', 'value']] },
    });
  }

  // อ่าน key ที่มีอยู่ แล้วเพิ่มเฉพาะค่า default ที่ยังขาด
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Settings!A:B',
  });
  const existingKeys = new Set(
    (res.data.values || []).slice(1).map(r => r[0]).filter(Boolean)
  );

  const toAppend = Object.entries(DEFAULT_SETTINGS)
    .filter(([key]) => !existingKeys.has(key))
    .map(([key, value]) => [key, value]);

  if (toAppend.length > 0) {
    console.log(`Settings: seeding ${toAppend.length} default key(s): ${toAppend.map(r => r[0]).join(', ')}`);
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Settings!A:B',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: toAppend },
    });
  } else {
    console.log('Settings: all geofence keys already present');
  }
}

async function setupAttendanceColumns() {
  await ensureSheetExists('Attendance');

  let headers = await getRow1('Attendance');

  // ถ้าไม่มี header เลย ให้ใส่ชุดเต็ม(รวมคอลัมน์ใหม่)
  if (headers.length === 0) {
    headers = ['id', 'employeeId', 'date', 'checkIn', 'checkOut', 'status', 'hours', ...ATTENDANCE_VERIFY_COLUMNS];
    console.log('Attendance: writing full header row');
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Attendance!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [headers] },
    });
    return;
  }

  // ต่อท้ายเฉพาะคอลัมน์ที่ยังขาด (เทียบแบบ case-insensitive)
  const lower = headers.map(h => String(h).toLowerCase());
  const missing = ATTENDANCE_VERIFY_COLUMNS.filter(c => !lower.includes(c.toLowerCase()));

  if (missing.length === 0) {
    console.log('Attendance: verify columns already present');
    return;
  }

  const newHeaders = [...headers, ...missing];
  console.log(`Attendance: appending column(s): ${missing.join(', ')}`);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Attendance!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [newHeaders] },
  });
}

async function main() {
  try {
    console.log('Setting up attendance / geofence...\n');
    await setupSettings();
    console.log('');
    await setupAttendanceColumns();
    console.log('\n✅ Attendance/geofence setup complete!');
  } catch (error) {
    console.error('Error during setup:', error.message);
    if (error.response) console.error(error.response.data);
    process.exit(1);
  }
}

main();
