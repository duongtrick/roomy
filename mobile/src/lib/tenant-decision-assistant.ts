import type { FavoriteProfile } from "./favorite-compare";

export type TenantDecisionRoom = {
  id: string;
  title: string;
  price: number;
  status?: "available" | "occupied" | "maintenance";
  distanceToSchool: number | null;
  verification: "unverified" | "pending" | "verified";
  electricityRate: number | null;
  waterRate: number | null;
  reviews: { rating: number }[];
};

export type TenantDecision = {
  title: string;
  summary: string;
  nextRoomId: string;
  nextRoomTitle: string;
  budgetNote: string;
  plan: string[];
  questions: string[];
};

function money(n: number) {
  if (Math.abs(n) >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}tr`;
  }
  return `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}đ`;
}

function avg(room: TenantDecisionRoom) {
  if (room.reviews.length === 0) return 0;
  return room.reviews.reduce((sum, review) => sum + review.rating, 0) / room.reviews.length;
}

function estimatedTotal(room: TenantDecisionRoom) {
  return (
    room.price +
    (room.electricityRate == null || room.waterRate == null
      ? 0
      : 80 * room.electricityRate + 4 * room.waterRate)
  );
}

function score(room: TenantDecisionRoom, profile: FavoriteProfile, budget: number | null) {
  let value = 50;
  const reasons: string[] = [];
  const total = estimatedTotal(room);

  if (room.status === "available" || room.status == null) {
    value += 14;
    reasons.push("còn trống");
  }
  if (budget != null && total <= budget) {
    value += profile === "budget" ? 22 : 12;
    reasons.push("vừa ngân sách");
  }
  if (room.verification === "verified") {
    value += profile === "safe" ? 24 : 14;
    reasons.push("đã xác thực");
  }
  if (room.distanceToSchool != null && room.distanceToSchool <= 1000) {
    value += profile === "freshman" ? 18 : 10;
    reasons.push("gần trường");
  }
  if (room.electricityRate != null && room.waterRate != null) {
    value += 8;
    reasons.push("rõ điện nước");
  }
  if (avg(room) >= 4.5) {
    value += profile === "safe" ? 12 : 8;
    reasons.push("đánh giá tốt");
  }
  if (budget != null && total > budget) value -= 18;
  if (room.verification !== "verified" && profile === "safe") value -= 10;
  if (room.status && room.status !== "available") value -= 30;

  return { room, total, value, reasons: reasons.slice(0, 3) };
}

export function tenantDecisionAssistant(
  rooms: TenantDecisionRoom[],
  profile: FavoriteProfile,
  budgetText: string,
): TenantDecision | null {
  if (rooms.length === 0) return null;

  const budget = budgetText.trim() ? Number(budgetText.replace(/\D/g, "")) : null;
  const ranked = rooms
    .map((room) => score(room, profile, budget && budget > 0 ? budget : null))
    .sort((a, b) => b.value - a.value);
  const best = ranked[0];
  const overBudget = budget != null && best.total > budget;
  const missingRates = rooms.some((room) => room.electricityRate == null || room.waterRate == null);

  const plan = [
    `Xem trước "${best.room.title}" vì ${best.reasons.join(", ") || "điểm tổng thể tốt nhất"}.`,
    rooms.length >= 2
      ? `Chỉ giữ tối đa 2 phòng dự phòng để tránh phân vân: ${ranked
          .slice(1, 3)
          .map((item) => item.room.title)
          .join(", ")}.`
      : "Lưu thêm 1-2 phòng cùng khu vực để có phương án so sánh.",
    missingRates
      ? "Phòng nào chưa rõ điện nước thì hỏi trước khi đi xem."
      : "Khi đi xem, đối chiếu lại đơn giá điện nước với chủ trọ.",
  ];

  return {
    title: "Trợ lý chọn phòng",
    summary: `${rooms.length} phòng đã lưu, Roomy đề xuất thứ tự xem theo hồ sơ của bạn.`,
    nextRoomId: best.room.id,
    nextRoomTitle: best.room.title,
    budgetNote:
      budget == null || budget <= 0
        ? `Ước tính phòng nên xem trước khoảng ${money(best.total)}/tháng khi dùng 80 kWh điện và 4 m³ nước.`
        : overBudget
          ? `Ước tính ${money(best.total)}/tháng, đang vượt ngân sách ${money(budget)}.`
          : `Ước tính ${money(best.total)}/tháng, trong ngân sách ${money(budget)}.`,
    plan: plan.slice(0, 3),
    questions: [
      "Tổng tiền tháng đầu gồm cọc, phòng, điện, nước, internet, gửi xe là bao nhiêu?",
      "Nếu chuyển cọc, người nhận tiền có đúng chủ trọ và có biên nhận không?",
      "Có quy định giờ giấc, khách qua đêm, nấu ăn hoặc nuôi thú cưng không?",
    ],
  };
}
