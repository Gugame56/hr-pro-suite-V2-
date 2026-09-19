// =============================================================================
// DateService — แปลงจาก dateUtils.ts
// Static utility class สำหรับ date parsing/formatting
// =============================================================================

const THAI_DIGITS: Record<string, string> = {
  '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4',
  '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9',
};

function normalizeThaiDigits(input: string): string {
  return input.replace(/[๐-๙]/g, (d) => THAI_DIGITS[d] ?? d);
}

export class DateService {
  /** Local date as YYYY-MM-DD */
  static toISODate(date: Date = new Date()): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /** Local time as HH:mm:ss (24h) */
  static toISOTime(date: Date = new Date()): string {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  /** Full local timestamp YYYY-MM-DDTHH:mm:ss */
  static toISOTimestamp(date: Date = new Date()): string {
    return `${DateService.toISODate(date)}T${DateService.toISOTime(date)}`;
  }

  /** Parse a date stored in ISO, th-TH locale, or Thai digits format.
   *  Returns null when the value can't be understood. */
  static parseFlexibleDate(value: unknown): Date | null {
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (value === null || value === undefined) return null;

    const raw = normalizeThaiDigits(String(value).trim());
    if (!raw) return null;

    // ISO-ish (YYYY-MM-DD or full ISO)
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      const d = new Date(raw);
      return isNaN(d.getTime()) ? null : d;
    }

    // d/m/yyyy or d-m-yyyy (locale style). Year may be Buddhist (>= 2400).
    const m = raw.match(/^(\d{1,2})[/\-.] (\d{1,2})[/\-.](\d{2,4})$/);
    if (m) {
      let [, dd, mm, yyyy] = m;
      let year = parseInt(yyyy, 10);
      if (year >= 2400) year -= 543; // Buddhist -> Gregorian
      const d = new Date(year, parseInt(mm, 10) - 1, parseInt(dd, 10));
      return isNaN(d.getTime()) ? null : d;
    }

    // Last resort: native parser
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  /** "8h 30m" from two HH:mm(:ss) clock strings on the same day. */
  static diffHoursMinutes(checkIn: string, checkOut: string): string {
    const parse = (t: string): number | null => {
      const cleaned = normalizeThaiDigits(String(t).trim());
      const m = cleaned.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      if (!m) return null;
      return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    };

    const start = parse(checkIn);
    const end = parse(checkOut);
    if (start === null || end === null) return '';

    let minutes = end - start;
    if (minutes < 0) minutes += 24 * 60; // crossed midnight
    const h = Math.floor(minutes / 60);
    const mn = minutes % 60;
    return `${h}h ${mn}m`;
  }
}

// Backward-compatible exports
export const toISODate = DateService.toISODate;
export const toISOTime = DateService.toISOTime;
export const toISOTimestamp = DateService.toISOTimestamp;
export const parseFlexibleDate = DateService.parseFlexibleDate;
export const diffHoursMinutes = DateService.diffHoursMinutes;
