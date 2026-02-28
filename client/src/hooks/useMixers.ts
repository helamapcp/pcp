import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Mixer {
  id: string;
  name: string;
  capacity_kg: number;
  production_line: string | null;
  active: boolean;
  created_at: string;
}

export function useMixers() {
  const [mixers, setMixers] = useState<Mixer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMixers = useCallback(async () => {
    const { data, error } = await supabase
      .from('mixers')
      .select('*')
      .order('name');
    if (!error && data) setMixers(data as unknown as Mixer[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchMixers(); }, [fetchMixers]);

  const createMixer = useCallback(async (mixer: { name: string; capacity_kg: number; production_line?: string }) => {
    const { error } = await supabase.from('mixers').insert(mixer);
    if (!error) await fetchMixers();
    return { error };
  }, [fetchMixers]);

  const updateMixer = useCallback(async (id: string, updates: Partial<Mixer>) => {
    const { error } = await supabase.from('mixers').update(updates).eq('id', id);
    if (!error) await fetchMixers();
    return { error };
  }, [fetchMixers]);

  const toggleActive = useCallback(async (id: string, active: boolean) => {
    const { error } = await supabase.from('mixers').update({ active }).eq('id', id);
    if (!error) await fetchMixers();
    return { error };
  }, [fetchMixers]);

  return { mixers, loading, createMixer, updateMixer, toggleActive, refetch: fetchMixers };
}
