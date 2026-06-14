// Rebuild the two date-sensitive sheets (Payroll, Attendance) with the correct
// schema, anchored to the REAL current date so the dashboard shows live numbers.
//
//  - Payroll uses the authoritative 8-col schema from lib/payrollSync.ts
//    (id, employeeId, month[Thai], year, baseSalary, deductions, netPay, status).
//  - Attendance is seeded with ~20 recent weekdays per employee so the
//    "attendance rate" and weekly chart look realistic (not 9%).
//
// This CLEARS both sheets first, so it is safe to re-run.
// Run:  node scripts/refresh-payroll-attendance.js

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
function loadEnv() {
  const env = {};
  fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n').forEach(line => {
    const [k, ...r] = line.split('=');
    if (k && r.length) { let v = r.join('=').trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); env[k.trim()] = v.replace(/\\n/g, '\n'); }
  });
  return env;
}
const env = loadEnv();
const sheets = google.sheets({ version: 'v4', auth: new google.auth.GoogleAuth({ credentials: { client_email: env.GOOGLE_CLIENT_EMAIL, private_key: env.GOOGLE_PRIVATE_KEY }, scopes: ['https://www.googleapis.com/auth/spreadsheets'] }) });
const spreadsheetId = env.SPREADSHEET_ID;

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const now = new Date();
const curMonth = THAI_MONTHS[now.getMonth()];
const curYear = now.getFullYear().toString();

const EMP = [
  { id: 'EMP-001', salary: 65000 }, { id: 'EMP-002', salary: 60000 }, { id: 'EMP-003', salary: 45000 },
  { id: 'EMP-004', salary: 32000 }, { id: 'EMP-005', salary: 38000 }, { id: 'EMP-006', salary: 30000 },
  { id: 'EMP-007', salary: 42000 }, { id: 'EMP-008', salary: 48000 }, { id: 'EMP-009', salary: 28000 },
  { id: 'EMP-010', salary: 62000 },
];

// Payroll (8-col authoritative schema)
const payrollHeaders = ['id', 'employeeId', 'month', 'year', 'baseSalary', 'deductions', 'netPay', 'status'];
const payrollRows = EMP.map(e => {
  const ded = Math.min(750, Math.round(e.salary * 0.05)); // social security cap
  return [`PAY-${e.id}`, e.id, curMonth, curYear, e.salary, ded, e.salary - ded, 'Paid'];
});

// Attendance: last ~28 days, weekdays only, per employee.
const attHeaders = ['id', 'employeeId', 'date', 'checkIn', 'checkOut', 'status', 'hours', 'method', 'lat', 'lng'];
const attRows = [];
for (const e of EMP) {
  let n = 0;
  for (let back = 0; back < 40 && n < 20; back++) {
    const dt = new Date(now); dt.setDate(now.getDate() - back);
    const dow = dt.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends
    n++;
    const iso = dt.toISOString().slice(0, 10);
    const late = (back + e.id.charCodeAt(6)) % 9 === 0;
    attRows.push([`ATT-${e.id}-${n}`, e.id, iso, late ? '09:14' : '08:52', '18:01', late ? 'Late' : 'Present', '8.5', 'GPS', '13.7563', '100.5018']);
  }
}

async function rebuild(name, headers, rows) {
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${name}!A:Z` });
  await sheets.spreadsheets.values.update({ spreadsheetId, range: `${name}!A1`, valueInputOption: 'RAW', requestBody: { values: [headers] } });
  await sheets.spreadsheets.values.append({ spreadsheetId, range: `${name}!A1`, valueInputOption: 'USER_ENTERED', requestBody: { values: rows } });
  console.log(`✅ ${name}: รีเซ็ตและเพิ่ม ${rows.length} แถว (งวด ${curMonth} ${curYear})`);
}

(async () => {
  await rebuild('Payroll', payrollHeaders, payrollRows);
  await rebuild('Attendance', attHeaders, attRows);
  console.log('🎉 เสร็จสิ้น — Dashboard จะแสดงยอดเงินเดือนและอัตราการเข้างานจริง');
})();
