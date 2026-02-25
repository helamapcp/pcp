import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useProducts, useStockSnapshots, useInventoryLogs, type Sector } from '@/hooks/useSupabaseData';
import { LogOut, BarChart3, ArrowLeftRight, PackageOpen, ScrollText } from 'lucide-react';

const SECTORS: Sector[] = ['CD', 'Fábrica', 'PMP', 'PCP'];

export default function EstoqueManagerPage() {
  const [, setLocation] = useLocation();
  const { user, signOut } = useAuth();
  const { products } = useProducts();
  const { snapshots, getSectorTotalKg, getProductTotalKgAllSectors } = useStockSnapshots();
  const { logs } = useInventoryLogs();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'movements' | 'transfers' | 'inbound' | 'audit'>('dashboard');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string | null>(null);

  const handleLogout = async () => {
    await signOut();
    setLocation('/login');
  };

  if (!user || user.role !== 'gerente') {
    setLocation('/login');
    return null;
  }

  const today = new Date().toDateString();
  const todayLogs = logs.filter(l => new Date(l.created_at).toDateString() === today);
  const todayMovements = todayLogs.filter(l => l.action_type === 'stock_count');
  const todayTransfers = todayLogs.filter(l => l.action_type === 'transfer');
  const todayInbounds = todayLogs.filter(l => l.action_type === 'inbound');

  const getFilteredMetrics = () => {
    if (!selectedProductFilter) {
      return {
        totalProducts: products.length,
        totalMovements: todayMovements.length,
        totalTransfers: todayTransfers.length,
        totalInbounds: todayInbounds.length,
      };
    }
    return {
      totalProducts: 1,
      totalMovements: todayMovements.filter(m => m.product_id === selectedProductFilter).length,
      totalTransfers: todayTransfers.filter(t => t.product_id === selectedProductFilter).length,
      totalInbounds: todayInbounds.filter(i => i.product_id === selectedProductFilter).length,
    };
  };

  const filteredMetrics = getFilteredMetrics();

  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
    { id: 'movements' as const, label: 'Movimentações', icon: ArrowLeftRight },
    { id: 'transfers' as const, label: 'Transferências', icon: PackageOpen },
    { id: 'inbound' as const, label: 'Entradas', icon: PackageOpen },
    { id: 'audit' as const, label: 'Auditoria', icon: ScrollText },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
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
      </div>

      {/* Tabs */}
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

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="bg-card border-2 border-border rounded-lg p-4">
              <label className="block text-foreground text-sm font-bold mb-3">Filtrar por Produto</label>
              <select value={selectedProductFilter || ''} onChange={(e) => setSelectedProductFilter(e.target.value || null)}
                className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground font-semibold touch-target">
                <option value="">Todos os Produtos</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {SECTORS.map(sector => {
                let totalKg = getSectorTotalKg(sector);
                if (selectedProductFilter) {
                  const snap = snapshots.find(s => s.product_id === selectedProductFilter && s.sector === sector);
                  totalKg = snap ? Number(snap.total_kg) : 0;
                }
                return (
                  <div key={sector} className="bg-card border-2 border-border rounded-lg p-4 md:p-6">
                    <p className="text-muted-foreground text-xs font-bold mb-2">{sector}</p>
                    <p className="text-foreground text-2xl md:text-3xl font-black">{(totalKg / 1000).toFixed(1)}t</p>
                    <p className="text-muted-foreground text-xs mt-1">{totalKg.toLocaleString()} kg</p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'PRODUTOS', value: filteredMetrics.totalProducts },
                { label: 'CONTAGENS HOJE', value: filteredMetrics.totalMovements },
                { label: 'TRANSFERÊNCIAS', value: filteredMetrics.totalTransfers },
                { label: 'ENTRADAS', value: filteredMetrics.totalInbounds },
              ].map(stat => (
                <div key={stat.label} className="bg-card border-2 border-border rounded-lg p-4 md:p-6">
                  <p className="text-muted-foreground text-xs font-bold mb-2">{stat.label}</p>
                  <p className="text-foreground text-2xl md:text-3xl font-black">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-card border-2 border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-secondary border-b-2 border-border">
                <h3 className="text-foreground font-bold text-lg">Estoque Atual por Setor</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary border-b-2 border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-foreground font-bold">Produto</th>
                      {SECTORS.map(sector => (
                        <th key={sector} className="px-4 py-3 text-right text-foreground font-bold">{sector}</th>
                      ))}
                      <th className="px-4 py-3 text-right font-bold text-industrial-success">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {products.map(product => (
                      <tr key={product.id} className="hover:bg-secondary/50 transition-colors">
                        <td className="px-4 py-3 text-foreground font-semibold text-sm">{product.name}</td>
                        {SECTORS.map(sector => {
                          const snap = snapshots.find(s => s.product_id === product.id && s.sector === sector);
                          return (
                            <td key={sector} className="px-4 py-3 text-right text-foreground font-bold">
                              {snap ? `${Number(snap.total_kg)}kg` : '-'}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-right text-industrial-success font-black">
                          {getProductTotalKgAllSectors(product.id)}kg
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'movements' && (
          <div className="bg-card border-2 border-border rounded-lg overflow-hidden">
            {todayMovements.length === 0 ? (
              <div className="px-6 py-12 text-center text-muted-foreground"><p>Nenhuma movimentação registrada hoje.</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary border-b-2 border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-foreground font-bold">Hora</th>
                      <th className="px-4 py-3 text-left text-foreground font-bold">Produto</th>
                      <th className="px-4 py-3 text-left text-foreground font-bold">Setor</th>
                      <th className="px-4 py-3 text-right text-foreground font-bold">Qtd</th>
                      <th className="px-4 py-3 text-left text-foreground font-bold">Responsável</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {todayMovements.map(mov => (
                      <tr key={mov.id} className="hover:bg-secondary/50 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(mov.created_at).toLocaleTimeString('pt-BR')}</td>
                        <td className="px-4 py-3 text-foreground text-sm">{mov.product_name}</td>
                        <td className="px-4 py-3 text-foreground text-sm font-bold">{mov.to_sector}</td>
                        <td className="px-4 py-3 text-right text-foreground font-bold">{mov.quantity}</td>
                        <td className="px-4 py-3 text-foreground text-sm font-semibold">{mov.user_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'transfers' && (
          <div className="bg-card border-2 border-border rounded-lg overflow-hidden">
            {todayTransfers.length === 0 ? (
              <div className="px-6 py-12 text-center text-muted-foreground"><p>Nenhuma transferência registrada hoje.</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary border-b-2 border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-foreground font-bold">Hora</th>
                      <th className="px-4 py-3 text-left text-foreground font-bold">Produto</th>
                      <th className="px-4 py-3 text-left text-foreground font-bold">De</th>
                      <th className="px-4 py-3 text-left text-foreground font-bold">Para</th>
                      <th className="px-4 py-3 text-right text-foreground font-bold">Qtd</th>
                      <th className="px-4 py-3 text-left text-foreground font-bold">Responsável</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {todayTransfers.map(t => (
                      <tr key={t.id} className="hover:bg-secondary/50 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(t.created_at).toLocaleTimeString('pt-BR')}</td>
                        <td className="px-4 py-3 text-foreground text-sm">{t.product_name}</td>
                        <td className="px-4 py-3 text-foreground text-sm font-bold">{t.from_sector}</td>
                        <td className="px-4 py-3 text-foreground text-sm font-bold">{t.to_sector}</td>
                        <td className="px-4 py-3 text-right text-foreground font-bold">{t.quantity} sacos</td>
                        <td className="px-4 py-3 text-foreground text-sm font-semibold">{t.user_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'inbound' && (
          <div className="bg-card border-2 border-border rounded-lg overflow-hidden">
            {todayInbounds.length === 0 ? (
              <div className="px-6 py-12 text-center text-muted-foreground"><p>Nenhuma entrada registrada hoje.</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary border-b-2 border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-foreground font-bold">Hora</th>
                      <th className="px-4 py-3 text-left text-foreground font-bold">Produto</th>
                      <th className="px-4 py-3 text-right text-foreground font-bold">Quantidade</th>
                      <th className="px-4 py-3 text-left text-foreground font-bold">Responsável</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {todayInbounds.map(inbound => (
                      <tr key={inbound.id} className="hover:bg-secondary/50 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(inbound.created_at).toLocaleTimeString('pt-BR')}</td>
                        <td className="px-4 py-3 text-foreground text-sm">{inbound.product_name}</td>
                        <td className="px-4 py-3 text-right text-foreground font-bold">{inbound.quantity}</td>
                        <td className="px-4 py-3 text-foreground text-sm font-semibold">{inbound.user_name}</td>
                      </tr>
                    ))}
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
              <p className="text-muted-foreground text-xs">Registro completo de todas as ações do sistema</p>
            </div>
            {logs.length === 0 ? (
              <div className="px-6 py-12 text-center text-muted-foreground"><p>Nenhuma ação registrada ainda.</p></div>
            ) : (
              <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                {logs.map(entry => (
                  <div key={entry.id} className="px-4 py-3 hover:bg-secondary/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground text-sm font-semibold truncate">{entry.notes || entry.action_type}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-primary text-xs font-bold">👤 {entry.user_name}</span>
                          <span className="text-muted-foreground text-xs">{new Date(entry.created_at).toLocaleString('pt-BR')}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${
                        entry.action_type === 'transfer' ? 'bg-primary/20 text-primary' :
                        entry.action_type === 'inbound' ? 'bg-industrial-success/20 text-industrial-success' :
                        entry.action_type === 'stock_count' ? 'bg-industrial-warning/20 text-industrial-warning' :
                        entry.action_type === 'separation_complete' ? 'bg-industrial-success/20 text-industrial-success' :
                        'bg-secondary text-secondary-foreground'
                      }`}>
                        {entry.action_type === 'transfer' ? 'Transferência' :
                         entry.action_type === 'inbound' ? 'Entrada' :
                         entry.action_type === 'stock_count' ? 'Contagem' :
                         entry.action_type === 'separation_complete' ? 'Separação' :
                         entry.action_type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
