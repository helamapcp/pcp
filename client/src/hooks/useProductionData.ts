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

  const createOrder = useCallback(async (order: {
    formulation_id: string;
    final_product: string;
    machine: string;
    batches: number;
    weight_per_batch: number;
    total_compound_kg: number;
    created_by: string;
    created_by_name: string;
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
    // Insert production order
    const { data: po, error: poErr } = await supabase
      .from('production_orders')
      .insert({
        formulation_id: order.formulation_id,
        final_product: order.final_product,
        machine: order.machine,
        batches: order.batches,
        weight_per_batch: order.weight_per_batch,
        total_compound_kg: order.total_compound_kg,
        status: 'confirmed',
        created_by: order.created_by,
        created_by_name: order.created_by_name,
        confirmed_at: new Date().toISOString(),
        notes: order.notes || null,
      })
      .select()
      .single();

    if (poErr || !po) return { error: poErr, data: null };

    // Insert order items
    const orderItems = order.items.map(item => ({
      production_order_id: po.id,
      ...item,
    }));
    const { error: itemsErr } = await supabase
      .from('production_order_items')
      .insert(orderItems);

    if (itemsErr) return { error: itemsErr, data: null };

    await fetchOrders();
    return { data: po, error: null };
  }, [fetchOrders]);

  return { orders, loading, createOrder, refetch: fetchOrders };
}
