export type InvoiceAnalysisInput = {
  rentAmount: number;
  electricityKwh: number;
  electricityAmount: number;
  waterM3: number;
  waterAmount: number;
  otherAmount: number;
  totalAmount: number;
  dueDate: string | null;
  status: "unpaid" | "paid";
};

export type InvoiceLine = {
  label: string;
  amount: number;
  note: string;
  percent: number;
};

export type InvoiceAnalysis = {
  title: string;
  tone: "normal" | "careful" | "urgent";
  summary: string;
  lines: InvoiceLine[];
  insights: string[];
  questions: string[];
};

function pct(amount: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((amount / total) * 100);
}

function roundUnit(amount: number, units: number) {
  return units > 0 ? Math.round(amount / units) : 0;
}

function group(n: number): string {
  const digits = Math.abs(Math.round(n)).toString();
  let out = "";
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ".";
    out += digits[i];
  }
  return n < 0 ? `-${out}` : out;
}

export function analyzeInvoice(input: InvoiceAnalysisInput, today = new Date()): InvoiceAnalysis {
  const total =
    input.totalAmount ||
    input.rentAmount + input.electricityAmount + input.waterAmount + input.otherAmount;
  const lines: InvoiceLine[] = [
    {
      label: "Tiền phòng",
      amount: input.rentAmount,
      note: "Khoản cố định theo hợp đồng.",
      percent: pct(input.rentAmount, total),
    },
    {
      label: "Tiền điện",
      amount: input.electricityAmount,
      note:
        input.electricityKwh > 0
          ? `${input.electricityKwh} kWh, khoảng ${group(
              roundUnit(input.electricityAmount, input.electricityKwh),
            )}đ/kWh.`
          : "Chưa có sản lượng điện trong kỳ.",
      percent: pct(input.electricityAmount, total),
    },
    {
      label: "Tiền nước",
      amount: input.waterAmount,
      note:
        input.waterM3 > 0
          ? `${input.waterM3} m³, khoảng ${group(roundUnit(input.waterAmount, input.waterM3))}đ/m³.`
          : "Chưa có sản lượng nước trong kỳ.",
      percent: pct(input.waterAmount, total),
    },
    {
      label: "Phí khác",
      amount: input.otherAmount,
      note:
        input.otherAmount > 0
          ? "Cần ghi rõ gồm internet, gửi xe, vệ sinh hay phụ phí khác."
          : "Không có phụ phí khác.",
      percent: pct(input.otherAmount, total),
    },
  ];

  const insights: string[] = [];
  if (input.electricityKwh === 0 && input.electricityAmount === 0) {
    insights.push("Hoá đơn chưa có tiền điện; kiểm tra tab Chỉ số nếu phòng đã phát sinh điện.");
  } else if (pct(input.electricityAmount, total) >= 20) {
    insights.push("Tiền điện chiếm tỷ trọng cao; nên gửi kèm chỉ số đầu/cuối để người thuê dễ đối chiếu.");
  }
  if (input.waterM3 === 0 && input.waterAmount === 0) {
    insights.push("Hoá đơn chưa có tiền nước; cần chắc chắn kỳ này không dùng nước hoặc chưa nhập chỉ số.");
  }
  if (pct(input.otherAmount, total) >= 10) {
    insights.push("Phí khác đang lớn; nên tách rõ từng khoản để tránh tranh cãi.");
  }
  if (input.status === "unpaid" && input.dueDate && input.dueDate < today.toISOString().slice(0, 10)) {
    insights.push("Hoá đơn đã quá hạn; nên nhắc lịch sự và chốt ngày thanh toán mới.");
  }
  if (insights.length === 0) insights.push("Cơ cấu hoá đơn rõ, không thấy khoản bất thường lớn.");

  const questions = [
    "Chỉ số điện nước đầu kỳ và cuối kỳ đã khớp ảnh/chỉ số ghi nhận chưa?",
    "Phí khác có mô tả đủ rõ để người thuê hiểu vì sao phải trả không?",
  ];

  return {
    title:
      input.status === "unpaid" && input.dueDate && input.dueDate < today.toISOString().slice(0, 10)
        ? "Hoá đơn quá hạn cần xử lý"
        : "Phân tích cơ cấu hoá đơn",
    tone:
      input.status === "unpaid" && input.dueDate && input.dueDate < today.toISOString().slice(0, 10)
        ? "urgent"
        : pct(input.electricityAmount + input.otherAmount, total) >= 30
          ? "careful"
          : "normal",
    summary: `Tổng ${group(total)}đ, tiền phòng chiếm ${pct(
      input.rentAmount,
      total,
    )}% và phần biến đổi chiếm ${pct(input.electricityAmount + input.waterAmount + input.otherAmount, total)}%.`,
    lines,
    insights: insights.slice(0, 4),
    questions,
  };
}
