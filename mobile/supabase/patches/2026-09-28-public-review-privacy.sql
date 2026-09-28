-- Remove stable reviewer profile IDs from the public catalogue payload.
--
-- Public room pages need the reviewer display name, rating, comment and date,
-- not the internal profile UUID. Admin views keep `author_id` for moderation.

BEGIN;

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
WHERE l.is_published AND l.moderation_status = 'approved';

GRANT SELECT ON public.public_listings TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
