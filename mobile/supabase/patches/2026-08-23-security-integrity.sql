-- Security and integrity patch for projects that already ran schema.sql.
--
-- Run 2026-08-23-distance-verification.sql first when the project predates
-- the school_name, distance_to_school and verification columns.
-- This migration is safe to run again and does not delete application data.

BEGIN;

-- RLS policies call this SECURITY DEFINER function. It must be executable by
-- the authenticated role, otherwise every landlord write is rejected.
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

-- ---------------------------------------------------------------- constraints

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_publishable;
ALTER TABLE public.listings
  ADD CONSTRAINT listings_publishable
  CHECK (
    NOT is_published
    OR (
      public_title IS NOT NULL AND address IS NOT NULL
      AND lat IS NOT NULL AND lng IS NOT NULL
    )
  );

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_price_check;
ALTER TABLE public.listings
  ADD CONSTRAINT listings_price_check CHECK (price > 0);
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_size_check;
ALTER TABLE public.listings
  ADD CONSTRAINT listings_size_check CHECK (size IS NULL OR size > 0);
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_rates_check;
ALTER TABLE public.listings
  ADD CONSTRAINT listings_rates_check
  CHECK (electricity_rate >= 0 AND water_rate >= 0);
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_coordinates_check;
ALTER TABLE public.listings
  ADD CONSTRAINT listings_coordinates_check CHECK (
    (lat IS NULL AND lng IS NULL)
    OR (lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180)
  );
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_public_text_check;
ALTER TABLE public.listings
  ADD CONSTRAINT listings_public_text_check CHECK (
    NOT is_published
    OR (length(btrim(public_title)) > 0 AND length(btrim(address)) > 0)
  );

ALTER TABLE public.leases DROP CONSTRAINT IF EXISTS leases_amounts_check;
ALTER TABLE public.leases
  ADD CONSTRAINT leases_amounts_check
  CHECK (monthly_rent > 0 AND deposit >= 0);

ALTER TABLE public.meter_readings DROP CONSTRAINT IF EXISTS meter_readings_period_check;
ALTER TABLE public.meter_readings
  ADD CONSTRAINT meter_readings_period_check
  CHECK (period ~ '^\d{4}-(0[1-9]|1[0-2])$');
ALTER TABLE public.meter_readings DROP CONSTRAINT IF EXISTS meter_readings_amounts_check;
ALTER TABLE public.meter_readings
  ADD CONSTRAINT meter_readings_amounts_check CHECK (
    electricity_start >= 0 AND electricity_end >= electricity_start
    AND water_start >= 0 AND water_end >= water_start
  );

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_period_check;
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_period_check
  CHECK (period ~ '^\d{4}-(0[1-9]|1[0-2])$');
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_amounts_check;
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_amounts_check CHECK (
    rent_amount >= 0 AND electricity_kwh >= 0 AND electricity_amount >= 0
    AND water_m3 >= 0 AND water_amount >= 0 AND other_amount >= 0
    AND total_amount >= 0
  );
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_total_check;
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_total_check CHECK (
    total_amount = rent_amount + electricity_amount + water_amount + other_amount
  );

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_time_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_time_check CHECK (
    view_time IN (
      '08:00', '09:00', '10:00', '11:00',
      '14:00', '15:00', '16:00', '17:00', '18:00'
    )
  );

-- ------------------------------------------------------------- safe helpers

CREATE OR REPLACE FUNCTION public.is_public_listing(_listing_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.listings AS l
    WHERE l.id = _listing_id AND l.is_published
  )
$$;

CREATE OR REPLACE FUNCTION public.is_listing_owner(_listing_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.listings AS l
    WHERE l.id = _listing_id AND l.owner_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.can_view_listing(_listing_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.listings AS l
    WHERE l.id = _listing_id
      AND (l.is_published OR l.owner_id = auth.uid())
  )
$$;

CREATE OR REPLACE FUNCTION public.profile_has_published_listing(_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.listings AS l
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

-- -------------------------------------------------------------- projections

REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, full_name, phone) ON public.profiles TO authenticated;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users and published listing owners are viewable" ON public.profiles;
CREATE POLICY "Users and published listing owners are viewable" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR public.profile_has_published_listing(id)
  );

REVOKE SELECT ON public.listings FROM anon, authenticated;
GRANT SELECT (id, public_title, title) ON public.listings TO authenticated;
DROP POLICY IF EXISTS "Published listings are public" ON public.listings;
DROP POLICY IF EXISTS "Published listing titles are readable" ON public.listings;
DROP POLICY IF EXISTS "Published listings are readable by anon" ON public.listings;
CREATE POLICY "Published listing titles are readable" ON public.listings
  FOR SELECT TO authenticated
  USING (public.can_view_listing(id));
CREATE POLICY "Published listings are readable by anon" ON public.listings
  FOR SELECT TO anon
  USING (public.can_view_listing(id));

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
    FROM public.listing_images AS i
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
    FROM public.reviews AS r
    WHERE r.listing_id = l.id
  ), '[]'::jsonb) AS reviews
FROM public.listings AS l
LEFT JOIN public.profiles AS p ON p.id = l.owner_id
WHERE l.is_published
  AND length(btrim(COALESCE(l.public_title, ''))) > 0
  AND length(btrim(COALESCE(l.address, ''))) > 0
  AND l.lat IS NOT NULL
  AND l.lng IS NOT NULL;

DROP VIEW IF EXISTS public.owner_listings;
CREATE VIEW public.owner_listings AS
SELECT l.*
FROM public.listings AS l
WHERE l.owner_id = auth.uid();

GRANT SELECT ON public.public_listings TO anon, authenticated;
GRANT SELECT ON public.owner_listings TO authenticated;

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

-- -------------------------------------------------------------- ownership

CREATE OR REPLACE FUNCTION public.guard_tenancy_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.listings AS l
    WHERE l.id = NEW.listing_id AND l.owner_id = NEW.owner_id
  ) THEN
    RAISE EXCEPTION 'Listing does not belong to owner' USING ERRCODE = '42501';
  END IF;

  IF TG_TABLE_NAME IN ('leases', 'invoices') AND NEW.tenant_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.tenants AS t
       WHERE t.id = NEW.tenant_id AND t.owner_id = NEW.owner_id
     ) THEN
    RAISE EXCEPTION 'Tenant does not belong to owner' USING ERRCODE = '42501';
  END IF;

  IF TG_TABLE_NAME = 'invoices' AND NEW.lease_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.leases AS le
       WHERE le.id = NEW.lease_id
         AND le.owner_id = NEW.owner_id
         AND le.listing_id = NEW.listing_id
         AND le.tenant_id = NEW.tenant_id
     ) THEN
    RAISE EXCEPTION 'Lease does not match invoice owner, listing and tenant'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.guard_tenancy_ownership() SECURITY DEFINER;
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
REVOKE EXECUTE ON FUNCTION public.guard_tenancy_ownership()
  FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------- lease/status sync

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
REVOKE EXECUTE ON FUNCTION public.sync_listing_status_for_listing(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_listing_status_from_lease()
  FROM PUBLIC, anon, authenticated;

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

-- --------------------------------------------------------------- bookings

CREATE OR REPLACE FUNCTION public.guard_booking_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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
  FROM public.listings AS l
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
       OR (OLD.status = 'pending'
           AND NEW.status NOT IN ('pending', 'confirmed', 'cancelled'))
       OR (OLD.status = 'confirmed'
           AND NEW.status NOT IN ('confirmed', 'cancelled')) THEN
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
ALTER FUNCTION public.guard_booking_changes() SECURITY DEFINER;
REVOKE EXECUTE ON FUNCTION public.guard_booking_changes()
  FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------- atomic replacement

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

ALTER FUNCTION public.guard_listing_verification() SECURITY DEFINER;
REVOKE EXECUTE ON FUNCTION public.guard_listing_verification()
  FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
