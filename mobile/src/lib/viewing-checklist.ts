import type { VerificationLevel } from "./database.types";

export type ViewingChecklistInput = {
  verification: VerificationLevel;
  reviewCount: number;
  hasUtilityRates: boolean;
  hasMapLocation: boolean;
  distanceToSchool: number | null;
  status: "available" | "occupied" | "maintenance";
};

export type ViewingChecklist = {
  title: string;
  priority: "normal" | "careful";
  items: string[];
};

export function viewingChecklist(input: ViewingChecklistInput): ViewingChecklist {
  const items = [
    "Chụp lại tin đăng, giá thuê và các khoản phí chủ trọ đã nói.",
    "Kiểm tra khóa cửa, nhà vệ sinh, ổ điện, sóng điện thoại và lối thoát hiểm.",
  ];

  if (input.status !== "available") {
    items.push("Hỏi rõ ngày phòng có thể vào ở và tình trạng sửa chữa hiện tại.");
  }
  if (input.verification !== "verified") {
    items.push("Xin giấy tờ chứng minh quyền cho thuê hoặc giấy xác nhận của chủ nhà.");
  }
  if (!input.hasUtilityRates) {
    items.push("Hỏi đơn giá điện, nước, internet, gửi xe và phí vệ sinh trước khi đặt cọc.");
  }
  if (!input.hasMapLocation || input.distanceToSchool == null) {
    items.push("Mở bản đồ kiểm tra tuyến đi thật tới trường hoặc nơi làm.");
  }
  if (input.reviewCount === 0) {
    items.push("Hỏi người thuê cũ hoặc hàng xóm về an ninh, tiếng ồn và giờ giấc.");
  }

  const priority =
    input.verification !== "verified" || !input.hasUtilityRates || input.reviewCount === 0
      ? "careful"
      : "normal";

  return {
    title: priority === "careful" ? "Đi xem kỹ trước khi cọc" : "Checklist nhanh khi đi xem",
    priority,
    items: items.slice(0, 5),
  };
}
