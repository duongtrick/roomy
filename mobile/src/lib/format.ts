/**
 * Formatting helpers shared by the public screens and the landlord dashboard.
 */

/**
 * Vietnamese thousands grouping, done by hand.
 *
 * `toLocaleString("vi-VN")` is unreliable here: Hermes ships only a partial
 * `Intl`, so the same number can come back grouped on iOS and ungrouped on
 * Android. Formatting money must not depend on which engine is running.
 */
function group(n: number): string {
  const neg = n < 0;
  const digits = Math.abs(Math.round(n)).toString();
  let out = "";
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ".";
    out += digits[i];
  }
  return neg ? `-${out}` : out;
}

/**
 * Compact price label for listing cards and headlines, e.g. `3.2tr`.
 * Lossy by design — never use it for an amount someone has to pay.
 */
export function formatVND(n: number) {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}tr`;
  }
  return group(n) + "đ";
}

/**
 * Exact amount, e.g. `3.250.000đ`. Use this for invoice lines, totals,
 * deposits and unit rates, where rounding to `3.3tr` would be wrong.
 */
export function formatVNDExact(n: number) {
  if (!Number.isFinite(n)) return "—";
  return group(n) + "đ";
}

/** `2026-08-21` → `21/08/2026`. Returns the input unchanged if unparseable. */
export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

/**
 * Khoảng cách tới trường: `450` → `450 m`, `1400` → `1,4 km`.
 *
 * Đổi sang km từ mốc 1000 m vì "1400 m" đọc chậm hơn "1,4 km", còn dưới mốc
 * đó thì mét lại chính xác hơn cho quãng đường đi bộ.
 */
export function formatDistance(meters: number | null | undefined) {
  if (meters == null || !Number.isFinite(meters)) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return `${(km % 1 === 0 ? km.toFixed(0) : km.toFixed(1)).replace(".", ",")} km`;
}

/** Billing period for "now", as `YYYY-MM` in local time. */
export function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Today as `YYYY-MM-DD` in local time (`toISOString()` would shift the day). */
export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
