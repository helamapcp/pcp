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
    _locationCode: string,
    userId: string,
    userName: string
  ) => {
    // Atomic confirmation via RPC — all steps in a single transaction
    const { data, error } = await supabase.rpc('confirm_inventory_count', {
      p_count_id: countId,
      p_user_id: userId,
      p_user_name: userName,
      p_items: JSON.stringify(items),
    });

    if (error) return { error };

    await fetchCounts();
    return { data, error: null };
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
