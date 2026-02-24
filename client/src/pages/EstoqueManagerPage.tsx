import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useEstoque } from '@/contexts/EstoqueContext';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { IndustrialButton } from '@/components/IndustrialButton';
import type { Sector } from '@/contexts/EstoqueContext';

const SECTORS: Sector[] = ['CD', 'Fábrica', 'PMP', 'PCP'];

export default function EstoqueManagerPage() {
  const [, setLocation] = useLocation();
  const { products, stockCounts, getSectorTotalKg, getTodayMovements, getTodayTransfers, getTodayInboundReceivings, getProductTotalKgAllSectors } = useEstoque();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'movements' | 'transfers' | 'inbound'>('dashboard');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string | null>(null);

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

    const product = products.find(p => p.id === selectedProductFilter);
    if (!product) return { totalProducts: 0, totalMovements: 0, totalTransfers: 0, totalInbounds: 0 };

    return {
      totalProducts: 1,
      totalMovements: todayMovements.filter(m => m.productId === selectedProductFilter).length,
      totalTransfers: todayTransfers.filter(t => t.productId === selectedProductFilter).length,
      totalInbounds: todayInbounds.filter(i => i.productId === selectedProductFilter).length,
    };
  };

  const filteredMetrics = getFilteredKPIMetrics();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-800/50 border-b-2 border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-white">🖥️ Gerente</h1>
            <p className="text-slate-300 text-sm">Dashboard & Configurações</p>
          </div>
          <button
            onClick={() => setLocation('/login')}
            className="p-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg transition-colors"
            title="Sair"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b-2 border-slate-700 bg-slate-800/30 px-4 overflow-x-auto">
        {(['dashboard', 'movements', 'transfers', 'inbound'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 font-bold transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'text-blue-400 border-b-3 border-blue-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            {tab === 'dashboard' && '📊 Dashboard'}
            {tab === 'movements' && '📈 Movimentações'}
            {tab === 'movements' && '📈 Movimentações'}
            {tab === 'transfers' && '🔄 Transferências'}
            {tab === 'inbound' && '📥 Entradas'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Product Filter */}
            <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg p-4">
              <label className="block text-white text-sm font-bold mb-3">Filtrar por Produto</label>
              <select
                value={selectedProductFilter || ''}
                onChange={(e) => setSelectedProductFilter(e.target.value || null)}
                className="w-full px-4 py-2 bg-slate-800 border-2 border-slate-600 rounded-lg text-white font-semibold"
              >
                <option value="">Todos os Produtos</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </div>

            {/* KPI Cards by Sector */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {SECTORS.map(sector => {
                let totalKg = getSectorTotalKg(sector);
                if (selectedProductFilter) {
                  const product = products.find(p => p.id === selectedProductFilter);
                  if (product) {
                    const count = stockCounts.find(s => s.productId === selectedProductFilter && s.sector === sector);
                    totalKg = count?.totalKg || 0;
                  }
                }
                return (
                  <div key={sector} className="bg-slate-700/50 border-2 border-slate-600 rounded-lg p-6">
                    <p className="text-slate-300 text-xs font-bold mb-2">{sector}</p>
                    <p className="text-white text-3xl font-black">
                      {(totalKg / 1000).toFixed(1)}t
                    </p>
                    <p className="text-slate-400 text-xs mt-2">{totalKg.toLocaleString()} kg</p>
                  </div>
                );
              })}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg p-6">
                <p className="text-slate-300 text-xs font-bold mb-2">PRODUTOS</p>
                <p className="text-white text-3xl font-black">{filteredMetrics.totalProducts}</p>
              </div>

              <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg p-6">
                <p className="text-slate-300 text-xs font-bold mb-2">MOVIMENTOS HOJE</p>
                <p className="text-white text-3xl font-black">{filteredMetrics.totalMovements}</p>
              </div>

              <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg p-6">
                <p className="text-slate-300 text-xs font-bold mb-2">TRANSFERÊNCIAS</p>
                <p className="text-white text-3xl font-black">{filteredMetrics.totalTransfers}</p>
              </div>

              <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg p-6">
                <p className="text-slate-300 text-xs font-bold mb-2">ENTRADAS</p>
                <p className="text-white text-3xl font-black">{filteredMetrics.totalInbounds}</p>
              </div>
            </div>

            {/* Current Stock by Product */}
            <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg overflow-hidden">
              <div className="px-6 py-4 bg-slate-800 border-b-2 border-slate-600">
                <h3 className="text-white font-bold text-lg">Estoque Atual por Setor</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800 border-b-2 border-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left text-white font-bold">Produto</th>
                      {SECTORS.map(sector => (
                        <th key={sector} className="px-4 py-3 text-right text-white font-bold">{sector}</th>
                      ))}
                      <th className="px-4 py-3 text-right text-white font-bold text-green-400">Total do Produto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-600">
                    {products.map(product => (
                      <tr key={product.id} className="hover:bg-slate-600/30 transition-colors">
                        <td className="px-4 py-3 text-white font-semibold text-sm">{product.name}</td>
                        {SECTORS.map(sector => {
                          const count = stockCounts.find(s => s.productId === product.id && s.sector === sector);
                          return (
                            <td key={sector} className="px-4 py-3 text-right text-white font-bold">
                              {count ? `${count.totalKg}kg` : '-'}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-right text-green-300 font-black">
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
          <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg overflow-hidden">
            {todayMovements.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-400">
                <p>Nenhuma movimentação registrada hoje.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800 border-b-2 border-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left text-white font-bold">Hora</th>
                      <th className="px-4 py-3 text-left text-white font-bold">Produto</th>
                      <th className="px-4 py-3 text-left text-white font-bold">Setor</th>
                      <th className="px-4 py-3 text-right text-white font-bold">Anterior</th>
                      <th className="px-4 py-3 text-right text-white font-bold">Atual</th>
                      <th className="px-4 py-3 text-right text-white font-bold">Movimentação</th>
                      <th className="px-4 py-3 text-left text-white font-bold">Responsável</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-600">
                    {todayMovements.map(mov => (
                      <tr key={mov.id} className="hover:bg-slate-600/30 transition-colors">
                        <td className="px-4 py-3 text-slate-300 text-xs">
                          {new Date(mov.timestamp).toLocaleTimeString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-white text-sm">{mov.productName}</td>
                        <td className="px-4 py-3 text-white text-sm font-bold">{mov.sector}</td>
                        <td className="px-4 py-3 text-right text-white font-bold">{mov.previousQuantity}</td>
                        <td className="px-4 py-3 text-right text-white font-bold">{mov.currentQuantity}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            mov.type === 'in'
                              ? 'bg-green-900/50 text-green-300'
                              : 'bg-red-900/50 text-red-300'
                          }`}>
                            {mov.type === 'in' ? '📥 +' : '📤 -'}{Math.abs(mov.movementKg)}kg
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white text-sm font-semibold">-</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'transfers' && (
          <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg overflow-hidden">
            {todayTransfers.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-400">
                <p>Nenhuma transferência registrada hoje.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800 border-b-2 border-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left text-white font-bold">Hora</th>
                      <th className="px-4 py-3 text-left text-white font-bold">Produto</th>
                      <th className="px-4 py-3 text-left text-white font-bold">De</th>
                      <th className="px-4 py-3 text-left text-white font-bold">Para</th>
                      <th className="px-4 py-3 text-right text-white font-bold">Quantidade</th>
                      <th className="px-4 py-3 text-left text-white font-bold">Responsável</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-600">
                    {todayTransfers.map(transfer => (
                      <tr key={transfer.id} className="hover:bg-slate-600/30 transition-colors">
                        <td className="px-4 py-3 text-slate-300 text-xs">
                          {new Date(transfer.timestamp).toLocaleTimeString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-white text-sm">{transfer.productName}</td>
                        <td className="px-4 py-3 text-white text-sm font-bold">{transfer.from}</td>
                        <td className="px-4 py-3 text-white text-sm font-bold">{transfer.to}</td>
                        <td className="px-4 py-3 text-right text-white font-bold">{transfer.quantity} sacos</td>
                        <td className="px-4 py-3 text-white text-sm font-semibold">{transfer.operator}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'inbound' && (
          <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg overflow-hidden">
            {todayInbounds.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-400">
                <p>Nenhuma entrada registrada hoje.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800 border-b-2 border-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left text-white font-bold">Hora</th>
                      <th className="px-4 py-3 text-left text-white font-bold">Produto</th>
                      <th className="px-4 py-3 text-left text-white font-bold">Fornecedor</th>
                      <th className="px-4 py-3 text-right text-white font-bold">Quantidade</th>
                      <th className="px-4 py-3 text-right text-white font-bold">Total (kg)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-600">
                    {todayInbounds.map(inbound => (
                      <tr key={inbound.id} className="hover:bg-slate-600/30 transition-colors">
                        <td className="px-4 py-3 text-slate-300 text-xs">
                          {new Date(inbound.timestamp).toLocaleTimeString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-white text-sm">{inbound.productName}</td>
                        <td className="px-4 py-3 text-right text-white font-bold">
                          {inbound.quantity} {inbound.unit === 'units' ? 'sacos' : 'kg'}
                        </td>
                        <td className="px-4 py-3 text-right text-white font-bold">{inbound.totalKg}kg</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
