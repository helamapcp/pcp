import React, { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useIndustrialProducts, useStock, useStockMovements, useTransfers } from '@/hooks/useIndustrialData';
import { useProductionOrders, useProductionBatches } from '@/hooks/useProductionData';
import { useStockAdjustments } from '@/hooks/useInventoryCounting';
import { BarChart3, TrendingUp, Factory, AlertTriangle } from 'lucide-react';

const LOCATIONS = ['CD', 'PCP', 'PMP', 'FABRICA'] as const;

export default function ManagerDashboard() {
  const { user } = useAuth();
  const { products } = useIndustrialProducts();
  const { stock, getStock, getLocationTotalKg } = useStock();
  const { movements } = useStockMovements();
  const { transfers } = useTransfers();
  const { orders: productionOrders } = useProductionOrders();
  const { batches } = useProductionBatches();
  const { adjustments } = useStockAdjustments();

  const today = new Date().toDateString();
  const todayMovements = movements.filter((m: any) => new Date(m.created_at).toDateString() === today);

  const avgDivergence = useMemo(() => {
    if (adjustments.length === 0) return 0;
    const invAdj = adjustments.filter((a: any) => a.reference_type === 'inventory_count');
    if (invAdj.length === 0) return 0;
    const totalDiff = invAdj.reduce((s: number, a: any) => s + Math.abs(Number(a.difference_kg)), 0);
    return totalDiff / invAdj.length;
  }, [adjustments]);

  const consumptionByMachine = useMemo(() => {
    const map: Record<string, number> = {};
    productionOrders.forEach((po: any) => {
      if (po.status === 'confirmed') {
        const key = po.machine || 'Sem misturador';
        map[key] = (map[key] || 0) + Number(po.total_compound_kg);
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [productionOrders]);

  const adminAdjustments = useMemo(() => adjustments.filter((a: any) => a.reference_type === 'admin_adjustment'), [adjustments]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">KPIs e visão analítica do estoque industrial</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {LOCATIONS.map(loc => {
          const totalKg = getLocationTotalKg(loc);
          return (
            <div key={loc} className="bg-card border rounded-xl p-6">
              <p className="text-muted-foreground text-xs font-bold mb-2">{loc}</p>
              <p className="text-foreground text-2xl md:text-3xl font-black">{(totalKg / 1000).toFixed(2)}t</p>
              <p className="text-muted-foreground text-xs mt-1">{totalKg.toLocaleString()} kg</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'PRODUTOS', value: products.length, icon: '📦' },
          { label: 'MOVIMENTAÇÕES HOJE', value: todayMovements.length, icon: '📊' },
          { label: 'LOTES PRODUZIDOS', value: batches.filter((b: any) => b.status === 'completed').length, icon: '🏭' },
          { label: 'TRANSFERÊNCIAS', value: transfers.filter((t: any) => t.status === 'completed').length, icon: '🔄' },
        ].map(stat => (
          <div key={stat.label} className="bg-card border rounded-xl p-6">
            <p className="text-muted-foreground text-xs font-bold mb-2">{stat.icon} {stat.label}</p>
            <p className="text-foreground text-2xl md:text-3xl font-black">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-card border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4 text-primary" /><p className="text-foreground font-bold text-sm">Divergência Média Inventário</p></div>
          <p className={`text-2xl font-black ${avgDivergence > 10 ? 'text-destructive' : avgDivergence > 1 ? 'text-industrial-warning' : 'text-industrial-success'}`}>{avgDivergence.toFixed(2)} kg</p>
          <p className="text-muted-foreground text-xs mt-1">{adjustments.filter((a: any) => a.reference_type === 'inventory_count').length} contagens</p>
        </div>
        <div className="bg-card border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3"><Factory className="w-4 h-4 text-primary" /><p className="text-foreground font-bold text-sm">Consumo por Misturador</p></div>
          {consumptionByMachine.length === 0 ? <p className="text-muted-foreground text-sm">Sem dados</p> : (
            <div className="space-y-2">{consumptionByMachine.slice(0, 4).map(([machine, kg]) => (
              <div key={machine} className="flex justify-between items-center"><span className="text-foreground text-sm font-semibold">{machine}</span><span className="text-primary font-black text-sm">{(kg / 1000).toFixed(2)}t</span></div>
            ))}</div>
          )}
        </div>
        <div className="bg-card border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3"><AlertTriangle className="w-4 h-4 text-industrial-warning" /><p className="text-foreground font-bold text-sm">Ajustes Administrativos</p></div>
          <p className={`text-2xl font-black ${adminAdjustments.length > 10 ? 'text-destructive' : 'text-foreground'}`}>{adminAdjustments.length}</p>
          <p className="text-muted-foreground text-xs mt-1">{adminAdjustments.length > 0 ? `Última: ${new Date(adminAdjustments[0]?.created_at).toLocaleDateString('pt-BR')}` : 'Nenhum ajuste manual'}</p>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-secondary border-b border-border"><h3 className="text-foreground font-bold text-lg">Estoque por Local</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-foreground font-bold">Produto</th>
                {LOCATIONS.map(loc => <th key={loc} className="px-4 py-3 text-right text-foreground font-bold">{loc}</th>)}
                <th className="px-4 py-3 text-right font-bold text-industrial-success">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((product: any) => {
                const total = LOCATIONS.reduce((sum, loc) => sum + Number(getStock(product.id, loc)?.total_kg || 0), 0);
                if (total === 0) return null;
                return (
                  <tr key={product.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-4 py-3 text-foreground font-semibold text-sm">{product.name}</td>
                    {LOCATIONS.map(loc => { const s = getStock(product.id, loc); return <td key={loc} className="px-4 py-3 text-right text-foreground font-bold">{s ? `${Number(s.total_kg).toFixed(1)} kg` : '-'}</td>; })}
                    <td className="px-4 py-3 text-right text-industrial-success font-black">{total.toFixed(1)} kg</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
