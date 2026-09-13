import { supabase } from "../supabase";
import type {
  AdminListingRow,
  AdminReviewRow,
  ModerationStatus,
  VerificationLevel,
} from "../database.types";
import { assertConfigured, unwrap, unwrapAs } from "./errors";

/**
 * Bảng quản trị: kiểm duyệt tin đăng và gỡ đánh giá.
 *
 * Không hàm nào lọc theo vai trò. Hai view `admin_listings` và `admin_reviews`
 * đã có `is_admin()` bên trong, nên tài khoản thường đọc chúng ra danh sách
 * rỗng, còn mọi lệnh ghi bị policy "Admins moderate listings" chặn ở database.
 * Màn hình vẫn kiểm tra vai trò, nhưng chỉ để không bắt người dùng nhìn một
 * trang trống — quyền là việc của RLS.
 */

const LISTING_SELECT = `
  id, owner_id, title, public_title, public_description, price, size, address,
  area, district, amenities, lat, lng, status, school_name, distance_to_school,
  verification, is_published, moderation_status, moderation_note, moderated_at,
  created_at, updated_at, owner_name, owner_phone, images, review_count
` as const;

export type AdminSnapshot = {
  listings: AdminListingRow[];
  reviews: AdminReviewRow[];
};

export async function getAdminListings(): Promise<AdminListingRow[]> {
  assertConfigured();
  return unwrapAs<AdminListingRow[]>(
    await supabase
      .from("admin_listings")
      .select(LISTING_SELECT)
      .order("created_at", { ascending: false }),
  );
}

export async function getAdminReviews(): Promise<AdminReviewRow[]> {
  assertConfigured();
  return unwrapAs<AdminReviewRow[]>(
    await supabase.from("admin_reviews").select("*").order("created_at", { ascending: false }),
  );
}

/** Một vòng đọc cả hai bảng, giống `getDashboardSnapshot` bên chủ trọ. */
export async function getAdminSnapshot(): Promise<AdminSnapshot> {
  assertConfigured();
  const [listings, reviews] = await Promise.all([getAdminListings(), getAdminReviews()]);
  return { listings, reviews };
}

/**
 * Duyệt hoặc từ chối một tin.
 *
 * `moderated_at` và `moderated_by` do trigger `listings_guard_moderation` ghi,
 * không gửi từ đây: giờ của máy điện thoại không phải nguồn đáng tin cho một
 * dấu vết kiểm duyệt.
 */
export async function setListingModeration(
  id: string,
  status: ModerationStatus,
  note: string | null = null,
): Promise<void> {
  assertConfigured();
  if (status === "rejected" && !note?.trim()) {
    // `listings_moderation_note_check` cũng chặn, nhưng câu báo lỗi từ Postgres
    // chỉ nói "dữ liệu không hợp lệ" chứ không nói thiếu cái gì.
    throw new Error("Từ chối tin thì phải ghi lý do cho chủ trọ.");
  }
  unwrap(
    await supabase
      .from("listings")
      .update({
        moderation_status: status,
        moderation_note: status === "rejected" ? note!.trim() : null,
      })
      .eq("id", id)
      .select("id"),
  );
}

/** Cấp hoặc rút huy hiệu "Đã xác thực". */
export async function setListingVerification(
  id: string,
  verification: VerificationLevel,
): Promise<void> {
  assertConfigured();
  unwrap(await supabase.from("listings").update({ verification }).eq("id", id).select("id"));
}

/**
 * Gỡ tin khỏi trang công khai.
 *
 * Cố ý không xoá dòng: phòng còn gắn hợp đồng, chỉ số và hoá đơn của chủ trọ,
 * xoá tin là xoá luôn cả sổ sách của họ vì các khoá ngoại đều ON DELETE
 * CASCADE. Gỡ đăng đủ để người tìm trọ không thấy nữa. Dùng khi tin sai nội
 * dung nhưng phòng có thật — chủ trọ sửa rồi đăng lại.
 */
export async function unpublishListing(id: string): Promise<void> {
  assertConfigured();
  unwrap(
    await supabase.from("listings").update({ is_published: false }).eq("id", id).select("id"),
  );
}

/**
 * Xoá hẳn một tin — dành cho phòng không tồn tại.
 *
 * Đây là nửa còn lại của `unpublishListing`, không phải bản mạnh hơn của nó.
 * Gỡ là "tin sai, phòng thật"; xoá là "không có phòng nào cả", và lúc đó hợp
 * đồng, chỉ số, hoá đơn treo trên phòng ma cũng không còn nghĩa gì nên để
 * ON DELETE CASCADE dọn theo là đúng. Thao tác không lùi lại được, nên nơi
 * gọi phải hỏi lại người dùng trước.
 *
 * Kiểm số dòng trả về chứ không chỉ kiểm lỗi: RLS chặn một lệnh DELETE bằng
 * cách lọc dòng ra khỏi tầm với, nên policy thiếu cho ra `data: []` với
 * `error: null` — y hệt một lần xoá thành công nếu chỉ nhìn `error`. Không
 * chặn ở đây thì màn hình báo "đã xoá" trong khi tin vẫn còn nguyên.
 */
export async function deleteListing(id: string): Promise<void> {
  assertConfigured();
  const rows = unwrap(await supabase.from("listings").delete().eq("id", id).select("id"));
  if (rows.length === 0) {
    throw new Error("Không xoá được tin này. Tài khoản của bạn có thể chưa có quyền quản trị.");
  }
}

export async function deleteReview(id: string): Promise<void> {
  assertConfigured();
  unwrap(await supabase.from("reviews").delete().eq("id", id).select("id"));
}
