import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ExcessRecord {
  id: string;
  product_id: string;
  excess_kg: number;
  location_code: string;
  consumed: boolean;
}

/**
 * Fetches unconsumed material excess from PMP for reuse in production calculations.
 */
export function usePmpExcess() {
  const [records, setRecords] = useState<ExcessRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('material_excess')
      .select('id, product_id, excess_kg, location_code, consumed')
      .eq('location_code', 'PMP')
      .eq('consumed', false);
    if (!error && data) setRecords(data as ExcessRecord[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  // Aggregate excess per product
  const excessMap = useMemo(() => {
    const m = new Map<string, number>();
    records.forEach(r => {
      m.set(r.product_id, (m.get(r.product_id) || 0) + r.excess_kg);
    });
    return m;
  }, [records]);

  return { records, excessMap, loading, refetch: fetch };
}
