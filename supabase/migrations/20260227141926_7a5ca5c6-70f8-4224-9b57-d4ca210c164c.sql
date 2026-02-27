
-- =============================================
-- INDUSTRIAL MATERIAL FLOW SYSTEM - FULL SCHEMA
-- =============================================

-- 1. Add package/conversion fields to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS base_unit text NOT NULL DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS conversion_factor numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS package_type text NOT NULL DEFAULT 'bulk',
  ADD COLUMN IF NOT EXISTS package_weight numeric NOT NULL DEFAULT 0;

-- 2. Locations table
CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view locations" ON public.locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage locations" ON public.locations FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default locations
INSERT INTO public.locations (code, name, sort_order) VALUES
  ('CD', 'Centro de Distribuição', 1),
  ('PCP', 'Planejamento e Controle de Produção', 2),
  ('PMP', 'Preparação de Matéria-Prima', 3),
  ('FABRICA', 'Fábrica', 4);

-- 3. Stock table (current levels per product per location)
CREATE TABLE public.stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  location_code text NOT NULL REFERENCES public.locations(code),
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'kg',
  total_kg numeric NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE (product_id, location_code)
);

ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view stock" ON public.stock FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert stock" ON public.stock FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update stock" ON public.stock FOR UPDATE TO authenticated USING (true);

-- 4. Stock movements (full audit trail)
CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  location_code text NOT NULL REFERENCES public.locations(code),
  movement_type text NOT NULL, -- 'entry', 'exit', 'transfer_out', 'transfer_in', 'adjustment', 'production_consume', 'production_output'
  quantity numeric NOT NULL,
  unit text NOT NULL DEFAULT 'kg',
  total_kg numeric NOT NULL DEFAULT 0,
  reference_type text, -- 'transfer', 'production_batch', 'manual'
  reference_id uuid, -- FK to transfers or production_batches
  notes text,
  user_id uuid REFERENCES auth.users(id),
  user_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view movements" ON public.stock_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert movements" ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (true);

-- 5. Transfers table
CREATE TABLE public.transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_location text NOT NULL REFERENCES public.locations(code),
  to_location text NOT NULL REFERENCES public.locations(code),
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'in_transit', 'completed', 'cancelled'
  requested_by uuid REFERENCES auth.users(id),
  requested_by_name text,
  confirmed_by uuid REFERENCES auth.users(id),
  confirmed_by_name text,
  notes text,
  created_at timestamptz DEFAULT now(),
  confirmed_at timestamptz
);

ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view transfers" ON public.transfers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert transfers" ON public.transfers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update transfers" ON public.transfers FOR UPDATE TO authenticated USING (true);

-- 6. Transfer items
CREATE TABLE public.transfer_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid NOT NULL REFERENCES public.transfers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  requested_quantity numeric NOT NULL DEFAULT 0,
  requested_unit text NOT NULL DEFAULT 'kg',
  sent_quantity numeric NOT NULL DEFAULT 0,
  sent_unit text NOT NULL DEFAULT 'kg',
  sent_total_kg numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', -- 'exact', 'below', 'above', 'pending'
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.transfer_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view transfer_items" ON public.transfer_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert transfer_items" ON public.transfer_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update transfer_items" ON public.transfer_items FOR UPDATE TO authenticated USING (true);

-- 7. Formulations (recipes)
CREATE TABLE public.formulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  final_product text NOT NULL, -- 'Telha', 'Forro', etc.
  machine text NOT NULL, -- 'Misturador 2', 'Misturador 3', etc.
  weight_per_batch numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (final_product, machine)
);

ALTER TABLE public.formulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view formulations" ON public.formulations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage formulations" ON public.formulations FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 8. Formulation items (raw materials per formulation)
CREATE TABLE public.formulation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formulation_id uuid NOT NULL REFERENCES public.formulations(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity_per_batch numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'kg',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.formulation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view formulation_items" ON public.formulation_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage formulation_items" ON public.formulation_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 9. Production batches
CREATE TABLE public.production_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formulation_id uuid NOT NULL REFERENCES public.formulations(id),
  batch_count integer NOT NULL DEFAULT 1,
  total_compound_kg numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'planned', -- 'planned', 'in_production', 'completed', 'cancelled'
  produced_by uuid REFERENCES auth.users(id),
  produced_by_name text,
  notes text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.production_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view production_batches" ON public.production_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert production_batches" ON public.production_batches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update production_batches" ON public.production_batches FOR UPDATE TO authenticated USING (true);

-- Create indexes for performance
CREATE INDEX idx_stock_product_location ON public.stock (product_id, location_code);
CREATE INDEX idx_stock_movements_product ON public.stock_movements (product_id);
CREATE INDEX idx_stock_movements_location ON public.stock_movements (location_code);
CREATE INDEX idx_stock_movements_created ON public.stock_movements (created_at DESC);
CREATE INDEX idx_transfers_status ON public.transfers (status);
CREATE INDEX idx_transfer_items_transfer ON public.transfer_items (transfer_id);
CREATE INDEX idx_production_batches_status ON public.production_batches (status);
