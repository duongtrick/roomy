export type MaintenancePriority = "urgent" | "soon" | "normal";

export type MaintenanceTriage = {
  priority: MaintenancePriority;
  title: string;
  category: string;
  note: string;
  questions: string[];
  message: string;
};

const RULES: { pattern: RegExp; category: string; priority: MaintenancePriority }[] = [
  { pattern: /cháy|khói|chập|điện giật|rò điện|mùi gas|gas/i, category: "An toàn", priority: "urgent" },
  { pattern: /ngập|nước tràn|vỡ ống|rò nước nhiều|dột nặng/i, category: "Nước", priority: "urgent" },
  { pattern: /mất điện|aptomat|ổ điện|bóng đèn|đèn/i, category: "Điện", priority: "soon" },
  { pattern: /rò nước|vòi|bồn cầu|thoát nước|tắc/i, category: "Nước", priority: "soon" },
  { pattern: /khóa|cửa|kính|trộm|an ninh/i, category: "An ninh", priority: "soon" },
  { pattern: /điều hòa|máy lạnh|quạt|nóng lạnh|wifi|internet/i, category: "Tiện ích", priority: "normal" },
];

const PRIORITY_TITLE: Record<MaintenancePriority, string> = {
  urgent: "Cần báo ngay",
  soon: "Nên xử lý sớm",
  normal: "Theo dõi và hẹn sửa",
};

export function triageMaintenance(input: string): MaintenanceTriage | null {
  const text = input.trim().replace(/\s+/g, " ");
  if (text.length < 8) return null;

  const match = RULES.find((rule) => rule.pattern.test(text));
  const priority = match?.priority ?? "normal";
  const category = match?.category ?? "Khác";
  const questions = [
    "Sự cố bắt đầu từ lúc nào?",
    "Có ảnh hoặc video hiện trạng không?",
    "Phòng còn dùng được an toàn không?",
  ];

  if (priority === "urgent") {
    questions.unshift("Nếu có nguy cơ cháy, điện giật hoặc ngập nước, hãy ngắt nguồn an toàn và gọi chủ trọ ngay.");
  }
  if (category === "Điện") questions.push("Có thiết bị nào đang gây chập hoặc quá tải không?");
  if (category === "Nước") questions.push("Đã khóa van nước hoặc kê đồ tránh ướt chưa?");

  return {
    priority,
    title: PRIORITY_TITLE[priority],
    category,
    note:
      priority === "urgent"
        ? "Ưu tiên an toàn trước, không tự sửa nếu có điện, nước tràn hoặc mùi gas."
        : "Gửi mô tả rõ để chủ trọ đặt lịch sửa đúng người và đúng vật tư.",
    questions: questions.slice(0, 4),
    message: `Em báo sự cố ${category.toLowerCase()}: ${text}. Nhờ anh/chị kiểm tra giúp. Mức ưu tiên: ${PRIORITY_TITLE[priority]}.`,
  };
}
