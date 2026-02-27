
-- Production Orders table
CREATE TABLE public.production_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formulation_id uuid NOT NULL REFERENCES public.formulations(id),
  final_product text NOT NULL,
  machine text NOT NULL,
  batches integer NOT NULL DEFAULT 1,
  weight_per_batch numeric NOT NULL DEFAULT 0,
  total_compound_kg numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id),
  created_by_name text,
  confirmed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view production_orders" ON public.production_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert production_orders" ON public.production_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update production_orders" ON public.production_orders FOR UPDATE TO authenticated USING (true);

-- Production Order Items table
CREATE TABLE public.production_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id uuid NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  ideal_quantity_kg numeric NOT NULL DEFAULT 0,
  adjusted_quantity_kg numeric NOT NULL DEFAULT 0,
  difference_kg numeric NOT NULL DEFAULT 0,
  package_type text NOT NULL DEFAULT 'bulk',
  package_weight numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.production_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view production_order_items" ON public.production_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert production_order_items" ON public.production_order_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update production_order_items" ON public.production_order_items FOR UPDATE TO authenticated USING (true);
