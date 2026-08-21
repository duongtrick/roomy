
-- Add utility rates and status enrichments to listings
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS electricity_rate integer NOT NULL DEFAULT 3500,
  ADD COLUMN IF NOT EXISTS water_rate integer NOT NULL DEFAULT 25000;

-- Tenants
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  full_name text NOT NULL,
  phone text,
  email text,
  id_number text,
  move_in_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Landlords manage own tenants" ON public.tenants
  FOR ALL USING (auth.uid() = owner_id AND public.has_role(auth.uid(), 'landlord'))
  WITH CHECK (auth.uid() = owner_id AND public.has_role(auth.uid(), 'landlord'));
CREATE TRIGGER tenants_set_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Leases
CREATE TABLE IF NOT EXISTS public.leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date,
  monthly_rent integer NOT NULL,
  deposit integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leases TO authenticated;
GRANT ALL ON public.leases TO service_role;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Landlords manage own leases" ON public.leases
  FOR ALL USING (auth.uid() = owner_id AND public.has_role(auth.uid(), 'landlord'))
  WITH CHECK (auth.uid() = owner_id AND public.has_role(auth.uid(), 'landlord'));
CREATE TRIGGER leases_set_updated_at BEFORE UPDATE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Meter readings
CREATE TABLE IF NOT EXISTS public.meter_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  period text NOT NULL, -- YYYY-MM
  electricity_start integer NOT NULL DEFAULT 0,
  electricity_end integer NOT NULL DEFAULT 0,
  water_start integer NOT NULL DEFAULT 0,
  water_end integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, period)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meter_readings TO authenticated;
GRANT ALL ON public.meter_readings TO service_role;
ALTER TABLE public.meter_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Landlords manage own meter readings" ON public.meter_readings
  FOR ALL USING (auth.uid() = owner_id AND public.has_role(auth.uid(), 'landlord'))
  WITH CHECK (auth.uid() = owner_id AND public.has_role(auth.uid(), 'landlord'));
CREATE TRIGGER meter_readings_set_updated_at BEFORE UPDATE ON public.meter_readings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  lease_id uuid REFERENCES public.leases(id) ON DELETE SET NULL,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  period text NOT NULL, -- YYYY-MM
  rent_amount integer NOT NULL DEFAULT 0,
  electricity_kwh integer NOT NULL DEFAULT 0,
  electricity_amount integer NOT NULL DEFAULT 0,
  water_m3 integer NOT NULL DEFAULT 0,
  water_amount integer NOT NULL DEFAULT 0,
  other_amount integer NOT NULL DEFAULT 0,
  total_amount integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid', -- unpaid | paid
  due_date date,
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Landlords manage own invoices" ON public.invoices
  FOR ALL USING (auth.uid() = owner_id AND public.has_role(auth.uid(), 'landlord'))
  WITH CHECK (auth.uid() = owner_id AND public.has_role(auth.uid(), 'landlord'));
CREATE TRIGGER invoices_set_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
