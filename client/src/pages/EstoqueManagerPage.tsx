import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useEstoque } from '@/contexts/EstoqueContext';
import { useUserManagement } from '@/contexts/UserManagementContext';
import { LogOut, BarChart3, ArrowLeftRight, PackageOpen, ScrollText } from 'lucide-react';
import type { Sector } from '@/contexts/EstoqueContext';

const SECTORS: Sector[] = ['CD', 'Fábrica', 'PMP', 'PCP'];

export default function EstoqueManagerPage() {
  const [, setLocation] = useLocation();
  const { currentUser, setCurrentUser } = useUserManagement();
  const { products, stockCounts, getSectorTotalKg, getTodayMovements, getTodayTransfers, getTodayInboundReceivings, getProductTotalKgAllSectors, auditLog } = useEstoque();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'movements' | 'transfers' | 'inbound' | 'audit'>('dashboard');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string | null>(null);

  const handleLogout = () => {
    setCurrentUser(null);
    setLocation('/login');
  };

  if (!currentUser || currentUser.role !== 'gerente') {
    setLocation('/login');
    return null;
  }

  const todayMovements = getTodayMovements();
  const todayTransfers = getTodayTransfers();
  const todayInbounds = getTodayInboundReceivings();

  const getFilteredKPIMetrics = () => {
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
      totalMovements: todayMovements.filter(m => m.productId === selectedProductFilter).length,
      totalTransfers: todayTransfers.filter(t => t.productId === selectedProductFilter).length,
      totalInbounds: todayInbounds.filter(i => i.productId === selectedProductFilter).length,
    };
  };

  const filteredMetrics = getFilteredKPIMetrics();

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
            <p className="text-muted-foreground text-sm">{currentUser.name} • Dashboard Analítico</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-3 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-colors touch-target"
            title="Sair"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-border bg-card/50 px-2 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-bold transition-colors whitespace-nowrap touch-target text-sm ${
                activeTab === tab.id
                  ? 'text-primary border-b-3 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
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
            {/* Product Filter */}
            <div className="bg-card border-2 border-border rounded-lg p-4">
              <label className="block text-foreground text-sm font-bold mb-3">Filtrar por Produto</label>
              <select
                value={selectedProductFilter || ''}
                onChange={(e) => setSelectedProductFilter(e.target.value || null)}
                className="w-full px-4 py-3 bg-input border-2 border-border rounded-lg text-foreground font-semibold touch-target"
              >
                <option value="">Todos os Produtos</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </div>

            {/* KPI Cards by Sector */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {SECTORS.map(sector => {
                let totalKg = getSectorTotalKg(sector);
                if (selectedProductFilter) {
                  const count = stockCounts.find(s => s.productId === selectedProductFilter && s.sector === sector);
                  totalKg = count?.totalKg || 0;
                }
                return (
                  <div key={sector} className="bg-card border-2 border-border rounded-lg p-4 md:p-6">
                    <p className="text-muted-foreground text-xs font-bold mb-2">{sector}</p>
                    <p className="text-foreground text-2xl md:text-3xl font-black">
                      {(totalKg / 1000).toFixed(1)}t
                    </p>
                    <p className="text-muted-foreground text-xs mt-1">{totalKg.toLocaleString()} kg</p>
                  </div>
                );
              })}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'PRODUTOS', value: filteredMetrics.totalProducts },
                { label: 'MOVIMENTOS HOJE', value: filteredMetrics.totalMovements },
                { label: 'TRANSFERÊNCIAS', value: filteredMetrics.totalTransfers },
                { label: 'ENTRADAS', value: filteredMetrics.totalInbounds },
              ].map(stat => (
                <div key={stat.label} className="bg-card border-2 border-border rounded-lg p-4 md:p-6">
                  <p className="text-muted-foreground text-xs font-bold mb-2">{stat.label}</p>
                  <p className="text-foreground text-2xl md:text-3xl font-black">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Current Stock by Product */}
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
                          const count = stockCounts.find(s => s.productId === product.id && s.sector === sector);
                          return (
                            <td key={sector} className="px-4 py-3 text-right text-foreground font-bold">
                              {count ? `${count.totalKg}kg` : '-'}
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
              <div className="px-6 py-12 text-center text-muted-foreground">
                <p>Nenhuma movimentação registrada hoje.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary border-b-2 border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-foreground font-bold">Hora</th>
                      <th className="px-4 py-3 text-left text-foreground font-bold">Produto</th>
                      <th className="px-4 py-3 text-left text-foreground font-bold">Setor</th>
                      <th className="px-4 py-3 text-right text-foreground font-bold">Anterior</th>
                      <th className="px-4 py-3 text-right text-foreground font-bold">Atual</th>
                      <th className="px-4 py-3 text-right text-foreground font-bold">Delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {todayMovements.map(mov => (
                      <tr key={mov.id} className="hover:bg-secondary/50 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {new Date(mov.timestamp).toLocaleTimeString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-foreground text-sm">{mov.productName}</td>
                        <td className="px-4 py-3 text-foreground text-sm font-bold">{mov.sector}</td>
                        <td className="px-4 py-3 text-right text-foreground font-bold">{mov.previousQuantity}</td>
                        <td className="px-4 py-3 text-right text-foreground font-bold">{mov.currentQuantity}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            mov.type === 'in'
                              ? 'bg-industrial-success/20 text-industrial-success'
                              : 'bg-destructive/20 text-destructive'
                          }`}>
                            {mov.type === 'in' ? '+' : '-'}{Math.abs(mov.movementKg)}kg
                          </span>
                        </td>
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
              <div className="px-6 py-12 text-center text-muted-foreground">
                <p>Nenhuma transferência registrada hoje.</p>
              </div>
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
                    {todayTransfers.map(transfer => (
                      <tr key={transfer.id} className="hover:bg-secondary/50 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {new Date(transfer.timestamp).toLocaleTimeString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-foreground text-sm">{transfer.productName}</td>
                        <td className="px-4 py-3 text-foreground text-sm font-bold">{transfer.from}</td>
                        <td className="px-4 py-3 text-foreground text-sm font-bold">{transfer.to}</td>
                        <td className="px-4 py-3 text-right text-foreground font-bold">{transfer.quantity} sacos</td>
                        <td className="px-4 py-3 text-foreground text-sm font-semibold">{transfer.operator}</td>
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
              <div className="px-6 py-12 text-center text-muted-foreground">
                <p>Nenhuma entrada registrada hoje.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary border-b-2 border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-foreground font-bold">Hora</th>
                      <th className="px-4 py-3 text-left text-foreground font-bold">Produto</th>
                      <th className="px-4 py-3 text-right text-foreground font-bold">Quantidade</th>
                      <th className="px-4 py-3 text-right text-foreground font-bold">Total (kg)</th>
                      <th className="px-4 py-3 text-left text-foreground font-bold">Responsável</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {todayInbounds.map(inbound => (
                      <tr key={inbound.id} className="hover:bg-secondary/50 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {new Date(inbound.timestamp).toLocaleTimeString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-foreground text-sm">{inbound.productName}</td>
                        <td className="px-4 py-3 text-right text-foreground font-bold">
                          {inbound.quantity} {inbound.unit === 'units' ? 'sacos' : 'kg'}
                        </td>
                        <td className="px-4 py-3 text-right text-foreground font-bold">{inbound.totalKg}kg</td>
                        <td className="px-4 py-3 text-foreground text-sm font-semibold">{inbound.operator}</td>
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
            {auditLog.length === 0 ? (
              <div className="px-6 py-12 text-center text-muted-foreground">
                <p>Nenhuma ação registrada ainda.</p>
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                {auditLog.map(entry => (
                  <div key={entry.id} className="px-4 py-3 hover:bg-secondary/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground text-sm font-semibold truncate">{entry.description}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-primary text-xs font-bold">👤 {entry.user}</span>
                          <span className="text-muted-foreground text-xs">
                            {new Date(entry.timestamp).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${
                        entry.action === 'transfer' ? 'bg-primary/20 text-primary' :
                        entry.action === 'inbound' ? 'bg-industrial-success/20 text-industrial-success' :
                        entry.action === 'stock_count' ? 'bg-industrial-warning/20 text-industrial-warning' :
                        entry.action === 'separation_complete' ? 'bg-industrial-success/20 text-industrial-success' :
                        'bg-secondary text-secondary-foreground'
                      }`}>
                        {entry.action === 'transfer' ? 'Transferência' :
                         entry.action === 'inbound' ? 'Entrada' :
                         entry.action === 'stock_count' ? 'Contagem' :
                         entry.action === 'separation_complete' ? 'Separação' :
                         entry.action === 'weight_update' ? 'Peso' :
                         entry.action === 'product_add' ? 'Produto+' :
                         entry.action === 'product_delete' ? 'Produto-' :
                         entry.action}
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
