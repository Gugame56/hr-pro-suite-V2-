const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('.env.local not found');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...valueParts] = trimmed.split('=');
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

const NEW_SHEETS = [
  {
    name: 'Companies',
    headers: [
      'id',
      'companyCode',
      'name',
      'taxId',
      'contactEmail',
      'contactPhone',
      'status',
      'planDuration',
      'subscriptionStart',
      'subscriptionEnd',
      'createdAt',
    ],
  },
  {
    name: 'Subscriptions',
    headers: [
      'id',
      'companyCode',
      'amount',
      'months',
      'slipUrl',
      'paymentMethod',
      'status',
      'createdAt',
    ],
  },
];

// Existing sheets that should have companyCode
const TENANT_AWARE_SHEETS = [
  'Users',
  'Employees',
  'Attendance',
  'Payroll',
  'LeaveRequests',
  'Departments',
  'Positions',
  'Shifts',
  'Assets',
  'Benefits',
  'BusinessTrips',
  'Discipline',
  'Documents',
  'Evaluations',
  'Expenses',
  'Loans',
  'Onboarding',
  'Overtime',
  'Resignations',
  'Rewards',
  'SocialSecurity',
  'Training',
  'AuditLogs',
];

async function run() {
  console.log(`Connecting to Google Spreadsheet (ID: ${spreadsheetId})...`);
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheetTitles = meta.data.sheets.map(s => s.properties.title);
  console.log(`Existing sheets found: ${existingSheetTitles.join(', ')}`);

  // 1. Create missing new sheets (Companies, Subscriptions)
  const addRequests = [];
  for (const newSheet of NEW_SHEETS) {
    if (!existingSheetTitles.includes(newSheet.name)) {
      console.log(`+ Adding sheet: ${newSheet.name}`);
      addRequests.push({
        addSheet: {
          properties: { title: newSheet.name },
        },
      });
    } else {
      console.log(`✓ Sheet already exists: ${newSheet.name}`);
    }
  }

  if (addRequests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: addRequests },
    });
    console.log('✓ Successfully created missing sheets.');
  }

  // 2. Set headers for Companies and Subscriptions
  for (const s of NEW_SHEETS) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${s.name}!A1:Z1`,
    });
    const currentHeaders = res.data.values?.[0] || [];
    if (currentHeaders.length === 0) {
      console.log(`Setting headers for ${s.name}...`);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${s.name}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [s.headers],
        },
      });
      console.log(`✓ Headers set for ${s.name}: ${s.headers.join(', ')}`);
    } else {
      console.log(`✓ Headers already exist in ${s.name}: ${currentHeaders.join(', ')}`);
    }
  }

  // 3. Add default demo company into Companies sheet if empty
  const companiesRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Companies!A2:Z',
  });
  const existingCompanies = companiesRes.data.values || [];
  if (existingCompanies.length === 0) {
    console.log('Adding demo company (DEMO-0001)...');
    const now = new Date();
    const expiry = new Date();
    expiry.setFullYear(now.getFullYear() + 1); // 1 year

    const demoCompanyRow = [
      'COMP-DEMO-01',
      'DEMO-0001',
      'บริษัท เอชอาร์ โปร ซูท จำกัด (Demo)',
      '0105559999999',
      'admin@hrpro.com',
      '02-123-4567',
      'active',
      '1y',
      now.toISOString(),
      expiry.toISOString(),
      now.toISOString(),
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Companies!A:K',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [demoCompanyRow],
      },
    });

    // Add demo payment
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Subscriptions!A:H',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [
            'SUB-DEMO-01',
            'DEMO-0001',
            '9900',
            '12',
            '',
            'promptpay',
            'completed',
            now.toISOString(),
          ],
        ],
      },
    });

    console.log('✓ Demo company DEMO-0001 added to Companies and Subscriptions.');
  }

  // 4. Ensure `companyCode` header is added to all other sheets
  console.log('\nChecking and adding companyCode column to existing sheets...');
  for (const sheetName of TENANT_AWARE_SHEETS) {
    if (!existingSheetTitles.includes(sheetName)) continue;

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:ZZ1`,
    });
    const headers = res.data.values?.[0] || [];
    if (headers.length === 0) continue;

    const hasCompanyCode = headers.some(h => String(h).trim().toLowerCase() === 'companycode');
    if (!hasCompanyCode) {
      headers.push('companyCode');
      console.log(`+ Adding 'companyCode' column to ${sheetName} (column index ${headers.length})`);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers],
        },
      });

      // Update existing rows in Users/Employees with DEMO-0001 if empty
      if (sheetName === 'Users' || sheetName === 'Employees') {
        const rowsRes = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!A2:ZZ`,
        });
        const rows = rowsRes.data.values || [];
        const colIdx = headers.length - 1;
        let modified = false;

        rows.forEach(r => {
          while (r.length < headers.length) r.push('');
          if (!r[colIdx]) {
            r[colIdx] = 'DEMO-0001';
            modified = true;
          }
        });

        if (modified && rows.length > 0) {
          console.log(`  Assigning DEMO-0001 to ${rows.length} rows in ${sheetName}...`);
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!A2`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: rows,
            },
          });
          console.log(`  ✓ Updated existing ${sheetName} with DEMO-0001.`);
        }
      }
    } else {
      console.log(`✓ ${sheetName} already has 'companyCode' column`);
    }
  }

  console.log('\n🎉 ALL DONE! Google Sheets Multi-Tenant setup completed successfully.');
}

run().catch(err => {
  console.error('Fatal setup error:', err);
  process.exit(1);
});
