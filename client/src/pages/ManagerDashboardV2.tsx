import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useIndustrialProducts, useStock, useStockMovements, useTransfers } from '@/hooks/useIndustrialData';
import { LogOut, BarChart3, ArrowLeftRight, ScrollText, Package } from 'lucide-react';

const LOCATIONS = ['CD', 'PCP', 'PMP', 'FABRICA'] as const;

export default function ManagerDashboardV2() {
  const [, setLocation] = useLocation();
  const { user, signOut } = useAuth();
  const { products } = useIndustrialProducts();
  const { stock, getStock, getLocationTotalKg } = useStock();
  const { movements } = useStockMovements();
  const { transfers } = useTransfers();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'movements' | 'transfers' | 'audit'>('dashboard');

  const handleLogout = async () => {
    await signOut();
    setLocation('/login');
  };

  if (!user || user.role !== 'gerente') {
    setLocation('/login');
    return null;
  }

  const today = new Date().toDateString();
  const todayMovements = movements.filter(m => new Date(m.created_at).toDateString() === today);

  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
    { id: 'movements' as const, label: 'Movimentações', icon: Package },
    { id: 'transfers' as const, label: 'Transferências', icon: ArrowLeftRight },
    { id: 'audit' as const, label: 'Auditoria', icon: ScrollText },
  ];

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
          <div className="space-y-6">
            {/* Location totals */}
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

            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'PRODUTOS', value: products.length },
                { label: 'MOVIMENTAÇÕES HOJE', value: todayMovements.length },
                { label: 'TRANSFERÊNCIAS PENDENTES', value: transfers.filter(t => t.status === 'pending').length },
                { label: 'TRANSFERÊNCIAS CONCLUÍDAS', value: transfers.filter(t => t.status === 'completed').length },
              ].map(stat => (
                <div key={stat.label} className="bg-card border-2 border-border rounded-lg p-4 md:p-6">
                  <p className="text-muted-foreground text-xs font-bold mb-2">{stat.label}</p>
                  <p className="text-foreground text-2xl md:text-3xl font-black">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Stock table */}
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
                    {products.map(product => {
                      const total = LOCATIONS.reduce((sum, loc) => {
                        const s = getStock(product.id, loc);
                        return sum + Number(s?.total_kg || 0);
                      }, 0);
                      return (
                        <tr key={product.id} className="hover:bg-secondary/50 transition-colors">
                          <td className="px-4 py-3 text-foreground font-semibold text-sm">{product.name}</td>
                          {LOCATIONS.map(loc => {
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
                      <th className="px-4 py-3 text-right text-foreground font-bold">Qtd</th>
                      <th className="px-4 py-3 text-left text-foreground font-bold">Notas</th>
                      <th className="px-4 py-3 text-left text-foreground font-bold">Responsável</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {movements.slice(0, 100).map(m => (
                      <tr key={m.id} className="hover:bg-secondary/50 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(m.created_at).toLocaleString('pt-BR')}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            m.movement_type === 'entry' ? 'bg-industrial-success/20 text-industrial-success' :
                            m.movement_type === 'transfer_out' ? 'bg-destructive/20 text-destructive' :
                            m.movement_type === 'transfer_in' ? 'bg-primary/20 text-primary' :
                            'bg-secondary text-secondary-foreground'
                          }`}>
                            {m.movement_type === 'entry' ? 'Entrada' :
                             m.movement_type === 'transfer_out' ? 'Saída' :
                             m.movement_type === 'transfer_in' ? 'Recebimento' :
                             m.movement_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-foreground font-bold text-sm">{m.location_code}</td>
                        <td className="px-4 py-3 text-right text-foreground font-bold">{m.quantity} {m.unit}</td>
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
                      <p className="text-muted-foreground text-xs">
                        {t.requested_by_name} • {new Date(t.created_at).toLocaleString('pt-BR')}
                      </p>
                      {t.confirmed_by_name && (
                        <p className="text-muted-foreground text-xs mt-1">
                          Confirmado por {t.confirmed_by_name}
                        </p>
                      )}
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
                    <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${
                      m.movement_type === 'entry' ? 'bg-industrial-success/20 text-industrial-success' :
                      m.movement_type.includes('transfer') ? 'bg-primary/20 text-primary' :
                      'bg-secondary text-secondary-foreground'
                    }`}>
                      {m.location_code} • {m.quantity} {m.unit}
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
