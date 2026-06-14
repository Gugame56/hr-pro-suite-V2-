// Seed realistic Thai demo data into every module so the app is immediately
// usable / demonstrable. Idempotent: a sheet that already has data rows (more
// than just the header) is skipped, so re-running never duplicates rows.
//
// Run:  node scripts/seed-demo.js

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('.env.local not found');
    process.exit(1);
  }
  const env = {};
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) {
      let v = rest.join('=').trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      env[key.trim()] = v.replace(/\\n/g, '\n');
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

// --- Demo people. Employees.id IS the employeeId referenced by other sheets. ---
const EMP = [
  { id: 'EMP-001', name: 'ก้องภพ วัฒนกุล',   nickname: 'ก้อง', position: 'ผู้จัดการฝ่ายไอที',   department: 'ไอที',          status: 'Active', email: 'kongphop@hrpro.com',  salary: 65000, role: 'manager'  },
  { id: 'EMP-002', name: 'ปิยะวรรณ ศรีสุข',   nickname: 'ปิ่น', position: 'ผู้จัดการฝ่ายบุคคล',  department: 'ทรัพยากรบุคคล',  status: 'Active', email: 'piyawan@hrpro.com',   salary: 60000, role: 'manager'  },
  { id: 'EMP-003', name: 'ธนกร อินทรา',       nickname: 'กร',   position: 'นักพัฒนาซอฟต์แวร์',   department: 'ไอที',          status: 'Active', email: 'thanakorn@hrpro.com', salary: 45000, role: 'employee' },
  { id: 'EMP-004', name: 'ศิริพร ทองดี',       nickname: 'พร',   position: 'เจ้าหน้าที่การตลาด',  department: 'การตลาด',       status: 'Active', email: 'siriporn@hrpro.com',  salary: 32000, role: 'employee' },
  { id: 'EMP-005', name: 'ณัฐพล มั่งมี',       nickname: 'นัท',  position: 'นักบัญชี',           department: 'บัญชีการเงิน',   status: 'Active', email: 'nattapon@hrpro.com',  salary: 38000, role: 'employee' },
  { id: 'EMP-006', name: 'อรอุมา แสงทอง',      nickname: 'อร',   position: 'เจ้าหน้าที่บุคคล',    department: 'ทรัพยากรบุคคล',  status: 'Active', email: 'onuma@hrpro.com',     salary: 30000, role: 'employee' },
  { id: 'EMP-007', name: 'พีรพัฒน์ ชัยมงคล',   nickname: 'พีร์', position: 'นักพัฒนาซอฟต์แวร์',   department: 'ไอที',          status: 'Active', email: 'peerapat@hrpro.com',  salary: 42000, role: 'employee' },
  { id: 'EMP-008', name: 'กมลชนก ภักดี',       nickname: 'ก้อย', position: 'หัวหน้าทีมการตลาด',   department: 'การตลาด',       status: 'Active', email: 'kamonchanok@hrpro.com', salary: 48000, role: 'employee' },
  { id: 'EMP-009', name: 'วีรภัทร สุขสันต์',    nickname: 'บิ๊ก', position: 'พนักงานขาย',         department: 'ฝ่ายขาย',        status: 'Active', email: 'weeraphat@hrpro.com', salary: 28000, role: 'employee' },
  { id: 'EMP-010', name: 'จิราพร เพ็ชรงาม',     nickname: 'จิ',   position: 'ผู้จัดการฝ่ายการเงิน', department: 'บัญชีการเงิน',  status: 'Active', email: 'jiraporn@hrpro.com',  salary: 62000, role: 'manager'  },
];

const today = new Date('2026-06-11');
const d = (offsetDays) => { const x = new Date(today); x.setDate(x.getDate() + offsetDays); return x.toISOString().slice(0, 10); };

// header -> rows. Order of values must match the header order created by setup-sheets.js.
const DATA = {
  Departments: {
    headers: ['id', 'name', 'manager', 'description'],
    rows: [
      ['DEP-01', 'ไอที',         'ก้องภพ วัฒนกุล',  'พัฒนาระบบและดูแลโครงสร้างพื้นฐานไอที'],
      ['DEP-02', 'ทรัพยากรบุคคล', 'ปิยะวรรณ ศรีสุข', 'สรรหา ดูแลสวัสดิการ และพัฒนาบุคลากร'],
      ['DEP-03', 'การตลาด',       'กมลชนก ภักดี',    'วางแผนการตลาดและสื่อสารแบรนด์'],
      ['DEP-04', 'บัญชีการเงิน',   'จิราพร เพ็ชรงาม', 'ดูแลบัญชี งบประมาณ และการเงิน'],
      ['DEP-05', 'ฝ่ายขาย',        'วีรภัทร สุขสันต์', 'ดูแลงานขายและความสัมพันธ์ลูกค้า'],
    ],
  },
  Positions: {
    headers: ['id', 'title', 'grade', 'department', 'description'],
    rows: [
      ['POS-01', 'ผู้จัดการฝ่ายไอที',   'Management', 'ไอที',          'บริหารทีมพัฒนาและโครงสร้างพื้นฐานไอที'],
      ['POS-02', 'นักพัฒนาซอฟต์แวร์',   'Senior',     'ไอที',          'พัฒนาและดูแลระบบซอฟต์แวร์ขององค์กร'],
      ['POS-03', 'ผู้จัดการฝ่ายบุคคล',  'Management', 'ทรัพยากรบุคคล',  'ดูแลงานสรรหาและพัฒนาบุคลากร'],
      ['POS-04', 'เจ้าหน้าที่บุคคล',    'Junior',     'ทรัพยากรบุคคล',  'งานธุรการและสวัสดิการพนักงาน'],
      ['POS-05', 'หัวหน้าทีมการตลาด',  'Senior',     'การตลาด',       'วางแผนและบริหารแคมเปญการตลาด'],
      ['POS-06', 'นักบัญชี',           'Junior',     'บัญชีการเงิน',   'จัดทำบัญชีและรายงานการเงิน'],
      ['POS-07', 'พนักงานขาย',         'Junior',     'ฝ่ายขาย',        'ดูแลงานขายและลูกค้าสัมพันธ์'],
    ],
  },
  Employees: {
    headers: ['id', 'name', 'position', 'department', 'status', 'email', 'salary', 'role', 'nickname'],
    rows: EMP.map(e => [e.id, e.name, e.position, e.department, e.status, e.email, e.salary, e.role, e.nickname]),
  },
  Users: {
    headers: ['id', 'email', 'password', 'role', 'name', 'position', 'avatar', 'employeeId', 'status'],
    // Plaintext password; login route auto-upgrades to a scrypt hash on first sign-in.
    rows: EMP.map(e => [`USR-${e.id}`, e.email, 'password123', e.role, e.name, e.position, e.name.slice(0, 2), e.id, 'active']),
  },
  // Authoritative 8-col schema from lib/payrollSync.ts (month is a Thai name, no
  // paymentDate). Anchored to the real current period so the dashboard total is live.
  Payroll: {
    headers: ['id', 'employeeId', 'month', 'year', 'baseSalary', 'deductions', 'netPay', 'status'],
    rows: EMP.map((e) => {
      const sso = Math.min(750, Math.round(e.salary * 0.05));
      const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
      const now = new Date();
      return [`PAY-${e.id}`, e.id, THAI_MONTHS[now.getMonth()], now.getFullYear().toString(), e.salary, sso, e.salary - sso, 'Paid'];
    }),
  },
  Attendance: {
    headers: ['id', 'employeeId', 'date', 'checkIn', 'checkOut', 'status', 'hours', 'method', 'lat', 'lng'],
    rows: EMP.flatMap((e, i) => ([
      [`ATT-${e.id}-1`, e.id, d(0),  i % 4 === 0 ? '09:12' : '08:55', '18:02', i % 4 === 0 ? 'Late' : 'Present', '8.5', 'GPS', '13.7563', '100.5018'],
      [`ATT-${e.id}-2`, e.id, d(-1), '08:50', '18:00', 'Present', '8.5', 'GPS', '13.7563', '100.5018'],
    ])),
  },
  LeaveRequests: {
    headers: ['id', 'employeeId', 'leaveType', 'startDate', 'endDate', 'status', 'reason'],
    rows: [
      ['LV-01', 'EMP-003', 'ลาป่วย',    d(-3), d(-3), 'Approved', 'เป็นไข้หวัด พักรักษาตัว'],
      ['LV-02', 'EMP-004', 'ลากิจ',     d(2),  d(3),  'Pending',  'ไปติดต่อราชการ'],
      ['LV-03', 'EMP-007', 'ลาพักร้อน', d(7),  d(9),  'Pending',  'เดินทางต่างจังหวัดกับครอบครัว'],
      ['LV-04', 'EMP-005', 'ลาป่วย',    d(-10), d(-9), 'Approved', 'ปวดหลังรุนแรง'],
    ],
  },
  Overtime: {
    headers: ['id', 'employeeId', 'date', 'hours', 'reason', 'status'],
    rows: [
      ['OT-01', 'EMP-003', d(-2), '3', 'แก้ไขบั๊กระบบเร่งด่วนก่อนส่งมอบงาน', 'Approved'],
      ['OT-02', 'EMP-007', d(-2), '2', 'Deploy ระบบขึ้น Production', 'Approved'],
      ['OT-03', 'EMP-009', d(-1), '4', 'ปิดยอดขายสิ้นเดือน', 'Pending'],
    ],
  },
  Recruitment: {
    headers: ['id', 'title', 'department', 'type', 'applicants', 'status'],
    rows: [
      ['JOB-01', 'Senior Frontend Developer', 'ไอที',         'Full-time', '12', 'Open'],
      ['JOB-02', 'นักการตลาดดิจิทัล',          'การตลาด',      'Full-time', '8',  'Open'],
      ['JOB-03', 'เจ้าหน้าที่บัญชี',            'บัญชีการเงิน',  'Full-time', '5',  'Interviewing'],
      ['JOB-04', 'พนักงานขายภาคสนาม',          'ฝ่ายขาย',       'Contract',  '3',  'Closed'],
    ],
  },
  Assets: {
    headers: ['id', 'name', 'assetId', 'type', 'owner', 'status'],
    rows: [
      ['AST-01', 'MacBook Pro 14"',    'MBP14-2024-001',  'Laptop',  'สมชาย ใจดี',    'In Use'],
      ['AST-02', 'Dell Latitude 5440', 'DL5440-2024-007', 'Laptop',  'สมหญิง รักงาน', 'In Use'],
      ['AST-03', 'iPhone 15',          'IP15-2024-003',   'Mobile',  'วิชัย ตั้งใจ',    'In Use'],
      ['AST-04', 'จอ Dell 27"',         'DM27-2023-011',   'Monitor', '',             'Available'],
    ],
  },
  Benefits: {
    headers: ['id', 'name', 'type', 'value', 'description', 'employeeId'],
    rows: [
      ['BEN-01', 'ประกันสุขภาพกลุ่ม',   'สุขภาพ',   '15,000 บาท/ปี',    'คุ้มครองค่ารักษาพยาบาลผู้ป่วยในและนอก', 'EMP-001'],
      ['BEN-02', 'กองทุนสำรองเลี้ยงชีพ', 'การเงิน',  'สมทบ 5%',          'บริษัทสมทบเท่าพนักงานทุกเดือน',          'EMP-002'],
      ['BEN-03', 'ค่าเดินทาง',          'เบี้ยเลี้ยง', '2,000 บาท/เดือน', 'ค่าน้ำมันและค่าเดินทางปฏิบัติงาน',        'EMP-003'],
      ['BEN-04', 'ค่าโทรศัพท์',         'เบี้ยเลี้ยง', '800 บาท/เดือน',   'ค่าโทรศัพท์สำหรับติดต่องาน',              'EMP-004'],
    ],
  },
  Training: {
    headers: ['id', 'title', 'category', 'progress', 'duration', 'rating', 'employeeId'],
    rows: [
      ['TRN-01', 'React & Next.js ขั้นสูง',     'Technical',   '100', '8h 30m',  '4.8', 'EMP-003'],
      ['TRN-02', 'การสื่อสารในองค์กร',          'Soft Skills', '60',  '4h 00m',  '4.5', 'EMP-006'],
      ['TRN-03', 'Digital Marketing Bootcamp',  'Marketing',   '30',  '12h 00m', '4.7', 'EMP-008'],
      ['TRN-04', 'มาตรฐานบัญชีไทย (TFRS)',      'Finance',     '0',   '6h 00m',  '4.6', 'EMP-005'],
    ],
  },
  Announcements: {
    headers: ['id', 'title', 'category', 'content', 'date'],
    rows: [
      ['ANN-01', 'หยุดยาวเทศกาลสงกรานต์',     'วันหยุด', 'บริษัทหยุดทำการระหว่างวันที่ 13-15 เมษายน ขอให้ทุกท่านเดินทางปลอดภัย', d(-30)],
      ['ANN-02', 'ปรับปรุงระบบ HR Pro Suite',  'ระบบ',   'เพิ่มฟีเจอร์เช็คชื่อด้วย GPS และสลิปเงินเดือนออนไลน์แล้ววันนี้', d(-2)],
      ['ANN-03', 'กิจกรรมตรวจสุขภาพประจำปี',    'สวัสดิการ', 'ขอเชิญพนักงานเข้ารับการตรวจสุขภาพประจำปี ณ ชั้น 3 วันที่ 25 มิ.ย.', d(5)],
    ],
  },
  Evaluations: {
    headers: ['id', 'employeeId', 'period', 'score', 'feedback', 'manager', 'status'],
    rows: [
      ['EVL-01', 'EMP-003', 'ครึ่งปีแรก 2026', '4.5', 'ทำงานดีเยี่ยม รับผิดชอบสูง',                'ก้องภพ วัฒนกุล',  'Completed'],
      ['EVL-02', 'EMP-004', 'ครึ่งปีแรก 2026', '4.0', 'มีความคิดสร้างสรรค์ ควรพัฒนาด้านการนำเสนอ', 'กมลชนก ภักดี',    'Under Review'],
      ['EVL-03', 'EMP-009', 'ครึ่งปีแรก 2026', '3.8', 'ยอดขายผ่านเป้า ควรดูแลเอกสารให้ครบถ้วน',   'วีรภัทร สุขสันต์', 'Draft'],
    ],
  },
  Expenses: {
    headers: ['id', 'title', 'amount', 'category', 'date', 'reason', 'status', 'employeeId'],
    rows: [
      ['EXP-01', 'ค่าแท็กซี่พบลูกค้า',    '1200', 'Travel',    d(-4), 'เดินทางไปพบลูกค้าโครงการ A',  'Approved', 'EMP-008'],
      ['EXP-02', 'ค่ารับรองลูกค้า',      '3500', 'Food',      d(-3), 'เลี้ยงรับรองลูกค้ารายใหญ่',    'Pending',  'EMP-009'],
      ['EXP-03', 'ซื้อเมาส์และคีย์บอร์ด', '890',  'Equipment', d(-1), 'อุปกรณ์ทดแทนของเดิมที่ชำรุด', 'Pending',  'EMP-003'],
    ],
  },
  Loans: {
    headers: ['id', 'amount', 'interest', 'term', 'reason', 'status', 'employeeId'],
    rows: [
      ['LON-01', '50000', '0', '10 เดือน', 'ปรับปรุงที่อยู่อาศัย', 'Approved', 'EMP-005'],
      ['LON-02', '20000', '0', '6 เดือน',  'ค่าเล่าเรียนบุตร',     'Pending',  'EMP-006'],
    ],
  },
  SocialSecurity: {
    headers: ['id', 'employeeId', 'ssn', 'contributionAmount', 'status'],
    rows: EMP.slice(0, 6).map(e => [`SSO-${e.id}`, e.id, '1-' + Math.floor(1000000000000 + Math.random() * 8999999999999), Math.min(750, Math.round(e.salary * 0.05)), 'Active']),
  },
  Onboarding: {
    headers: ['id', 'taskName', 'category', 'dueDate', 'completed', 'employeeId'],
    rows: [
      ['ONB-01', 'เซ็นสัญญาจ้างงาน',       'Documents', d(-5), 'TRUE',  'EMP-009'],
      ['ONB-02', 'อบรมความปลอดภัยข้อมูล',  'Policy',    d(2),  'FALSE', 'EMP-009'],
      ['ONB-03', 'รับอุปกรณ์การทำงาน',     'IT Setup',  d(2),  'FALSE', 'EMP-009'],
    ],
  },
  Discipline: {
    headers: ['id', 'employeeId', 'employeeName', 'incidentDate', 'incidentType', 'description', 'actionTaken', 'status'],
    rows: [
      ['DIS-01', 'EMP-004', 'ศิริพร ทองดี', d(-12), 'Warning', 'มาสายเกิน 3 ครั้งในเดือน', 'ตักเตือนด้วยวาจา', 'Closed'],
    ],
  },
  BusinessTrips: {
    headers: ['id', 'employeeId', 'employeeName', 'destination', 'startDate', 'endDate', 'purpose', 'status', 'budget'],
    rows: [
      ['BT-01', 'EMP-001', 'ก้องภพ วัฒนกุล', 'เชียงใหม่', d(10), d(12), 'ติดตั้งระบบสาขาภาคเหนือ', 'Approved', '15000'],
      ['BT-02', 'EMP-008', 'กมลชนก ภักดี',   'ภูเก็ต',     d(20), d(22), 'ออกบูธงานแสดงสินค้า',     'Pending',  '25000'],
    ],
  },
  Shifts: {
    headers: ['id', 'employeeId', 'date', 'shiftType', 'startTime', 'endTime', 'notes'],
    rows: [
      ['SH-01', 'EMP-009', d(1), 'Morning', '08:00', '17:00', ''],
      ['SH-02', 'EMP-009', d(2), 'Afternoon', '13:00', '22:00', 'ดูแลลูกค้าช่วงเย็น'],
      ['SH-03', 'EMP-004', d(1), 'Morning', '08:00', '17:00', ''],
    ],
  },
  Resignations: {
    headers: ['id', 'employeeId', 'employeeName', 'resignationDate', 'lastWorkingDay', 'reason', 'status', 'submissionDate'],
    rows: [
      ['RES-01', 'EMP-006', 'อรอุมา แสงทอง', d(45), d(45), 'ย้ายไปทำงานต่างจังหวัด', 'Pending', d(-1)],
    ],
  },
  Documents: {
    headers: ['id', 'type', 'purpose', 'amount', 'dateRequested', 'status', 'employeeId'],
    rows: [
      ['DOC-01', 'Employment Certificate', 'ยื่นขอวีซ่า',     '1', d(-2), 'Ready',      'EMP-003'],
      ['DOC-02', 'Salary Certificate',     'เปิดบัญชีธนาคาร', '2', d(-1), 'Processing', 'EMP-005'],
    ],
  },
  Rewards: {
    headers: ['id', 'title', 'type', 'date', 'description', 'value', 'employeeId'],
    rows: [
      ['RW-01', 'พนักงานดีเด่นประจำเดือน', 'Performance', d(-8), 'ผลงานพัฒนาระบบยอดเยี่ยม', '5000', 'EMP-003'],
      ['RW-02', 'ยอดขายสูงสุดประจำไตรมาส', 'Performance', d(-8), 'ทำยอดขายทะลุเป้า 150%',   '8000', 'EMP-009'],
    ],
  },
  CompanyTrips: {
    headers: ['id', 'tripName', 'date', 'location', 'description', 'maxParticipants'],
    rows: [
      ['CT-01', 'ทริปประจำปี 2026', d(60), 'หัวหิน จ.ประจวบคีรีขันธ์', 'ทริปท่องเที่ยวสานสัมพันธ์พนักงาน 2 วัน 1 คืน', '50'],
    ],
  },
  Meetings: {
    headers: ['id', 'title', 'date', 'startTime', 'endTime', 'location', 'organizer', 'agenda'],
    rows: [
      ['MTG-01', 'ประชุมประจำเดือน', d(1), '10:00', '11:30', 'ห้องประชุมใหญ่ ชั้น 5', 'ปิยะวรรณ ศรีสุข', 'สรุปผลงานเดือน พ.ค. และแผนเดือน มิ.ย.'],
      ['MTG-02', 'Sprint Planning',  d(2), '14:00', '15:00', 'ห้องประชุมไอที',        'ก้องภพ วัฒนกุล',  'วางแผนงานพัฒนา Sprint ถัดไป'],
    ],
  },
};

async function rowCount(sheetName) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetName}!A1:A` });
  return (res.data.values || []).length; // includes header
}

async function seed() {
  // Company info in Settings (upsert a few keys).
  const settingsSeed = {
    companyName: 'บริษัท เอชอาร์ โปร จำกัด',
    companyAddress: '99 อาคารเอชอาร์ ถนนสุขุมวิท แขวงคลองเตย กรุงเทพฯ 10110',
    companyPhone: '02-123-4567',
    companyEmail: 'info@hrpro.com',
    workStartTime: '08:30',
    workEndTime: '17:30',
  };

  for (const [name, { headers, rows }] of Object.entries(DATA)) {
    try {
      const count = await rowCount(name);
      if (count > 1) {
        console.log(`⏭️  ${name}: มีข้อมูลอยู่แล้ว (${count - 1} แถว) — ข้าม`);
        continue;
      }
      // (Re)write header to be safe, then append rows.
      await sheets.spreadsheets.values.update({
        spreadsheetId, range: `${name}!A1`, valueInputOption: 'RAW', requestBody: { values: [headers] },
      });
      await sheets.spreadsheets.values.append({
        spreadsheetId, range: `${name}!A1`, valueInputOption: 'USER_ENTERED', requestBody: { values: rows },
      });
      console.log(`✅ ${name}: เพิ่ม ${rows.length} แถว`);
    } catch (e) {
      console.error(`❌ ${name}:`, e.message);
    }
  }

  // Settings: only add keys that are missing.
  try {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Settings!A:B' });
    const existing = new Set((res.data.values || []).slice(1).map(r => r[0]));
    const toAdd = Object.entries(settingsSeed).filter(([k]) => !existing.has(k)).map(([k, v]) => [k, v]);
    if (toAdd.length) {
      await sheets.spreadsheets.values.append({
        spreadsheetId, range: 'Settings!A1', valueInputOption: 'USER_ENTERED', requestBody: { values: toAdd },
      });
      console.log(`✅ Settings: เพิ่ม ${toAdd.length} ค่า`);
    } else {
      console.log('⏭️  Settings: ครบแล้ว');
    }
  } catch (e) {
    console.error('❌ Settings:', e.message);
  }

  console.log('\n🎉 Seed demo data เสร็จสมบูรณ์');
  console.log('บัญชีพนักงานทดสอบ: kongphop@hrpro.com .. (รหัสผ่าน: password123)');
}

seed();
