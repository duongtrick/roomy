import { colors } from "@/theme";
import type { ModerationStatus } from "./database.types";

/**
 * Kiểm duyệt nội dung tin đăng — nhãn và màu chip.
 *
 * Khác `verification` ở chỗ nó nói về *bài đăng*, không phải về *chủ trọ*:
 * xác thực là đối chiếu giấy tờ và địa chỉ, kiểm duyệt là đọc xem tin có mô
 * tả đúng phòng, đúng giá, ảnh có phải ảnh phòng đó không. Một chủ trọ đã xác
 * thực vẫn đăng được một tin sai giá, nên hai cột không gộp làm một.
 *
 * Ai đặt được mức nào là do trigger `listings_guard_moderation` trong
 * `supabase/schema.sql` quyết định, không phải màn hình này.
 */
export const MODERATION_ORDER: ModerationStatus[] = ["pending", "approved", "rejected"];

export const MODERATION_LABEL: Record<ModerationStatus, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Bị từ chối",
};

/** Câu giải thích hiện cho chủ trọ trong Bảng điều khiển. */
export const MODERATION_NOTE: Record<ModerationStatus, string> = {
  pending: "Quản trị viên đang xem tin này. Tin chưa hiện với người tìm trọ.",
  approved: "Tin đã được duyệt và đang hiển thị với người tìm trọ.",
  rejected: "Tin bị từ chối nên không hiển thị công khai. Sửa lại theo lý do bên dưới rồi lưu để gửi duyệt lần nữa.",
};

export const MODERATION_COLOR: Record<
  ModerationStatus,
  { bg: string; fg: string; border: string }
> = {
  pending: colors.amber,
  approved: colors.emerald,
  rejected: { bg: "#FEE4E2", fg: "#B42318", border: "#FECDCA" },
};

/** Chuẩn hoá giá trị lạ về "chờ duyệt" — không bao giờ nhận nhầm là đã duyệt. */
export function toModeration(value: string | null | undefined): ModerationStatus {
  return (MODERATION_ORDER as string[]).includes(value ?? "")
    ? (value as ModerationStatus)
    : "pending";
}
