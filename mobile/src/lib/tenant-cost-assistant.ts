export type TenantCostInput = {
  rent: string;
  electricityKwh: string;
  electricityRate: string;
  waterM3: string;
  waterRate: string;
  otherFee: string;
  budget: string;
};

export type TenantCostPlan = {
  total: number;
  lines: string[];
  tone: "safe" | "careful" | "over";
  title: string;
  note: string;
  tips: string[];
};

function money(value: string): number {
  const n = Number(value.replace(/\D/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function usage(value: string): number {
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function vnd(value: number): string {
  return `${Math.round(value).toLocaleString("vi-VN")}đ`;
}

export function tenantCostAssistant(input: TenantCostInput): TenantCostPlan | null {
  const rent = money(input.rent);
  const electricityKwh = usage(input.electricityKwh);
  const electricityRate = money(input.electricityRate) || 3500;
  const waterM3 = usage(input.waterM3);
  const waterRate = money(input.waterRate) || 25000;
  const otherFee = money(input.otherFee);
  const budget = money(input.budget);

  if (!rent && !electricityKwh && !waterM3 && !otherFee) return null;

  const electricity = Math.round(electricityKwh * electricityRate);
  const water = Math.round(waterM3 * waterRate);
  const total = rent + electricity + water + otherFee;
  const ratio = budget ? total / budget : 0;
  const tone: TenantCostPlan["tone"] = budget && ratio > 1 ? "over" : budget && ratio > 0.85 ? "careful" : "safe";

  const lines = [
    rent ? `Tiền phòng: ${vnd(rent)}` : null,
    electricity ? `Điện: ${electricityKwh} kWh × ${vnd(electricityRate)} = ${vnd(electricity)}` : null,
    water ? `Nước: ${waterM3} m³ × ${vnd(waterRate)} = ${vnd(water)}` : null,
    otherFee ? `Phí khác: ${vnd(otherFee)}` : null,
  ].filter((line): line is string => Boolean(line));

  const tips = [
    !input.electricityRate.trim() ? "Chưa biết đơn giá điện: hỏi chủ trọ giá/kWh và cách chốt công tơ." : null,
    !input.waterRate.trim() ? "Chưa biết đơn giá nước: hỏi tính theo người hay theo m³." : null,
    otherFee ? "Phí khác nên tách rõ internet, gửi xe, vệ sinh để tránh cộng dồn mơ hồ." : null,
    electricityKwh >= 120 ? "Điện cao: kiểm tra điều hoà, bình nóng lạnh và thiết bị chạy cả ngày." : null,
    waterM3 >= 8 ? "Nước cao: hỏi có đồng hồ riêng hay chia đều theo phòng." : null,
  ].filter((tip): tip is string => Boolean(tip));

  return {
    total,
    lines,
    tone,
    title:
      tone === "over"
        ? "Vượt ngân sách tháng"
        : tone === "careful"
          ? "Sát ngân sách, cần hỏi kỹ"
          : "Chi phí đang ổn",
    note: budget
      ? `Tổng dự kiến ${vnd(total)} trên ngân sách ${vnd(budget)}.`
      : `Tổng dự kiến ${vnd(total)}. Nhập ngân sách để Roomy cảnh báo sát trần.`,
    tips: tips.length ? tips : ["Giữ ảnh công tơ đầu kỳ/cuối kỳ để đối chiếu khi nhận hoá đơn."],
  };
}
