// ============================================================
// EXPIRY / RETEST STATUS
// ============================================================
// A lot's expiryDate has always been stored, but nothing turned
// it into an actionable signal. These helpers classify a lot as
// OK / EXPIRING_SOON / EXPIRED so the UI and API can flag lots
// that need attention instead of just displaying a date.
// ============================================================

export type ExpiryStatus = "OK" | "EXPIRING_SOON" | "EXPIRED" | "NO_EXPIRY";

// Lots within this many days of their expiry date are flagged as
// "expiring soon" so there's time to retest or use them up first.
export const EXPIRY_WARNING_DAYS = 30;

export function getDaysUntilExpiry(
  expiryDate: Date | string,
  referenceDate: Date = new Date()
): number {
  const expiry = new Date(expiryDate);
  const reference = new Date(referenceDate);

  // Compare at day granularity so "expires today" doesn't flip
  // between EXPIRED/EXPIRING_SOON depending on time-of-day.
  const expiryDay = Date.UTC(
    expiry.getFullYear(),
    expiry.getMonth(),
    expiry.getDate()
  );
  const referenceDay = Date.UTC(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate()
  );

  return Math.round(
    (expiryDay - referenceDay) / (1000 * 60 * 60 * 24)
  );
}

export function getExpiryStatus(
  expiryDate: Date | string | null,
  referenceDate: Date = new Date()
): ExpiryStatus {
  if (!expiryDate) return "NO_EXPIRY";

  const daysUntilExpiry = getDaysUntilExpiry(
    expiryDate,
    referenceDate
  );

  if (daysUntilExpiry < 0) return "EXPIRED";
  if (daysUntilExpiry <= EXPIRY_WARNING_DAYS) return "EXPIRING_SOON";
  return "OK";
}
