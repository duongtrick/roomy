-- Toàn bộ schema Roomy. Đây là nguồn duy nhất — sửa schema thì sửa ở đây.
--
-- Cách chạy: mở SQL Editor trên dashboard, dán hết file này, Run một lần.
-- Cả file nằm trong một transaction nên lỗi ở bất kỳ đâu cũng rollback sạch,
-- không để lại bảng dở dang.
--
-- Thứ tự bên trong đã đúng phụ thuộc: định danh (profiles/roles) → phòng và
-- hợp đồng → phần công khai (ảnh, đánh giá, đặt lịch, storage). Đừng chạy lẻ
-- từng khối.
--
-- Chạy trên project TRỐNG. Nếu cần làm lại: chạy reset.sql rồi chạy lại file này.

BEGIN;


-- ═══════════════════════════════════════════════════
-- 20260822000100_auth_profiles_roles.sql
-- ═══════════════════════════════════════════════════

-- Identity: profiles, roles, and the signup trigger that fills both.
--
-- Roles live in their own table rather than a column on `profiles` because a
-- profile is user-writable — putting the role there would let anyone promote
-- themselves to landlord. `has_role()` is SECURITY DEFINER so RLS policies can
-- consult it without granting the caller read access to every role row.
--
-- 'admin' is assigned by hand with service_role and never by the signup
-- trigger; see the moderation block at the end of this file.

CREATE TYPE public.app_role AS ENUM ('landlord', 'tenant', 'admin');

CREATE TABLE public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT,
  phone      TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Readable by everyone: the room detail screen shows the landlord's name and
-- phone to visitors who are not signed in.
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE TABLE public.user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
-- No INSERT/UPDATE grant: roles are assigned by the signup trigger only.
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Creates the profile and role row for a new account, reading `full_name`,
-- `phone` and `role` out of the metadata the client passes to `signUp`.
-- Anything unrecognised falls back to 'tenant' — the least privileged role.
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

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(_role, 'tenant'))
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ═══════════════════════════════════════════════════
-- 20260822000200_listings_and_tenancy.sql
-- ═══════════════════════════════════════════════════

-- Rooms and everything hanging off them: who rents one, on what contract,
-- what their meters read, and what they owe.
--
-- Every table below is owner-scoped. `owner_id` is denormalised onto the child
-- tables rather than reached through a join because RLS runs per row on every
-- statement, and a policy that joins back to `listings` costs a subquery each
-- time. The trade is that a room changing hands would need a cascading update,
-- which this product does not support anyway.

CREATE TABLE public.listings (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Internal: what the landlord sees in the dashboard.
  title              TEXT NOT NULL,
  description        TEXT,
  status             TEXT NOT NULL DEFAULT 'available',
  electricity_rate   INTEGER NOT NULL DEFAULT 3500,
  water_rate         INTEGER NOT NULL DEFAULT 25000,

  -- Public: what a visitor browsing the app sees.
  is_published       BOOLEAN NOT NULL DEFAULT false,
  public_title       TEXT,
  public_description TEXT,
  price              INTEGER NOT NULL,
  size               INTEGER,
  address            TEXT,
  area               TEXT,
  district           TEXT,
  amenities          TEXT[] NOT NULL DEFAULT '{}',
  lat                DOUBLE PRECISION,
  lng                DOUBLE PRECISION,

  -- Khoảng cách tới trường: mét, đo theo đường đi chứ không phải đường chim
  -- bay. Lưu số nguyên mét thay vì km để lọc "dưới 500 m" không phải so sánh
  -- số thực; màn hình tự đổi sang km khi > 1000.
  school_name        TEXT,
  distance_to_school INTEGER,

  -- Mức độ xác thực của tin đăng. Chỉ quản trị viên (service_role) mới đặt
  -- được 'verified' — xem trigger listings_guard_verification bên dưới.
  verification       TEXT NOT NULL DEFAULT 'unverified',

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT listings_status_check
    CHECK (status IN ('available', 'occupied', 'maintenance')),
  CONSTRAINT listings_verification_check
    CHECK (verification IN ('unverified', 'pending', 'verified')),
  CONSTRAINT listings_distance_check
    CHECK (distance_to_school IS NULL OR distance_to_school BETWEEN 0 AND 50000),
  -- A published room has to be locatable and nameable, or the browse and map
  -- screens render a card with holes in it.
  CONSTRAINT listings_publishable
    CHECK (
      NOT is_published
      OR (public_title IS NOT NULL AND address IS NOT NULL
          AND lat IS NOT NULL AND lng IS NOT NULL)
    ),
  CONSTRAINT listings_price_check CHECK (price > 0),
  CONSTRAINT listings_size_check CHECK (size IS NULL OR size > 0),
  CONSTRAINT listings_rates_check CHECK (electricity_rate >= 0 AND water_rate >= 0),
  CONSTRAINT listings_coordinates_check CHECK (
    (lat IS NULL AND lng IS NULL)
    OR (lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180)
  ),
  CONSTRAINT listings_public_text_check CHECK (
    NOT is_published
    OR (length(btrim(public_title)) > 0 AND length(btrim(address)) > 0)
  )
);
CREATE INDEX listings_owner_idx ON public.listings (owner_id);
CREATE INDEX listings_published_idx ON public.listings (is_published) WHERE is_published;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT SELECT ON public.listings TO anon;
GRANT ALL ON public.listings TO service_role;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- `description` holds the landlord's private notes, so unpublished rooms must
-- not be selectable by anyone but their owner.
CREATE POLICY "Published listings are public" ON public.listings
  FOR SELECT USING (is_published OR auth.uid() = owner_id);
CREATE POLICY "Landlords insert own listings" ON public.listings
  FOR INSERT WITH CHECK (auth.uid() = owner_id AND public.has_role(auth.uid(), 'landlord'));
CREATE POLICY "Landlords update own listings" ON public.listings
  FOR UPDATE USING (auth.uid() = owner_id AND public.has_role(auth.uid(), 'landlord'))
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Landlords delete own listings" ON public.listings
  FOR DELETE USING (auth.uid() = owner_id AND public.has_role(auth.uid(), 'landlord'));

CREATE TRIGGER listings_set_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Chủ trọ được sửa tin của mình, nên nếu không chặn thì họ tự đặt
-- verification = 'verified' bằng một lệnh update và huy hiệu "Đã xác thực"
-- mất hết ý nghĩa. Chủ trọ chỉ được gửi yêu cầu ('pending'); duyệt thành
-- 'verified' là việc của quản trị viên chạy bằng service_role.
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
    -- Rút yêu cầu về 'unverified' hoặc gửi yêu cầu 'pending' thì được;
    -- tự nâng lên 'verified' thì giữ nguyên giá trị cũ.
    IF NEW.verification = 'verified' THEN NEW.verification := OLD.verification; END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER listings_guard_verification
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.guard_listing_verification();

-- ---------------------------------------------------------------- tenants

CREATE TABLE public.tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  email         TEXT,
  id_number     TEXT,
  move_in_date  DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX tenants_owner_idx ON public.tenants (owner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords manage own tenants" ON public.tenants
  FOR ALL USING (auth.uid() = owner_id AND public.has_role(auth.uid(), 'landlord'))
  WITH CHECK (auth.uid() = owner_id AND public.has_role(auth.uid(), 'landlord'));

CREATE TRIGGER tenants_set_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------- leases

CREATE TABLE public.leases (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id    UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  start_date    DATE NOT NULL,
  end_date      DATE,
  monthly_rent  INTEGER NOT NULL,
  deposit       INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'active',
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT leases_status_check CHECK (status IN ('active', 'ended')),
  CONSTRAINT leases_dates_check CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT leases_amounts_check CHECK (monthly_rent > 0 AND deposit >= 0)
);
CREATE INDEX leases_owner_idx ON public.leases (owner_id);
CREATE INDEX leases_listing_idx ON public.leases (listing_id);
-- One room cannot be under two live contracts at once.
CREATE UNIQUE INDEX leases_one_active_per_listing
  ON public.leases (listing_id) WHERE status = 'active';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leases TO authenticated;
GRANT ALL ON public.leases TO service_role;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords manage own leases" ON public.leases
  FOR ALL USING (auth.uid() = owner_id AND public.has_role(auth.uid(), 'landlord'))
  WITH CHECK (auth.uid() = owner_id AND public.has_role(auth.uid(), 'landlord'));

CREATE TRIGGER leases_set_updated_at
  BEFORE UPDATE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------- meter readings

CREATE TABLE public.meter_readings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id        UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  period            TEXT NOT NULL,
  electricity_start INTEGER NOT NULL DEFAULT 0,
  electricity_end   INTEGER NOT NULL DEFAULT 0,
  water_start       INTEGER NOT NULL DEFAULT 0,
  water_end         INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT meter_readings_period_check CHECK (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  CONSTRAINT meter_readings_amounts_check CHECK (
    electricity_start >= 0 AND electricity_end >= electricity_start
    AND water_start >= 0 AND water_end >= water_start
  ),
  UNIQUE (listing_id, period)
);
CREATE INDEX meter_readings_owner_idx ON public.meter_readings (owner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meter_readings TO authenticated;
GRANT ALL ON public.meter_readings TO service_role;
ALTER TABLE public.meter_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords manage own meter readings" ON public.meter_readings
  FOR ALL USING (auth.uid() = owner_id AND public.has_role(auth.uid(), 'landlord'))
  WITH CHECK (auth.uid() = owner_id AND public.has_role(auth.uid(), 'landlord'));

CREATE TRIGGER meter_readings_set_updated_at
  BEFORE UPDATE ON public.meter_readings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------- invoices

CREATE TABLE public.invoices (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lease_id           UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  listing_id         UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  tenant_id          UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  period             TEXT NOT NULL,
  rent_amount        INTEGER NOT NULL DEFAULT 0,
  electricity_kwh    INTEGER NOT NULL DEFAULT 0,
  electricity_amount INTEGER NOT NULL DEFAULT 0,
  water_m3           INTEGER NOT NULL DEFAULT 0,
  water_amount       INTEGER NOT NULL DEFAULT 0,
  other_amount       INTEGER NOT NULL DEFAULT 0,
  total_amount       INTEGER NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'unpaid',
  due_date           DATE,
  paid_at            TIMESTAMPTZ,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT invoices_status_check CHECK (status IN ('unpaid', 'paid')),
  CONSTRAINT invoices_period_check CHECK (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  -- `paid_at` and `status` are set from two different screens; keeping them
  -- consistent in the database means a report can trust either one.
  CONSTRAINT invoices_paid_at_check
    CHECK ((status = 'paid') = (paid_at IS NOT NULL)),
  CONSTRAINT invoices_amounts_check CHECK (
    rent_amount >= 0 AND electricity_kwh >= 0 AND electricity_amount >= 0
    AND water_m3 >= 0 AND water_amount >= 0 AND other_amount >= 0
    AND total_amount >= 0
  ),
  CONSTRAINT invoices_total_check CHECK (
    total_amount = rent_amount + electricity_amount + water_amount + other_amount
  ),
  UNIQUE (listing_id, period)
);
CREATE INDEX invoices_owner_idx ON public.invoices (owner_id);
CREATE INDEX invoices_unpaid_idx ON public.invoices (owner_id) WHERE status = 'unpaid';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords manage own invoices" ON public.invoices
  FOR ALL USING (auth.uid() = owner_id AND public.has_role(auth.uid(), 'landlord'))
  WITH CHECK (auth.uid() = owner_id AND public.has_role(auth.uid(), 'landlord'));

CREATE TRIGGER invoices_set_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ═══════════════════════════════════════════════════
-- 20260822000300_public_catalogue.sql
-- ═══════════════════════════════════════════════════

-- The public side of the app: photos, reviews, saved rooms, viewing requests.

-- ---------------------------------------------------------- listing photos
--
-- Photos live in the `room-photos` storage bucket; this table only records
-- which file belongs to which room and in what order. `sort_order = 0` is the
-- cover shown on cards.

CREATE TABLE public.listing_images (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (listing_id, sort_order)
);
CREATE INDEX listing_images_listing_idx ON public.listing_images (listing_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_images TO authenticated;
GRANT SELECT ON public.listing_images TO anon;
GRANT ALL ON public.listing_images TO service_role;
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Listing images follow their listing" ON public.listing_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_images.listing_id
        AND (l.is_published OR l.owner_id = auth.uid())
    )
  );
CREATE POLICY "Landlords manage own listing images" ON public.listing_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_images.listing_id AND l.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_images.listing_id AND l.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------- reviews

CREATE TABLE public.reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  -- Null for rows carried over from the seed data, which predate accounts.
  author_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  rating      SMALLINT NOT NULL,
  comment     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT reviews_rating_check CHECK (rating BETWEEN 1 AND 5)
);
CREATE INDEX reviews_listing_idx ON public.reviews (listing_id, created_at DESC);

GRANT SELECT, INSERT ON public.reviews TO authenticated;
GRANT SELECT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews of published listings are public" ON public.reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = reviews.listing_id
        AND (l.is_published OR l.owner_id = auth.uid())
    )
  );
CREATE POLICY "Signed-in users write their own reviews" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- -------------------------------------------------------------- favourites

CREATE TABLE public.favorites (
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);

GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own favorites" ON public.favorites
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- --------------------------------------------------------------- bookings
--
-- Viewing requests. Signing in is required: an anonymous INSERT would mean
-- granting `anon` write access to a table landlords read, which is an open
-- door for spam.

CREATE TABLE public.bookings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  view_date  DATE NOT NULL,
  view_time  TEXT NOT NULL,
  note       TEXT,
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT bookings_status_check
    CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  CONSTRAINT bookings_time_check CHECK (
    view_time IN ('08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00')
  )
);
CREATE INDEX bookings_user_idx ON public.bookings (user_id, created_at DESC);
CREATE INDEX bookings_listing_idx ON public.bookings (listing_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Visible to the person who asked and to the landlord who has to answer.
CREATE POLICY "Requester and landlord can read bookings" ON public.bookings
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = bookings.listing_id AND l.owner_id = auth.uid()
    )
  );
CREATE POLICY "Users create own bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Requester and landlord can update bookings" ON public.bookings
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = bookings.listing_id AND l.owner_id = auth.uid()
    )
  );
CREATE POLICY "Users delete own bookings" ON public.bookings
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER bookings_set_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------- storage

INSERT INTO storage.buckets (id, name, public)
VALUES ('room-photos', 'room-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Room photos are publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'room-photos');
CREATE POLICY "Landlords upload room photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'room-photos' AND public.has_role(auth.uid(), 'landlord'));
CREATE POLICY "Landlords replace own room photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'room-photos' AND owner = auth.uid());
CREATE POLICY "Landlords delete own room photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'room-photos' AND owner = auth.uid());


-- ═══════════════════════════════════════════════════
-- Security and integrity hardening
-- ═══════════════════════════════════════════════════

-- A profile is not a public directory. Only the current user and the owner of
-- a published listing may expose profile fields such as a phone number.
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users and published listing owners are viewable" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.owner_id = profiles.id AND l.is_published
    )
  );

-- Public clients must use the projection below. The base table still has a
-- private description and internal utility rates, so it is never exposed to
-- anon or to an authenticated tenant. Authenticated users get only enough
-- columns to resolve a booking's public room title; landlords read their own
-- full rows through owner_listings.
DROP POLICY IF EXISTS "Published listings are public" ON public.listings;
CREATE POLICY "Published listing titles are readable" ON public.listings
  FOR SELECT TO authenticated
  USING (is_published OR auth.uid() = owner_id);
CREATE POLICY "Published listings are readable by anon" ON public.listings
  FOR SELECT TO anon
  USING (is_published);

REVOKE SELECT ON public.listings FROM anon, authenticated;
GRANT SELECT (id, public_title, title) ON public.listings TO authenticated;

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
WHERE l.is_published;

DROP VIEW IF EXISTS public.owner_listings;
CREATE VIEW public.owner_listings AS
SELECT l.*
FROM public.listings l
WHERE l.owner_id = auth.uid();

GRANT SELECT ON public.public_listings TO anon, authenticated;
GRANT SELECT ON public.owner_listings TO authenticated;

-- Child records must belong to the same landlord as both the listing and the
-- tenant they reference. RLS alone only checked the denormalised owner_id,
-- which allowed a landlord to reserve another landlord's invoice/lease key.
CREATE OR REPLACE FUNCTION public.guard_tenancy_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = NEW.listing_id AND l.owner_id = NEW.owner_id
  ) THEN
    RAISE EXCEPTION 'Listing does not belong to owner' USING ERRCODE = '42501';
  END IF;

  -- Cùng lý do với nhánh lease_id bên dưới: `meter_readings` không có cột
  -- `tenant_id`, nên điều kiện bảng phải là một khối IF riêng, không gộp
  -- bằng AND chung biểu thức với NEW.tenant_id.
  IF TG_TABLE_NAME IN ('leases', 'invoices') THEN
    IF NEW.tenant_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.tenants t
         WHERE t.id = NEW.tenant_id AND t.owner_id = NEW.owner_id
       ) THEN
      RAISE EXCEPTION 'Tenant does not belong to owner' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- `NEW.lease_id` chỉ tồn tại trên bảng `invoices` — nhánh này phải nằm
  -- trong một khối IF riêng (không gộp `TG_TABLE_NAME = 'invoices'` và
  -- `NEW.lease_id ...` bằng AND trong cùng một biểu thức). NEW ở đây là
  -- RECORD dùng chung cho cả ba bảng, nên PL/pgSQL vẫn cố phân giải tên cột
  -- `lease_id` theo kiểu dòng thực tế của bảng đang kích hoạt trigger — nếu
  -- gộp chung, INSERT vào `leases`/`meter_readings` (không có cột này) sẽ
  -- luôn báo lỗi "record NEW has no field lease_id" dù nhánh đó lẽ ra không
  -- chạy tới.
  IF TG_TABLE_NAME = 'invoices' THEN
    IF NEW.lease_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.leases le
         WHERE le.id = NEW.lease_id
           AND le.owner_id = NEW.owner_id
           AND le.listing_id = NEW.listing_id
           AND le.tenant_id = NEW.tenant_id
       ) THEN
      RAISE EXCEPTION 'Lease does not match invoice owner, listing and tenant' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leases_guard_ownership ON public.leases;
CREATE TRIGGER leases_guard_ownership
  BEFORE INSERT OR UPDATE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION public.guard_tenancy_ownership();
DROP TRIGGER IF EXISTS meter_readings_guard_ownership ON public.meter_readings;
CREATE TRIGGER meter_readings_guard_ownership
  BEFORE INSERT OR UPDATE ON public.meter_readings
  FOR EACH ROW EXECUTE FUNCTION public.guard_tenancy_ownership();
DROP TRIGGER IF EXISTS invoices_guard_ownership ON public.invoices;
CREATE TRIGGER invoices_guard_ownership
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.guard_tenancy_ownership();

-- Keep listing.status in sync regardless of whether the change comes from the
-- room form, the contract tab, tenant deletion, or a direct API request.
CREATE OR REPLACE FUNCTION public.sync_listing_status_from_lease()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  listing UUID;
BEGIN
  listing := CASE WHEN TG_OP = 'DELETE' THEN OLD.listing_id ELSE NEW.listing_id END;
  IF EXISTS (SELECT 1 FROM public.leases WHERE listing_id = listing AND status = 'active') THEN
    UPDATE public.listings SET status = 'occupied' WHERE id = listing;
  ELSE
    UPDATE public.listings
    SET status = 'available'
    WHERE id = listing AND status = 'occupied';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS leases_sync_listing_status ON public.leases;
CREATE TRIGGER leases_sync_listing_status
  AFTER INSERT OR UPDATE OR DELETE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION public.sync_listing_status_from_lease();

CREATE OR REPLACE FUNCTION public.guard_lease_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'ended' AND OLD.status = 'active' AND NEW.end_date IS NULL THEN
    NEW.end_date := CURRENT_DATE;
  ELSIF NEW.status = 'active' AND OLD.status = 'ended' THEN
    NEW.end_date := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leases_guard_dates ON public.leases;
CREATE TRIGGER leases_guard_dates
  BEFORE UPDATE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION public.guard_lease_dates();

-- A booking can only be created for a currently available public room. After
-- creation, the requester may cancel only; the listing owner may change status
-- only. This prevents self-confirmation and field tampering via REST.
CREATE OR REPLACE FUNCTION public.guard_booking_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  listing_owner UUID;
  listing_public BOOLEAN;
  listing_available BOOLEAN;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  SELECT l.owner_id, l.is_published, l.status = 'available'
  INTO listing_owner, listing_public, listing_available
  FROM public.listings l
  WHERE l.id = NEW.listing_id;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'pending' OR NEW.view_date < CURRENT_DATE
       OR NOT COALESCE(listing_public, false)
       OR NOT COALESCE(listing_available, false) THEN
      RAISE EXCEPTION 'Booking is not valid for this listing' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF auth.uid() = OLD.user_id THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.listing_id IS DISTINCT FROM OLD.listing_id
       OR NEW.name IS DISTINCT FROM OLD.name
       OR NEW.phone IS DISTINCT FROM OLD.phone
       OR NEW.view_date IS DISTINCT FROM OLD.view_date
       OR NEW.view_time IS DISTINCT FROM OLD.view_time
       OR NEW.note IS DISTINCT FROM OLD.note
       OR NEW.status NOT IN (OLD.status, 'cancelled') THEN
      RAISE EXCEPTION 'Requester may only cancel a booking' USING ERRCODE = '42501';
    END IF;
  ELSIF auth.uid() = listing_owner THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.listing_id IS DISTINCT FROM OLD.listing_id
       OR NEW.name IS DISTINCT FROM OLD.name
       OR NEW.phone IS DISTINCT FROM OLD.phone
       OR NEW.view_date IS DISTINCT FROM OLD.view_date
       OR NEW.view_time IS DISTINCT FROM OLD.view_time
       OR NEW.note IS DISTINCT FROM OLD.note
       OR (OLD.status = 'cancelled' AND NEW.status <> 'cancelled')
       OR (OLD.status = 'pending' AND NEW.status NOT IN ('pending', 'confirmed', 'cancelled'))
       OR (OLD.status = 'confirmed' AND NEW.status NOT IN ('confirmed', 'cancelled')) THEN
      RAISE EXCEPTION 'Landlord may only change booking status' USING ERRCODE = '42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'You may not update this booking' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_guard_changes ON public.bookings;
CREATE TRIGGER bookings_guard_changes
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.guard_booking_changes();

-- Policy expressions and trigger functions need to inspect private columns
-- without granting those columns to the caller. These helpers return only a
-- boolean and run as the schema owner, so RLS cannot turn the checks into
-- permission errors or expose the underlying rows.
CREATE OR REPLACE FUNCTION public.is_public_listing(_listing_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.listings AS l
    WHERE l.id = _listing_id AND l.is_published
  )
$$;

CREATE OR REPLACE FUNCTION public.is_listing_owner(_listing_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.listings AS l
    WHERE l.id = _listing_id AND l.owner_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.can_view_listing(_listing_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.listings AS l
    WHERE l.id = _listing_id
      AND (l.is_published OR l.owner_id = auth.uid())
  )
$$;

CREATE OR REPLACE FUNCTION public.profile_has_published_listing(_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.listings AS l
    WHERE l.owner_id = _profile_id AND l.is_published
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_public_listing(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_listing_owner(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_view_listing(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.profile_has_published_listing(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_public_listing(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_listing_owner(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_listing(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.profile_has_published_listing(UUID) TO anon, authenticated;

-- Do not expose the profile table itself. Public landlord contact data is
-- projected by public_listings; the signed-in account only needs its own
-- headline fields.
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, full_name, phone) ON public.profiles TO authenticated;
DROP POLICY IF EXISTS "Users and published listing owners are viewable" ON public.profiles;
CREATE POLICY "Users and published listing owners are viewable" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR public.profile_has_published_listing(id)
  );

-- The base listing table is not a public API. The three columns below are
-- enough for booking joins; the catalogue uses public_listings instead.
REVOKE SELECT ON public.listings FROM anon, authenticated;
GRANT SELECT (id, public_title, title) ON public.listings TO authenticated;
DROP POLICY IF EXISTS "Published listing titles are readable" ON public.listings;
DROP POLICY IF EXISTS "Published listings are readable by anon" ON public.listings;
CREATE POLICY "Published listing titles are readable" ON public.listings
  FOR SELECT TO authenticated
  USING (public.can_view_listing(id));
CREATE POLICY "Published listings are readable by anon" ON public.listings
  FOR SELECT TO anon
  USING (public.can_view_listing(id));

-- Rebuild relation policies to use the same private-column-safe helpers.
DROP POLICY IF EXISTS "Listing images follow their listing" ON public.listing_images;
CREATE POLICY "Listing images follow their listing" ON public.listing_images
  FOR SELECT USING (public.can_view_listing(listing_id));
DROP POLICY IF EXISTS "Landlords manage own listing images" ON public.listing_images;
CREATE POLICY "Landlords manage own listing images" ON public.listing_images
  FOR ALL TO authenticated
  USING (
    public.is_listing_owner(listing_id)
    AND public.has_role(auth.uid(), 'landlord')
  )
  WITH CHECK (
    public.is_listing_owner(listing_id)
    AND public.has_role(auth.uid(), 'landlord')
  );

DROP POLICY IF EXISTS "Reviews of published listings are public" ON public.reviews;
CREATE POLICY "Reviews of published listings are public" ON public.reviews
  FOR SELECT USING (public.can_view_listing(listing_id));
DROP POLICY IF EXISTS "Signed-in users write their own reviews" ON public.reviews;
CREATE POLICY "Signed-in users write their own reviews" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND public.is_public_listing(listing_id)
  );

DROP POLICY IF EXISTS "Requester and landlord can read bookings" ON public.bookings;
CREATE POLICY "Requester and landlord can read bookings" ON public.bookings
  FOR SELECT USING (
    auth.uid() = user_id OR public.is_listing_owner(listing_id)
  );
DROP POLICY IF EXISTS "Users create own bookings" ON public.bookings;
CREATE POLICY "Users create own bookings" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND public.is_public_listing(listing_id)
  );
DROP POLICY IF EXISTS "Requester and landlord can update bookings" ON public.bookings;
CREATE POLICY "Requester and landlord can update bookings" ON public.bookings
  FOR UPDATE USING (
    auth.uid() = user_id OR public.is_listing_owner(listing_id)
  );

-- The following functions are called only by triggers. SECURITY DEFINER is
-- required because they inspect columns intentionally hidden from callers.
ALTER FUNCTION public.guard_tenancy_ownership() SECURITY DEFINER;
ALTER FUNCTION public.guard_booking_changes() SECURITY DEFINER;
REVOKE EXECUTE ON FUNCTION public.guard_tenancy_ownership() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_booking_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_listing_verification() FROM PUBLIC, anon, authenticated;

-- Normalize the room state after every lease change. Moving a lease between
-- rooms also repairs the old room, which the original trigger did not do.
CREATE OR REPLACE FUNCTION public.sync_listing_status_for_listing(_listing_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.leases
    WHERE listing_id = _listing_id AND status = 'active'
  ) THEN
    UPDATE public.listings
    SET status = 'occupied'
    WHERE id = _listing_id AND status IS DISTINCT FROM 'occupied';
  ELSE
    UPDATE public.listings
    SET status = 'available'
    WHERE id = _listing_id AND status = 'occupied';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_listing_status_for_listing(UUID)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_listing_status_from_lease()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_listing_id UUID;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.listing_id IS DISTINCT FROM NEW.listing_id THEN
    PERFORM public.sync_listing_status_for_listing(OLD.listing_id);
  END IF;

  current_listing_id := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.listing_id
    ELSE NEW.listing_id
  END;
  PERFORM public.sync_listing_status_for_listing(current_listing_id);

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS leases_sync_listing_status ON public.leases;
CREATE TRIGGER leases_sync_listing_status
  AFTER INSERT OR UPDATE OR DELETE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION public.sync_listing_status_from_lease();
REVOKE EXECUTE ON FUNCTION public.sync_listing_status_from_lease()
  FROM PUBLIC, anon, authenticated;

-- A direct API update cannot leave a room permanently marked occupied without
-- a live lease. Inserts are normalized to available first; a subsequent lease
-- insert atomically changes it back to occupied through the lease trigger.
CREATE OR REPLACE FUNCTION public.normalize_occupied_listing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'occupied'
     AND NOT EXISTS (
       SELECT 1 FROM public.leases
       WHERE listing_id = NEW.id AND status = 'active'
     ) THEN
    NEW.status := 'available';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listings_require_active_lease ON public.listings;
CREATE TRIGGER listings_require_active_lease
  BEFORE INSERT OR UPDATE OF status ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.normalize_occupied_listing();
REVOKE EXECUTE ON FUNCTION public.normalize_occupied_listing()
  FROM PUBLIC, anon, authenticated;

-- Lease dates are derived from status, including inserts made by a direct API.
CREATE OR REPLACE FUNCTION public.guard_lease_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'ended' AND NEW.end_date IS NULL THEN
    NEW.end_date := CURRENT_DATE;
  ELSIF TG_OP = 'UPDATE'
        AND NEW.status = 'active'
        AND OLD.status = 'ended' THEN
    NEW.end_date := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leases_guard_dates ON public.leases;
CREATE TRIGGER leases_guard_dates
  BEFORE INSERT OR UPDATE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION public.guard_lease_dates();
REVOKE EXECUTE ON FUNCTION public.guard_lease_dates()
  FROM PUBLIC, anon, authenticated;

-- One transaction for replacing a lease. The unique active-lease index and
-- the status-sync triggers both remain effective inside this function.
CREATE OR REPLACE FUNCTION public.replace_lease(
  p_current_lease_id UUID,
  p_listing_id UUID,
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_monthly_rent INTEGER,
  p_deposit INTEGER,
  p_notes TEXT
)
RETURNS public.leases
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  result public.leases;
BEGIN
  IF auth.uid() IS NULL
     OR NOT public.has_role(auth.uid(), 'landlord') THEN
    RAISE EXCEPTION 'Only landlords can replace leases' USING ERRCODE = '42501';
  END IF;

  IF p_current_lease_id IS NOT NULL THEN
    UPDATE public.leases
    SET status = 'ended'
    WHERE id = p_current_lease_id
      AND owner_id = auth.uid()
      AND listing_id = p_listing_id
      AND status = 'active';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Current lease was not found' USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO public.leases (
    owner_id, listing_id, tenant_id, start_date, end_date,
    monthly_rent, deposit, status, notes
  )
  VALUES (
    auth.uid(), p_listing_id, p_tenant_id, p_start_date, p_end_date,
    p_monthly_rent, p_deposit, 'active', p_notes
  )
  RETURNING * INTO result;

  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.replace_lease(
  UUID, UUID, UUID, DATE, DATE, INTEGER, INTEGER, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_lease(
  UUID, UUID, UUID, DATE, DATE, INTEGER, INTEGER, TEXT
) TO authenticated;

-- Keep landlord uploads in an owner-scoped folder. The bucket is public by
-- design, but an authenticated landlord must not be able to fill it under
-- arbitrary paths or move another owner's object.
DROP POLICY IF EXISTS "Landlords upload room photos" ON storage.objects;
CREATE POLICY "Landlords upload room photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'room-photos'
    AND public.has_role(auth.uid(), 'landlord')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
DROP POLICY IF EXISTS "Landlords replace own room photos" ON storage.objects;
CREATE POLICY "Landlords replace own room photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'room-photos' AND owner = auth.uid())
  WITH CHECK (
    bucket_id = 'room-photos'
    AND owner = auth.uid()
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ═══════════════════════════════════════════════════
-- 20260824000100_admin_moderation.sql
-- ═══════════════════════════════════════════════════

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

-- `tenants` là sổ tay của chủ trọ, không phải tài khoản. Muốn biết một người
-- dùng có thật sự từng thuê phòng hay không thì phải nối hai thứ đó lại.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS tenants_user_idx
  ON public.tenants (user_id) WHERE user_id IS NOT NULL;

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


-- ═══════════════════════════════════════════════════
-- 20260827000100_admin_verify_delete.sql
-- ═══════════════════════════════════════════════════

-- Duyệt và xác minh là hai mốc nối nhau, không phải một. Duyệt là "tin đọc
-- được, cho hiện với người tìm trọ"; xác minh là "đã kiểm phòng có thật và
-- đúng như tin". Tin vừa duệt xong luôn nằm giữa hai mốc đó — đang hiển thị
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
