-- Quản trị viên, kiểm duyệt tin đăng, và đánh giá chỉ từ người đã thuê.
--
-- Dùng cho project ĐÃ chạy schema.sql trước ngày 24/08/2026. Project mới thì
-- không cần file này — schema.sql đã có sẵn toàn bộ nội dung dưới đây.
--
-- Chạy trước: 2026-08-23-distance-verification.sql rồi
-- 2026-08-23-security-integrity.sql, nếu project chưa chạy hai file đó.
--
-- ⚠️  CHẠY LÀM HAI LƯỢT. Bước 1 thêm giá trị mới vào enum `app_role`;
-- Postgres không cho dùng một giá trị enum trong cùng transaction vừa thêm
-- nó, mà SQL Editor gộp cả file thành một transaction ngầm. Bôi đen riêng
-- khối "BƯỚC 1", Run, rồi mới bôi đen "BƯỚC 2" và Run.
--
-- Không xoá dữ liệu, chạy lại nhiều lần vẫn an toàn.


-- ═══════════════════════════════ BƯỚC 1 ═══════════════════════════════
-- Bôi đen đúng một dòng dưới đây và Run.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';


-- ═══════════════════════════════ BƯỚC 2 ═══════════════════════════════
-- Bôi đen từ đây tới hết file và Run.

BEGIN;

-- Quản trị viên, kiểm duyệt tin đăng, và đánh giá chỉ từ người đã thuê.
--
-- Ba việc này đi cùng nhau vì cùng trả lời một câu hỏi: nội dung công khai
-- của app đến từ đâu và ai chịu trách nhiệm cho nó. Trước khối này, chủ trọ
-- tự bật `is_published` là tin lên thẳng trang Khám phá, và bất kỳ tài khoản
-- nào cũng viết được đánh giá cho bất kỳ phòng nào.
--
-- `verification` (giấy tờ chủ trọ) và `moderation_status` (nội dung tin) cố ý
-- tách làm hai: một tin đúng sự thật vẫn có thể chưa nộp giấy tờ, và một chủ
-- trọ đã xác thực vẫn có thể đăng một tin sai giá. Gộp lại thành một cột thì
-- quản trị viên không nói được "tin ổn, giấy tờ chưa" — đúng trạng thái phổ
-- biến nhất của một tin mới.

-- ---------------------------------------------------------------- is_admin

-- Cùng lý do với `has_role`: policy cần hỏi vai trò mà không được cấp quyền
-- đọc cả bảng `user_roles`. Không nhận tham số vì quản trị viên chỉ tự xét
-- mình — không màn hình nào hỏi "người khác có phải admin không".
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
-- service_role cũng phải gọi được: hai trigger kiểm duyệt bên dưới hỏi hàm
-- này, và script seed ghi vào `listings` bằng chính vai trò đó. Thiếu quyền ở
-- đây thì lệnh insert của seed đổ vì trigger chứ không phải vì dữ liệu.
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- Vai trò 'admin' không bao giờ đến từ metadata lúc đăng ký:
-- `raw_user_meta_data` do chính người đăng ký gửi lên, nhận nó ở đây là để ai
-- cũng tự phong mình làm quản trị viên. Cấp quyền admin chỉ bằng một câu
-- INSERT chạy tay bằng service_role — xem README.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  BEGIN
    _role := (NEW.raw_user_meta_data->>'role')::public.app_role;
  EXCEPTION WHEN invalid_text_representation THEN
    _role := 'tenant';
  END;

  IF _role IS NULL OR _role = 'admin' THEN
    _role := 'tenant';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- -------------------------------------------------- cột kiểm duyệt tin đăng

-- Cột thêm với DEFAULT 'approved' rồi mới đổi default sang 'pending': tin
-- đang chạy trên project cũ phải giữ nguyên trạng thái hiển thị, còn tin tạo
-- từ sau khối này thì vào hàng chờ. Backfill bằng UPDATE không làm được việc
-- đó — trigger bên dưới chặn mọi lần đổi cột kiểm duyệt không phải của admin,
-- và câu UPDATE chạy trong SQL Editor không mang JWT nào cả.
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS moderation_note   TEXT,
  ADD COLUMN IF NOT EXISTS moderated_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderated_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.listings ALTER COLUMN moderation_status SET DEFAULT 'pending';

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_moderation_check;
ALTER TABLE public.listings
  ADD CONSTRAINT listings_moderation_check
  CHECK (moderation_status IN ('pending', 'approved', 'rejected'));

-- Từ chối mà không nói lý do thì chủ trọ chỉ thấy tin biến mất. Ràng buộc đặt
-- ở database chứ không ở màn hình vì màn hình không phải nơi duy nhất ghi.
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_moderation_note_check;
ALTER TABLE public.listings
  ADD CONSTRAINT listings_moderation_note_check
  CHECK (
    moderation_status <> 'rejected'
    OR length(btrim(COALESCE(moderation_note, ''))) > 0
  );

CREATE INDEX IF NOT EXISTS listings_pending_idx
  ON public.listings (created_at DESC) WHERE moderation_status = 'pending';

-- Chủ trọ sửa được tin của mình, nên bốn cột kiểm duyệt phải được trigger giữ
-- lại y như `verification` — không thì một lệnh update là tin tự duyệt. Đổi
-- nội dung công khai của tin đã duyệt sẽ đẩy tin về hàng chờ: được duyệt một
-- lần rồi thay sạch giá và địa chỉ là cách dễ nhất để lách kiểm duyệt.
CREATE OR REPLACE FUNCTION public.guard_listing_moderation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  content_changed BOOLEAN;
BEGIN
  IF auth.role() = 'service_role' OR public.is_admin() THEN
    IF TG_OP = 'UPDATE' AND NEW.moderation_status IS DISTINCT FROM OLD.moderation_status THEN
      NEW.moderated_at := now();
      NEW.moderated_by := auth.uid();
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.moderation_status := 'pending';
    NEW.moderation_note   := NULL;
    NEW.moderated_at      := NULL;
    NEW.moderated_by      := NULL;
    RETURN NEW;
  END IF;

  NEW.moderation_status := OLD.moderation_status;
  NEW.moderation_note   := OLD.moderation_note;
  NEW.moderated_at      := OLD.moderated_at;
  NEW.moderated_by      := OLD.moderated_by;

  content_changed := (
    NEW.public_title          IS DISTINCT FROM OLD.public_title
    OR NEW.public_description IS DISTINCT FROM OLD.public_description
    OR NEW.address            IS DISTINCT FROM OLD.address
    OR NEW.area               IS DISTINCT FROM OLD.area
    OR NEW.district           IS DISTINCT FROM OLD.district
    OR NEW.amenities          IS DISTINCT FROM OLD.amenities
    OR NEW.price              IS DISTINCT FROM OLD.price
    OR NEW.size               IS DISTINCT FROM OLD.size
    OR NEW.lat                IS DISTINCT FROM OLD.lat
    OR NEW.lng                IS DISTINCT FROM OLD.lng
    OR NEW.school_name        IS DISTINCT FROM OLD.school_name
    OR NEW.distance_to_school IS DISTINCT FROM OLD.distance_to_school
    OR (NEW.is_published AND NOT OLD.is_published)
  );

  IF content_changed THEN
    NEW.moderation_status := 'pending';
    NEW.moderation_note   := NULL;
    NEW.moderated_at      := NULL;
    NEW.moderated_by      := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listings_guard_moderation ON public.listings;
CREATE TRIGGER listings_guard_moderation
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.guard_listing_moderation();
REVOKE EXECUTE ON FUNCTION public.guard_listing_moderation() FROM PUBLIC, anon, authenticated;

-- Quản trị viên duyệt được huy hiệu "Đã xác thực"; trước đây chỉ service_role
-- làm được, nghĩa là phải mở SQL Editor cho từng tin một.
CREATE OR REPLACE FUNCTION public.guard_listing_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.is_admin() THEN
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
REVOKE EXECUTE ON FUNCTION public.guard_listing_verification() FROM PUBLIC, anon, authenticated;

-- `tenants` là sổ tay của chủ trọ, không phải tài khoản. Muốn biết một người
-- dùng có thật sự từng thuê phòng hay không thì phải nối hai thứ đó lại. Cột
-- này phải có trước khi tạo `admin_reviews` — view đó join qua `t.user_id`.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS tenants_user_idx
  ON public.tenants (user_id) WHERE user_id IS NOT NULL;

-- ----------------------------------------------------------- RLS cho admin

-- Đọc mọi tin, kể cả tin chưa đăng: hàng chờ duyệt phần lớn là tin chưa công
-- khai. Ghi thì chỉ UPDATE — gỡ tin là đặt `is_published = false` chứ không
-- DELETE, để chủ trọ không mất hợp đồng và hoá đơn gắn với phòng đó.
DROP POLICY IF EXISTS "Admins read every listing" ON public.listings;
CREATE POLICY "Admins read every listing" ON public.listings
  FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "Admins moderate listings" ON public.listings;
CREATE POLICY "Admins moderate listings" ON public.listings
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Hàng chờ hiện tên và số điện thoại chủ trọ để quản trị viên gọi đối chiếu.
DROP POLICY IF EXISTS "Users and published listing owners are viewable" ON public.profiles;
CREATE POLICY "Users and published listing owners are viewable" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.owner_id = profiles.id AND l.is_published
    )
  );

-- -------------------------------------------------- view riêng cho quản trị

-- Cùng khuôn với `public_listings` và `owner_listings`: bảng gốc không cấp
-- quyền đọc đủ cột cho `authenticated`, nên mọi màn hình đọc qua một view có
-- sẵn điều kiện lọc bên trong. Ở đây điều kiện là `is_admin()`, nên tài khoản
-- thường select view này ra 0 dòng thay vì gặp lỗi quyền.
DROP VIEW IF EXISTS public.admin_listings;
CREATE VIEW public.admin_listings AS
SELECT
  l.id,
  l.owner_id,
  l.title,
  l.public_title,
  l.public_description,
  l.price,
  l.size,
  l.address,
  l.area,
  l.district,
  l.amenities,
  l.lat,
  l.lng,
  l.status,
  l.school_name,
  l.distance_to_school,
  l.verification,
  l.is_published,
  l.moderation_status,
  l.moderation_note,
  l.moderated_at,
  l.created_at,
  l.updated_at,
  p.full_name AS owner_name,
  p.phone     AS owner_phone,
  COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object('storage_path', i.storage_path, 'sort_order', i.sort_order)
      ORDER BY i.sort_order
    )
    FROM public.listing_images i
    WHERE i.listing_id = l.id
  ), '[]'::jsonb) AS images,
  (SELECT count(*) FROM public.reviews r WHERE r.listing_id = l.id) AS review_count
FROM public.listings l
LEFT JOIN public.profiles p ON p.id = l.owner_id
WHERE public.is_admin();

-- `from_tenant` phân biệt đánh giá viết sau khối này (bắt buộc có hợp đồng)
-- với đánh giá cũ hoặc dữ liệu mẫu nạp bằng service_role — quản trị viên cần
-- thấy khác biệt đó trước khi quyết định gỡ.
DROP VIEW IF EXISTS public.admin_reviews;
CREATE VIEW public.admin_reviews AS
SELECT
  r.id,
  r.listing_id,
  r.author_id,
  r.author_name,
  r.rating,
  r.comment,
  r.created_at,
  l.owner_id,
  COALESCE(l.public_title, l.title) AS listing_title,
  EXISTS (
    SELECT 1
    FROM public.leases le
    JOIN public.tenants t ON t.id = le.tenant_id
    WHERE le.listing_id = r.listing_id AND t.user_id = r.author_id
  ) AS from_tenant
FROM public.reviews r
JOIN public.listings l ON l.id = r.listing_id
WHERE public.is_admin();

GRANT SELECT ON public.admin_listings TO authenticated;
GRANT SELECT ON public.admin_reviews  TO authenticated;

-- Tin chỉ ra trang công khai khi chủ trọ bật đăng VÀ quản trị viên đã duyệt.
DROP VIEW IF EXISTS public.public_listings;
CREATE VIEW public.public_listings AS
SELECT
  l.id,
  l.public_title,
  l.public_description,
  l.price,
  l.size,
  l.address,
  l.area,
  l.district,
  l.amenities,
  l.lat,
  l.lng,
  l.status,
  l.school_name,
  l.distance_to_school,
  l.verification,
  l.created_at,
  CASE WHEN p.id IS NULL THEN NULL ELSE jsonb_build_object(
    'full_name', p.full_name,
    'phone', p.phone
  ) END AS owner,
  COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object('storage_path', i.storage_path, 'sort_order', i.sort_order)
      ORDER BY i.sort_order
    )
    FROM public.listing_images i
    WHERE i.listing_id = l.id
  ), '[]'::jsonb) AS images,
  COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'author_id', r.author_id,
        'author_name', r.author_name,
        'rating', r.rating,
        'comment', r.comment,
        'created_at', r.created_at
      )
      ORDER BY r.created_at DESC
    )
    FROM public.reviews r
    WHERE r.listing_id = l.id
  ), '[]'::jsonb) AS reviews
FROM public.listings l
LEFT JOIN public.profiles p ON p.id = l.owner_id
WHERE l.is_published AND l.moderation_status = 'approved';

GRANT SELECT ON public.public_listings TO anon, authenticated;

-- ---------------------------------------- nối hồ sơ người thuê với tài khoản

-- Chủ trọ KHÔNG được tự trỏ hồ sơ người thuê vào một tài khoản bất kỳ: làm
-- được thế là tự cấp quyền đánh giá cho tài khoản phụ của chính mình. Họ chỉ
-- điền `email`, còn việc nối là do người thuê tự bấm — xem `claim_tenancy`.
-- Gỡ nối (đặt về NULL) thì vẫn cho, để sửa lại khi điền nhầm email.
CREATE OR REPLACE FUNCTION public.guard_tenant_account_link()
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
    NEW.user_id := NULL;
  ELSIF NEW.user_id IS NOT NULL THEN
    NEW.user_id := OLD.user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenants_guard_account_link ON public.tenants;
CREATE TRIGGER tenants_guard_account_link
  BEFORE INSERT OR UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.guard_tenant_account_link();
REVOKE EXECUTE ON FUNCTION public.guard_tenant_account_link() FROM PUBLIC, anon, authenticated;

-- Người thuê tự nhận hồ sơ của mình: nối mọi hồ sơ mà chủ trọ đã điền đúng
-- email của tài khoản đang đăng nhập. Hai đầu đều phải chủ động — chủ trọ
-- điền email, người thuê bấm nhận — nên không bên nào tự dựng được một người
-- thuê giả. Chỉ nhận hồ sơ chưa có chủ (`user_id IS NULL`) để không ai cướp
-- được liên kết đã có.
CREATE OR REPLACE FUNCTION public.claim_tenancy()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email  TEXT;
  _linked INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in first' USING ERRCODE = '42501';
  END IF;

  SELECT lower(btrim(email)) INTO _email FROM auth.users WHERE id = auth.uid();
  IF _email IS NULL OR _email = '' THEN
    RETURN 0;
  END IF;

  UPDATE public.tenants
  SET user_id = auth.uid()
  WHERE user_id IS NULL AND lower(btrim(email)) = _email;

  GET DIAGNOSTICS _linked = ROW_COUNT;
  RETURN _linked;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.claim_tenancy() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_tenancy() TO authenticated;

-- -------------------------------------------- đánh giá chỉ từ người đã thuê

-- Đủ điều kiện = có hợp đồng trên chính phòng đó, còn hiệu lực hay đã kết
-- thúc đều được: người thuê xong rồi chuyển đi là người có nhiều thứ đáng nói
-- nhất về căn phòng.
CREATE OR REPLACE FUNCTION public.can_review_listing(_listing_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.leases le
    JOIN public.tenants t ON t.id = le.tenant_id
    WHERE le.listing_id = _listing_id
      AND t.user_id = auth.uid()
  )
$$;
REVOKE EXECUTE ON FUNCTION public.can_review_listing(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_review_listing(UUID) TO authenticated;

-- Một người một đánh giá cho mỗi phòng. `author_id IS NOT NULL` chừa lại các
-- dòng dữ liệu mẫu nạp bằng service_role, vốn không gắn với tài khoản nào.
CREATE UNIQUE INDEX IF NOT EXISTS reviews_one_per_author
  ON public.reviews (listing_id, author_id) WHERE author_id IS NOT NULL;

-- Tên hiển thị lấy từ hồ sơ chứ không nhận từ client: `author_name` là cột
-- người khác đọc, để client tự điền là mở đường cho việc mạo danh chủ trọ.
CREATE OR REPLACE FUNCTION public.set_review_author()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Sửa đánh giá chỉ được đổi số sao và nội dung.
  IF TG_OP = 'UPDATE' THEN
    NEW.id          := OLD.id;
    NEW.listing_id  := OLD.listing_id;
    NEW.author_id   := OLD.author_id;
    NEW.author_name := OLD.author_name;
    NEW.created_at  := OLD.created_at;
    RETURN NEW;
  END IF;

  NEW.author_id := auth.uid();
  SELECT COALESCE(NULLIF(btrim(p.full_name), ''), 'Người thuê')
  INTO NEW.author_name
  FROM public.profiles p
  WHERE p.id = auth.uid();
  IF NEW.author_name IS NULL THEN
    NEW.author_name := 'Người thuê';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_set_author ON public.reviews;
CREATE TRIGGER reviews_set_author
  BEFORE INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_review_author();
REVOKE EXECUTE ON FUNCTION public.set_review_author() FROM PUBLIC, anon, authenticated;

GRANT UPDATE, DELETE ON public.reviews TO authenticated;

DROP POLICY IF EXISTS "Signed-in users write their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Tenants review rooms they rented" ON public.reviews;
CREATE POLICY "Tenants review rooms they rented" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND public.can_review_listing(listing_id));

DROP POLICY IF EXISTS "Authors edit their own review" ON public.reviews;
CREATE POLICY "Authors edit their own review" ON public.reviews
  FOR UPDATE TO authenticated
  USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors delete their own review" ON public.reviews;
CREATE POLICY "Authors delete their own review" ON public.reviews
  FOR DELETE TO authenticated USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Admins read every review" ON public.reviews;
CREATE POLICY "Admins read every review" ON public.reviews
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins remove any review" ON public.reviews;
CREATE POLICY "Admins remove any review" ON public.reviews
  FOR DELETE TO authenticated USING (public.is_admin());

NOTIFY pgrst, 'reload schema';

COMMIT;
