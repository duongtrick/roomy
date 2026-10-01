import type { VerificationLevel } from "./database.types";

export type ListingSafetyInput = {
  verification: VerificationLevel;
  reviewCount: number;
  hasUtilityRates: boolean;
  hasMapLocation: boolean;
};

export type DepositGuidance = {
  tone: "safe" | "careful" | "caution";
  title: string;
  note: string;
  checks: string[];
};

export function depositGuidance(input: ListingSafetyInput): DepositGuidance {
  const missing: string[] = [];
  if (input.verification !== "verified") missing.push("xác thực giấy tờ");
  if (input.reviewCount === 0) missing.push("đánh giá từ người thuê");
  if (!input.hasUtilityRates) missing.push("đơn giá điện nước");
  if (!input.hasMapLocation) missing.push("vị trí bản đồ");

  if (missing.length === 0) {
    return {
      tone: "safe",
      title: "Có thể trao đổi cọc trong Roomy",
      note: "Tin có đủ tín hiệu nền. Vẫn nên chuyển khoản đúng người nhận và giữ biên nhận.",
      checks: [
        "Xem phòng trực tiếp trước khi chuyển tiền.",
        "Nội dung chuyển khoản ghi rõ phòng, ngày xem và tiền cọc.",
        "Không chuyển thêm phí ngoài nội dung đã thống nhất.",
      ],
    };
  }

  if (input.verification === "verified" && missing.length <= 2) {
    return {
      tone: "careful",
      title: "Cần hỏi thêm trước khi cọc",
      note: `Tin còn thiếu ${missing.join(", ")}.`,
      checks: [
        "Hỏi rõ số tiền cọc, thời hạn giữ phòng và điều kiện hoàn cọc.",
        "Xin xác nhận đơn giá điện, nước, internet và phí gửi xe.",
        "Chỉ chuyển khoản sau khi đã xem phòng hoặc có biên nhận rõ ràng.",
      ],
    };
  }

  return {
    tone: "caution",
    title: "Không nên chuyển cọc vội",
    note: `Tin còn thiếu ${missing.join(", ")}.`,
    checks: [
      "Ưu tiên đặt lịch xem phòng trực tiếp.",
      "Không chuyển tiền giữ chỗ nếu người nhận thúc ép hoặc né giấy tờ.",
      "Chụp lại tin đăng, thỏa thuận và biên nhận nếu phát sinh đặt cọc.",
    ],
  };
}
