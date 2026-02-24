import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { usePVCInventory } from '@/contexts/PVCInventoryContext';
import { LogOut, AlertTriangle, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function PVCManagerDashboard() {
  const [, setLocation] = useLocation();
  const { inventory, batchHistory, getAllCategories } = usePVCInventory();
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'history'>('overview');
  const [chartData, setChartData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);

  useEffect(() => {
    // Generate chart data
    const data = inventory
      .filter(inv => inv.totalWeight > 0)
      .sort((a, b) => b.totalWeight - a.totalWeight)
      .slice(0, 10)
      .map(inv => ({
        name: inv.productName.substring(0, 15),
        weight: inv.totalWeight,
        bags: inv.numberOfBags,
      }));
    setChartData(data);

    // Category composition
    const categories = getAllCategories();
    const catData = categories.map(cat => {
      const catInv = inventory.filter(inv => inv.category === cat);
      return {
        name: cat,
        value: catInv.reduce((sum, inv) => sum + inv.totalWeight, 0),
      };
    });
    setCategoryData(catData);
  }, [inventory, getAllCategories]);

  const totalWeight = inventory.reduce((sum, inv) => sum + inv.totalWeight, 0);
  const totalBags = inventory.reduce((sum, inv) => sum + inv.numberOfBags, 0);
  const lowStockItems = inventory.filter(inv => inv.totalWeight < 2500);
  const recentBatches = batchHistory.slice(0, 20);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-800/50 border-b-2 border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-white">🖥️ PCP Manager</h1>
            <p className="text-slate-300 text-sm">Visão em Tempo Real</p>
          </div>
          <button
            onClick={() => setLocation('/pvc-login')}
            className="p-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg transition-colors"
            title="Sair"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg p-6">
            <p className="text-slate-300 text-xs font-bold mb-2">PESO TOTAL</p>
            <p className="text-white text-3xl font-black">{(totalWeight / 1000).toFixed(1)}t</p>
            <p className="text-slate-400 text-xs mt-2">{totalWeight.toLocaleString()} kg</p>
          </div>

          <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg p-6">
            <p className="text-slate-300 text-xs font-bold mb-2">SACOS</p>
            <p className="text-white text-3xl font-black">{totalBags}</p>
            <p className="text-slate-400 text-xs mt-2">registrados</p>
          </div>

          <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg p-6">
            <p className="text-slate-300 text-xs font-bold mb-2">PRODUTOS</p>
            <p className="text-white text-3xl font-black">{inventory.length}</p>
            <p className="text-slate-400 text-xs mt-2">tipos</p>
          </div>

          <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg p-6">
            <p className="text-slate-300 text-xs font-bold mb-2">MOVIMENTOS</p>
            <p className="text-white text-3xl font-black">{batchHistory.length}</p>
            <p className="text-slate-400 text-xs mt-2">hoje</p>
          </div>
        </div>

        {/* Alerts */}
        {lowStockItems.length > 0 && (
          <div className="mb-8 bg-red-900/30 border-2 border-red-500 rounded-lg p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-red-400 font-bold mb-3">⚠️ Alertas de Estoque Baixo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {lowStockItems.map(item => (
                    <p key={item.productId} className="text-red-300 text-sm">
                      • {item.productName}: {item.totalWeight}kg
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b-2 border-slate-700">
          {(['overview', 'inventory', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-bold transition-colors ${
                activeTab === tab
                  ? 'text-blue-400 border-b-3 border-blue-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab === 'overview' && '📊 Visão Geral'}
              {tab === 'inventory' && '📦 Inventário'}
              {tab === 'history' && '📝 Histórico'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Top Products by Weight */}
            <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg p-6">
              <h3 className="text-white font-bold text-lg mb-4">Top 10 Produtos</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="name" stroke="#94a3b8" angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }} />
                  <Bar dataKey="weight" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Category Distribution */}
            <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg p-6">
              <h3 className="text-white font-bold text-lg mb-4">Distribuição por Categoria</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${(value / 1000).toFixed(1)}t`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800 border-b-2 border-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left text-white font-bold">Produto</th>
                    <th className="px-4 py-3 text-left text-white font-bold">Categoria</th>
                    <th className="px-4 py-3 text-right text-white font-bold">Peso (kg)</th>
                    <th className="px-4 py-3 text-right text-white font-bold">Sacos</th>
                    <th className="px-4 py-3 text-left text-white font-bold">Último Lote</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-600">
                  {inventory.map(product => (
                    <tr key={product.productId} className="hover:bg-slate-600/30 transition-colors">
                      <td className="px-4 py-3 text-white font-semibold">{product.productName}</td>
                      <td className="px-4 py-3 text-slate-300 text-xs">{product.category}</td>
                      <td className="px-4 py-3 text-right text-white font-bold">{product.totalWeight.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-white font-bold">{product.numberOfBags}</td>
                      <td className="px-4 py-3 text-slate-300 text-xs font-mono">{product.lastBatch || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-slate-700/50 border-2 border-slate-600 rounded-lg overflow-hidden">
            {recentBatches.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-400">
                <p>Nenhum movimento registrado ainda.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800 border-b-2 border-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left text-white font-bold">Hora</th>
                      <th className="px-4 py-3 text-left text-white font-bold">Lote</th>
                      <th className="px-4 py-3 text-left text-white font-bold">Produto</th>
                      <th className="px-4 py-3 text-right text-white font-bold">Peso</th>
                      <th className="px-4 py-3 text-left text-white font-bold">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-600">
                    {recentBatches.map(batch => (
                      <tr key={batch.id} className="hover:bg-slate-600/30 transition-colors">
                        <td className="px-4 py-3 text-slate-300 text-xs">
                          {new Date(batch.timestamp).toLocaleTimeString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-white font-mono font-bold">{batch.batchNumber}</td>
                        <td className="px-4 py-3 text-white text-sm">{batch.productName}</td>
                        <td className="px-4 py-3 text-right text-white font-bold">{batch.weight}kg</td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            batch.action === 'add'
                              ? 'bg-green-900/50 text-green-300'
                              : 'bg-blue-900/50 text-blue-300'
                          }`}>
                            {batch.action === 'add' ? '➕ Adicionado' : '➖ Consumido'}
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
