import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useBigBagInventory } from '@/contexts/BigBagInventoryContext';
import { LogOut, AlertTriangle, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function BigBagManagerDashboard() {
  const [, setLocation] = useLocation();
  const { categories, inventory, batchHistory } = useBigBagInventory();
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'history'>('overview');
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    // Generate chart data from inventory
    const data = inventory.map(inv => ({
      name: inv.productName,
      weight: inv.totalWeight,
      bags: inv.numberOfBags,
    }));
    setChartData(data);
  }, [inventory]);

  const totalInventoryWeight = inventory.reduce((sum, inv) => sum + inv.totalWeight, 0);
  const totalBags = inventory.reduce((sum, inv) => sum + inv.numberOfBags, 0);
  const lowStockItems = inventory.filter(inv => inv.totalWeight < 2500); // < 2 bags

  const recentBatches = batchHistory.slice(0, 15);

  const getCategoryInventory = (categoryId: string) => {
    return inventory.filter(inv => inv.categoryId === categoryId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">PCP Manager - Big Bag</h1>
            <p className="text-slate-300 text-sm">Visão em Tempo Real do Inventário por Lotes</p>
          </div>
          <button
            onClick={() => setLocation('/login')}
            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            title="Sair"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
            <p className="text-slate-300 text-xs font-semibold mb-2">PESO TOTAL</p>
            <p className="text-white text-3xl font-bold">{(totalInventoryWeight / 1000).toFixed(1)}t</p>
            <p className="text-slate-400 text-xs mt-2">{totalInventoryWeight.toLocaleString()} kg</p>
          </div>

          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
            <p className="text-slate-300 text-xs font-semibold mb-2">NÚMERO DE SACOS</p>
            <p className="text-white text-3xl font-bold">{totalBags}</p>
            <p className="text-slate-400 text-xs mt-2">sacos registrados</p>
          </div>

          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
            <p className="text-slate-300 text-xs font-semibold mb-2">PRODUTOS</p>
            <p className="text-white text-3xl font-bold">{inventory.length}</p>
            <p className="text-slate-400 text-xs mt-2">tipos de produto</p>
          </div>

          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
            <p className="text-slate-300 text-xs font-semibold mb-2">REGISTROS HOJE</p>
            <p className="text-white text-3xl font-bold">{batchHistory.length}</p>
            <p className="text-slate-400 text-xs mt-2">lotes registrados</p>
          </div>
        </div>

        {/* Alerts */}
        {lowStockItems.length > 0 && (
          <div className="mb-8 bg-red-900/30 border-2 border-red-500 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-red-400 font-bold mb-2">Alertas de Estoque Baixo</h3>
                <div className="space-y-1">
                  {lowStockItems.map(item => (
                    <p key={item.productId} className="text-red-300 text-sm">
                      • {item.productName}: {item.totalWeight}kg ({item.numberOfBags} sacos)
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-700">
          {(['overview', 'inventory', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeTab === tab
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab === 'overview' && 'Visão Geral'}
              {tab === 'inventory' && 'Inventário Detalhado'}
              {tab === 'history' && 'Histórico de Lotes'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Weight Distribution */}
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
              <h3 className="text-white font-bold mb-4">Distribuição de Peso por Produto</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="name" stroke="#94a3b8" angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }} />
                  <Bar dataKey="weight" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Inventory Composition */}
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
              <h3 className="text-white font-bold mb-4">Composição do Inventário</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categories.map(cat => {
                      const catInv = getCategoryInventory(cat.id);
                      return {
                        name: cat.name,
                        value: catInv.reduce((sum, inv) => sum + inv.totalWeight, 0),
                      };
                    })}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${(value / 1000).toFixed(1)}t`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#3b82f6" />
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-6">
            {categories.map(category => {
              const categoryInventory = getCategoryInventory(category.id);
              if (categoryInventory.length === 0) return null;

              return (
                <div key={category.id} className="bg-slate-700/50 border border-slate-600 rounded-lg overflow-hidden">
                  <div className="bg-slate-800 px-6 py-4 border-b border-slate-600">
                    <h3 className="text-white font-bold">{category.name}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-800/50 border-b border-slate-600">
                        <tr>
                          <th className="px-6 py-3 text-left text-slate-300 font-semibold">Produto</th>
                          <th className="px-6 py-3 text-left text-slate-300 font-semibold">Peso Total</th>
                          <th className="px-6 py-3 text-left text-slate-300 font-semibold">Sacos</th>
                          <th className="px-6 py-3 text-left text-slate-300 font-semibold">Últimos Lotes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryInventory.map(product => (
                          <tr key={product.productId} className="border-b border-slate-600 hover:bg-slate-700/30 transition-colors">
                            <td className="px-6 py-4 text-white font-semibold">{product.productName}</td>
                            <td className="px-6 py-4 text-white">{product.totalWeight.toLocaleString()} kg</td>
                            <td className="px-6 py-4 text-white font-bold">{product.numberOfBags}</td>
                            <td className="px-6 py-4 text-slate-300 text-xs">
                              {product.batches.slice(0, 3).map(b => b.batchNumber).join(', ')}
                              {product.batches.length > 3 && '...'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-slate-700/50 border border-slate-600 rounded-lg overflow-hidden">
            <div className="bg-slate-800 px-6 py-4 border-b border-slate-600">
              <h3 className="text-white font-bold">Histórico de Registros de Lotes</h3>
            </div>
            {recentBatches.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-400">
                <p>Nenhum registro de lote ainda. Comece registrando no painel do operador.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800/50 border-b border-slate-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-slate-300 font-semibold">Hora</th>
                      <th className="px-6 py-3 text-left text-slate-300 font-semibold">Lote</th>
                      <th className="px-6 py-3 text-left text-slate-300 font-semibold">Produto</th>
                      <th className="px-6 py-3 text-left text-slate-300 font-semibold">Peso</th>
                      <th className="px-6 py-3 text-left text-slate-300 font-semibold">Sacos</th>
                      <th className="px-6 py-3 text-left text-slate-300 font-semibold">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBatches.map(batch => (
                      <tr key={batch.id} className="border-b border-slate-600 hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4 text-slate-300 text-xs">
                          {new Date(batch.timestamp).toLocaleTimeString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 text-white font-mono font-bold">{batch.batchNumber}</td>
                        <td className="px-6 py-4 text-white">{batch.productId}</td>
                        <td className="px-6 py-4 text-white font-semibold">{batch.weight}kg</td>
                        <td className="px-6 py-4 text-white">{batch.numberOfBags}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            batch.action === 'receive' ? 'bg-green-900/50 text-green-300' :
                            batch.action === 'consume' ? 'bg-blue-900/50 text-blue-300' :
                            'bg-purple-900/50 text-purple-300'
                          }`}>
                            {batch.action === 'receive' ? '📥 Recebido' :
                             batch.action === 'consume' ? '📤 Consumido' :
                             '📦 Produzido'}
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
      </div>
    </div>
  );
}
