
-- Create mixers table for managing mixing machines
CREATE TABLE public.mixers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  capacity_kg numeric NOT NULL DEFAULT 0,
  production_line text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mixers ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage mixers" ON public.mixers FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view mixers" ON public.mixers FOR SELECT USING (true);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_stock_location_code ON public.stock (location_code);
CREATE INDEX IF NOT EXISTS idx_stock_product_id ON public.stock (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements (created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON public.stock_movements (product_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_created_at ON public.production_orders (created_at);
CREATE INDEX IF NOT EXISTS idx_transfers_created_at ON public.transfers (created_at);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_created_at ON public.stock_adjustments (created_at);

-- Add location_type to locations if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='locations' AND column_name='location_type') THEN
    ALTER TABLE public.locations ADD COLUMN location_type text NOT NULL DEFAULT 'warehouse';
  END IF;
END $$;
