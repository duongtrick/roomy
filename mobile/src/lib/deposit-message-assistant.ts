export type DepositMessageCheck = {
  level: "safe" | "careful" | "danger";
  title: string;
  summary: string;
  flags: string[];
  nextSteps: string[];
  replyDraft: string;
};

const MARKS: [RegExp, string][] = [
  [/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a"],
  [/[èéẹẻẽêềếệểễ]/g, "e"],
  [/[ìíịỉĩ]/g, "i"],
  [/[òóọỏõôồốộổỗơờớợởỡ]/g, "o"],
  [/[ùúụủũưừứựửữ]/g, "u"],
  [/[ỳýỵỷỹ]/g, "y"],
  [/đ/g, "d"],
];

function fold(value: string) {
  let out = value.toLowerCase();
  for (const [re, ch] of MARKS) out = out.replace(re, ch);
  return out;
}

const RULES: { pattern: RegExp; flag: string; weight: number }[] = [
  {
    pattern: /\b(chuyen khoan|dat coc|giu phong|giu cho|coc truoc|thanh toan)\b.*\b(truoc|ngay|hom nay|24h|gap)\b/,
    flag: "Có yêu cầu chuyển tiền/cọc gấp trước khi đủ bước xác minh.",
    weight: 3,
  },
  {
    pattern: /\b(chua can xem|khong can xem|khong xem duoc|dang o xa|di cong tac|o nuoc ngoai|khong gap duoc)\b/,
    flag: "Người cho thuê né gặp trực tiếp hoặc né xem phòng.",
    weight: 3,
  },
  {
    pattern: /\b(gift card|the cao|crypto|bitcoin|usdt|western union|moneygram|zelle|wire)\b/,
    flag: "Phương thức thanh toán khó đối soát hoặc khó hoàn tiền.",
    weight: 3,
  },
  {
    pattern: /\b(cccd|can cuoc|cmnd|so tai khoan|mat khau|otp|ma xac minh|ngan hang)\b/,
    flag: "Có nhắc giấy tờ hoặc thông tin nhạy cảm quá sớm.",
    weight: 2,
  },
  {
    pattern: /\b(re hon|gia re|uu dai|giam gia|nhieu nguoi hoi|co nguoi coc|khong nhanh)\b/,
    flag: "Có tín hiệu thúc ép vì giá rẻ hoặc nhiều người hỏi.",
    weight: 1,
  },
  {
    pattern: /\b(khong hop dong|khong can hop dong|noi dung chuyen khoan de trong|ghi noi dung khac)\b/,
    flag: "Thiếu hợp đồng/biên nhận hoặc nội dung chuyển khoản không rõ.",
    weight: 3,
  },
];

export function checkDepositMessage(raw: string): DepositMessageCheck | null {
  const text = fold(raw);
  if (text.length < 12) return null;

  const matched = RULES.filter((rule) => rule.pattern.test(text));
  const score = matched.reduce((sum, rule) => sum + rule.weight, 0);
  const level: DepositMessageCheck["level"] =
    score >= 5 ? "danger" : score >= 2 ? "careful" : "safe";

  const flags = matched.map((rule) => rule.flag);
  const nextSteps =
    level === "danger"
      ? [
          "Không chuyển tiền hoặc gửi giấy tờ trước khi xem phòng và xác minh người nhận.",
          "Yêu cầu xem phòng trực tiếp hoặc gọi video có địa chỉ rõ ràng.",
          "Chỉ chuyển khoản khi có biên nhận/hợp đồng và nội dung chuyển khoản ghi đúng phòng.",
        ]
      : level === "careful"
        ? [
            "Hỏi lại số tiền cọc, điều kiện hoàn cọc và người nhận tiền.",
            "Xin ảnh hợp đồng/biên nhận mẫu trước khi hẹn xem phòng.",
            "Không gửi CCCD, OTP, mật khẩu hoặc tài khoản ngân hàng qua chat.",
          ]
        : [
            "Vẫn nên xem phòng trực tiếp trước khi cọc.",
            "Giữ toàn bộ tin nhắn, ảnh phòng, biên nhận và lịch sử chuyển khoản.",
            "Nội dung chuyển khoản cần ghi rõ phòng, ngày xem và tiền cọc.",
          ];

  return {
    level,
    title:
      level === "danger"
        ? "Rủi ro cao, chưa nên chuyển tiền"
        : level === "careful"
          ? "Cần xác minh thêm"
          : "Chưa thấy cờ đỏ lớn",
    summary:
      flags.length > 0
        ? `Roomy thấy ${flags.length} tín hiệu cần kiểm tra trong tin nhắn này.`
        : "Tin nhắn chưa có dấu hiệu thúc ép rõ, nhưng vẫn cần xem phòng và giữ bằng chứng.",
    flags: flags.length ? flags : ["Chưa phát hiện yêu cầu chuyển tiền gấp, né xem phòng hoặc xin dữ liệu nhạy cảm."],
    nextSteps,
    replyDraft:
      level === "danger"
        ? "Em chỉ đặt cọc sau khi xem phòng trực tiếp, xác minh người nhận tiền và có biên nhận/hợp đồng rõ ràng. Anh/chị cho em hẹn xem phòng trước nhé."
        : "Em muốn xem phòng trực tiếp và xin rõ tổng chi phí tháng đầu, điều kiện hoàn cọc, người nhận tiền và nội dung chuyển khoản trước khi quyết định.",
  };
}
