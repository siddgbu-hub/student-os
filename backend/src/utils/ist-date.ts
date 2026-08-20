/**
 * India Standard Time (IST) Calendar-Day Utilities
 *
 * Enforces calendar-day subscription validity based on midnight IST (00:00:00.000 IST / UTC+5:30) boundaries.
 * Prevents fractional-hour drift and ensures consistent Day 1 semantics regardless of time of day.
 */

export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +05:30 in milliseconds (19,800,000 ms)

export interface IstDateComponents {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  dateString: string; // YYYY-MM-DD
}

/**
 * Returns the calendar year, month (1-12), and day (1-31) in Asia/Kolkata (IST).
 */
export function getIstCalendarComponents(date: Date = new Date()): IstDateComponents {
  const istDate = new Date(date.getTime() + IST_OFFSET_MS);
  const year = istDate.getUTCFullYear();
  const month = istDate.getUTCMonth() + 1;
  const day = istDate.getUTCDate();
  const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { year, month, day, dateString };
}

/**
 * Returns the start of the calendar day (00:00:00.000 IST) in UTC ISO format.
 * Example: For any timestamp on 16 Aug 2026 IST, returns "2026-08-15T18:30:00.000Z"
 */
export function getStartOfIstDay(date: Date = new Date()): string {
  const istDate = new Date(date.getTime() + IST_OFFSET_MS);
  const y = istDate.getUTCFullYear();
  const m = istDate.getUTCMonth();
  const d = istDate.getUTCDate();
  const utcMs = Date.UTC(y, m, d, 0, 0, 0, 0) - IST_OFFSET_MS;
  return new Date(utcMs).toISOString();
}

/**
 * Helper: returns the number of days in a given month (0-indexed: 0 = Jan, 11 = Dec).
 */
export function getDaysInIstMonth(year: number, monthZeroIndexed: number): number {
  return new Date(Date.UTC(year, monthZeroIndexed + 1, 0)).getUTCDate();
}

/**
 * Calculates the exact midnight IST expiry timestamp.
 *
 * Rules:
 * - Validity is calendar-day based with 00:00:00.000 IST day boundaries.
 * - Activation time within the day does NOT create fractional day differences.
 * - Monthly Pro (default): adds 1 calendar month with month-end clamping (e.g. 31 Jan -> 28 Feb).
 * - Yearly Pro (default): adds 1 calendar year with leap-year clamping (e.g. 29 Feb -> 28 Feb).
 * - Custom durationDays: adds durationDays full calendar days.
 *
 * Example:
 * Activation on 16 Aug (any time between 00:00:00 and 23:59:59 IST):
 * 16 Aug is Day 1.
 * Monthly Pro: final valid day = 15 Sep, expiry = 16 Sep 00:00:00.000 IST (UTC: 2026-09-15T18:30:00.000Z).
 */
export function calculateIstExpiryDate(
  startDate: Date = new Date(),
  durationDays?: number,
  planId?: string
): string {
  const istDate = new Date(startDate.getTime() + IST_OFFSET_MS);
  const y = istDate.getUTCFullYear();
  const m = istDate.getUTCMonth();
  const d = istDate.getUTCDate();

  let expiryUtcMs: number;

  if (durationDays !== undefined && durationDays !== 30 && durationDays !== 365) {
    // Custom number of calendar days (e.g. 7 days trial, 15 days, 90 days)
    expiryUtcMs = Date.UTC(y, m, d + durationDays, 0, 0, 0, 0) - IST_OFFSET_MS;
  } else if (planId === 'yearly' || durationDays === 365) {
    // 1 Calendar Year with leap-year clamping
    const targetYear = y + 1;
    const targetMonth = m;
    const maxDays = getDaysInIstMonth(targetYear, targetMonth);
    const targetDay = Math.min(d, maxDays);
    expiryUtcMs = Date.UTC(targetYear, targetMonth, targetDay, 0, 0, 0, 0) - IST_OFFSET_MS;
  } else if (planId === 'monthly' || durationDays === 30) {
    // 1 Calendar Month with month-end clamping
    const targetYear = m === 11 ? y + 1 : y;
    const targetMonth = (m + 1) % 12;
    const maxDays = getDaysInIstMonth(targetYear, targetMonth);
    const targetDay = Math.min(d, maxDays);
    expiryUtcMs = Date.UTC(targetYear, targetMonth, targetDay, 0, 0, 0, 0) - IST_OFFSET_MS;
  } else {
    // Fallback: durationDays or 30 days
    const days = durationDays || 30;
    expiryUtcMs = Date.UTC(y, m, d + days, 0, 0, 0, 0) - IST_OFFSET_MS;
  }

  return new Date(expiryUtcMs).toISOString();
}
