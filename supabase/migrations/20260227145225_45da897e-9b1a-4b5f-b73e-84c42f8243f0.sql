
-- Add batch traceability columns
ALTER TABLE production_batches ADD COLUMN IF NOT EXISTS production_order_id uuid REFERENCES production_orders(id);
ALTER TABLE production_batches ADD COLUMN IF NOT EXISTS batch_code text;
ALTER TABLE production_batches ADD COLUMN IF NOT EXISTS final_product text;
ALTER TABLE production_batches ADD COLUMN IF NOT EXISTS machine text;
ALTER TABLE production_batches ADD COLUMN IF NOT EXISTS batches integer DEFAULT 1;

-- Add batch_id to stock_movements and transfer_items
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES production_batches(id);
ALTER TABLE transfer_items ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES production_batches(id);

-- Create sequence for batch codes
CREATE SEQUENCE IF NOT EXISTS batch_code_seq START 1;

-- Atomic production confirmation RPC
CREATE OR REPLACE FUNCTION public.confirm_production(
  p_formulation_id uuid,
  p_final_product text,
  p_machine text,
  p_batches integer,
  p_weight_per_batch numeric,
  p_total_compound_kg numeric,
  p_user_id uuid,
  p_user_name text,
  p_notes text DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_batch_id uuid;
  v_batch_code text;
  v_transfer_id uuid;
  v_item jsonb;
  v_adj_kg numeric;
  v_current_kg numeric;
  v_current_qty numeric;
  v_current_unit text;
  v_unit_weight numeric;
  v_deducted_qty numeric;
  v_new_kg numeric;
  v_new_qty numeric;
  v_seq integer;
  v_status text;
BEGIN
  -- 1. Create production_order
  INSERT INTO production_orders (
    formulation_id, final_product, machine, batches, weight_per_batch,
    total_compound_kg, status, created_by, created_by_name, confirmed_at, notes
  ) VALUES (
    p_formulation_id, p_final_product, p_machine, p_batches, p_weight_per_batch,
    p_total_compound_kg, 'confirmed', p_user_id, p_user_name, now(), p_notes
  ) RETURNING id INTO v_order_id;

  -- 2. Generate batch_code: PRODUCT-MACHINE-YYYYMMDD-SEQ
  SELECT nextval('batch_code_seq') INTO v_seq;
  v_batch_code := upper(replace(p_final_product, ' ', '')) || '-' ||
                  upper(replace(p_machine, ' ', '')) || '-' ||
                  to_char(now(), 'YYYYMMDD') || '-' ||
                  lpad(v_seq::text, 4, '0');

  -- 3. Create production_batch
  INSERT INTO production_batches (
    formulation_id, production_order_id, batch_code, final_product, machine,
    batches, batch_count, total_compound_kg, status, produced_by, produced_by_name, completed_at
  ) VALUES (
    p_formulation_id, v_order_id, v_batch_code, p_final_product, p_machine,
    p_batches, p_batches, p_total_compound_kg, 'completed', p_user_id, p_user_name, now()
  ) RETURNING id INTO v_batch_id;

  -- 4. Insert production_order_items + deduct PCP stock + record movements
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_adj_kg := (v_item->>'adjusted_quantity_kg')::numeric;

    -- Insert order item
    INSERT INTO production_order_items (
      production_order_id, product_id, ideal_quantity_kg, adjusted_quantity_kg,
      difference_kg, package_type, package_weight
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::uuid,
      (v_item->>'ideal_quantity_kg')::numeric,
      v_adj_kg,
      (v_item->>'difference_kg')::numeric,
      v_item->>'package_type',
      (v_item->>'package_weight')::numeric
    );

    -- Get current PCP stock
    SELECT quantity, total_kg, unit INTO v_current_qty, v_current_kg, v_current_unit
    FROM stock WHERE product_id = (v_item->>'product_id')::uuid AND location_code = 'PCP';

    IF v_current_kg IS NULL THEN
      v_current_kg := 0; v_current_qty := 0; v_current_unit := 'kg';
    END IF;

    -- Validate stock
    IF v_current_kg < v_adj_kg THEN
      RAISE EXCEPTION 'Estoque insuficiente para produto %: disponível %.2f kg, necessário %.2f kg',
        v_item->>'product_id', v_current_kg, v_adj_kg;
    END IF;

    -- Get unit weight for qty conversion
    SELECT unit_weight_kg INTO v_unit_weight FROM products WHERE id = (v_item->>'product_id')::uuid;
    IF v_unit_weight IS NULL OR v_unit_weight = 0 THEN v_unit_weight := 1; END IF;

    v_deducted_qty := v_adj_kg / v_unit_weight;
    v_new_kg := greatest(0, v_current_kg - v_adj_kg);
    v_new_qty := greatest(0, v_current_qty - v_deducted_qty);

    -- Update PCP stock
    INSERT INTO stock (product_id, location_code, quantity, unit, total_kg, updated_at, updated_by)
    VALUES ((v_item->>'product_id')::uuid, 'PCP', v_new_qty, v_current_unit, v_new_kg, now(), p_user_id)
    ON CONFLICT (product_id, location_code)
    DO UPDATE SET quantity = EXCLUDED.quantity, total_kg = EXCLUDED.total_kg,
                  updated_at = EXCLUDED.updated_at, updated_by = EXCLUDED.updated_by;

    -- Record production_out movement
    INSERT INTO stock_movements (
      product_id, location_code, movement_type, quantity, unit, total_kg,
      reference_type, reference_id, batch_id, notes, user_id, user_name
    ) VALUES (
      (v_item->>'product_id')::uuid, 'PCP', 'production_out', v_deducted_qty,
      v_current_unit, v_adj_kg, 'production_order', v_order_id, v_batch_id,
      format('Produção %s (%s) - %s batidas | Lote: %s | Ideal: %skg | Enviado: %skg',
        p_final_product, p_machine, p_batches, v_batch_code,
        round((v_item->>'ideal_quantity_kg')::numeric, 2), round(v_adj_kg, 2)),
      p_user_id, p_user_name
    );
  END LOOP;

  -- 5. Record production_in movement (compound into PMP)
  INSERT INTO stock_movements (
    product_id, location_code, movement_type, quantity, unit, total_kg,
    reference_type, reference_id, batch_id, notes, user_id, user_name
  ) VALUES (
    (SELECT (p_items->0->>'product_id')::uuid), 'PMP', 'production_in',
    p_batches, 'batidas', p_total_compound_kg, 'production_order', v_order_id, v_batch_id,
    format('Composto %s (%s) - %s batidas = %skg | Lote: %s',
      p_final_product, p_machine, p_batches, round(p_total_compound_kg, 2), v_batch_code),
    p_user_id, p_user_name
  );

  -- 6. Create automatic transfer PCP → PMP
  INSERT INTO transfers (
    from_location, to_location, status, requested_by, requested_by_name,
    confirmed_by, confirmed_by_name, confirmed_at, notes
  ) VALUES (
    'PCP', 'PMP', 'completed', p_user_id, p_user_name,
    p_user_id, p_user_name, now(),
    format('Produção automática: %s (%s) - %s batidas | Lote: %s', p_final_product, p_machine, p_batches, v_batch_code)
  ) RETURNING id INTO v_transfer_id;

  -- 7. Insert transfer items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_adj_kg := (v_item->>'adjusted_quantity_kg')::numeric;
    IF v_adj_kg = (v_item->>'ideal_quantity_kg')::numeric THEN v_status := 'exact';
    ELSIF v_adj_kg > (v_item->>'ideal_quantity_kg')::numeric THEN v_status := 'above';
    ELSE v_status := 'below'; END IF;

    INSERT INTO transfer_items (
      transfer_id, product_id, requested_quantity, requested_unit,
      sent_quantity, sent_unit, sent_total_kg, status, batch_id
    ) VALUES (
      v_transfer_id, (v_item->>'product_id')::uuid,
      (v_item->>'ideal_quantity_kg')::numeric, 'kg',
      v_adj_kg, 'kg', v_adj_kg, v_status, v_batch_id
    );
  END LOOP;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'batch_id', v_batch_id,
    'batch_code', v_batch_code,
    'transfer_id', v_transfer_id,
    'success', true
  );
END;
$$;
