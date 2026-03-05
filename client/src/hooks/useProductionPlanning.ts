import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProductionPlanning {
  id: string;
  production_date: string;
  formulation_id: string;
  mixer_id: string;
  batches: number;
  total_weight_kg: number;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  cancelled_by: string | null;
  cancelled_by_name: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  executed_by: string | null;
  executed_by_name: string | null;
  executed_at: string | null;
  production_order_id: string | null;
}

export function useProductionPlanning() {
  const [plannings, setPlannings] = useState<ProductionPlanning[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlannings = useCallback(async () => {
    const { data, error } = await supabase
      .from('production_planning')
      .select('*')
      .order('production_date', { ascending: true });
    if (!error && data) setPlannings(data as unknown as ProductionPlanning[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPlannings(); }, [fetchPlannings]);

  const createPlanning = useCallback(async (planning: {
    production_date: string;
    formulation_id: string;
    mixer_id: string;
    batches: number;
    total_weight_kg: number;
    notes?: string;
    created_by: string;
    created_by_name: string;
  }) => {
    const { data, error } = await supabase
      .from('production_planning')
      .insert(planning)
      .select()
      .single();
    if (!error) await fetchPlannings();
    return { data: data as unknown as ProductionPlanning | null, error };
  }, [fetchPlannings]);

  const cancelPlanning = useCallback(async (id: string, userId: string, userName: string, reason: string) => {
    const { error } = await supabase
      .from('production_planning')
      .update({
        status: 'cancelled',
        cancelled_by: userId,
        cancelled_by_name: userName,
        cancelled_at: new Date().toISOString(),
        cancel_reason: reason,
      })
      .eq('id', id);
    if (!error) await fetchPlannings();
    return { error };
  }, [fetchPlannings]);

  const markExecuted = useCallback(async (id: string, userId: string, userName: string, orderId: string) => {
    const { error } = await supabase
      .from('production_planning')
      .update({
        status: 'completed',
        executed_by: userId,
        executed_by_name: userName,
        executed_at: new Date().toISOString(),
        production_order_id: orderId,
      })
      .eq('id', id);
    if (!error) await fetchPlannings();
    return { error };
  }, [fetchPlannings]);

  const startExecution = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('production_planning')
      .update({ status: 'in_progress' })
      .eq('id', id);
    if (!error) await fetchPlannings();
    return { error };
  }, [fetchPlannings]);

  return { plannings, loading, createPlanning, cancelPlanning, markExecuted, startExecution, refetch: fetchPlannings };
}

export function useTodayPlanning() {
  const { plannings, loading, ...rest } = useProductionPlanning();
  const today = new Date().toISOString().split('T')[0];
  const todayPlannings = plannings.filter(
    p => p.production_date === today && (p.status === 'planned' || p.status === 'in_progress')
  );
  return { todayPlannings, allPlannings: plannings, loading, ...rest };
}

export interface ProductionBag {
  id: string;
  production_order_id: string | null;
  production_planning_id: string | null;
  formulation_id: string;
  bag_number: number;
  weight_kg: number;
  location_code: string;
  status: string;
  transferred_to: string | null;
  transfer_id: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

export function useProductionBags() {
  const [bags, setBags] = useState<ProductionBag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBags = useCallback(async () => {
    const { data, error } = await supabase
      .from('production_bags')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setBags(data as unknown as ProductionBag[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBags(); }, [fetchBags]);

  const createBags = useCallback(async (params: {
    production_order_id?: string;
    production_planning_id?: string;
    formulation_id: string;
    count: number;
    weight_kg: number;
    created_by: string;
    created_by_name: string;
  }) => {
    const rows = Array.from({ length: params.count }, (_, i) => ({
      production_order_id: params.production_order_id || null,
      production_planning_id: params.production_planning_id || null,
      formulation_id: params.formulation_id,
      bag_number: i + 1,
      weight_kg: params.weight_kg,
      location_code: 'PMP',
      status: 'available',
      created_by: params.created_by,
      created_by_name: params.created_by_name,
    }));
    const { data, error } = await supabase
      .from('production_bags')
      .insert(rows)
      .select();
    if (!error) await fetchBags();
    return { data: data as unknown as ProductionBag[] | null, error };
  }, [fetchBags]);

  const markTransferred = useCallback(async (bagIds: string[], transferId: string, destination: string) => {
    const { error } = await supabase
      .from('production_bags')
      .update({
        status: 'transferred',
        transferred_to: destination,
        transfer_id: transferId,
      })
      .in('id', bagIds);
    if (!error) await fetchBags();
    return { error };
  }, [fetchBags]);

  return { bags, loading, createBags, markTransferred, refetch: fetchBags };
}
