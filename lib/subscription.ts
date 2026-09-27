// =============================================================================
// HR Pro Suite — Subscription Utilities
// Plan pricing, expiry calculation, company code generation
// =============================================================================

export type PlanDuration = '1m' | '3m' | '5m' | '1y' | '2y';

export interface PlanInfo {
  months: number;
  days: number;
  price: number;
  label: string;
  discount: string;
}

export const PLAN_PRICING: Record<PlanDuration, PlanInfo> = {
  '1m': { months: 1, days: 30, price: 990, label: '1 เดือน', discount: 'ราคาปกติ' },
  '3m': { months: 3, days: 90, price: 2850, label: '3 เดือน', discount: 'ส่วนลด 5%' },
  '5m': { months: 5, days: 150, price: 4500, label: '5 เดือน', discount: 'ส่วนลด 10%' },
  '1y': { months: 12, days: 365, price: 9900, label: '1 ปี (ประหยัดสุดคุ้ม)', discount: 'จ่าย 10 เดือน ฟรี 2 เดือน' },
  '2y': { months: 24, days: 730, price: 17900, label: '2 ปี (ราคาพิเศษ)', discount: 'ส่วนลดพิเศษ 25%' },
};

/** Calculate subscription expiry date from a start date + plan duration */
export function calculateExpiryDate(duration: PlanDuration, fromDate: Date = new Date()): Date {
  const expiry = new Date(fromDate);
  const daysToAdd = PLAN_PRICING[duration].days;
  expiry.setDate(expiry.getDate() + daysToAdd);
  return expiry;
}

/** Generate a unique company code: PREFIX-XXXX (4 random digits) */
export function generateCompanyCode(prefix: string = 'CORP'): string {
  const sanitized = prefix.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4) || 'CORP';
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${sanitized}-${randomNum}`;
}

/** Check if a subscription is expired */
export function isSubscriptionExpired(subscriptionEnd: string | Date): boolean {
  const now = new Date();
  const expiry = new Date(subscriptionEnd);
  return now > expiry;
}

/** Get remaining days until expiry */
export function getRemainingDays(subscriptionEnd: string | Date): number {
  const now = new Date();
  const expiry = new Date(subscriptionEnd);
  const diff = expiry.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/** Check if subscription is about to expire (within N days, default 7) */
export function isExpiringSoon(subscriptionEnd: string | Date, withinDays: number = 7): boolean {
  const remaining = getRemainingDays(subscriptionEnd);
  return remaining > 0 && remaining <= withinDays;
}
