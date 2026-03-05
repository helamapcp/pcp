
-- 1. Add cancel tracking fields to transfers
ALTER TABLE public.transfers
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS cancelled_by_name text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason text;

-- 2. Add mixer capacity fields
ALTER TABLE public.mixers
  ADD COLUMN IF NOT EXISTS max_batches_per_day integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS cycle_time_minutes integer NOT NULL DEFAULT 60;

-- 3. Add BOM support: parent formulation reference
ALTER TABLE public.formulations
  ADD COLUMN IF NOT EXISTS parent_formulation_id uuid REFERENCES public.formulations(id);

-- 4. Create production_schedules table
CREATE TABLE IF NOT EXISTS public.production_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formulation_id uuid NOT NULL REFERENCES public.formulations(id),
  mixer_id uuid NOT NULL REFERENCES public.mixers(id),
  production_date date NOT NULL,
  batches integer NOT NULL DEFAULT 1,
  total_weight_kg numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'planned',
  notes text,
  created_by uuid,
  created_by_name text,
  created_at timestamptz DEFAULT now(),
  confirmed_at timestamptz,
  confirmed_by uuid,
  confirmed_by_name text
);

ALTER TABLE public.production_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view production_schedules"
  ON public.production_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert production_schedules"
  ON public.production_schedules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update production_schedules"
  ON public.production_schedules FOR UPDATE TO authenticated USING (true);

-- 5. Create purchase_suggestions table
CREATE TABLE IF NOT EXISTS public.purchase_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id),
  required_quantity_kg numeric NOT NULL DEFAULT 0,
  available_stock_kg numeric NOT NULL DEFAULT 0,
  suggested_purchase_kg numeric NOT NULL DEFAULT 0,
  production_schedule_id uuid REFERENCES public.production_schedules(id),
  status text NOT NULL DEFAULT 'open',
  notes text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid,
  resolved_by_name text
);

ALTER TABLE public.purchase_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view purchase_suggestions"
  ON public.purchase_suggestions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert purchase_suggestions"
  ON public.purchase_suggestions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update purchase_suggestions"
  ON public.purchase_suggestions FOR UPDATE TO authenticated USING (true);

-- 6. Create material_excess tracking table
CREATE TABLE IF NOT EXISTS public.material_excess (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id),
  location_code text NOT NULL REFERENCES public.locations(code),
  excess_kg numeric NOT NULL DEFAULT 0,
  source_schedule_id uuid REFERENCES public.production_schedules(id),
  production_date date NOT NULL,
  consumed boolean NOT NULL DEFAULT false,
  consumed_by_schedule_id uuid REFERENCES public.production_schedules(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.material_excess ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view material_excess"
  ON public.material_excess FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert material_excess"
  ON public.material_excess FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update material_excess"
  ON public.material_excess FOR UPDATE TO authenticated USING (true);

-- 7. Migrate existing 'pending' transfers to 'requested'
UPDATE public.transfers SET status = 'requested' WHERE status = 'pending';
UPDATE public.transfer_items SET status = 'requested' WHERE status = 'pending';
