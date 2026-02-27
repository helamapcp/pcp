
-- 1. Atomic RPC for inventory count confirmation
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
  v_item jsonb;
  v_product_id uuid;
  v_system_kg numeric;
  v_counted_kg numeric;
  v_system_qty numeric;
  v_counted_qty numeric;
  v_diff numeric;
  v_justification text;
  v_item_id uuid;
  v_adjustments int := 0;
BEGIN
  -- Lock the count and verify draft status
  SELECT location_code INTO v_location
  FROM inventory_counts
  WHERE id = p_count_id AND status = 'draft'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contagem não encontrada ou não está em rascunho';
  END IF;

  -- Mark as processing to prevent concurrent confirmation
  UPDATE inventory_counts SET status = 'processing' WHERE id = p_count_id;

  -- First pass: update all count items from the payload
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_id := (v_item->>'id')::uuid;
    v_product_id := (v_item->>'product_id')::uuid;
    v_counted_qty := (v_item->>'counted_quantity')::numeric;
    v_counted_kg := (v_item->>'counted_total_kg')::numeric;
    v_system_qty := (v_item->>'system_quantity')::numeric;
    v_system_kg := (v_item->>'system_total_kg')::numeric;
    v_diff := v_counted_kg - v_system_kg;
    v_justification := v_item->>'justification';

    -- Validate no negative
    IF v_counted_kg < 0 THEN
      RAISE EXCEPTION 'Estoque negativo não permitido para produto %', v_product_id;
    END IF;

    -- Validate justification required for differences
    IF abs(v_diff) > 0.001 AND (v_justification IS NULL OR length(trim(v_justification)) = 0) THEN
      RAISE EXCEPTION 'Justificativa obrigatória para diferenças (produto %)', v_product_id;
    END IF;

    -- Update count item
    UPDATE inventory_count_items SET
      counted_quantity = v_counted_qty,
      counted_total_kg = v_counted_kg,
      difference_kg = v_diff,
      justification = v_justification
    WHERE id = v_item_id;

    -- Always update stock to counted value
    INSERT INTO stock (product_id, location_code, quantity, total_kg, unit, updated_at, updated_by)
    VALUES (v_product_id, v_location, v_counted_qty, v_counted_kg, 'kg', now(), p_user_id)
    ON CONFLICT (product_id, location_code)
    DO UPDATE SET
      quantity = EXCLUDED.quantity,
      total_kg = EXCLUDED.total_kg,
      updated_at = EXCLUDED.updated_at,
      updated_by = EXCLUDED.updated_by;

    -- Log adjustment + movement only if difference exists
    IF abs(v_diff) > 0.001 THEN
      INSERT INTO stock_adjustments (
        product_id, location_code, old_quantity, old_total_kg,
        new_quantity, new_total_kg, difference_kg, reason,
        reference_type, reference_id, user_id, user_name
      ) VALUES (
        v_product_id, v_location, v_system_qty, v_system_kg,
        v_counted_qty, v_counted_kg, v_diff, v_justification,
        'inventory_count', p_count_id, p_user_id, p_user_name
      );

      INSERT INTO stock_movements (
        product_id, location_code, movement_type, quantity, unit, total_kg,
        reference_type, reference_id, notes, user_id, user_name
      ) VALUES (
        v_product_id, v_location, 'adjustment',
        abs(v_diff), 'kg', abs(v_diff),
        'inventory_count', p_count_id,
        format('Ajuste inventário %s: %s%skg | %s',
          v_location, CASE WHEN v_diff > 0 THEN '+' ELSE '' END,
          round(v_diff, 2), coalesce(v_justification, '')),
        p_user_id, p_user_name
      );

      v_adjustments := v_adjustments + 1;
    END IF;
  END LOOP;

  -- Finalize count
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

-- 2. Prevent multiple draft counts per location
CREATE UNIQUE INDEX IF NOT EXISTS one_draft_count_per_location
ON inventory_counts(location_code)
WHERE status IN ('draft', 'processing');

-- 3. No negative stock constraint (using trigger to avoid immutable CHECK issues)
CREATE OR REPLACE FUNCTION validate_no_negative_stock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.total_kg < 0 THEN
    RAISE EXCEPTION 'Estoque negativo não permitido: %.2f kg', NEW.total_kg;
  END IF;
  IF NEW.quantity < 0 THEN
    RAISE EXCEPTION 'Quantidade negativa não permitida: %.2f', NEW.quantity;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_no_negative_stock ON stock;
CREATE TRIGGER trg_no_negative_stock
BEFORE INSERT OR UPDATE ON stock
FOR EACH ROW EXECUTE FUNCTION validate_no_negative_stock();

-- 4. No negative counted values trigger
CREATE OR REPLACE FUNCTION validate_no_negative_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.counted_total_kg < 0 THEN
    RAISE EXCEPTION 'Contagem negativa não permitida';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_no_negative_count ON inventory_count_items;
CREATE TRIGGER trg_no_negative_count
BEFORE INSERT OR UPDATE ON inventory_count_items
FOR EACH ROW EXECUTE FUNCTION validate_no_negative_count();

-- 5. Adjustment summary view
CREATE OR REPLACE VIEW inventory_adjustment_summary AS
SELECT
  product_id,
  location_code,
  count(*) as total_adjustments,
  sum(difference_kg) as total_difference_kg,
  avg(difference_kg) as avg_difference_kg
FROM stock_adjustments
GROUP BY product_id, location_code;
