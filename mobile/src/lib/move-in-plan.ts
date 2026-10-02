import type { ListingStatus, VerificationLevel } from "./database.types";

export type MoveInPlanInput = {
  price: number;
  estimatedTotal: number | null;
  budget: number | null;
  verification: VerificationLevel;
  reviewCount: number;
  hasUtilityRates: boolean;
  hasMapLocation: boolean;
  status: ListingStatus;
};

export type MoveInPlan = {
  tone: "ready" | "careful" | "blocked";
  title: string;
  summary: string;
  beforeDeposit: string[];
  firstDay: string[];
  firstMonth: string[];
};

export function moveInPlan(input: MoveInPlanInput): MoveInPlan {
  const total = input.estimatedTotal ?? input.price;
  const overBudget = input.budget != null && total > input.budget;
  const missingTrust =
    input.verification !== "verified" || input.reviewCount === 0 || !input.hasMapLocation;
  const missingCost = !input.hasUtilityRates;
  const blocked = input.status !== "available" || overBudget;
  const tone: MoveInPlan["tone"] = blocked ? "blocked" : missingTrust || missingCost ? "careful" : "ready";

  const beforeDeposit = [
    "Chốt tổng tiền tháng đầu: cọc, tiền phòng, điện, nước, internet, gửi xe và vệ sinh.",
    "Xin mẫu hợp đồng hoặc ít nhất tin nhắn xác nhận số tiền, ngày vào ở và điều kiện hoàn cọc.",
  ];
  if (input.verification !== "verified") {
    beforeDeposit.push("Đối chiếu người nhận cọc với giấy tờ chủ nhà hoặc người được uỷ quyền.");
  }
  if (missingCost) {
    beforeDeposit.push("Yêu cầu đơn giá điện nước bằng số cụ thể trước khi chuyển tiền.");
  }
  if (overBudget) {
    beforeDeposit.push("Tổng dự kiến vượt ngân sách: thương lượng lại hoặc chọn phòng dự phòng.");
  }

  const firstDay = [
    "Chụp ảnh công tơ điện, nước, khoá cửa, tường, trần, nhà vệ sinh và đồ có sẵn.",
    "Lưu số chủ trọ, quy định giờ giấc, chỗ để xe, wifi và người liên hệ khi có sự cố.",
  ];
  if (input.status !== "available") {
    firstDay.push("Chỉ nhận phòng khi phần sửa chữa/bảo trì đã hoàn tất như đã hẹn.");
  }

  const firstMonth = [
    "Ghi lại chỉ số điện nước mỗi tuần đầu để phát hiện bất thường sớm.",
    "Giữ biên nhận mọi khoản đóng thêm; khoản nào không rõ thì hỏi ngay trong tháng đầu.",
    "Sau khi ở ổn định, viết đánh giá thật để giúp người thuê sau chọn phòng an toàn hơn.",
  ];

  return {
    tone,
    title:
      tone === "blocked"
        ? "Chưa nên chốt ngay"
        : tone === "careful"
          ? "Có thể vào ở, nhưng cần hỏi kỹ"
          : "Sẵn sàng cho tháng đầu",
    summary:
      tone === "blocked"
        ? "Roomy thấy có điều kiện cần xử lý trước khi đặt cọc."
        : tone === "careful"
          ? "Tin còn vài điểm cần xác nhận để tránh phát sinh chi phí."
          : "Tin đủ dữ liệu nền; chuẩn bị bằng chứng và mốc thanh toán là ổn.",
    beforeDeposit: beforeDeposit.slice(0, 4),
    firstDay: firstDay.slice(0, 3),
    firstMonth,
  };
}
