
-- =====================================================
-- PART 1: production_planning table (manager-controlled)
-- =====================================================
CREATE TABLE public.production_planning (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_date date NOT NULL,
  formulation_id uuid NOT NULL REFERENCES public.formulations(id),
  mixer_id uuid NOT NULL REFERENCES public.mixers(id),
  batches integer NOT NULL DEFAULT 1,
  total_weight_kg numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'planned',
  notes text,
  created_by uuid,
  created_by_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  cancelled_by uuid,
  cancelled_by_name text,
  cancelled_at timestamptz,
  cancel_reason text,
  executed_by uuid,
  executed_by_name text,
  executed_at timestamptz,
  production_order_id uuid REFERENCES public.production_orders(id)
);

-- RLS
ALTER TABLE public.production_planning ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view production_planning"
  ON public.production_planning FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers and admins can insert production_planning"
  ON public.production_planning FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'gerente') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers and admins can update production_planning"
  ON public.production_planning FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'gerente') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operador'));

-- =====================================================
-- PART 2: production_bags table (finished product bags)
-- =====================================================
CREATE TABLE public.production_bags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id uuid REFERENCES public.production_orders(id),
  production_planning_id uuid REFERENCES public.production_planning(id),
  formulation_id uuid NOT NULL REFERENCES public.formulations(id),
  bag_number integer NOT NULL DEFAULT 1,
  weight_kg numeric NOT NULL DEFAULT 0,
  location_code text NOT NULL DEFAULT 'PMP' REFERENCES public.locations(code),
  status text NOT NULL DEFAULT 'available',
  transferred_to text,
  transfer_id uuid REFERENCES public.transfers(id),
  created_by uuid,
  created_by_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.production_bags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view production_bags"
  ON public.production_bags FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert production_bags"
  ON public.production_bags FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update production_bags"
  ON public.production_bags FOR UPDATE TO authenticated USING (true);

-- =====================================================
-- PART 3: Add JSONB array validation to confirm_production
-- =====================================================
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
SET search_path TO 'public'
AS $function$
DECLARE
  v_order_id uuid;
  v_batch_id uuid;
  v_batch_code text;
  v_transfer_id uuid;
  v_item jsonb;
  v_adj_kg numeric;
  v_ideal_kg numeric;
  v_pkg_type text;
  v_pkg_weight numeric;
  v_justification text;
  v_current_kg numeric;
  v_current_qty numeric;
  v_current_unit text;
  v_unit_weight numeric;
  v_deducted_qty numeric;
  v_new_kg numeric;
  v_new_qty numeric;
  v_seq integer;
  v_status text;
  v_remainder numeric;
  v_excess_used numeric;
  v_new_excess numeric;
  v_excess_record record;
  v_remaining_to_consume numeric;
BEGIN
  -- VALIDATION: p_items must be a JSON array
  IF jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'p_items must be a JSON array, got %', jsonb_typeof(p_items);
  END IF;

  -- 1. Create production_order
  INSERT INTO production_orders (
    formulation_id, final_product, machine, batches, weight_per_batch,
    total_compound_kg, status, created_by, created_by_name, confirmed_at, notes
  ) VALUES (
    p_formulation_id, p_final_product, p_machine, p_batches, p_weight_per_batch,
    p_total_compound_kg, 'confirmed', p_user_id, p_user_name, now(), p_notes
  ) RETURNING id INTO v_order_id;

  -- 2. Generate batch_code
  SELECT nextval('batch_code_seq') INTO v_seq;
  v_batch_code := upper(replace(p_final_product, ' ', '')) || '-' ||
                  upper(replace(coalesce(p_machine, 'NONE'), ' ', '')) || '-' ||
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

  -- 4. Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_adj_kg := (v_item->>'adjusted_quantity_kg')::numeric;
    v_ideal_kg := (v_item->>'ideal_quantity_kg')::numeric;
    v_pkg_type := coalesce(v_item->>'package_type', 'bulk');
    v_pkg_weight := coalesce((v_item->>'package_weight')::numeric, 0);
    v_justification := v_item->>'justification';
    v_excess_used := coalesce((v_item->>'pmp_excess_used_kg')::numeric, 0);
    v_new_excess := coalesce((v_item->>'new_excess_kg')::numeric, 0);

    -- SERVER-SIDE VALIDATION: sealed_bag must be multiple of package_weight
    IF v_pkg_type = 'sealed_bag' AND v_pkg_weight > 0 AND v_adj_kg > 0 THEN
      v_remainder := v_adj_kg % v_pkg_weight;
      IF v_remainder > 0.001 THEN
        RAISE EXCEPTION 'Quantidade ajustada (%.2f kg) não é múltiplo de %.2f kg para produto %',
          v_adj_kg, v_pkg_weight, v_item->>'product_id';
      END IF;
    END IF;

    -- SERVER-SIDE VALIDATION: justification required if manual override
    IF abs(v_adj_kg - v_ideal_kg) > 0.001 THEN
      IF v_pkg_type = 'sealed_bag' AND v_pkg_weight > 0 THEN
        DECLARE
          v_net_required numeric;
          v_natural_adj numeric;
        BEGIN
          v_net_required := greatest(0, v_ideal_kg - v_excess_used);
          IF v_net_required > 0 THEN
            v_natural_adj := ceil(v_net_required / v_pkg_weight) * v_pkg_weight;
          ELSE
            v_natural_adj := 0;
          END IF;
          IF abs(v_adj_kg - v_natural_adj) > 0.001 THEN
            IF v_justification IS NULL OR length(trim(v_justification)) = 0 THEN
              RAISE EXCEPTION 'Justificativa obrigatória para ajuste manual do produto %', v_item->>'product_id';
            END IF;
          END IF;
        END;
      ELSE
        IF v_justification IS NULL OR length(trim(v_justification)) = 0 THEN
          RAISE EXCEPTION 'Justificativa obrigatória para ajuste manual do produto %', v_item->>'product_id';
        END IF;
      END IF;
    END IF;

    -- Insert order item
    INSERT INTO production_order_items (
      production_order_id, product_id, ideal_quantity_kg, adjusted_quantity_kg,
      difference_kg, package_type, package_weight, justification
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::uuid,
      v_ideal_kg,
      v_adj_kg,
      (v_item->>'difference_kg')::numeric,
      v_pkg_type,
      v_pkg_weight,
      v_justification
    );

    -- CONSUME PMP EXCESS (mark consumed, FIFO)
    IF v_excess_used > 0 THEN
      v_remaining_to_consume := v_excess_used;
      FOR v_excess_record IN
        SELECT id, excess_kg FROM material_excess
        WHERE product_id = (v_item->>'product_id')::uuid
          AND location_code = 'PMP'
          AND consumed = false
        ORDER BY created_at ASC
        FOR UPDATE
      LOOP
        EXIT WHEN v_remaining_to_consume <= 0;
        IF v_excess_record.excess_kg <= v_remaining_to_consume THEN
          UPDATE material_excess SET consumed = true, consumed_by_schedule_id = NULL WHERE id = v_excess_record.id;
          v_remaining_to_consume := v_remaining_to_consume - v_excess_record.excess_kg;
        ELSE
          UPDATE material_excess SET excess_kg = excess_kg - v_remaining_to_consume WHERE id = v_excess_record.id;
          v_remaining_to_consume := 0;
        END IF;
      END LOOP;
    END IF;

    -- REGISTER NEW EXCESS from rounding
    IF v_new_excess > 0.001 THEN
      INSERT INTO material_excess (
        product_id, location_code, excess_kg, production_date, source_schedule_id, consumed
      ) VALUES (
        (v_item->>'product_id')::uuid, 'PMP', v_new_excess, current_date, NULL, false
      );
    END IF;

    -- Lock and read current PCP stock
    SELECT quantity, total_kg, unit INTO v_current_qty, v_current_kg, v_current_unit
    FROM stock
    WHERE product_id = (v_item->>'product_id')::uuid AND location_code = 'PCP'
    FOR UPDATE;

    IF NOT FOUND THEN
      v_current_kg := 0; v_current_qty := 0; v_current_unit := 'kg';
    END IF;

    -- Validate stock sufficiency
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
      format('Produção %s (%s) - %s batidas | Lote: %s | Ideal: %skg | Sacos: %skg | Excedente usado: %skg | Novo excedente: %skg%s',
        p_final_product, p_machine, p_batches, v_batch_code,
        round(v_ideal_kg, 2), round(v_adj_kg, 2),
        round(v_excess_used, 2), round(v_new_excess, 2),
        CASE WHEN v_justification IS NOT NULL THEN ' | Justificativa: ' || v_justification ELSE '' END),
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
$function$;
