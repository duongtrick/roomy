import type { VerificationLevel } from "./database.types";

export type ListingRiskInput = {
  title: string | null;
  description: string | null;
  price: number;
  size: number | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  verification: VerificationLevel;
  imageCount: number;
};

export type ListingRisk = {
  level: "low" | "medium" | "high";
  label: string;
  reasons: string[];
  checklist: string[];
};

const DEPOSIT_TERMS = /\b(coc|giu cho|chuyen khoan|dat truoc|ck|zalo|nhanh tay)\b/;
const MARKS: [RegExp, string][] = [
  [/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a"],
  [/[èéẹẻẽêềếệểễ]/g, "e"],
  [/[ìíịỉĩ]/g, "i"],
  [/[òóọỏõôồốộổỗơờớợởỡ]/g, "o"],
  [/[ùúụủũưừứựửữ]/g, "u"],
  [/[ỳýỵỷỹ]/g, "y"],
  [/đ/g, "d"],
];

function fold(s: string): string {
  let out = s.toLowerCase();
  for (const [re, ch] of MARKS) out = out.replace(re, ch);
  return out;
}

export function assessListingRisk(input: ListingRiskInput): ListingRisk {
  const reasons: string[] = [];
  const checklist: string[] = [];
  const text = fold(`${input.title ?? ""} ${input.description ?? ""}`);

  if (input.verification !== "verified") {
    reasons.push("Chưa có xác thực quyền cho thuê");
    checklist.push("Đối chiếu giấy tờ chủ trọ và địa chỉ phòng.");
  }
  if (input.imageCount === 0) {
    reasons.push("Chưa có ảnh phòng");
    checklist.push("Yêu cầu ảnh thật của phòng trước khi duyệt.");
  }
  if (!input.address || input.lat == null || input.lng == null) {
    reasons.push("Thiếu địa chỉ hoặc vị trí bản đồ");
    checklist.push("Kiểm tra địa chỉ chữ và pin bản đồ có khớp.");
  }
  if (!input.size || input.size < 8) {
    reasons.push("Diện tích chưa rõ hoặc quá nhỏ");
    checklist.push("Hỏi lại diện tích sử dụng thực tế.");
  }
  if (input.price <= 1_200_000) {
    reasons.push("Giá thấp, dễ kéo người thuê đặt cọc nhanh");
    checklist.push("So giá với khu vực và hỏi rõ các khoản phí bắt buộc.");
  }
  if (DEPOSIT_TERMS.test(text)) {
    reasons.push("Mô tả có từ khóa đặt cọc/chuyển khoản");
    checklist.push("Không duyệt nếu yêu cầu chuyển tiền trước khi xem phòng.");
  }

  const score = reasons.length + (input.verification === "unverified" ? 1 : 0);
  return {
    level: score >= 4 ? "high" : score >= 2 ? "medium" : "low",
    label: score >= 4 ? "Cần soi kỹ" : score >= 2 ? "Nên kiểm tra thêm" : "Tín hiệu ổn",
    reasons: reasons.slice(0, 4),
    checklist: (checklist.length ? checklist : ["Đọc mô tả, xem ảnh, gọi chủ trọ nếu cần."]).slice(
      0,
      3,
    ),
  };
}
