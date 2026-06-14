// Append login accounts for the seeded demo employees (idempotent by email).
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

const EMP = [
  ['EMP-001', 'ก้องภพ วัฒนกุล', 'ผู้จัดการฝ่ายไอที', 'kongphop@hrpro.com', 'manager'],
  ['EMP-002', 'ปิยะวรรณ ศรีสุข', 'ผู้จัดการฝ่ายบุคคล', 'piyawan@hrpro.com', 'manager'],
  ['EMP-003', 'ธนกร อินทรา', 'นักพัฒนาซอฟต์แวร์', 'thanakorn@hrpro.com', 'employee'],
  ['EMP-004', 'ศิริพร ทองดี', 'เจ้าหน้าที่การตลาด', 'siriporn@hrpro.com', 'employee'],
  ['EMP-005', 'ณัฐพล มั่งมี', 'นักบัญชี', 'nattapon@hrpro.com', 'employee'],
  ['EMP-006', 'อรอุมา แสงทอง', 'เจ้าหน้าที่บุคคล', 'onuma@hrpro.com', 'employee'],
  ['EMP-007', 'พีรพัฒน์ ชัยมงคล', 'นักพัฒนาซอฟต์แวร์', 'peerapat@hrpro.com', 'employee'],
  ['EMP-008', 'กมลชนก ภักดี', 'หัวหน้าทีมการตลาด', 'kamonchanok@hrpro.com', 'employee'],
  ['EMP-009', 'วีรภัทร สุขสันต์', 'พนักงานขาย', 'weeraphat@hrpro.com', 'employee'],
  ['EMP-010', 'จิราพร เพ็ชรงาม', 'ผู้จัดการฝ่ายการเงิน', 'jiraporn@hrpro.com', 'manager'],
];

(async () => {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Users!A:I' });
  const existingEmails = new Set((res.data.values || []).slice(1).map(r => (r[1] || '').toLowerCase()));
  // headers: id, email, password, role, name, position, avatar, employeeId, status
  const rows = EMP.filter(([, , , email]) => !existingEmails.has(email.toLowerCase()))
    .map(([id, name, position, email, role]) => [`USR-${id}`, email, 'password123', role, name, position, name.slice(0, 2), id, 'active']);
  if (!rows.length) { console.log('ครบแล้ว ไม่มีบัญชีใหม่ต้องเพิ่ม'); return; }
  await sheets.spreadsheets.values.append({ spreadsheetId, range: 'Users!A1', valueInputOption: 'USER_ENTERED', requestBody: { values: rows } });
  console.log(`เพิ่มบัญชีพนักงาน ${rows.length} บัญชี (รหัสผ่าน: password123)`);
})();
