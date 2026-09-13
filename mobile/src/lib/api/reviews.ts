import { supabase } from "../supabase";
import type { ReviewRow } from "../database.types";
import { assertConfigured, requireUserId, unwrap } from "./errors";

/**
 * Đánh giá phòng — chỉ người đã thuê mới viết được.
 *
 * Điều kiện thật sự nằm ở policy "Tenants review rooms they rented": phải có
 * hợp đồng trên đúng phòng đó, gắn với một hồ sơ người thuê đã được chính chủ
 * tài khoản nhận. `canReview` ở đây chỉ để màn hình biết nên hiện ô viết hay
 * hiện câu giải thích — người dùng không nên bấm "Gửi" rồi mới biết mình
 * không có quyền.
 *
 * Chuỗi liên kết: chủ trọ điền email người thuê vào hồ sơ → người thuê đăng
 * nhập và bấm "Tôi đang thuê phòng" (`claimTenancy`) → hồ sơ gắn vào tài
 * khoản → hợp đồng của hồ sơ đó mở khoá quyền đánh giá. Hai đầu đều phải chủ
 * động, nên không chủ trọ nào tự dựng được một người thuê giả để tự khen, và
 * không tài khoản lạ nào vào chấm một sao cho phòng chưa từng ở.
 */

export type ReviewState = {
  /** Có hợp đồng thuê phòng này hay không. */
  canReview: boolean;
  /** Đánh giá người dùng đã viết cho phòng này, nếu có. */
  mine: ReviewRow | null;
};

const NOT_ALLOWED: ReviewState = { canReview: false, mine: null };

export async function getReviewState(listingId: string): Promise<ReviewState> {
  assertConfigured();
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) return NOT_ALLOWED;

  const [eligible, mine] = await Promise.all([
    supabase.rpc("can_review_listing", { _listing_id: listingId }),
    supabase
      .from("reviews")
      .select("*")
      .eq("listing_id", listingId)
      .eq("author_id", userId)
      .maybeSingle(),
  ]);

  if (eligible.error) throw new Error(eligible.error.message);
  if (mine.error) throw new Error(mine.error.message);

  return { canReview: eligible.data === true, mine: mine.data ?? null };
}

/**
 * Viết mới hoặc sửa lại đánh giá của chính mình.
 *
 * `author_name` gửi lên bị trigger `set_review_author` ghi đè bằng tên trong
 * hồ sơ; cột vẫn NOT NULL nên phải có một giá trị nào đó cho câu insert chạy
 * qua được.
 */
export async function saveReview(input: {
  listingId: string;
  rating: number;
  comment: string;
  existingId?: string | null;
}): Promise<void> {
  const userId = await requireUserId();
  const comment = input.comment.trim();
  if (!comment) throw new Error("Hãy viết vài dòng về căn phòng.");
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new Error("Số sao phải từ 1 đến 5.");
  }

  if (input.existingId) {
    unwrap(
      await supabase
        .from("reviews")
        .update({ rating: input.rating, comment })
        .eq("id", input.existingId)
        .select("id"),
    );
    return;
  }

  unwrap(
    await supabase
      .from("reviews")
      .insert({
        listing_id: input.listingId,
        author_id: userId,
        author_name: "",
        rating: input.rating,
        comment,
      })
      .select("id")
      .single(),
  );
}

export async function deleteReview(id: string): Promise<void> {
  assertConfigured();
  unwrap(await supabase.from("reviews").delete().eq("id", id).select("id"));
}

/**
 * Nhận các hồ sơ người thuê mà chủ trọ đã ghi đúng email của tài khoản này.
 *
 * Trả về số hồ sơ vừa nối. 0 nghĩa là chưa chủ trọ nào ghi email này — không
 * phải lỗi, chỉ là chưa có gì để nhận.
 */
export async function claimTenancy(): Promise<number> {
  await requireUserId();
  const { data, error } = await supabase.rpc("claim_tenancy");
  if (error) throw new Error(error.message);
  return data ?? 0;
}
