import type { VerificationLevel } from "./database.types";

export type ViewingChecklistInput = {
  verification: VerificationLevel;
  reviewCount: number;
  hasUtilityRates: boolean;
  hasMapLocation: boolean;
  distanceToSchool: number | null;
  status: "available" | "occupied" | "maintenance";
};

export type ViewingProfile = "freshman" | "budget" | "solo";

export type ViewingChecklist = {
  title: string;
  priority: "normal" | "careful";
  items: string[];
  focus: string;
  questions: string[];
  documents: string[];
  redFlags: string[];
};

export function viewingChecklist(
  input: ViewingChecklistInput,
  profile: ViewingProfile = "freshman",
): ViewingChecklist {
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

  const questions = [
    "Tổng tiền tháng đầu gồm những khoản nào, có khoản nào thu một lần không?",
    "Nếu đặt cọc thì người nhận tiền là ai, có biên nhận và điều kiện hoàn cọc không?",
  ];
  const documents = [
    "Chỉ mang giấy tờ để đối chiếu khi cần, không gửi ảnh CCCD qua chat trước khi ký.",
    "Lưu ảnh biên nhận, hợp đồng và lịch sử chuyển khoản nếu có đặt cọc.",
  ];
  const redFlags = [
    "Bị ép chuyển cọc trước khi xem phòng hoặc trước khi biết rõ người nhận tiền.",
    "Giá rẻ bất thường nhưng thiếu địa chỉ, thiếu ảnh, thiếu đơn giá điện nước.",
  ];

  if (profile === "freshman") {
    questions.push("Giờ giấc, chung chủ, khách đến chơi và gửi xe được quy định thế nào?");
    documents.push("Đi cùng người thân hoặc bạn có kinh nghiệm nếu tin chưa xác thực.");
  }

  if (profile === "budget") {
    questions.push("Mùa cao điểm tiền điện nước thường hết bao nhiêu mỗi người?");
    redFlags.push("Chỉ nói tiền phòng rẻ nhưng né trả lời điện, nước, internet, gửi xe.");
  }

  if (profile === "solo") {
    questions.push("Lối về buổi tối có đèn, camera, khóa cổng và người trực không?");
    redFlags.push("Lối đi khuất, khóa cửa yếu, không rõ ai giữ chìa dự phòng.");
  }

  return {
    title:
      profile === "freshman"
        ? "Kế hoạch cho tân sinh viên"
        : profile === "budget"
          ? "Kế hoạch giữ ngân sách"
          : "Kế hoạch đi xem một mình",
    priority,
    items: items.slice(0, 5),
    focus:
      priority === "careful"
        ? "Tin này cần hỏi kỹ trước khi cọc."
        : "Tin này đủ dữ liệu cơ bản, vẫn nên kiểm tra trực tiếp.",
    questions: questions.slice(0, 4),
    documents: documents.slice(0, 3),
    redFlags: redFlags.slice(0, 3),
  };
}
