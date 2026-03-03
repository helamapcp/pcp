-- Make machine column nullable on formulations table
ALTER TABLE public.formulations ALTER COLUMN machine DROP NOT NULL;

-- Also make machine nullable on production_orders (it references machine from formulation)
ALTER TABLE public.production_orders ALTER COLUMN machine DROP NOT NULL;