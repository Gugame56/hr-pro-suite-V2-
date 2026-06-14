const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Read .env.local (handles single- or double-quoted values and \n in keys).
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
  credentials: { client_email: env.GOOGLE_CLIENT_EMAIL, private_key: env.GOOGLE_PRIVATE_KEY },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });
const spreadsheetId = env.SPREADSHEET_ID;

// Canonical schema the Discipline UI reads (must match setup-sheets.js / seed-demo.js).
const CANON = ['id', 'employeeId', 'employeeName', 'incidentDate', 'incidentType', 'description', 'actionTaken', 'status'];

// Old live header -> canonical key. Live sheet shipped as id/employeeId/type/date/description/status.
const ALIAS = {
  type: 'incidentType',
  date: 'incidentDate',
  incidenttype: 'incidentType',
  incidentdate: 'incidentDate',
  actiontaken: 'actionTaken',
  employeename: 'employeeName',
  employeeid: 'employeeId',
};

function canonKey(header) {
  const h = String(header).trim();
  if (CANON.includes(h)) return h;
  const lower = h.toLowerCase();
  if (ALIAS[lower]) return ALIAS[lower];
  const hit = CANON.find(c => c.toLowerCase() === lower);
  return hit || null;
}

(async () => {
  // Build an employeeId -> name map from Employees so we can backfill employeeName.
  const nameById = {};
  try {
    const emp = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Employees!A1:Z' });
    const ev = emp.data.values || [];
    if (ev.length) {
      const eh = ev[0].map(x => String(x).toLowerCase());
      const idIdx = eh.findIndex(x => x === 'id' || x === 'employeeid');
      const nameIdx = eh.findIndex(x => x === 'name' || x === 'employeename' || x === 'fullname');
      if (idIdx !== -1 && nameIdx !== -1) {
        ev.slice(1).forEach(r => { if (r[idIdx]) nameById[String(r[idIdx]).trim()] = r[nameIdx] || ''; });
      }
    }
  } catch (e) {
    console.log('Employees lookup skipped:', e.message);
  }

  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Discipline!A1:Z' });
  const values = res.data.values || [];
  if (values.length === 0) {
    console.log('Discipline sheet empty — nothing to migrate.');
    return;
  }

  const oldHeaders = values[0];
  console.log('OLD headers:', JSON.stringify(oldHeaders));

  // Map each old column to a canonical key (or null if it has no canonical home).
  const colKey = oldHeaders.map(canonKey);

  const newRows = values.slice(1).map(row => {
    const rec = {};
    colKey.forEach((k, i) => { if (k) rec[k] = row[i] != null ? row[i] : ''; });
    // Backfill / defaults.
    if (!rec.employeeName && rec.employeeId && nameById[String(rec.employeeId).trim()]) {
      rec.employeeName = nameById[String(rec.employeeId).trim()];
    }
    if (!rec.incidentType) rec.incidentType = 'Warning';
    if (!rec.status) rec.status = 'Open';
    return CANON.map(c => (rec[c] != null ? rec[c] : ''));
  });

  const out = [CANON, ...newRows];

  // Clear then rewrite so removed/renamed columns don't linger.
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: 'Discipline!A:Z' });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Discipline!A1',
    valueInputOption: 'RAW',
    requestBody: { values: out },
  });

  console.log('NEW headers:', JSON.stringify(CANON));
  console.log(`Migrated ${newRows.length} data row(s).`);
  newRows.forEach((r, i) => console.log(`  row ${i + 1}:`, JSON.stringify(r)));
  console.log('Done.');
})().catch(e => { console.error(e); process.exit(1); });
