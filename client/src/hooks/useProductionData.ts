import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Formulation, FormulationItem } from '@/lib/productionEngine';

export interface ProductionOrder {
  id: string;
  formulation_id: string;
  final_product: string;
  machine: string;
  batches: number;
  weight_per_batch: number;
  total_compound_kg: number;
  status: string;
  created_by: string | null;
  created_by_name: string | null;
  confirmed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface ProductionOrderItem {
  id: string;
  production_order_id: string;
  product_id: string;
  ideal_quantity_kg: number;
  adjusted_quantity_kg: number;
  difference_kg: number;
  package_type: string;
  package_weight: number;
}

export interface ProductionBatch {
  id: string;
  production_order_id: string | null;
  batch_code: string | null;
  final_product: string | null;
  machine: string | null;
  batches: number | null;
  formulation_id: string;
  batch_count: number;
  total_compound_kg: number;
  status: string;
  produced_by: string | null;
  produced_by_name: string | null;
  completed_at: string | null;
  created_at: string;
  notes: string | null;
}

export function useFormulations() {
  const [formulations, setFormulations] = useState<Formulation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('formulations')
      .select('*')
      .eq('active', true)
      .order('name');
    if (!error && data) setFormulations(data as unknown as Formulation[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { formulations, loading, refetch: fetch };
}

export function useFormulationItems(formulationId: string | null) {
  const [items, setItems] = useState<FormulationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!formulationId) { setItems([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('formulation_items')
      .select('*')
      .eq('formulation_id', formulationId);
    if (!error && data) setItems(data as unknown as FormulationItem[]);
    setLoading(false);
  }, [formulationId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { items, loading, refetch: fetch };
}

export function useProductionOrders() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from('production_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (!error && data) setOrders(data as unknown as ProductionOrder[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  /**
   * Atomic production confirmation via PostgreSQL RPC.
   * All steps happen in a single transaction — if any fails, everything rolls back.
   */
  const confirmProduction = useCallback(async (params: {
    formulation_id: string;
    final_product: string;
    machine: string;
    batches: number;
    weight_per_batch: number;
    total_compound_kg: number;
    user_id: string;
    user_name: string;
    notes?: string;
    items: Array<{
      product_id: string;
      ideal_quantity_kg: number;
      adjusted_quantity_kg: number;
      difference_kg: number;
      package_type: string;
      package_weight: number;
    }>;
  }) => {
    const { data, error } = await supabase.rpc('confirm_production', {
      p_formulation_id: params.formulation_id,
      p_final_product: params.final_product,
      p_machine: params.machine,
      p_batches: params.batches,
      p_weight_per_batch: params.weight_per_batch,
      p_total_compound_kg: params.total_compound_kg,
      p_user_id: params.user_id,
      p_user_name: params.user_name,
      p_notes: params.notes || null,
      p_items: JSON.stringify(params.items),
    });

    if (error) return { error, data: null };
    await fetchOrders();
    return { data: data as { order_id: string; batch_id: string; batch_code: string; transfer_id: string; success: boolean }, error: null };
  }, [fetchOrders]);

  return { orders, loading, confirmProduction, refetch: fetchOrders };
}

export function useProductionBatches() {
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBatches = useCallback(async () => {
    const { data, error } = await supabase
      .from('production_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (!error && data) setBatches(data as unknown as ProductionBatch[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  return { batches, loading, refetch: fetchBatches };
}
