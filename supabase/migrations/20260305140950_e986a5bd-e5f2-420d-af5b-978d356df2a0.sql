
CREATE OR REPLACE FUNCTION public.confirm_transfer(
  p_transfer_id uuid,
  p_confirmed_items jsonb DEFAULT '[]'::jsonb,
  p_user_id uuid DEFAULT NULL::uuid,
  p_user_name text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_transfer record;
  v_item jsonb;
  v_ti record;
  v_product record;
  v_sent_qty numeric;
  v_sent_unit text;
  v_sent_kg numeric;
  v_requested_kg numeric;
  v_source_qty numeric;
  v_source_kg numeric;
  v_status text;
  v_items_processed int := 0;
  v_has_partial boolean := false;
  v_remainder_transfer_id uuid;
  v_remainder_items jsonb := '[]'::jsonb;
BEGIN
  -- 1. Lock and validate transfer
  SELECT * INTO v_transfer FROM transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transferência não encontrada';
  END IF;
  IF v_transfer.status = 'cancelled' THEN
    RAISE EXCEPTION 'Transferência já foi cancelada';
  END IF;
  IF v_transfer.status NOT IN ('requested', 'separating', 'ready') THEN
    RAISE EXCEPTION 'Transferência não pode ser confirmada (status: %)', v_transfer.status;
  END IF;

  -- 2. Process each confirmed item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_confirmed_items)
  LOOP
    SELECT * INTO v_ti FROM transfer_items
    WHERE id = (v_item->>'id')::uuid
    FOR UPDATE;
    IF NOT FOUND THEN CONTINUE; END IF;

    SELECT * INTO v_product FROM products WHERE id = v_ti.product_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produto não encontrado: %', v_ti.product_id;
    END IF;

    v_sent_qty := coalesce((v_item->>'sent_quantity')::numeric, 0);
    v_sent_unit := coalesce(v_item->>'sent_unit', v_ti.sent_unit);

    IF v_sent_qty <= 0 THEN
      RAISE EXCEPTION 'Quantidade deve ser positiva para produto %', v_product.name;
    END IF;

    -- SERVER-SIDE UNIT CONVERSION
    IF v_sent_unit = 'units' THEN
      IF v_product.package_type = 'sealed_bag' AND v_product.package_weight > 0 THEN
        v_sent_kg := v_sent_qty * v_product.package_weight;
      ELSIF v_product.unit_weight_kg > 0 THEN
        v_sent_kg := v_sent_qty * v_product.unit_weight_kg;
      ELSE
        RAISE EXCEPTION 'Impossível converter unidades para kg: produto % sem peso configurado', v_product.name;
      END IF;
    ELSE
      v_sent_kg := v_sent_qty;
    END IF;

    -- Compute requested in kg
    IF v_ti.requested_unit = 'units' THEN
      IF v_product.package_type = 'sealed_bag' AND v_product.package_weight > 0 THEN
        v_requested_kg := v_ti.requested_quantity * v_product.package_weight;
      ELSIF v_product.unit_weight_kg > 0 THEN
        v_requested_kg := v_ti.requested_quantity * v_product.unit_weight_kg;
      ELSE
        v_requested_kg := v_ti.requested_quantity;
      END IF;
    ELSE
      v_requested_kg := v_ti.requested_quantity;
    END IF;

    -- Determine status
    IF abs(v_sent_kg - v_requested_kg) / greatest(v_requested_kg, 0.001) < 0.01 THEN
      v_status := 'exact';
    ELSIF v_sent_kg < v_requested_kg THEN
      v_status := 'below';
      -- Track partial for automatic remainder transfer
      v_has_partial := true;
      v_remainder_items := v_remainder_items || jsonb_build_object(
        'product_id', v_ti.product_id,
        'remainder_quantity', v_ti.requested_quantity - v_sent_qty,
        'remainder_unit', v_ti.requested_unit
      );
    ELSE
      v_status := 'above';
    END IF;

    -- 3. Lock and validate source stock
    SELECT quantity, total_kg INTO v_source_qty, v_source_kg
    FROM stock
    WHERE product_id = v_ti.product_id AND location_code = v_transfer.from_location
    FOR UPDATE;

    IF NOT FOUND THEN
      v_source_qty := 0;
      v_source_kg := 0;
    END IF;

    IF v_source_kg < v_sent_kg THEN
      RAISE EXCEPTION 'Estoque insuficiente para %: disponível %.2f kg, necessário %.2f kg',
        v_product.name, v_source_kg, v_sent_kg;
    END IF;

    -- 4. Deduct from source
    UPDATE stock SET
      quantity = greatest(0, quantity - v_sent_qty),
      total_kg = greatest(0, total_kg - v_sent_kg),
      updated_at = now(),
      updated_by = p_user_id
    WHERE product_id = v_ti.product_id AND location_code = v_transfer.from_location;

    -- 5. Add to destination
    INSERT INTO stock (product_id, location_code, quantity, total_kg, unit, updated_at, updated_by)
    VALUES (v_ti.product_id, v_transfer.to_location, v_sent_qty, v_sent_kg, 'kg', now(), p_user_id)
    ON CONFLICT (product_id, location_code) DO UPDATE SET
      quantity = stock.quantity + v_sent_qty,
      total_kg = stock.total_kg + v_sent_kg,
      updated_at = now(),
      updated_by = p_user_id;

    -- 6. Update transfer item
    UPDATE transfer_items SET
      sent_quantity = v_sent_qty,
      sent_unit = v_sent_unit,
      sent_total_kg = v_sent_kg,
      status = v_status
    WHERE id = v_ti.id;

    -- 7. Record movements
    INSERT INTO stock_movements (
      product_id, location_code, movement_type, quantity, unit, total_kg,
      reference_type, reference_id, notes, user_id, user_name
    ) VALUES (
      v_ti.product_id, v_transfer.from_location, 'transfer_out',
      v_sent_qty, v_sent_unit, v_sent_kg,
      'transfer', p_transfer_id,
      format('Transferência %s→%s: %s %s (%skg) | %s',
        v_transfer.from_location, v_transfer.to_location,
        v_sent_qty, v_sent_unit, round(v_sent_kg, 2), v_product.name),
      p_user_id, p_user_name
    );

    INSERT INTO stock_movements (
      product_id, location_code, movement_type, quantity, unit, total_kg,
      reference_type, reference_id, notes, user_id, user_name
    ) VALUES (
      v_ti.product_id, v_transfer.to_location, 'transfer_in',
      v_sent_qty, v_sent_unit, v_sent_kg,
      'transfer', p_transfer_id,
      format('Recebimento %s←%s: %s %s (%skg) | %s',
        v_transfer.to_location, v_transfer.from_location,
        v_sent_qty, v_sent_unit, round(v_sent_kg, 2), v_product.name),
      p_user_id, p_user_name
    );

    v_items_processed := v_items_processed + 1;
  END LOOP;

  -- 8. Complete transfer
  UPDATE transfers SET
    status = 'completed',
    confirmed_by = p_user_id,
    confirmed_by_name = p_user_name,
    confirmed_at = now()
  WHERE id = p_transfer_id;

  -- 9. Auto-create remainder transfer if partial
  IF v_has_partial THEN
    INSERT INTO transfers (
      from_location, to_location, status,
      requested_by, requested_by_name, notes
    ) VALUES (
      v_transfer.from_location, v_transfer.to_location, 'requested',
      p_user_id, p_user_name,
      format('Saldo restante da transferência %s (parcial)', p_transfer_id)
    ) RETURNING id INTO v_remainder_transfer_id;

    -- Insert remainder items
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_remainder_items)
    LOOP
      INSERT INTO transfer_items (
        transfer_id, product_id,
        requested_quantity, requested_unit,
        sent_quantity, sent_unit, sent_total_kg, status
      ) VALUES (
        v_remainder_transfer_id,
        (v_item->>'product_id')::uuid,
        (v_item->>'remainder_quantity')::numeric,
        v_item->>'remainder_unit',
        0, v_item->>'remainder_unit', 0, 'requested'
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', p_transfer_id,
    'items_processed', v_items_processed,
    'has_remainder', v_has_partial,
    'remainder_transfer_id', v_remainder_transfer_id
  );
END;
$function$;
