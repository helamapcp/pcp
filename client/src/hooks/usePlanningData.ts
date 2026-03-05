import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Mixer {
  id: string;
  name: string;
  capacity_kg: number;
  max_batches_per_day: number;
  cycle_time_minutes: number;
  active: boolean;
  production_line: string | null;
}

export interface ProductionSchedule {
  id: string;
  formulation_id: string;
  mixer_id: string;
  production_date: string;
  batches: number;
  total_weight_kg: number;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  confirmed_at: string | null;
}

export interface PurchaseSuggestionRecord {
  id: string;
  product_id: string;
  required_quantity_kg: number;
  available_stock_kg: number;
  suggested_purchase_kg: number;
  production_schedule_id: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export function useMixersPlanning() {
  const [mixers, setMixers] = useState<Mixer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('mixers')
      .select('*')
      .eq('active', true)
      .order('name');
    if (!error && data) setMixers(data as unknown as Mixer[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { mixers, loading, refetch: fetch };
}

export function useProductionSchedules() {
  const [schedules, setSchedules] = useState<ProductionSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = useCallback(async () => {
    const { data, error } = await supabase
      .from('production_schedules')
      .select('*')
      .order('production_date', { ascending: true });
    if (!error && data) setSchedules(data as unknown as ProductionSchedule[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  const createSchedule = useCallback(async (schedule: {
    formulation_id: string;
    mixer_id: string;
    production_date: string;
    batches: number;
    total_weight_kg: number;
    notes?: string;
    created_by: string;
    created_by_name: string;
  }) => {
    const { data, error } = await supabase
      .from('production_schedules')
      .insert(schedule)
      .select()
      .single();
    if (!error) await fetchSchedules();
    return { data, error };
  }, [fetchSchedules]);

  const confirmSchedule = useCallback(async (id: string, userId: string, userName: string) => {
    const { error } = await supabase
      .from('production_schedules')
      .update({
        status: 'confirmed',
        confirmed_by: userId,
        confirmed_by_name: userName,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (!error) await fetchSchedules();
    return { error };
  }, [fetchSchedules]);

  return { schedules, loading, createSchedule, confirmSchedule, refetch: fetchSchedules };
}

export function usePurchaseSuggestions() {
  const [suggestions, setSuggestions] = useState<PurchaseSuggestionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuggestions = useCallback(async () => {
    const { data, error } = await supabase
      .from('purchase_suggestions')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setSuggestions(data as unknown as PurchaseSuggestionRecord[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSuggestions(); }, [fetchSuggestions]);

  const createSuggestions = useCallback(async (items: Array<{
    product_id: string;
    required_quantity_kg: number;
    available_stock_kg: number;
    suggested_purchase_kg: number;
    production_schedule_id?: string;
  }>) => {
    if (items.length === 0) return { error: null };
    const { error } = await supabase
      .from('purchase_suggestions')
      .insert(items);
    if (!error) await fetchSuggestions();
    return { error };
  }, [fetchSuggestions]);

  const resolveSuggestion = useCallback(async (id: string, userId: string, userName: string) => {
    const { error } = await supabase
      .from('purchase_suggestions')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: userId,
        resolved_by_name: userName,
      })
      .eq('id', id);
    if (!error) await fetchSuggestions();
    return { error };
  }, [fetchSuggestions]);

  return { suggestions, loading, createSuggestions, resolveSuggestion, refetch: fetchSuggestions };
}
