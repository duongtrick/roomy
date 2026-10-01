BEGIN;

DROP VIEW IF EXISTS public.listing_true_costs;
CREATE VIEW public.listing_true_costs AS
SELECT
  i.listing_id,
  COUNT(*)::integer AS invoice_count,
  COUNT(DISTINCT COALESCE(i.tenant_id::text, i.lease_id::text))::integer AS tenant_count,
  ROUND(AVG(i.total_amount))::integer AS avg_total_amount,
  MIN(i.total_amount)::integer AS min_total_amount,
  MAX(i.total_amount)::integer AS max_total_amount
FROM public.invoices i
JOIN public.listings l ON l.id = i.listing_id
WHERE l.is_published
  AND l.moderation_status = 'approved'
  AND i.total_amount > 0
GROUP BY i.listing_id
HAVING COUNT(*) >= 3
   AND COUNT(DISTINCT COALESCE(i.tenant_id::text, i.lease_id::text)) >= 2;

GRANT SELECT ON public.listing_true_costs TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
