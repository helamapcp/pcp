/**
 * useDashboardData – Centralized data aggregation for Executive Dashboard.
 * All data from real backend, no mocks.
 */
import { useMemo } from 'react';
import { useStock, useStockMovements, useTransfers, useIndustrialProducts, useLocations } from '@/hooks/useIndustrialData';
import { useProductionOrders, useProductionBatches } from '@/hooks/useProductionData';
import { useStockAdjustments } from '@/hooks/useInventoryCounting';

export interface StockByLocation {
  location: string;
  totalKg: number;
}

export interface DivergencePoint {
  date: string;
  divergencePercent: number;
}

export interface MachineConsumption {
  machine: string;
  totalKg: number;
}

export interface SealedBagLoss {
  productName: string;
  idealKg: number;
  adjustedKg: number;
  lossKg: number;
}

export interface AdminAdjustmentRow {
  id: string;
  productId: string;
  locationCode: string;
  differenceKg: number;
  reason: string | null;
  userName: string | null;
  createdAt: string;
}

export function useDashboardData() {
  const { locations } = useLocations();
  const { products } = useIndustrialProducts();
  const { stock } = useStock();
  const { movements } = useStockMovements();
  const { transfers } = useTransfers();
  const { orders: productionOrders } = useProductionOrders();
  const { batches } = useProductionBatches();
  const { adjustments } = useStockAdjustments();

  const productsMap = useMemo(() => {
    const m = new Map<string, string>();
    products.forEach(p => m.set(p.id, p.name));
    return m;
  }, [products]);

  // 1. Stock by location
  const stockByLocation = useMemo<StockByLocation[]>(() => {
    const map: Record<string, number> = {};
    stock.forEach(s => {
      map[s.location_code] = (map[s.location_code] || 0) + Number(s.total_kg);
    });
    return Object.entries(map)
      .map(([location, totalKg]) => ({ location, totalKg }))
      .sort((a, b) => b.totalKg - a.totalKg);
  }, [stock]);

  // 2. Inventory divergence over time
  const divergenceTrend = useMemo<DivergencePoint[]>(() => {
    const invAdj = adjustments
      .filter(a => a.reference_type === 'inventory_count')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // Group by date
    const byDate: Record<string, { totalDiff: number; totalSystem: number }> = {};
    invAdj.forEach(a => {
      const d = new Date(a.created_at).toLocaleDateString('pt-BR');
      if (!byDate[d]) byDate[d] = { totalDiff: 0, totalSystem: 0 };
      byDate[d].totalDiff += Math.abs(Number(a.difference_kg));
      byDate[d].totalSystem += Math.abs(Number(a.old_total_kg));
    });

    return Object.entries(byDate).map(([date, v]) => ({
      date,
      divergencePercent: v.totalSystem > 0 ? (v.totalDiff / v.totalSystem) * 100 : 0,
    }));
  }, [adjustments]);

  // 3. Consumption by machine
  const machineConsumption = useMemo<MachineConsumption[]>(() => {
    const map: Record<string, number> = {};
    productionOrders.filter(po => po.status === 'confirmed').forEach(po => {
      map[po.machine] = (map[po.machine] || 0) + Number(po.total_compound_kg);
    });
    return Object.entries(map)
      .map(([machine, totalKg]) => ({ machine, totalKg }))
      .sort((a, b) => b.totalKg - a.totalKg);
  }, [productionOrders]);

  // 4. Sealed bag rounding losses from production movements
  const sealedBagLosses = useMemo<SealedBagLoss[]>(() => {
    // Get production_out movements that have rounding info
    const prodOut = movements.filter(m => m.movement_type === 'production_out' && m.notes);
    const lossMap: Record<string, { idealKg: number; adjustedKg: number }> = {};

    prodOut.forEach(m => {
      const notes = m.notes || '';
      const idealMatch = notes.match(/Ideal:\s*([\d.]+)kg/);
      const sentMatch = notes.match(/Enviado:\s*([\d.]+)kg/);
      if (idealMatch && sentMatch) {
        const ideal = parseFloat(idealMatch[1]);
        const sent = parseFloat(sentMatch[1]);
        if (sent > ideal) {
          const name = productsMap.get(m.product_id) || m.product_id;
          if (!lossMap[name]) lossMap[name] = { idealKg: 0, adjustedKg: 0 };
          lossMap[name].idealKg += ideal;
          lossMap[name].adjustedKg += sent;
        }
      }
    });

    return Object.entries(lossMap)
      .map(([productName, v]) => ({
        productName,
        idealKg: v.idealKg,
        adjustedKg: v.adjustedKg,
        lossKg: v.adjustedKg - v.idealKg,
      }))
      .filter(l => l.lossKg > 0)
      .sort((a, b) => b.lossKg - a.lossKg);
  }, [movements, productsMap]);

  // 5. Admin adjustments
  const adminAdjustments = useMemo<AdminAdjustmentRow[]>(() => {
    return adjustments
      .filter(a => a.reference_type === 'admin_adjustment')
      .map(a => ({
        id: a.id,
        productId: a.product_id,
        locationCode: a.location_code,
        differenceKg: Number(a.difference_kg),
        reason: a.reason,
        userName: a.user_name,
        createdAt: a.created_at,
      }));
  }, [adjustments]);

  const adminAdjByLocation = useMemo(() => {
    const map: Record<string, number> = {};
    adminAdjustments.forEach(a => { map[a.locationCode] = (map[a.locationCode] || 0) + 1; });
    return Object.entries(map).map(([location, count]) => ({ location, count })).sort((a, b) => b.count - a.count);
  }, [adminAdjustments]);

  const adminAdjByUser = useMemo(() => {
    const map: Record<string, number> = {};
    adminAdjustments.forEach(a => { map[a.userName || 'Desconhecido'] = (map[a.userName || 'Desconhecido'] || 0) + 1; });
    return Object.entries(map).map(([user, count]) => ({ user, count })).sort((a, b) => b.count - a.count);
  }, [adminAdjustments]);

  // Summary KPIs
  const totalStockKg = useMemo(() => stock.reduce((s, st) => s + Number(st.total_kg), 0), [stock]);
  const totalProducedKg = useMemo(() =>
    productionOrders.filter(po => po.status === 'confirmed').reduce((s, po) => s + Number(po.total_compound_kg), 0),
    [productionOrders]
  );
  const confirmedOrders = useMemo(() => productionOrders.filter(po => po.status === 'confirmed').length, [productionOrders]);
  const completedTransfers = useMemo(() => transfers.filter(t => t.status === 'completed').length, [transfers]);
  const pendingTransfers = useMemo(() => transfers.filter(t => t.status === 'pending').length, [transfers]);
  const totalRoundingLoss = useMemo(() => sealedBagLosses.reduce((s, l) => s + l.lossKg, 0), [sealedBagLosses]);

  return {
    stockByLocation,
    divergenceTrend,
    machineConsumption,
    sealedBagLosses,
    adminAdjustments,
    adminAdjByLocation,
    adminAdjByUser,
    productsMap,
    totalStockKg,
    totalProducedKg,
    confirmedOrders,
    completedTransfers,
    pendingTransfers,
    totalRoundingLoss,
  };
}
