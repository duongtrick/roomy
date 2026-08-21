/**
 * Formatting helpers shared by the public site and the landlord dashboard.
 */

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
  return n.toLocaleString("vi-VN") + "đ";
}

/**
 * Exact amount, e.g. `3.250.000đ`. Use this for invoice lines, totals,
 * deposits and unit rates, where rounding to `3.3tr` would be wrong.
 */
export function formatVNDExact(n: number) {
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString("vi-VN") + "đ";
}

/** `2026-08-21` → `21/08/2026`. Returns the input unchanged if unparseable. */
export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}
