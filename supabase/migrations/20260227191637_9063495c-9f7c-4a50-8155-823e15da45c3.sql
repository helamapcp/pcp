
-- RPC for admin stock adjustment (transactional, audit-grade)
CREATE OR REPLACE FUNCTION public.admin_stock_adjustment(
  p_product_id uuid,
  p_location_code text,
  p_new_quantity numeric,
  p_new_total_kg numeric,
  p_justification text,
  p_user_id uuid,
  p_user_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old_qty numeric;
  v_old_kg numeric;
  v_diff numeric;
BEGIN
  -- Validate justification
  IF p_justification IS NULL OR length(trim(p_justification)) = 0 THEN
    RAISE EXCEPTION 'Justificativa obrigatória para ajuste administrativo';
  END IF;

  IF p_new_total_kg < 0 THEN
    RAISE EXCEPTION 'Estoque negativo não permitido';
  END IF;

  -- Lock and read current stock
  SELECT quantity, total_kg
  INTO v_old_qty, v_old_kg
  FROM stock
  WHERE product_id = p_product_id AND location_code = p_location_code
  FOR UPDATE;

  IF NOT FOUND THEN
    v_old_qty := 0;
    v_old_kg := 0;
  END IF;

  v_diff := p_new_total_kg - v_old_kg;

  -- Upsert stock
  INSERT INTO stock (product_id, location_code, quantity, total_kg, unit, updated_at, updated_by)
  VALUES (p_product_id, p_location_code, p_new_quantity, p_new_total_kg, 'kg', now(), p_user_id)
  ON CONFLICT (product_id, location_code)
  DO UPDATE SET
    quantity = EXCLUDED.quantity,
    total_kg = EXCLUDED.total_kg,
    updated_at = EXCLUDED.updated_at,
    updated_by = EXCLUDED.updated_by;

  -- Log adjustment
  INSERT INTO stock_adjustments (
    product_id, location_code,
    old_quantity, old_total_kg,
    new_quantity, new_total_kg,
    difference_kg, reason,
    reference_type, user_id, user_name
  ) VALUES (
    p_product_id, p_location_code,
    v_old_qty, v_old_kg,
    p_new_quantity, p_new_total_kg,
    v_diff, p_justification,
    'admin_adjustment', p_user_id, p_user_name
  );

  -- Log movement
  INSERT INTO stock_movements (
    product_id, location_code, movement_type,
    quantity, unit, total_kg,
    reference_type, notes, user_id, user_name
  ) VALUES (
    p_product_id, p_location_code, 'admin_adjustment',
    abs(v_diff), 'kg', abs(v_diff),
    'admin_adjustment',
    format('Ajuste admin: %s → %skg | %s', p_location_code, round(p_new_total_kg, 2), p_justification),
    p_user_id, p_user_name
  );

  RETURN jsonb_build_object(
    'success', true,
    'old_kg', v_old_kg,
    'new_kg', p_new_total_kg,
    'difference_kg', v_diff
  );
END;
$$;
