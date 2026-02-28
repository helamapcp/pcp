import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ── Types ──────────────────────────────────────────────

export interface Location {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
  active: boolean;
}

export interface Product {
  id: string;
  name: string;
  category_id: string | null;
  category: string;
  unit_weight_kg: number;
  base_unit: string;
  conversion_factor: number;
  package_type: string; // 'bulk' | 'unit' | 'sealed_bag'
  package_weight: number;
}

export interface Stock {
  id: string;
  product_id: string;
  location_code: string;
  quantity: number;
  unit: string;
  total_kg: number;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  location_code: string;
  movement_type: string;
  quantity: number;
  unit: string;
  total_kg: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  user_id: string | null;
  user_name: string | null;
  created_at: string;
}

export interface Transfer {
  id: string;
  from_location: string;
  to_location: string;
  status: string;
  requested_by: string | null;
  requested_by_name: string | null;
  confirmed_by: string | null;
  confirmed_by_name: string | null;
  notes: string | null;
  created_at: string;
  confirmed_at: string | null;
  items?: TransferItem[];
}

export interface TransferItem {
  id: string;
  transfer_id: string;
  product_id: string;
  requested_quantity: number;
  requested_unit: string;
  sent_quantity: number;
  sent_unit: string;
  sent_total_kg: number;
  status: string;
  product?: Product;
}

// ── Hooks ──────────────────────────────────────────────

export function useLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLocations = useCallback(async () => {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('active', true)
      .order('sort_order');
    if (!error && data) setLocations(data as Location[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);

  return { locations, loading, refetch: fetchLocations };
}

export function useIndustrialProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

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

export function useStock() {
  const [stock, setStock] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStock = useCallback(async () => {
    const { data, error } = await supabase
      .from('stock')
      .select('*');
    if (!error && data) setStock(data as Stock[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchStock(); }, [fetchStock]);

  const getStock = useCallback((productId: string, locationCode: string) => {
    return stock.find(s => s.product_id === productId && s.location_code === locationCode);
  }, [stock]);

  const getLocationTotalKg = useCallback((locationCode: string) => {
    return stock
      .filter(s => s.location_code === locationCode)
      .reduce((sum, s) => sum + Number(s.total_kg), 0);
  }, [stock]);

  const upsertStock = useCallback(async (
    productId: string,
    locationCode: string,
    quantity: number,
    unit: string,
    totalKg: number,
    userId: string
  ) => {
    const { error } = await supabase
      .from('stock')
      .upsert(
        {
          product_id: productId,
          location_code: locationCode,
          quantity,
          unit,
          total_kg: totalKg,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        },
        { onConflict: 'product_id,location_code' }
      );
    if (!error) await fetchStock();
    return { error };
  }, [fetchStock]);

  return { stock, loading, getStock, getLocationTotalKg, upsertStock, refetch: fetchStock };
}

export function useStockMovements() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMovements = useCallback(async () => {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (!error && data) setMovements(data as StockMovement[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchMovements(); }, [fetchMovements]);

  const addMovement = useCallback(async (movement: Omit<StockMovement, 'id' | 'created_at'>) => {
    const { error } = await supabase.from('stock_movements').insert(movement);
    if (!error) fetchMovements();
    return { error };
  }, [fetchMovements]);

  return { movements, loading, addMovement, refetch: fetchMovements };
}

export function useTransfers() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransfers = useCallback(async () => {
    const { data, error } = await supabase
      .from('transfers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (!error && data) setTransfers(data as Transfer[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTransfers(); }, [fetchTransfers]);

  const createTransfer = useCallback(async (
    fromLocation: string,
    toLocation: string,
    items: Array<{
      product_id: string;
      requested_quantity: number;
      requested_unit: string;
      sent_quantity: number;
      sent_unit: string;
      sent_total_kg: number;
    }>,
    userId: string,
    userName: string,
    notes?: string
  ) => {
    // Create transfer
    const { data: transfer, error: transferError } = await supabase
      .from('transfers')
      .insert({
        from_location: fromLocation,
        to_location: toLocation,
        status: 'pending',
        requested_by: userId,
        requested_by_name: userName,
        notes,
      })
      .select()
      .single();

    if (transferError || !transfer) return { error: transferError };

    // Create transfer items
    const transferItems = items.map(item => ({
      transfer_id: transfer.id,
      ...item,
      status: 'pending',
    }));

    const { error: itemsError } = await supabase
      .from('transfer_items')
      .insert(transferItems);

    if (itemsError) return { error: itemsError };

    await fetchTransfers();
    return { data: transfer, error: null };
  }, [fetchTransfers]);

  const confirmTransfer = useCallback(async (
    transferId: string,
    confirmedItems: Array<{
      id: string;
      sent_quantity: number;
      sent_unit: string;
      sent_total_kg: number;
      status: string; // 'exact', 'below', 'above'
    }>,
    userId: string,
    userName: string,
    stockOps: {
      upsertStock: (productId: string, locationCode: string, quantity: number, unit: string, totalKg: number, userId: string) => Promise<any>;
      getStock: (productId: string, locationCode: string) => Stock | undefined;
      addMovement: (movement: Omit<StockMovement, 'id' | 'created_at'>) => Promise<any>;
    },
    transfer: Transfer,
    products: Product[]
  ) => {
    // Update each item
    for (const item of confirmedItems) {
      await supabase
        .from('transfer_items')
        .update({
          sent_quantity: item.sent_quantity,
          sent_unit: item.sent_unit,
          sent_total_kg: item.sent_total_kg,
          status: item.status,
        })
        .eq('id', item.id);
    }

    // Update transfer status
    await supabase
      .from('transfers')
      .update({
        status: 'completed',
        confirmed_by: userId,
        confirmed_by_name: userName,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', transferId);

    // Get transfer items to update stock
    const { data: fullItems } = await supabase
      .from('transfer_items')
      .select('*')
      .eq('transfer_id', transferId);

    if (fullItems) {
      for (const item of fullItems) {
        const product = products.find(p => p.id === item.product_id);
        if (!product) continue;

        const sentKg = Number(item.sent_total_kg);
        const sentQty = Number(item.sent_quantity);

        // Deduct from source
        const sourceStock = stockOps.getStock(item.product_id, transfer.from_location);
        const sourceQty = Math.max(0, (sourceStock?.quantity || 0) - sentQty);
        const sourceKg = Math.max(0, (Number(sourceStock?.total_kg) || 0) - sentKg);
        await stockOps.upsertStock(item.product_id, transfer.from_location, sourceQty, item.sent_unit, sourceKg, userId);

        // Add to destination
        const destStock = stockOps.getStock(item.product_id, transfer.to_location);
        const destQty = (destStock?.quantity || 0) + sentQty;
        const destKg = (Number(destStock?.total_kg) || 0) + sentKg;
        await stockOps.upsertStock(item.product_id, transfer.to_location, destQty, item.sent_unit, destKg, userId);

        // Record movements
        await stockOps.addMovement({
          product_id: item.product_id,
          location_code: transfer.from_location,
          movement_type: 'transfer_out',
          quantity: sentQty,
          unit: item.sent_unit,
          total_kg: sentKg,
          reference_type: 'transfer',
          reference_id: transferId,
          notes: `Transferência para ${transfer.to_location}: ${sentQty} ${item.sent_unit}`,
          user_id: userId,
          user_name: userName,
        });

        await stockOps.addMovement({
          product_id: item.product_id,
          location_code: transfer.to_location,
          movement_type: 'transfer_in',
          quantity: sentQty,
          unit: item.sent_unit,
          total_kg: sentKg,
          reference_type: 'transfer',
          reference_id: transferId,
          notes: `Recebimento de ${transfer.from_location}: ${sentQty} ${item.sent_unit}`,
          user_id: userId,
          user_name: userName,
        });
      }
    }

    await fetchTransfers();
    return { error: null };
  }, [fetchTransfers]);

  const getTransferItems = useCallback(async (transferId: string) => {
    const { data, error } = await supabase
      .from('transfer_items')
      .select('*')
      .eq('transfer_id', transferId);
    return { data: data as TransferItem[] | null, error };
  }, []);

  return {
    transfers,
    loading,
    createTransfer,
    confirmTransfer,
    getTransferItems,
    refetch: fetchTransfers,
  };
}

// ── Conversion utilities ──────────────────────────────

export function convertToKg(quantity: number, unit: string, product: Product): number {
  if (unit === 'kg') return quantity;
  // For sealed bags, use package_weight (e.g., 10 bags × 25kg = 250kg)
  if (product.package_type === 'sealed_bag' && product.package_weight > 0) {
    return quantity * product.package_weight;
  }
  // For other unit products, use unit_weight_kg
  return quantity * product.unit_weight_kg;
}

export function convertFromKg(kg: number, unit: string, product: Product): number {
  if (unit === 'kg') return kg;
  // For sealed bags, use package_weight
  if (product.package_type === 'sealed_bag' && product.package_weight > 0) {
    if (product.package_weight === 0) return 0;
    return kg / product.package_weight;
  }
  if (product.unit_weight_kg === 0) return 0;
  return kg / product.unit_weight_kg;
}
