import React, { useMemo } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useIndustrialProducts, useStock, useStockMovements, useTransfers } from '@/hooks/useIndustrialData';
import { useProductionOrders, useProductionBatches } from '@/hooks/useProductionData';
import { useStockAdjustments } from '@/hooks/useInventoryCounting';
import { ArrowLeft, BarChart3, Factory, Package, TrendingUp, AlertTriangle, Scale, Truck } from 'lucide-react';

const LOCATIONS = ['CD', 'PCP', 'PMP', 'FABRICA'] as const;

function KPICard({ icon: Icon, iconColor, label, value, sub }: { icon: any; iconColor: string; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card border-2 border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <p className="text-muted-foreground text-xs font-bold">{label}</p>
      </div>
      <p className="text-foreground text-2xl font-black">{value}</p>
      {sub && <p className="text-muted-foreground text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default function ExecutiveDashboard() {
  const [, setNav] = useLocation();
  const { user } = useAuth();
  const { products } = useIndustrialProducts();
  const { stock, getLocationTotalKg } = useStock();
  const { movements } = useStockMovements();
  const { transfers } = useTransfers();
  const { orders: productionOrders } = useProductionOrders();
  const { batches } = useProductionBatches();
  const { adjustments } = useStockAdjustments();

  const avgDivergence = useMemo(() => {
    const invAdj = adjustments.filter(a => a.reference_type === 'inventory_count');
    if (invAdj.length === 0) return 0;
    return invAdj.reduce((s, a) => s + Math.abs(Number(a.difference_kg)), 0) / invAdj.length;
  }, [adjustments]);

  const divergencePercent = useMemo(() => {
    const invAdj = adjustments.filter(a => a.reference_type === 'inventory_count');
    if (invAdj.length === 0) return 0;
    const totalSystem = invAdj.reduce((s, a) => s + Math.abs(Number(a.old_total_kg)), 0);
    if (totalSystem === 0) return 0;
    const totalDiff = invAdj.reduce((s, a) => s + Math.abs(Number(a.difference_kg)), 0);
    return (totalDiff / totalSystem) * 100;
  }, [adjustments]);

  const consumptionByMachine = useMemo(() => {
    const map: Record<string, number> = {};
    productionOrders.filter(po => po.status === 'confirmed').forEach(po => {
      map[po.machine] = (map[po.machine] || 0) + Number(po.total_compound_kg);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [productionOrders]);

  const totalProduced = useMemo(() => {
    return productionOrders
      .filter(po => po.status === 'confirmed')
      .reduce((s, po) => s + Number(po.total_compound_kg), 0);
  }, [productionOrders]);

  const roundingLoss = useMemo(() => {
    const prodMovements = movements.filter(m => m.movement_type === 'production_out');
    return adjustments
      .filter(a => a.reference_type === 'production_order')
      .reduce((s, a) => s + Math.abs(Number(a.difference_kg)), 0);
  }, [adjustments, movements]);

  const adminAdj = useMemo(() => adjustments.filter(a => a.reference_type === 'admin_adjustment'), [adjustments]);

  const adjByLocation = useMemo(() => {
    const map: Record<string, number> = {};
    adminAdj.forEach(a => { map[a.location_code] = (map[a.location_code] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [adminAdj]);

  const adjByUser = useMemo(() => {
    const map: Record<string, number> = {};
    adminAdj.forEach(a => { map[a.user_name || 'Desconhecido'] = (map[a.user_name || 'Desconhecido'] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [adminAdj]);

  if (!user || (user.role !== 'gerente' && user.role !== 'admin')) {
    setNav('/login'); return null;
  }

  const backPath = user.role === 'admin' ? '/admin' : '/manager';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-card border-b-2 border-border sticky top-0 z-10 p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setNav(backPath)} className="p-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors touch-target">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-black text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" /> Dashboard Executivo
            </h1>
            <p className="text-muted-foreground text-xs">KPIs Industriais • Visão Estratégica</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 max-w-7xl mx-auto w-full space-y-6">
        {/* Stock by location */}
        <div>
          <h2 className="text-foreground font-black text-lg mb-3">📦 Estoque por Local</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {LOCATIONS.map(loc => {
              const totalKg = getLocationTotalKg(loc);
              return (
                <div key={loc} className="bg-card border-2 border-border rounded-lg p-4">
                  <p className="text-muted-foreground text-xs font-bold mb-1">{loc}</p>
                  <p className="text-foreground text-2xl font-black">{(totalKg / 1000).toFixed(1)}t</p>
                  <p className="text-muted-foreground text-xs">{totalKg.toLocaleString()} kg</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Inventory KPIs */}
        <div>
          <h2 className="text-foreground font-black text-lg mb-3">📋 Inventário</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <KPICard icon={TrendingUp} iconColor="text-primary" label="Divergência Média" value={`${avgDivergence.toFixed(2)} kg`} sub={`${divergencePercent.toFixed(1)}% de variação`} />
            <KPICard icon={Scale} iconColor="text-industrial-warning" label="Contagens Realizadas" value={String(adjustments.filter(a => a.reference_type === 'inventory_count').length)} />
            <KPICard icon={AlertTriangle} iconColor="text-destructive" label="Ajustes Admin" value={String(adminAdj.length)} sub={adminAdj.length > 0 ? `Último: ${new Date(adminAdj[0]?.created_at).toLocaleDateString('pt-BR')}` : 'Nenhum'} />
          </div>
        </div>

        {/* Production KPIs */}
        <div>
          <h2 className="text-foreground font-black text-lg mb-3">🏭 Produção</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <KPICard icon={Factory} iconColor="text-primary" label="Total Produzido" value={`${(totalProduced / 1000).toFixed(1)}t`} sub={`${productionOrders.filter(po => po.status === 'confirmed').length} ordens`} />
            <KPICard icon={Package} iconColor="text-industrial-warning" label="Perda Arredondamento" value={`${roundingLoss.toFixed(1)} kg`} sub="Embalagens sealed_bag" />
            <KPICard icon={Truck} iconColor="text-industrial-success" label="Transferências" value={String(transfers.filter(t => t.status === 'completed').length)} sub={`${transfers.filter(t => t.status === 'pending').length} pendentes`} />
          </div>
        </div>

        {/* Consumption by machine */}
        <div>
          <h2 className="text-foreground font-black text-lg mb-3">⚙️ Consumo por Misturador</h2>
          <div className="bg-card border-2 border-border rounded-lg overflow-hidden">
            {consumptionByMachine.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">Sem dados de produção</div>
            ) : (
              <div className="divide-y divide-border">
                {consumptionByMachine.map(([machine, kg]) => (
                  <div key={machine} className="px-4 py-3 flex justify-between items-center">
                    <span className="text-foreground font-bold">{machine}</span>
                    <div className="text-right">
                      <span className="text-primary font-black">{(kg / 1000).toFixed(1)}t</span>
                      <span className="text-muted-foreground text-xs ml-2">{kg.toLocaleString()} kg</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Admin adjustment breakdown */}
        {adminAdj.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h2 className="text-foreground font-black text-lg mb-3">📍 Ajustes por Local</h2>
              <div className="bg-card border-2 border-border rounded-lg divide-y divide-border">
                {adjByLocation.map(([loc, count]) => (
                  <div key={loc} className="px-4 py-3 flex justify-between">
                    <span className="text-foreground font-bold">{loc}</span>
                    <span className="text-destructive font-black">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-foreground font-black text-lg mb-3">👤 Ajustes por Usuário</h2>
              <div className="bg-card border-2 border-border rounded-lg divide-y divide-border">
                {adjByUser.map(([userName, count]) => (
                  <div key={userName} className="px-4 py-3 flex justify-between">
                    <span className="text-foreground font-bold">{userName}</span>
                    <span className="text-destructive font-black">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
