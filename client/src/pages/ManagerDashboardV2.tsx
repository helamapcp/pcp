import React, { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useIndustrialProducts, useStock, useStockMovements, useTransfers } from '@/hooks/useIndustrialData';
import { useProductionOrders, useProductionBatches } from '@/hooks/useProductionData';
import { useStockAdjustments } from '@/hooks/useInventoryCounting';
import { LogOut, BarChart3, ArrowLeftRight, ScrollText, Package, Factory, Layers, Scale, TrendingUp, AlertTriangle } from 'lucide-react';

const LOCATIONS = ['CD', 'PCP', 'PMP', 'FABRICA'] as const;

// ── Dashboard KPIs Component ──
function DashboardKPIs({ products, stock, getStock, getLocationTotalKg, movements, transfers, batches, adjustments, productionOrders }: any) {
  const today = new Date().toDateString();
  const todayMovements = movements.filter((m: any) => new Date(m.created_at).toDateString() === today);

  // KPI: Divergência média de inventário
  const avgDivergence = useMemo(() => {
    if (adjustments.length === 0) return 0;
    const invAdj = adjustments.filter((a: any) => a.reference_type === 'inventory_count');
    if (invAdj.length === 0) return 0;
    const totalDiff = invAdj.reduce((s: number, a: any) => s + Math.abs(Number(a.difference_kg)), 0);
    return totalDiff / invAdj.length;
  }, [adjustments]);

  // KPI: Consumo por máquina
  const consumptionByMachine = useMemo(() => {
    const map: Record<string, number> = {};
    productionOrders.forEach((po: any) => {
      if (po.status === 'confirmed') {
        map[po.machine] = (map[po.machine] || 0) + Number(po.total_compound_kg);
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [productionOrders]);

  // KPI: Admin adjustments
  const adminAdjustments = useMemo(() => {
    return adjustments.filter((a: any) => a.reference_type === 'admin_adjustment');
  }, [adjustments]);

  return (
    <div className="space-y-6">
      {/* Stock by location */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {LOCATIONS.map(loc => {
          const totalKg = getLocationTotalKg(loc);
          return (
            <div key={loc} className="bg-card border-2 border-border rounded-lg p-4 md:p-6">
              <p className="text-muted-foreground text-xs font-bold mb-2">{loc}</p>
              <p className="text-foreground text-2xl md:text-3xl font-black">{(totalKg / 1000).toFixed(1)}t</p>
              <p className="text-muted-foreground text-xs mt-1">{totalKg.toLocaleString()} kg</p>
            </div>
          );
        })}
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'PRODUTOS', value: products.length, icon: '📦' },
          { label: 'MOVIMENTAÇÕES HOJE', value: todayMovements.length, icon: '📊' },
          { label: 'LOTES PRODUZIDOS', value: batches.filter((b: any) => b.status === 'completed').length, icon: '🏭' },
          { label: 'TRANSFERÊNCIAS', value: transfers.filter((t: any) => t.status === 'completed').length, icon: '🔄' },
        ].map(stat => (
          <div key={stat.label} className="bg-card border-2 border-border rounded-lg p-4 md:p-6">
            <p className="text-muted-foreground text-xs font-bold mb-2">{stat.icon} {stat.label}</p>
            <p className="text-foreground text-2xl md:text-3xl font-black">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Industrial KPIs row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Inventory divergence */}
        <div className="bg-card border-2 border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <p className="text-foreground font-bold text-sm">Divergência Média Inventário</p>
          </div>
          <p className={`text-2xl font-black ${avgDivergence > 10 ? 'text-destructive' : avgDivergence > 1 ? 'text-industrial-warning' : 'text-industrial-success'}`}>
            {avgDivergence.toFixed(2)} kg
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            {adjustments.filter((a: any) => a.reference_type === 'inventory_count').length} contagens realizadas
          </p>
        </div>

        {/* Consumption by machine */}
        <div className="bg-card border-2 border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Factory className="w-4 h-4 text-primary" />
            <p className="text-foreground font-bold text-sm">Consumo por Misturador</p>
          </div>
          {consumptionByMachine.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sem dados</p>
          ) : (
            <div className="space-y-2">
              {consumptionByMachine.slice(0, 4).map(([machine, kg]) => (
                <div key={machine} className="flex justify-between items-center">
                  <span className="text-foreground text-sm font-semibold">{machine}</span>
                  <span className="text-primary font-black text-sm">{(kg / 1000).toFixed(1)}t</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Admin adjustments */}
        <div className="bg-card border-2 border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-industrial-warning" />
            <p className="text-foreground font-bold text-sm">Ajustes Administrativos</p>
          </div>
          <p className={`text-2xl font-black ${adminAdjustments.length > 10 ? 'text-destructive' : 'text-foreground'}`}>
            {adminAdjustments.length}
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            {adminAdjustments.length > 0
              ? `Última: ${new Date(adminAdjustments[0]?.created_at).toLocaleDateString('pt-BR')}`
              : 'Nenhum ajuste manual'}
          </p>
        </div>
      </div>

      {/* Stock by location table */}
      <div className="bg-card border-2 border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-secondary border-b-2 border-border">
          <h3 className="text-foreground font-bold text-lg">Estoque por Local</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary border-b-2 border-border">
              <tr>
                <th className="px-4 py-3 text-left text-foreground font-bold">Produto</th>
                {LOCATIONS.map(loc => (
                  <th key={loc} className="px-4 py-3 text-right text-foreground font-bold">{loc}</th>
                ))}
                <th className="px-4 py-3 text-right font-bold text-industrial-success">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((product: any) => {
                const total = LOCATIONS.reduce((sum, loc) => {
                  const s = getStock(product.id, loc);
                  return sum + Number(s?.total_kg || 0);
                }, 0);
                if (total === 0) return null;
                return (
                  <tr key={product.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-4 py-3 text-foreground font-semibold text-sm">{product.name}</td>
                    {LOCATIONS.map((loc: string) => {
                      const s = getStock(product.id, loc);
                      return (
                        <td key={loc} className="px-4 py-3 text-right text-foreground font-bold">
                          {s ? `${Number(s.total_kg).toFixed(1)} kg` : '-'}
                        </td>
                      );
                    })}
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


export default function ManagerDashboardV2() {
  const [, setLocation] = useLocation();
  const { user, signOut } = useAuth();
  const { products } = useIndustrialProducts();
  const { stock, getStock, getLocationTotalKg } = useStock();
  const { movements } = useStockMovements();
  const { transfers } = useTransfers();
  const { orders: productionOrders } = useProductionOrders();
  const { batches } = useProductionBatches();
  const { adjustments } = useStockAdjustments();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'movements' | 'transfers' | 'production' | 'batches' | 'adjustments' | 'audit'>('dashboard');

  const handleLogout = async () => {
    await signOut();
    setLocation('/login');
  };

  if (!user || user.role !== 'gerente') {
    setLocation('/login');
    return null;
  }




  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
    { id: 'movements' as const, label: 'Movimentações', icon: Package },
    { id: 'transfers' as const, label: 'Transferências', icon: ArrowLeftRight },
    { id: 'production' as const, label: 'Produção', icon: Factory },
    { id: 'batches' as const, label: 'Lotes', icon: Layers },
    { id: 'adjustments' as const, label: 'Ajustes', icon: Scale },
    { id: 'audit' as const, label: 'Auditoria', icon: ScrollText },
  ];

  const handleOpenExecutive = () => setLocation('/dashboard/executive');

  const movementTypeLabel = (t: string) => {
    const map: Record<string, string> = {
      entry: 'Entrada', transfer_out: 'Saída', transfer_in: 'Recebimento',
      production_out: 'Prod. Saída', production_in: 'Prod. Entrada',
      factory_out: 'Envio Fábrica', factory_in: 'Receb. Fábrica',
    };
    return map[t] || t;
  };

  const movementTypeColor = (t: string) => {
    if (t === 'entry' || t === 'transfer_in' || t === 'production_in' || t === 'factory_in')
      return 'bg-industrial-success/20 text-industrial-success';
    if (t === 'transfer_out' || t === 'production_out' || t === 'factory_out')
      return 'bg-destructive/20 text-destructive';
    return 'bg-secondary text-secondary-foreground';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-card border-b-2 border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground">📊 Gerente</h1>
            <p className="text-muted-foreground text-sm">{user.fullName} • Dashboard Analítico</p>
          </div>
          <button onClick={handleLogout} className="p-3 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-colors touch-target" title="Sair">
            <LogOut className="w-6 h-6" />
          </button>
        </div>
        <div className="px-4 pb-2">
          <button onClick={handleOpenExecutive} className="px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold">
            📊 Dashboard Executivo
          </button>
        </div>
      </div>

      <div className="flex border-b-2 border-border bg-card/50 px-2 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-bold transition-colors whitespace-nowrap touch-target text-sm ${
                activeTab === tab.id ? 'text-primary border-b-3 border-primary' : 'text-muted-foreground hover:text-foreground'
              }`}>
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full">
        {activeTab === 'dashboard' && (
          <DashboardKPIs
            products={products}
            stock={stock}
            getStock={getStock}
            getLocationTotalKg={getLocationTotalKg}
            movements={movements}
            transfers={transfers}
            batches={batches}
            adjustments={adjustments}
            productionOrders={productionOrders}
          />
        )}

        {activeTab === 'movements' && (
          <div className="bg-card border-2 border-border rounded-lg overflow-hidden">
            {movements.length === 0 ? (
              <div className="px-6 py-12 text-center text-muted-foreground"><p>Nenhuma movimentação registrada.</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary border-b-2 border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-foreground font-bold">Data/Hora</th>
                      <th className="px-4 py-3 text-left text-foreground font-bold">Tipo</th>
                      <th className="px-4 py-3 text-left text-foreground font-bold">Local</th>
                      <th className="px-4 py-3 text-right text-foreground font-bold">Qtd (kg)</th>
                      <th className="px-4 py-3 text-left text-foreground font-bold">Notas</th>
                      <th className="px-4 py-3 text-left text-foreground font-bold">Responsável</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {movements.slice(0, 100).map(m => (
                      <tr key={m.id} className="hover:bg-secondary/50 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(m.created_at).toLocaleString('pt-BR')}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${movementTypeColor(m.movement_type)}`}>
                            {movementTypeLabel(m.movement_type)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-foreground font-bold text-sm">{m.location_code}</td>
                        <td className="px-4 py-3 text-right text-foreground font-bold">{Number(m.total_kg).toFixed(1)}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-[200px]">{m.notes}</td>
                        <td className="px-4 py-3 text-foreground text-sm">{m.user_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'transfers' && (
          <div className="space-y-4">
            {transfers.length === 0 ? (
              <div className="bg-card border-2 border-border rounded-lg px-6 py-12 text-center text-muted-foreground">
                <p>Nenhuma transferência registrada.</p>
              </div>
            ) : (
              transfers.slice(0, 50).map(t => (
                <div key={t.id} className={`bg-card border-2 ${t.status === 'pending' ? 'border-industrial-warning' : 'border-border'} rounded-lg p-4`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-foreground font-bold">{t.from_location} → {t.to_location}</p>
                      <p className="text-muted-foreground text-xs">{t.requested_by_name} • {new Date(t.created_at).toLocaleString('pt-BR')}</p>
                      {t.notes && <p className="text-muted-foreground text-xs mt-1 truncate max-w-[400px]">{t.notes}</p>}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      t.status === 'pending' ? 'bg-industrial-warning/20 text-industrial-warning' :
                      t.status === 'completed' ? 'bg-industrial-success/20 text-industrial-success' :
                      'bg-secondary text-secondary-foreground'
                    }`}>
                      {t.status === 'pending' ? 'Pendente' : t.status === 'completed' ? 'Concluída' : t.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'production' && (
          <div className="space-y-4">
            {productionOrders.length === 0 ? (
              <div className="bg-card border-2 border-border rounded-lg px-6 py-12 text-center text-muted-foreground">
                <p>Nenhuma ordem de produção registrada.</p>
              </div>
            ) : (
              productionOrders.map(po => (
                <div key={po.id} className={`bg-card border-2 ${po.status === 'confirmed' ? 'border-industrial-success' : 'border-border'} rounded-lg p-4`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-foreground font-bold">{po.final_product} • {po.machine}</p>
                      <p className="text-muted-foreground text-xs">
                        {po.batches} batidas × {po.weight_per_batch}kg = {Number(po.total_compound_kg).toFixed(1)}kg
                      </p>
                      <p className="text-muted-foreground text-xs mt-1">
                        {po.created_by_name} • {new Date(po.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      po.status === 'confirmed' ? 'bg-industrial-success/20 text-industrial-success' : 'bg-industrial-warning/20 text-industrial-warning'
                    }`}>
                      {po.status === 'confirmed' ? 'Confirmada' : po.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'batches' && (
          <div className="space-y-4">
            <div className="bg-card border-2 border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-secondary border-b-2 border-border">
                <h3 className="text-foreground font-bold text-lg">🏭 Lotes de Produção</h3>
                <p className="text-muted-foreground text-xs">Rastreabilidade completa de cada lote</p>
              </div>
              {batches.length === 0 ? (
                <div className="px-6 py-12 text-center text-muted-foreground"><p>Nenhum lote registrado.</p></div>
              ) : (
                <div className="divide-y divide-border">
                  {batches.map(b => (
                    <div key={b.id} className="p-4 hover:bg-secondary/50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-primary font-black text-sm">{b.batch_code || b.id.slice(0, 8)}</p>
                          <p className="text-foreground font-bold text-sm mt-1">
                            {b.final_product} • {b.machine}
                          </p>
                          <p className="text-muted-foreground text-xs mt-1">
                            {b.batches} batidas • {Number(b.total_compound_kg).toFixed(1)}kg composto
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {b.produced_by_name} • {b.completed_at ? new Date(b.completed_at).toLocaleString('pt-BR') : ''}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          b.status === 'completed' ? 'bg-industrial-success/20 text-industrial-success' : 'bg-industrial-warning/20 text-industrial-warning'
                        }`}>
                          {b.status === 'completed' ? 'Concluído' : b.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'adjustments' && (
          <div className="bg-card border-2 border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-secondary border-b-2 border-border">
              <h3 className="text-foreground font-bold text-lg">⚖️ Ajustes de Estoque</h3>
              <p className="text-muted-foreground text-xs">Contagens de inventário e ajustes manuais</p>
            </div>
            {adjustments.length === 0 ? (
              <div className="px-6 py-12 text-center text-muted-foreground"><p>Nenhum ajuste registrado.</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary border-b-2 border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-foreground font-bold">Data</th>
                      <th className="px-4 py-3 text-left text-foreground font-bold">Local</th>
                      <th className="px-4 py-3 text-right text-foreground font-bold">Anterior (kg)</th>
                      <th className="px-4 py-3 text-right text-foreground font-bold">Novo (kg)</th>
                      <th className="px-4 py-3 text-right text-foreground font-bold">Diferença</th>
                      <th className="px-4 py-3 text-left text-foreground font-bold">Motivo</th>
                      <th className="px-4 py-3 text-left text-foreground font-bold">Responsável</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {adjustments.slice(0, 100).map(a => {
                      const product = products.find(p => p.id === a.product_id);
                      return (
                        <tr key={a.id} className="hover:bg-secondary/50 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(a.created_at).toLocaleString('pt-BR')}</td>
                          <td className="px-4 py-3 text-foreground font-bold text-sm">
                            {product?.name || '—'} <span className="text-muted-foreground font-normal">({a.location_code})</span>
                          </td>
                          <td className="px-4 py-3 text-right text-foreground">{Number(a.old_total_kg).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-foreground font-bold">{Number(a.new_total_kg).toFixed(2)}</td>
                          <td className={`px-4 py-3 text-right font-bold ${Number(a.difference_kg) > 0 ? 'text-industrial-success' : 'text-destructive'}`}>
                            {Number(a.difference_kg) > 0 ? '+' : ''}{Number(a.difference_kg).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-[200px]">{a.reason || '—'}</td>
                          <td className="px-4 py-3 text-foreground text-sm">{a.user_name}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="bg-card border-2 border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-secondary border-b-2 border-border">
              <h3 className="text-foreground font-bold text-lg">📋 Trilha de Auditoria</h3>
              <p className="text-muted-foreground text-xs">Todas as movimentações do sistema</p>
            </div>
            <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
              {movements.map(m => (
                <div key={m.id} className="px-4 py-3 hover:bg-secondary/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm font-semibold truncate">{m.notes || m.movement_type}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-primary text-xs font-bold">👤 {m.user_name}</span>
                        <span className="text-muted-foreground text-xs">{new Date(m.created_at).toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${movementTypeColor(m.movement_type)}`}>
                      {m.location_code} • {Number(m.total_kg).toFixed(1)}kg
                    </span>
                  </div>
                </div>
              ))}
              {movements.length === 0 && (
                <div className="px-6 py-12 text-center text-muted-foreground"><p>Nenhuma ação registrada.</p></div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
