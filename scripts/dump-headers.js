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
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});
const sheets = google.sheets({ version: 'v4', auth });
const spreadsheetId = env.SPREADSHEET_ID;

(async () => {
  for (const name of ['Positions', 'Departments']) {
    try {
      const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${name}!A1:Z2` });
      const vals = res.data.values || [];
      console.log(`\n=== ${name} ===`);
      console.log('HEADERS:', JSON.stringify(vals[0] || []));
      console.log('ROW1   :', JSON.stringify(vals[1] || []));
    } catch (e) {
      console.log(`\n=== ${name} === ERROR: ${e.message}`);
    }
  }
})();
