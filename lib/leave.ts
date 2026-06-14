// Leave domain logic — leave-type catalogue + entitlement/quota engine.
//
// Framework-free (no React, no next/server) so it can be imported from both the
// client leave page and the API route that enforces quota server-side.
//
// Key rules (from the Leave Management spec):
//   • Admin defines leave types with a yearly max-day cap and an eligibility
//     gate (minTenureMonths). Vacation (ลาพักร้อน) unlocks only after 12 months.
//   • A request consumes quota only once it is **Approved**. Rejected requests
//     never deduct, so cancelling/rejecting restores the balance automatically.

export const LEAVE_TYPES_SHEET = 'LeaveTypes';
export const LEAVE_TYPE_HEADERS = ['id', 'name', 'maxDays', 'minTenureMonths', 'paid', 'active', 'description'];

// Extra LeaveRequests columns the hourly-leave + audit features rely on. Added on
// demand to a pre-existing sheet so older data keeps working.
export const LEAVE_REQUEST_EXTRA_HEADERS = ['durationType', 'startTime', 'endTime'];

export type LeaveType = {
  id?: string;
  name: string;
  maxDays: number;          // cap per calendar year; 0 = unlimited
  minTenureMonths: number;  // months employed before eligible (12 = vacation)
  paid: boolean;
  active: boolean;
  description?: string;
};

// Seeded into an empty LeaveTypes sheet so the module works out of the box.
export const DEFAULT_LEAVE_TYPES: LeaveType[] = [
  { name: 'ลาป่วย', maxDays: 30, minTenureMonths: 0, paid: true, active: true, description: 'ลาป่วยได้ปีละไม่เกิน 30 วันทำงาน (ตามกฎหมายแรงงาน)' },
  { name: 'ลากิจ', maxDays: 3, minTenureMonths: 0, paid: true, active: true, description: 'ลาเพื่อกิจธุระอันจำเป็น' },
  { name: 'ลาพักร้อน', maxDays: 6, minTenureMonths: 12, paid: true, active: true, description: 'ได้รับสิทธิ์เมื่อทำงานครบ 1 ปีบริบูรณ์' },
  { name: 'ลาคลอด', maxDays: 98, minTenureMonths: 0, paid: true, active: true, description: 'ลาคลอดบุตร' },
  { name: 'ลาเพื่อรับราชการทหาร', maxDays: 60, minTenureMonths: 0, paid: true, active: true, description: 'ลาเพื่อรับราชการทหาร' },
];

// Hours that make up one "leave day" — used to convert hourly leave into a
// fraction of a day so it draws from the same per-type quota.
const HOURS_PER_DAY = 8;

export type LeaveRow = {
  leaveType?: string;
  status?: string;
  durationType?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
};

const truthy = (v: unknown) =>
  v === true || ['true', 'yes', 'y', '1', 'on', 'active', 'paid'].includes(String(v ?? '').trim().toLowerCase());

/** Coerce a raw sheet row into a typed LeaveType (sheet values are all strings). */
export function normalizeLeaveType(raw: any): LeaveType {
  return {
    id: raw.id,
    name: String(raw.name ?? '').trim(),
    maxDays: Number(raw.maxDays) || 0,
    minTenureMonths: Number(raw.minTenureMonths) || 0,
    paid: raw.paid === undefined || raw.paid === '' ? true : truthy(raw.paid),
    active: raw.active === undefined || raw.active === '' ? true : truthy(raw.active),
    description: raw.description ? String(raw.description) : '',
  };
}

export function parseDate(s?: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** Whole-day count, inclusive of both ends (1-day minimum when start is set). */
export function dayCount(start?: string, end?: string): number {
  const s = parseDate(start);
  if (!s) return 0;
  const e = parseDate(end) || s;
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
}

function toMinutes(t?: string): number {
  if (!t) return NaN;
  const [h, m] = t.split(':').map(Number);
  return isNaN(h) || isNaN(m) ? NaN : h * 60 + m;
}

/** Hours between two HH:mm times (0 when invalid or non-positive). */
export function hourCount(startTime?: string, endTime?: string): number {
  const s = toMinutes(startTime);
  const e = toMinutes(endTime);
  if (isNaN(s) || isNaN(e) || e <= s) return 0;
  return Math.round(((e - s) / 60) * 100) / 100;
}

/** Quota cost of one leave row, in days (hourly leave counts as hours / 8). */
export function leaveDays(row: LeaveRow): number {
  if (row.durationType === 'hourly') {
    return Math.round((hourCount(row.startTime, row.endTime) / HOURS_PER_DAY) * 100) / 100;
  }
  return dayCount(row.startDate, row.endDate);
}

/** Completed months of service as of `asOf` (default: now). */
export function tenureMonths(startDate?: string, asOf: Date = new Date()): number {
  const s = parseDate(startDate);
  if (!s || s > asOf) return 0;
  let months = (asOf.getFullYear() - s.getFullYear()) * 12 + (asOf.getMonth() - s.getMonth());
  if (asOf.getDate() < s.getDate()) months -= 1; // not a full month yet
  return Math.max(0, months);
}

export type LeaveQuota = {
  type: string;
  maxDays: number;        // 0 = unlimited
  unlimited: boolean;
  eligible: boolean;      // tenure gate satisfied (or no gate)
  tenureKnown: boolean;   // false when the employee's hire date is unknown
  minTenureMonths: number;
  used: number;           // days already deducted (Approved)
  pending: number;        // days awaiting approval
  remaining: number;      // maxDays - used (Infinity when unlimited)
};

/**
 * Compute the quota picture for one leave type and one employee in a given year.
 * `requests` should be that employee's leave rows. Only Approved rows are
 * deducted from the balance; rejected rows are ignored entirely.
 */
export function computeQuota(
  type: LeaveType,
  startDate: string | undefined,
  requests: LeaveRow[],
  year: number = new Date().getFullYear(),
): LeaveQuota {
  const inYear = (r: LeaveRow) => (parseDate(r.startDate)?.getFullYear() ?? year) === year;
  const ofType = requests.filter(r => (r.leaveType || '') === type.name && inYear(r));

  const used = ofType.filter(r => r.status === 'Approved').reduce((a, r) => a + leaveDays(r), 0);
  const pending = ofType.filter(r => (r.status || 'Pending') === 'Pending').reduce((a, r) => a + leaveDays(r), 0);

  const tenureKnown = !!parseDate(startDate);
  // Unknown hire date can't disprove eligibility — allow rather than block.
  const eligible = type.minTenureMonths <= 0 || !tenureKnown || tenureMonths(startDate) >= type.minTenureMonths;
  const unlimited = !type.maxDays || type.maxDays <= 0;

  return {
    type: type.name,
    maxDays: type.maxDays,
    unlimited,
    eligible,
    tenureKnown,
    minTenureMonths: type.minTenureMonths,
    used: Math.round(used * 100) / 100,
    pending: Math.round(pending * 100) / 100,
    remaining: unlimited ? Infinity : Math.max(0, Math.round((type.maxDays - used) * 100) / 100),
  };
}

export type QuotaCheck = { ok: boolean; reason?: string };

/**
 * Validate a would-be Approved leave of `requestDays` against the type's quota.
 * `priorUsed` should already exclude the request being checked (so re-approving
 * an existing row doesn't double-count it).
 */
export function checkAgainstQuota(quota: LeaveQuota, priorUsed: number, requestDays: number): QuotaCheck {
  if (!quota.eligible) {
    const years = quota.minTenureMonths % 12 === 0 ? `${quota.minTenureMonths / 12} ปี` : `${quota.minTenureMonths} เดือน`;
    return { ok: false, reason: `ยังไม่ได้รับสิทธิ์ "${quota.type}" — ต้องทำงานครบ ${years}` };
  }
  if (quota.unlimited) return { ok: true };
  if (priorUsed + requestDays > quota.maxDays + 1e-9) {
    const left = Math.max(0, Math.round((quota.maxDays - priorUsed) * 100) / 100);
    return { ok: false, reason: `เกินสิทธิวันลา "${quota.type}" — คงเหลือ ${left} วัน แต่ขอ ${requestDays} วัน` };
  }
  return { ok: true };
}
