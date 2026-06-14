const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// ฟังก์ชันสำหรับอ่าน .env.local แบบง่ายๆ
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
      // ลบเครื่องหมายคำพูดถ้ามี
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      // จัดการ \n ใน private key
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

const requiredSheets = [
  { name: 'Employees', headers: ['id', 'name', 'position', 'department', 'status', 'email', 'salary', 'role', 'nickname', 'startDate'] },
  { name: 'Users', headers: ['id', 'email', 'password', 'role', 'name', 'position', 'avatar', 'employeeId', 'status'] },
  { name: 'Announcements', headers: ['id', 'title', 'category', 'content', 'date'] },
  { name: 'Attendance', headers: ['id', 'employeeId', 'date', 'checkIn', 'checkOut', 'status', 'hours', 'method', 'lat', 'lng'] },
  { name: 'Payroll', headers: ['id', 'employeeId', 'month', 'year', 'baseSalary', 'deductions', 'netPay', 'status'] },
  { name: 'LeaveRequests', headers: ['id', 'employeeId', 'leaveType', 'durationType', 'startDate', 'endDate', 'startTime', 'endTime', 'status', 'reason'] },
  { name: 'LeaveTypes', headers: ['id', 'name', 'maxDays', 'minTenureMonths', 'paid', 'active', 'description'] },
  { name: 'Resignations', headers: ['id', 'employeeId', 'employeeName', 'resignationDate', 'lastWorkingDay', 'reason', 'status', 'submissionDate'] },
  { name: 'Shifts', headers: ['id', 'employeeId', 'date', 'shiftType', 'startTime', 'endTime', 'notes'] },
  { name: 'Assets', headers: ['id', 'name', 'assetId', 'type', 'owner', 'status'] },
  { name: 'Benefits', headers: ['id', 'name', 'type', 'value', 'description', 'employeeId'] },
  { name: 'BusinessTrips', headers: ['id', 'employeeId', 'employeeName', 'destination', 'startDate', 'endDate', 'purpose', 'status', 'budget'] },
  { name: 'CompanyTrips', headers: ['id', 'tripName', 'date', 'location', 'description', 'maxParticipants'] },
  { name: 'Meetings', headers: ['id', 'title', 'date', 'startTime', 'endTime', 'location', 'organizer', 'agenda'] },
  { name: 'Departments', headers: ['id', 'name', 'manager', 'description'] },
  { name: 'Discipline', headers: ['id', 'employeeId', 'employeeName', 'incidentDate', 'incidentType', 'description', 'actionTaken', 'status'] },
  { name: 'Documents', headers: ['id', 'type', 'purpose', 'amount', 'dateRequested', 'status', 'employeeId'] },
  { name: 'Evaluations', headers: ['id', 'employeeId', 'period', 'score', 'feedback', 'manager', 'status'] },
  { name: 'Expenses', headers: ['id', 'title', 'amount', 'category', 'date', 'reason', 'status', 'employeeId'] },
  { name: 'Loans', headers: ['id', 'amount', 'interest', 'term', 'reason', 'status', 'employeeId'] },
  { name: 'RoomBookings', headers: ['id', 'roomName', 'date', 'startTime', 'endTime', 'bookedBy', 'purpose'] },
  { name: 'MeetingRooms', headers: ['id', 'roomName', 'capacity', 'location', 'facilities'] },
  { name: 'Onboarding', headers: ['id', 'taskName', 'category', 'dueDate', 'completed', 'employeeId'] },
  { name: 'Overtime', headers: ['id', 'employeeId', 'date', 'hours', 'reason', 'status'] },
  { name: 'Positions', headers: ['id', 'title', 'grade', 'department', 'description'] },
  { name: 'Recruitment', headers: ['id', 'title', 'department', 'type', 'applicants', 'status'] },
  { name: 'Rewards', headers: ['id', 'title', 'type', 'date', 'description', 'value', 'employeeId'] },
  { name: 'Settings', headers: ['key', 'value'] },
  { name: 'SocialSecurity', headers: ['id', 'employeeId', 'ssn', 'contributionAmount', 'status'] },
  { name: 'Training', headers: ['id', 'title', 'category', 'progress', 'duration', 'rating', 'employeeId'] },
  { name: 'AuditLogs', headers: ['timestamp', 'actor', 'action', 'entity', 'entityId', 'changes'] }
];

async function setup() {
  try {
    console.log('Fetching spreadsheet metadata...');
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = spreadsheet.data.sheets.map(s => s.properties.title);

    const requests = [];

    for (const sheet of requiredSheets) {
      if (!existingSheets.includes(sheet.name)) {
        console.log(`Adding sheet: ${sheet.name}`);
        requests.push({
          addSheet: {
            properties: { title: sheet.name }
          }
        });
      } else {
        console.log(`Sheet already exists: ${sheet.name}`);
      }
    }

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests }
      });
      console.log('New sheets added successfully.');
    }

    // อัปเดต Headers สำหรับทุุก Sheet
    for (const sheet of requiredSheets) {
      console.log(`Setting headers for ${sheet.name}...`);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheet.name}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [sheet.headers]
        }
      });
    }

    console.log('Spreadsheet setup complete!');
    console.log(`Total sheets configured: ${requiredSheets.length}`);
  } catch (error) {
    console.error('Error during setup:', error.message);
    if (error.response) console.error(error.response.data);
  }
}

setup();
