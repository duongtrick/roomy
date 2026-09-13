import { colors } from "@/theme";
import type { VerificationLevel } from "./database.types";

/**
 * Mức độ xác thực tin đăng — nhãn và màu chip.
 *
 * Ba mức thay vì một cờ đúng/sai vì "chưa xác thực" và "đang chờ duyệt" nói
 * hai chuyện khác nhau với người tìm phòng: một bên là chủ trọ chưa gửi giấy
 * tờ, một bên là đã gửi và quản trị viên đang xem. Gộp lại thành một cờ thì
 * cả hai đều hiện "chưa xác thực" và chủ trọ không có cách nào thể hiện là
 * mình đã làm phần việc của họ.
 *
 * Ai đặt được mức nào là do trigger `listings_guard_verification` trong
 * `supabase/schema.sql` quyết định, không phải màn hình này.
 */
export const VERIFICATION_ORDER: VerificationLevel[] = ["unverified", "pending", "verified"];

export const VERIFICATION_LABEL: Record<VerificationLevel, string> = {
  unverified: "Chưa xác thực",
  pending: "Chờ xác thực",
  verified: "Đã xác thực",
};

/** Câu giải thích hiện trong trang chi tiết phòng. */
export const VERIFICATION_NOTE: Record<VerificationLevel, string> = {
  unverified: "Chủ trọ chưa gửi giấy tờ chứng minh quyền cho thuê. Hãy xem phòng trực tiếp trước khi đặt cọc.",
  pending: "Chủ trọ đã gửi giấy tờ, quản trị viên đang đối chiếu.",
  verified: "Quản trị viên đã đối chiếu giấy tờ chủ trọ và địa chỉ phòng.",
};

export const VERIFICATION_COLOR: Record<
  VerificationLevel,
  { bg: string; fg: string; border: string }
> = {
  unverified: colors.neutral,
  pending: colors.amber,
  verified: colors.emerald,
};

/** Chuẩn hoá giá trị lạ về mức thấp nhất — không bao giờ nhận nhầm là đã duyệt. */
export function toVerification(value: string | null | undefined): VerificationLevel {
  return (VERIFICATION_ORDER as string[]).includes(value ?? "")
    ? (value as VerificationLevel)
    : "unverified";
}
