const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
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

(async () => {
  const SHEET = 'Positions';
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${SHEET}!A1:Z1` });
  const headers = res.data.values?.[0] || [];
  if (headers.some(h => String(h).toLowerCase() === 'description')) {
    console.log(`⏭️  ${SHEET}: มีคอลัมน์ description อยู่แล้ว — ข้าม`);
    return;
  }
  const newHeaders = [...headers, 'description'];
  await sheets.spreadsheets.values.update({
    spreadsheetId, range: `${SHEET}!A1`, valueInputOption: 'RAW', requestBody: { values: [newHeaders] },
  });
  console.log(`✅ ${SHEET}: เพิ่มคอลัมน์ description แล้ว`);
  console.log('   หัวคอลัมน์ใหม่:', JSON.stringify(newHeaders));
})().catch(e => { console.error('❌', e.message); process.exit(1); });
