import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface InventoryCount {
  id: string;
  location_code: string;
  status: string;
  created_by: string | null;
  created_by_name: string | null;
  confirmed_by: string | null;
  confirmed_by_name: string | null;
  confirmed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface InventoryCountItem {
  id: string;
  inventory_count_id: string;
  product_id: string;
  system_quantity: number;
  system_total_kg: number;
  counted_quantity: number;
  counted_total_kg: number;
  difference_kg: number;
  justification: string | null;
}

export interface StockAdjustment {
  id: string;
  product_id: string;
  location_code: string;
  old_quantity: number;
  old_total_kg: number;
  new_quantity: number;
  new_total_kg: number;
  difference_kg: number;
  reason: string | null;
  reference_type: string | null;
  reference_id: string | null;
  user_id: string | null;
  user_name: string | null;
  created_at: string;
}

export function useInventoryCounts() {
  const [counts, setCounts] = useState<InventoryCount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCounts = useCallback(async () => {
    const { data, error } = await supabase
      .from('inventory_counts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (!error && data) setCounts(data as unknown as InventoryCount[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  const createCount = useCallback(async (
    locationCode: string,
    userId: string,
    userName: string,
    items: Array<{ product_id: string; system_quantity: number; system_total_kg: number }>
  ) => {
    const { data: count, error: cErr } = await supabase
      .from('inventory_counts')
      .insert({
        location_code: locationCode,
        status: 'draft',
        created_by: userId,
        created_by_name: userName,
      })
      .select()
      .single();

    if (cErr || !count) return { error: cErr, data: null };

    const countItems = items.map(item => ({
      inventory_count_id: count.id,
      product_id: item.product_id,
      system_quantity: item.system_quantity,
      system_total_kg: item.system_total_kg,
      counted_quantity: 0,
      counted_total_kg: 0,
      difference_kg: 0,
    }));

    const { error: iErr } = await supabase
      .from('inventory_count_items')
      .insert(countItems);

    if (iErr) return { error: iErr, data: null };

    await fetchCounts();
    return { data: count, error: null };
  }, [fetchCounts]);

  const confirmCount = useCallback(async (
    countId: string,
    items: Array<{
      id: string;
      product_id: string;
      counted_quantity: number;
      counted_total_kg: number;
      difference_kg: number;
      justification: string | null;
      system_quantity: number;
      system_total_kg: number;
    }>,
    locationCode: string,
    userId: string,
    userName: string
  ) => {
    // Update each item
    for (const item of items) {
      await supabase
        .from('inventory_count_items')
        .update({
          counted_quantity: item.counted_quantity,
          counted_total_kg: item.counted_total_kg,
          difference_kg: item.difference_kg,
          justification: item.justification,
        })
        .eq('id', item.id);

      // If difference, adjust stock and log
      if (Math.abs(item.difference_kg) > 0.001) {
        // Adjust stock
        await supabase
          .from('stock')
          .upsert({
            product_id: item.product_id,
            location_code: locationCode,
            quantity: item.counted_quantity,
            total_kg: item.counted_total_kg,
            unit: 'kg',
            updated_at: new Date().toISOString(),
            updated_by: userId,
          }, { onConflict: 'product_id,location_code' });

        // Log adjustment
        await supabase
          .from('stock_adjustments')
          .insert({
            product_id: item.product_id,
            location_code: locationCode,
            old_quantity: item.system_quantity,
            old_total_kg: item.system_total_kg,
            new_quantity: item.counted_quantity,
            new_total_kg: item.counted_total_kg,
            difference_kg: item.difference_kg,
            reason: item.justification,
            reference_type: 'inventory_count',
            reference_id: countId,
            user_id: userId,
            user_name: userName,
          });

        // Record stock movement
        await supabase
          .from('stock_movements')
          .insert({
            product_id: item.product_id,
            location_code: locationCode,
            movement_type: 'adjustment',
            quantity: Math.abs(item.difference_kg),
            unit: 'kg',
            total_kg: Math.abs(item.difference_kg),
            reference_type: 'inventory_count',
            reference_id: countId,
            notes: `Ajuste inventário: ${item.difference_kg > 0 ? '+' : ''}${item.difference_kg.toFixed(2)}kg | ${item.justification || 'Sem justificativa'}`,
            user_id: userId,
            user_name: userName,
          });
      }
    }

    // Update count status
    await supabase
      .from('inventory_counts')
      .update({
        status: 'confirmed',
        confirmed_by: userId,
        confirmed_by_name: userName,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', countId);

    await fetchCounts();
    return { error: null };
  }, [fetchCounts]);

  return { counts, loading, createCount, confirmCount, refetch: fetchCounts };
}

export function useStockAdjustments() {
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdjustments = useCallback(async () => {
    const { data, error } = await supabase
      .from('stock_adjustments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (!error && data) setAdjustments(data as unknown as StockAdjustment[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAdjustments(); }, [fetchAdjustments]);

  return { adjustments, loading, refetch: fetchAdjustments };
}
