-- Bổ sung "khoảng cách tới trường" và "mức độ xác thực" cho bảng listings.
--
-- Dùng cho project ĐÃ chạy schema.sql trước ngày 23/08/2026. Project mới thì
-- không cần file này — schema.sql đã có sẵn các cột dưới đây.
--
-- Cách chạy: mở SQL Editor trên Supabase dashboard, dán hết file, Run.
-- Không xoá dữ liệu, chạy lại nhiều lần vẫn an toàn.

BEGIN;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS school_name        TEXT,
  ADD COLUMN IF NOT EXISTS distance_to_school INTEGER,
  ADD COLUMN IF NOT EXISTS verification       TEXT NOT NULL DEFAULT 'unverified';

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_verification_check;
ALTER TABLE public.listings
  ADD CONSTRAINT listings_verification_check
  CHECK (verification IN ('unverified', 'pending', 'verified'));

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_distance_check;
ALTER TABLE public.listings
  ADD CONSTRAINT listings_distance_check
  CHECK (distance_to_school IS NULL OR distance_to_school BETWEEN 0 AND 50000);

-- Chủ trọ chỉ được gửi yêu cầu xác thực ('pending'); duyệt lên 'verified' là
-- việc của quản trị viên chạy bằng service_role.
CREATE OR REPLACE FUNCTION public.guard_listing_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.verification = 'verified' THEN NEW.verification := 'pending'; END IF;
  ELSIF NEW.verification IS DISTINCT FROM OLD.verification THEN
    IF NEW.verification = 'verified' THEN NEW.verification := OLD.verification; END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listings_guard_verification ON public.listings;
CREATE TRIGGER listings_guard_verification
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.guard_listing_verification();

COMMIT;
