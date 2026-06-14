// Shared date/time helpers.
//
// IMPORTANT: store dates as ISO (YYYY-MM-DD) everywhere. The app previously used
// `toLocaleDateString('th-TH')`, which emits Buddhist-era strings like "8/6/2569"
// that break `new Date(...)` parsing and day-to-day comparison. These helpers give
// us one stable format to write and a tolerant parser to read legacy data.

const THAI_DIGITS: Record<string, string> = {
  '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4',
  '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9',
};

function normalizeThaiDigits(input: string): string {
  return input.replace(/[๐-๙]/g, (d) => THAI_DIGITS[d] ?? d);
}

/** Local date as YYYY-MM-DD (no timezone shift, unlike toISOString). */
export function toISODate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Local time as HH:mm:ss (24h, stable for hour math). */
export function toISOTime(date: Date = new Date()): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/** Full local timestamp YYYY-MM-DDTHH:mm:ss for audit logs etc. */
export function toISOTimestamp(date: Date = new Date()): string {
  return `${toISODate(date)}T${toISOTime(date)}`;
}

/**
 * Parse a date stored in any of the formats this app has produced:
 *  - ISO: "2026-06-08" / full ISO timestamps
 *  - th-TH locale: "8/6/2569" (Buddhist era, d/m/yyyy), incl. Thai digits
 * Returns null when the value can't be understood (callers should skip, not NaN).
 */
export function parseFlexibleDate(value: unknown): Date | null {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (value === null || value === undefined) return null;

  const raw = normalizeThaiDigits(String(value).trim());
  if (!raw) return null;

  // ISO-ish first (YYYY-MM-DD or full ISO) — let Date handle it.
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  // d/m/yyyy or d-m-yyyy (locale style). Year may be Buddhist (>= 2400).
  const m = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    let [, dd, mm, yyyy] = m;
    let year = parseInt(yyyy, 10);
    if (year >= 2400) year -= 543; // Buddhist -> Gregorian
    const d = new Date(year, parseInt(mm, 10) - 1, parseInt(dd, 10));
    return isNaN(d.getTime()) ? null : d;
  }

  // Last resort: native parser.
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

/** "8h 30m" from two HH:mm(:ss) clock strings on the same day. */
export function diffHoursMinutes(checkIn: string, checkOut: string): string {
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
  const m = minutes % 60;
  return `${h}h ${m}m`;
}
