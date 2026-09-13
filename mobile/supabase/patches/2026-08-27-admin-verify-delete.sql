-- Quản trị viên xoá hẳn một tin đăng.
--
-- Dùng cho project ĐÃ chạy schema.sql trước ngày 27/08/2026. Project mới thì
-- không cần file này — schema.sql đã có sẵn nội dung dưới đây.
--
-- Chạy sau: 2026-08-24-admin-moderation.sql (cần hàm `is_admin()`).
--
-- Không xoá dữ liệu, chạy lại nhiều lần vẫn an toàn. Chạy một lượt.

BEGIN;

-- Duyệt và xác minh là hai mốc nối nhau, không phải một. Duyệt là "tin đọc
-- được, cho hiện với người tìm trọ"; xác minh là "đã kiểm phòng có thật và
-- đúng như tin". Tin vừa duyệt xong luôn nằm giữa hai mốc đó — đang hiển thị
-- nhưng chưa ai đi kiểm — nên bảng quản trị phải gom riêng nhóm này thay vì
-- chỉ đợi chủ trọ bấm gửi yêu cầu xác thực. Việc gom là chuyện của màn hình;
-- database chỉ cần cấp thêm một quyền: xoá.
--
-- Xoá khác gỡ, và hai việc phải cùng tồn tại. Gỡ (`is_published = false`)
-- dành cho tin sai nội dung: phòng có thật, chủ trọ sửa rồi đăng lại, sổ sách
-- của họ phải còn nguyên. Xoá dành cho phòng không tồn tại — lúc đó hợp đồng,
-- chỉ số và hoá đơn treo trên một phòng ma cũng không còn nghĩa gì, và các
-- khoá ngoại ON DELETE CASCADE dọn chúng theo. Vì đây là thao tác không lùi
-- lại được, màn hình hỏi lại một lần trước khi gọi.
DROP POLICY IF EXISTS "Admins delete any listing" ON public.listings;
CREATE POLICY "Admins delete any listing" ON public.listings
  FOR DELETE TO authenticated USING (public.is_admin());

NOTIFY pgrst, 'reload schema';

COMMIT;
