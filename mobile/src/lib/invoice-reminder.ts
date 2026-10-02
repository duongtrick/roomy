export type InvoiceReminderInput = {
  tenantName: string | null;
  roomTitle: string;
  period: string;
  totalAmount: number;
  dueDate: string | null;
  overdue: boolean;
};

export type InvoiceReminderDraft = {
  tone: "gentle" | "urgent";
  title: string;
  message: string;
  checklist: string[];
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
  return buildInvoiceReminderDraft(input).message;
}

export function buildInvoiceReminderDraft(input: InvoiceReminderInput): InvoiceReminderDraft {
  const name = input.tenantName?.trim() || "bạn";
  const due = input.dueDate ? ` Hạn thanh toán: ${date(input.dueDate)}.` : "";
  const tone = input.overdue ? "urgent" : "gentle";
  const status = input.overdue ? "đã quá hạn" : "sắp đến hạn";
  const title = input.overdue ? "Nhắc quá hạn lịch sự" : "Nhắc thanh toán nhẹ nhàng";
  const message = [
    `Chào ${name}, Roomy nhắc nhẹ hoá đơn phòng ${input.roomTitle} kỳ ${input.period} ${status}.`,
    `Số tiền cần thanh toán: ${money(input.totalAmount)}.${due}`,
    "Bạn kiểm tra giúp chủ nhà nhé. Nếu đã thanh toán, vui lòng bỏ qua tin nhắn này.",
  ].join(" ");

  return {
    tone,
    title,
    message,
    checklist: [
      "Kiểm tra lại số tiền và hạn thanh toán trước khi gửi.",
      input.overdue
        ? "Nếu người thuê gặp khó khăn, chốt ngày thanh toán mới bằng tin nhắn."
        : "Gửi trước hạn để người thuê có thời gian chuẩn bị.",
      "Không gửi dồn dập nhiều lần trong cùng một ngày.",
    ],
  };
}
