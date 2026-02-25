import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type Sector = 'CD' | 'Fábrica' | 'PMP' | 'PCP';

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  category_id: string | null;
  category: string; // derived
  unit_weight_kg: number;
}

export interface InventoryLog {
  id: string;
  product_id: string | null;
  product_name: string | null;
  quantity: number;
  from_sector: string | null;
  to_sector: string | null;
  user_id: string | null;
  user_name: string | null;
  action_type: string;
  notes: string | null;
  created_at: string;
}

export interface Separation {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  from_sector: string;
  to_sector: string;
  status: string;
  operator: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface StockSnapshot {
  id: string;
  product_id: string;
  sector: string;
  quantity: number;
  unit: string;
  user_id: string | null;
  total_kg: number;
  user_name: string | null;
  created_at: string;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    if (!error && data) setCategories(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  return { categories, loading, refetch: fetchCategories };
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { categories } = useCategories();

  const fetchProducts = useCallback(async () => {
    const { data: cats } = await supabase.from('categories').select('*');
    const catMap: Record<string, string> = {};
    cats?.forEach((c: any) => { catMap[c.id] = c.name; });

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');
    if (!error && data) {
      setProducts(data.map((p: any) => ({
        ...p,
        category: catMap[p.category_id] || 'Sem Categoria',
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  return { products, loading, refetch: fetchProducts };
}

export function useInventoryLogs() {
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    const { data, error } = await supabase
      .from('inventory_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (!error && data) setLogs(data as InventoryLog[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const addLog = useCallback(async (log: Omit<InventoryLog, 'id' | 'created_at'>) => {
    const { error } = await supabase.from('inventory_logs').insert(log);
    if (!error) fetchLogs();
    return { error };
  }, [fetchLogs]);

  return { logs, loading, addLog, refetch: fetchLogs };
}

export function useSeparations() {
  const [separations, setSeparations] = useState<Separation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSeparations = useCallback(async () => {
    const { data, error } = await supabase
      .from('separations')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setSeparations(data as Separation[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSeparations(); }, [fetchSeparations]);

  const addSeparation = useCallback(async (sep: Omit<Separation, 'id' | 'created_at' | 'completed_at'>) => {
    const { error } = await supabase.from('separations').insert(sep);
    if (!error) fetchSeparations();
    return { error };
  }, [fetchSeparations]);

  const completeSeparation = useCallback(async (id: string, operator: string) => {
    const { error } = await supabase
      .from('separations')
      .update({ status: 'completed', completed_at: new Date().toISOString(), operator })
      .eq('id', id);
    if (!error) fetchSeparations();
    return { error };
  }, [fetchSeparations]);

  const pendingSeparations = separations.filter(s => s.status === 'pending');

  return { separations, pendingSeparations, loading, addSeparation, completeSeparation, refetch: fetchSeparations };
}

export function useStockSnapshots() {
  const [snapshots, setSnapshots] = useState<StockSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSnapshots = useCallback(async () => {
    const { data, error } = await supabase
      .from('stock_snapshots')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setSnapshots(data as StockSnapshot[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSnapshots(); }, [fetchSnapshots]);

  const addSnapshot = useCallback(async (snap: Omit<StockSnapshot, 'id' | 'created_at'>) => {
    const { error } = await supabase.from('stock_snapshots').insert(snap);
    if (!error) fetchSnapshots();
    return { error };
  }, [fetchSnapshots]);

  const getLatestSnapshot = useCallback((productId: string, sector: string) => {
    return snapshots.find(s => s.product_id === productId && s.sector === sector);
  }, [snapshots]);

  const getSectorTotalKg = useCallback((sector: string) => {
    // Get latest snapshot per product for this sector
    const latest: Record<string, StockSnapshot> = {};
    snapshots.forEach(s => {
      if (s.sector === sector) {
        if (!latest[s.product_id] || new Date(s.created_at) > new Date(latest[s.product_id].created_at)) {
          latest[s.product_id] = s;
        }
      }
    });
    return Object.values(latest).reduce((sum, s) => sum + Number(s.total_kg), 0);
  }, [snapshots]);

  const getProductTotalKgAllSectors = useCallback((productId: string) => {
    const sectors: Sector[] = ['CD', 'Fábrica', 'PMP', 'PCP'];
    return sectors.reduce((sum, sector) => {
      const latest = snapshots.find(s => s.product_id === productId && s.sector === sector);
      return sum + (latest ? Number(latest.total_kg) : 0);
    }, 0);
  }, [snapshots]);

  return { snapshots, loading, addSnapshot, getLatestSnapshot, getSectorTotalKg, getProductTotalKgAllSectors, refetch: fetchSnapshots };
}
