// =============================================================================
// HR Pro Suite — Domain Models
// TypeScript interfaces สำหรับทุก entity ในระบบ
// Updated: เพิ่ม companyCode ในทุก entity สำหรับ Multi-Tenant Data Isolation
// =============================================================================

/** ข้อมูลพนักงาน */
export interface Employee {
  id?: string;
  companyCode?: string;
  name?: string;
  nickname?: string;
  position?: string;
  department?: string;
  email?: string;
  status?: string;
  salary?: string;
  role?: string;
  startDate?: string;
  username?: string;
  password?: string;
  _row?: number;
  [key: string]: any;
}

/** บัญชีผู้ใช้ (ตาราง Users) */
export interface User {
  id?: string;
  companyCode?: string;
  email?: string;
  password?: string;
  role?: string;
  name?: string;
  position?: string;
  avatar?: string;
  employeeId?: string;
  status?: string;
  _row?: number;
  [key: string]: any;
}

/** คำขอลา */
export interface LeaveRequest {
  id?: string;
  companyCode?: string;
  employeeId?: string;
  leaveType?: string;
  durationType?: 'fullday' | 'hourly';
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
  status?: string;
  _row?: number;
  [key: string]: any;
}

/** ประเภทการลา */
export interface LeaveType {
  id?: string;
  companyCode?: string;
  name: string;
  maxDays: number;
  paid: boolean;
  active: boolean;
  minTenureMonths: number;
  _row?: number;
  [key: string]: any;
}

/** โควต้าการลา */
export interface LeaveQuota {
  type: string;
  maxDays: number;
  used: number;
  pending: number;
  remaining: number;
  unlimited: boolean;
  eligible: boolean;
  tenureKnown: boolean;
  minTenureMonths: number;
}

/** บันทึกเข้างาน */
export interface AttendanceRecord {
  id?: string;
  companyCode?: string;
  employeeId?: string;
  date?: string;
  checkIn?: string;
  checkOut?: string;
  status?: string;
  hours?: string;
  method?: string;
  lat?: string;
  lng?: string;
  _row?: number;
  [key: string]: any;
}

/** ข้อมูลเงินเดือน */
export interface PayrollRecord {
  id?: string;
  companyCode?: string;
  employeeId?: string;
  month?: string;
  year?: string;
  baseSalary?: string;
  deductions?: string;
  netPay?: string;
  status?: string;
  date?: string;
  _row?: number;
  [key: string]: any;
}

/** แผนก */
export interface Department {
  id?: string;
  companyCode?: string;
  name?: string;
  description?: string;
  manager?: string;
  _row?: number;
  [key: string]: any;
}

/** ตำแหน่ง */
export interface Position {
  id?: string;
  companyCode?: string;
  title?: string;
  grade?: string;
  description?: string;
  department?: string;
  _row?: number;
  [key: string]: any;
}

/** บันทึก Audit */
export interface AuditLog {
  actor?: string;
  action?: string;
  entity?: string;
  entityId?: string;
  changes?: any;
  timestamp?: string;
  companyCode?: string;
  [key: string]: any;
}

/** Session ผู้ใช้ — รวม companyCode สำหรับ Multi-Tenant */
export interface UserSession {
  id: string;
  employeeId: string;
  email: string;
  role: string;
  name: string;
  position: string;
  avatar: string;
  companyCode: string;
}

/** การตั้งค่า Attendance */
export interface AttendanceConfig {
  gpsEnabled: boolean;
  qrEnabled: boolean;
  lat: number;
  lng: number;
  radius: number;
  qrSecret?: string;
}

/** ผลการยืนยัน Attendance */
export interface VerifyResult {
  ok: boolean;
  error?: string;
}

/** Generic row from Google Sheets */
export interface SheetRow {
  _row?: number;
  companyCode?: string;
  [key: string]: any;
}
