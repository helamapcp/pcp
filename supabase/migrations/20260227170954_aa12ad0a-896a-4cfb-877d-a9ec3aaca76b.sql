
-- 1. Ensure unique constraint on stock (may already exist via index)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_product_location' AND conrelid = 'stock'::regclass
  ) THEN
    BEGIN
      ALTER TABLE stock ADD CONSTRAINT unique_product_location UNIQUE (product_id, location_code);
    EXCEPTION WHEN duplicate_table THEN
      NULL; -- index already covers this
    END;
  END IF;
END $$;

-- 2. Replace confirm_inventory_count with audit-grade version
CREATE OR REPLACE FUNCTION public.confirm_inventory_count(
  p_count_id uuid,
  p_user_id uuid,
  p_user_name text,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_location text;
  v_status text;
  v_item jsonb;
  v_product_id uuid;
  v_item_id uuid;
  v_counted_qty numeric;
  v_counted_kg numeric;
  v_justification text;
  v_system_qty numeric;
  v_system_kg numeric;
  v_diff numeric;
  v_adjustments int := 0;
BEGIN
  -- 1. Lock count row and validate draft status
  SELECT location_code, status
  INTO v_location, v_status
  FROM inventory_counts
  WHERE id = p_count_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contagem não encontrada';
  END IF;

  IF v_status != 'draft' THEN
    RAISE EXCEPTION 'Contagem não está em rascunho (status atual: %)', v_status;
  END IF;

  -- Mark as processing
  UPDATE inventory_counts SET status = 'processing' WHERE id = p_count_id;

  -- 2. Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_id := (v_item->>'id')::uuid;
    v_product_id := (v_item->>'product_id')::uuid;
    v_counted_qty := (v_item->>'counted_quantity')::numeric;
    v_counted_kg := (v_item->>'counted_total_kg')::numeric;
    v_justification := v_item->>'justification';

    -- Hard validation: no negative
    IF v_counted_kg < 0 THEN
      RAISE EXCEPTION 'Estoque negativo não permitido para produto %', v_product_id;
    END IF;

    -- 3. Fetch REAL stock from DB with row lock (NEVER trust frontend)
    SELECT quantity, total_kg
    INTO v_system_qty, v_system_kg
    FROM stock
    WHERE product_id = v_product_id AND location_code = v_location
    FOR UPDATE;

    IF NOT FOUND THEN
      v_system_qty := 0;
      v_system_kg := 0;
    END IF;

    -- 4. Recompute difference server-side
    v_diff := v_counted_kg - v_system_kg;

    -- Hard validation: justification required for differences
    IF abs(v_diff) > 0.001 AND (v_justification IS NULL OR length(trim(v_justification)) = 0) THEN
      RAISE EXCEPTION 'Justificativa obrigatória para diferenças (produto %)', v_product_id;
    END IF;

    -- 5. Update count item with DB-sourced system values
    UPDATE inventory_count_items SET
      counted_quantity = v_counted_qty,
      counted_total_kg = v_counted_kg,
      system_quantity = v_system_qty,
      system_total_kg = v_system_kg,
      difference_kg = v_diff,
      justification = v_justification
    WHERE id = v_item_id;

    -- 6. Replace stock value (not delta)
    INSERT INTO stock (product_id, location_code, quantity, total_kg, unit, updated_at, updated_by)
    VALUES (v_product_id, v_location, v_counted_qty, v_counted_kg, 'kg', now(), p_user_id)
    ON CONFLICT (product_id, location_code)
    DO UPDATE SET
      quantity = EXCLUDED.quantity,
      total_kg = EXCLUDED.total_kg,
      updated_at = EXCLUDED.updated_at,
      updated_by = EXCLUDED.updated_by;

    -- 7. Log adjustment + movement only if difference
    IF abs(v_diff) > 0.001 THEN
      INSERT INTO stock_adjustments (
        product_id, location_code,
        old_quantity, old_total_kg,
        new_quantity, new_total_kg,
        difference_kg, reason,
        reference_type, reference_id,
        user_id, user_name
      ) VALUES (
        v_product_id, v_location,
        v_system_qty, v_system_kg,
        v_counted_qty, v_counted_kg,
        v_diff, v_justification,
        'inventory_count', p_count_id,
        p_user_id, p_user_name
      );

      INSERT INTO stock_movements (
        product_id, location_code, movement_type,
        quantity, unit, total_kg,
        reference_type, reference_id,
        notes, user_id, user_name
      ) VALUES (
        v_product_id, v_location, 'adjustment',
        abs(v_diff), 'kg', abs(v_diff),
        'inventory_count', p_count_id,
        format('Ajuste inventário %s: %s%skg | %s',
          v_location,
          CASE WHEN v_diff > 0 THEN '+' ELSE '' END,
          round(v_diff, 2),
          coalesce(v_justification, '')),
        p_user_id, p_user_name
      );

      v_adjustments := v_adjustments + 1;
    END IF;
  END LOOP;

  -- 8. Finalize count only after all items processed
  UPDATE inventory_counts SET
    status = 'confirmed',
    confirmed_by = p_user_id,
    confirmed_by_name = p_user_name,
    confirmed_at = now()
  WHERE id = p_count_id;

  RETURN jsonb_build_object(
    'success', true,
    'count_id', p_count_id,
    'adjustments', v_adjustments
  );
END;
$$;
