-- ⚠️  XOÁ SẠCH schema Roomy. Chỉ chạy khi muốn làm lại từ đầu.
--
-- Dùng khi một lần chạy migration bị lỗi giữa chừng và để lại vài bảng —
-- chạy file này rồi chạy lại `schema.sql`.
--
-- MẤT TOÀN BỘ DỮ LIỆU trong các bảng dưới đây. Tài khoản trong `auth.users`
-- KHÔNG bị xoá; nhưng `profiles` bị xoá nên hồ sơ và vai trò của họ mất theo.
-- Muốn xoá luôn tài khoản thì vào Authentication → Users trên dashboard.

BEGIN;

-- Trigger trên auth.users phải gỡ trước vì nó gọi hàm ở dưới.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Thứ tự không quan trọng nhờ CASCADE, nhưng liệt kê từ bảng phụ thuộc nhiều
-- nhất trở xuống cho dễ đọc.
DROP TABLE IF EXISTS public.bookings       CASCADE;
DROP TABLE IF EXISTS public.favorites      CASCADE;
DROP TABLE IF EXISTS public.reviews        CASCADE;
DROP TABLE IF EXISTS public.listing_images CASCADE;
DROP TABLE IF EXISTS public.invoices       CASCADE;
DROP TABLE IF EXISTS public.meter_readings CASCADE;
DROP TABLE IF EXISTS public.leases         CASCADE;
DROP TABLE IF EXISTS public.tenants        CASCADE;
DROP TABLE IF EXISTS public.listings       CASCADE;
DROP TABLE IF EXISTS public.user_roles     CASCADE;
DROP TABLE IF EXISTS public.profiles       CASCADE;

DROP VIEW IF EXISTS public.public_listings CASCADE;
DROP VIEW IF EXISTS public.owner_listings CASCADE;
DROP VIEW IF EXISTS public.admin_listings CASCADE;
DROP VIEW IF EXISTS public.admin_reviews CASCADE;

DROP FUNCTION IF EXISTS public.replace_lease(UUID, UUID, UUID, DATE, DATE, INTEGER, INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.normalize_occupied_listing() CASCADE;
DROP FUNCTION IF EXISTS public.sync_listing_status_for_listing(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.sync_listing_status_from_lease() CASCADE;
DROP FUNCTION IF EXISTS public.guard_booking_changes() CASCADE;
DROP FUNCTION IF EXISTS public.guard_lease_dates() CASCADE;
DROP FUNCTION IF EXISTS public.guard_tenancy_ownership() CASCADE;
DROP FUNCTION IF EXISTS public.profile_has_published_listing(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.can_view_listing(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_listing_owner(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_public_listing(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.guard_listing_verification() CASCADE;
DROP FUNCTION IF EXISTS public.guard_listing_moderation() CASCADE;
DROP FUNCTION IF EXISTS public.guard_tenant_account_link() CASCADE;
DROP FUNCTION IF EXISTS public.set_review_author() CASCADE;
DROP FUNCTION IF EXISTS public.claim_tenancy() CASCADE;
DROP FUNCTION IF EXISTS public.can_review_listing(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user()  CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at()   CASCADE;
DROP FUNCTION IF EXISTS public.has_role(UUID, public.app_role) CASCADE;
DROP TYPE     IF EXISTS public.app_role            CASCADE;

-- Policy trên storage.objects không thuộc bảng nào ở trên nên phải gỡ tay.
DROP POLICY IF EXISTS "Room photos are publicly readable"  ON storage.objects;
DROP POLICY IF EXISTS "Landlords upload room photos"       ON storage.objects;
DROP POLICY IF EXISTS "Landlords replace own room photos"  ON storage.objects;
DROP POLICY IF EXISTS "Landlords delete own room photos"   ON storage.objects;

-- Bucket giữ lại: xoá nó sẽ xoá luôn file đã tải lên. Bỏ comment nếu muốn.
-- DELETE FROM storage.objects WHERE bucket_id = 'room-photos';
-- DELETE FROM storage.buckets WHERE id = 'room-photos';

COMMIT;
