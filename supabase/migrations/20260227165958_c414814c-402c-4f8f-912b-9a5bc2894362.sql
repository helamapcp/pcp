
-- Inventory counts table
CREATE TABLE public.inventory_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_code text NOT NULL REFERENCES public.locations(code),
  status text NOT NULL DEFAULT 'draft',
  created_by uuid,
  created_by_name text,
  confirmed_by uuid,
  confirmed_by_name text,
  confirmed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.inventory_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view inventory_counts" ON public.inventory_counts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert inventory_counts" ON public.inventory_counts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update inventory_counts" ON public.inventory_counts FOR UPDATE TO authenticated USING (true);

-- Inventory count items
CREATE TABLE public.inventory_count_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_count_id uuid NOT NULL REFERENCES public.inventory_counts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  system_quantity numeric NOT NULL DEFAULT 0,
  system_total_kg numeric NOT NULL DEFAULT 0,
  counted_quantity numeric NOT NULL DEFAULT 0,
  counted_total_kg numeric NOT NULL DEFAULT 0,
  difference_kg numeric NOT NULL DEFAULT 0,
  justification text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.inventory_count_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view inventory_count_items" ON public.inventory_count_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert inventory_count_items" ON public.inventory_count_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update inventory_count_items" ON public.inventory_count_items FOR UPDATE TO authenticated USING (true);

-- Stock adjustments log
CREATE TABLE public.stock_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id),
  location_code text NOT NULL REFERENCES public.locations(code),
  old_quantity numeric NOT NULL DEFAULT 0,
  old_total_kg numeric NOT NULL DEFAULT 0,
  new_quantity numeric NOT NULL DEFAULT 0,
  new_total_kg numeric NOT NULL DEFAULT 0,
  difference_kg numeric NOT NULL DEFAULT 0,
  reason text,
  reference_type text,
  reference_id uuid,
  user_id uuid,
  user_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view stock_adjustments" ON public.stock_adjustments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert stock_adjustments" ON public.stock_adjustments FOR INSERT TO authenticated WITH CHECK (true);
