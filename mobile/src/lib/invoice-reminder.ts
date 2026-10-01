export type InvoiceReminderInput = {
  tenantName: string | null;
  roomTitle: string;
  period: string;
  totalAmount: number;
  dueDate: string | null;
  overdue: boolean;
};

function group(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function money(n: number) {
  return `${group(n)}đ`;
}

function date(iso: string | null) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

export function buildInvoiceReminder(input: InvoiceReminderInput): string {
  const name = input.tenantName?.trim() || "bạn";
  const due = input.dueDate ? ` Hạn thanh toán: ${date(input.dueDate)}.` : "";
  const status = input.overdue ? "đã quá hạn" : "sắp đến hạn";

  return [
    `Chào ${name}, Roomy nhắc nhẹ hoá đơn phòng ${input.roomTitle} kỳ ${input.period} ${status}.`,
    `Số tiền cần thanh toán: ${money(input.totalAmount)}.${due}`,
    "Bạn kiểm tra giúp chủ nhà nhé. Nếu đã thanh toán, vui lòng bỏ qua tin nhắn này.",
  ].join(" ");
}
